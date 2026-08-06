const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ids = [
    'cmsh0bc3d003tq03w24u84u11','cmsh0bc3f003vq03w3bcxnd8o','cmsh0bc3h003xq03wba5gjetk',
    'cmsh0bc3j003zq03w8gz7ziye','cmsh0bc3m0041q03w0lfo7ygc','cmsh0bc3o0043q03wj9nmt3ls',
    'cmsh0abua003hq03wze2pgh08','cmsh0abuf003jq03wlwy4nn2b','cmsh0abui003lq03w4tgfoei5',
    'cmsh0abuo003nq03wdif6drtz','cmsh0abus003pq03wv3gejnnb','cmsh0abux003rq03wxhempxck',
    'cmsh09bzg003fq03wvxdjkbu3'
  ];
  const r = await p.operationalExpense.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, month: true, year: true, journalId: true, paymentJournalId: true }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });