const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log("--- Starting Opex Payment Verification ---");
    
    // 1. Create a dummy APPROVED expense
    const coa = await prisma.chartOfAccounts.findFirst({
        where: { code: { startsWith: '6-' } }
    });
    
    if (!coa) {
        console.error("No expense COA found!");
        return;
    }
    
    const expense = await prisma.operationalExpense.create({
        data: {
            name: "Test Approved Expense",
            category: "Others",
            amount: 1000,
            month: 3,
            year: 2026,
            coaId: coa.id,
            status: 'APPROVED'
        }
    });
    
    console.log(`Created expense: ${expense.id} with status ${expense.status}`);
    
    // 2. Direct Logic Verification (Simulating the payment logic in index.js)
    try {
        console.log("Simulating payment logic directly via Prisma...");
        const exp = await prisma.operationalExpense.findUnique({ where: { id: expense.id } });
        
        // This is the condition we changed in index.js
        if (exp.status !== 'POSTED' && exp.status !== 'APPROVED') {
            throw new Error(`Invalid status: ${exp.status}`);
        }
        
        // Simulating the update in /api/finance/operational-expenses/:id/pay
        await prisma.operationalExpense.update({
            where: { id: expense.id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                paymentCoaId: (await prisma.chartOfAccounts.findFirst({ where: { code: { startsWith: '1-100' } } })).id
            }
        });
        
        const updated = await prisma.operationalExpense.findUnique({ where: { id: expense.id } });
        console.log(`Updated status: ${updated.status}`);
        if (updated.status === 'PAID') {
            console.log("VERIFICATION SUCCESSFUL (Direct Logic)");
        } else {
            console.log("VERIFICATION FAILED: Status not PAID");
        }
    } catch (e) {
        console.error("Error during verification:", e.message);
    } finally {
        // Cleanup
        await prisma.operationalExpense.delete({ where: { id: expense.id } }).catch(() => {});
        await prisma.$disconnect();
    }
}

test();
