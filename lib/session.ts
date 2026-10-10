import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId?: string
  role?: 'CEO' | 'ADMIN' | 'MEMBER'
  mustChangePw?: boolean
}

/** Returns true for both CEO and ADMIN roles */
export function isPrivileged(role?: string | null): boolean {
  return role === 'CEO' || role === 'ADMIN'
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-dev-secret-please-change-in-production',
  cookieName: 'itask_session',
  ttl: 60 * 60 * 24 * 30, // 30 days
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
