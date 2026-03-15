const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const staffAdvance = await prisma.systemAccount.findUnique({
    where: { key: 'STAFF_ADVANCE' },
    include: { coa: true }
  });
  const projectMob = await prisma.systemAccount.findUnique({
    where: { key: 'PROJECT_MOBILIZATION' },
    include: { coa: true }
  });

  console.log('STAFF_ADVANCE mapping:');
  console.log(JSON.stringify(staffAdvance, null, 2));
  console.log('\nPROJECT_MOBILIZATION mapping:');
  console.log(JSON.stringify(projectMob, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
