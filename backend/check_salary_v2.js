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

  console.log('--- ALL 8,000,000 ENTRIES ---');
  items.forEach(item => {
    console.log(`ID: ${item.id} | Date: ${item.journalEntry.date.toISOString().split('T')[0]} | COA: ${item.coa.name} | Description: ${item.description} | Credit: ${item.credit} | EntryID: ${item.journalEntryId}`);
  });

  const salaryKeywords = ['Gaji', 'Payroll'];
  const salaryItems = await prisma.journalItem.findMany({
    where: {
      description: {
        contains: 'Gaji',
        mode: 'insensitive'
      }
    },
    include: {
      coa: true,
      journalEntry: true
    }
  });

  console.log('\n--- ALL "GAJI" ENTRIES ---');
  salaryItems.forEach(item => {
    console.log(`ID: ${item.id} | Amt: ${item.debit || item.credit} | COA: ${item.coa.name} | Description: ${item.description} | EntryID: ${item.journalEntryId}`);
  });
}

checkSalaryEntries()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
