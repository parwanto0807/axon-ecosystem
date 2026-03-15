const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const categories = [
    "Hardware",
    "Software",
    "Service",
    "Electronics",
    "Office Supplies",
    "Furniture",
    "Cables & Accessories"
  ]

  const units = [
    "pcs",
    "unit",
    "box",
    "pack",
    "kg",
    "m",
    "hour",
    "day",
    "service"
  ]

  console.log('Seeding categories...')
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  console.log('Seeding units...')
  for (const name of units) {
    await prisma.unit.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
