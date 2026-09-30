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
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ ok: true })
    }

    // Delete all + bulk-insert is a single round-trip each, far faster than N upserts
    await prisma.translation.deleteMany()
    await prisma.translation.createMany({ data: updates })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[translations PUT]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
