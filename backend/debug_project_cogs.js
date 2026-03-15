
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function debugProject(projectNumber) {
    const project = await prisma.preSalesProject.findFirst({
        where: { number: projectNumber },
        include: {
            customer: true,
            surveys: { include: { expenses: true } },
            quotations: true,
            salesOrders: true,
            purchaseOrders: { include: { vendor: true, items: true } },
            workOrders: {
                include: {
                    items: true,
                    surveyExpenses: true,
                    stockMovements: { include: { items: true, warehouse: true } }
                }
            },
            surveyExpenses: true
        }
    });

    if (!project) {
        console.log("Project not found");
        return;
    }

    let log = `Analyzing Project: ${project.number} - ${project.name}\n`;
    
    let revenue = 0;
    project.salesOrders.forEach(so => {
        log += `SO: ${so.number} - ${so.grandTotal}\n`;
        revenue += so.grandTotal || 0;
    });

    let cogsFromStock = 0;
    project.workOrders.forEach(wo => {
        log += `WO: ${wo.number}, Status: ${wo.status}\n`;
        wo.items.forEach(i => {
            log += ` - WO Item: ${i.description}, Type: ${i.type}, Released: ${i.isReleased}, Source: ${i.source}, Cost: ${i.totalCost}\n`;
            if (i.type === 'MATERIAL' && i.isReleased && i.source === 'STOCK') {
                cogsFromStock += (i.totalCost || 0);
            }
        });
        wo.stockMovements?.forEach(sm => {
            log += ` - Stock Movement: ${sm.number}, Type: ${sm.type}, Status: ${sm.status}\n`;
            sm.items?.forEach(smi => {
               log += `   * SMI: Qty: ${smi.qty}, Cost: ${smi.unitCost}, Total: ${smi.qty * smi.unitCost}\n`;
            });
        });
    });

    let cogsFromPO = 0;
    const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'RECEIVED'];
    project.purchaseOrders.forEach(po => {
        log += `PO: ${po.number}, Status: ${po.status}, Total: ${po.grandTotal}\n`;
        po.items.forEach(it => {
            log += ` - PO Item: ${it.description}, Qty: ${it.qty}, Price: ${it.unitPrice}, Total: ${it.amount}\n`;
        });
        if (validPOStatuses.includes(po.status)) {
            cogsFromPO += (po.grandTotal || 0);
        }
    });

    let operationalExpenses = 0;
    const processedExpenseIds = new Set();
    const processExpense = (e, source) => {
        if (!e || !e.id || processedExpenseIds.has(e.id)) return;
        if (e.status === 'APPROVED' || e.status === 'POSTED') {
            if (!e.purchaseOrderId) {
                log += `Expense (${source}): ${e.category} - ${e.amount}\n`;
                operationalExpenses += (e.amount || 0);
            } else {
                log += `Expense (Linked to PO, Skipped): ${e.category} - ${e.amount}\n`;
            }
        }
        processedExpenseIds.add(e.id);
    };

    project.surveys.forEach(s => s.expenses.forEach(e => processExpense(e, 'Survey')));
    project.workOrders.forEach(wo => wo.surveyExpenses.forEach(e => processExpense(e, 'WO')));
    project.surveyExpenses.forEach(e => processExpense(e, 'Direct'));

    log += "--- SUMMARY ---\n";
    log += `Total Revenue: ${revenue}\n`;
    log += `COGS from Stock: ${cogsFromStock}\n`;
    log += `COGS from PO: ${cogsFromPO}\n`;
    log += `Total COGS: ${cogsFromStock + cogsFromPO}\n`;
    log += `Op Expenses: ${operationalExpenses}\n`;
    log += `Total Profit: ${revenue - (cogsFromStock + cogsFromPO + operationalExpenses)}\n`;

    fs.writeFileSync('project_debug_out.txt', log);
    console.log("Debug output written to project_debug_out.txt");
}

debugProject('PRJ-2026-007')
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
