import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/normalizePhone'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId, phone } = await req.json()
  const canonical = normalizePhone(phone)

  // fetch all sales for session, filter by normalized phone to handle legacy formats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await (prisma as any).liveSale.findMany({ where: { sessionId }, select: { id: true, phone: true } })
  const ids = (all as { id: string; phone: string }[])
    .filter(s => normalizePhone(s.phone) === canonical)
    .map(s => s.id)

  if (ids.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).liveSale.updateMany({ where: { id: { in: ids } }, data: { paid: true } })
  }
  return NextResponse.json({ ok: true })
}
