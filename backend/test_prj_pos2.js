const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pos = await prisma.purchaseOrder.findMany({
        where: { projectId: 'cmmk4vwny0005ig10q3z099ds' },
        select: {
            id: true,
            number: true,
            status: true,
            grandTotal: true,
            createdAt: true
        }
    });
    
    const wos = await prisma.workOrder.findMany({
        where: { projectId: 'cmmk4vwny0005ig10q3z099ds' },
        select: {
            id: true,
            number: true,
            purchaseOrders: {
                select: { id: true, number: true, status: true, grandTotal: true }
            }
        }
    });

    console.log("Direct POs:", JSON.stringify(pos, null, 2));
    console.log("WO POs:", JSON.stringify(wos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
