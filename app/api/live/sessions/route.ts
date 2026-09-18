import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function pad(n: number) { return (n < 10 ? '0' : '') + n }
function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function shortDate(d: Date) { return `${pad(d.getDate())}.${pad(d.getMonth()+1)}` }

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = await (prisma as any).liveSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { sales: true } } },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const d = new Date()
  const key = dateKey(d)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSameDay = await (prisma as any).liveSession.count({ where: { dateKey: key } })
  const label = `ლაივი #${existingSameDay + 1} · ${shortDate(d)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = await (prisma as any).liveSession.create({ data: { label, dateKey: key } })
  return NextResponse.json(s)
}
