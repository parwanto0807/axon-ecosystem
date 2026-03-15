const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const number = 'PI-2026-006';
  console.log(`=== JOURNAL ENTRIES FOR ${number} ===`);

  const journal = await prisma.journalEntry.findFirst({
    where: { reference: number },
    include: {
      items: {
        include: { coa: true }
      }
    }
  });

  if (journal) {
    console.log(JSON.stringify(journal, null, 2));
  } else {
    console.log('No Journal Entry found for this reference.');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
