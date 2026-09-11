import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const templates = await prisma.checklistTemplate.findMany({ orderBy: { name: 'asc' } })

  // Add usage counts
  const usageCounts = await prisma.task.groupBy({
    by: ['recurringTemplateId'],
    _count: { id: true },
    where: { recurringTemplateId: { not: null } },
  })

  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, companyId, items } = await req.json()
  if (!name || !items?.length) return NextResponse.json({ error: 'Name and items required' }, { status: 400 })

  const tmpl = await prisma.checklistTemplate.create({ data: { name, companyId: companyId || null, items } })
  return NextResponse.json(tmpl, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, name, items } = await req.json()
  await prisma.checklistTemplate.update({ where: { id }, data: { name, items } })
  return NextResponse.json({ ok: true })
}
