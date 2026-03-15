const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function stats() {
    const counts = {
        coa: await prisma.chartOfAccounts.count(),
        systemAccounts: await prisma.systemAccount.count(),
        journalEntries: await prisma.journalEntry.count(),
        journalItems: await prisma.journalItem.count(),
        invoices: await prisma.invoice.count(),
        stockMovements: await prisma.stockMovement.count(),
        expenses: await prisma.surveyExpense.count()
    };
    console.log('--- TABLE STATS ---');
    console.log(JSON.stringify(counts, null, 2));
}

stats()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
