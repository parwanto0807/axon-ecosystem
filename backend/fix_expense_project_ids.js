const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingProjectIds() {
  console.log("Starting script to fix missing Project IDs in SurveyExpense...");
  let updatedCount = 0;

  try {
    // 1. Find all expenses missing a projectId
    const expenses = await prisma.surveyExpense.findMany({
      where: {
        projectId: null,
        OR: [
          { workOrderId: { not: null } },
          { surveyId: { not: null } },
          { purchaseOrderId: { not: null } }
        ]
      },
      include: {
        workOrder: { select: { projectId: true } },
        survey: { select: { projectId: true } },
        purchaseOrder: { select: { projectId: true } }
      }
    });

    console.log(`Found ${expenses.length} expenses missing projectId with potential links.`);

    for (const expense of expenses) {
      let projectIdToSet = null;

      if (expense.workOrder?.projectId) {
        projectIdToSet = expense.workOrder.projectId;
      } else if (expense.survey?.projectId) {
        projectIdToSet = expense.survey.projectId;
      } else if (expense.purchaseOrder?.projectId) {
        projectIdToSet = expense.purchaseOrder.projectId;
      }

      if (projectIdToSet) {
        await prisma.surveyExpense.update({
          where: { id: expense.id },
          data: { projectId: projectIdToSet }
        });
        updatedCount++;
        console.log(`Updated expense ${expense.id} with projectId ${projectIdToSet}`);
      }
    }

    console.log(`Finished. Successfully updated ${updatedCount} expenses.`);
  } catch (error) {
    console.error("Error updating expenses:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingProjectIds();
