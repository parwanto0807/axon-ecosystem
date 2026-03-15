const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function find() {
  const account = await prisma.chartOfAccounts.findFirst({ where: { code: '2-10101' } });
  console.log('RESULT:', JSON.stringify(account, null, 2));
  process.exit(0);
}
find();
