import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTempPassword } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const { name, displayName, email, jobTitle, functionGroup, role, companyIds, archived } = body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (displayName !== undefined) updates.displayName = displayName
  if (email !== undefined) updates.email = email.toLowerCase()
  if (jobTitle !== undefined) updates.jobTitle = jobTitle
  if (functionGroup !== undefined) updates.functionGroup = functionGroup
  if (role !== undefined) updates.role = role
  if (archived !== undefined) updates.archived = archived

  await prisma.user.update({ where: { id }, data: updates })

  if (companyIds !== undefined) {
    await prisma.userCompany.deleteMany({ where: { userId: id } })
    if (companyIds.length > 0) {
      await prisma.userCompany.createMany({
        data: companyIds.map((cid: string) => ({ userId: id, companyId: cid })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest, { params }: Params) {
  // Reset password
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const { action } = await req.json()

  if (action === 'reset-password') {
    const tempPw = generateTempPassword()
    const passwordHash = await hashPassword(tempPw)
    await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePw: true } })
    return NextResponse.json({ tempPassword: tempPw })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
