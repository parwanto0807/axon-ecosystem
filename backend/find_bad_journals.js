const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find JournalItems using COA 6-10206 that belong to Expense references
    const items = await prisma.journalItem.findMany({
      where: {
        coa: { code: '6-10206' },
        journalEntry: {
          reference: { not: null },
          type: 'EXPENSE'
        }
      },
      include: {
        coa: true,
        journalEntry: true
      }
    });

    console.log(`Found ${items.length} items with COA 6-10206 in Expense journals.`);

    for (const item of items) {
      const expense = await prisma.surveyExpense.findUnique({
        where: { id: item.journalEntry.reference }
      });
      if (expense) {
        console.log(`- JV: ${item.journalEntry.number}, Category: ${expense.category}, Desc: ${expense.description}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
