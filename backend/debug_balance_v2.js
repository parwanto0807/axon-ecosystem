const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const endDate = new Date();
  
  const items = await prisma.journalItem.findMany({
    where: { journalEntry: { date: { lte: endDate } } },
    include: { coa: true }
  });

  const summary = {};
  let totalDebit = 0;
  let totalCredit = 0;

  items.forEach(it => {
    const type = it.coa.type;
    if (!summary[type]) summary[type] = { debit: 0, credit: 0, balance: 0 };
    summary[type].debit += (it.debit || 0);
    summary[type].credit += (it.credit || 0);
    
    const coaBalance = it.coa.normalBalance === 'DEBIT' ? (it.debit - it.credit) : (it.credit - it.debit);
    summary[type].balance += coaBalance;

    totalDebit += (it.debit || 0);
    totalCredit += (it.credit || 0);
  });

  console.log('--- Summary by Account Type ---');
  Object.keys(summary).sort().forEach(type => {
    const s = summary[type];
    console.log(`${type.padEnd(20)} | Bal: ${s.balance.toLocaleString().padStart(15)}`);
  });
  console.log('--------------------------------');
  
  const assets = summary['ASET']?.balance || 0;
  const liabs = summary['LIABILITAS']?.balance || 0;
  const equity = summary['EKUITAS']?.balance || 0;
  const income = summary['PENDAPATAN']?.balance || 0;
  const cogs = summary['HPP']?.balance || 0;
  const expense = summary['BEBAN']?.balance || 0;
  const incomeOther = summary['PENDAPATAN_LAIN']?.balance || 0;
  const expenseOther = summary['BEBAN_LAIN']?.balance || 0;

  const netProfit = income - cogs - expense + incomeOther - expenseOther;
  const totalLiabEquity = liabs + equity + netProfit;

  console.log(`ASSETS          : ${assets.toLocaleString()}`);
  console.log(`LIABS + EQUITY + NP: ${totalLiabEquity.toLocaleString()}`);
  console.log(`DIFFERENCE      : ${(assets - totalLiabEquity).toLocaleString()}`);
  
  console.log('--- Raw PL Items ---');
  console.log(`Income: ${income}`);
  console.log(`COGS: ${cogs}`);
  console.log(`Expense: ${expense}`);
  console.log(`Other Inc: ${incomeOther}`);
  console.log(`Other Exp: ${expenseOther}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
