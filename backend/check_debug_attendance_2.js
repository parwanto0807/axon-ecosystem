const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Fetching Latest 5 Attendances for Parwanto ---');
  const attendances = await prisma.attendance.findMany({
    where: { employee: { name: 'Parwanto' } },
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: { employee: true }
  });
  console.log(JSON.stringify(attendances, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
