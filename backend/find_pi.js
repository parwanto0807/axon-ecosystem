const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const number = 'PI-2026-006';
  console.log(`=== SEARCHING FOR ${number} ===`);

  const bill = await prisma.purchaseInvoice.findUnique({
    where: { number },
    include: { vendor: true }
  });
  if (bill) {
    console.log('FOUND IN purchaseInvoice:');
    console.log(JSON.stringify(bill, null, 2));
  } else {
    console.log('NOT FOUND in purchaseInvoice.');
  }

  const inv = await prisma.invoice.findUnique({
    where: { number },
    include: { customer: true }
  });
  if (inv) {
    console.log('FOUND IN invoice:');
    console.log(JSON.stringify(inv, null, 2));
  } else {
    console.log('NOT FOUND in invoice.');
  }

  await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
