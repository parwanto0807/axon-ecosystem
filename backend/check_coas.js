const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const systems = await prisma.systemAccount.findMany({
      include: { coa: true }
    });
    console.log('--- System Accounts ---');
    systems.forEach(s => console.log(`${s.key}: ${s.coa?.code} - ${s.coa?.name}`));

    const coas = await prisma.chartOfAccounts.findMany({
      where: {
        OR: [
          { code: { startsWith: '5-' } },
          { code: { startsWith: '6-' } }
        ]
      },
      orderBy: { code: 'asc' },
      select: { code: true, name: true }
    });
    console.log('\n--- 5-xxxx and 6-xxxx COAs ---');
    coas.forEach(c => console.log(`${c.code}: ${c.name}`));

  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
