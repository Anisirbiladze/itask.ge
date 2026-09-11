import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDay, startOfDay, addHours, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// Called by a cron job at 06:00 Asia/Tbilisi daily.
// Protect with a secret header so it cannot be triggered publicly.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const tbilisi = toZonedTime(now, 'Asia/Tbilisi')
  const todayStr = format(tbilisi, 'yyyy-MM-dd')
  const dayOfWeek = getDay(tbilisi) // 0=Sun,1=Mon,...,6=Sat

  const templates = await prisma.recurringTemplate.findMany({ where: { active: true } })

  let created = 0
  for (const t of templates) {
    // Check if should fire today
    let shouldFire = false
    if (t.frequency === 'WEEKDAYS') {
      shouldFire = dayOfWeek >= 1 && dayOfWeek <= 5
    } else if (t.frequency === 'WEEKLY') {
      shouldFire = t.weekdays.includes(dayOfWeek)
    } else if (t.frequency === 'TWICE_WEEKLY') {
      shouldFire = t.weekdays.includes(dayOfWeek)
    }

    if (!shouldFire) continue

    // Idempotency: check if task already created for this template+date
    const existing = await prisma.task.findFirst({
      where: {
        recurringTemplateId: t.id,
        createdAt: { gte: startOfDay(tbilisi) },
      },
    })
    if (existing) continue

    const dueDate = addHours(tbilisi, t.dueOffsetHours)

    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description ?? null,
        companyId: t.companyId,
        assigneeId: t.assigneeId ?? null,
        priority: t.priority,
        dueAt: dueDate,
        originalDueAt: dueDate,
        recurringTemplateId: t.id,
        createdById: 'system',
        status: 'NOT_STARTED',
      },
    })

    if (t.checklistTemplateId) {
      const tmpl = await prisma.checklistTemplate.findUnique({ where: { id: t.checklistTemplateId } })
      if (tmpl) {
        await prisma.checklistItem.createMany({
          data: tmpl.items.map((label, i) => ({ taskId: task.id, label, position: i, done: false })),
        })
      }
    }

    await prisma.taskEvent.create({
      data: { taskId: task.id, actorId: null, type: 'CREATED', toValue: t.title },
    })

    created++
  }

  return NextResponse.json({ ok: true, created, date: todayStr })
}
