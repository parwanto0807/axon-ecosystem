const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSalary() {
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

  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.journalEntryId]) grouped[item.journalEntryId] = [];
    grouped[item.journalEntryId].push(item);
  });

  Object.entries(grouped).forEach(([entryId, items]) => {
    console.log(`\nEntry ID: ${entryId}`);
    items.forEach(it => {
      console.log(`  Item ID: ${it.id} | ${it.coa.name} (${it.coa.code}) | D: ${it.debit} C: ${it.credit} | Desc: ${it.description}`);
    });
  });
}

checkSalary()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
