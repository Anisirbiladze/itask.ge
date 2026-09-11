import { createClient } from '@supabase/supabase-js'

export const STORAGE_BUCKET = 'task-images'

// Public client — lazy so build doesn't fail without env vars
export function getSupabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env vars not set')
  return createClient(url, anon)
}

// Server-only admin client — lazy for the same reason
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error('Supabase service env vars not set')
  return createClient(url, service)
}
