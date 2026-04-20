const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fetching ALL Today Attendances ---');
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const attendances = await prisma.attendance.findMany({
    where: { timestamp: { gte: startOfDay, lt: endOfDay } },
    include: { employee: true }
  });
  console.log(JSON.stringify(attendances, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
