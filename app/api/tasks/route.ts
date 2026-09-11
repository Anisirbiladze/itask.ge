import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const assigneeId = searchParams.get('assigneeId')
  const filter = searchParams.get('filter') // 'stuck' | 'week' | 'unassigned'

  let where: Record<string, unknown> = { archived: false }
  let settings: Awaited<ReturnType<typeof prisma.setting.findUnique>> = null

  if (session.role === 'MEMBER') {
    const [me, s] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId } }),
      prisma.setting.findUnique({ where: { id: 'singleton' } }),
    ])
    settings = s
    if (s?.membersSeeFunctionPeers && me) {
      const peers = await prisma.user.findMany({
        where: { functionGroup: me.functionGroup, archived: false, id: { not: session.userId } },
        select: { id: true },
      })
      where = { ...where, OR: [{ assigneeId: session.userId }, { assigneeId: { in: peers.map((p: { id: string }) => p.id) } }] }
    } else {
      where = { ...where, assigneeId: session.userId }
    }
  } else {
    settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
  }

  if (companyId) where.companyId = companyId
  if (assigneeId) where.assigneeId = assigneeId

  const now = new Date()
  if (filter === 'unassigned') where.assigneeId = null
  if (filter === 'week') {
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
    where.dueAt = { lte: endOfWeek }
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: {
      checklistItems: { select: { done: true } },
    },
  })

  const flagHours = settings?.handoffFlagHours ?? 48

  const enhanced = tasks.map((t) => {
    let computedStatus: string = t.status
    let waitingHours: number | null = null

    if (t.handoffAt && t.status !== 'DONE') {
      const hours = Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60))
      if (hours > flagHours) {
        computedStatus = 'WAITING'
        waitingHours = hours
      }
    }

    // Checklist progress
    const total = t.checklistItems?.length ?? 0
    const done = t.checklistItems?.filter((c) => c.done).length ?? 0
    const checklistPct = total > 0 ? Math.round((done / total) * 100) : null

    return { ...t, computedStatus, waitingHours, checklistPct, checklistTotal: total, checklistDone: done }
  })

  // Filter stuck
  if (filter === 'stuck') {
    return NextResponse.json(enhanced.filter((t) => t.computedStatus === 'WAITING' || t.status === 'WORKING'))
  }

  return NextResponse.json(enhanced)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    title, description, companyId, assigneeId, dueAt,
    priority, checklistTemplateId, linkUrl, linkLabel,
  } = body

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const dueDate = dueAt ? new Date(dueAt) : null

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      companyId: companyId || null,
      assigneeId: assigneeId || null,
      dueAt: dueDate,
      originalDueAt: dueDate, // SET ONCE, NEVER CHANGED
      priority: priority ?? 2,
      createdById: session.userId,
      recurringTemplateId: null,
    },
  })

  // Copy checklist template if provided
  if (checklistTemplateId) {
    const tmpl = await prisma.checklistTemplate.findUnique({ where: { id: checklistTemplateId } })
    if (tmpl) {
      await prisma.checklistItem.createMany({
        data: tmpl.items.map((label, i) => ({ taskId: task.id, label, position: i, done: false })),
      })
    }
  }

  // Log CREATED event
  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      actorId: session.userId,
      type: 'CREATED',
      toValue: title,
    },
  })

  // Log ASSIGNED if assignee set
  if (assigneeId) {
    await prisma.taskEvent.create({
      data: { taskId: task.id, actorId: session.userId, type: 'ASSIGNED', toValue: assigneeId },
    })
  }

  return NextResponse.json(task, { status: 201 })
}
