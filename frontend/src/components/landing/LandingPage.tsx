"use client"

import { motion } from "framer-motion"
import { Navbar } from "./Navbar"
import { ScrollNav } from "./ScrollNav"
import { Hero } from "./Hero"
import { ProductCard } from "./ProductCard"
import { MatrixTableWrapper } from "./MatrixTableWrapper"
import { Footer } from "./Footer"
import { ReadyDetailModal } from "./ReadyDetailModal"
import { CustomDetailModal } from "./CustomDetailModal"
import { ManufacturingDetailModal } from "./ManufacturingDetailModal"
import { FoundationDetailModal } from "./FoundationDetailModal"
import { MSMEDetailModal } from "./MSMEDetailModal"
import { useState } from "react"
import {
    Briefcase,
    ShieldCheck,
    Users,
    HandHelping,
    Layers,
    BarChart4,
    BarChart3,
    Zap,
    ArrowRight,
    Check
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"

const translations = {
    ID: {
        productsSection: {
            title: "Modul Utama Kami",
            subtitle: "Solusi terintegrasi untuk setiap aspek perusahaan Anda."
        },
        dualStrength: {
            title: "Dua Kekuatan dalam Satu Ekosistem",
            subtitle: "Axon Ecosystem hadir dengan modul siap pakai yang mengadopsi best-practice industri, namun tetap fleksibel untuk berkembang sesuai keunikan bisnis Anda.",
            readyTitle: "Axon Ready (Standar)",
            readyDesc: "Ideal untuk bisnis yang ingin cepat go-live dengan proses standar industri.",
            customTitle: "Axon Custom (Sesuai Kebutuhan)",
            customDesc: "Ideal untuk bisnis dengan proses unik atau legacy system yang sudah ada."
        },
        spectrum: {
            title: "Spektrum Kustomisasi Axon",
            subtitle: "Fleksibilitas penuh untuk menyesuaikan sistem dengan pertumbuhan bisnis Anda.",
            levels: [
                {
                    title: "Konfigurasi (Setting, Label, Role)",
                    tagline: "Adaptasi Cepat",
                    description: "Penyesuaian tingkat dasar yang meliputi pengaturan identitas perusahaan (logo & nama), pelabelan istilah teknis sesuai kebiasaan internal, serta pengaturan hak akses (User Role) yang ketat untuk keamanan data."
                },
                {
                    title: "Tambah Modul (Fitur Tambahan)",
                    tagline: "Skalabilitas Fitur",
                    description: "Menambahkan modul siap pakai yang belum ada di paket standar, seperti manajemen inventaris tingkat lanjut, sistem penggajian (payroll), atau modul akuntansi yang lebih kompleks seiring berkembangnya skala operasional Anda."
                },
                {
                    title: "Integrasi (Hardware & Legacy)",
                    tagline: "Sinergi Sistem",
                    description: "Menghubungkan ERP Axon dengan infrastruktur yang sudah Anda miliki, seperti mesin absensi, perangkat keras IoT (meteran listrik/air digital), atau sinkronisasi data dengan sistem lama (Legacy System) agar tidak ada data yang terputus."
                },
                {
                    title: "Kustom (Fitur Baru/Unik)",
                    tagline: "Inovasi Tanpa Batas",
                    description: "Pengembangan fitur yang benar-benar baru dan unik sesuai dengan \"rahasia dapur\" bisnis Anda. Kami membangun alur kerja khusus yang tidak ditemukan di software standar manapun untuk memastikan sistem mengikuti SOP perusahaan Anda secara presisi."
                }
            ]
        },
        onePlatformSection: {
            title: "Satu Platform.",
            subtitle: "Kemungkinan ",
            highlight: "Tak Terbatas.",
            feature1Title: "Arsitektur Terpadu",
            feature1Desc: "Semua modul Axon berbagi lapisan data yang sama, menghilangkan silo di seluruh organisasi Anda.",
            feature2Title: "Performa Real-time",
            feature2Desc: "Mesin berperforma tinggi yang dibangun untuk skala besar, memastikan waktu respons sub-detik."
        },
        footer: "Seluruh hak cipta dilindungi."
    },
    EN: {
        productsSection: {
            title: "Our Core Modules",
            subtitle: "Integrated solutions for every aspect of your enterprise."
        },
        dualStrength: {
            title: "Dual Strength in One Ecosystem",
            subtitle: "Axon Ecosystem comes with ready-to-use modules adopting industry best practices, yet remains flexible to evolve with your unique business needs.",
            readyTitle: "Axon Ready (Standard)",
            readyDesc: "Ideal for businesses wanting to go-live fast with industry standards.",
            customTitle: "Axon Custom (Tailored)",
            customDesc: "Ideal for businesses with unique processes or legacy systems."
        },
        spectrum: {
            title: "Axon Customization Spectrum",
            subtitle: "Full flexibility to tailor the system to your business growth.",
            levels: [
                {
                    title: "Configuration (Settings, Labels, Roles)",
                    tagline: "Rapid Adaptation",
                    description: "Base-level adjustments including company identity (logo & name), technical labeling according to internal habits, and strict access rights (User Roles) for data security."
                },
                {
                    title: "Module Expansion (Additional Features)",
                    tagline: "Feature Scalability",
                    description: "Adding ready-to-use modules not yet in the standard package, such as advanced inventory management, payroll systems, or more complex accounting modules as your operational scale grows."
                },
                {
                    title: "Integration (Hardware & Legacy)",
                    tagline: "System Synergy",
                    description: "Connecting Axon ERP with your existing infrastructure, such as attendance machines, IoT hardware (digital power/water meters), or data synchronization with legacy systems to ensure no data loss."
                },
                {
                    title: "Bespoke (New/Unique Features)",
                    tagline: "Limitless Innovation",
                    description: "Development of entirely new and unique features according to your business's 'secret sauce'. We build specific workflows not found in any standard software to ensure the system follows your company's SOP with precision."
                }
            ]
        },
        onePlatformSection: {
            title: "One Platform.",
            subtitle: "Infinite ",
            highlight: "Possibilities.",
            feature1Title: "Unified Architecture",
            feature1Desc: "All Axon modules share a common data layer, eliminating silos across your organization.",
            feature2Title: "Real-time Performance",
            feature2Desc: "High-performance engine built for scale, ensuring sub-second response times for global teams."
        },
        footer: "All rights reserved."
    }
}

const productTranslations = {
    ID: [
        {
            name: "Industri Manufaktur & Logistik",
            description: "Kendalikan seluruh operasional pabrik dan logistik dalam satu sistem terpadu.",
            ready: "MRP standar & BOM siap pakai.",
            custom: "Integrasi IoT mesin & custom payroll komponen.",
            features: [
                "📦 Sales Order — Real-time tracking.",
                "🚚 Inventory — Stok multi-gudang.",
                "⚙️ MRP — Hitung material otomatis.",
                "📊 Accounting — Laporan konsolidasi."
            ]
        },
        {
            name: "Yayasan Pendidikan & Perumahan",
            description: "Kelola yayasan atau kompleks perumahan dengan transparansi penuh.",
            ready: "Payroll guru & patroli security standar.",
            custom: "Smart gate integration & laporan keuangan khusus.",
            features: [
                "👥 Axon HRM — Gaji & slip digital.",
                "🛡️ Axon Guard — Patroli real-time GPS.",
                "🏫 Aset Gedung — Jadwal maintenance.",
                "🚪 Manajemen Akses — Kontrol tamu."
            ]
        },
        {
            name: "UMKM Modern",
            description: "Bawa UMKM ke level profesional dengan solusi digital lengkap.",
            ready: "Template website & finance standar.",
            custom: "Marketplace sync & laporan per cabang unik.",
            features: [
                "🌐 Website Penjualan — Mobile-friendly.",
                "🛒 Sales Management — Katalog simpel.",
                "💰 Finance — Arus kas real-time.",
                "👥 Payroll Simpel — Rekap cepat."
            ]
        }
    ],
    EN: [
        {
            name: "Manufacturing & Logistics",
            description: "Control all factory operations and logistics in one integrated system.",
            ready: "Standard MRP & BOM ready-to-use.",
            custom: "Machine IoT & custom payroll components.",
            features: [
                "📦 Sales Order — Real-time tracking.",
                "🚚 Inventory — Multi-warehouse stock.",
                "⚙️ MRP — Auto material calculation.",
                "📊 Accounting — Consolidated reports."
            ]
        },
        {
            name: "Educational & Housing Foundations",
            description: "Manage foundations or housing complexes with full transparency.",
            ready: "Teacher payroll & standard security patrol.",
            custom: "Smart gate & custom scholarship tracking.",
            features: [
                "👥 Axon HRM — Payroll & digital slips.",
                "🛡️ Axon Guard — GPS real-time patrol.",
                "🏫 Building Assets — Maintenance schedules.",
                "🚪 Access Management — Guest control."
            ]
        },
        {
            name: "Modern MSMEs",
            description: "Take your MSME to the professional level with complete digital solutions.",
            ready: "Website templates & standard finance.",
            custom: "Marketplace sync & unique branch reports.",
            features: [
                "🌐 Sales Website — Mobile-friendly.",
                "🛒 Sales Management — Simple catalog.",
                "💰 Finance — Real-time cash flow.",
                "👥 Simple Payroll — Rapid recap."
            ]
        }
    ]
}

export function LandingPage() {
    const { lang } = useLanguage()
    const t = translations[lang]
    const products = productTranslations[lang]
    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false)
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
    const [isManufacturingModalOpen, setIsManufacturingModalOpen] = useState(false)
    const [isFoundationModalOpen, setIsFoundationModalOpen] = useState(false)
    const [isMSMEModalOpen, setIsMSMEModalOpen] = useState(false)
    const [expandedLevel, setExpandedLevel] = useState<number | null>(null)

    return (
        <div className="bg-background min-h-screen text-foreground selection:bg-indigo-500/30">
            <Navbar />
            <ScrollNav />
            <section id="beranda">
                <Hero />
            </section>

            {/* Social Proof Marquee */}
            <section className="py-10 md:py-20 border-t border-border/40 overflow-hidden bg-slate-50/30">
                <div className="container mx-auto px-4 md:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-center mb-12 opacity-50">
                        {lang === 'ID' ? 'DIPERCAYA OLEH PERUSAHAAN TERKEMUKA' : 'TRUSTED BY LEADING ENTERPRISES'}
                    </p>
                    <div className="flex gap-20 items-center justify-center opacity-30 grayscale overflow-hidden py-4 select-none">
                        {['TECH CORP', 'GLOBAL LOGISTICS', 'SMART EDUCATION', 'MODERN RETAIL', 'FUTURE BUILDINGS'].map((logo, i) => (
                            <span key={i} className="text-2xl font-black tracking-tighter whitespace-nowrap">{logo}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dual Strength Section */}
            <section className="py-16 md:py-40 bg-white dark:bg-muted/50">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-24 max-w-4xl mx-auto">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-7xl font-black text-foreground mb-4 md:mb-8 tracking-tighter uppercase leading-[0.9]"
                        >
                            {t.dualStrength.title}
                        </motion.h2>
                        <p className="text-sm md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto">{t.dualStrength.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <motion.div
                            whileHover={{
                                y: -12,
                                transition: { duration: 0.3, ease: "easeOut" }
                            }}
                            onClick={() => setIsReadyModalOpen(true)}
                            className="glass p-12 rounded-[3rem] border border-white dark:border-white/5 shadow-xl relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-indigo-500/20 hover:border-indigo-200/50 dark:hover:border-indigo-500/30"
                        >
                            {/* Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/80 group-hover:to-transparent dark:group-hover:from-indigo-500/10 transition-all duration-500 -z-10" />
                            <div className="absolute top-0 right-0 p-8">
                                <span className="px-4 py-2 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Speed</span>
                            </div>
                            <motion.div
                                className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-8 shadow-lg shadow-indigo-600/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                            >
                                <Zap className="text-white" size={32} />
                            </motion.div>
                            <h3 className="text-3xl font-black text-foreground mb-4 group-hover:text-indigo-600 transition-colors duration-300">{t.dualStrength.readyTitle}</h3>
                            <p className="text-muted-foreground font-medium leading-relaxed mb-8">{t.dualStrength.readyDesc}</p>
                            <ul className="space-y-4 mb-10">
                                {['1-4 Minggu Go-Live', 'Proses Standar Industri', 'Biaya Terprediksi', 'Auto-update & Patch'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-foreground/70 group-hover:text-foreground transition-colors duration-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 group-hover:scale-150 transition-transform duration-300" /> {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all duration-300">
                                {lang === 'ID' ? 'Pelajari Selengkapnya' : 'Learn More'}
                                <ArrowRight size={14} />
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{
                                y: -12,
                                transition: { duration: 0.3, ease: "easeOut" }
                            }}
                            onClick={() => setIsCustomModalOpen(true)}
                            className="glass p-12 rounded-[3rem] border border-white dark:border-white/5 shadow-xl relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-purple-500/20 hover:border-purple-200/50 dark:hover:border-purple-500/30"
                        >
                            {/* Hover Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-purple-50/0 to-purple-50/0 group-hover:from-purple-50/80 group-hover:to-transparent dark:group-hover:from-purple-500/10 transition-all duration-500 -z-10" />

                            <div className="absolute top-0 right-0 p-8">
                                <span className="px-4 py-2 rounded-full bg-purple-600/10 text-purple-600 text-[10px] font-black uppercase tracking-widest group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">Flexibility</span>
                            </div>

                            <motion.div
                                className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mb-8 shadow-lg shadow-purple-600/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                            >
                                <Layers className="text-white" size={32} />
                            </motion.div>

                            <h3 className="text-3xl font-black text-foreground mb-4 group-hover:text-purple-600 transition-colors duration-300">{t.dualStrength.customTitle}</h3>
                            <p className="text-muted-foreground font-medium leading-relaxed mb-8">{t.dualStrength.customDesc}</p>

                            <ul className="space-y-4 mb-10">
                                {['Custom Fit Development', 'Integrasi Legacy System', 'Eksklusivitas Fitur', 'Opsi Server Mandiri'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-foreground/70 group-hover:text-foreground transition-colors duration-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 group-hover:scale-150 transition-transform duration-300" /> {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center gap-2 text-purple-600 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all duration-300">
                                {lang === 'ID' ? 'Pelajari Selengkapnya' : 'Learn More'}
                                <ArrowRight size={14} />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Customization Spectrum */}
            <section className="py-8 md:py-32 relative overflow-hidden">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1">
                            <h2 className="text-2xl md:text-4xl font-black text-foreground mb-4 md:mb-6 tracking-tighter uppercase leading-[0.9]">
                                {t.spectrum.title}
                            </h2>
                            <p className="text-[10px] md:text-sm text-muted-foreground font-medium max-w-lg">{t.spectrum.subtitle}</p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                            {t.spectrum.levels.map((level: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                    onMouseEnter={() => setExpandedLevel(i)}
                                    onMouseLeave={() => setExpandedLevel(null)}
                                    onClick={() => setExpandedLevel(expandedLevel === i ? null : i)}
                                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${expandedLevel === i
                                        ? "border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5 shadow-lg shadow-indigo-500/10"
                                        : "border-border bg-card/50 backdrop-blur-sm hover:border-indigo-500/30"
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-colors ${expandedLevel === i
                                            ? "bg-indigo-600 text-white"
                                            : "bg-secondary text-muted-foreground"
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[12px] md:text-base lg:text-lg font-black transition-colors uppercase tracking-tight ${expandedLevel === i ? "text-indigo-600" : "text-foreground/80"
                                                    }`}>
                                                    {level.title}
                                                </span>
                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-500 opacity-60">
                                                    {level.tagline}
                                                </span>
                                            </div>

                                            <motion.div
                                                initial={false}
                                                animate={{
                                                    height: expandedLevel === i ? "auto" : 0,
                                                    opacity: expandedLevel === i ? 1 : 0,
                                                    marginTop: expandedLevel === i ? 16 : 0
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-[10px] md:text-sm lg:text-base text-muted-foreground font-medium leading-relaxed border-t border-indigo-500/10 pt-4">
                                                    {level.description}
                                                </p>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof Marquee */}
            <section className="py-6 md:py-20 border-t border-border/40 overflow-hidden bg-slate-50/30">
                <div className="container mx-auto px-4 md:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-center mb-12 opacity-50">
                        {lang === 'ID' ? 'DIPERCAYA OLEH PERUSAHAAN TERKEMUKA' : 'TRUSTED BY LEADING ENTERPRISES'}
                    </p>
                    <div className="flex gap-20 items-center justify-center opacity-30 grayscale overflow-hidden py-4 select-none">
                        {['TECH CORP', 'GLOBAL LOGISTICS', 'SMART EDUCATION', 'MODERN RETAIL', 'FUTURE BUILDINGS'].map((logo, i) => (
                            <span key={i} className="text-2xl font-black tracking-tighter whitespace-nowrap">{logo}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section id="solutions" className="relative py-10 md:py-32 overflow-hidden border-t border-border/40 bg-white dark:bg-accent/30">
                <div className="container mx-auto px-4 md:px-6">
                    {products.map((product, idx) => (
                        <div
                            key={product.name}
                            className={`flex flex-col lg:flex-row items-center gap-20 mb-40 last:mb-0 relative ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
                        >
                            {/* Watermark Background */}
                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-hidden">
                                <span className="text-[15rem] md:text-[25rem] font-black text-foreground/5 uppercase tracking-tighter select-none whitespace-nowrap">
                                    {idx === 0 ? 'MANUFACTURING' : idx === 1 ? 'EDUCATION' : 'GROWTH'}
                                </span>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 1, ease: "circOut" }}
                                className="flex-1 relative z-10"
                            >
                                <h2 className="text-2xl md:text-5xl font-black text-foreground mb-4 md:mb-8 tracking-tighter uppercase leading-[0.9]">
                                    {product.name}
                                </h2>
                                <p className="text-muted-foreground text-[10px] md:text-lg lg:text-xl font-medium mb-6 md:mb-10 leading-relaxed max-w-xl">
                                    {product.description}
                                </p>

                                {/* Ready vs Custom Highlighter */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary mb-2">Axon Ready</p>
                                        <p className="text-[10px] md:text-sm lg:text-base font-bold text-foreground/80">{product.ready}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-purple-500 mb-2">Built-to-Fit</p>
                                        <p className="text-[10px] md:text-sm lg:text-base font-bold text-foreground/80">{product.custom}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-12">
                                    {product.features.map((feature, i) => (
                                        <div key={i} className="flex gap-4 items-start group">
                                            <div className="w-1.5 h-1.5 rounded-full mt-2.5 shrink-0 bg-primary group-hover:scale-150 transition-transform" />
                                            <span className="text-[10px] md:text-sm lg:text-base font-bold text-muted-foreground group-hover:text-foreground transition-colors">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    onClick={() => {
                                        if (idx === 0) setIsManufacturingModalOpen(true)
                                        if (idx === 1) setIsFoundationModalOpen(true)
                                        if (idx === 2) setIsMSMEModalOpen(true) // Added MSME modal trigger
                                    }}
                                    className="rounded-2xl px-10 h-16 text-xs font-black uppercase tracking-widest bg-background border border-border hover:border-primary/30 text-primary shadow-xl transition-all active:scale-95"
                                >
                                    {lang === 'ID' ? 'Lihat Detail Solusi' : 'View Solution Details'}
                                </Button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true, amount: 0.3 }}
                                className="flex-1 relative"
                            >
                                <div className="aspect-[4/3] glass rounded-[3rem] border border-white/50 dark:border-white/10 shadow-2xl relative overflow-hidden group p-4">
                                    <div className="w-full h-full rounded-[2.5rem] bg-card border border-border shadow-sm overflow-hidden relative group">
                                        <img
                                            src={idx === 0 ? "/images/manufacturing.png" : idx === 1 ? "/images/foundation.png" : "/images/umkm.png"}
                                            alt={product.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    {/* Accent glows */}
                                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all" />
                                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-all" />
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Dashboard Matrix Section */}
            <section id="products" className="py-16 md:py-40 bg-background border-y border-border/40 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full glowing-grid opacity-5" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-24">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-7xl font-black text-foreground mb-4 md:mb-6 tracking-tighter uppercase"
                        >
                            {lang === 'ID' ? 'KAPABILITAS EKOSISTEM' : 'ECOSYSTEM CAPABILITIES'}
                        </motion.h2>
                        <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-[8px] md:text-[10px] opacity-60">
                            {lang === 'ID' ? 'Didesain untuk fleksibilitas maksimal' : 'Designed for maximum flexibility'}
                        </p>
                    </div>

                    {/* Mobile Matrix (Cards) */}
                    <div className="block md:hidden space-y-4">
                        {[
                            { k: lang === 'ID' ? 'ERP / Akuntansi & MRP' : 'ERP / Accounting & MRP', i: 'ENTERPRISE', y: 'STANDARD', u: 'SMALL BIZ' },
                            { k: lang === 'ID' ? 'HRM & Payroll Automation' : 'HRM & Payroll Automation', i: 'SHIFT-READY', y: 'ADVANCED', u: 'BASIC' },
                            { k: lang === 'ID' ? 'Security & Access Guard' : 'Security & Access Guard', i: 'HIGH-TRUST', y: 'CLUSTER-MODE', u: 'STANDALONE' },
                            { k: lang === 'ID' ? 'Asset & Service Monitoring' : 'Asset & Service Monitoring', i: 'FLEET & MACHINE', y: 'BUILDING', u: 'EQUIPMENT' },
                            { k: lang === 'ID' ? 'Sales & Online Presence' : 'Sales & Online Presence', i: 'DISTRIBUTION', y: 'CUSTOM', u: 'WEB + SOCIAL' },
                        ].map((row, idx) => (
                            <div key={idx} className="p-5 rounded-2xl border border-border bg-white dark:bg-slate-950/40 dark:border-white/10 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 border-b border-border/20 pb-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                    <span className="text-sm font-black text-foreground">{row.k}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'Industri' : 'Industry'}</span>
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white dark:bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 min-w-[100px]">{row.i}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'Yayasan' : 'Foundation'}</span>
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white dark:bg-secondary text-[10px] font-bold text-secondary-foreground border border-border min-w-[100px]">{row.y}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'UMKM' : 'MSME'}</span>
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white dark:bg-muted text-[10px] font-bold text-muted-foreground border border-border min-w-[100px]">{row.u}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Matrix (Table) */}
                    <MatrixTableWrapper>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-muted-foreground/60">
                                        <th className="px-10 py-10 border-b border-border/40">{lang === 'ID' ? 'Modul & Fitur' : 'Modules & Features'}</th>
                                        <th className="px-10 py-10 border-b border-border/40 text-center">{lang === 'ID' ? 'Industri' : 'Industry'}</th>
                                        <th className="px-10 py-10 border-b border-border/40 text-center">{lang === 'ID' ? 'Yayasan' : 'Foundation'}</th>
                                        <th className="px-10 py-10 border-b border-border/40 text-center">{lang === 'ID' ? 'UMKM' : 'MSMEs'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { k: lang === 'ID' ? 'ERP / Akuntansi & MRP' : 'ERP / Accounting & MRP', i: 'ENTERPRISE', y: 'STANDARD', u: 'SMALL BIZ' },
                                        { k: lang === 'ID' ? 'HRM & Payroll Automation' : 'HRM & Payroll Automation', i: 'SHIFT-READY', y: 'ADVANCED', u: 'BASIC' },
                                        { k: lang === 'ID' ? 'Security & Access Guard' : 'Security & Access Guard', i: 'HIGH-TRUST', y: 'CLUSTER-MODE', u: 'STANDALONE' },
                                        { k: lang === 'ID' ? 'Asset & Service Monitoring' : 'Asset & Service Monitoring', i: 'FLEET & MACHINE', y: 'BUILDING', u: 'EQUIPMENT' },
                                        { k: lang === 'ID' ? 'Sales & Online Presence' : 'Sales & Online Presence', i: 'DISTRIBUTION', y: 'CUSTOM', u: 'WEB + SOCIAL' },
                                    ].map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300">
                                            <td className="px-10 py-10 border-b border-border/40">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                                                    <span className="text-base font-black text-slate-900 dark:text-foreground tracking-tight">{row.k}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-10 border-b border-border/40 text-center">
                                                <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white dark:bg-primary/10 text-[10px] font-black text-primary border border-primary/20 tracking-widest">{row.i}</span>
                                            </td>
                                            <td className="px-10 py-10 border-b border-border/40 text-center">
                                                <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white dark:bg-secondary text-[10px] font-black text-secondary-foreground border border-border tracking-widest">{row.y}</span>
                                            </td>
                                            <td className="px-10 py-10 border-b border-border/40 text-center">
                                                <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white dark:bg-muted text-[10px] font-black text-muted-foreground border border-border tracking-widest">{row.u}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </MatrixTableWrapper>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-10 md:py-40 bg-white dark:bg-muted/30 relative overflow-hidden">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-16 md:mb-20">
                        <h2 className="text-3xl md:text-6xl font-black text-foreground mb-4 md:mb-6 tracking-tighter uppercase leading-[0.9]">
                            {lang === 'ID' ? 'Penawaran Modul Axon' : 'Axon Module Pricing'}
                        </h2>
                        <p className="text-sm md:text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
                            {lang === 'ID'
                                ? 'Dapatkan penawaran terbaik sesuai dengan kebutuhan spesifik dan skala bisnis Anda. Transparan, fleksibel, dan tanpa biaya tersembunyi.'
                                : 'Get the best quote tailored to your specific needs and business scale. Transparent, flexible, and no hidden costs.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {[
                            {
                                title: "Axon Core / ERP",
                                desc: lang === 'ID' ? "Fondasi digital untuk operasional terpadu." : "Digital foundation for unified operations.",
                                features: ["Finance & Accounting", "Inventory Management", "Procurement System", "Basic CRM"]
                            },
                            {
                                title: "Axon HRM & Payroll",
                                desc: lang === 'ID' ? "Otomasi total manajemen SDM dan penggajian." : "Total automation of HR and payroll management.",
                                features: ["Employee Database", "Attendance Tracking", "Payroll Automation", "Performance Review"]
                            },
                            {
                                title: "Axon Enterprise",
                                desc: lang === 'ID' ? "Solusi kustom untuk skala industri besar." : "Custom solutions for large industrial scale.",
                                features: ["Multi-Company / Branch", "Custom API Integration", "Advanced Business Intel", "Dedicated Support"]
                            },
                        ].map((plan, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className="glass p-5 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-white/50 shadow-lg flex flex-col relative group overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="mb-6 md:mb-8">
                                    <h3 className="text-xl md:text-2xl font-black text-foreground mb-2 md:mb-4">{plan.title}</h3>
                                    <p className="text-muted-foreground font-medium text-xs md:text-sm leading-relaxed">{plan.desc}</p>
                                </div>

                                <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-xs md:text-sm font-bold text-foreground/80">
                                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <Check size={10} strokeWidth={4} className="md:w-3 md:h-3" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button className="w-full rounded-2xl h-12 md:h-14 font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 group-hover:shadow-2xl">
                                    {lang === 'ID' ? 'Minta Penawaran' : 'Request Quotation'}
                                </Button>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-muted-foreground text-sm font-medium mb-4">
                            {lang === 'ID' ? 'Butuh modul spesifik lainnya?' : 'Need other specific modules?'}
                        </p>
                        <Button variant="link" className="text-primary font-bold uppercase tracking-widest text-xs">
                            {lang === 'ID' ? 'Hubungi Tim Sales Kami →' : 'Contact Our Sales Team →'}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Premium CTA Section */}
            <section className="container mx-auto px-6 py-16 md:py-40">
                <div className="relative glass rounded-[4rem] p-12 md:p-32 text-center overflow-hidden border border-white/60 shadow-3xl">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 via-rose-500 to-emerald-500" />
                    <div className="relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-8xl font-black text-foreground mb-6 md:mb-10 tracking-tighter uppercase leading-[0.9] md:leading-[0.8]"
                        >
                            {lang === 'ID' ? 'Mau Go-Live Cepat atau' : 'Ready to Launch or'}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-indigo-700 to-purple-600 tracking-[-0.05em]">{lang === 'ID' ? 'Bangun Solusi Spesifik?' : 'Build Custom?'}</span>
                        </motion.h2>
                        <p className="text-muted-foreground text-sm md:text-xl font-medium max-w-3xl mx-auto mb-10 md:mb-16 leading-relaxed">
                            {lang === 'ID'
                                ? 'Tim Axon siap mendiskusikan kebutuhan Anda dan merekomendasikan jalur terbaik — apakah cukup dengan konfigurasi standar, atau perlu pengembangan khusus.'
                                : 'Axon team is ready to discuss your needs and recommend the best path — whether standard configuration is enough, or custom development is required.'}
                        </p>
                        <div className="flex flex-row items-center justify-center gap-2 sm:gap-8 w-full max-w-2xl mx-auto">
                            <Button size="lg" className="flex-1 rounded-2xl md:rounded-[2rem] px-4 md:px-16 h-16 md:h-24 text-[9px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:-translate-y-2 active:scale-95 group">
                                <span className="mr-1 md:mr-3 text-base md:text-xl">📞</span> {lang === 'ID' ? 'Konsultasi Gratis' : 'Free Consultation'}
                            </Button>
                            <Button size="lg" className="flex-1 rounded-2xl md:rounded-[2rem] px-4 md:px-16 h-16 md:h-24 text-[9px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] bg-background border border-primary/20 hover:border-primary text-primary shadow-xl transition-all hover:-translate-y-2 active:scale-95">
                                <span className="mr-1 md:mr-3 text-base md:text-xl">🚀</span> {lang === 'ID' ? 'Coba Demo' : 'Try Demo'}
                            </Button>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full" />
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full" />
                </div>
            </section>

            {/* About Us Section */}
            <section id="about" className="py-16 md:py-40 bg-indigo-950 relative overflow-hidden text-white">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/30 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 blur-[120px] rounded-full"></div>

                <div className="container mx-auto px-6 relative z-10">
                    {/* Header & Intro */}
                    <div className="max-w-4xl mx-auto text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-6xl font-black mb-8 md:mb-12 tracking-tighter uppercase leading-[0.9] text-white">
                            {lang === 'ID' ? 'Tentang Kami' : 'About Us'}
                        </h2>

                        <div className="space-y-6 md:space-y-8 text-sm md:text-xl font-medium leading-relaxed text-indigo-100/80">
                            <p>
                                {lang === 'ID'
                                    ? "Axon Ecosystem adalah perusahaan teknologi yang fokus mengembangkan solusi manajemen terintegrasi berbasis cloud untuk berbagai skala bisnis di Indonesia. Didirikan oleh tim yang berpengalaman di bidang enterprise resource planning, keamanan digital, dan pengembangan software, kami hadir dengan visi untuk menyederhanakan kompleksitas operasional bisnis melalui satu ekosistem yang powerful namun tetap mudah digunakan."
                                    : "Axon Ecosystem is a technology company focused on developing cloud-based integrated management solutions for businesses of all scales in Indonesia. Founded by a team experienced in enterprise resource planning, digital security, and software development, we exist to simplify business operational complexity through one powerful yet user-friendly ecosystem."}
                            </p>
                            <p>
                                {lang === 'ID'
                                    ? 'Nama "Axon" sendiri terinspirasi dari akson (axon) pada sel saraf — penghubung yang memungkinkan komunikasi cepat dan tepat antar bagian. Filosofi inilah yang kami terapkan dalam produk kami: menjadi penghubung yang mulus antara berbagai fungsi bisnis (keuangan, SDM, operasional, keamanan) agar dapat bekerja dalam harmoni dan sinkronisasi sempurna.'
                                    : 'The name "Axon" is inspired by the axon in nerve cells — the connector that enables fast and precise communication between parts. This philosophy is what we apply to our products: becoming the seamless connector between various business functions (finance, HR, operations, security) to work in harmony and perfect synchronization.'}
                            </p>
                        </div>
                    </div>

                    <div className="max-w-5xl mx-auto mb-16 md:mb-32">
                        <div className="glass p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/10 bg-white/5 relative text-center">
                            <h3 className="text-indigo-400 font-black uppercase tracking-widest text-xs md:text-sm mb-4 md:mb-6">{lang === 'ID' ? 'Misi Kami' : 'Our Mission'}</h3>
                            <p className="text-lg sm:text-2xl md:text-5xl font-black text-white leading-tight tracking-tight">
                                "{lang === 'ID' ? 'Mendemokratisasi akses terhadap teknologi manajemen kelas enterprise untuk semua lapisan bisnis — dari UMKM hingga korporasi.' : 'Democratizing access to enterprise-grade management technology for all business layers — from MSMEs to corporations.'}"
                            </p>
                        </div>
                    </div>

                    {/* Differentiators */}
                    <div className="mb-32">
                        <h3 className="text-3xl font-black text-white mb-12 text-center tracking-tight">{lang === 'ID' ? 'Apa yang Membedakan Kami?' : 'What Sets Us Apart?'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    title: { ID: "Ekosistem Terpadu", EN: "Integrated Ecosystem" },
                                    desc: { ID: "Satu platform untuk ERP, HRM, Security, & Service — semua terintegrasi native.", EN: "One platform for ERP, HRM, Security, & Service — all natively integrated." },
                                    icon: "🔄"
                                },
                                {
                                    title: { ID: "Fleksibilitas Tinggi", EN: "High Flexibility" },
                                    desc: { ID: "Bisa dikonfigurasi bahkan dikustomisasi tanpa kehilangan kemampuan update.", EN: "Configurable and customizable without losing update capabilities." },
                                    icon: "⚡"
                                },
                                {
                                    title: { ID: "Harga Transparan", EN: "Transparent Pricing" },
                                    desc: { ID: "Berlangganan bulanan terjangkau, tanpa biaya tersembunyi.", EN: "Affordable monthly subscription, no hidden fees." },
                                    icon: "💎"
                                },
                                {
                                    title: { ID: "Dukungan Lokal", EN: "Local Support" },
                                    desc: { ID: "Berbasis di Indonesia, paham regulasi & kebutuhan lokal.", EN: "Based in Indonesia, understands local regulations & needs." },
                                    icon: "🇮🇩"
                                }
                            ].map((item, i) => (
                                <div key={i} className="glass p-8 rounded-3xl border border-white/10 bg-indigo-900/40 hover:bg-indigo-800/60 transition-colors">
                                    <div className="text-4xl mb-6">{item.icon}</div>
                                    <h4 className="text-xl font-black text-white mb-4">{item.title[lang as keyof typeof item.title]}</h4>
                                    <p className="text-indigo-200 text-sm leading-relaxed">{item.desc[lang as keyof typeof item.desc]}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team & Journey Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-32">
                        {/* Team */}
                        <div>
                            <h3 className="text-3xl font-black text-white mb-8 tracking-tight">{lang === 'ID' ? 'Tim di Balik Axon' : 'The Team Behind Axon'}</h3>
                            <div className="space-y-6">
                                {[
                                    { role: "Teknologi", desc: { ID: "Mantan engineer dari perusahaan software multinasional.", EN: "Ex-engineers from multinational software companies." } },
                                    { role: "Konsultan Bisnis", desc: { ID: "Berpengalaman membantu perusahaan go-public dan transformasi digital.", EN: "Experienced in helping companies go public and digital transformation." } },
                                    { role: "Keamanan", desc: { ID: "Eks praktisi keamanan industri dan IT.", EN: "Ex-industrial security and IT practitioners." } },
                                    { role: "HR & Payroll", desc: { ID: "Spesialis kompensasi dan manajemen SDM.", EN: "Compensation and HR management specialists." } }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-white text-lg mb-1">{member.role}</h4>
                                            <p className="text-indigo-200 text-sm">{member.desc[lang as keyof typeof member.desc]}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Journey */}
                        <div>
                            <h3 className="text-3xl font-black text-white mb-8 tracking-tight">{lang === 'ID' ? 'Perjalanan Kami' : 'Our Journey'}</h3>
                            <div className="relative border-l-2 border-indigo-500/30 ml-3 space-y-8 pl-8 py-2">
                                {[
                                    { year: "2020", text: { ID: "Axon Ecosystem didirikan untuk UMKM.", EN: "Axon Ecosystem founded for MSMEs." } },
                                    { year: "2021", text: { ID: "Peluncuran Axon ERP dan HRM. 100+ pengguna.", EN: "Launch of Axon ERP and HRM. 100+ users." } },
                                    { year: "2022", text: { ID: "Pengembangan Axon Guard & Service.", EN: "Development of Axon Guard & Service." } },
                                    { year: "2023", text: { ID: "Rebranding platform versi 2.0 (Modular).", EN: "Rebranding platform version 2.0 (Modular)." } },
                                    { year: "2024", text: { ID: "Melayani 500+ pelanggan berbagai sektor.", EN: "Serving 500+ clients across sectors." } },
                                    { year: "2025", text: { ID: "Target: Ekosistem pilihan utama bisnis menengah.", EN: "Target: Top choice management ecosystem for medium businesses." } },
                                ].map((milestone, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-indigo-950 border-4 border-indigo-500" />
                                        <span className="text-indigo-400 font-black text-sm tracking-widest mb-1 block">{milestone.year}</span>
                                        <p className="text-white font-medium">{milestone.text[lang as keyof typeof milestone.text]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact - Clean & Direct */}
                    <div className="max-w-3xl mx-auto text-center border-t border-white/10 pt-20">
                        <h3 className="text-3xl font-black text-white mb-8 tracking-tight">{lang === 'ID' ? 'Hubungi Kami' : 'Contact Us'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-4">Digital</p>
                                <p className="text-white font-bold mb-2">www.axonecosystem.com</p>
                                <p className="text-white font-bold">hello@axonecosystem.com</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-4">Office</p>
                                <p className="text-white font-bold mb-2">+62 21 1234 5678</p>
                                <p className="text-indigo-200 text-sm">Jakarta | Surabaya | Bandung</p>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-16 md:py-40 border-t border-border/40 bg-white dark:bg-muted/20">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16 md:mb-24">
                        <h2 className="text-3xl md:text-6xl font-black text-foreground mb-4 tracking-tighter uppercase leading-[0.9]">FAQ</h2>
                        <p className="text-sm md:text-base text-muted-foreground font-medium">{lang === 'ID' ? 'Menjawab keraguan Anda' : 'Answering your concerns'}</p>
                    </div>
                    <div className="space-y-8">
                        {[
                            {
                                q: lang === 'ID' ? "Apakah kustomisasi akan menyulitkan saat upgrade nanti?" : "Will customization make upgrades difficult later?",
                                a: lang === 'ID' ? "Tidak. Kami menggunakan arsitektur modular. Kode custom dan core system dipisah, sehingga update tetap jalan mulus tanpa mengganggu fitur khusus Anda." : "No. We use a modular architecture. Custom code and the core system are separated, so updates run smoothly without affecting your unique features."
                            },
                            {
                                q: lang === 'ID' ? "Saya butuh fitur yang belum ada di modul manapun. Gimana?" : "I need a feature that's not in any module. What now?",
                                a: lang === 'ID' ? "Kami punya tim pengembangan yang bisa membangun fitur baru sesuai spesifikasi Anda. Setelah jadi, fitur tersebut bisa menjadi bagian dari ekosistem eksklusif Anda." : "We have a development team that can build new features to your specs. Once done, those features become part of your exclusive ecosystem."
                            },
                            {
                                q: lang === 'ID' ? "Apakah kustomisasi mahal?" : "Is customization expensive?",
                                a: lang === 'ID' ? "Setiap kebutuhan akan kami assess dan berikan proposal transparan. Banyak kasus, kebutuhan bisa diselesaikan hanya dengan konfigurasi tanpa biaya tambahan." : "We assess every need and provide a transparent proposal. In many cases, needs can be met through configuration without extra costs."
                            }
                        ].map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="glass p-8 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm"
                            >
                                <h4 className="text-lg font-black text-foreground mb-4 tracking-tight">Q: {faq.q}</h4>
                                <p className="text-muted-foreground font-medium leading-relaxed">A: {faq.a}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />

            <ReadyDetailModal
                isOpen={isReadyModalOpen}
                onClose={() => setIsReadyModalOpen(false)}
            />

            <CustomDetailModal
                isOpen={isCustomModalOpen}
                onClose={() => setIsCustomModalOpen(false)}
            />

            <ManufacturingDetailModal
                isOpen={isManufacturingModalOpen}
                onClose={() => setIsManufacturingModalOpen(false)}
            />

            <FoundationDetailModal
                isOpen={isFoundationModalOpen}
                onClose={() => setIsFoundationModalOpen(false)}
            />

            <MSMEDetailModal
                isOpen={isMSMEModalOpen}
                onClose={() => setIsMSMEModalOpen(false)}
            />
        </div>
    )
}
