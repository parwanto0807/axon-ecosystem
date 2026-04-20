const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const employeeCount = await prisma.employee.count();
    const attendanceCount = await prisma.attendance.count();
    const productCount = await prisma.product.count();

    const loginLogCount = await prisma.userLoginLog.count();

    console.log('--- DATABASE INTEGRITY CHECK ---');
    console.log(`Users: ${userCount}`);
    console.log(`Employees: ${employeeCount}`);
    console.log(`Attendance Records: ${attendanceCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Login Logs: ${loginLogCount}`);
    console.log('-------------------------------');

    if (userCount <= 2 && productCount <= 40) {
      console.error('WARNING: Database density is suspiciously LOW.');
    } else {
      console.log('Database seems populated.');
    }
  } catch (e) {
    console.error('Error during integrity check:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
