const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('Verifying Receivable Items Logic...');

  // 1. Find a PO with some items
  const po = await prisma.purchaseOrder.findFirst({
    include: { items: true }
  });

  if (!po) {
    console.log('No PO found in database. Create one manually or via script.');
    return;
  }

  console.log(`Found PO: ${po.number} (Status: ${po.status})`);

  // 2. Fetch receivable items via internal logic (testing the endpoint logic)
  const receivedQtyMap = {};
  const billedQtyMap = {};

  const movements = await prisma.stockMovement.findMany({
    where: { referenceNumber: po.number, type: 'IN', status: 'CONFIRMED' },
    include: { items: true }
  });

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { purchaseOrderId: po.id, status: { not: 'CANCELLED' } },
    include: { items: true }
  });

  movements.forEach(m => {
    m.items.forEach(it => {
      const key = it.notes || ''; 
      receivedQtyMap[key] = (receivedQtyMap[key] || 0) + it.qty;
    });
  });

  invoices.forEach(inv => {
    inv.items.forEach(it => {
      billedQtyMap[it.description] = (billedQtyMap[it.description] || 0) + it.qty;
    });
  });

  console.log('\nReception Summary:');
  console.log(receivedQtyMap);
  console.log('\nBilling Summary:');
  console.log(billedQtyMap);

  const receivableItems = po.items.map(poItem => {
    const qtyReceived = receivedQtyMap[poItem.description] || 0;
    const qtyBilled = billedQtyMap[poItem.description] || 0;
    const remainingQty = qtyReceived - qtyBilled;
    return {
      description: poItem.description,
      poQty: poItem.qty,
      qtyReceived,
      qtyBilled,
      remainingQty
    };
  });

  console.log('\nFinal Receivable Items:');
  console.table(receivableItems);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
