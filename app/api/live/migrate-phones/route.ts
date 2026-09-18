import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/normalizePhone'

/** One-time POST to normalize all existing phone numbers in LiveSale records. CEO only. */
export async function POST() {
  const session = await getSession()
  if (session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await (prisma as any).liveSale.findMany({ select: { id: true, phone: true } })
  const rows = all as { id: string; phone: string }[]

  let updated = 0
  await Promise.all(rows.map(async r => {
    const canonical = normalizePhone(r.phone)
    if (canonical !== r.phone) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).liveSale.update({ where: { id: r.id }, data: { phone: canonical } })
      updated++
    }
  }))

  return NextResponse.json({ total: rows.length, updated })
}
