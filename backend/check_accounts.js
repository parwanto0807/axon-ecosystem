const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const systemAccounts = await prisma.systemAccount.findMany({
    include: { coa: true }
  });
  console.log(JSON.stringify(systemAccounts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
