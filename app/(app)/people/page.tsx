import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import PeopleClient, { type User } from './PeopleClient'

export default async function PeoplePage() {
  const session = await getSession()
  if (!session.userId) return null

  const [users, memberships, companies] = await Promise.all([
    prisma.user.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, displayName: true, email: true, role: true, jobTitle: true, functionGroup: true, archived: true, photoUrl: true },
    }),
    prisma.userCompany.findMany(),
    prisma.company.findMany({ where: { archived: false } }),
  ])

  const companyMap = Object.fromEntries(companies.map((c: { id: string; name: string; color: string }) => [c.id, c]))
  const enriched = users.map((u: { id: string; name: string; displayName: string; email: string; role: string; jobTitle: string; functionGroup: string; archived: boolean }) => ({
    ...u,
    role: u.role as 'CEO' | 'MEMBER',
    companies: memberships.filter((m: { userId: string; companyId: string }) => m.userId === u.id).map((m: { userId: string; companyId: string }) => companyMap[m.companyId]).filter(Boolean).map((c: { id: string; name: string; color: string }) => ({ id: c.id, name: c.name, color: c.color })),
  }))

  return <PeopleClient initialUsers={enriched} />
}
