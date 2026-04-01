const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('Checking Employee table structure (PostgreSQL)...');
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Employee'
    `);
    console.log('Columns in Employee table:');
    result.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
  } catch (e) {
    console.error('Failed to check schema:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
