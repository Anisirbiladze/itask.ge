import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import BoardClient, { type Task } from './BoardClient'

export default async function BoardPage() {
  const session = await getSession()

  let where: Record<string, unknown> = { archived: false }
  let settings: { handoffFlagHours: number | null } | null = null

  if (session.role === 'MEMBER' && session.userId) {
    where = { ...where, assigneeId: session.userId }
  }
  settings = await prisma.setting.findUnique({ where: { id: 'singleton' } })

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        checklistItems: { select: { done: true } },
        _count: { select: { comments: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, displayName: true, photoUrl: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, displayName: true, photoUrl: true, role: true },
    }),
  ])

  const flagHours = settings?.handoffFlagHours ?? 48
  const now = new Date()

  const enhanced: Task[] = tasks.map(t => {
    let computedStatus: string = t.status
    let waitingHours: number | null = null
    if (t.handoffAt && t.status !== 'COMPLETED') {
      const hours = Math.floor((now.getTime() - new Date(t.handoffAt).getTime()) / (1000 * 60 * 60))
      if (hours > flagHours) { computedStatus = 'WAITING'; waitingHours = hours }
    }
    const total = t.checklistItems?.length ?? 0
    const done = t.checklistItems?.filter(c => c.done).length ?? 0
    return {
      id: t.id, title: t.title, description: t.description,
      companyId: t.companyId, assigneeId: t.assigneeId, createdById: t.createdById,
      status: t.status, computedStatus, waitingHours, priority: t.priority,
      dueAt: t.dueAt?.toISOString() ?? null, originalDueAt: t.originalDueAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      checklistPct: total > 0 ? Math.round((done / total) * 100) : null,
      checklistTotal: total, checklistDone: done,
      commentCount: t._count?.comments ?? 0,
      comments: (t.comments ?? []).map(c => ({
        id: c.id, content: c.content, createdAt: c.createdAt.toISOString(),
        author: c.author,
      })),
    }
  })

  return <BoardClient initialTasks={enhanced} initialUsers={users} />
}
