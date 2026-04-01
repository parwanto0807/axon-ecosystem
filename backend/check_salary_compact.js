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
    include: { coa: true, journalEntry: true }
  });

  const res = items.map(it => ({
    id: it.id,
    date: it.journalEntry.date.toISOString().split('T')[0],
    coa: it.coa.name,
    desc: it.description,
    amt: it.debit || -it.credit,
    entryId: it.journalEntryId
  }));

  console.log(JSON.stringify(res, null, 2));
}

checkSalary()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
