const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding initial data...');

    // Categories
    const categories = ['Hardware', 'Software', 'Service', 'Other'];
    for (const name of categories) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }
    console.log('Categories seeded.');

    // Units
    const units = ['pcs', 'unit', 'box', 'pack', 'kg', 'm', 'set'];
    for (const name of units) {
      await prisma.unit.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }
    console.log('Units seeded.');

    // Default User
    await prisma.user.upsert({
      where: { email: 'admin@axon.com' },
      update: {},
      create: {
        email: 'admin@axon.com',
        password: 'admin',
        name: 'Administrator',
        role: 'SUPER_ADMIN'
      }
    });
    console.log('Default Admin user seeded.');

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
