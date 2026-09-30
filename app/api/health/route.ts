import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, unknown> = {}
  try {
    await prisma.company.count()
    checks.company = 'ok'
  } catch (e) { checks.company = String(e) }
  try {
    await prisma.task.count()
    checks.task = 'ok'
  } catch (e) { checks.task = String(e) }
  try {
    await prisma.tag.count()
    checks.tag = 'ok'
  } catch (e) { checks.tag = String(e) }
  try {
    await prisma.taskTemplate.count()
    checks.taskTemplate = 'ok'
  } catch (e) { checks.taskTemplate = String(e) }
  try {
    await prisma.translation.count()
    checks.translation = 'ok'
  } catch (e) { checks.translation = String(e) }
  return NextResponse.json({ ok: true, checks })
}
