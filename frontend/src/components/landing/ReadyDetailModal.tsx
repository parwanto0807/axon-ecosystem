"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, Zap, Clock, ShieldCheck, TrendingUp, Info, HardDrive, Globe, LifeBuoy, Database, Briefcase, Home } from "lucide-react"
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
        descriptionPart1: "Paket Axon Ready adalah solusi bagi bisnis yang membutuhkan transformasi digital tanpa harus menunggu proses pengembangan yang lama. Kami menyediakan rangkaian modul standar yang telah dikonfigurasi mengikuti praktik terbaik (best practices) industri, manajemen yayasan/perumahan, dan operasional UMKM.",
        descriptionPart2: "Dengan paket ini, Anda tidak perlu membangun sistem dari nol. Kami telah menyiapkan \"fondasi matang\" yang mencakup fungsi-fungsi krusial seperti manajemen inventaris, penjualan, hingga pelaporan keuangan otomatis yang siap langsung digunakan untuk mendukung operasional harian Anda.",
        keyAdvantages: "Keunggulan & Benefit Utama",
        advantages: [
            {
                title: "1-4 Minggu Go-Live",
                desc: "Proses implementasi super cepat karena sistem sudah tersedia dan tinggal dilakukan konfigurasi dasar.",
                icon: Clock
            },
            {
                title: "Tanpa Biaya Server (Cloud Hosted)",
                desc: "Anda tidak perlu menyewa VPS/Server sendiri. Sistem berjalan di infrastruktur cloud kami yang berperforma tinggi.",
                icon: HardDrive
            },
            {
                title: "Domain & SSL Include",
                desc: "Akses melalui subdomain resmi (nama.axon.id) lengkap dengan sertifikat keamanan SSL untuk enkripsi data.",
                icon: Globe
            },
            {
                title: "Free Maintenance & Updates",
                desc: "Kami menangani patch keamanan dan pembaruan fitur secara gratis tanpa biaya tambahan di masa mendatang.",
                icon: LifeBuoy
            },
            {
                title: "Keamanan Data Terjamin",
                desc: "Data tersimpan di database terenkripsi dan dicadangkan (backup) rutin untuk mencegah kehilangan data.",
                icon: Database
            },
            {
                title: "Biaya Terprediksi",
                desc: "Model berlangganan transparan membantu anggaran tanpa risiko pembengkakan biaya pengembangan.",
                icon: TrendingUp
            }
        ],
        readyModules: "Modul Siap Pakai",
        modules: [
            {
                title: "Industri & UMKM",
                items: "Sales Order, Purchase Request/Order, Inventory (Stok), Invoicing, dan Laporan Akuntansi Lengkap.",
                icon: Briefcase
            },
            {
                title: "Yayasan & Perumahan",
                items: "Manajemen iuran, database warga/anggota, serta laporan kas masuk dan keluar.",
                icon: Home
            }
        ],
        noteTitle: "Penting:",
        note: "Paket ini sangat ideal jika kebutuhan bisnis Anda sudah terwakili oleh modul standar kami. Jika Anda membutuhkan integrasi khusus atau alur kerja unik, silakan lihat [Paket Custom/Axon Prime].",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Axon Ready (Standard)",
        subtitle: "Fast, Reliable, and Ready-to-Use ERP Solution.",
        fullDescription: "Full Description",
        descriptionPart1: "The Axon Ready package is the solution for businesses needing digital transformation without waiting for long development processes. We provide a range of standard modules configured following industry best practices, foundation/housing management, and MSME operations.",
        descriptionPart2: "With this package, you don't need to build systems from scratch. We have prepared a \"mature foundation\" that includes crucial functions such as inventory management, sales, to automatic financial reporting ready for direct use to support your daily operations.",
        keyAdvantages: "Key Advantages & Benefits",
        advantages: [
            {
                title: "1-4 Weeks Go-Live",
                desc: "Super fast implementation since the system is already available and only basic configuration is needed.",
                icon: Clock
            },
            {
                title: "No Server Costs (Cloud Hosted)",
                desc: "No need to rent your own VPS/Server. The system runs on our high-performance cloud infrastructure.",
                icon: HardDrive
            },
            {
                title: "Domain & SSL Included",
                desc: "Access through an official subdomain (name.axon.id) complete with SSL security certificate for data encryption.",
                icon: Globe
            },
            {
                title: "Free Maintenance & Updates",
                desc: "We handle security patches and feature updates for free without any future additional costs.",
                icon: LifeBuoy
            },
            {
                title: "Guaranteed Data Security",
                desc: "Data is stored in encrypted databases and backed up routinely to prevent data loss.",
                icon: Database
            },
            {
                title: "Predictable Cost",
                desc: "Transparent subscription model helps budgeting without the risk of ballooning development costs.",
                icon: TrendingUp
            }
        ],
        readyModules: "Ready-to-use Modules",
        modules: [
            {
                title: "Industry & MSME",
                items: "Sales Order, Purchase Request/Order, Inventory (Stock), Invoicing, and Full Accounting Reports.",
                icon: Briefcase
            },
            {
                title: "Foundation & Housing",
                items: "Contribution management, resident/member database, and cash flow reports.",
                icon: Home
            }
        ],
        noteTitle: "Important:",
        note: "This package is ideal if your business needs are already covered by our standard modules. If you need custom integrations or unique workflows, please see [Custom Package/Axon Prime].",
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] cursor-pointer"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-2 md:p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background border border-border/50 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl pointer-events-auto relative"
                        >
                            {/* Header Gradient */}
                            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-indigo-600/20 via-transparent to-transparent -z-10" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="p-6 md:p-12">
                                {/* Title & Hero Icon */}
                                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-8 md:mb-12">
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                                        <CheckCircle2 className="text-white" size={40} />
                                    </div>
                                    <div>
                                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                            Axon Ready
                                        </span>
                                        <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter mb-2">
                                            {t.title}
                                        </h2>
                                        <p className="text-base md:text-xl font-bold text-muted-foreground">
                                            {t.subtitle}
                                        </p>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                    {/* Left Side: Descriptions & Modules */}
                                    <div className="lg:col-span-6 space-y-10">
                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600 mb-4 flex items-center gap-2">
                                                <Info size={14} />
                                                {t.fullDescription}
                                            </h3>
                                            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium text-[10px] md:text-sm">
                                                <p>{t.descriptionPart1}</p>
                                                <p>{t.descriptionPart2}</p>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600 mb-6 flex items-center gap-2">
                                                <Zap size={14} />
                                                {t.readyModules}
                                            </h3>
                                            <div className="space-y-4">
                                                {t.modules.map((mod, idx) => (
                                                    <div key={idx} className="p-5 rounded-2xl bg-muted/30 border border-border/50 flex gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0 text-indigo-600">
                                                            <mod.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-1">{mod.title}</h4>
                                                            <p className="text-[9px] text-muted-foreground leading-relaxed">{mod.items}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="p-6 rounded-3xl bg-indigo-600/5 border border-indigo-600/10">
                                            <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                                                {t.noteTitle}
                                            </h4>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                                {t.note}
                                            </p>
                                        </section>
                                    </div>

                                    {/* Right Side: Advantages (Benefits) */}
                                    <div className="lg:col-span-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600 mb-6">
                                            {t.keyAdvantages}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                                            {t.advantages.map((adv, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className="flex gap-4 p-4 rounded-2xl hover:bg-muted/30 transition-colors group"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-md group-hover:scale-110 transition-transform">
                                                        <adv.icon size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-sm text-foreground mb-1 tracking-tight">
                                                            {adv.title}
                                                        </h4>
                                                        <p className="text-[9px] text-muted-foreground leading-relaxed font-medium">
                                                            {adv.desc}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="mt-12 pt-8 border-t border-border/50 flex justify-end">
                                    <Button
                                        onClick={onClose}
                                        className="rounded-2xl px-12 h-14 bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
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
