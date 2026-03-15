"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    Store,
    Globe,
    ShoppingCart,
    CreditCard,
    Users,
    BarChart3,
    Zap,
    Package,
    ArrowRight,
    LayoutGrid,
    Smartphone,
    TrendingUp,
    RefreshCw,
    Layers,
    Receipt
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface MSMEDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const translations = {
    ID: {
        title: "Detail Solusi: UMKM Modern",
        intro: "Bawa UMKM Anda ke level profesional dengan solusi digital lengkap. Axon memberdayakan bisnis kecil untuk bersaing dengan skala besar melalui automasi yang terjangkau dan canggih.",
        workflowTitle: "Go-Digital dalam Hitungan Hari",
        workflowSubtitle: "Transformasi langkah demi langkah untuk pertumbuhan UMKM Anda:",
        workflow: [
            {
                phase: "Ekspansi Online",
                desc: "Website penjualan siap pakai yang mobile-friendly, terhubung otomatis dengan brand Anda.",
                icon: Globe
            },
            {
                phase: "Manajemen Katalog",
                desc: "Input produk sekali, kelola stok di berbagai saluran penjualan secara terpusat.",
                icon: LayoutGrid
            },
            {
                phase: "Sinkronisasi Pasar",
                desc: "Hubungkan penjualan website dengan marketplace populer untuk laporan stok yang sinkron.",
                icon: RefreshCw
            },
            {
                phase: "Arus Kas Real-time",
                desc: "Setiap penjualan otomatis tercatat dalam neraca keuangan. Monitoring untung-rugi instan.",
                icon: TrendingUp
            },
            {
                phase: "Laporan Per Cabang",
                desc: "Jika Anda punya lebih dari satu toko, pantau performa masing-masing cabang dari satu layar.",
                icon: Store
            }
        ],
        strategicTitle: "Senjata Digital untuk UMKM Tangguh",
        arguments: [
            {
                title: "Website Penjualan Mandiri",
                tagline: "Brand Presence",
                desc: "Miliki toko online profesional tanpa biaya developer mahal. Tampilkan katalog produk Anda dengan desain yang memukau di smartphone pelanggan.",
                icon: Smartphone
            },
            {
                title: "Sales Management Cerdas",
                tagline: "Simple Catalog",
                desc: "Kelola pesanan pelanggan dengan sistem yang terorganisir. Dari pesanan masuk hingga pengemasan, semua terpantau statusnya.",
                icon: ShoppingCart
            },
            {
                title: "Finance & Arus Kas",
                tagline: "Real-time Profit",
                desc: "Jangan menebak untung Anda. Axon menyajikan laporan arus kas harian secara otomatis, membantu Anda menentukan langkah bisnis berikutnya.",
                icon: CreditCard
            },
            {
                title: "Payroll & Rekap Cepat",
                tagline: "Simple Payroll",
                desc: "Hitung gaji karyawan UMKM dengan mudah. Sertakan bonus penjualan atau potongan absen dalam rekap otomatis yang bersih.",
                icon: Receipt
            },
            {
                title: "Marketplace Sync",
                tagline: "Multi-Channel Integration",
                desc: "Sinkronkan stok antara gudang fisik, website, dan toko marketplace Anda. Hindari pembatalan pesanan karena stok habis.",
                icon: Layers
            }
        ],
        conclusionTitle: "Tumbuh Bersama Axon",
        conclusion: "Axon dirancang untuk tumbuh bersama Anda. Mulai dari fitur standar hingga kustomisasi unik saat bisnis Anda berkembang. Sederhanakan operasional hari ini, raih pasar yang lebih luas esok hari.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Modern MSME",
        intro: "Take your MSME to a professional level with a complete digital solution. Axon empowers small businesses to compete at scale through affordable and advanced automation.",
        workflowTitle: "Go-Digital in Days",
        workflowSubtitle: "Step-by-step transformation for your business growth:",
        workflow: [
            {
                phase: "Online Expansion",
                desc: "Ready-to-use, mobile-friendly sales website automatically connected to your brand.",
                icon: Globe
            },
            {
                phase: "Catalog Management",
                desc: "Enter products once, manage stock across multiple sales channels centrally.",
                icon: LayoutGrid
            },
            {
                phase: "Marketplace Sync",
                desc: "Connect website sales with popular marketplaces for synchronized stock reporting.",
                icon: RefreshCw
            },
            {
                phase: "Real-time Cash Flow",
                desc: "Every sale is automatically recorded in financial sheets. Instant profit-loss monitoring.",
                icon: TrendingUp
            },
            {
                phase: "Branch Reporting",
                desc: "If you have more than one store, monitor the performance of each branch from one screen.",
                icon: Store
            }
        ],
        strategicTitle: "Digital Weapons for Resilient MSMEs",
        arguments: [
            {
                title: "Self-Managed Sales Website",
                tagline: "Brand Presence",
                desc: "Own a professional online store without expensive developer costs. Display your product catalog with stunning designs on your customers' smartphones.",
                icon: Smartphone
            },
            {
                title: "Smart Sales Management",
                tagline: "Simple Catalog",
                desc: "Manage customer orders with an organized system. From incoming orders to packaging, all statuses are monitored.",
                icon: ShoppingCart
            },
            {
                title: "Finance & Cash Flow",
                tagline: "Real-time Profit",
                desc: "Don't guess your profits. Axon presents daily cash flow reports automatically, helping you determine your next business steps.",
                icon: CreditCard
            },
            {
                title: "Simple Payroll & Recap",
                tagline: "Simple Payroll",
                desc: "Calculate employee salaries easily. Include sales bonuses or attendance deductions in a clean automatic recap.",
                icon: Receipt
            },
            {
                title: "Marketplace Sync",
                tagline: "Multi-Channel Integration",
                desc: "Synchronize stock between physical warehouses, your website, and your marketplace stores. Avoid order cancellations due to out-of-stock items.",
                icon: Layers
            }
        ],
        conclusionTitle: "Grow with Axon",
        conclusion: "Axon is designed to grow with you. Start with standard features and add unique customizations as your business expands. Simplify operations today, reach a wider market tomorrow.",
        closeBtn: "Close"
    }
}

