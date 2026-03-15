const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = [
    { code: '6-10101', name: 'Beban Gaji Karyawan', amount: 8000000, category: 'Payroll' },
    { code: '6-10403', name: 'Beban Cloud Services', amount: 175158, category: 'IT Services' },
    { code: '6-11001-02', name: 'Makan Siang Rapat', amount: 120000, category: 'Beban Kantor' }
  ];

  const now = new Date();
  const currentMonth = 3; // March
  const currentYear = 2026;

  console.log(`=== INSERTING OPEX DATA FOR ${currentMonth}/${currentYear} ===`);

  for (const item of data) {
    const coa = await prisma.chartOfAccounts.findUnique({
      where: { code: item.code }
    });

    if (!coa) {
      console.error(`ERROR: COA ${item.code} not found!`);
      continue;
    }

    const opex = await prisma.operationalExpense.create({
      data: {
        name: item.name,
        category: item.category,
        amount: item.amount,
        month: currentMonth,
        year: currentYear,
        status: 'APPROVED',
        coaId: coa.id,
        date: new Date(2026, 2, 25) // Approx end of month
      }
    });

    console.log(`INSERTED: ${opex.name} - ${opex.amount}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
