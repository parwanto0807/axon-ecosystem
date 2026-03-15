const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const coas = await prisma.chartOfAccounts.findMany({
    select: { code: true, name: true, type: true, cashflowType: true, isReconcilable: true },
    where: { isReconcilable: true }
  });
  console.log('Reconcilable accounts:');
  console.log(coas.map(c => `${c.code} - ${c.name} (${c.type})`).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
