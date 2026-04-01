const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const coas = await prisma.chartOfAccounts.findMany({
    where: {
      name: { contains: 'Mandiri', mode: 'insensitive' }
    }
  });
  console.log(JSON.stringify(coas, null, 2));
  
  const banks = await prisma.bankAccount.findMany({
    where: {
      bankName: { contains: 'Mandiri', mode: 'insensitive' }
    }
  });
  console.log('--- Banks ---');
  console.log(JSON.stringify(banks, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
