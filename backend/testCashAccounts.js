const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const coas = await prisma.chartOfAccounts.findMany({
    where: {
      type: 'ASET',
      OR: [
        { name: { contains: 'Kas', mode: 'insensitive' } },
        { name: { contains: 'Bank', mode: 'insensitive' } },
        { id: { in: (await prisma.systemAccount.findMany({ where: { key: { in: ['PETTY_CASH', 'CASH'] } } })).map(a => a.coaId) } }
      ]
    }
  });
  console.log(coas.map(c => c.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
