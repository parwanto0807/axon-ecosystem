const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAccountTypeBalance(types, endDate, startDate = null) {
  const coas = await prisma.chartOfAccounts.findMany({
    where: { type: { in: types }, postingType: 'POSTING' }
  });

  const items = await prisma.journalItem.groupBy({
    by: ['coaId'],
    where: {
      journalEntry: {
        date: {
          lte: endDate,
          ...(startDate && { gte: startDate })
        }
      }
    },
    _sum: { debit: true, credit: true }
  });

  return coas.map(coa => {
    const movement = items.find(i => i.coaId === coa.id) || { _sum: { debit: 0, credit: 0 } };
    const debit = movement._sum.debit || 0;
    const credit = movement._sum.credit || 0;
    const balance = coa.normalBalance === 'DEBIT' ? (debit - credit) : (credit - debit);

    return { id: coa.id, code: coa.code, name: coa.name, balance };
  }).filter(a => a.balance !== 0);
}

async function runReportSimulation() {
  const reportDate = '2026-03-09';
  const endDate = new Date(new Date(reportDate).setHours(23, 59, 59, 999));
  const startOfYear = new Date(new Date(endDate).getFullYear(), 0, 1);

  console.log(`Simulation for Date: ${reportDate}`);
  console.log(`End Date (UTC): ${endDate.toISOString()}`);
  console.log(`Start of Year (UTC): ${startOfYear.toISOString()}`);

  // 1. Trial Balance
  const coas = await prisma.chartOfAccounts.findMany({
    where: { postingType: 'POSTING' }
  });
  const trialItems = await prisma.journalItem.groupBy({
    by: ['coaId'],
    where: { journalEntry: { date: { lte: endDate } } },
    _sum: { debit: true, credit: true }
  });
  const tb = trialItems.filter(it => it._sum.debit > 0 || it._sum.credit > 0);
  console.log(`\nTrial Balance Entries found: ${tb.length}`);
  tb.forEach(it => {
    const coa = coas.find(c => c.id === it.coaId);
    console.log(`  - ${coa?.code} (${coa?.name}): D:${it._sum.debit} C:${it._sum.credit}`);
  });

  // 2. Profit & Loss (Beban)
  const expenses = await getAccountTypeBalance(['BEBAN'], endDate, startOfYear);
  console.log(`\nP&L Expenses found: ${expenses.length}`);
  expenses.forEach(e => {
    console.log(`  - ${e.code} (${e.name}): Balance: ${e.balance}`);
  });

  // 3. Balance Sheet (Assets)
  const assets = await getAccountTypeBalance(['ASET'], endDate);
  console.log(`\nBalance Sheet Assets found: ${assets.length}`);
  assets.forEach(a => {
    console.log(`  - ${a.code} (${a.name}): Balance: ${a.balance}`);
  });
}

runReportSimulation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
