import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { differenceInDays, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'last30'
  const companyId = searchParams.get('companyId') ?? null

  const now = new Date()
  let from: Date, to: Date = now

  if (period === 'week') {
    from = startOfWeek(now, { weekStartsOn: 1 })
    to = endOfWeek(now, { weekStartsOn: 1 })
  } else if (period === 'quarter') {
    from = startOfQuarter(now)
    to = endOfQuarter(now)
  } else {
    from = subDays(now, 30)
  }

  const taskWhere: Record<string, unknown> = {
    archived: false,
    completedAt: { gte: from, lte: to },
  }
  if (companyId) taskWhere.companyId = companyId

  // Tasks completed in period
  const completedTasks = await prisma.task.findMany({
    where: taskWhere,
    select: {
      id: true, assigneeId: true, companyId: true,
      completedAt: true, originalDueAt: true, dueAt: true,
    },
  })

  // Due date push events in period
  const pushEvents = await prisma.taskEvent.findMany({
    where: {
      type: 'DUE_DATE_CHANGED',
      createdAt: { gte: from, lte: to },
    },
    select: { taskId: true, actorId: true, createdAt: true },
  })

  // Open tasks now
  const openWhere: Record<string, unknown> = { archived: false, status: { not: 'DONE' } }
  if (companyId) openWhere.companyId = companyId
  const openTasks = await prisma.task.findMany({
    where: openWhere,
    select: { id: true, assigneeId: true, companyId: true },
  })

  // All users
  const users = await prisma.user.findMany({
    where: { archived: false },
    select: { id: true, displayName: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u.displayName]))

  // All companies
  const companies = await prisma.company.findMany({
    where: { archived: false },
    select: { id: true, name: true, color: true },
  })
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))

  // --- By person ---
  const personMap: Record<string, { done: number; onTime: number; lateDays: number[]; pushes: number; open: number }> = {}
  for (const t of completedTasks) {
    const uid = t.assigneeId
    if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].done++
    if (t.completedAt && t.originalDueAt) {
      if (new Date(t.completedAt) <= new Date(t.originalDueAt)) {
        personMap[uid].onTime++
      } else {
        const days = differenceInDays(new Date(t.completedAt), new Date(t.originalDueAt))
        personMap[uid].lateDays.push(days)
      }
    }
  }
  for (const e of pushEvents) {
    // find task's assignee
    const t = completedTasks.find(t => t.id === e.taskId) || openTasks.find(t => t.id === e.taskId)
    const uid = t?.assigneeId ?? e.actorId
    if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].pushes++
  }
  for (const t of openTasks) {
    const uid = t.assigneeId
    if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].open++
  }

  const byPerson = Object.entries(personMap).map(([uid, s]) => ({
    userId: uid,
    name: userMap[uid] ?? uid,
    done: s.done,
    onTimePct: s.done > 0 ? Math.round((s.onTime / s.done) * 100) : 0,
    avgLate: s.lateDays.length > 0 ? +(s.lateDays.reduce((a, b) => a + b, 0) / s.lateDays.length).toFixed(1) : 0,
    pushes: s.pushes,
    open: s.open,
  })).sort((a, b) => b.onTimePct - a.onTimePct)

  // --- By company ---
  const coMap: Record<string, { done: number; onTime: number; total: number; pushes: number; open: number; people: Set<string> }> = {}
  for (const t of completedTasks) {
    const cid = t.companyId
    if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, total: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].done++
    coMap[cid].total++
    if (t.completedAt && t.originalDueAt && new Date(t.completedAt) <= new Date(t.originalDueAt)) coMap[cid].onTime++
    if (t.assigneeId) coMap[cid].people.add(t.assigneeId)
  }
  for (const e of pushEvents) {
    const t = completedTasks.find(t => t.id === e.taskId) || openTasks.find(t => t.id === e.taskId)
    const cid = t?.companyId
    if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, total: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].pushes++
  }
  for (const t of openTasks) {
    const cid = t.companyId
    if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, total: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].open++
    if (t.assigneeId) coMap[cid].people.add(t.assigneeId)
  }

  const byCompany = Object.entries(coMap).map(([cid, s]) => ({
    companyId: cid,
    name: companyMap[cid]?.name ?? cid,
    color: companyMap[cid]?.color ?? '#888',
    done: s.done,
    onTimePct: s.done > 0 ? Math.round((s.onTime / s.done) * 100) : 0,
    pushes: s.pushes,
    open: s.open,
    people: s.people.size,
  }))

  // Summary
  const totalDone = completedTasks.length
  const totalOnTime = completedTasks.filter(t => t.completedAt && t.originalDueAt && new Date(t.completedAt) <= new Date(t.originalDueAt)).length
  const onTimePct = totalDone > 0 ? Math.round((totalOnTime / totalDone) * 100) : 0
  const lateTasks = completedTasks.filter(t => t.completedAt && t.originalDueAt && new Date(t.completedAt) > new Date(t.originalDueAt))
  const avgLate = lateTasks.length > 0
    ? +(lateTasks.reduce((s, t) => s + differenceInDays(new Date(t.completedAt!), new Date(t.originalDueAt!)), 0) / lateTasks.length).toFixed(1)
    : 0

  return NextResponse.json({
    summary: { done: totalDone, onTimePct, pushes: pushEvents.length, avgLate },
    byPerson,
    byCompany,
    period,
    from: from.toISOString(),
    to: to.toISOString(),
  })
}
