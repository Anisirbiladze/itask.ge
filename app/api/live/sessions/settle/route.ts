import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId, phone } = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).liveSale.updateMany({
    where: { sessionId, phone },
    data: { paid: true },
  })
  return NextResponse.json({ ok: true })
}
