"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Zap, Clock, ShieldCheck, TrendingUp, Info, HardDrive, Globe, LifeBuoy, Database, Briefcase, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface ReadyDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const translations = {
    ID: {
        title: "Axon Ready (Standar)",
        subtitle: "Solusi ERP Cepat, Handal, dan Siap Pakai.",
        fullDescription: "Deskripsi Lengkap",
        descriptionPart1: "Paket Axon Ready adalah solusi bagi bisnis yang membutuhkan transformasi digital tanpa proses pengembangan yang lama. Kami menyediakan modul standar yang telah dikonfigurasi mengikuti praktik terbaik industri, manajemen yayasan/perumahan, dan operasional UMKM.",
        descriptionPart2: "Anda tidak perlu membangun sistem dari nol. Kami telah menyiapkan fondasi matang yang mencakup fungsi-fungsi krusial seperti manajemen inventaris, penjualan, hingga pelaporan keuangan otomatis.",
        keyAdvantages: "Keunggulan Utama",
        advantages: [
            { title: "1-4 Minggu Go-Live", desc: "Proses implementasi super cepat karena sistem sudah tersedia.", icon: Clock },
            { title: "Cloud Hosted", desc: "Tidak perlu sewa VPS/Server sendiri — berjalan di infrastruktur cloud kami.", icon: HardDrive },
            { title: "Domain & SSL Include", desc: "Akses melalui subdomain resmi lengkap dengan sertifikat SSL.", icon: Globe },
            { title: "Free Maintenance", desc: "Patch keamanan dan pembaruan fitur gratis tanpa biaya tambahan.", icon: LifeBuoy },
            { title: "Keamanan Data", desc: "Data tersimpan di database terenkripsi dengan backup rutin.", icon: Database },
            { title: "Biaya Terprediksi", desc: "Model berlangganan transparan tanpa risiko pembengkakan biaya.", icon: TrendingUp }
        ],
        readyModules: "Modul Siap Pakai",
        modules: [
            { title: "Industri & UMKM", items: "Sales Order, Purchase Request/Order, Inventory (Stok), Invoicing, dan Laporan Akuntansi Lengkap.", icon: Briefcase },
            { title: "Yayasan & Perumahan", items: "Manajemen iuran, database warga/anggota, serta laporan kas masuk dan keluar.", icon: Home }
        ],
        noteTitle: "Penting:",
        note: "Paket ini ideal jika kebutuhan bisnis Anda sudah terwakili oleh modul standar kami. Jika membutuhkan integrasi khusus atau alur kerja unik, silakan lihat Paket Custom.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Axon Ready (Standard)",
        subtitle: "Fast, Reliable, and Ready-to-Use ERP Solution.",
        fullDescription: "Full Description",
        descriptionPart1: "The Axon Ready package is for businesses needing digital transformation without long development. We provide standard modules configured following industry best practices, foundation/housing management, and MSME operations.",
        descriptionPart2: "No need to build from scratch. We've prepared a mature foundation with crucial functions like inventory management, sales, and automatic financial reporting.",
        keyAdvantages: "Key Advantages",
        advantages: [
            { title: "1-4 Weeks Go-Live", desc: "Super fast implementation since the system is already available.", icon: Clock },
            { title: "Cloud Hosted", desc: "No need to rent your own VPS — runs on our high-performance cloud.", icon: HardDrive },
            { title: "Domain & SSL Included", desc: "Access through official subdomain with SSL security certificate.", icon: Globe },
            { title: "Free Maintenance", desc: "Security patches and feature updates at no additional cost.", icon: LifeBuoy },
            { title: "Data Security", desc: "Data stored in encrypted databases with routine backup.", icon: Database },
            { title: "Predictable Cost", desc: "Transparent subscription model without ballooning development costs.", icon: TrendingUp }
        ],
        readyModules: "Ready-to-use Modules",
        modules: [
            { title: "Industry & MSME", items: "Sales Order, Purchase Request/Order, Inventory (Stock), Invoicing, and Full Accounting Reports.", icon: Briefcase },
            { title: "Foundation & Housing", items: "Contribution management, resident/member database, and cash flow reports.", icon: Home }
        ],
        noteTitle: "Important:",
        note: "This package is ideal if your business needs are covered by our standard modules. For custom integrations or unique workflows, see the Custom Package.",
        closeBtn: "Close"
    }
}

export function ReadyDetailModal({ isOpen, onClose }: ReadyDetailModalProps) {
    const { lang } = useLanguage()
    const t = translations[lang as keyof typeof translations]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[100] cursor-pointer"
                    />

                    <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto relative"
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10"
                            >
                                <X size={18} />
                            </button>

                            <div className="p-8 md:p-12">
                                <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
                                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Zap className="text-primary w-7 h-7" />
                                    </div>
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
                                            Axon Ready
                                        </span>
                                        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">{t.title}</h2>
                                        <p className="text-base font-medium text-muted-foreground">{t.subtitle}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-6 space-y-8">
                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">{t.fullDescription}</h3>
                                            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed font-medium">
                                                <p>{t.descriptionPart1}</p>
                                                <p>{t.descriptionPart2}</p>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">{t.readyModules}</h3>
                                            <div className="space-y-3">
                                                {t.modules.map((mod, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 flex gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 text-primary">
                                                            <mod.icon size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-1">{mod.title}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">{mod.items}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="p-5 rounded-xl bg-primary/[0.04] border border-primary/10">
                                            <h4 className="font-bold text-sm text-foreground mb-2">{t.noteTitle}</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">{t.note}</p>
                                        </section>
                                    </div>

                                    <div className="lg:col-span-6">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-5">{t.keyAdvantages}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {t.advantages.map((adv, idx) => (
                                                <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                                        <adv.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground mb-0.5">{adv.title}</h4>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{adv.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 pt-6 border-t border-border flex justify-end">
                                    <Button
                                        onClick={onClose}
                                        className="rounded-xl px-10 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors"
                                    >
                                        {t.closeBtn}
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
