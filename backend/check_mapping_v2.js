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

  console.log(`STAFF_ADVANCE: ${staffAdvance?.coa?.code} (${staffAdvance?.coa?.name})`);
  console.log(`PROJECT_MOBILIZATION: ${projectMob?.coa?.code} (${projectMob?.coa?.name})`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
