const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startOfMonth = new Date(2026, 2, 1);
  const endOfMonth = new Date(2026, 2, 31, 23, 59, 59);

  // Search for Cash/Bank accounts by name
  const cashAccounts = await prisma.chartOfAccounts.findMany({
    where: { 
      OR: [
        { name: { contains: 'Kas' } },
        { name: { contains: 'Bank' } },
        { code: { startsWith: '1-101' } } // Common code pattern for Cash/Bank
      ]
    }
  });
  
  const cashAccountIds = cashAccounts.map(a => a.id);
  console.log(`Auditing Journal Items for Mar 2026 (Accounts Found: ${cashAccountIds.length})`);
  cashAccounts.forEach(a => console.log(`  - ${a.code} | ${a.name}`));

  // Aggregate Journal Items directly linked to Cash/Bank COAs
  const items = await prisma.journalItem.findMany({
    where: {
      journalEntry: { date: { gte: startOfMonth, lte: endOfMonth } },
      coaId: { in: cashAccountIds }
    }
  });

  let actualIn = 0;
  let actualOut = 0;

  items.forEach(j => {
    actualIn += j.debit;
    actualOut += j.credit;
  });

  console.log('\n--- JOURNAL TOTALS ---');
  console.log('Actual Inflow (Debit):', actualIn);
  console.log('Actual Outflow (Credit):', actualOut);

  // Check Projected items (Unpaid Invoice)
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ['PAID', 'CANCELLED'] },
      OR: [
        { dueDate: { lte: endOfMonth } },
        { dueDate: null }
      ]
    }
  });
  let projIn = invoices.reduce((s, i) => s + i.grandTotal, 0);
  console.log('\n--- PROJECTED ITEMS ---');
  console.log('Outstanding Invoices Total:', projIn);
  invoices.forEach(i => console.log(`  - ${i.number}: ${i.grandTotal}`));

  const bills = await prisma.purchaseInvoice.findMany({
    where: {
      status: { notIn: ['PAID', 'CANCELLED'] },
      paymentType: { not: 'CASH' },
      OR: [
        { dueDate: { lte: endOfMonth } },
        { dueDate: null }
      ]
    }
  });
  let projBill = bills.reduce((s, b) => s + b.grandTotal, 0);
  console.log('Outstanding Bills Total:', projBill);

  const opex = await prisma.operationalExpense.findMany({
    where: { month: 3, year: 2026, status: { notIn: ['PAID', 'REJECTED'] } }
  });
  let projOpex = opex.reduce((s, o) => s + o.amount, 0);
  console.log('Operational Expenses Total:', projOpex);

  console.log('\n--- FINAL CALCULATION ---');
  console.log('Total Masuk (Actual + Proj):', actualIn + projIn);
  console.log('Total Keluar (Actual + Proj):', actualOut + projBill + projOpex);
  console.log('Net Change:', (actualIn + projIn) - (actualOut + projBill + projOpex));

  await prisma.$disconnect();
}

main();
