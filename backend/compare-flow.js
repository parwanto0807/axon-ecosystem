const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareFlow() {
  try {
    const start = new Date('2026-03-01');
    
    // 1. Identify Cash/Bank Accounts
    const systemCash = await prisma.systemAccount.findMany({ where: { key: { in: ['PETTY_CASH', 'CASH'] } } });
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

    // 2. Get All Cash Outflows this month
    const outflows = await prisma.journalItem.findMany({
      where: {
        coaId: { in: cashAccounts.map(a => a.id) },
        journalEntry: { date: { gte: start } },
        credit: { gt: 0 }
      },
      include: { journalEntry: true, coa: true }
    });

    console.log('--- REINCAN UANG KELUAR (CASH BASIS) ---');
    let totalCashOut = 0;
    outflows.forEach(i => {
      console.log(`- [${i.coa.name}] ${i.credit.toLocaleString('id-ID')} | ${i.description || i.journalEntry.description}`);
      totalCashOut += i.credit;
    });
    console.log(`TOTAL UANG KELUAR: Rp ${totalCashOut.toLocaleString('id-ID')}`);

    // 3. Get All Expenses (Accrual Basis) for Comparison
    const expAccs = await prisma.chartOfAccounts.findMany({
       where: {
         OR: [
           { code: { startsWith: '5' } },
           { code: { startsWith: '6' } }
         ]
       }
    });

    const expItems = await prisma.journalItem.findMany({
      where: {
        coaId: { in: expAccs.map(a => a.id) },
        journalEntry: { date: { gte: start } },
        debit: { gt: 0 }
      },
      include: { coa: true }
    });

    console.log('\n--- RINCIAN BIAYA DI LABA RUGI (ACCRUAL BASIS) ---');
    let totalExp = 0;
    const summary = {};
    expItems.forEach(i => {
      summary[i.coa.name] = (summary[i.coa.name] || 0) + i.debit;
      totalExp += i.debit;
    });
    Object.entries(summary).forEach(([name, val]) => {
      console.log(`- ${name}: Rp ${val.toLocaleString('id-ID')}`);
    });
    console.log(`TOTAL BIAYA LABA RUGI: Rp ${totalExp.toLocaleString('id-ID')}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

compareFlow();
