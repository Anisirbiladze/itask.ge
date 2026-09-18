import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import LiveClient from './LiveClient'

export default async function LivePage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')
  return <LiveClient />
}
