const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // 1. Delete the journal entry items and the journal entry itself
    console.log('Finding Journal Entry JV-2026-0147...');
    const je = await prisma.journalEntry.findUnique({
      where: { number: 'JV-2026-0147' }
    });
    
    if (je) {
      console.log('Deleting journal items...');
      await prisma.journalItem.deleteMany({
        where: { journalEntryId: je.id }
      });
      console.log('Deleting journal entry...');
      await prisma.journalEntry.delete({
        where: { id: je.id }
      });
      console.log('Journal Entry deleted successfully.');
    } else {
      console.log('Journal Entry JV-2026-0147 not found. It may have already been deleted.');
    }

    // 2. Find and reset Invoice INV-2026-0055
    console.log('Finding Invoice INV-2026-0055...');
    const inv = await prisma.invoice.findUnique({
      where: { number: 'INV-2026-0055' }
    });

    if (inv) {
      console.log('Resetting invoice status to POSTED...');
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'POSTED' }
      });
      
      console.log('Deleting any InvoicePayment records...');
      await prisma.invoicePayment.deleteMany({
        where: { invoiceId: inv.id }
      });
      
      console.log('Invoice reset successfully.');
    } else {
      console.log('Invoice INV-2026-0055 not found.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
