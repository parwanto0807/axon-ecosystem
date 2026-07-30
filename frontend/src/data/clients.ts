export type ClientData = {
    id: string;
    name: string;
    sector: string;
    filterCategory: string;
    badges: string[];
    shortDesc: string;
    domain: string;
    caseStudy: {
        tantangan: string;
        solusi: string;
        hasil: string;
    };
    ctaText: string;
    color: string;
    borderColor: string;
};

export const clients: ClientData[] = [
    {
        id: "rylif",
        name: "PT. Rylif Mikro Mandiri",
        sector: "General Supply & Kontraktor",
        filterCategory: "General Supply & Kontraktor",
        badges: ["ERP", "Procurement", "Multi-Proyek"],
        domain: "https://rylif-app.com/",
        shortDesc: "PT. Rylif Mikro Mandiri — General Supply & Kontraktor kepercayaan Bank BRI dan berbagai instansi, kini mengelola seluruh alur procurement dan proyek dalam satu sistem terpadu.",
        caseStudy: {
            tantangan: "Sebagai kontraktor dan penyedia general supply untuk klien besar seperti Bank BRI dan berbagai instansi, Rylif menghadapi kompleksitas dalam mengelola banyak proyek dan pesanan secara bersamaan — mulai dari penawaran, pengadaan barang, hingga pelaporan ke klien korporat yang menuntut akurasi tinggi.",
            solusi: "Axon ERP mengintegrasikan proses sales order, procurement, dan pelaporan proyek Rylif dalam satu dashboard, memastikan setiap proyek untuk klien institusional dapat dipantau secara real-time.",
            hasil: "Rylif kini dapat melayani klien-klien besar dengan standar pelaporan yang konsisten dan proses internal yang lebih rapi, tanpa harus menambah beban administratif tim."
        },
        ctaText: "Kelola proyek dan procurement bisnis kontraktor Anda seperti Rylif — Konsultasi Gratis →",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-500/20"
    },
    {
        id: "yasfina",
        name: "Yayasan Kesehatan Klinik Yasfina",
        sector: "Layanan Kesehatan",
        filterCategory: "Kesehatan",
        badges: ["HRM", "Operasional Klinis", "Manajemen Layanan"],
        domain: "https://yasfina-app.com/",
        shortDesc: "Yayasan Kesehatan Klinik Yasfina — bergerak di bidang kesehatan, mempercayakan pengelolaan operasional dan SDM-nya pada Axon Ecosystem untuk mendukung pelayanan yang lebih responsif.",
        caseStudy: {
            tantangan: "Institusi kesehatan seperti Yasfina membutuhkan sistem yang dapat diandalkan untuk mengelola SDM (tenaga medis & non-medis) serta operasional harian, tanpa mengorbankan fokus utama mereka: pelayanan kepada pasien.",
            solusi: "Axon HRM & Payroll menangani manajemen data karyawan, absensi, dan penggajian secara otomatis, sehingga tim Yasfina bisa lebih fokus pada kualitas layanan kesehatan.",
            hasil: "Proses administrasi SDM yang sebelumnya memakan waktu kini berjalan lebih efisien, memberi ruang lebih besar bagi tim untuk berfokus pada pelayanan pasien."
        },
        ctaText: "Sederhanakan operasional institusi kesehatan Anda — Konsultasi Gratis →",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        borderColor: "border-emerald-500/20"
    },
    {
        id: "grafindo",
        name: "PT. Grafindo Mitrasemesta",
        sector: "Manufaktur (Sticker Otomotif)",
        filterCategory: "Manufaktur",
        badges: ["ERP", "MRP", "Manufaktur"],
        domain: "https://grafindo-app.com/portal/login",
        shortDesc: "PT. Grafindo Mitrasemesta — pemain industri sticker otomotif, menggunakan Axon ERP untuk mengintegrasikan produksi, inventory, dan akuntansi dalam satu sistem.",
        caseStudy: {
            tantangan: "Sebagai pelaku industri manufaktur sticker otomotif, Grafindo perlu mengelola alur produksi yang kompleks — dari perhitungan material (BOM), stok bahan baku, hingga pelaporan keuangan — yang jika dilakukan manual rentan terhadap kesalahan dan keterlambatan.",
            solusi: "Axon ERP dengan modul MRP (Material Requirement Planning) membantu Grafindo menghitung kebutuhan material secara otomatis, memantau stok multi-gudang, dan menyajikan laporan akuntansi yang konsolidatif.",
            hasil: "Grafindo kini memiliki visibilitas penuh atas rantai produksinya, dari bahan baku masuk hingga produk siap kirim, dengan proses yang lebih presisi dan minim human error."
        },
        ctaText: "Otomasi proses manufaktur bisnis Anda seperti Grafindo — Konsultasi Gratis →",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        borderColor: "border-amber-500/20"
    },
    {
        id: "taman-marunda",
        name: "Perum Metland Cibitung Cluster Taman Marunda",
        sector: "Properti / Perumahan",
        filterCategory: "Properti & Perumahan",
        badges: ["Axon Guard", "Gate System", "IPL Payment"],
        domain: "https://taman-marunda.id/login",
        shortDesc: "Perum Metland Cibitung Cluster Taman Marunda — cluster perumahan modern yang mengintegrasikan Gate System, manajemen petugas keamanan & kebersihan, hingga pembayaran IPL dalam satu ekosistem digital.",
        caseStudy: {
            tantangan: "Mengelola sebuah cluster perumahan bukan hanya soal keamanan gerbang, tapi juga koordinasi petugas keamanan, kebersihan lingkungan, dan yang paling krusial — transparansi pembayaran Iuran Pengelolaan Lingkungan (IPL) yang seringkali jadi sumber gesekan antara pengelola dan warga.",
            solusi: "Axon Ecosystem menghubungkan Gate System perumahan langsung dengan modul manajemen petugas (keamanan & kebersihan) serta sistem pembayaran IPL, sehingga seluruh operasional cluster berjalan dalam satu ekosistem yang saling terhubung.",
            hasil: "Taman Marunda kini memiliki sistem akses yang lebih aman, koordinasi petugas lapangan yang lebih terpantau, serta proses pembayaran IPL yang lebih transparan bagi seluruh warga."
        },
        ctaText: "Wujudkan cluster perumahan yang aman, rapi, dan transparan seperti Taman Marunda — Konsultasi Gratis →",
        color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        borderColor: "border-indigo-500/20"
    }
];
