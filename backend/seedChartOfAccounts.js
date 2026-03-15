const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const coaData = [
  // --- LEVEL 1 ROOT HEADERS ---
  {
    code: '1-00000',
    name: 'ASET',
    description: 'Seluruh aset perusahaan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-00000',
    name: 'KEWAJIBAN',
    description: 'Seluruh kewajiban perusahaan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '3-00000',
    name: 'EKUITAS',
    description: 'Modal dan ekuitas pemilik.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-00000',
    name: 'PENDAPATAN',
    description: 'Seluruh pendapatan perusahaan.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '5-00000',
    name: 'BEBAN POKOK PENDAPATAN',
    description: 'Biaya langsung operasional (HPP).',
    type: 'HPP',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-00000',
    name: 'BEBAN OPERASIONAL',
    description: 'Seluruh beban operasional dan administrasi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- ASSETS (1-xxxx) ---
  {
    code: '1-10000',
    name: 'Kas & Bank',
    description: 'Akun Induk untuk semua Kas dan Rekening Bank.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10001',
    name: 'Kas Peti Cash',
    description: 'Saldo uang tunai yang tersedia untuk pengeluaran kecil sehari-hari.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10002',
    name: 'Bank BRI KC. CIKARANG',
    description: 'Saldo rekening tabungan/giro di Bank BRI KC. CIKARANG.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10003',
    name: 'Bank BRI KC. HARAPAN INDAH',
    description: 'Saldo rekening tabungan/giro di Bank BRI KC. HARAPAN INDAH',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10004',
    name: 'Bank BRI KC. LEBAK BULUS',
    description: 'Saldo rekening tabungan/giro di Bank BRI KC. LEBAK BULUS',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10005',
    name: 'Bank BRI KC. TAMBUN',
    description: 'Saldo rekening tabungan/giro di Bank BRI KC. TAMBUN',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10006',
    name: 'Bank BRI KC. BRI KARAWANG',
    description: 'Saldo rekening tabungan/giro di Bank BRI KC. BRI KARAWANG',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10100',
    name: 'Piutang',
    description: 'Akun Induk untuk semua Piutang yang dimiliki perusahaan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10101',
    name: 'Piutang Usaha',
    description: 'Tagihan kepada pelanggan atas penjualan barang atau jasa secara kredit.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10102',
    name: 'Piutang Belum Ditagih',
    description: 'Pendapatan yang sudah diakui namun faktur belum diterbitkan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10200',
    name: 'Persediaan',
    description: 'Akun Induk untuk semua jenis Persediaan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10201',
    name: 'Persediaan Barang Dagang',
    description: 'Nilai barang yang dibeli/diproduksi untuk dijual kembali.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '1-10202',
    name: 'Persediaan - Gudang Pusat (BENGKEL)',
    description: 'Stok fisik material/barang yang berada di lokasi pusat (BENGKEL)',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10203',
    name: 'Persediaan - Gudang Cabang KEBON',
    description: 'Stok fisik material/barang yang berada di lokasi cabang KEBON',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10204',
    name: 'Persediaan - Gudang Cabang B Zenal',
    description: 'Stok fisik material/barang yang berada di lokasi cabang B Zaenal',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10205',
    name: 'Persediaan On WIP',
    description: 'Nilai material yang sedang terikat dalam proses pengerjaan proyek di lokasi (Work in Progress)',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10300',
    name: 'Piutang Lain-lain',
    description: 'Akun Induk untuk tagihan non-operasional utama.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10301',
    name: 'Pinjaman Karyawan',
    description: 'Piutang internal berupa pinjaman atau kasbon karyawan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10302',
    name: 'Uang Muka Kerja (Staff)',
    description: 'Dana PR/Petty Cash untuk belanja operasional/proyek.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10303',
    name: 'Piutang Karyawan Lainnya',
    description: 'Piutang internal karyawan selain pinjaman (uang muka dinas, tunjangan).',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10400',
    name: 'Pajak Dibayar di Muka',
    description: 'Akun Induk untuk semua pajak yang telah dibayar di muka (prepaid tax).',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10401',
    name: 'PPN Masukan',
    description: 'Pajak Pertambahan Nilai yang dibayar atas pembelian barang/jasa.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-10402',
    name: 'Pajak Dibayar di Muka Lainnya',
    description: 'Pajak dibayar di muka selain PPN (pajak sewa, PBB, dll).',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20000',
    name: 'Aset Tetap',
    description: 'Akun Induk untuk semua Aset Jangka Panjang.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '1-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20100',
    name: 'Kendaraan',
    description: 'Akun induk untuk semua jenis kendaraan operasional.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20101',
    name: 'Kendaraan Operasional',
    description: 'Mencatat perolehan Mobil, Motor, dan armada proyek.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20102',
    name: 'Akumulasi Penyusutan Kendaraan',
    description: 'Akun pengurang nilai kendaraan akibat pemakaian/umur ekonomis.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20103',
    name: 'Kendaraan Non-Produksi',
    description: 'Kendaraan operasional untuk non-produksi (mobil dinas, sales, dll).',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20104',
    name: 'Akumulasi Penyusutan Kendaraan Non-Produksi',
    description: 'Akun kontra untuk akumulasi penyusutan kendaraan non-produksi.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20200',
    name: 'Tanah dan Bangunan',
    description: 'Akun induk untuk tanah dan bangunan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20201',
    name: 'Tanah',
    description: 'Nilai perolehan atas tanah yang dimiliki perusahaan.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20202',
    name: 'Bangunan',
    description: 'Nilai perolehan atas gedung, kantor, pabrik, gudang.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20203',
    name: 'Akumulasi Penyusutan Bangunan',
    description: 'Akun pengurang nilai bangunan.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20300',
    name: 'Peralatan Kantor',
    description: 'Akun induk untuk peralatan kantor.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20301',
    name: 'Peralatan Kantor - Elektronik',
    description: 'Komputer, printer, scanner, proyektor, AC.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20302',
    name: 'Peralatan Kantor - Furniture',
    description: 'Meja, kursi, lemari, rak, partisi.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20303',
    name: 'Akumulasi Penyusutan Peralatan Kantor',
    description: 'Akun pengurang nilai peralatan kantor.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20400',
    name: 'Peralatan Teknis/Proyek',
    description: 'Akun induk untuk peralatan teknis konstruksi.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20401',
    name: 'Peralatan Konstruksi',
    description: 'Mesin-mesin konstruksi, alat berat, generator.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20402',
    name: 'Peralatan Teknis',
    description: 'Alat ukur, alat testing, peralatan survey.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20403',
    name: 'Akumulasi Penyusutan Peralatan Teknis',
    description: 'Akun pengurang nilai peralatan teknis.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20500',
    name: 'Aset Tidak Berwujud',
    description: 'Akun induk untuk aset tidak berwujud.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20501',
    name: 'Hak Cipta/Merek Dagang',
    description: 'Nilai perolehan hak kekayaan intelektual.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20502',
    name: 'Goodwill',
    description: 'Goodwill dari akuisisi bisnis.',
    type: 'ASET',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'INVESTING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '1-20503',
    name: 'Amortisasi Aset Tidak Berwujud',
    description: 'Akun pengurang nilai aset tidak berwujud.',
    type: 'ASET',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- LIABILITIES (2-xxxx) ---
  {
    code: '2-00000',
    name: 'KEWAJIBAN',
    description: 'Akun Induk Tertinggi untuk seluruh kewajiban perusahaan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10000',
    name: 'Kewajiban Jangka Pendek',
    description: 'Akun Induk untuk semua Kewajiban yang jatuh tempo < 1 tahun.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '2-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10101',
    name: 'Utang Usaha (Supplier)',
    description: 'Kewajiban kepada pemasok atas pembelian barang/jasa secara kredit.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10102',
    name: 'Penerimaan Barang Belum Ditagih',
    description: 'Akun temporary untuk mencatat barang masuk yang belum ada invoice final.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: true,
    status: 'ACTIVE'
  },
  {
    code: '2-10103',
    name: 'Utang Gaji',
    description: 'Kewajiban atas gaji karyawan yang belum dibayarkan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10104',
    name: 'Utang Sewa Gedung',
    description: 'Kewajiban atas sewa gedung/kantor yang belum dibayar.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10105',
    name: 'Utang Listrik & Telepon',
    description: 'Kewajiban atas tagihan listrik and telepon yang belum dibayar.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10106',
    name: 'Utang Jasa Konsultan',
    description: 'Kewajiban atas honorarium konsultan yang belum dibayar.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10107',
    name: 'Utang Bonus & THR',
    description: 'Kewajiban atas bonus dan THR karyawan yang belum dibayarkan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10108',
    name: 'Utang Asuransi',
    description: 'Kewajiban atas premi asuransi yang belum dibayarkan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10300',
    name: 'Utang Pajak',
    description: 'Akun Induk untuk kewajiban pajak perusahaan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10301',
    name: 'PPN Pengeluaran',
    description: 'Pajak Pertambahan Nilai yang dipungut atas penjualan barang/jasa.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10302',
    name: 'PPh 21 Terutang',
    description: 'Kewajiban pajak penghasilan pasal 21 atas gaji karyawan.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10303',
    name: 'PPh 23 Terutang',
    description: 'Kewajiban pajak penghasilan pasal 23 atas jasa.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-10304',
    name: 'PPh 4(2) Terutang',
    description: 'Kewajiban pajak penghasilan final pasal 4 ayat 2.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-20000',
    name: 'Kewajiban Jangka Panjang',
    description: 'Akun Induk untuk semua Kewajiban yang jatuh tempo > 1 tahun.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '2-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '2-20101',
    name: 'Utang Bank Jangka Panjang',
    description: 'Saldo pinjaman bank yang jatuh tempo lebih dari satu tahun.',
    type: 'LIABILITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'FINANCING',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- EQUITY (3-xxxx) ---
  {
    code: '3-10000',
    name: 'Ekuitas',
    description: 'Akun Induk untuk Kepemilikan (Modal) perusahaan.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '3-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '3-10001',
    name: 'Modal Disetor',
    description: 'Jumlah modal yang disetor oleh pemilik/pemegang saham.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'FINANCING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '3-10002',
    name: 'Laba Ditahan',
    description: 'Akumulasi laba bersih perusahaan dari periode sebelumnya.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '3-10003',
    name: 'Laba Tahun Berjalan',
    description: 'Laba bersih yang diperoleh perusahaan pada tahun fiskal berjalan.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '3-10101',
    name: 'Saldo Awal Ekuitas',
    description: 'Saldo Awal System Go-Live, Ini adalah jurnal penyeimbang administratif.',
    type: 'EKUITAS',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'NONE',
    parentCode: '3-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- INCOME (4-xxxx) ---
  {
    code: '4-10000',
    name: 'Pendapatan',
    description: 'Akun Induk untuk semua Penghasilan Utama perusahaan.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '4-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10101',
    name: 'Pendapatan Jasa Konstruksi',
    description: 'Penghasilan yang diperoleh dari pelaksanaan proyek konstruksi.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10201',
    name: 'Pendapatan Jasa Maintenance',
    description: 'Penghasilan yang diperoleh dari layanan pemeliharaan/perawatan.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10300',
    name: 'Pendapatan Lain-lain',
    description: 'Akun induk untuk pendapatan non-operasional utama.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10301',
    name: 'Pendapatan Bunga Bank',
    description: 'Pendapatan bunga dari deposito dan giro bank.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10302',
    name: 'Pendapatan Sewa',
    description: 'Pendapatan dari penyewaan aset perusahaan.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '4-10303',
    name: 'Pendapatan Lain-lain Operasional',
    description: 'Pendapatan lain-lain diluar usaha utama perusahaan.',
    type: 'PENDAPATAN',
    normalBalance: 'CREDIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- COGS/HPP (5-xxxx) ---
  {
    code: '5-10000',
    name: 'BEBAN POKOK PENDAPATAN',
    description: 'Akun Induk untuk Biaya Langsung terkait perolehan pendapatan.',
    type: 'HPP',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '5-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '5-10101',
    name: 'Biaya Material Proyek',
    description: 'Biaya bahan baku/material yang digunakan langsung untuk proyek.',
    type: 'HPP',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '5-10102',
    name: 'Beban Mobilisasi',
    description: 'Biaya logistik, armada proyek, tol, bensin yang terkait langsung dengan proyek.',
    type: 'HPP',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },

  // --- EXPENSE (6-xxxx) ---
  {
    code: '6-10000',
    name: 'Beban Operasional & Admin',
    description: 'Akun Induk untuk Beban Umum, Administrasi, dan Penjualan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-00000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10100',
    name: 'Beban SDM & Administrasi Umum',
    description: 'Akun Induk untuk Biaya Karyawan dan Administrasi Kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10101',
    name: 'Beban Gaji Karyawan',
    description: 'Biaya yang dikeluarkan untuk pembayaran gaji dan tunjangan karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10100',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10102',
    name: 'Beban Admin Bank',
    description: 'Biaya administrasi bank atas layanan perbankan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-11100',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10200',
    name: 'Beban Sewa & Utilities',
    description: 'Akun induk untuk semua biaya sewa dan utilitas kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10201',
    name: 'Beban Sewa Gedung/Kantor',
    description: 'Biaya sewa bulanan untuk kantor, gudang, atau ruang usaha.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10202',
    name: 'Beban Listrik',
    description: 'Tagihan PLN untuk keperluan kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10203',
    name: 'Beban Telekomunikasi',
    description: 'Biaya telepon, internet, dan paket data untuk keperluan kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10204',
    name: 'Beban Perlengkapan Office',
    description: 'Alat tulis, kertas, toner printer, and perlengkapan kantor lainnya.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10200',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10205',
    name: 'Beban Kebersihan & Pemeliharaan Kantor',
    description: 'Biaya cleaning service, maintenance kantor, and jasa kebersihan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10200',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10206',
    name: 'Beban Air',
    description: 'Tagihan PDAM untuk keperluan kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10300',
    name: 'Beban Legal & Perizinan',
    description: 'Akun induk untuk semua biaya hukum, notaris, and perizinan usaha.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10301',
    name: 'Beban Notaris & Hukum',
    description: 'Honorarium notaris, konsultan hukum, and biaya legal lainnya.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10302',
    name: 'Beban Perizinan Usaha',
    description: 'Biaya perpanjangan izin usaha, SIUP, TDP, and perizinan lainnya.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10303',
    name: 'Beban Lisensi Software',
    description: 'Biaya lisensi software, ERP, and aplikasi berbayar.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10400',
    name: 'Beban Teknologi Informasi',
    description: 'Akun induk untuk semua biaya teknologi informasi and sistem.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10401',
    name: 'Beban Software & Subscription',
    description: 'Biaya subscription software, ERP, Microsoft 365, and aplikasi lain.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10402',
    name: 'Beban Maintenance Hardware',
    description: 'Biaya perbaikan and maintenance komputer, server, and hardware.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10403',
    name: 'Beban Cloud Services',
    description: 'Biaya hosting, cloud storage, and layanan cloud computing.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10404',
    name: 'Beban IT Support',
    description: 'Biaya jasa IT external, konsultan IT, and technical support.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10600',
    name: 'Beban Pemasaran & Promosi',
    description: 'Akun induk untuk semua biaya pemasaran and promosi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10601',
    name: 'Beban Iklan & Digital Marketing',
    description: 'Biaya iklan online (Google/Facebook), SEO, and digital marketing.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10602',
    name: 'Beban Event & Pameran',
    description: 'Biaya partisipasi pameran, expo, and event pemasaran.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10603',
    name: 'Beban Promosi & Sponsorship',
    description: 'Biaya sponsorship, promosi produk, and kegiatan pemasaran.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10604',
    name: 'Beban Souvenir & Merchandise',
    description: 'Biaya pembuatan souvenir, merchandise, and barang promosi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10700',
    name: 'Beban Penjualan',
    description: 'Akun induk untuk semua biaya terkait penjualan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10701',
    name: 'Beban Komisi Penjualan',
    description: 'Biaya komisi untuk sales and tenaga penjualan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10702',
    name: 'Beban Perjalanan Dinas Sales',
    description: 'Biaya perjalanan dinas, akomodasi, and transportasi sales.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10703',
    name: 'Beban Entertainment Klien',
    description: 'Biaya entertain klien, meeting bisnis, and hubungan relasi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10800',
    name: 'Beban Transportasi Operasional',
    description: 'Akun induk untuk biaya transportasi non-proyek.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10801',
    name: 'Beban Bahan Bakar Kendaraan',
    description: 'Biaya bensin/solar untuk kendaraan operasional non-proyek.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10800',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10802',
    name: 'Beban Maintenance Kendaraan',
    description: 'Biaya perbaikan, servis, and maintenance kendaraan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10803',
    name: 'Beban Parkir & Tol',
    description: 'Biaya parkir and tol untuk kendaraan operasional.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10804',
    name: 'Beban Pengiriman & Kurir',
    description: 'Biaya pengiriman dokumen, paket, and jasa kurir.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10900',
    name: 'Beban Sumber Daya Manusia',
    description: 'Akun induk untuk biaya pengembangan SDM.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10901',
    name: 'Beban Pelatihan & Development',
    description: 'Biaya pelatihan karyawan, seminar, workshop, and pengembangan kompetensi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10902',
    name: 'Beban Rekrutmen & Seleksi',
    description: 'Biaya iklan lowongan, psikotes, agency fee, and seleksi karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10903',
    name: 'Beban Membership & Asosiasi',
    description: 'Biaya keanggotaan asosiasi profesi, chamber of commerce, and organisasi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11000',
    name: 'Beban Fasilitas & Kesejahteraan',
    description: 'Akun induk untuk biaya fasilitas and kesejahteraan karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11001',
    name: 'Beban Katering & Konsumsi',
    description: 'Biaya katering, konsumsi meeting, and makanan untuk karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-11000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11002',
    name: 'Beban Medical Check-up',
    description: 'Biaya medical check-up and pemeriksaan kesehatan karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11003',
    name: 'Beban Acara Karyawan',
    description: 'Biaya outbound, rekreasi, gathering, and acara internal perusahaan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11004',
    name: 'Beban Sumbangan & Sosial',
    description: 'Biaya sumbangan sosial, donasi, and kegiatan CSR perusahaan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11100',
    name: 'Beban Keuangan & Bank',
    description: 'Akun induk untuk biaya perbankan and keuangan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11101',
    name: 'Beban Administrasi Bank (Internal)',
    description: 'Biaya admin bulanan, transfer, and layanan perbankan internal.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11102',
    name: 'Beban Bunga Pinjaman',
    description: 'Biaya bunga pinjaman bank and kredit usaha.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'FINANCING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11103',
    name: 'Beban Provisi & Biaya Lain Bank',
    description: 'Biaya provisi, notaris bank, and biaya lain-lain perbankan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11200',
    name: 'Beban Pajak',
    description: 'Akun induk untuk biaya pajak non-PPN.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11201',
    name: 'Beban Pajak Penghasilan Badan',
    description: 'Biaya PPh Badan tahunan perusahaan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11202',
    name: 'Beban Pajak Kendaraan',
    description: 'Biaya pajak kendaraan (STNK) untuk kendaraan operasional.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11203',
    name: 'Beban Pajak Lain-lain',
    description: 'Biaya pajak lainnya seperti PBB, pajak reklame, and pajak daerah.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11300',
    name: 'Beban Asuransi',
    description: 'Akun induk untuk semua biaya premi asuransi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11301',
    name: 'Beban Asuransi Kendaraan',
    description: 'Biaya premi asuransi kendaraan operasional.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11302',
    name: 'Beban Asuransi Kesehatan',
    description: 'Biaya premi asuransi kesehatan karyawan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11303',
    name: 'Beban Asuransi Properti',
    description: 'Biaya premi asuransi gedung, kantor, and properti.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11304',
    name: 'Beban Asuransi Lainnya',
    description: 'Biaya premi asuransi lainnya seperti asuransi jiwa, liability, dll.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11400',
    name: 'Beban Lain-lain Operasional',
    description: 'Akun induk untuk biaya operasional lainnya yang tidak terklasifikasi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-10000',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11401',
    name: 'Beban Entertainment & Relasi Bisnis',
    description: 'Biaya entertainment relasi bisnis, meeting dengan mitra.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11402',
    name: 'Beban Sumbangan & Hadiah',
    description: 'Biaya hadiah pernikahan, sumbangan perayaan, and gift.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11403',
    name: 'Beban Kerugian Piutang Tak Tertagih',
    description: 'Biaya kerugian akibat piutang tak tertagih (bad debt expense).',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11404',
    name: 'Beban Kehilangan/Perampokan',
    description: 'Kerugian akibat kehilangan aset atau perampokan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11405',
    name: 'Beban Tidak Terduga',
    description: 'Biaya darurat and pengeluaran tak terduga lainnya.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    parentCode: '6-11400',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10500',
    name: 'Beban Penyusutan',
    description: 'Akun induk untuk beban penyusutan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'HEADER',
    cashflowType: 'NONE',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10501',
    name: 'Beban Penyusutan Kendaraan',
    description: 'Beban penyusutan kendaraan operasional.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10502',
    name: 'Beban Penyusutan Bangunan',
    description: 'Beban penyusutan gedung dan bangunan.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10503',
    name: 'Beban Penyusutan Peralatan Kantor',
    description: 'Beban penyusutan peralatan kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10504',
    name: 'Beban Penyusutan Peralatan Teknis',
    description: 'Beban penyusutan alat konstruksi dan teknis.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10505',
    name: 'Beban Amortisasi',
    description: 'Beban amortisasi aset tidak berwujud.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  // --- SUB ACCOUNTS FROM USER REQUEST ---
  {
    code: '6-11001-01',
    name: 'Belanja Kebutuhan Pantry',
    description: 'Pembelian kopi, gula, teh, snack, air mineral untuk pantry kantor. Tips: 1. Simpan nota asli 2. Buat daftar barang.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-11001',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11001-02',
    name: 'Makan Siang Rapat',
    description: 'Konsumsi untuk meeting/rapat internal kantor. Tips: 1. Maks 75rb/org 2. Min 3 org 3. Sertakan daftar peserta.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-11001',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10801-01',
    name: 'Bensin Keperluan Kantor',
    description: 'Bensin/solar untuk kendaraan dinas. Tips: 1. Catat odometer 2. Tulis tujuan 3. Simpan struk SPBU.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10801',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10204-01',
    name: 'Perlengkapan Kantor Kecil',
    description: 'Alat tulis, kertas, supplies. Tips: 1. Beli sesuai kebutuhan 2. Simpan nota 3. Bandingkan harga.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10204',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10804-01',
    name: 'Transportasi Lokal',
    description: 'Gojek/Grab/Ojol untuk antar dokumen. Tips: 1. Screenshot app 2. Tujuan jelas 3. Prioritas kendaraan kantor.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10804',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10205-01',
    name: 'Kebersihan Kantor',
    description: 'Sabun, tissue, pembersih. Tips: 1. Beli bulk 2. Simpan nota 3. Cek stok.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10205',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-10803-01',
    name: 'Parkir & Tol',
    description: 'Parkir kantor dan Tol dalam kota. Tips: 1. Kumpulkan tiket 2. Rekam transaksi e-toll 3. Maks 50rb/hari.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-10803',
    isReconcilable: false,
    status: 'ACTIVE'
  },
  {
    code: '6-11405-01',
    name: 'Kebutuhan Darurat',
    description: 'Perbaikan kecil, P3K. Tips: 1. Lapor spv 2. Maks 300rb tanpa approval 3. Dokumentasi.',
    type: 'BEBAN',
    normalBalance: 'DEBIT',
    postingType: 'POSTING',
    cashflowType: 'OPERATING',
    parentCode: '6-11405',
    isReconcilable: false,
    status: 'ACTIVE'
  }
];

async function seedCOA() {
  console.log('🌱 Updating Chart of Accounts for Go-Live...');

  // Pass 1: Upsert basic account data
  const currentCodes = coaData.map(item => item.code);
  
  for (const item of coaData) {
    await prisma.chartOfAccounts.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        type: item.type,
        normalBalance: item.normalBalance,
        postingType: item.postingType,
        cashflowType: item.cashflowType,
        isReconcilable: item.isReconcilable,
        status: item.status,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        type: item.type,
        normalBalance: item.normalBalance,
        postingType: item.postingType,
        cashflowType: item.cashflowType,
        isReconcilable: item.isReconcilable,
        status: item.status,
      }
    });
  }

  // Pass 2: Setup Parent-Child Relations
  for (const item of coaData) {
    let parentCode = null;

    if (item.parentCode) {
        parentCode = item.parentCode;
    } else if (item.postingType === 'POSTING') {
      // Auto-logic for POSTING accounts: 1-10101 -> 1-10100
      const parts = item.code.split('-');
      if (parts.length > 1) {
           const num = parts[1];
           if (!isNaN(num)) {
               // Standard format (5 digits)
               const headerNum = num.substring(0, 3) + '00';
               parentCode = `${parts[0]}-${headerNum}`;
           }
      }
    }

    if (parentCode && parentCode !== item.code) {
      const parent = await prisma.chartOfAccounts.findUnique({
        where: { code: parentCode }
      });
      
      if (parent) {
        await prisma.chartOfAccounts.update({
          where: { code: item.code },
          data: { parentId: parent.id }
        });
      }
    } else if (item.code.endsWith('00000') || !parentCode) {
        // Explicitly clear parentId for root level accounts
        await prisma.chartOfAccounts.update({
            where: { code: item.code },
            data: { parentId: null }
        });
    }
  }

  // Cleanup: Delete old alpha-numeric accounts that are no longer in coaData
  const legacyCodes = [
    'PANTRY-01', 'MEAL-02', 'FUEL-01', 'OFFICE-01', 
    'TRANSPORT-01', 'CLEANING-01', 'PARKING-01', 'EMERGENCY-01'
  ];
  
  for (const code of legacyCodes) {
      const exists = await prisma.chartOfAccounts.findUnique({ where: { code } });
      if (exists) {
          console.log(`🗑️ Deleting legacy account: ${code}`);
          // Note: Be careful with foreign key constraints if there are transactions
          try {
              await prisma.chartOfAccounts.delete({ where: { code } });
          } catch (e) {
              console.warn(`⚠️ Could not delete ${code}: ${e.message}`);
          }
      }
  }

  console.log('✅ Chart of Accounts is up to date!');
}

seedCOA()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
