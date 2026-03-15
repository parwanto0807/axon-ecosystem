const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const mapping = {
      'Beban Mobilisasi': '5-10102',
      'Bensin & Tol': '6-10801-01',
      'Parkir': '6-10803-01',
      'Makan & Akomodasi': '6-11001-02',
      'Alat Tulis & Kantor': '6-10204-01'
    };

    // Find JournalItems using COA 6-10206 that belong to Expense journals
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

    console.log(`Processing ${items.length} items for correction...`);

    for (const item of items) {
      const expense = await prisma.surveyExpense.findUnique({
        where: { id: item.journalEntry.reference }
      });
      
      if (expense && mapping[expense.category]) {
        const targetCode = mapping[expense.category];
        const targetCoa = await prisma.chartOfAccounts.findUnique({
          where: { code: targetCode }
        });

        if (targetCoa) {
          await prisma.journalItem.update({
            where: { id: item.id },
            data: { coaId: targetCoa.id }
          });
          console.log(`UPDATED: JV ${item.journalEntry.number} (${expense.category}) moved from 6-10206 to ${targetCode}`);
        } else {
          console.log(`WARNING: Target COA ${targetCode} not found for category ${expense.category}`);
        }
      } else if (expense) {
        // Fallback for categories not in mapping
        const fallbackCoa = await prisma.chartOfAccounts.findUnique({
          where: { code: '6-11400' }
        });
        if (fallbackCoa) {
            await prisma.journalItem.update({
                where: { id: item.id },
                data: { coaId: fallbackCoa.id }
            });
            console.log(`UPDATED: JV ${item.journalEntry.number} (${expense.category}) moved from 6-10206 to 6-11400 (Fallback)`);
        }
      }
    }

    console.log('Correction completed.');

  } catch (err) {
    console.error(err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
