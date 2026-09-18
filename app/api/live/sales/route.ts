import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/normalizePhone'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const where = sessionId === 'ALL' ? {} : { sessionId }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sales = await (prisma as any).liveSale.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(sales)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sessionId, phone, username, price } = body
  if (!sessionId || !phone || price == null) {
    return NextResponse.json({ error: 'sessionId, phone, price required' }, { status: 400 })
  }

  const canonicalPhone = normalizePhone(phone)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingInSession = await (prisma as any).liveSale.findFirst({ where: { sessionId, phone: canonicalPhone } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sale = await (prisma as any).liveSale.create({
    data: {
      sessionId,
      phone: normalizePhone(phone),
      username: username || '',
      price: Number(price),
      paid: false,
      isFirst: !existingInSession,
    },
  })
  return NextResponse.json(sale)
}
