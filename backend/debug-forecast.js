const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugForecastLogic() {
  try {
    const today = new Date();
    // 1. Restore the backend logic for finding cash accounts
    const systemCash = await prisma.systemAccount.findMany({ 
      where: { key: { in: ['PETTY_CASH', 'CASH'] } } 
    });

    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: { 
        type: 'ASET',
        OR: [
          { name: { contains: 'Kas', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { id: { in: systemCash.map(a => a.coaId) } }
        ],
        postingType: 'POSTING' 
      }
    });

    console.log('Cash Accounts:', cashAccounts.map(a => `${a.code} - ${a.name}`).join(', '));

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    console.log(`Checking Actuals for: ${monthStart.toISOString()} to ${today.toISOString()}`);

    const actualItems = await prisma.journalItem.findMany({
        where: {
            coaId: { in: cashAccounts.map(a => a.id) },
            journalEntry: { date: { gte: monthStart, lte: today } }
        },
        include: { journalEntry: true, coa: true }
    });

    console.log(`Found ${actualItems.length} actual journal items in cash accounts this month.`);
    let actualIn = 0;
    let actualOut = 0;
    actualItems.forEach(item => {
        console.log(`- [${item.journalEntry.date.toISOString()}] ${item.coa.name}: D:${item.debit} C:${item.credit} (${item.description})`);
        if (item.debit > 0) actualIn += item.debit;
        if (item.credit > 0) actualOut += item.credit;
    });

    console.log(`Total Actual In: ${actualIn}, Out: ${actualOut}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debugForecastLogic();
