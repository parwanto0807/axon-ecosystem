const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function find() {
    const customers = await prisma.customer.findMany({
        where: { name: { contains: 'GUANLONG', mode: 'insensitive' } }
    });
    console.log('--- CUSTOMERS ---');
    console.log(JSON.stringify(customers, null, 2));
}

find()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
