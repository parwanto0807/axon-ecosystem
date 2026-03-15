const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  try {
    const systems = await prisma.systemAccount.findMany({
      include: { coa: true }
    });
    const coas = await prisma.chartOfAccounts.findMany({
      where: {
        OR: [
          { code: { startsWith: '1-' } },
          { code: { startsWith: '5-' } },
          { code: { startsWith: '6-' } }
        ]
      },
      orderBy: { code: 'asc' },
      select: { code: true, name: true }
    });
    
    const data = {
      systemAccounts: systems.map(s => ({ key: s.key, code: s.coa?.code, name: s.coa?.name })),
      coas: coas
    };
    
    fs.writeFileSync('coa_dump.json', JSON.stringify(data, null, 2));
    console.log('Dumped to coa_dump.json');

  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
