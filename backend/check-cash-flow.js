const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEveryThingThisMonth() {
  try {
    const today = new Date();
    const start = new Date("2026-03-01T00:00:00");
    const end = new Date("2026-03-31T23:59:59");

    console.log(`Deep Checking Everything for: ${start.toISOString()} to ${end.toISOString()}`);

    // 1. All Journal Entries this month
    const entries = await prisma.journalEntry.findMany({
      where: {
        date: { gte: start, lte: end }
      },
      include: { items: { include: { coa: true } } }
    });

    console.log(`\nFound ${entries.length} Journal Entries this month.`);
    entries.forEach(e => {
        console.log(`- [${e.date.toISOString().split('T')[0]}] ${e.number}: ${e.description}`);
        e.items.forEach(i => {
            console.log(`  > ${i.coa.code} ${i.coa.name}: D:${i.debit} C:${i.credit} (${i.coa.cashflowType})`);
        });
    });

    // 2. All Purchase Invoices this month (by date or updatedAt)
    const pis = await prisma.purchaseInvoice.findMany({
      where: {
        OR: [
          { date: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end } }
        ]
      },
      include: { vendor: true }
    });

    console.log(`\nFound ${pis.length} Purchase Invoices updated/dated this month.`);
    pis.forEach(pi => {
        console.log(`- ${pi.number} (${pi.status}) - ${pi.vendor.name} - Total: ${pi.grandTotal} - Due: ${pi.dueDate?.toISOString().split('T')[0]}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkEveryThingThisMonth();
