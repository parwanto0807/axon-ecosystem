const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const keys = ['ACCOUNTS_RECEIVABLE', 'SALES_REVENUE', 'VAT_OUT'];
  const accounts = await prisma.systemAccount.findMany({
    where: { key: { in: keys } },
    include: { coa: true }
  });

  console.log('--- Sales Invoice Account Mappings ---');
  accounts.forEach(a => {
    console.log(`${a.key}: ${a.coa.code} (${a.coa.name})`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
