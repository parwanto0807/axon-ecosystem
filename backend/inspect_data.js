const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DATA INSPECTION (PI- prefix check) ===');
  
  const piInvoices = await prisma.invoice.findMany({
    where: { number: { startsWith: 'PI-' } },
    select: { number: true, customer: { select: { name: true } } }
  });
  console.log('Customer Invoices with PI- prefix:', JSON.stringify(piInvoices, null, 2));

  const piBills = await prisma.purchaseInvoice.findMany({
    where: { number: { startsWith: 'PI-' } },
    select: { number: true, vendor: { select: { name: true } }, grandTotal: true }
  });
  console.log('Purchase Invoices with PI- prefix:', JSON.stringify(piBills, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
