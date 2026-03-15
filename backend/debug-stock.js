const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const id = 'cmmisrfxd0001igm8lk6xkssg';
  const warehouseId = 'cmmgfk5r20000ig906jt8zsnh';
  
  try {
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });
    
    console.log('PO Found:', existingPO.number);
    console.log('Items:', existingPO.items.length);

    await prisma.$transaction(async (tx) => {
      const skuCodes = existingPO.items.map(item => item.description);
      console.log('Searching for SKUs:', skuCodes);
      
      const skus = await tx.productSKU.findMany({
        where: { code: { in: skuCodes } }
      });
      console.log('SKUs found:', skus.length);

      const count = await tx.stockMovement.count({ where: { type: 'IN' } });
      const year = new Date().getFullYear();
      const number = `SIN-${year}-${String(count + 1).padStart(4, '0')}`;
      console.log('New Number:', number);

      const move = await tx.stockMovement.create({
        data: {
          number,
          type: 'IN',
          status: 'CONFIRMED',
          date: new Date(),
          warehouseId,
          referenceType: 'PURCHASE_ORDER',
          referenceNumber: existingPO.number,
          notes: `DEBUG: Otomatis dari PO ${existingPO.number}`,
          items: {
            create: existingPO.items.map(item => {
              const sku = skus.find(s => s.code === item.description);
              return {
                skuId: sku ? sku.id : 'unknown',
                qty: item.qty,
                unitCost: item.unitPrice,
                notes: item.description
              };
            }).filter(i => i.skuId !== 'unknown')
          }
        }
      });
      console.log('Movement Created:', move.id);
    });
    console.log('Transaction Success');
  } catch (e) {
    console.error('FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
