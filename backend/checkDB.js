const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenseAcc = await prisma.systemAccount.findUnique({ where: { key: 'EXPENSE' }, include: { coa: true } });
  const cashAcc = await prisma.systemAccount.findUnique({ where: { key: 'CASH' }, include: { coa: true } });
  
  console.log('EXPENSE mapped to COA:', expenseAcc?.coa?.name, expenseAcc?.coa?.type, expenseAcc?.coa?.cashflowType);
  console.log('CASH mapped to COA:', cashAcc?.coa?.name, cashAcc?.coa?.type, cashAcc?.coa?.cashflowType);

  const testEntries = await prisma.journalEntry.findMany({
    where: { type: 'EXPENSE' },
    include: { items: true }
  });
  console.log('Number of EXPENSE entries:', testEntries.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
