const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const codes = ['6-10101', '6-10403', '6-11001-02'];
  for (const code of codes) {
    const coa = await prisma.chartOfAccounts.findUnique({
      where: { code }
    });
    if (coa) {
      console.log(`CODE_MATCH:${code}:${coa.id}:${coa.name}`);
    } else {
      console.log(`CODE_MISSING:${code}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
