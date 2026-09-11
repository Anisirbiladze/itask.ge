import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      checklistItems: { orderBy: { position: 'asc' } },
      images: true,
      links: true,
    },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const events = await prisma.taskEvent.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
  })

  // Resolve actor names
  const actorIds = [...new Set(events.filter(e => e.actorId).map(e => e.actorId as string))]
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, displayName: true },
  })
  const actorMap = Object.fromEntries(actors.map(a => [a.id, a.displayName]))

  const settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
  const flagHours = settings?.handoffFlagHours ?? 48
  const now = new Date()

  let computedStatus: string = task.status
  let waitingHours: number | null = null
  if (task.handoffAt && task.status !== 'DONE') {
    const hours = Math.floor((now.getTime() - new Date(task.handoffAt).getTime()) / (1000 * 60 * 60))
    if (hours > flagHours) {
      computedStatus = 'WAITING'
      waitingHours = hours
    }
  }

  const checklistItems = task.checklistItems ?? []
  const total = checklistItems.length
  const done = checklistItems.filter((c) => c.done).length
  const checklistPct = total > 0 ? Math.round((done / total) * 100) : null

  // Parent task info
  let parentTask = null
  if (task.parentTaskId) {
    parentTask = await prisma.task.findUnique({
      where: { id: task.parentTaskId },
      select: { id: true, title: true },
    })
  }

  // Assignee info
  let assignee = null
  if (task.assigneeId) {
    assignee = await prisma.user.findUnique({
      where: { id: task.assigneeId },
      select: { id: true, displayName: true },
    })
  }

  // Company info
  let company = null
  if (task.companyId) {
    company = await prisma.company.findUnique({
      where: { id: task.companyId },
      select: { id: true, name: true, color: true },
    })
  }

  // Creator
  const creator = await prisma.user.findUnique({
    where: { id: task.createdById },
    select: { id: true, displayName: true },
  })

  const dueDatePushCount = events.filter(e => e.type === 'DUE_DATE_CHANGED').length

  return NextResponse.json({
    ...task,
    computedStatus,
    waitingHours,
    checklistPct,
    checklistTotal: total,
    checklistDone: done,
    events: events.map(e => ({ ...e, actorName: e.actorId ? actorMap[e.actorId] : null })),
    parentTask,
    assignee,
    company,
    creator,
    dueDatePushCount,
    settings: { requireReasonOnDueChange: settings?.requireReasonOnDueChange, checklistDrivesProgress: settings?.checklistDrivesProgress },
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  const events: Array<{ type: string; fromValue?: string; toValue?: string; reason?: string }> = []

  // Status change
  if (body.status !== undefined && body.status !== task.status) {
    const from = task.status
    const to = body.status
    updates.status = to
    if (to === 'WORKING' && !task.startedAt) updates.startedAt = new Date()
    if (to === 'DONE') {
      updates.completedAt = new Date()
      // Check handoff rules
      await checkHandoffRules(task, session.userId)
    }
    if (from === 'DONE' && to !== 'DONE') updates.completedAt = null
    events.push({ type: 'STATUS_CHANGED', fromValue: from, toValue: to })
    if (to === 'DONE') events.push({ type: 'COMPLETED' })
  }

  // Due date change
  if (body.dueAt !== undefined) {
    if (session.role === 'MEMBER') {
      const settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
      if (!settings?.membersCanChangeDueDate) {
        return NextResponse.json({ error: 'You cannot change due dates' }, { status: 403 })
      }
      const settings2 = await prisma.setting.findUnique({ where: { id: 'singleton' } })
      if (settings2?.requireReasonOnDueChange && !body.reason) {
        return NextResponse.json({ error: 'A reason is required when changing the due date' }, { status: 400 })
      }
    } else {
      const settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
      if (settings?.requireReasonOnDueChange && !body.reason) {
        return NextResponse.json({ error: 'A reason is required when changing the due date' }, { status: 400 })
      }
    }
    const from = task.dueAt ? task.dueAt.toISOString() : null
    const to = body.dueAt ? new Date(body.dueAt).toISOString() : null
    updates.dueAt = body.dueAt ? new Date(body.dueAt) : null
    // NEVER update originalDueAt
    events.push({ type: 'DUE_DATE_CHANGED', fromValue: from ?? undefined, toValue: to ?? undefined, reason: body.reason })
  }

  // Checklist item toggle
  if (body.checklistItemId !== undefined) {
    await prisma.checklistItem.update({
      where: { id: body.checklistItemId },
      data: { done: body.done },
    })
    // If checklist drives progress, auto-update status
    const settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
    if (settings?.checklistDrivesProgress) {
      const items = await prisma.checklistItem.findMany({ where: { taskId: id } })
      const allDone = items.length > 0 && items.every(i => i.done)
      const anyDone = items.some(i => i.done)
      if (allDone && task.status !== 'DONE') {
        updates.status = 'DONE'
        updates.completedAt = new Date()
        events.push({ type: 'STATUS_CHANGED', fromValue: task.status, toValue: 'DONE' })
        events.push({ type: 'COMPLETED' })
        await checkHandoffRules(task, session.userId)
      } else if (anyDone && task.status === 'NOT_STARTED') {
        updates.status = 'WORKING'
        updates.startedAt = new Date()
        events.push({ type: 'STATUS_CHANGED', fromValue: task.status, toValue: 'WORKING' })
      }
    }
  }

  // Assignment (CEO only)
  if (body.assigneeId !== undefined && session.role === 'CEO') {
    updates.assigneeId = body.assigneeId || null
    events.push({ type: 'ASSIGNED', toValue: body.assigneeId || null })
  }

  if (Object.keys(updates).length > 0) {
    await prisma.task.update({ where: { id }, data: updates })
  }

  for (const ev of events) {
    await prisma.taskEvent.create({
      data: {
        taskId: id,
        actorId: session.userId,
        type: ev.type as import('@prisma/client').EventType,
        fromValue: ev.fromValue,
        toValue: ev.toValue,
        reason: ev.reason,
      },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  await prisma.task.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}

async function checkHandoffRules(task: any, actorId: string) {
  if (!task.companyId || !task.assigneeId) return

  const rules = await prisma.handoffRule.findMany({
    where: { companyId: task.companyId, fromAssigneeId: task.assigneeId, active: true },
  })

  for (const rule of rules) {
    if (!task.title.startsWith(rule.fromTitlePattern)) continue

    const remainder = task.title.slice(rule.fromTitlePattern.length)
    const newTitle = rule.newTitlePrefix + remainder
    const dueDate = new Date(Date.now() + rule.dueAfterHours * 60 * 60 * 1000)

    const newTask = await prisma.task.create({
      data: {
        title: newTitle,
        companyId: task.companyId,
        assigneeId: rule.toAssigneeId,
        parentTaskId: task.id,
        handoffAt: new Date(),
        dueAt: dueDate,
        originalDueAt: dueDate,
        priority: task.priority,
        createdById: actorId,
        status: 'NOT_STARTED',
      },
    })

    if (rule.checklistTemplateId) {
      const tmpl = await prisma.checklistTemplate.findUnique({ where: { id: rule.checklistTemplateId } })
      if (tmpl) {
        await prisma.checklistItem.createMany({
          data: tmpl.items.map((label, i) => ({ taskId: newTask.id, label, position: i, done: false })),
        })
      }
    }

    await prisma.taskEvent.create({
      data: { taskId: newTask.id, actorId: null, type: 'HANDED_OFF', fromValue: task.id, toValue: newTask.id },
    })
  }
}
