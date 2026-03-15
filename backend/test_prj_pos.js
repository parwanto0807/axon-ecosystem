const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.preSalesProject.findFirst({
        where: { number: 'PRJ-2026-006' },
        include: {
            purchaseOrders: true,
            workOrders: {
                include: {
                    items: true,
                    purchaseOrders: true
                }
            }
        }
    });
    console.log(JSON.stringify(p, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
