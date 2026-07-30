"use client"

import { motion } from "framer-motion"
import { Navbar } from "./Navbar"
import { ScrollNav } from "./ScrollNav"
import { Hero } from "./Hero"
import { ClientShowcase } from "./ClientShowcase"
import { MatrixTableWrapper } from "./MatrixTableWrapper"
import { Footer } from "./Footer"
import { ReadyDetailModal } from "./ReadyDetailModal"
import { CustomDetailModal } from "./CustomDetailModal"
import { ManufacturingDetailModal } from "./ManufacturingDetailModal"
import { FoundationDetailModal } from "./FoundationDetailModal"
import { MSMEDetailModal } from "./MSMEDetailModal"
import { SectionPattern } from "./SectionPattern"
import { useState } from "react"
import Link from "next/link"
import {
    ArrowRight, Check, Factory, GraduationCap, Store, Zap, Layers, ChevronDown,
    Cog, Puzzle, Plug, Wrench, Clock, Shield, Cloud, Headphones,
    ShoppingCart, BarChart3, Truck, Users, CreditCard, TrendingUp, Package,
    Building2, Calculator, UserCheck
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"

/* ─── translations ─── */
const translations = {
    ID: {
        dualStrength: {
            sectionTitle: "Dua Jalur. Satu Hasil: Bisnis Anda Jalan.",
            subtitle: "Anda pilih kecepatan, atau fleksibilitas — Axon siap dengan keduanya. Tanpa kompromi, tanpa biaya tersembunyi.",
            readyTitle: "Axon Ready",
            readyBadge: "Standard",
            readyDesc: "Modul siap pakai. Go-live dalam hitungan minggu. Cocok untuk bisnis yang ingin langsung beroperasi tanpa drama implementasi panjang.",
            readyFeatures: ["Implementasi 1–4 minggu", "Hosting cloud — tanpa biaya server", "Auto-update & maintenance gratis", "Domain & SSL sudah include"],
            readyCta: "Cocok untuk saya — pelajari lebih lanjut",
            customTitle: "Axon Custom",
            customBadge: "Tailored",
            customDesc: "Alur kerja unik? Sistem legacy? Tim kami bangun sesuai spesifikasi persis Anda. Fleksibilitas penuh tanpa kehilangan stabilitas.",
            customFeatures: ["Fitur 100% sesuai SOP Anda", "Integrasi dengan sistem yang sudah ada", "Opsi server mandiri", "Eksklusivitas — tidak dimiliki kompetitor"],
            customCta: "Saya butuh kustom — jelaskan caranya",
        },
        painPoints: {
            title: "Masalah yang Kami Selesaikan",
            subtitle: "Kenali dulu rasa sakitnya, lalu lihat bagaimana Axon mengatasinya.",
            items: [
                { pain: "Data tersebar di Excel, grup WA, dan catatan manual", fix: "Semua data terpusat dalam satu dashboard real-time.", icon: BarChart3 },
                { pain: "Laporan keuangan butuh 2 minggu untuk ditutup", fix: "Laporan Laba Rugi & Neraca selesai dalam hitungan detik.", icon: TrendingUp },
                { pain: "Stok gudang tidak sinkron dengan penjualan", fix: "Integrasi otomatis: setiap penjualan langsung potong stok.", icon: Package },
                { pain: "Tidak tahu performa cabang secara real-time", fix: "Satu layar menampilkan semua cabang — kapan saja, di mana saja.", icon: Building2 },
            ]
        },
        spectrum: {
            title: "Fleksibel di Setiap Level",
            subtitle: "Dari yang paling simpel sampai paling advance — pilih sesuai kebutuhan Anda hari ini, upgrade kapan saja.",
            levels: [
                { title: "Konfigurasi Dasar", tagline: "Setting, Label, Role", desc: "Atur logo perusahaan, ganti istilah sesuai kebiasaan internal, dan tentukan siapa boleh akses apa.", icon: Cog },
                { title: "Tambah Modul", tagline: "Skalabilitas", desc: "Mulai dari ERP dasar, lalu tambah HRM, Guard, atau Service seiring pertumbuhan bisnis.", icon: Puzzle },
                { title: "Integrasi Sistem", tagline: "Hardware & Legacy", desc: "Sambungkan dengan mesin absensi, IoT, atau sinkronkan data dari sistem lama Anda.", icon: Plug },
                { title: "Kustom Penuh", tagline: "Fitur Eksklusif", desc: "Tim kami bangun dari nol sesuai SOP unik Anda. Tidak ada di software manapun.", icon: Wrench },
            ]
        },
        solutionsSection: {
            title: "Tiga Pilar Solusi",
            subtitle: "Tidak peduli industri Anda — kami punya paket yang tepat.",
            detailCta: "Lihat detail lengkap →",
            ctaAfter: "Tim kami akan memberikan demo personal — isi form dan kami hubungi dalam 1x24 jam."
        },
        matrix: {
            title: "Matriks Kapabilitas",
            subtitle: "Lihat sendiri seberapa dalam kami bisa melayani kebutuhan Anda.",
            labelIndustry: "Industri",
            labelFoundation: "Yayasan",
            labelMSME: "UMKM",
            colIndustry: "Industri",
            colFoundation: "Yayasan",
            colMSME: "UMKM",
        },
        pricing: {
            title: "Investasi yang Masuk Akal",
            subtitle: "Estimasi harga — transparan, tanpa biaya kejutan. Hubungi kami untuk proposal detail.",
            cta: "Minta Proposal Gratis",
            bottomText: "Punya kebutuhan spesifik di luar daftar ini?",
            bottomCta: "Kami bisa custom →",
            contactLabel: "Hubungi kami untuk penawaran",
        },
        ctaSection: {
            headline: "Sistem Anda Sekarang Cukup? Atau Malah Bikin Lembur?",
            subheadline: "Tim kami di Bekasi siap bantu Anda go-live dalam 1-4 minggu — tanpa drama implementasi panjang.",
            primaryCta: "Ngobrol Dulu — Gratis",
            secondaryCta: "Lihat Demo 5 Menit",
            urgency: "Kami tidak janji muluk. Tapi 30% klien kami laporkan efisiensi signifikan di bulan pertama.",
        },
        about: {
            title: "Di Balik Axon",
            p1: "Kami adalah tim engineer, konsultan bisnis, dan praktisi TI yang beroperasi dari Bekasi. Bukan startup Silicon Valley — kami paham seluk-beluk bisnis Indonesia: dari UMKM manufaktur sampai korporasi menengah.",
            p2: "Nama Axon terinspirasi dari sel saraf — penghubung cepat dan presisi. Kami percaya software yang baik bukan sekadar mencatat transaksi, tapi membantu Anda tidur lebih nyenyak karena semua data aman dan terpantau.",
            mission: "Misi Kami",
            missionText: "Menghadirkan sistem manajemen bisnis yang transparan, bisa dikustomisasi, dan tidak bikin pusing — untuk semua skala usaha.",
            diffTitle: "Kenapa Kami?",
            diffs: [
                { t: "1 Platform, 4 Modul", d: "ERP, HRM, Guard, Service — tidak perlu integrasi pihak ketiga." },
                { t: "Kustom Tanpa Kunci", d: "Bisa dikustomisasi tanpa kehilangan kemampuan auto-update." },
                { t: "Harga Jelas", d: "Langganan bulanan. Tanpa biaya tersembunyi. Cancel kapan saja." },
                { t: "Support Lokal", d: "Kantor di Bekasi. Paham regulasi & budaya bisnis Indonesia." },
            ],
            journey: "Perjalanan",
            milestones: [
                { y: "2020", t: "Axon Ecosystem didirikan — berawal dari project ERP UMKM manufaktur di Bekasi." },
                { y: "2021", t: "Axon ERP & HRM launched. 100+ pengguna dari referral dan demo langsung." },
                { y: "2022", t: "Axon Guard & Service dikembangkan untuk sektor yayasan dan keamanan." },
                { y: "2023", t: "Platform v2.0 — arsitektur modular penuh, bisa kustom tanpa ganggu update." },
                { y: "2024", t: "Dipercaya sejak 2020 oleh ratusan bisnis, dari UMKM hingga korporasi menengah." },
                { y: "2025", t: "Menjadi pilihan utama bisnis menengah Indonesia. Tim 30+ engineer & konsultan." },
                { y: "2026", t: "Pengembangan modul IoT, Gate System, dan CCTV terintegrasi — one-stop solution." },
            ]
        },
        faq: {
            title: "Masih Ragu?",
            subtitle: "Kami jawab yang paling sering ditanyakan.",
            items: [
                { q: "Kalau saya custom, nanti susah update?", a: "Tidak. Arsitektur kami modular — kode custom terpisah dari core. Update berjalan tanpa ganggu fitur eksklusif Anda." },
                { q: "Fitur yang saya butuh belum ada. Gimana?", a: "Tim development kami bangun dari nol sesuai spek Anda, lalu fitur itu jadi milik eksklusif bisnis Anda." },
                { q: "Mahal nggak kustomisasinya?", a: "Kami assess dulu — banyak kasus ternyata cukup konfigurasi gratis. Kalau memang perlu dev khusus, proposal transparan tanpa biaya kejutan." },
                { q: "Berapa lama sampai bisa dipakai?", a: "Axon Ready: 1-4 minggu. Axon Custom: tergantung kompleksitas, rata-rata 4-12 minggu." },
                { q: "Data saya aman?", a: "Enkripsi industri, backup rutin, dan opsi server mandiri — Anda pegang kendali penuh. Kami juga mematuhi standar keamanan data nasional." },
                { q: "Apakah sesuai UU PDP?", a: "Ya. Sistem kami mengikuti prinsip Undang-Undang Perlindungan Data Pribadi: data klien diproses dengan transparan dan disimpan dalam infrastruktur yang bisa Anda kontrol penuh — cloud atau on-premise." },
            ]
        },
    },
    EN: {
        dualStrength: {
            sectionTitle: "Two Paths. One Result: Your Business Runs.",
            subtitle: "Choose speed or flexibility — Axon delivers both. No compromises, no hidden costs.",
            readyTitle: "Axon Ready",
            readyBadge: "Standard",
            readyDesc: "Ready-to-use modules. Go live in weeks. Perfect for businesses that want to start operating immediately without lengthy implementations.",
            readyFeatures: ["1-4 weeks implementation", "Cloud-hosted — no server costs", "Free auto-updates & maintenance", "Domain & SSL included"],
            readyCta: "This fits me — tell me more",
            customTitle: "Axon Custom",
            customBadge: "Tailored",
            customDesc: "Unique workflows? Legacy systems? Our team builds exactly to your specifications. Full flexibility without sacrificing stability.",
            customFeatures: ["100% built to your SOP", "Integrates with existing systems", "Self-managed server option", "Exclusivity — competitors don't have this"],
            customCta: "I need custom — explain how",
        },
        painPoints: {
            title: "Problems We Solve",
            subtitle: "Identify the pain first, then see how Axon addresses it.",
            items: [
                { pain: "Data scattered across Excel, WhatsApp, and manual notes", fix: "All data centralized in one real-time dashboard.", icon: BarChart3 },
                { pain: "Financial reports take 2 weeks to close", fix: "P&L and Balance Sheet ready in seconds.", icon: TrendingUp },
                { pain: "Inventory out of sync with sales", fix: "Automatic integration: every sale immediately deducts stock.", icon: Package },
                { pain: "No real-time visibility across branches", fix: "One screen shows all branches — anytime, anywhere.", icon: Building2 },
            ]
        },
        spectrum: {
            title: "Flexible at Every Level",
            subtitle: "From simple config to full custom — choose what fits today, upgrade anytime.",
            levels: [
                { title: "Basic Configuration", tagline: "Settings, Labels, Roles", desc: "Set company logo, rename terms to match internal language, define access permissions.", icon: Cog },
                { title: "Add Modules", tagline: "Scalability", desc: "Start with core ERP, add HRM, Guard, or Service as your business grows.", icon: Puzzle },
                { title: "System Integration", tagline: "Hardware & Legacy", desc: "Connect with attendance machines, IoT, or sync data from your legacy systems.", icon: Plug },
                { title: "Full Custom", tagline: "Exclusive Features", desc: "Our team builds from scratch to your unique SOP. Unavailable in any other software.", icon: Wrench },
            ]
        },
        solutionsSection: {
            title: "Three Solution Pillars",
            subtitle: "Whatever your industry — we have the right package.",
            detailCta: "See full details →",
            ctaAfter: "Our team will give you a personal demo — fill the form and we'll contact you within 24 hours."
        },
        matrix: {
            title: "Capability Matrix",
            subtitle: "See for yourself how deeply we can serve your needs.",
            labelIndustry: "Industry",
            labelFoundation: "Foundation",
            labelMSME: "MSME",
            colIndustry: "Industry",
            colFoundation: "Foundation",
            colMSME: "MSMEs",
        },
        pricing: {
            title: "Sensible Investment",
            subtitle: "Estimated pricing — transparent, no surprise fees. Contact us for a detailed proposal.",
            cta: "Request Free Proposal",
            bottomText: "Need something outside this list?",
            bottomCta: "We can custom-build →",
            contactLabel: "Contact us for a quote",
        },
        ctaSection: {
            headline: "Is Your Current System Enough? Or Causing Overtime?",
            subheadline: "Our team in Bekasi can get you live in 1-4 weeks — without lengthy implementation drama.",
            primaryCta: "Let's Talk — Free",
            secondaryCta: "Watch 5-Minute Demo",
            urgency: "We don't overpromise. But 30% of our clients report significant efficiency gains in month one.",
        },
        about: {
            title: "Behind Axon",
            p1: "We're a team of engineers, business consultants, and IT practitioners based in Bekasi. Not a Silicon Valley startup — we understand Indonesian business inside out: from manufacturing SMEs to mid-sized enterprises.",
            p2: "The name Axon is inspired by nerve cells — fast, precise connectors. We believe good software shouldn't just record transactions — it should let you sleep better knowing all your data is safe and monitored.",
            mission: "Our Mission",
            missionText: "Delivering business management systems that are transparent, customizable, and headache-free — for all business scales.",
            diffTitle: "Why Us?",
            diffs: [
                { t: "1 Platform, 4 Modules", d: "ERP, HRM, Guard, Service — no third-party integrations needed." },
                { t: "Custom Without Lock-in", d: "Customizable without losing auto-update capability." },
                { t: "Clear Pricing", d: "Monthly subscription. No hidden fees. Cancel anytime." },
                { t: "Local Support", d: "Bekasi-based. We understand Indonesian business culture & regulations." },
            ],
            journey: "Journey",
            milestones: [
                { y: "2020", t: "Axon Ecosystem founded — started from a manufacturing SME ERP project in Bekasi." },
                { y: "2021", t: "Axon ERP & HRM launched. 100+ users through referrals and direct demos." },
                { y: "2022", t: "Axon Guard & Service developed for foundations and security sectors." },
                { y: "2023", t: "Platform v2.0 — fully modular architecture, custom without breaking updates." },
                { y: "2024", t: "Trusted since 2020 by hundreds of businesses, from SMEs to mid-sized enterprises." },
                { y: "2025", t: "Top choice for medium businesses in Indonesia. 30+ engineers & consultants team." },
                { y: "2026", t: "Developing IoT, Gate System, and CCTV integrated modules — one-stop solution." },
            ]
        },
        faq: {
            title: "Still Hesitant?",
            subtitle: "Here are the most common questions we answer.",
            items: [
                { q: "Will customization break updates?", a: "No. Our modular architecture keeps custom code separate from the core. Updates run without affecting your exclusive features." },
                { q: "You don't have the feature I need. Now what?", a: "Our dev team builds it from scratch to your specs — then it becomes your exclusive business advantage." },
                { q: "Is customization expensive?", a: "We assess first — many cases just need free configuration. If custom dev is needed, transparent proposal with zero surprise fees." },
                { q: "How fast until I can use it?", a: "Axon Ready: 1-4 weeks. Axon Custom: depends on complexity, typically 4-12 weeks." },
                { q: "Is my data safe?", a: "Industry-standard encryption, routine backups, and self-managed server option — you hold full control. We also comply with national data protection standards." },
                { q: "Do you comply with Indonesia's PDP Law?", a: "Yes. Our system follows Personal Data Protection principles: client data is processed transparently and stored in infrastructure you can fully control — cloud or on-premise." },
            ]
        },
    },
}

/* ─── product data (no images) ─── */
const productData = [
    {
        key: "manufacturing",
        icon: Factory,
        color: "bg-blue-500/10 text-blue-600",
        border: "border-blue-500/20",
        features: [
            { icon: ShoppingCart, label: "Sales Order", desc: "Real-time tracking" },
            { icon: Truck, label: "Logistic", desc: "Shipment & delivery" },
            { icon: Package, label: "Inventory", desc: "Multi-warehouse" },
            { icon: Cog, label: "Production", desc: "Work order & routing" },
            { icon: Calculator, label: "MRP", desc: "Auto BOM calculation" },
            { icon: TrendingUp, label: "Accounting", desc: "Consolidated reports" },
        ],
        translations: {
            ID: {
                name: "Manufaktur, Logistik & Produksi",
                description: "Dari Sales Order, pengiriman, produksi, sampai laporan Laba Rugi — satu sistem, nol input ganda.",
                ready: "MRP & BOM standar, siap pakai",
                custom: "Integrasi IoT mesin & custom payroll produksi",
                cta: "Saya di Manufaktur — tunjukkan solusinya",
            },
            EN: {
                name: "Manufacturing, Logistic & Production",
                description: "From Sales Order, delivery, production, to P&L — one system, zero double entry.",
                ready: "Standard MRP & BOM, ready-to-use",
                custom: "Machine IoT & production payroll integration",
                cta: "I'm in Manufacturing — show me the solution",
            }
        }
    },
    {
        key: "foundation",
        icon: GraduationCap,
        color: "bg-emerald-500/10 text-emerald-600",
        border: "border-emerald-500/20",
        features: [
            { icon: UserCheck, label: "Axon HRM", desc: "Payroll & digital slips" },
            { icon: Shield, label: "Axon Guard", desc: "GPS patrol real-time" },
            { icon: Building2, label: "Asset", desc: "Maintenance terjadwal" },
            { icon: Users, label: "Access", desc: "Kontrol tamu & akses" },
        ],
        translations: {
            ID: {
                name: "Yayasan & Pendidikan",
                description: "Transparansi keuangan, keamanan 24/7, dan manajemen aset dalam satu genggaman.",
                ready: "Payroll guru & patroli security standar",
                custom: "Smart gate & pelacakan beasiswa kustom",
                cta: "Saya kelola Yayasan — tunjukkan solusinya",
            },
            EN: {
                name: "Foundation & Education",
                description: "Financial transparency, 24/7 security, and asset management at your fingertips.",
                ready: "Standard teacher payroll & security patrol",
                custom: "Smart gate & custom scholarship tracking",
                cta: "I run a Foundation — show me the solution",
            }
        }
    },
    {
        key: "umkm",
        icon: Store,
        color: "bg-amber-500/10 text-amber-600",
        border: "border-amber-500/20",
        features: [
            { icon: ShoppingCart, label: "Sales Web", desc: "Mobile-friendly" },
            { icon: CreditCard, label: "Finance", desc: "Arus kas real-time" },
            { icon: Users, label: "Payroll", desc: "Rekap simpel" },
            { icon: BarChart3, label: "Report", desc: "Performa cabang" },
        ],
        translations: {
            ID: {
                name: "UMKM Modern",
                description: "Dari warung sampai 10 cabang — sistem yang tumbuh bersama bisnis Anda.",
                ready: "Website & finance siap pakai",
                custom: "Sinkron marketplace & laporan multi-cabang",
                cta: "Saya UMKM — tunjukkan cara naik kelas",
            },
            EN: {
                name: "Modern MSMEs",
                description: "From a single shop to 10 branches — a system that grows with you.",
                ready: "Ready website & finance",
                custom: "Marketplace sync & multi-branch reporting",
                cta: "I'm an MSME — show me how to level up",
            }
        }
    }
]

const moduleRows = [
    { kId: "ERP / Akuntansi & MRP", kEn: "ERP / Accounting & MRP", i: "ENTERPRISE", y: "STANDARD", u: "SMALL BIZ" },
    { kId: "HRM & Payroll Automation", kEn: "HRM & Payroll Automation", i: "SHIFT-READY", y: "ADVANCED", u: "BASIC" },
    { kId: "Security & Access Guard", kEn: "Security & Access Guard", i: "HIGH-TRUST", y: "CLUSTER-MODE", u: "STANDALONE" },
    { kId: "Asset & Service Monitoring", kEn: "Asset & Service Monitoring", i: "FLEET & MACHINE", y: "BUILDING", u: "EQUIPMENT" },
    { kId: "Sales & Online Presence", kEn: "Sales & Online Presence", i: "DISTRIBUTION", y: "CUSTOM", u: "WEB + SOCIAL" },
]

const pricingData = [
    {
        title: "Axon Core / ERP",
        descId: "Finance, Inventory, Procurement — fondasi digital pertama Anda.",
        descEn: "Finance, Inventory, Procurement — your first digital foundation.",
        features: ["Finance & Accounting", "Inventory Management", "Procurement System", "Basic CRM"],
        icon: Calculator
    },
    {
        title: "Axon HRM & Payroll",
        descId: "Database karyawan, absensi, sampai slip gaji — all in one.",
        descEn: "Employee database, attendance, to payslips — all in one.",
        features: ["Employee Database", "Attendance Tracking", "Payroll Automation", "Performance Review"],
        icon: Users
    },
    {
        title: "Axon Enterprise",
        descId: "Multi-company, API custom, business intelligence — untuk yang serius scale-up.",
        descEn: "Multi-company, custom API, business intelligence — for serious scale-ups.",
        features: ["Multi-Company / Branch", "Custom API Integration", "Advanced Business Intel", "Dedicated Support"],
        icon: TrendingUp
    },
]

export function LandingPage() {
    const { lang } = useLanguage()
    const t = translations[lang]
    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false)
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
    const [isManufacturingModalOpen, setIsManufacturingModalOpen] = useState(false)
    const [isFoundationModalOpen, setIsFoundationModalOpen] = useState(false)
    const [isMSMEModalOpen, setIsMSMEModalOpen] = useState(false)
    const [expandedLevel, setExpandedLevel] = useState<number | null>(null)

    return (
        <div className="bg-background min-h-screen text-foreground">
            <Navbar />
            <ScrollNav />

            {/* ── Hero ── */}
            <section id="beranda">
                <Hero />
            </section>

            {/* ── Client Showcase ── */}
            <ClientShowcase />

            {/* ── Pain Points ── */}
            <section className="relative py-16 md:py-20 border-t border-border overflow-hidden section-bg-pain">
                <SectionPattern variant="hexagon" fadeDir="right" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <motion.h2
                            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight"
                        >
                            {t.painPoints.title}
                        </motion.h2>
                        <p className="text-muted-foreground font-medium">{t.painPoints.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {t.painPoints.items.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                className="group p-6 rounded-2xl border border-border bg-card hover:border-destructive/20 transition-all duration-300"
                            >
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                                        <item.icon size={18} className="text-destructive/60" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-destructive/80 mb-2 line-through decoration-destructive/30">{item.pain}</p>
                                        <div className="flex items-start gap-2">
                                            <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item.fix}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Dual Strength ── */}
            <section className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-dual">
                <SectionPattern variant="diamond" fadeDir="right" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <motion.h2
                            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight text-balance"
                        >
                            {t.dualStrength.sectionTitle}
                        </motion.h2>
                        <p className="text-muted-foreground font-medium">{t.dualStrength.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Ready */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            onClick={() => setIsReadyModalOpen(true)}
                            className="group cursor-pointer rounded-2xl border border-border bg-card p-8 md:p-10 hover:border-primary/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/3 rounded-bl-full" />
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <Clock className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl md:text-3xl font-bold text-foreground">{t.dualStrength.readyTitle}</h3>
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                    {t.dualStrength.readyBadge}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">{t.dualStrength.readyDesc}</p>
                            <ul className="space-y-3 mb-8">
                                {t.dualStrength.readyFeatures.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-semibold text-foreground/80">
                                        <Check size={14} className="text-emerald-500 shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <span className="inline-flex items-center gap-1 text-primary text-sm font-bold group-hover:gap-2 transition-all">
                                {t.dualStrength.readyCta} <ArrowRight size={14} />
                            </span>
                        </motion.div>

                        {/* Custom */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            onClick={() => setIsCustomModalOpen(true)}
                            className="group cursor-pointer rounded-2xl border border-border bg-card p-8 md:p-10 hover:border-primary/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/3 rounded-bl-full" />
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <Wrench className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl md:text-3xl font-bold text-foreground">{t.dualStrength.customTitle}</h3>
                                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                    {t.dualStrength.customBadge}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">{t.dualStrength.customDesc}</p>
                            <ul className="space-y-3 mb-8">
                                {t.dualStrength.customFeatures.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-semibold text-foreground/80">
                                        <Check size={14} className="text-primary shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <span className="inline-flex items-center gap-1 text-primary text-sm font-bold group-hover:gap-2 transition-all">
                                {t.dualStrength.customCta} <ArrowRight size={14} />
                            </span>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Solutions ── */}
            <section id="solutions" className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-solutions">
                <SectionPattern variant="wave" fadeDir="center" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
                            {t.solutionsSection.title}
                        </motion.h2>
                        <p className="text-muted-foreground font-medium">{t.solutionsSection.subtitle}</p>
                    </div>

                    <div className="space-y-12 max-w-5xl mx-auto">
                        {productData.map((product, idx) => {
                            const p = product.translations[lang]
                            return (
                                <motion.div
                                    key={product.key}
                                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                                    className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="grid lg:grid-cols-5">
                                        {/* Left: Info */}
                                        <div className="lg:col-span-3 p-8 md:p-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-10 h-10 rounded-xl ${product.color} flex items-center justify-center`}>
                                                    <product.icon size={20} />
                                                </div>
                                                <h3 className="text-xl md:text-3xl font-bold text-foreground">{p.name}</h3>
                                            </div>
                                            <p className="text-muted-foreground font-medium mb-6 leading-relaxed">{p.description}</p>

                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                {product.features.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                                        <f.icon size={14} className="text-primary/60" />
                                                        <div>
                                                            <span className="text-xs font-bold text-foreground">{f.label}</span>
                                                            <span className="text-[10px] text-muted-foreground ml-1.5">{f.desc}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                                <div className="flex-1 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Axon Ready</span>
                                                    <p className="text-xs font-semibold text-foreground/70 mt-1">{p.ready}</p>
                                                </div>
                                                <div className="flex-1 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Built-to-Fit</span>
                                                    <p className="text-xs font-semibold text-foreground/70 mt-1">{p.custom}</p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (idx === 0) setIsManufacturingModalOpen(true)
                                                    if (idx === 1) setIsFoundationModalOpen(true)
                                                    if (idx === 2) setIsMSMEModalOpen(true)
                                                }}
                                                className="rounded-xl h-11 px-6 text-sm font-bold border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all group"
                                            >
                                                {t.solutionsSection.detailCta}
                                            </Button>
                                        </div>

                                        {/* Right: Process Flow Diagram — Presentation Style */}
                                        <div className="lg:col-span-2 bg-muted/10 border-t lg:border-t-0 lg:border-l border-border p-6 md:p-8 flex flex-col justify-center">
                                            {/* Flow container */}
                                            <div className="w-full space-y-0">
                                                {product.features.map((f, fi) => (
                                                    <div key={fi} className="flex items-center gap-0">
                                                        {/* Node */}
                                                        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-sm flex-1 hover:border-primary/30 hover:shadow-md transition-all duration-300 group cursor-default">
                                                            <div className={`w-9 h-9 rounded-lg ${product.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                                                <f.icon size={16} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-foreground truncate">{f.label}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">{f.desc}</div>
                                                            </div>
                                                            {/* Step number badge */}
                                                            <div className="ml-auto w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                                <span className="text-[10px] font-black text-muted-foreground">{fi + 1}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Connector lines between nodes */}
                                                {product.features.map((_, fi) => {
                                                    if (fi === product.features.length - 1) return null
                                                    return (
                                                        <div key={`conn-${fi}`} className="flex items-center h-5 ml-16.5">
                                                            <div className="w-px h-full bg-linear-to-b from-primary/30 to-primary/10" />
                                                            <div className="w-2 h-2 rounded-full bg-primary/20 -ml-1.25" />
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Result badge */}
                                            <div className="mt-6 flex items-center justify-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                        {lang === 'ID' ? 'Output: Laporan Real-time & Dashboard Terpadu' : 'Output: Real-time Reports & Unified Dashboard'}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-muted-foreground/50 text-center mt-4 font-medium leading-relaxed">
                                                {t.solutionsSection.ctaAfter}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ── Spectrum ── */}
            <section className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-spectrum">
                <SectionPattern variant="rings" fadeDir="both" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
                            {t.spectrum.title}
                        </motion.h2>
                        <p className="text-muted-foreground font-medium">{t.spectrum.subtitle}</p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-3">
                        {t.spectrum.levels.map((level: any, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                onClick={() => setExpandedLevel(expandedLevel === i ? null : i)}
                                className={`rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                                    expandedLevel === i ? "border-primary/40 bg-primary/2" : "border-border bg-card hover:border-primary/20"
                                }`}
                            >
                                <div className="flex items-center gap-4 p-5">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        expandedLevel === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    }`}>
                                        <level.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className={`text-sm md:text-base font-bold transition-colors ${
                                                expandedLevel === i ? "text-primary" : "text-foreground"
                                            }`}>{level.title}</span>
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">{level.tagline}</span>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${expandedLevel === i ? "rotate-180" : ""}`} />
                                </div>
                                <motion.div initial={false} animate={{ height: expandedLevel === i ? "auto" : 0, opacity: expandedLevel === i ? 1 : 0 }} className="overflow-hidden">
                                    <p className="px-5 pb-5 text-sm text-muted-foreground font-medium leading-relaxed border-t border-border pt-4 mx-5">{level.description}</p>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Matrix ── */}
            <section id="products" className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-matrix">
                <SectionPattern variant="grid" fadeDir="right" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-16">
                        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">{t.matrix.title}</motion.h2>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.2em]">{t.matrix.subtitle}</p>
                    </div>

                    <div className="block md:hidden space-y-4">
                        {moduleRows.map((row, idx) => (
                            <div key={idx} className="p-5 rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <span className="text-sm font-bold text-foreground">{lang === 'ID' ? row.kId : row.kEn}</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { l: t.matrix.labelIndustry, v: row.i },
                                        { l: t.matrix.labelFoundation, v: row.y },
                                        { l: t.matrix.labelMSME, v: row.u },
                                    ].map((r, ri) => (
                                        <div key={ri} className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{r.l}</span>
                                            <span className="px-3 py-1.5 rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{r.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <MatrixTableWrapper>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-200">
                                <thead>
                                    <tr className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                        <th className="px-8 py-6 border-b border-border font-semibold">{lang === 'ID' ? 'Modul & Fitur' : 'Modules & Features'}</th>
                                        <th className="px-8 py-6 border-b border-border text-center font-semibold">{t.matrix.colIndustry}</th>
                                        <th className="px-8 py-6 border-b border-border text-center font-semibold">{t.matrix.colFoundation}</th>
                                        <th className="px-8 py-6 border-b border-border text-center font-semibold">{t.matrix.colMSME}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moduleRows.map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-8 py-5 border-b border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                                                    <span className="text-sm font-bold text-foreground">{lang === 'ID' ? row.kId : row.kEn}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 border-b border-border text-center">
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-primary/10 text-[10px] font-bold text-primary tracking-wider">{row.i}</span>
                                            </td>
                                            <td className="px-8 py-5 border-b border-border text-center">
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-primary/10 text-[10px] font-bold text-primary tracking-wider">{row.y}</span>
                                            </td>
                                            <td className="px-8 py-5 border-b border-border text-center">
                                                <span className="inline-flex px-3 py-1.5 rounded-lg bg-primary/10 text-[10px] font-bold text-primary tracking-wider">{row.u}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </MatrixTableWrapper>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-pricing">
                <SectionPattern variant="crosshatch" fadeDir="right" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="text-center mb-16 max-w-2xl mx-auto">
                        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">{t.pricing.title}</motion.h2>
                        <p className="text-muted-foreground font-medium">{t.pricing.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {pricingData.map((plan, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -4 }}
                                className="rounded-2xl border border-border bg-card p-8 flex flex-col hover:border-primary/20 hover:shadow-xl transition-all duration-300"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                                    <plan.icon size={18} className="text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">{plan.title}</h3>
                                <p className="text-primary font-bold text-sm mb-3 tracking-wide">{t.pricing.contactLabel}</p>
                                <p className="text-sm text-muted-foreground font-medium mb-6">{lang === 'ID' ? plan.descId : plan.descEn}</p>
                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                            <Check size={14} className="text-primary shrink-0" /> {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20ingin%20minta%20proposal" target="_blank" rel="noopener noreferrer">
                                    <Button className="w-full rounded-xl h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25">
                                        {t.pricing.cta}
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-sm text-muted-foreground font-medium mb-2">{t.pricing.bottomText}</p>
                        <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20butuh%20custom%20solution" target="_blank" rel="noopener noreferrer">
                            <Button variant="link" className="text-primary font-bold text-sm">{t.pricing.bottomCta}</Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-cta">
                <SectionPattern variant="radial" fadeDir="center" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.h2
                            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-xl md:text-3xl font-bold text-foreground mb-6 tracking-tight text-balance"
                        >
                            {t.ctaSection.headline}
                        </motion.h2>
                        <p className="text-muted-foreground text-base md:text-lg font-medium mb-2 leading-relaxed">{t.ctaSection.subheadline}</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-8">{t.ctaSection.urgency}</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20ingin%20ngobrol%20dulu" target="_blank" rel="noopener noreferrer">
                                <Button size="lg" className="rounded-xl h-14 px-10 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
                                    {t.ctaSection.primaryCta} <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </Link>
                            <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20ingin%20melihat%20demo" target="_blank" rel="noopener noreferrer">
                                <Button size="lg" variant="outline" className="rounded-xl h-14 px-10 text-sm font-semibold border-2 hover:bg-muted/50 transition-all">
                                    {t.ctaSection.secondaryCta}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── About ── */}
            <section id="about" className="relative py-16 md:py-24 border-t border-border overflow-hidden bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-200">
                <SectionPattern variant="grid" fadeDir="right" dark />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <h2 className="text-xl md:text-3xl font-bold mb-6 tracking-tight">{t.about.title}</h2>
                        <div className="space-y-6 text-base md:text-lg font-medium leading-relaxed text-slate-300/70">
                            <p>{t.about.p1}</p>
                            <p>{t.about.p2}</p>
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto mb-20">
                        <div className="rounded-2xl border border-slate-700/30 bg-slate-800/40 p-10 text-center">
                            <h3 className="text-slate-400/60 font-semibold uppercase tracking-wider text-xs mb-6">{t.about.mission}</h3>
                            <p className="text-xl md:text-3xl font-bold text-slate-100 leading-snug tracking-tight">
                                &ldquo;{t.about.missionText}&rdquo;
                            </p>
                        </div>
                    </div>

                    <div className="mb-20">
                        <h3 className="text-2xl font-bold text-slate-100 mb-10 text-center tracking-tight">{t.about.diffTitle}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                            {t.about.diffs.map((item, i) => (
                                <div key={i} className="p-6 rounded-xl border border-slate-700/30 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-primary mb-4" />
                                    <h4 className="font-bold text-slate-100 mb-2">{item.t}</h4>
                                    <p className="text-sm text-slate-400/60 leading-relaxed">{item.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <h3 className="text-2xl font-bold text-slate-100 mb-10 text-center tracking-tight">{t.about.journey}</h3>
                        <div className="relative border-l border-slate-700/40 ml-4 space-y-8 pl-10 py-2">
                            {t.about.milestones.map((m, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-11 top-1 w-3 h-3 rounded-full bg-primary border-2 border-primary/40" />
                                    <span className="text-slate-400/60 font-bold text-sm tracking-wider mb-1 block">{m.y}</span>
                                    <p className="text-slate-300/80 font-medium">{m.t}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section id="faq" className="relative py-16 md:py-24 border-t border-border overflow-hidden section-bg-faq">
                <SectionPattern variant="hexagon" fadeDir="center" />
                <div className="mx-auto max-w-7xl px-6 relative z-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">{t.faq.title}</h2>
                            <p className="text-muted-foreground font-medium">{t.faq.subtitle}</p>
                        </div>
                        <div className="space-y-4">
                            {t.faq.items.map((faq, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                    className="p-6 rounded-xl border border-border bg-card"
                                >
                                    <h4 className="font-bold text-foreground mb-2">{faq.q}</h4>
                                    <p className="text-muted-foreground font-medium leading-relaxed text-sm">{faq.a}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />

            <ReadyDetailModal isOpen={isReadyModalOpen} onClose={() => setIsReadyModalOpen(false)} />
            <CustomDetailModal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} />
            <ManufacturingDetailModal isOpen={isManufacturingModalOpen} onClose={() => setIsManufacturingModalOpen(false)} />
            <FoundationDetailModal isOpen={isFoundationModalOpen} onClose={() => setIsFoundationModalOpen(false)} />
            <MSMEDetailModal isOpen={isMSMEModalOpen} onClose={() => setIsMSMEModalOpen(false)} />
        </div>
    )
}
