const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const keys = ['UNBILLED_RECEIPT', 'ACCOUNTS_PAYABLE', 'STAFF_ADVANCE', 'PURCHASE_EXPENSE'];
  const accounts = await prisma.systemAccount.findMany({
    where: { key: { in: keys } },
    include: { coa: true }
  });

  accounts.forEach(a => {
    console.log(`${a.key}: ${a.coa.code} (${a.coa.name})`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
