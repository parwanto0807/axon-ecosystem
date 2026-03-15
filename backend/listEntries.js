const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
    const entries = await prisma.journalEntry.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { coa: true } } }
    });

    console.log('--- RECENT JOURNAL ENTRIES ---');
    for (const entry of entries) {
        console.log(`\nEntry: ${entry.number} | Ref: ${entry.reference} | Date: ${entry.date.toISOString().split('T')[0]}`);
        for (const item of entry.items) {
            console.log(`  - [${item.coa.code}] ${item.coa.name}: Dr ${item.debit} | Cr ${item.credit}`);
        }
    }
}

list()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
