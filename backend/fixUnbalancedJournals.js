const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
    console.log('--- REPAIRING UNBALANCED JOURNAL ENTRIES ---');
    
    // Find all journal entries with their items
    const entries = await prisma.journalEntry.findMany({
        include: { items: { include: { coa: true } } }
    });

    let fixedCount = 0;

    for (const entry of entries) {
        const totalDebit = entry.items.reduce((sum, i) => sum + i.debit, 0);
        const totalCredit = entry.items.reduce((sum, i) => sum + i.credit, 0);

        // If unbalanced
        if (Math.abs(totalDebit - totalCredit) > 1) {
            console.log(`\nUnbalanced Entry found: ${entry.number} (Date: ${entry.date.toISOString().split('T')[0]})`);
            console.log(`Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);

            // Case: Exactly 2 items, both are Debit (The bug we fixed)
            if (entry.items.length === 2 && entry.items.every(i => i.debit > 0 && i.credit === 0)) {
                console.log('-> Diagnosis: Double-Debit bug detected.');
                
                // Identify the second item (usually the counter-account in my logic)
                const secondItem = entry.items[1];
                
                console.log(`-> Fixing: Moving ${secondItem.debit} from Debit to Credit for Account ${secondItem.coa.code} (${secondItem.coa.name})`);
                
                await prisma.journalItem.update({
                    where: { id: secondItem.id },
                    data: {
                        credit: secondItem.debit,
                        debit: 0
                    }
                });
                
                fixedCount++;
                console.log('✓ Fixed.');
            } else {
                console.log('! Complexity too high for auto-fix. Manual review recommended.');
            }
        }
    }

    console.log(`\n--- REPAIR COMPLETE ---`);
    console.log(`Fixed ${fixedCount} unbalanced entries.`);
}

repair()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
