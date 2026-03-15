const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const number = 'PI-2026-006';
  const bill = await prisma.purchaseInvoice.findUnique({
    where: { number },
    select: { vendorId: true }
  });
  
  if (bill) {
    console.log('VendorID linked to PI:', bill.vendorId);
    const customer = await prisma.customer.findUnique({
      where: { id: bill.vendorId }
    });
    if (customer) {
      console.log('OMG! This Vendor ID is also a CUSTOMER ID:', customer.name);
    } else {
      console.log('No matching Customer for this ID.');
    }
  } else {
    console.log('Bill not found.');
  }

  await prisma.$disconnect();
}

main();
