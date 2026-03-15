const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding System Accounts & Transaction Mappings...');

  // 1. BASE SYSTEM ACCOUNTS (Consolidated from seedSystemAccounts.js)
  const systemAccounts = [
    {
      key: 'ACCOUNTS_PAYABLE',
      description: 'Digunakan untuk mencatat kewajiban/utang perusahaan kepada supplier atas pembelian kredit. Saldo akan bertambah di Kredit saat Anda mencatat tagihan supplier.',
      fallbackCode: '2-10101',
      searchNames: ['Utang Usaha (Supplier)']
    },
    {
      key: 'ACCOUNTS_RECEIVABLE',
      description: 'Digunakan untuk mencatat hak tagih perusahaan kepada pelanggan atas penjualan kredit. Saat membuat Invoice Penjualan, akun ini akan otomatis di-Debit (bertambah).',
      fallbackCode: '1-10101',
      searchNames: ['Piutang Usaha']
    },
    {
      key: 'BANK_BRI_CIKARANG',
      description: 'Digunakan untuk mencatat saldo dan transaksi rekening tabungan/giro di Bank BRI Kantor Cabang Cikarang. Digunakan untuk mutasi besar atau pembayaran vendor via transfer.',
      fallbackCode: '1-10002',
      searchNames: ['Bank BRI KC. CIKARANG']
    },
    {
      key: 'BANK_BRI_HARAPAN_INDAH',
      description: 'Digunakan untuk mencatat saldo dan transaksi rekening tabungan/giro di Bank BRI Kantor Cabang Harapan Indah.',
      fallbackCode: '1-10003',
      searchNames: ['Bank BRI KC. HARAPAN INDAH']
    },
    {
      key: 'BANK_BRI_KARAWANG',
      description: 'Digunakan untuk mencatat saldo dan transaksi rekening tabungan/giro di Bank BRI Kantor Cabang Karawang',
      fallbackCode: '1-10006',
      searchNames: ['Bank BRI KC. BRI KARAWANG']
    },
    {
      key: 'BANK_BRI_LEBAK_BULUS',
      description: 'Digunakan untuk mencatat saldo dan transaksi rekening tabungan/giro di Bank BRI Kantor Cabang Lebak Bulus',
      fallbackCode: '1-10004',
      searchNames: ['Bank BRI KC. LEBAK BULUS']
    },
    {
      key: 'BANK_BRI_TAMBUN',
      description: 'Digunakan untuk mencatat saldo dan transaksi rekening tabungan/giro di Bank BRI Kantor Cabang Tambun',
      fallbackCode: '1-10005',
      searchNames: ['Bank BRI KC. TAMBUN']
    },
    {
      key: 'EQUITY_OPENING_BALANCE',
      description: 'Digunakan sebagai akun penyeimbang (offset account) saat pertama kali memasukkan saldo migrasi data (Aset, Piutang, Hutang) ke dalam sistem. Akun ini memastikan Neraca tetap seimbang (Balance) pada posisi awal Go-Live. Saldo akan berada di posisi Kredit untuk menyeimbangkan saldo Kas/Bank di posisi Debit',
      fallbackCode: '3-10101',
      searchNames: ['Saldo Awal Ekuitas']
    },
    {
      key: 'OFFICE_SALARY',
      description: 'Digunakan untuk mencatat beban gaji, tunjangan, dan upah tetap bagi staf administrasi atau kantor pusat (overhead)',
      fallbackCode: '6-10101',
      searchNames: ['Beban Gaji Karyawan']
    },
    {
      key: 'CASH',
      description: 'Akun default untuk transaksi Kas and Bank. Digunakan untuk mencatat mutasi dana tunai atau transfer bank yang bersifat umum.',
      fallbackCode: '1-10001',
      searchNames: ['Kas Peti Cash', 'Bank BRI KC. CIKARANG', 'Bank']
    },
    {
      key: 'PETTY_CASH',
      description: 'Digunakan sebagai sumber dana tunai untuk operasional harian di kantor atau lapangan. Saldo akan berkurang di Kredit saat dana diserahkan kepada staf atau digunakan untuk belanja langsung',
      fallbackCode: '1-10001',
      searchNames: ['Kas Peti Cash']
    },
    {
      key: 'PROJECT_MOBILIZATION',
      description: 'Digunakan untuk mencatat biaya logistik, transportasi alat, bensin, tol, dan akomodasi tim yang terkait langsung dengan pengerjaan proyek di lapangan.',
      fallbackCode: '5-10102',
      searchNames: ['Beban Mobilisasi']
    },
    {
      key: 'PROJECT_WIP',
      description: 'Digunakan untuk mencatat nilai material atau barang yang sudah berada di lokasi proyek dan sedang dalam proses pengerjaan/pemasangan sebelum diserahterimakan',
      fallbackCode: '1-10205',
      searchNames: ['Persediaan On WIP']
    },
    {
      key: 'PURCHASE_EXPENSE',
      description: 'Digunakan untuk mencatat beban biaya langsung seperti material atau jasa subkon. Saldo akan bertambah di Debit saat terjadi pembelian atau terjadi pengeluaran operasional.',
      fallbackCode: '5-10101',
      searchNames: ['Biaya Material Proyek']
    },
    {
      key: 'SALES_REVENUE',
      description: 'Digunakan untuk mencatat nilai penjualan jasa atau barang. Akun ini akan otomatis di-Kredit (bertambah) saat Anda mencatat penjualan final.',
      fallbackCode: '4-10101',
      searchNames: ['Pendapatan Jasa Konstruksi']
    },
    {
      key: 'STAFF_ADVANCE',
      description: 'Digunakan untuk mencatat piutang kepada staf atas pemberian dana tunai (uang muka kerja) yang belum dipertanggungjawabkan. Akun ini akan berkurang (Kredit) saat staf menyerahkan bukti nota/realisasi',
      fallbackCode: '1-10302',
      searchNames: ['Uang Muka Kerja (Staff)']
    },
    {
      key: 'VAT_IN',
      description: 'Digunakan untuk menampung PPN yang kita bayar ke supplier (PPN Masukan). Saldo ini dapat digunakan untuk mengurangi PPN Keluaran. Bertambah di Debit saat pembelian.',
      fallbackCode: '1-10401',
      searchNames: ['PPN Masukan']
    },
    {
      key: 'VAT_OUT',
      description: 'Digunakan untuk menampung PPN yang kita pungut dari pelanggan (PPN Keluaran). Ini adalah utang pajak kita ke negara. Saldo akun ini bertambah di Kredit saat Penjualan.',
      fallbackCode: '2-10301',
      searchNames: ['PPN Pengeluaran']
    },
    {
      key: 'PAYMENT_RECEIVABLE_ACCOUNT',
      description: 'Digunakan untuk mencatat pengurangan piutang saat pembayaran invoice diterima dari customer. Akun ini akan di-Kredit (berkurang) saat payment diproses, baik Full maupun Partial Payment.',
      fallbackCode: '1-10101',
      searchNames: ['Piutang Usaha']
    },
    {
      key: 'PAYMENT_BANK_CHARGE_EXPENSE',
      description: 'Digunakan untuk mencatat beban biaya administrasi bank yang ditanggung perusahaan saat menerima pembayaran dari customer (transfer fee, admin bank, dll). Akun ini akan di-Debit (bertambah) sebesar admin fee yang diinput.',
      fallbackCode: '6-10102',
      searchNames: ['Beban Admin Bank', 'Biaya Admin Bank']
    },
    {
      key: 'INVENTORY_WIP',
      description: 'Digunakan untuk mencatat nilai material atau barang yang sudah berada di lokasi proyek dan sedang dalam proses pengerjaan/pemasangan sebelum diserahterimakan (Project Site Inventory).',
      fallbackCode: '1-10205',
      searchNames: ['Persediaan On WIP']
    },
    {
      key: 'EXPENSE',
      description: 'Digunakan untuk mencatat pengeluaran beban operasional proyek atau kantor secara umum.',
      fallbackCode: '6-10206',
      searchNames: ['Beban Operasional', 'Biaya Operasional', 'Beban Lain-Lain']
    },
    {
      key: 'UNBILLED_RECEIPT',
      description: 'Akun sementara untuk mencatat penerimaan barang yang belum ditagih oleh supplier. Akan diimbangi saat Invoice Supplier (Bill) dicatat.',
      fallbackCode: '2-10102',
      searchNames: ['Penerimaan Barang Belum Ditagih']
    },
    {
      key: 'EXPENSE_SALARY',
      description: 'Digunakan untuk mencatat beban gaji, honorarium, dan kompensasi karyawan kantor.',
      fallbackCode: '6-10101',
      searchNames: ['Beban Gaji & Honorarium']
    },
    {
      key: 'EXPENSE_UTILITIES',
      description: 'Digunakan untuk mencatat beban listrik, internet, and telepon kantor.',
      fallbackCode: '6-10202',
      searchNames: ['Beban Listrik']
    },
    {
      key: 'EXPENSE_WATER',
      description: 'Digunakan untuk mencatat beban air (PDAM) kantor.',
      fallbackCode: '6-10206',
      searchNames: ['Beban Air']
    },
    {
      key: 'EXPENSE_OFFICE_SUPPLIES',
      description: 'Digunakan untuk mencatat beban alat tulis kantor (ATK) and perlengkapan administrasi.',
      fallbackCode: '6-10202',
      searchNames: ['Beban Alat Tulis & Perlengkapan Kantor']
    },
    {
      key: 'EXPENSE_SOFTWARE_SAAS',
      description: 'Digunakan untuk mencatat biaya langganan software, hosting, and layanan SaaS.',
      fallbackCode: '6-10301',
      searchNames: ['Beban Maintenance Software/SaaS']
    },
    {
      key: 'EXPENSE_RENT',
      description: 'Digunakan untuk mencatat beban sewa gedung, kantor, atau gudang operasional.',
      fallbackCode: '6-10201',
      searchNames: ['Beban Sewa Gedung/Kantor']
    },
    {
      key: 'INVENTORY_ADJUSTMENT_ACCOUNT',
      description: 'Akun penyeimbang untuk rekonsiliasi nilai persediaan antara Sub-ledger (stok fisik) and General Ledger (Neraca). Digunakan saat penutupan buku untuk menyesuaikan selisih nilai.',
      fallbackCode: '6-10501',
      searchNames: ['Beban Selisih Inventaris', 'Penyesuaian Persediaan', 'Selisih Stok']
    },
    {
      key: 'CASH_SHORTAGE_ACCOUNT',
      description: 'Digunakan untuk mencatat selisih kurang (shortage) saat Cash Opname. Dialihkan ke Ekuitas (3-10101) untuk menjaga Laba Rugi.',
      fallbackCode: '3-10101', 
      searchNames: ['Saldo Awal Ekuitas']
    },
    {
      key: 'CASH_OVERAGE_ACCOUNT',
      description: 'Digunakan untuk mencatat selisih lebih (overage) saat Cash Opname. Dialihkan ke Ekuitas (3-10101) untuk menjaga Laba Rugi.',
      fallbackCode: '3-10101',
      searchNames: ['Saldo Awal Ekuitas']
    },
    {
      key: 'COGS',
      description: 'Beban Pokok Pendapatan / Biaya Material Proyek. Digunakan untuk mengakui beban modal saat barang keluar dari gudang.',
      fallbackCode: '5-10101',
      searchNames: ['Biaya Material Proyek', 'Beban Pokok Pendapatan', 'HPP']
    },
    {
      key: 'INVENTORY_PUSAT',
      description: 'Persediaan Barang di Gudang Pusat.',
      fallbackCode: '1-10202',
      searchNames: ['Persediaan - Gudang Pusat']
    }
  ];

  // 2. TRANSACTION MAPPINGS (Flexible Rules)
  // These rules connect business events to Debits and Credits.
  const transactionMappings = [
    // --- INVENTORY ---
    {
      transactionType: 'STOCK_IN',
      event: 'CONFIRM',
      debitKey: 'INVENTORY_PUSAT',
      creditKey: 'UNBILLED_RECEIPT',
      description: 'Penerimaan barang (Stock In)'
    },
    {
      transactionType: 'STOCK_OUT',
      event: 'CONFIRM',
      debitKey: 'COGS',
      creditKey: 'INVENTORY_PUSAT',
      description: 'Pengeluaran barang (Stock Out)'
    },
    {
      transactionType: 'STOCK_MOVEMENT',
      event: 'RELEASE_TO_PROJECT',
      debitKey: 'INVENTORY_WIP',
      creditKey: 'INVENTORY_PUSAT',
      description: 'Pengiriman material ke lokasi proyek (WIP)'
    },

    // --- PURCHASING (AP) ---
    {
      transactionType: 'PURCHASE_INVOICE',
      event: 'POST',
      debitKey: 'UNBILLED_RECEIPT',
      creditKey: 'ACCOUNTS_PAYABLE',
      description: 'Tagihan supplier: Menetralkan Unbilled Receipt ke Utang Usaha'
    },
    {
      transactionType: 'PURCHASE_INVOICE_CASH',
      event: 'POST',
      debitKey: 'UNBILLED_RECEIPT',
      creditKey: 'CASH',
      description: 'Tagihan supplier (Cash): Menetralkan Unbilled Receipt ke Kas/Bank'
    },
    {
      transactionType: 'PURCHASE_EXPENSE', // Used for direct purchase expense without Stock In
      event: 'POST',
      debitKey: 'PURCHASE_EXPENSE',
      creditKey: 'ACCOUNTS_PAYABLE',
      description: 'Beban pembelian langsung (Non-Stock)'
    },

    // --- SALES (AR) ---
    {
      transactionType: 'SALES_INVOICE',
      event: 'POST',
      debitKey: 'ACCOUNTS_RECEIVABLE',
      creditKey: 'SALES_REVENUE',
      description: 'Invoice Penjualan: Piutang (Debit) vs Pendapatan (Kredit)'
    },
    {
      transactionType: 'SALES_INVOICE_VAT',
      event: 'POST',
      debitKey: 'ACCOUNTS_RECEIVABLE',
      creditKey: 'VAT_OUT',
      description: 'PPN Keluaran dari Penjualan'
    },
    {
        transactionType: 'SALES_PAYMENT',
        event: 'RECEIVE',
        debitKey: 'CASH',
        creditKey: 'ACCOUNTS_RECEIVABLE',
        description: 'Penerimaan pembayaran dari pelanggan'
    },

    // --- OPERATIONAL EXPENSES ---
    {
      transactionType: 'EXPENSE',
      event: 'POST',
      debitKey: 'EXPENSE',
      creditKey: 'CASH',
      description: 'Beban operasional umum'
    },
    {
      transactionType: 'EXPENSE_PROJECT',
      event: 'POST',
      debitKey: 'STAFF_ADVANCE',
      creditKey: 'CASH',
      description: 'Beban mobilisasi proyek (dialihkan ke Uang Muka Staff)'
    },
    {
      transactionType: 'STAFF_ADVANCE',
      event: 'DISBURSE',
      debitKey: 'STAFF_ADVANCE',
      creditKey: 'PETTY_CASH',
      description: 'Pemberian uang muka kerja kepada staff'
    },
    {
      transactionType: 'STAFF_ADVANCE',
      event: 'SETTLE',
      debitKey: 'EXPENSE',
      creditKey: 'STAFF_ADVANCE',
      description: 'Realisasi/Pertanggungjawaban uang muka staff (Settlement)'
    },

    // --- OTHERS ---
    {
      transactionType: 'OPENING_BALANCE',
      event: 'POST',
      debitKey: 'ANY', // Dynamic
      creditKey: 'EQUITY_OPENING_BALANCE',
      description: 'Saldo awal sebagai penyeimbang ekuitas'
    }
  ];

  // --- SEEDING LOGIC ---

  // A. Seed SystemAccounts
  for (const sa of systemAccounts) {
    console.log(`Processing SystemAccount: ${sa.key}...`);
    let coa = await prisma.chartOfAccounts.findUnique({ where: { code: sa.fallbackCode } });
    if (!coa && sa.searchNames) {
      coa = await prisma.chartOfAccounts.findFirst({
        where: { OR: sa.searchNames.map(n => ({ name: { contains: n, mode: 'insensitive' } })) }
      });
    }

    if (coa) {
      await prisma.systemAccount.upsert({
        where: { key: sa.key },
        update: { coaId: coa.id, description: sa.description },
        create: { key: sa.key, coaId: coa.id, description: sa.description }
      });
      console.log(`✓ Linked ${sa.key} to ${coa.code}`);
    } else {
      console.warn(`! COA not found for ${sa.key}`);
    }
  }

  // B. Seed TransactionMappings
  // NOTE: This requires the TransactionMapping model to be added to schema.prisma first.
  if (prisma.transactionMapping) {
      for (const tm of transactionMappings) {
        console.log(`Processing Mapping: ${tm.transactionType} [${tm.event}]...`);
        await prisma.transactionMapping.upsert({
          where: {
            transactionType_event: {
              transactionType: tm.transactionType,
              event: tm.event
            }
          },
          update: {
            debitKey: tm.debitKey,
            creditKey: tm.creditKey,
            description: tm.description
          },
          create: {
            transactionType: tm.transactionType,
            event: tm.event,
            debitKey: tm.debitKey,
            creditKey: tm.creditKey,
            description: tm.description
          }
        });
        console.log(`✓ Seeded ${tm.transactionType}:${tm.event}`);
      }
  } else {
      console.log('\n[INFO] Skipping TransactionMappings because the model is not yet in schema.prisma.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
