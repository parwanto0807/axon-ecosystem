const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const projects = await prisma.preSalesProject.findMany({
      include: { 
        customer: true, 
        surveys: { include: { expenses: true } }, 
        quotations: true, 
        salesOrders: true,
        purchaseOrders: { include: { vendor: true, items: true } },
        workOrders: {
          include: {
            items: true,
            surveyExpenses: true,
            stockMovements: { 
              include: { 
                items: { include: { sku: { include: { product: true } } } }, 
                warehouse: true 
              } 
            }
          }
        },
        basts: { include: { items: true } },
        deliveryOrders: { include: { items: true } },
        invoices: { include: { items: true } },
        surveyExpenses: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Success! Found', projects.length, 'projects');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
