import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session.userId) return null

  const [settings, recurring, handoffs, checklists, users] = await Promise.all([
    prisma.setting.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } }),
    prisma.recurringTemplate.findMany({ orderBy: { id: 'asc' } }),
    prisma.handoffRule.findMany({ where: { active: true } }),
    prisma.checklistTemplate.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { archived: false }, orderBy: { name: 'asc' }, select: { id: true, displayName: true } }),
  ])

  return (
    <SettingsClient
      initialSettings={settings}
      initialRecurring={recurring}
      initialHandoffs={handoffs}
      initialChecklists={checklists}
      initialUsers={users}
    />
  )
}
