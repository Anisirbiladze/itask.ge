import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import TeamClient, { type TeamData } from './TeamClient'

export default async function TeamPage() {
  const session = await getSession()
  if (session.role !== 'CEO') {
    return <p style={{ color: 'var(--stuck)' }}>CEO access required.</p>
  }

  const now = new Date()
  const [users, companies, allMemberships, settings, tasks, doneTodayCount] = await Promise.all([
    prisma.user.findMany({ where: { archived: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, displayName: true, jobTitle: true, functionGroup: true, role: true } }),
    prisma.company.findMany({ where: { archived: false } }),
    prisma.userCompany.findMany(),
    prisma.setting.findUnique({ where: { id: 'singleton' } }),
    prisma.task.findMany({ where: { archived: false, status: { not: 'DONE' } }, include: { checklistItems: { select: { done: true } } }, orderBy: { priority: 'desc' } }),
    prisma.task.count({ where: { archived: false, status: 'DONE', completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ])

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
  const flagHours = settings?.handoffFlagHours ?? 48

  const result = users.map(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.id)
    const userCompanies = allMemberships.filter(m => m.userId === u.id).map(m => companyMap[m.companyId]).filter(Boolean)
    const total = userTasks.length
    const done = userTasks.filter(t => t.status === 'DONE').length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const isBehind = userTasks.some(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'DONE')
    const stuckCount = userTasks.filter(t => t.handoffAt && t.status !== 'DONE' && Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60)) > flagHours).length
    return {
      id: u.id, displayName: u.displayName, functionGroup: u.functionGroup,
      companies: userCompanies.map(c => ({ id: c.id, name: c.name, color: c.color })),
      tasks: userTasks.map(t => {
        let computedStatus: string = t.status, waitingHours: number | null = null
        if (t.handoffAt && t.status !== 'DONE') {
          const h = Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60))
          if (h > flagHours) { computedStatus = 'WAITING'; waitingHours = h }
        }
        const co = t.companyId ? companyMap[t.companyId] : null
        return { id: t.id, title: t.title, status: t.status, computedStatus, waitingHours, dueAt: t.dueAt?.toISOString() ?? null, company: co ? { name: co.name, color: co.color } : null }
      }),
      totalTasks: total, doneTasks: done, progressPct: pct, isBehind, stuckCount,
    }
  })

  const groups: TeamData['groups'] = {}
  for (const u of result) { const g = u.functionGroup || 'Other'; if (!groups[g]) groups[g] = []; groups[g].push(u) }

  const unassigned = tasks.filter(t => !t.assigneeId).length
  const peopleBehind = result.filter(u => u.isBehind).length
  const stuckOver48h = tasks.filter(t => t.handoffAt && t.status !== 'DONE' && Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60)) > flagHours).length

  const data: TeamData = { groups, summary: { doneToday: doneTodayCount, peopleBehind, stuckOver48h, unassigned } }
  return <TeamClient initialData={data} />
}
