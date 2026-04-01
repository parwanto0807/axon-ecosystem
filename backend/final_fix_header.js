const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
  try {
    const coas = await p.chartOfAccounts.findMany({
      where: { OR: [ { name: 'Kas & Bank' }, { name: 'Kas Peti Cash' } ] }
    });

    const header = coas.find(c => c.name === 'Kas & Bank');
    const posting = coas.find(c => c.name === 'Kas Peti Cash');

    if (!header || !posting) {
      console.log('Missing accounts:', { header: !!header, posting: !!posting });
      return;
    }

    console.log('Migrating from header ID:', header.id, 'to posting ID:', posting.id);

    const result = await p.journalItem.updateMany({
      where: { coaId: header.id },
      data: { coaId: posting.id }
    });

    console.log('Successfully updated ' + result.count + ' journal items.');
  } catch (err) {
    console.error('Error during fix:', err);
  } finally {
    await p.$disconnect();
  }
}

fix();
