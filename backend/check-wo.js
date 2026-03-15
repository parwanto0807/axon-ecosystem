const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wos = await prisma.workOrder.findMany({
    select: { id: true, number: true, status: true, title: true }
  });
  console.log(JSON.stringify(wos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
