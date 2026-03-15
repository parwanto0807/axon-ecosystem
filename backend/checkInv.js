const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const invoices = await prisma.invoice.findMany({
        include: { items: true }
    });
    console.log('--- INVOICES ---');
    console.log(JSON.stringify(invoices, null, 2));
}

check()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
