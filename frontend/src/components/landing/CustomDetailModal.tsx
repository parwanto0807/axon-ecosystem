"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, Layers, Link2, Monitor, ShieldCheck, Server, HardDrive, TrendingUp, Info, Building2, Factory, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface CustomDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const translations = {
    ID: {
        title: "Axon Custom (Sesuai Kebutuhan)",
        subtitle: "Solusi ERP Eksklusif, Fleksibel, dan Terintegrasi Total.",
        fullDescription: "Deskripsi Lengkap",
        description: "Paket Axon Custom dirancang bagi perusahaan yang memiliki alur kerja unik, kompleks, atau sudah memiliki ekosistem digital (legacy system) yang ingin dipertahankan. Kami membangun fitur tambahan di atas fondasi teknologi kami yang stabil, memastikan Anda mendapatkan fleksibilitas penuh namun tetap menikmati performa sistem yang optimal.",
        keyAdvantages: "Keunggulan Utama",
        advantages: [
            {
                title: "Custom Fit Development",
                desc: "Pengembangan fitur spesifik berdasarkan analisis mendalam SOP perusahaan Anda. Setiap tombol, formulir, dan laporan dibuat khusus.",
                icon: Monitor
            },
            {
                title: "Integrasi Legacy System",
                desc: "ERP baru dapat terhubung dengan sistem lama (database, mesin absensi, software 3rd party) melalui API yang aman.",
                icon: Link2
            },
            {
                title: "Eksklusivitas Fitur",
                desc: "Miliki keunggulan kompetitif dengan fitur khusus yang tidak dimiliki kompetitor. Kendali penuh atas proses data.",
                icon: Sparkles
            },
            {
                title: "Backend Tetap Kompatibel",
                desc: "Struktur inti terjaga agar sistem stabil, mudah dirawat, dan selalu kompatibel dengan pembaruan keamanan utama.",
                icon: ShieldCheck
            }
        ],
        infrastructureTitle: "Server & Infrastruktur Flexible",
        infrastructureDesc: "Kami memberikan kebebasan bagi Anda dalam mengelola infrastruktur data perusahaan:",
        infrastructures: [
            {
                title: "Managed Hosting",
                desc: "Menumpang di server teroptimasi kami dengan domain/subdomain khusus bisnis Anda.",
                icon: Globe
            },
            {
                title: "Self-Managed VPS (Investasi Aset)",
                desc: "Gunakan VPS pribadi untuk kendali penuh. Kami setup, konfigurasi, dan amankan sistem di dalamnya.",
                icon: HardDrive
            },
            {
                title: "Investasi Jangka Panjang",
                desc: "Memiliki server sendiri adalah investasi digital. Kontrol 100% atas data dan skalabilitas server.",
                icon: TrendingUp
            }
        ],
        whyChooseTitle: "Mengapa Memilih Axon Custom?",
        whyChooseDesc: "Sangat ideal untuk perusahaan konstruksi dengan manajemen proyek yang rumit, pabrik dengan alur produksi khusus, atau organisasi besar yang membutuhkan sinkronisasi data antar departemen yang sangat ketat. Dengan opsi server mandiri, Anda membangun aset digital yang kuat untuk masa depan perusahaan.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Axon Custom (As Needed)",
        subtitle: "Exclusive, Flexible, and Totally Integrated ERP Solution.",
        fullDescription: "Full Description",
        description: "The Axon Custom package is designed for companies with unique, complex workflows or existing digital ecosystems (legacy systems) that need to be maintained. We build additional features on top of our stable technology foundation, ensuring you get full flexibility while still enjoying optimal system performance.",
        keyAdvantages: "Key Advantages",
        advantages: [
            {
                title: "Custom Fit Development",
                desc: "Specific feature development based on in-depth analysis of your company's SOP. Every button, form, and report is custom-made.",
                icon: Monitor
            },
            {
                title: "Legacy System Integration",
                desc: "Your new ERP can 'talk' to old systems (old databases, attendance machines, 3rd party software) through secure APIs.",
                icon: Link2
            },
            {
                title: "Feature Exclusivity",
                desc: "Have a competitive advantage with special features your competitors don't have. Full control over data processing.",
                icon: Sparkles
            },
            {
                title: "Always Compatible Backend",
                desc: "Core structure is maintained to ensure system stability, easy maintenance, and compatibility with security updates.",
                icon: ShieldCheck
            }
        ],
        infrastructureTitle: "Flexible Server & Infrastructure",
        infrastructureDesc: "We provide freedom for you in managing your company's data infrastructure:",
        infrastructures: [
            {
                title: "Managed Hosting",
                desc: "Use our optimized servers with a specific domain/subdomain for your business.",
                icon: Globe
            },
            {
                title: "Self-Managed VPS (Asset Investment)",
                desc: "Use private VPS for full control. We handle setup, configuration, and system security inside.",
                icon: HardDrive
            },
            {
                title: "Long-term Investment",
                desc: "Owning your own server is a digital investment. 100% control over data and server scalability.",
                icon: TrendingUp
            }
        ],
        whyChooseTitle: "Why Choose Axon Custom?",
        whyChooseDesc: "Ideal for construction companies with complex project management, factories with specific production flows, or large organizations needing tight inter-department data sync. With standalone server options, you build a strong digital asset for the company's future.",
        closeBtn: "Close"
    }
}

