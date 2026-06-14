const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { number: 'INV-2026-0055' },
      include: { payments: true }
    });
    console.log('Invoice:', JSON.stringify(inv, null, 2));

    const je = await prisma.journalEntry.findMany({
      where: { reference: 'INV-2026-0055' },
      include: { items: true }
    });
    console.log('Journal Entries:', JSON.stringify(je, null, 2));

    const allJes = await prisma.journalEntry.findMany({
      where: { description: { contains: 'INV-2026-0055' } },
      include: { items: true }
    });
    console.log('Other JEs containing INV-2026-0055:', JSON.stringify(allJes, null, 2));

    // Cleanup script
    console.log('--- Cleaning Up ---');
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'POSTED' } });
    
    // Delete the JEs
    for (const j of allJes) {
      await prisma.journalItem.deleteMany({ where: { journalEntryId: j.id } });
      await prisma.journalEntry.delete({ where: { id: j.id } });
    }
    for (const j of je) {
      if (!allJes.some(a => a.id === j.id)) {
        await prisma.journalItem.deleteMany({ where: { journalEntryId: j.id } });
        await prisma.journalEntry.delete({ where: { id: j.id } });
      }
    }
    console.log('Cleanup Done');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
