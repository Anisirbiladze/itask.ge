import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // --- Companies ---
  const dgtl = await prisma.company.upsert({
    where: { id: 'co-dgtl' },
    update: {},
    create: { id: 'co-dgtl', name: 'DGTL', color: '#5B4BC4' },
  })
  const joy = await prisma.company.upsert({
    where: { id: 'co-joy' },
    update: {},
    create: { id: 'co-joy', name: 'JOY', color: '#D8402F' },
  })
  const nomio = await prisma.company.upsert({
    where: { id: 'co-nomio' },
    update: {},
    create: { id: 'co-nomio', name: 'Nomio', color: '#136B7D' },
  })

  console.log('Companies created')

  // --- Settings ---
  await prisma.setting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })

  // --- Users ---
  const tempPw = await argon2.hash('TempPass123!')

  const users = [
    { id: 'u-ani',      name: 'Ani',           displayName: 'Ani',         email: 'ani@itask.ge',        role: 'CEO',    jobTitle: 'Founder',                   functionGroup: '',                    companies: ['co-joy', 'co-dgtl', 'co-nomio'] },
    { id: 'u-iko',      name: 'Iko',           displayName: 'Iko',         email: 'iko@itask.ge',        role: 'CEO',    jobTitle: 'Co-founder',                functionGroup: '',                    companies: ['co-joy', 'co-dgtl', 'co-nomio'] },
    { id: 'u-luka',     name: 'Luka',          displayName: 'Luka',        email: 'luka@itask.ge',       role: 'MEMBER', jobTitle: 'Videographer',              functionGroup: 'Video production',    companies: ['co-joy', 'co-dgtl'] },
    { id: 'u-mziko',    name: 'Mziko',         displayName: 'Mziko',       email: 'mziko@itask.ge',      role: 'MEMBER', jobTitle: 'Designer & video face',     functionGroup: 'Video production',    companies: ['co-joy', 'co-dgtl', 'co-nomio'] },
    { id: 'u-tatia',    name: 'Tatia',         displayName: 'Tatia',       email: 'tatia@itask.ge',      role: 'MEMBER', jobTitle: 'Video face',                functionGroup: 'Video production',    companies: ['co-nomio'] },
    { id: 'u-hesho',    name: 'Hesho',         displayName: 'Hesho',       email: 'hesho@itask.ge',      role: 'MEMBER', jobTitle: 'Motion designer & editor',  functionGroup: 'Design & post-production', companies: ['co-joy', 'co-dgtl', 'co-nomio'] },
    { id: 'u-zura',     name: 'Zura',          displayName: 'Zura',        email: 'zura@itask.ge',       role: 'MEMBER', jobTitle: 'Chain sales manager',       functionGroup: 'Sales',               companies: ['co-joy'] },
    { id: 'u-aniz',     name: 'Ani Zazashvili', displayName: 'Ani Z.',     email: 'aniz@itask.ge',       role: 'MEMBER', jobTitle: 'B2B sales manager',         functionGroup: 'Sales',               companies: ['co-joy'] },
    { id: 'u-ketij',    name: 'Keti',          displayName: 'Keti J.',     email: 'ketij@itask.ge',      role: 'MEMBER', jobTitle: 'Zerp module owner',         functionGroup: 'Product & systems',   companies: ['co-joy'] },
    { id: 'u-ketin',    name: 'Keti',          displayName: 'Keti N.',     email: 'ketin@itask.ge',      role: 'MEMBER', jobTitle: 'Support & projects',        functionGroup: 'Sales',               companies: ['co-nomio'] },
    { id: 'u-mariami',  name: 'Mariami',       displayName: 'Mariami',     email: 'mariami@itask.ge',    role: 'MEMBER', jobTitle: 'Customer support',          functionGroup: 'Support',             companies: ['co-nomio'] },
    { id: 'u-tamo',     name: 'Tamo',          displayName: 'Tamo',        email: 'tamo@itask.ge',       role: 'MEMBER', jobTitle: 'Admin & web support',       functionGroup: 'Admin',               companies: ['co-joy', 'co-dgtl', 'co-nomio'] },
  ] as const

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        displayName: u.displayName,
        email: u.email,
        passwordHash: tempPw,
        mustChangePw: false, // for seed users, allow login without forced change
        role: u.role as any,
        jobTitle: u.jobTitle,
        functionGroup: u.functionGroup,
      },
    })
    // Clear existing memberships and re-create
    await prisma.userCompany.deleteMany({ where: { userId: u.id } })
    for (const cid of u.companies) {
      await prisma.userCompany.create({ data: { userId: u.id, companyId: cid } })
    }
  }

  console.log('Users created — temp password: TempPass123!')

  // --- Checklist templates ---
  const ctVideoEdit = await prisma.checklistTemplate.upsert({
    where: { id: 'ct-video-edit' },
    update: {},
    create: {
      id: 'ct-video-edit',
      name: 'Video edit',
      companyId: 'co-joy',
      items: ['Pull raw files from shared drive', 'Rough cut, under 30 seconds', 'Colour grade', 'Add captions in Georgian', 'Export vertical and square versions'],
    },
  })
  const ctChainContract = await prisma.checklistTemplate.upsert({
    where: { id: 'ct-chain-contract' },
    update: {},
    create: {
      id: 'ct-chain-contract',
      name: 'Chain contract',
      companyId: 'co-joy',
      items: ['Research buyer contact', 'Prepare pitch deck', 'Schedule meeting', 'Follow up on terms', 'Legal review', 'Sign agreement', 'Onboard to system'],
    },
  })
  const ctVisit = await prisma.checklistTemplate.upsert({
    where: { id: 'ct-visit' },
    update: {},
    create: {
      id: 'ct-visit',
      name: 'New object visit',
      companyId: 'co-joy',
      items: ['Confirm appointment', 'Drive to location', 'Inspect & photograph', 'File visit report'],
    },
  })

  console.log('Checklist templates created')

  // --- Recurring templates ---
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-luka-shoot' },
    update: {},
    create: { id: 'rt-luka-shoot', title: 'Shoot — daily video batch', companyId: 'co-joy', assigneeId: 'u-luka', frequency: 'WEEKDAYS', weekdays: [], dueOffsetHours: 10, checklistTemplateId: null },
  })
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-mziko-graphics' },
    update: {},
    create: { id: 'rt-mziko-graphics', title: 'Graphics batch', companyId: 'co-joy', assigneeId: 'u-mziko', frequency: 'WEEKDAYS', weekdays: [], dueOffsetHours: 10 },
  })
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-mariami-support' },
    update: {},
    create: { id: 'rt-mariami-support', title: 'Support queue', companyId: 'co-nomio', assigneeId: 'u-mariami', frequency: 'WEEKDAYS', weekdays: [], dueOffsetHours: 10 },
  })
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-zura-outreach' },
    update: {},
    create: { id: 'rt-zura-outreach', title: 'Chain outreach', companyId: 'co-joy', assigneeId: 'u-zura', frequency: 'WEEKLY', weekdays: [1], dueOffsetHours: 10 },
  })
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-tamo-tickets' },
    update: {},
    create: { id: 'rt-tamo-tickets', title: 'Ticket queue', companyId: 'co-nomio', assigneeId: 'u-tamo', frequency: 'WEEKLY', weekdays: [1], dueOffsetHours: 10 },
  })
  await prisma.recurringTemplate.upsert({
    where: { id: 'rt-tatia-shoot' },
    update: {},
    create: { id: 'rt-tatia-shoot', title: 'Shoot session', companyId: 'co-nomio', assigneeId: 'u-tatia', frequency: 'TWICE_WEEKLY', weekdays: [2, 4], dueOffsetHours: 10 },
  })

  console.log('Recurring templates created')

  // --- Handoff rules ---
  await prisma.handoffRule.upsert({
    where: { id: 'hr-joy-luka-hesho' },
    update: {},
    create: { id: 'hr-joy-luka-hesho', companyId: 'co-joy', fromTitlePattern: 'Shoot — ', fromAssigneeId: 'u-luka', toAssigneeId: 'u-hesho', newTitlePrefix: 'Edit — ', dueAfterHours: 48, checklistTemplateId: 'ct-video-edit' },
  })
  await prisma.handoffRule.upsert({
    where: { id: 'hr-nomio-tatia-hesho' },
    update: {},
    create: { id: 'hr-nomio-tatia-hesho', companyId: 'co-nomio', fromTitlePattern: 'Shoot — ', fromAssigneeId: 'u-tatia', toAssigneeId: 'u-hesho', newTitlePrefix: 'Edit — ', dueAfterHours: 48, checklistTemplateId: 'ct-video-edit' },
  })

  console.log('Handoff rules created')

  // --- Seed tasks ---
  const d = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d }
  const past = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return d }

  // Parent shoot task (already done → triggers handoff)
  const shoot1 = await prisma.task.upsert({
    where: { id: 'task-shoot-closups' },
    update: {},
    create: {
      id: 'task-shoot-closups',
      title: 'Shoot — product close-ups, new flavour angle',
      companyId: 'co-joy',
      assigneeId: 'u-luka',
      status: 'DONE',
      priority: 3,
      createdById: 'u-ani',
      originalDueAt: past(3),
      dueAt: past(3),
      startedAt: past(4),
      completedAt: past(3),
    },
  })

  // Child edit task (waiting 51h — stuck)
  const handoffAt = past(3)
  const edit1 = await prisma.task.upsert({
    where: { id: 'task-edit-closups' },
    update: {},
    create: {
      id: 'task-edit-closups',
      title: 'Edit — product close-ups, new flavour angle',
      companyId: 'co-joy',
      assigneeId: 'u-hesho',
      status: 'WORKING',
      priority: 3,
      createdById: 'u-ani',
      originalDueAt: past(2),
      dueAt: d(1),
      startedAt: past(2),
      parentTaskId: 'task-shoot-closups',
      handoffAt: handoffAt,
    },
  })

  // Seed checklist items for edit1
  await prisma.checklistItem.deleteMany({ where: { taskId: 'task-edit-closups' } })
  await prisma.checklistItem.createMany({
    data: [
      { taskId: 'task-edit-closups', label: 'Pull raw files from shared drive', done: true, position: 0 },
      { taskId: 'task-edit-closups', label: 'Rough cut, under 30 seconds', done: true, position: 1 },
      { taskId: 'task-edit-closups', label: 'Colour grade', done: true, position: 2 },
      { taskId: 'task-edit-closups', label: 'Add captions in Georgian', done: false, position: 3 },
      { taskId: 'task-edit-closups', label: 'Export vertical and square versions', done: false, position: 4 },
    ],
  })

  // Seed events for edit1 (two due-date pushes)
  await prisma.taskEvent.deleteMany({ where: { taskId: 'task-edit-closups' } })
  await prisma.taskEvent.createMany({
    data: [
      { taskId: 'task-edit-closups', actorId: 'u-ani', type: 'CREATED', toValue: 'Edit — product close-ups', createdAt: past(3) },
      { taskId: 'task-edit-closups', actorId: null, type: 'HANDED_OFF', fromValue: 'task-shoot-closups', createdAt: past(3) },
      { taskId: 'task-edit-closups', actorId: 'u-hesho', type: 'STATUS_CHANGED', fromValue: 'NOT_STARTED', toValue: 'WORKING', createdAt: past(2) },
      { taskId: 'task-edit-closups', actorId: 'u-hesho', type: 'DUE_DATE_CHANGED', fromValue: past(2).toISOString(), toValue: past(1).toISOString(), reason: 'raw files incomplete', createdAt: past(2) },
      { taskId: 'task-edit-closups', actorId: 'u-hesho', type: 'DUE_DATE_CHANGED', fromValue: past(1).toISOString(), toValue: d(1).toISOString(), reason: 'waiting on colour grade', createdAt: past(1) },
    ],
  })

  // More tasks
  await prisma.task.upsert({
    where: { id: 'task-giveaway-video' },
    update: {},
    create: { id: 'task-giveaway-video', title: 'Giveaway announcement video', companyId: 'co-joy', assigneeId: 'u-luka', status: 'WORKING', priority: 3, createdById: 'u-ani', originalDueAt: past(1), dueAt: past(1) },
  })
  await prisma.task.upsert({
    where: { id: 'task-carrefour' },
    update: {},
    create: { id: 'task-carrefour', title: 'Carrefour — shelf terms follow-up', companyId: 'co-joy', assigneeId: 'u-zura', status: 'WORKING', priority: 3, createdById: 'u-ani', originalDueAt: d(4), dueAt: d(4) },
  })
  await prisma.task.upsert({
    where: { id: 'task-gldani-visit' },
    update: {},
    create: { id: 'task-gldani-visit', title: 'Entertainment centre, Gldani — visit', companyId: 'co-joy', assigneeId: 'u-aniz', status: 'WORKING', priority: 2, createdById: 'u-ani', originalDueAt: d(0), dueAt: d(0) },
  })
  await prisma.task.upsert({
    where: { id: 'task-merch-module' },
    update: {},
    create: { id: 'task-merch-module', title: 'Merchandising module — test pass', companyId: 'co-joy', assigneeId: 'u-ketij', status: 'WORKING', priority: 2, createdById: 'u-ani', originalDueAt: d(7), dueAt: d(7) },
  })
  await prisma.task.upsert({
    where: { id: 'task-crack-can' },
    update: {},
    create: { id: 'task-crack-can', title: 'Crack the Can — can drop shots', companyId: 'co-joy', assigneeId: 'u-luka', status: 'DONE', priority: 1, createdById: 'u-ani', originalDueAt: d(0), dueAt: d(0), completedAt: new Date() },
  })

  // Nomio tasks
  await prisma.task.upsert({
    where: { id: 'task-checkout-motion' },
    update: {},
    create: { id: 'task-checkout-motion', title: 'Checkout screen — motion pass', companyId: 'co-nomio', assigneeId: 'u-hesho', status: 'WORKING', priority: 2, createdById: 'u-ani', originalDueAt: d(5), dueAt: d(5) },
  })
  await prisma.task.upsert({
    where: { id: 'task-ops-handover' },
    update: {},
    create: { id: 'task-ops-handover', title: 'Ops handover — step 2 of 6', companyId: 'co-nomio', assigneeId: 'u-ketin', status: 'WORKING', priority: 3, createdById: 'u-ani', originalDueAt: d(19), dueAt: d(19) },
  })
  await prisma.task.upsert({
    where: { id: 'task-airport-scene' },
    update: {},
    create: { id: 'task-airport-scene', title: 'Session 2 — airport scene', companyId: 'co-nomio', assigneeId: 'u-tatia', status: 'NOT_STARTED', priority: 2, createdById: 'u-ani', originalDueAt: d(4), dueAt: d(4) },
  })
  await prisma.task.upsert({
    where: { id: 'task-esim-guide' },
    update: {},
    create: { id: 'task-esim-guide', title: 'eSIM install guide — screenshots', companyId: 'co-nomio', assigneeId: 'u-mariami', status: 'WORKING', priority: 1, createdById: 'u-ani', originalDueAt: d(6), dueAt: d(6) },
  })

  // DGTL tasks
  await prisma.task.upsert({
    where: { id: 'task-pitch-deck' },
    update: {},
    create: { id: 'task-pitch-deck', title: 'Pitch deck cover visuals', companyId: 'co-dgtl', assigneeId: 'u-mziko', status: 'WORKING', priority: 2, createdById: 'u-ani', originalDueAt: d(8), dueAt: d(8) },
  })
  await prisma.task.upsert({
    where: { id: 'task-agency-reel' },
    update: {},
    create: { id: 'task-agency-reel', title: 'Agency reel — B-roll pass', companyId: 'co-dgtl', assigneeId: 'u-luka', status: 'NOT_STARTED', priority: 1, createdById: 'u-ani', originalDueAt: d(11), dueAt: d(11) },
  })
  await prisma.task.upsert({
    where: { id: 'task-hero-anim' },
    update: {},
    create: { id: 'task-hero-anim', title: 'Agency site — hero animation', companyId: 'co-dgtl', assigneeId: 'u-hesho', status: 'NOT_STARTED', priority: 1, createdById: 'u-ani', originalDueAt: d(13), dueAt: d(13) },
  })

  console.log('Tasks created')
  console.log('\nSeed complete! Login credentials:')
  console.log('  Email: ani@itask.ge')
  console.log('  Password: TempPass123!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
