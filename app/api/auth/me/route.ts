import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, name: true, displayName: true, role: true,
      jobTitle: true, functionGroup: true, mustChangePw: true, archived: true,
    },
  })
  if (!user || user.archived) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const memberships = await prisma.userCompany.findMany({ where: { userId: user.id } })
  const companyIds = memberships.map(m => m.companyId)
  const companies = await prisma.company.findMany({ where: { id: { in: companyIds } } })

  return NextResponse.json({ ...user, companies })
}
