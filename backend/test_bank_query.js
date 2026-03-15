const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      OR: [
        { code: { startsWith: '1-1' } }, // Bank & Cash
        { code: { startsWith: '1-2' } }  
      ],
      status: 'ACTIVE'
    }
  });
  console.log("Found accounts:", accounts.length);
  accounts.forEach(a => console.log(`${a.code} - ${a.name} (${a.status})`));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
