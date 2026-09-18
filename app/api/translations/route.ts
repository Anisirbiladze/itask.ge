import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rows = await prisma.translation.findMany()
  return NextResponse.json(rows)
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: { key: string; page: string; value: string }[] = await req.json()

  await Promise.all(
    updates.map(u =>
      prisma.translation.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, page: u.page, value: u.value },
      })
    )
  )

  revalidateTag('translations')
  return NextResponse.json({ ok: true })
}
