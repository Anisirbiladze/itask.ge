import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import ReportsClient from './ReportsClient'
import { differenceInDays, subDays } from 'date-fns'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return <p style={{ color: 'var(--stuck)' }}>CEO access required.</p>
  }

  const now = new Date()
  const from = subDays(now, 30)

  const [completedTasks, pushEvents, openTasks, users, companies] = await Promise.all([
    prisma.task.findMany({ where: { archived: false, completedAt: { gte: from, lte: now } }, select: { id: true, assigneeId: true, companyId: true, completedAt: true, originalDueAt: true, dueAt: true } }),
    prisma.taskEvent.findMany({ where: { type: 'DUE_DATE_CHANGED', createdAt: { gte: from, lte: now } }, select: { taskId: true, actorId: true, createdAt: true } }),
    prisma.task.findMany({ where: { archived: false, status: { not: 'DONE' } }, select: { id: true, assigneeId: true, companyId: true } }),
    prisma.user.findMany({ where: { archived: false }, select: { id: true, displayName: true } }),
    prisma.company.findMany({ where: { archived: false }, select: { id: true, name: true, color: true } }),
  ])

  const userMap = Object.fromEntries(users.map((u: { id: string; displayName: string }) => [u.id, u.displayName]))
  const companyMap = Object.fromEntries(companies.map((c: { id: string; name: string; color: string }) => [c.id, c]))

  const personMap: Record<string, { done: number; onTime: number; lateDays: number[]; pushes: number; open: number }> = {}
  for (const t of completedTasks) {
    const uid = t.assigneeId; if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].done++
    if (t.completedAt && t.originalDueAt) {
      if (new Date(t.completedAt) <= new Date(t.originalDueAt)) personMap[uid].onTime++
      else personMap[uid].lateDays.push(differenceInDays(new Date(t.completedAt), new Date(t.originalDueAt)))
    }
  }
  for (const e of pushEvents) {
    const t = completedTasks.find((t: { id: string }) => t.id === e.taskId) || openTasks.find((t: { id: string }) => t.id === e.taskId)
    const uid = (t as { assigneeId?: string | null })?.assigneeId ?? e.actorId; if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].pushes++
  }
  for (const t of openTasks) {
    const uid = t.assigneeId; if (!uid) continue
    if (!personMap[uid]) personMap[uid] = { done: 0, onTime: 0, lateDays: [], pushes: 0, open: 0 }
    personMap[uid].open++
  }
  const byPerson = Object.entries(personMap).map(([uid, s]) => ({ userId: uid, name: userMap[uid] ?? uid, done: s.done, onTimePct: s.done > 0 ? Math.round((s.onTime / s.done) * 100) : 0, avgLate: s.lateDays.length > 0 ? +(s.lateDays.reduce((a: number, b: number) => a + b, 0) / s.lateDays.length).toFixed(1) : 0, pushes: s.pushes, open: s.open })).sort((a, b) => b.onTimePct - a.onTimePct)

  const coMap: Record<string, { done: number; onTime: number; pushes: number; open: number; people: Set<string> }> = {}
  for (const t of completedTasks) {
    const cid = t.companyId; if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].done++
    if (t.completedAt && t.originalDueAt && new Date(t.completedAt) <= new Date(t.originalDueAt)) coMap[cid].onTime++
    if (t.assigneeId) coMap[cid].people.add(t.assigneeId)
  }
  for (const e of pushEvents) {
    const t = completedTasks.find((t: { id: string }) => t.id === e.taskId) || openTasks.find((t: { id: string }) => t.id === e.taskId)
    const cid = (t as { companyId?: string | null })?.companyId; if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].pushes++
  }
  for (const t of openTasks) {
    const cid = t.companyId; if (!cid) continue
    if (!coMap[cid]) coMap[cid] = { done: 0, onTime: 0, pushes: 0, open: 0, people: new Set() }
    coMap[cid].open++
    if (t.assigneeId) coMap[cid].people.add(t.assigneeId)
  }
  const byCompany = Object.entries(coMap).map(([cid, s]) => ({ companyId: cid, name: companyMap[cid]?.name ?? cid, color: companyMap[cid]?.color ?? '#888', done: s.done, onTimePct: s.done > 0 ? Math.round((s.onTime / s.done) * 100) : 0, pushes: s.pushes, open: s.open, people: s.people.size }))

  const totalDone = completedTasks.length
  const totalOnTime = completedTasks.filter((t: { completedAt: Date | null; originalDueAt: Date | null }) => t.completedAt && t.originalDueAt && new Date(t.completedAt) <= new Date(t.originalDueAt)).length
  const onTimePct = totalDone > 0 ? Math.round((totalOnTime / totalDone) * 100) : 0
  const lateTasks = completedTasks.filter((t: { completedAt: Date | null; originalDueAt: Date | null }) => t.completedAt && t.originalDueAt && new Date(t.completedAt) > new Date(t.originalDueAt))
  const avgLate = lateTasks.length > 0 ? +(lateTasks.reduce((s: number, t: { completedAt: Date | null; originalDueAt: Date | null }) => s + differenceInDays(new Date(t.completedAt!), new Date(t.originalDueAt!)), 0) / lateTasks.length).toFixed(1) : 0

  const initialData = { summary: { done: totalDone, onTimePct, pushes: pushEvents.length, avgLate }, byPerson, byCompany }
  return <ReportsClient initialData={initialData} />
}
