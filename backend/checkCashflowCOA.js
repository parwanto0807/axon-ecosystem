const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const coas = await prisma.chartOfAccounts.findMany({
    select: { code: true, name: true, type: true, cashflowType: true },
    where: { cashflowType: { not: 'NONE' } },
    orderBy: { type: 'asc' }
  });
  console.log('COAs with cashflowType != NONE:', coas.length);
  coas.forEach(c => console.log(`${c.type}\t${c.cashflowType}\t${c.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
