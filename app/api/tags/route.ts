import { NextRequest, NextResponse } from 'next/server'
import { getSession, isPrivileged } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// GET /api/tags — list all tags
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(tags)
}

// POST /api/tags — create a tag (CEO only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || !isPrivileged(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const tag = await prisma.tag.create({
    data: { name: name.trim(), color: color ?? '#6B7480' },
  })
  return NextResponse.json(tag, { status: 201 })
}

// DELETE /api/tags — delete a tag (CEO only)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || !isPrivileged(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
