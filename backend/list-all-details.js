const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const entries = await prisma.journalEntry.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { coa: true } } }
  });

  console.log(`--- LISTING ${entries.length} JOURNAL ENTRIES ---`);
  entries.forEach(e => {
    console.log(`[${e.number}] Type: ${e.type}, Date: ${e.date.toISOString()}, CreatedAt: ${e.createdAt.toISOString()}`);
    e.items.forEach(it => {
      console.log(`  - ${it.coa.code} D:${it.debit} C:${it.credit}`);
    });
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
