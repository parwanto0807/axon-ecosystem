const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Automatically creates a journal entry based on predefined system mapping.
 * @param {Object} params
 * @param {string} params.systemKey - The key from SystemAccount table (e.g. 'SALES_REVENUE')
 * @param {number} params.amount - The decimal amount
 * @param {string} params.description - Description for the journal item
 * @param {string} params.reference - Reference doc number (e.g. INV-001)
 * @param {string} params.type - Entry type (e.g. 'INVOICE')
 */
async function postJournalFromSystemKey(params) {
    const { systemKey, amount, description, reference, type = 'GENERAL', counterSystemKey } = params;

    try {
        // 1. Resolve accounts from system keys
        const mainAccount = await prisma.systemAccount.findUnique({
            where: { key: systemKey },
            include: { coa: true }
        });

        if (!mainAccount) throw new Error(`System Account key not found: ${systemKey}`);

        let counterAccount = null;
        if (counterSystemKey) {
            counterAccount = await prisma.systemAccount.findUnique({
                where: { key: counterSystemKey },
                include: { coa: true }
            });
            if (!counterAccount) throw new Error(`Counter System Account key not found: ${counterSystemKey}`);
        }

        // Generate entry sequence
        const count = await prisma.journalEntry.count();
        const number = `JV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

        // Prepare items (Basic double entry logic)
        // Note: This logic assumes a simple mapping. Complex transactions should use manual multi-item posting.
        const items = [];
        
        // Refactored Logic: First key (systemKey) is DEBIT, second (counterSystemKey) is CREDIT.
        // This is the standard way to handle automated mapping for simple double-entry.
        items.push({
            coaId: mainAccount.coaId,
            description: description,
            debit: amount,
            credit: 0
        });

        if (counterAccount) {
            items.push({
                coaId: counterAccount.coaId,
                description: description,
                debit: 0,
                credit: amount
            });
        }

        // Create the entry
        return await prisma.journalEntry.create({
            data: {
                number,
                date: new Date(),
                description,
                reference,
                type,
                items: {
                    create: items
                }
            },
            include: { items: true }
        });

    } catch (error) {
        console.error('Accounting Engine Error:', error);
        throw error;
    }
}

/**
 * Manual Journal Posting (Internal helper)
 */
async function createJournalEntry(data) {
    const { number, description, reference, type, items } = data;
    
    // Validate balance
    const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Journal items do not balance (Debit != Credit)');
    }

    return await prisma.journalEntry.create({
        data: {
            number: number || `JV-M-${Date.now()}`,
            description,
            reference,
            type: type || 'GENERAL',
            items: {
                create: items.map(item => ({
                    coaId: item.coaId,
                    description: item.description,
                    debit: item.debit || 0,
                    credit: item.credit || 0
                }))
            }
        }
    });
}

module.exports = {
    postJournalFromSystemKey,
    createJournalEntry
};
