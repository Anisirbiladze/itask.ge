import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import BoardClient, { type Task } from './BoardClient'

export default async function BoardPage() {
  const session = await getSession()

  let where: Record<string, unknown> = { archived: false }
  let settings: { handoffFlagHours: number | null } | null = null

  if (session.role === 'MEMBER' && session.userId) {
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
      where = { ...where, OR: [{ assigneeId: session.userId }, { assigneeId: { in: peers.map(p => p.id) } }] }
    } else {
      where = { ...where, assigneeId: session.userId }
    }
  } else {
    settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })
  }

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: { checklistItems: { select: { done: true } } },
    }),
    prisma.user.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, displayName: true },
    }),
  ])

  const flagHours = settings?.handoffFlagHours ?? 48
  const now = new Date()

  const enhanced: Task[] = tasks.map(t => {
    let computedStatus: string = t.status
    let waitingHours: number | null = null
    if (t.handoffAt && t.status !== 'DONE') {
      const hours = Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60))
      if (hours > flagHours) { computedStatus = 'WAITING'; waitingHours = hours }
    }
    const total = t.checklistItems?.length ?? 0
    const done = t.checklistItems?.filter(c => c.done).length ?? 0
    return {
      id: t.id, title: t.title, companyId: t.companyId, assigneeId: t.assigneeId,
      status: t.status, computedStatus, waitingHours, priority: t.priority,
      dueAt: t.dueAt?.toISOString() ?? null, originalDueAt: t.originalDueAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      checklistPct: total > 0 ? Math.round((done / total) * 100) : null,
      checklistTotal: total, checklistDone: done,
    }
  })

  return <BoardClient initialTasks={enhanced} initialUsers={users} />
}
