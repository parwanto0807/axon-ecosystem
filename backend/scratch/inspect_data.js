const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const users = await prisma.user.findMany({ select: { name: true, email: true } });
    const employees = await prisma.employee.findMany({ select: { name: true, nik: true } });

    console.log('--- USER DATA SAMPLE ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('--- EMPLOYEE DATA SAMPLE ---');
    console.log(JSON.stringify(employees, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
