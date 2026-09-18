import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTempPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'active' // active | archived | all
  const companyId = searchParams.get('companyId')

  let where: Record<string, unknown> = {}
  if (filter === 'active') where.archived = false
  else if (filter === 'archived') where.archived = true

  if (companyId) {
    const memberships = await prisma.userCompany.findMany({ where: { companyId }, select: { userId: true } })
    where.id = { in: memberships.map((m: { userId: string }) => m.userId) }
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, displayName: true, email: true,
      role: true, jobTitle: true, functionGroup: true,
      photoUrl: true, archived: true, mustChangePw: true, createdAt: true,
    },
  })

  const userIds = users.map(u => u.id)
  const memberships = await prisma.userCompany.findMany({
    where: { userId: { in: userIds } },
  })
  const companies = await prisma.company.findMany({ where: { archived: false } })
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))

  const result = users.map(u => ({
    ...u,
    companies: memberships
      .filter(m => m.userId === u.id)
      .map(m => companyMap[m.companyId])
      .filter(Boolean),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, displayName, email, jobTitle, functionGroup, role, companyIds } = await req.json()

  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const tempPw = generateTempPassword()
  const passwordHash = await hashPassword(tempPw)

  const user = await prisma.user.create({
    data: {
      name,
      displayName: displayName || name,
      email: email.toLowerCase(),
      passwordHash,
      mustChangePw: true,
      role: role ?? 'MEMBER',
      jobTitle: jobTitle ?? '',
      functionGroup: functionGroup ?? '',
    },
  })

  if (companyIds?.length) {
    await prisma.userCompany.createMany({
      data: companyIds.map((cid: string) => ({ userId: user.id, companyId: cid })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ ...user, tempPassword: tempPw }, { status: 201 })
}
