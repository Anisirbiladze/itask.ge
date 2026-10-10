import { getSession, isPrivileged } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TranslationsClient from './TranslationsClient'

export default async function TranslationsPage() {
  const session = await getSession()
  if (!isPrivileged(session.role)) redirect('/board')

  const rows = await prisma.translation.findMany()
  const saved = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]))

  return <TranslationsClient saved={saved} />
}
