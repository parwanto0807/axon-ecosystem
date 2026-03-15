const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRange() {
  const min = await prisma.journalEntry.aggregate({ _min: { date: true } });
  const max = await prisma.journalEntry.aggregate({ _max: { date: true } });
  console.log(`Min Date: ${min._min.date ? min._min.date.toISOString() : 'NULL'}`);
  console.log(`Max Date: ${max._max.date ? max._max.date.toISOString() : 'NULL'}`);
}

checkRange()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
