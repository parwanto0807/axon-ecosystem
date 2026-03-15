const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const codes = ['6-10101', '6-10403', '6-11001-02'];
  const results = {};
  for (const code of codes) {
    const coa = await prisma.chartOfAccounts.findUnique({
      where: { code }
    });
    if (coa) {
      results[code] = { id: coa.id, name: coa.name };
    }
  }
  fs.writeFileSync('coa_results.json', JSON.stringify(results, null, 2));
  console.log('Results saved to coa_results.json');
  await prisma.$disconnect();
}

main().catch(console.error);
