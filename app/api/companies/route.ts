import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const companies = await prisma.company.findMany({
    where: { archived: false },
    orderBy: { name: 'asc' },
  })

  // Add open task counts
  const counts = await prisma.task.groupBy({
    by: ['companyId'],
    where: { archived: false, status: { not: 'DONE' }, companyId: { not: null } },
    _count: { id: true },
  })
  const countMap = Object.fromEntries(counts.map(c => [c.companyId!, c._count.id]))

  return NextResponse.json(companies.map(c => ({ ...c, openCount: countMap[c.id] ?? 0 })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, color } = await req.json()
  if (!name || !color) return NextResponse.json({ error: 'Name and color required' }, { status: 400 })

  const company = await prisma.company.create({ data: { name, color } })
  return NextResponse.json(company, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, name, color, archived } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.company.update({ where: { id }, data: { name, color, archived } })
  return NextResponse.json({ ok: true })
}
