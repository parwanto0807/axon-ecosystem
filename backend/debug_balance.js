const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const endDate = new Date();
  
  // Get all JournalItems up to endDate
  const items = await prisma.journalItem.findMany({
    where: { journalEntry: { date: { lte: endDate } } },
    include: { coa: true }
  });

  const summary = {};
  let totalDebit = 0;
  let totalCredit = 0;

  items.forEach(it => {
    const type = it.coa.type;
    if (!summary[type]) summary[type] = { debit: 0, credit: 0 };
    summary[type].debit += (it.debit || 0);
    summary[type].credit += (it.credit || 0);
    totalDebit += (it.debit || 0);
    totalCredit += (it.credit || 0);
  });

  console.log('--- Summary by Account Type ---');
  Object.keys(summary).sort().forEach(type => {
    const s = summary[type];
    console.log(`${type.padEnd(15)} | Debit: ${s.debit.toLocaleString().padStart(15)} | Credit: ${s.credit.toLocaleString().padStart(15)}`);
  });
  console.log('--------------------------------');
  console.log(`TOTAL           | Debit: ${totalDebit.toLocaleString().padStart(15)} | Credit: ${totalCredit.toLocaleString().padStart(15)}`);
  console.log(`DIFFERENCE      | ${totalDebit - totalCredit}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
