const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PURCHASE INVOICES AUDIT ===');
  const bills = await prisma.purchaseInvoice.findMany({
    where: { number: { startsWith: 'PI-' } },
    select: {
      number: true,
      status: true,
      paymentType: true,
      grandTotal: true,
      dueDate: true,
      date: true
    }
  });
  console.log(JSON.stringify(bills, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