export function MSMEDetailModal({ isOpen, onClose }: MSMEDetailModalProps) {
    const { lang } = useLanguage()
    const t = translations[lang as keyof typeof translations]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[150] cursor-pointer"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[151] pointer-events-none p-2 md:p-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: "spring", damping: 30, stiffness: 200 }}
                            className="bg-background border border-border/50 w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-2xl pointer-events-auto relative selection:bg-orange-500/30"
                        >
                            {/* Header Gradient Decor */}
                            <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-orange-600/10 via-amber-600/5 to-transparent -z-10" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 p-3 rounded-full bg-muted/50 hover:bg-orange-600 hover:text-white text-muted-foreground transition-all duration-300 z-10 shadow-lg group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform" />
                            </button>

                            <div className="p-6 md:p-16">
                                {/* Hero Section */}
                                <div className="max-w-4xl mb-12 md:mb-20">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center shadow-xl shadow-orange-600/20">
                                            <Store className="text-white" size={32} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Business Scaling</span>
                                            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter leading-none mt-1">
                                                {lang === 'ID' ? 'UMKM Modern' : 'Modern MSME'}
                                            </h2>
                                        </div>
                                    </motion.div>

                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-base md:text-2xl font-medium text-muted-foreground leading-relaxed"
                                    >
                                        {t.intro}
                                    </motion.p>
                                </div>

                                {/* Workflow Section */}
                                <div className="mb-16 md:mb-24">
                                    <div className="mb-12">
                                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-orange-600 mb-4">{t.workflowTitle}</h3>
                                        <p className="text-xl font-bold text-foreground opacity-70">{t.workflowSubtitle}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                                        {/* Connector Line (Desktop) */}
                                        <div className="hidden md:block absolute top-[60px] left-[50px] right-[50px] h-[2px] bg-gradient-to-r from-orange-600/20 via-orange-600/40 to-orange-600/20 -z-10" />

                                        {t.workflow.map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                                className="group"
                                            >
                                                <div className="mb-6 w-12 h-12 rounded-full bg-background border-2 border-orange-600/30 flex items-center justify-center text-orange-600 font-black shadow-inner group-hover:border-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 mx-auto md:mx-0">
                                                    <item.icon size={20} />
                                                </div>
                                                <h4 className="font-black text-[10px] uppercase tracking-tighter mb-2 text-foreground group-hover:text-orange-600 transition-colors">{item.phase}</h4>
                                                <p className="text-[9px] leading-relaxed text-muted-foreground font-medium">{item.desc}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Strategic Arguments Grid */}
                                <div className="mb-24">
                                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-orange-600 mb-12">{t.strategicTitle}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {t.arguments.map((arg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + (idx * 0.1) }}
                                                whileHover={{ y: -5 }}
                                                className="p-8 rounded-[2.5rem] bg-muted/30 border border-border/50 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 group relative overflow-hidden"
                                            >
                                                {/* Hover Gradient Background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/[0.03] to-amber-600/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                <div className="relative z-10">
                                                    <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-600/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                                        <arg.icon size={24} className="text-white" />
                                                    </div>
                                                    <div className="mb-4">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 opacity-60 mb-1 block">{arg.tagline}</span>
                                                        <h4 className="text-xl font-black text-foreground tracking-tight">{arg.title}</h4>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                                        {arg.desc}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conclusion & Value Prop */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center pt-16 border-t border-border/50">
                                    <div className="md:col-span-8">
                                        <h3 className="text-2xl font-black text-foreground mb-4 tracking-tighter uppercase">{t.conclusionTitle}</h3>
                                        <p className="text-xl font-medium text-muted-foreground leading-relaxed">
                                            {t.conclusion}
                                        </p>
                                    </div>
                                    <div className="md:col-span-4 flex justify-end">
                                        <Button
                                            onClick={onClose}
                                            className="rounded-[2rem] h-20 px-12 bg-orange-600 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-orange-600/30 group active:scale-95"
                                        >
                                            {t.closeBtn}
                                            <ArrowRight size={20} className="ml-4 group-hover:translate-x-2 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