// Re-using Globe icon from Lucide since it wasn't in the initial import but used in translation
import { Globe } from "lucide-react"

export function CustomDetailModal({ isOpen, onClose }: CustomDetailModalProps) {
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
                            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-purple-600/20 via-transparent to-transparent -z-10" />

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
                                    <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20">
                                        <Layers className="text-white" size={40} />
                                    </div>
                                    <div>
                                        <span className="inline-block px-4 py-1.5 rounded-full bg-purple-600/10 text-purple-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                            Axon Custom
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
                                    {/* Left Side: Descriptions & Key Advantages */}
                                    <div className="lg:col-span-7 space-y-10">
                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-600 mb-4 flex items-center gap-2">
                                                <Info size={14} />
                                                {t.fullDescription}
                                            </h3>
                                            <div className="text-muted-foreground leading-relaxed font-medium text-[10px] md:text-sm">
                                                <p>{t.description}</p>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-600 mb-6">
                                                {t.keyAdvantages}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {t.advantages.map((adv, idx) => (
                                                    <div key={idx} className="p-5 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center shrink-0 text-purple-600">
                                                            <adv.icon size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-1">{adv.title}</h4>
                                                            <p className="text-[9px] text-muted-foreground leading-relaxed font-medium">{adv.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Side: Infrastructure & Why Choose */}
                                    <div className="lg:col-span-5 space-y-10">
                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-600 mb-6">
                                                {t.infrastructureTitle}
                                            </h3>
                                            <div className="space-y-4">
                                                <p className="text-[10px] md:text-sm text-muted-foreground font-medium mb-4">{t.infrastructureDesc}</p>
                                                {t.infrastructures.map((infra, idx) => (
                                                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-purple-600/5 border border-purple-600/10">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 text-white shadow-sm">
                                                            <infra.icon size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-0.5 tracking-tight">{infra.title}</h4>
                                                            <p className="text-[9px] text-muted-foreground leading-relaxed font-medium">{infra.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl overflow-hidden relative">
                                            {/* Decorative Background Icon */}
                                            <Server className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32 rotate-12" />

                                            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-purple-400 mb-3">
                                                {t.whyChooseTitle}
                                            </h4>
                                            <p className="text-[10px] md:text-sm text-slate-300 leading-relaxed relative z-10 font-medium italic">
                                                "{t.whyChooseDesc}"
                                            </p>
                                        </section>
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="mt-12 pt-8 border-t border-border/50 flex justify-end">
                                    <Button
                                        onClick={onClose}
                                        className="rounded-2xl px-12 h-14 bg-purple-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95"
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
