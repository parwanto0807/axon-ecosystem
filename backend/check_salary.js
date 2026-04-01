const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSalaryEntries() {
  const items = await prisma.journalItem.findMany({
    where: {
      OR: [
        { debit: 8000000 },
        { credit: 8000000 }
      ]
    },
    include: {
      coa: true,
      journalEntry: true
    }
  });

  console.log('Found', items.length, 'entries with 8,000,000');
  items.forEach(item => {
    console.log(`- ID: ${item.id}`);
    console.log(`  Entry Date: ${item.journalEntry.date}`);
    console.log(`  Description: ${item.description}`);
    console.log(`  COA: ${item.coa.name} (${item.coa.code})`);
    console.log(`  Debit: ${item.debit}, Credit: ${item.credit}`);
    console.log('---');
  });
}

checkSalaryEntries()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
