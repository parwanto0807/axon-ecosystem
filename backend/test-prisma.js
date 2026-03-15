const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const project = await prisma.preSalesProject.findFirst({
      where: { number: 'PRJ-2026-007' },
      include: { 
        workOrders: {
          include: {
            items: true
          }
        }
      }
    });

    if (!project) {
        console.log('Project not found');
        return;
    }

    console.log('--- PROJECT:', project.number, '---');
    console.log('WORK ORDER ITEMS:');
    project.workOrders.forEach(wo => {
        console.log(`- ${wo.number} (${wo.status})`);
        wo.items.forEach(it => {
            console.log(`  * ${it.description} (${it.type} / ${it.source} / Released: ${it.isReleased}): ${it.qty} x ${it.unitCost} = ${it.totalCost}`);
        });
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
