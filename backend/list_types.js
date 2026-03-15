const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const types = await prisma.chartOfAccounts.findMany({ select: { type: true }, distinct: ['type'] });
  console.log(JSON.stringify(types, null, 2));
  await prisma.$disconnect();
}
main();
