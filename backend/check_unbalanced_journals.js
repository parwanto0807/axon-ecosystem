const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const journals = await prisma.journalEntry.findMany({
    include: { items: true }
  });

  const unbalanced = [];
  journals.forEach(j => {
    const totalDebit = j.items.reduce((sum, it) => sum + (it.debit || 0), 0);
    const totalCredit = j.items.reduce((sum, it) => sum + (it.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      unbalanced.push({
        id: j.id,
        number: j.number,
        date: j.date,
        totalDebit,
        totalCredit,
        diff: totalDebit - totalCredit
      });
    }
  });

  console.log('--- Unbalanced Journal Entries ---');
  console.log(JSON.stringify(unbalanced, null, 2));
  console.log(`Summary: Found ${unbalanced.length} unbalanced entries out of ${journals.length} total.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
