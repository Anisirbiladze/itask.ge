import { isPrivileged } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
  })

  // Enrich with author info
  const userIds = [...new Set(comments.map(c => c.authorId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, photoUrl: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  return NextResponse.json(comments.map(c => ({
    ...c,
    author: userMap[c.authorId] ?? { id: c.authorId, displayName: 'Unknown', photoUrl: null },
  })))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: session.userId, content: content.trim() },
  })

  const author = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, displayName: true, photoUrl: true },
  })

  return NextResponse.json({ ...comment, author })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: taskId } = await params

  const { commentId } = await req.json()
  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } })
  if (!comment || comment.taskId !== taskId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.authorId !== session.userId && !isPrivileged(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.taskComment.delete({ where: { id: commentId } })
  return NextResponse.json({ ok: true })
}
