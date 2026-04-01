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

async function main() {
  const dateStr = '2026-04-01';
  const endDate = new Date(dateStr + 'T23:59:59.999');

  const assets = await getAccountTypeBalance(['ASET'], endDate);
  const liabilities = await getAccountTypeBalance(['LIABILITAS'], endDate);
  const equity = await getAccountTypeBalance(['EKUITAS'], endDate);

  const startOfYear = new Date(endDate.getFullYear(), 0, 1);
  const revenues = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], endDate, startOfYear);
  const cogs = await getAccountTypeBalance(['HPP'], endDate, startOfYear);
  const expenses = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], endDate, startOfYear);

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiab = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);
  
  const totalRev = revenues.reduce((sum, a) => sum + a.balance, 0);
  const totalCOG = cogs.reduce((sum, a) => sum + a.balance, 0);
  const totalExp = expenses.reduce((sum, a) => sum + a.balance, 0);
  const netProfit = totalRev - totalCOG - totalExp;

  console.log('--- ASSETS ---');
  assets.forEach(a => console.log(`${a.code} | ${a.name.padEnd(30)} | ${a.balance}`));
  console.log(`TOTAL ASSETS: ${totalAssets}`);

  console.log('\n--- LIABS ---');
  liabilities.forEach(l => console.log(`${l.code} | ${l.name.padEnd(30)} | ${l.balance}`));
  
  console.log('\n--- EQUITY ---');
  equity.forEach(e => console.log(`${e.code} | ${e.name.padEnd(30)} | ${e.balance}`));
  console.log(`NET PROFIT: ${netProfit}`);
  
  const totalPasiva = totalLiab + totalEquity + netProfit;
  console.log(`TOTAL PASIVA: ${totalPasiva}`);
  console.log(`DIFFERENCE: ${totalAssets - totalPasiva}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
