import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin } from '@/lib/supabase'

const AVATAR_BUCKET = 'avatars'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const userId = formData.get('userId') as string | null

  if (!file || !userId) {
    return NextResponse.json({ error: 'file and userId required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const storagePath = `${userId}.${ext}`
  const supabase = getSupabaseAdmin()
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath)
  const photoUrl = urlData.publicUrl

  await prisma.user.update({ where: { id: userId }, data: { photoUrl } })

  return NextResponse.json({ photoUrl })
}
