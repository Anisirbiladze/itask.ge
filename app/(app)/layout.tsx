import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import AppShell, { type Me, type Company } from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const [user, memberships, companies, counts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, displayName: true, role: true, jobTitle: true, functionGroup: true, mustChangePw: true, archived: true },
    }),
    prisma.userCompany.findMany({ where: { userId: session.userId } }),
    prisma.company.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
    prisma.task.groupBy({
      by: ['companyId'],
      where: { archived: false, status: { not: 'DONE' }, companyId: { not: null } },
      _count: { id: true },
    }),
  ])

  if (!user || user.archived) redirect('/login')
  if (user.mustChangePw) redirect('/change-password')

  const companyIds = memberships.map(m => m.companyId)
  const countMap = Object.fromEntries(counts.map(c => [c.companyId!, c._count.id]))
  const allCompanies: Company[] = companies.map(c => ({ ...c, openCount: countMap[c.id] ?? 0 }))
  const userCompanies = allCompanies.filter(c => companyIds.includes(c.id))

  const initialMe: Me = {
    id: user.id,
    displayName: user.displayName,
    role: user.role as 'CEO' | 'MEMBER',
    mustChangePw: user.mustChangePw,
    functionGroup: user.functionGroup,
    companies: userCompanies,
  }

  return (
    <AppShell initialMe={initialMe} initialCompanies={allCompanies}>
      {children}
    </AppShell>
  )
}
