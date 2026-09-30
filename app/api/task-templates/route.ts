import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// GET /api/task-templates — list all templates (with numeric fields)
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const templates = await prisma.taskTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { numericFields: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json(templates)
}

// POST /api/task-templates — create a template (CEO only)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, body, tagIds, numericFields } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const template = await prisma.taskTemplate.create({
    data: {
      name: name.trim(),
      body: body ?? '',
      tagIds: tagIds ?? [],
      numericFields: numericFields?.length
        ? { create: numericFields.map((f: { label: string }, i: number) => ({ label: f.label, position: i })) }
        : undefined,
    },
    include: { numericFields: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json(template, { status: 201 })
}

// PATCH /api/task-templates — update a template (CEO only)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, name, body, tagIds, numericFields } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.taskTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(body !== undefined && { body }),
      ...(tagIds !== undefined && { tagIds }),
    },
  })

  if (Array.isArray(numericFields)) {
    await prisma.taskTemplateField.deleteMany({ where: { templateId: id } })
    if (numericFields.length > 0) {
      await prisma.taskTemplateField.createMany({
        data: numericFields.map((f: { label: string }, i: number) => ({ templateId: id, label: f.label, position: i })),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/task-templates — delete a template (CEO only)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.taskTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
