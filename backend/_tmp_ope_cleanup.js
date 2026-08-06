const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const toDelete = [
    'cmsh0abuf003jq03wlwy4nn2b','cmsh0abui003lq03w4tgfoei5','cmsh0abuo003nq03wdif6drtz',
    'cmsh0abus003pq03wv3gejnnb','cmsh0abux003rq03wxhempxck',
    'cmsh0bc3f003vq03w3bcxnd8o','cmsh0bc3h003xq03wba5gjetk','cmsh0bc3j003zq03w8gz7ziye',
    'cmsh0bc3m0041q03w0lfo7ygc','cmsh0bc3o0043q03wj9nmt3ls'
  ];
  const del = await p.operationalExpense.deleteMany({ where: { id: { in: toDelete } } });
  console.log('DELETED:', del.count);
  const remaining = await p.operationalExpense.findMany({
    where: { name: { in: ['Token Listrik ', 'Biaya ADM ', 'Rokok + Bensin Ke Customer Rylif'] } },
    select: { id: true, name: true, month: true, year: true, status: true }
  });
  console.log('REMAINING:');
  console.log(JSON.stringify(remaining, null, 2));
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });