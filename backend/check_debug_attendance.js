const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  console.log('--- Checking Schedules for Today ---');
  const schedules = await prisma.employeeSchedule.findMany({
    where: { date: { gte: startOfDay, lt: endOfDay } },
    include: { employee: true }
  });
  console.log(JSON.stringify(schedules, null, 2));

  console.log('\n--- Checking Attendances for Today ---');
  const attendances = await prisma.attendance.findMany({
    where: { timestamp: { gte: startOfDay, lt: endOfDay } },
    include: { employee: true }
  });
  console.log(JSON.stringify(attendances, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
