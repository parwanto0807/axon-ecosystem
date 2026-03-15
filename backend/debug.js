const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma Connection...');
    const products = await prisma.product.findMany({
      include: { category: true, unit: true, purchaseUnit: true }
    });
    console.log('Products found:', products.length);
    console.log('Sample product:', products[0]);
  } catch (error) {
    console.error('Prisma query failed:', error);
    if (error.code) console.error('Error code:', error.code);
    if (error.meta) console.error('Error meta:', error.meta);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
