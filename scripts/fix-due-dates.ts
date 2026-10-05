/**
 * One-time script to correct task deadlines that were stored with wrong timezone.
 *
 * Problem: before the +04:00 fix, times entered as "19:00 Georgia" were stored as
 * either 19:00 UTC (= 23:00 Georgia) or 14:00 UTC (= 18:00 Georgia).
 *
 * Strategy: shift ALL dueAt / originalDueAt that are NOT exactly on 15:00 UTC
 * (= 19:00 Georgia, the correct default) to the nearest clean hour that makes
 * sense in Georgian time, OR simply ask: "what was the intended Georgia hour?"
 *
 * Since the app is new and deadlines were almost always set to the 19:00 default,
 * this script finds tasks whose deadline hour (in UTC) is 14, 15, 18, or 19 and
 * adjusts them to 15:00 UTC (= 19:00 Georgia).
 *
 * Run: npx tsx scripts/fix-due-dates.ts
 * DRY-RUN by default — set DRY_RUN=false to apply changes.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN !== 'false'

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN (no changes applied) ---' : '--- APPLYING CHANGES ---')

  const tasks = await prisma.task.findMany({
    where: { archived: false, dueAt: { not: null } },
    select: { id: true, title: true, dueAt: true, originalDueAt: true },
  })

  let changed = 0

  for (const task of tasks) {
    if (!task.dueAt) continue

    const d = task.dueAt
    const utcH = d.getUTCHours()
    const utcM = d.getUTCMinutes()

    // Targeted hours that were produced by the timezone bugs when user picked 19:00 Georgia:
    // Bug 1: 19:00 UTC (= 23:00 Georgia)  → correct to 15:00 UTC (= 19:00 Georgia)
    // Bug 2: 14:00 UTC (= 18:00 Georgia)  → correct to 15:00 UTC (= 19:00 Georgia)
    // Bug 3: 18:00 UTC (= 22:00 Georgia?) → might be intentional, skip
    // Already correct: 15:00 UTC → skip

    let deltaH: number | null = null
    if (utcH === 19 && utcM === 0) deltaH = -4  // Bug 1: 19 UTC → 15 UTC
    if (utcH === 14 && utcM === 0) deltaH = +1  // Bug 2: 14 UTC → 15 UTC

    if (deltaH === null) {
      console.log(`  skip  "${task.title}" — ${d.toISOString()} (${utcH}:${String(utcM).padStart(2,'0')} UTC)`)
      continue
    }

    const newDue = new Date(d.getTime() + deltaH * 3600 * 1000)
    const newOrig = task.originalDueAt
      ? new Date(task.originalDueAt.getTime() + deltaH * 3600 * 1000)
      : null

    console.log(`  fix   "${task.title}" ${d.toISOString()} → ${newDue.toISOString()}`)

    if (!DRY_RUN) {
      await prisma.task.update({
        where: { id: task.id },
        data: { dueAt: newDue, originalDueAt: newOrig ?? undefined },
      })
    }
    changed++
  }

  console.log(`\n${DRY_RUN ? 'Would fix' : 'Fixed'} ${changed} / ${tasks.length} tasks.`)
  if (DRY_RUN) console.log('Run with DRY_RUN=false to apply: DRY_RUN=false npx tsx scripts/fix-due-dates.ts')
}

main().catch(console.error).finally(() => prisma.$disconnect())
