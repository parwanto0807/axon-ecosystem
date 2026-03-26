const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const vendors = await prisma.$queryRaw`SELECT id, "businessCategoryId" FROM "Vendor" LIMIT 5`;
    console.log('Vendors Raw:', JSON.stringify(vendors, null, 2));
  } catch (e) {
    console.log('Error or Column missing:', e.message);
  }
}

check().finally(() => prisma.$disconnect());
