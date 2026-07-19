"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X, Store, Globe, ShoppingCart, CreditCard, ArrowRight,
    LayoutGrid, Smartphone, TrendingUp, RefreshCw, Layers, Receipt
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface MSMEDetailModalProps { isOpen: boolean; onClose: () => void }

const translations = {
    ID: {
        title: "Detail Solusi: UMKM Modern",
        intro: "Bawa UMKM Anda ke level profesional dengan solusi digital lengkap. Axon memberdayakan bisnis kecil untuk bersaing dengan skala besar melalui automasi yang terjangkau.",
        workflowTitle: "Go-Digital dalam Hitungan Hari",
        workflowSubtitle: "Transformasi langkah demi langkah untuk pertumbuhan UMKM Anda:",
        workflow: [
            { phase: "Ekspansi Online", desc: "Website penjualan siap pakai yang mobile-friendly, terhubung dengan brand Anda.", icon: Globe },
            { phase: "Manajemen Katalog", desc: "Input produk sekali, kelola stok di berbagai saluran penjualan secara terpusat.", icon: LayoutGrid },
            { phase: "Sinkronisasi Pasar", desc: "Hubungkan website dengan marketplace populer untuk laporan stok yang sinkron.", icon: RefreshCw },
            { phase: "Arus Kas Real-time", desc: "Setiap penjualan otomatis tercatat — monitoring untung-rugi instan.", icon: TrendingUp },
            { phase: "Laporan Per Cabang", desc: "Pantau performa masing-masing cabang dari satu layar.", icon: Store }
        ],
        strategicTitle: "Senjata Digital UMKM",
        arguments: [
            { title: "Website Penjualan", desc: "Toko online profesional tanpa biaya developer mahal. Katalog produk yang memukau di smartphone pelanggan.", icon: Smartphone },
            { title: "Sales Management", desc: "Kelola pesanan pelanggan dengan sistem terorganisir — dari pesanan masuk hingga pengemasan.", icon: ShoppingCart },
            { title: "Finance & Arus Kas", desc: "Laporan arus kas harian otomatis, membantu Anda menentukan langkah bisnis berikutnya.", icon: CreditCard },
            { title: "Payroll & Rekap", desc: "Hitung gaji karyawan dengan mudah. Bonus penjualan dan potongan dalam rekap otomatis.", icon: Receipt },
            { title: "Marketplace Sync", desc: "Sinkronkan stok antara gudang, website, dan marketplace. Hindari pembatalan karena stok habis.", icon: Layers }
        ],
        conclusionTitle: "Tumbuh Bersama Axon",
        conclusion: "Axon dirancang untuk tumbuh bersama Anda. Mulai dari fitur standar hingga kustomisasi unik saat bisnis Anda berkembang.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Modern MSME",
        intro: "Take your MSME to a professional level with complete digital solutions. Axon empowers small businesses to compete at scale through affordable automation.",
        workflowTitle: "Go-Digital in Days",
        workflowSubtitle: "Step-by-step transformation for your business growth:",
        workflow: [
            { phase: "Online Expansion", desc: "Ready-to-use, mobile-friendly sales website connected to your brand.", icon: Globe },
            { phase: "Catalog Management", desc: "Enter products once, manage stock across multiple sales channels centrally.", icon: LayoutGrid },
            { phase: "Marketplace Sync", desc: "Connect website sales with marketplaces for synchronized stock reporting.", icon: RefreshCw },
            { phase: "Real-time Cash Flow", desc: "Every sale automatically recorded — instant profit-loss monitoring.", icon: TrendingUp },
            { phase: "Branch Reporting", desc: "Monitor each branch's performance from one screen.", icon: Store }
        ],
        strategicTitle: "Digital Weapons for MSMEs",
        arguments: [
            { title: "Sales Website", desc: "Professional online store without expensive developer costs. Stunning product catalog on customer smartphones.", icon: Smartphone },
            { title: "Sales Management", desc: "Manage customer orders with an organized system — from order to packaging.", icon: ShoppingCart },
            { title: "Finance & Cash Flow", desc: "Daily cash flow reports automatically, helping you determine your next business steps.", icon: CreditCard },
            { title: "Simple Payroll", desc: "Calculate employee salaries easily. Sales bonuses and deductions in automatic recap.", icon: Receipt },
            { title: "Marketplace Sync", desc: "Synchronize stock between warehouse, website, and marketplace. Avoid cancellations due to stockouts.", icon: Layers }
        ],
        conclusionTitle: "Grow with Axon",
        conclusion: "Axon is designed to grow with you. Start with standard features and add unique customizations as your business expands.",
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
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[150] cursor-pointer"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[151] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background border border-border w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto relative"
                        >
                            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10">
                                <X size={18} />
                            </button>

                            <div className="p-8 md:p-12">
                                <div className="max-w-3xl mb-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Store className="text-primary w-7 h-7" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'ID' ? 'Skalasi Bisnis' : 'Business Scaling'}</span>
                                            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1">
                                                {lang === 'ID' ? 'UMKM Modern' : 'Modern MSME'}
                                            </h2>
                                        </div>
                                    </div>
                                    <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed">{t.intro}</p>
                                </div>

                                <div className="mb-14">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">{t.workflowTitle}</h3>
                                    <p className="text-sm text-muted-foreground font-medium mb-8">{t.workflowSubtitle}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                        {t.workflow.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                                    <item.icon size={18} />
                                                </div>
                                                <h4 className="font-bold text-xs text-foreground mb-1.5">{item.phase}</h4>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-14">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6">{t.strategicTitle}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {t.arguments.map((arg, idx) => (
                                            <div key={idx} className="p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                                                    <arg.icon size={18} />
                                                </div>
                                                <h4 className="font-bold text-sm text-foreground mb-1.5">{arg.title}</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{arg.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-8 items-start justify-between pt-8 border-t border-border">
                                    <div className="max-w-2xl">
                                        <h3 className="text-lg font-bold text-foreground mb-2">{t.conclusionTitle}</h3>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{t.conclusion}</p>
                                    </div>
                                    <Button onClick={onClose} className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors shrink-0">
                                        {t.closeBtn}
                                        <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
