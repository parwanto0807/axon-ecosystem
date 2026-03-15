const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wos = await prisma.workOrder.findMany({
    include: { items: true }
  });
  console.log(JSON.stringify(wos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
