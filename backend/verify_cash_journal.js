const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('Simulating Cash Bill Posting Journaling...');

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { paymentType: 'CASH', status: 'DRAFT' },
    include: { vendor: true }
  });

  if (!invoice) {
    console.log('No DRAFT CASH Invoice found. Please create one in the UI first.');
    return;
  }

  console.log(`Testing with Invoice: ${invoice.number} (Grand Total: ${invoice.grandTotal})`);

  // We won't actually post it but we will simulate the logic
  const apAcc = await prisma.systemAccount.findUnique({ where: { key: 'ACCOUNTS_PAYABLE' }, include: { coa: true } });
  const unbilledAcc = await prisma.systemAccount.findUnique({ where: { key: 'UNBILLED_RECEIPT' }, include: { coa: true } });
  const staffAdvAcc = await prisma.systemAccount.findUnique({ where: { key: 'STAFF_ADVANCE' }, include: { coa: true } });

  console.log('\nSystem Accounts Mapping:');
  console.log(`AP: ${apAcc?.coa?.code}`);
  console.log(`Unbilled: ${unbilledAcc?.coa?.code}`);
  console.log(`Staff Advance: ${staffAdvAcc?.coa?.code}`);

  const journalItems = [
    { coaId: unbilledAcc.coaId, debit: invoice.grandTotal, credit: 0, description: 'Menghapus Akrual Stock IN' },
    { coaId: apAcc.coaId, debit: 0, credit: invoice.grandTotal, description: 'Mencatat faktur masuk (mampir)' },
    { coaId: apAcc.coaId, debit: invoice.grandTotal, credit: 0, description: 'Pelunasan otomatis' },
    { coaId: staffAdvAcc.coaId, debit: 0, credit: invoice.grandTotal, description: 'Menghapus Piutang Uang Muka' }
  ];

  console.log('\nGenerated Journal Items for CASH:');
  console.table(journalItems.map(it => ({
    COA: it.coaId === apAcc.coaId ? apAcc.coa.code : (it.coaId === unbilledAcc.coaId ? unbilledAcc.coa.code : staffAdvAcc.coa.code),
    Debit: it.debit,
    Credit: it.credit,
    Desc: it.description
  })));
  
  const totalDebit = journalItems.reduce((s, i) => s + i.debit, 0);
  const totalCredit = journalItems.reduce((s, i) => s + i.credit, 0);
  console.log(`\nBalance Status: ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'BALANCED' : 'UNBALANCED'}`);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
