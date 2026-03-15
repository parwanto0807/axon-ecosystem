const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

const openingBalanceEndpoints = `// --- OPENING BALANCES ---

app.get('/api/opening-balances', async (req, res) => {
  try {
    const coas = await prisma.chartOfAccounts.findMany({
      where: { postingType: 'POSTING' },
      orderBy: { code: 'asc' }
    });

    const openingEntry = await prisma.journalEntry.findFirst({
      where: { type: 'OPENING' },
      include: { items: true }
    });

    const report = coas.map(coa => {
      const item = openingEntry?.items.find(i => i.coaId === coa.id);
      return {
        id: coa.id,
        code: coa.code,
        name: coa.name,
        type: coa.type,
        debit: item?.debit || 0,
        credit: item?.credit || 0
      };
    });

    res.json({
      date: openingEntry?.date || new Date().toISOString().split('T')[0],
      balances: report
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/opening-balances', async (req, res) => {
  try {
    const { date, balances } = req.body; // balances: [{ coaId, debit, credit }]
    
    // 1. Find the Equity Opening Balance account
    const equityOpening = await prisma.systemAccount.findUnique({
      where: { key: 'EQUITY_OPENING_BALANCE' }
    });
    if (!equityOpening) throw new Error('EQUITY_OPENING_BALANCE system account not configured');

    // 2. Filter out zero balances
    const activeBalances = balances.filter(b => b.debit > 0 || b.credit > 0);
    
    // 3. Calculate balancing amount for equity
    const totalDebit = activeBalances.reduce((sum, b) => sum + (b.debit || 0), 0);
    const totalCredit = activeBalances.reduce((sum, b) => sum + (b.credit || 0), 0);
    const diff = totalDebit - totalCredit;

    const journalItems = activeBalances.map(b => ({
      coaId: b.coaId,
      debit: b.debit || 0,
      credit: b.credit || 0,
      description: 'Saldo Awal'
    }));

    if (Math.abs(diff) > 0.01) {
      journalItems.push({
        coaId: equityOpening.coaId,
        debit: diff < 0 ? Math.abs(diff) : 0,
        credit: diff > 0 ? diff : 0,
        description: 'Penyeimbang Saldo Awal'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remove existing opening entry if any
      const existing = await tx.journalEntry.findFirst({ where: { type: 'OPENING' } });
      if (existing) {
        await tx.journalEntry.delete({ where: { id: existing.id } });
      }

      return await tx.journalEntry.create({
        data: {
          number: 'JV-OPENING',
          date: new Date(date + 'T00:00:00'),
          description: 'Opening Balance Initialization',
          type: 'OPENING',
          status: 'POSTED',
          items: {
            create: journalItems
          }
        },
        include: { items: true }
      });
    });

    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

`;

const target = '// --- COMPANY SETTINGS ---';
if (content.includes(target)) {
    content = content.replace(target, openingBalanceEndpoints + target);
    fs.writeFileSync(filePath, content);
    console.log('Successfully updated index.js');
} else {
    console.error('Target comment not found');
    process.exit(1);
}
