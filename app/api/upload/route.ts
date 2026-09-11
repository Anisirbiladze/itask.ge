import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const taskId = formData.get('taskId') as string | null

  if (!file || !taskId) return NextResponse.json({ error: 'File and taskId required' }, { status: 400 })

  // Enforce max 3 images per task
  const count = await prisma.taskImage.count({ where: { taskId } })
  if (count >= 3) return NextResponse.json({ error: 'Maximum 3 images per task' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${taskId}/${Date.now()}.${ext}`

  const supabase = getSupabaseAdmin()
  const bytes = await file.arrayBuffer()
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  const image = await prisma.taskImage.create({ data: { taskId, url: urlData.publicUrl } })
  return NextResponse.json(image, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { imageId } = await req.json()
  const image = await prisma.taskImage.findUnique({ where: { id: imageId } })
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Extract path from URL
  const url = new URL(image.url)
  const path = url.pathname.split(`/${STORAGE_BUCKET}/`)[1]

  const supabase = getSupabaseAdmin()
  if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path])

  await prisma.taskImage.delete({ where: { id: imageId } })
  return NextResponse.json({ ok: true })
}
