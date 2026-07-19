"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, Layers, Link2, Monitor, ShieldCheck, Server, HardDrive, TrendingUp, Info, Globe } from "lucide-react"
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
        description: "Paket Axon Custom dirancang bagi perusahaan dengan alur kerja unik, kompleks, atau yang sudah memiliki ekosistem digital (legacy system). Kami membangun fitur tambahan di atas fondasi teknologi kami yang stabil.",
        keyAdvantages: "Keunggulan Utama",
        advantages: [
            { title: "Custom Fit Development", desc: "Pengembangan fitur spesifik berdasarkan analisis mendalam SOP perusahaan Anda.", icon: Monitor },
            { title: "Integrasi Legacy System", desc: "ERP baru terhubung dengan sistem lama melalui API yang aman.", icon: Link2 },
            { title: "Eksklusivitas Fitur", desc: "Miliki keunggulan kompetitif dengan fitur khusus yang tidak dimiliki kompetitor.", icon: Sparkles },
            { title: "Backend Tetap Kompatibel", desc: "Struktur inti terjaga agar tetap stabil dan kompatibel dengan pembaruan.", icon: ShieldCheck }
        ],
        infrastructureTitle: "Server & Infrastruktur",
        infrastructureDesc: "Kebebasan penuh dalam mengelola infrastruktur data perusahaan:",
        infrastructures: [
            { title: "Managed Hosting", desc: "Menumpang di server teroptimasi kami dengan domain khusus bisnis Anda.", icon: Globe },
            { title: "Self-Managed VPS", desc: "VPS pribadi untuk kendali penuh — kami setup, konfigurasi, dan amankan.", icon: HardDrive },
            { title: "Investasi Jangka Panjang", desc: "Server sendiri adalah investasi digital — kontrol 100% atas data.", icon: TrendingUp }
        ],
        whyChooseTitle: "Mengapa Memilih Axon Custom?",
        whyChooseDesc: "Ideal untuk perusahaan konstruksi dengan manajemen proyek kompleks, pabrik dengan alur produksi khusus, atau organisasi besar dengan kebutuhan sinkronisasi data antar departemen.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Axon Custom (Tailored)",
        subtitle: "Exclusive, Flexible, and Fully Integrated ERP Solution.",
        fullDescription: "Full Description",
        description: "The Axon Custom package is designed for companies with unique, complex workflows or existing digital ecosystems. We build additional features on top of our stable technology foundation.",
        keyAdvantages: "Key Advantages",
        advantages: [
            { title: "Custom Fit Development", desc: "Specific feature development based on in-depth analysis of your SOP.", icon: Monitor },
            { title: "Legacy System Integration", desc: "Your ERP connects to old systems through secure APIs.", icon: Link2 },
            { title: "Feature Exclusivity", desc: "Competitive advantage with features your competitors don't have.", icon: Sparkles },
            { title: "Always Compatible Backend", desc: "Core structure maintained for stability and compatibility with updates.", icon: ShieldCheck }
        ],
        infrastructureTitle: "Server & Infrastructure",
        infrastructureDesc: "Full freedom in managing your company's data infrastructure:",
        infrastructures: [
            { title: "Managed Hosting", desc: "Use our optimized servers with a dedicated domain for your business.", icon: Globe },
            { title: "Self-Managed VPS", desc: "Private VPS for full control — we handle setup, configuration, and security.", icon: HardDrive },
            { title: "Long-term Investment", desc: "Own server is a digital investment — 100% control over data.", icon: TrendingUp }
        ],
        whyChooseTitle: "Why Choose Axon Custom?",
        whyChooseDesc: "Ideal for construction companies with complex projects, factories with specific production flows, or large organizations needing tight inter-department data sync.",
        closeBtn: "Close"
    }
}

export function CustomDetailModal({ isOpen, onClose }: CustomDetailModalProps) {
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
                                        <Layers className="text-primary w-7 h-7" />
                                    </div>
                                    <div>
                                        <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
                                            Axon Custom
                                        </span>
                                        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">{t.title}</h2>
                                        <p className="text-base font-medium text-muted-foreground">{t.subtitle}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-7 space-y-8">
                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">{t.fullDescription}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">{t.description}</p>
                                        </section>

                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-5">{t.keyAdvantages}</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {t.advantages.map((adv, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                                            <adv.icon size={18} />
                                                        </div>
                                                        <h4 className="font-bold text-sm text-foreground mb-1">{adv.title}</h4>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{adv.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="lg:col-span-5 space-y-8">
                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">{t.infrastructureTitle}</h3>
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground font-medium">{t.infrastructureDesc}</p>
                                                {t.infrastructures.map((infra, idx) => (
                                                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-primary/[0.04] border border-primary/10">
                                                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0 text-primary-foreground">
                                                            <infra.icon size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground mb-0.5">{infra.title}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">{infra.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="p-6 rounded-xl bg-foreground text-background overflow-hidden relative">
                                            <Server className="absolute -right-3 -bottom-3 opacity-10 w-24 h-24" />
                                            <h4 className="font-bold text-xs uppercase tracking-[0.15em] text-background/60 mb-3">{t.whyChooseTitle}</h4>
                                            <p className="text-sm text-background/80 leading-relaxed relative z-10 font-medium italic">
                                                "{t.whyChooseDesc}"
                                            </p>
                                        </section>
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
