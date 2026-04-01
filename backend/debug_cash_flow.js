const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCashFlow() {
  // Find all cash-like accounts
  const coas = await prisma.chartOfAccounts.findMany({
    where: {
      OR: [
        { name: { contains: 'Kas', mode: 'insensitive' } },
        { name: { contains: 'Bank', mode: 'insensitive' } }
      ]
    }
  });

  const coaIds = coas.map(c => c.id);

  // Find all items hitting these accounts with amount 8,000,000
  const items = await prisma.journalItem.findMany({
    where: {
      coaId: { in: coaIds },
      OR: [
        { debit: 8000000 },
        { credit: 8000000 }
      ]
    },
    include: { coa: true, journalEntry: true }
  });

  console.log('--- JOURNAL ITEMS (8M) HITTING CASH/BANK ---');
  items.forEach(it => {
    console.log(`ID: ${it.id}`);
    console.log(`  Entry ID: ${it.journalEntryId}`);
    console.log(`  Date: ${it.journalEntry.date.toISOString()}`);
    console.log(`  COA: ${it.coa.name} (${it.coa.code})`);
    console.log(`  Desc: ${it.description}`);
    console.log(`  Amt: ${it.debit > 0 ? it.debit : -it.credit}`);
    console.log('---');
  });
}

debugCashFlow()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
