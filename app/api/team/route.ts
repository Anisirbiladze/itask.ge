import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { archived: false },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, displayName: true,
      jobTitle: true, functionGroup: true, role: true,
    },
  })

  const companies = await prisma.company.findMany({ where: { archived: false } })
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
  const memberships = await prisma.userCompany.findMany()

  const settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
  const flagHours = settings?.handoffFlagHours ?? 48
  const now = new Date()

  const tasks = await prisma.task.findMany({
    where: { archived: false, status: { not: 'DONE' } },
    include: { checklistItems: true },
    orderBy: { priority: 'desc' },
  })

  const doneTodayCount = await prisma.task.count({
    where: {
      archived: false, status: 'DONE',
      completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  })

  const result = users.map(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.id)
    const userCompanies = memberships
      .filter(m => m.userId === u.id)
      .map(m => companyMap[m.companyId])
      .filter(Boolean)

    const total = userTasks.length
    const done = userTasks.filter(t => t.status === 'DONE').length
    const working = userTasks.filter(t => t.status === 'WORKING').length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0

    const isBehind = userTasks.some(t => {
      if (!t.dueAt) return false
      return new Date(t.dueAt) < now && t.status !== 'DONE'
    })

    const stuckTasks = userTasks.filter(t => {
      if (!t.handoffAt || t.status === 'DONE') return false
      return Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60)) > flagHours
    })

    return {
      ...u,
      companies: userCompanies,
      tasks: userTasks.map(t => {
        const checkTotal = t.checklistItems?.length ?? 0
        const checkDone = t.checklistItems?.filter((c) => c.done).length ?? 0
        const taskCompany = t.companyId ? companyMap[t.companyId] : null

        let computedStatus: string = t.status
        let waitingHours: number | null = null
        if (t.handoffAt && t.status !== 'DONE') {
          const h = Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60))
          if (h > flagHours) { computedStatus = 'WAITING'; waitingHours = h }
        }

        return {
          id: t.id, title: t.title, status: t.status, computedStatus, waitingHours,
          dueAt: t.dueAt, priority: t.priority,
          company: taskCompany,
          checklistPct: checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : null,
        }
      }),
      totalTasks: total,
      doneTasks: done,
      workingTasks: working,
      progressPct: pct,
      isBehind,
      stuckCount: stuckTasks.length,
    }
  })

  // Group by functionGroup
  const groups: Record<string, typeof result> = {}
  for (const u of result) {
    const g = u.functionGroup || 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(u)
  }

  // Summary cards
  const unassigned = tasks.filter(t => !t.assigneeId).length
  const peopleCount = result.filter(u => u.isBehind).length
  const stuckCount = tasks.filter(t => {
    if (!t.handoffAt || t.status === 'DONE') return false
    return Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60)) > flagHours
  }).length

  return NextResponse.json({
    groups,
    summary: {
      doneToday: doneTodayCount,
      peopleBehind: peopleCount,
      stuckOver48h: stuckCount,
      unassigned,
    },
  })
}
