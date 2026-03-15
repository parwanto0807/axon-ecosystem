const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== LISTING ALL 6- SERIES COAS ===');

  const coas = await prisma.chartOfAccounts.findMany({
    where: {
      code: { startsWith: '6-' }
    },
    select: { id: true, code: true, name: true }
  });

  coas.forEach(c => {
    console.log(`${c.id} | ${c.code} | ${c.name}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
