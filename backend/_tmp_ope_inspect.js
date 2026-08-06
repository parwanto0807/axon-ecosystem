const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.operationalExpense.findMany({
    orderBy: [{ name: 'asc' }, { year: 'asc' }, { month: 'asc' }]
  });
  console.log(JSON.stringify(r.map(x => ({
    id: x.id, name: x.name, category: x.category, amount: x.amount,
    month: x.month, year: x.year, coaId: x.coaId, status: x.status
  })), null, 2));
  console.log('TOTAL:', r.length);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });