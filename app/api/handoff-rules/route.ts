import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const rules = await prisma.handoffRule.findMany({ orderBy: { companyId: 'asc' } })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const rule = await prisma.handoffRule.create({ data: body })
  return NextResponse.json(rule, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, ...data } = await req.json()
  await prisma.handoffRule.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
