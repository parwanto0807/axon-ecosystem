const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration...');

  // Migrate Products
  const products = await prisma.product.findMany({
    where: {
      businessCategoryId: { not: null }
    }
  });

  console.log(`Found ${products.length} products to migrate.`);
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        manyBusinessCategories: {
          connect: { id: product.businessCategoryId }
        }
      }
    });
  }
  console.log('Product migration completed.');

  // Migrate Customers
  const customers = await prisma.customer.findMany({
    where: {
      businessCategoryId: { not: null }
    }
  });

  console.log(`Found ${customers.length} customers to migrate.`);
  for (const customer of customers) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        manyBusinessCategories: {
          connect: { id: customer.businessCategoryId }
        }
      }
    });
  }
  console.log('Customer migration completed.');

  console.log('Migration finished successfully.');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
