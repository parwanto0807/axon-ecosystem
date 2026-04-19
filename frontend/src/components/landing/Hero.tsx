"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, PlayCircle, ShieldCheck, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { useSession } from "next-auth/react"

const translations = {
    ID: {
        badge: "Ready-to-Use, Built-to-Fit",
        title1: "Satu",
        title2: "Ekosistem,",
        title3: "Software Siap Pakai. Fleksibel Disesuaikan.",
        description: "Axon Ecosystem hadir dengan solusi siap pakai yang mengadopsi best-practice industri, namun tetap memberikan kebebasan penuh untuk dikustomisasi sesuai alur bisnis unik Anda. Instant Foundation, Infinite Flexibility.",
        cta1: "Konsultasi Strategi",
        cta2: "Coba Demo"
    },
    EN: {
        badge: "Ready-to-Use, Built-to-Fit",
        title1: "One",
        title2: "Ecosystem,",
        title3: "Instant Foundation. Infinite Flexibility.",
        description: "Axon Ecosystem provides ready-to-go modules built on industry best practices, while offering full freedom to customize for your unique business processes. Software that fits, not just works.",
        cta1: "Strategy Session",
        cta2: "Live Demo"
    }
}

export function Hero() {
    const { lang } = useLanguage()
    const { status } = useSession()
    const t = translations[lang]
    const isAuthenticated = status === "authenticated"

    return (
        <section className="relative pt-16 pb-8 md:pt-40 md:pb-20 overflow-hidden min-h-[90vh] flex items-center justify-center">
            {/* ... (backgrounds remain same) ... */}
            <div className="absolute inset-0 glowing-grid -z-10 opacity-30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] hero-glow blur-[120px] rounded-full -z-10 opacity-50" />

            {/* ... (blobs remain same) ... */}
            <motion.div
                animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full -z-10"
            />
            <motion.div
                animate={{ y: [0, 20, 0], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 blur-[100px] rounded-full -z-10"
            />

            <div className="container mx-auto px-4 md:px-6 relative">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-20">
                    <div className="flex-1 text-left">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white dark:bg-slate-900 border border-border/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] mb-8 md:mb-12"
                        >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>{t.badge}</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                            className="mb-8 lg:max-w-4xl"
                        >
                            <div className="flex flex-col gap-0 mb-4 sm:mb-8">
                                <span className="text-xl sm:text-3xl md:text-5xl font-light text-muted-foreground/60 tracking-tight mb-2">{t.title1}</span>
                                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black text-foreground tracking-[-0.06em] leading-[0.9] sm:leading-[0.8] mb-4 sm:mb-6">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-tr from-indigo-800 via-indigo-600 to-indigo-400">
                                        {t.title2}
                                    </span>
                                </h1>
                            </div>
                            <div className="flex flex-col gap-2 sm:gap-4">
                                <span className="text-lg sm:text-2xl md:text-4xl font-light text-muted-foreground/80 tracking-tight">
                                    {t.title3.split('.')[0]}.
                                </span>
                                <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-foreground italic tracking-tighter uppercase">
                                    {t.title3.split('.')[1]}
                                    <span className="inline-block w-2 h-2 sm:w-4 sm:h-4 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] ml-2 sm:ml-4" />
                                </h2>
                            </div>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            className="text-muted-foreground text-[10px] sm:text-base md:text-xl max-w-2xl mb-8 sm:mb-16 font-medium leading-relaxed"
                        >
                            {t.description}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
                            className="flex flex-row items-center gap-2 sm:gap-6 w-full max-w-xl"
                        >
                            <Button size="lg" className="flex-1 rounded-2xl px-4 md:px-12 h-14 md:h-20 text-[9px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] bg-indigo-600 hover:bg-slate-900 text-white border-t border-white/20 group glow-button transition-all duration-300 active:scale-95">
                                <span className="mr-2 md:mr-3 text-base md:text-xl">📞</span>
                                {t.cta1}
                            </Button>
                            <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex-1">
                                <Button size="lg" className="flex-1 rounded-2xl px-4 md:px-12 h-14 md:h-20 text-[9px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 hover:border-indigo-600/30 transition-all duration-300 shadow-xl shadow-indigo-600/5 flex items-center justify-center gap-2 active:scale-95 group">
                                    <PlayCircle className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform w-4 h-4 md:w-6 md:h-6" />
                                    {isAuthenticated ? (lang === 'ID' ? 'Dashboard' : 'Dashboard') : t.cta2}
                                </Button>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Interactive Dashboard Mockup Area */}
                    <div className="flex-1 relative hidden lg:block">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="relative z-10 aspect-[4/3] w-full glass rounded-[3rem] border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden p-2"
                        >
                            <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative group">
                                <img
                                    src="/images/dashboard-mockup.png"
                                    alt="Axon Dashboard Mockup"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-indigo-600/5 mix-blend-overlay" />
                            </div>
                        </motion.div>

                        {/* Floating Live Insight Cards */}
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-10 -right-10 z-20 glass p-5 rounded-2xl border border-indigo-200 shadow-xl max-w-[280px]"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                                    <Sparkles size={16} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'Insight Langsung' : 'Live Insight'}</span>
                            </div>
                            <p className="text-xs font-bold text-foreground leading-snug">
                                {lang === 'ID' ? 'PT Maju Jaya - Sales Order masuk: Rp 450 Juta' : 'PT Maju Jaya - Sales Order received: $30k'}
                            </p>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-10 -left-20 z-20 glass p-5 rounded-2xl border border-purple-200 shadow-xl max-w-[280px]"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'Status Keamanan' : 'Security Status'}</span>
                            </div>
                            <p className="text-xs font-bold text-foreground leading-snug">
                                {lang === 'ID' ? 'Cluster Emerald - Patroli malam selesai 100%' : 'Emerald Cluster - Night patrol completed 100%'}
                            </p>
                        </motion.div>

                        <motion.div
                            animate={{ x: [0, 10, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -bottom-16 right-0 z-20 glass p-5 rounded-2xl border border-cyan-200 shadow-xl max-w-[280px]"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                                    <BarChart3 className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{lang === 'ID' ? 'Alert Stok' : 'Stock Alert'}</span>
                            </div>
                            <p className="text-xs font-bold text-foreground leading-snug">
                                {lang === 'ID' ? 'UMKM Berkah - Stok menipis, pesan ulang?' : 'UMKM Berkah - Low stock, reorder now?'}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}
