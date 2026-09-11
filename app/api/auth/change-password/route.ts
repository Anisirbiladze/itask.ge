import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If not mustChangePw, verify current password
  if (!user.mustChangePw) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    const { verifyPassword } = await import('@/lib/auth')
    const ok = await verifyPassword(user.passwordHash, currentPassword)
    if (!ok) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePw: false },
  })

  // Update session
  session.mustChangePw = false
  await session.save()

  return NextResponse.json({ ok: true })
}
