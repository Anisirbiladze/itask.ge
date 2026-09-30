import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rows = await prisma.translation.findMany()
  return NextResponse.json(rows)
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const updates: { key: string; page: string; value: string }[] = await req.json()

    // Run upserts sequentially to avoid connection pool exhaustion
    for (const u of updates) {
      await prisma.translation.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, page: u.page, value: u.value },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[translations PUT]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
