import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Applying brand tokens to companies…')

  await prisma.company.updateMany({
    where: { name: 'JOY' },
    data: {
      color:       '#F8D000',
      accentInk:   '#12181F',
      accentText:  '#8B7400',
      bgTint:      '#FFFBEA',
      surfaceTint: '#FFFFFF',
      accentTop:   '#FFD80B',
      accentRgb:   '182,150,0',
      slug:        'joy',
    },
  })

  await prisma.company.updateMany({
    where: { name: 'Nomio' },
    data: {
      color:       '#20909C',
      accentInk:   '#FFFFFF',
      accentText:  '#1D828C',
      bgTint:      '#F1F8F9',
      surfaceTint: '#FFFFFF',
      accentTop:   '#2CABB8',
      accentRgb:   '32,144,156',
      slug:        'nomio',
    },
  })

  await prisma.company.updateMany({
    where: { name: 'DGTL' },
    data: {
      color:       '#1720A9',
      accentInk:   '#FFFFFF',
      accentText:  '#1720A9',
      bgTint:      '#F3F4FD',
      surfaceTint: '#FFFFFF',
      accentTop:   '#232DC7',
      accentRgb:   '23,32,169',
      slug:        'dgtl',
    },
  })

  const updated = await prisma.company.findMany({ select: { name: true, color: true, bgTint: true } })
  console.log('Updated:', updated)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
