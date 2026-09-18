import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import AppShell, { type Me, type Company } from '@/components/AppShell'


const getCachedCompanies = unstable_cache(
  () => prisma.company.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
  ['companies'],
  { revalidate: 30 }
)

const getCachedTaskCounts = unstable_cache(
  () => prisma.task.groupBy({
    by: ['companyId'],
    where: { archived: false, status: { not: 'DONE' }, companyId: { not: null } },
    _count: { id: true },
  }),
  ['task-counts'],
  { revalidate: 20 }
)

const getCachedAllUsers = unstable_cache(
  () => prisma.user.findMany({ where: { archived: false }, orderBy: { name: 'asc' }, select: { id: true, displayName: true } }),
  ['all-users'],
  { revalidate: 30 }
)

const getCachedAllMemberships = unstable_cache(
  () => prisma.userCompany.findMany(),
  ['all-memberships'],
  { revalidate: 30 }
)

function getCachedUser(userId: string) {
  return unstable_cache(
    () => prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, displayName: true, role: true, jobTitle: true, functionGroup: true, mustChangePw: true, archived: true, photoUrl: true },
    }),
    [`user-${userId}`],
    { revalidate: 20 }
  )()
}

function getCachedUserMemberships(userId: string) {
  return unstable_cache(
    () => prisma.userCompany.findMany({ where: { userId } }),
    [`user-memberships-${userId}`],
    { revalidate: 20 }
  )()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const [user, memberships, companies, counts, allUsers, allMemberships, translationRows] = await Promise.all([
    getCachedUser(session.userId),
    getCachedUserMemberships(session.userId),
    getCachedCompanies(),
    getCachedTaskCounts(),
    getCachedAllUsers(),
    getCachedAllMemberships(),
    prisma.translation.findMany(),
  ])

  if (!user || user.archived) redirect('/login')
  if (user.mustChangePw) redirect('/change-password')

  const companyIds = memberships.map((m: { companyId: string }) => m.companyId)
  const countMap = Object.fromEntries((counts as { companyId: string | null; _count: { id: number } }[]).map(c => [c.companyId!, c._count.id]))
  const allCompanies: Company[] = companies.map((c: { id: string; name: string; color: string; accentInk: string; accentText: string; bgTint: string; surfaceTint: string; accentTop: string; accentRgb: string; logoUrl: string | null; markUrl: string | null; logoLightUrl: string | null }) => ({ ...c, openCount: countMap[c.id] ?? 0 }))
  const userCompanies = allCompanies.filter(c => companyIds.includes(c.id))

  const enrichedUsers = allUsers.map((u: { id: string; displayName: string }) => ({
    id: u.id,
    displayName: u.displayName,
    companyIds: allMemberships.filter((m: { userId: string; companyId: string }) => m.userId === u.id).map((m: { userId: string; companyId: string }) => m.companyId),
  }))

  const initialMe: Me = {
    id: user.id,
    displayName: user.displayName,
    role: user.role as 'CEO' | 'MEMBER',
    mustChangePw: user.mustChangePw,
    functionGroup: user.functionGroup,
    photoUrl: user.photoUrl ?? null,
    companies: userCompanies,
  }

  const initialTranslations = Object.fromEntries(
    (translationRows as { key: string; value: string }[]).map(r => [r.key, r.value])
  )

  return (
    <AppShell initialMe={initialMe} initialCompanies={allCompanies} initialUsers={enrichedUsers} initialTranslations={initialTranslations}>
      {children}
    </AppShell>
  )
}
