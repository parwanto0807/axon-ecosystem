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
 * @param {Object} params.prismaTx - Optional Prisma transaction client (tx from $transaction callback). If omitted, uses global prisma client.
 */
async function postJournalFromSystemKey(params) {
    const { systemKey, amount, description, reference, type = 'GENERAL', counterSystemKey, prismaTx } = params;
    const tx = prismaTx || prisma;

    try {
        // 1. Resolve accounts from system keys
        const mainAccount = await tx.systemAccount.findUnique({
            where: { key: systemKey },
            include: { coa: true }
        });

        if (!mainAccount) {
            console.error(`[Accounting] SystemAccount key not found: ${systemKey} — skipping journal entry`);
            return null;
        }

        let counterAccount = null;
        if (counterSystemKey) {
            counterAccount = await tx.systemAccount.findUnique({
                where: { key: counterSystemKey },
                include: { coa: true }
            });
        }

        // Prepare items (Basic double entry logic)
        const items = [];

        // Refactored Logic: First key (systemKey) is DEBIT, second (counterSystemKey) is CREDIT.
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

        // Generate entry sequence — find last entry to get highest sequence
        const year = new Date().getFullYear();
        const basePrefix = `JV-${year}-`;
        const lastEntry = await tx.journalEntry.findFirst({
            where: { number: { startsWith: basePrefix } },
            orderBy: { number: 'desc' }
        });
        let seq = 1;
        if (lastEntry) {
            const lastSeq = parseInt(lastEntry.number.split('-').pop(), 10);
            seq = (isNaN(lastSeq) ? 0 : lastSeq) + 1;
        }
        const number = `${basePrefix}${seq.toString().padStart(4, '0')}`;

        // Create the entry
        return await tx.journalEntry.create({
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
        console.error('[Accounting] Journal posting failed:', error.message);
        // Non-blocking: don't throw, just log — stock operations should still succeed
        return null;
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
        throw new Error('Journal items don\'t balance (Debit != Credit)');
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
