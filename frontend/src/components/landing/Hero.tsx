"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, PlayCircle, TrendingUp, Users, CheckCircle2, BarChart3, Package, DollarSign, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { useSession } from "next-auth/react"

const translations = {
    ID: {
        label: "Platform Manajemen Bisnis Terpadu",
        title: "Satu Ekosistem untuk Mengelola ",
        highlight: "Seluruh Operasional Bisnis Anda",
        subtitle: "ERP, HRM, Security & Service dalam satu platform. Siap pakai, fleksibel dikustomisasi. Tanpa biaya server, tanpa kompromi.",
        cta1: "Konsultasi Gratis — Hari Ini",
        cta2: "Lihat Demo 5 Menit",
        stats: [
            { value: "2020", label: "Berdiri Sejak" },
            { value: "1-4", label: "Minggu Implementasi" },
            { value: "99.9%", label: "Uptime" },
        ],
        urgency: "Tim kami siap demo dalam 1x24 jam setelah Anda menghubungi."
    },
    EN: {
        label: "Integrated Business Management Platform",
        title: "One Ecosystem to Run ",
        highlight: "Your Entire Business",
        subtitle: "ERP, HRM, Security & Service in one platform. Ready-to-use, fully customizable. No server costs, no compromises.",
        cta1: "Free Consultation — Today",
        cta2: "5-Minute Demo",
        stats: [
            { value: "2020", label: "Est. Since" },
            { value: "1-4", label: "Weeks to Launch" },
            { value: "99.9%", label: "Uptime" },
        ],
        urgency: "Our team responds within 24 hours of your inquiry."
    }
}

export function Hero() {
    const { lang } = useLanguage()
    const { status } = useSession()
    const t = translations[lang]
    const isAuthenticated = status === "authenticated"

    return (
        <section className="relative min-h-[80vh] flex items-center pt-20 pb-12 md:pt-24 md:pb-16 overflow-hidden hero-mesh">
            {/* Triangular mesh SVG pattern */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="heroTri" x="0" y="0" width="120" height="104" patternUnits="userSpaceOnUse">
                        <path d="M0 104L60 0l60 104H0z" fill="none" className="stroke-[#10B981] dark:stroke-[#00C9A7]" strokeWidth="0.5" strokeOpacity="0.10" />
                        <path d="M60 0l60 104l60-104" fill="none" className="stroke-[#10B981] dark:stroke-[#00C9A7]" strokeWidth="0.5" strokeOpacity="0.08" />
                        <path d="M0 104l60 0l0-52l-60 52z" fill="none" className="stroke-[#10B981] dark:stroke-[#00C9A7]" strokeWidth="0.4" strokeOpacity="0.06" />
                        <path d="M60 0l0 104l60 0" fill="none" className="stroke-[#10B981] dark:stroke-[#00C9A7]" strokeWidth="0.4" strokeOpacity="0.05" />
                    </pattern>
                    <mask id="heroFade">
                        <rect width="100%" height="100%" fill="url(#heroFadeGrad)" />
                    </mask>
                    <linearGradient id="heroFadeGrad" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                        <stop offset="45%" stopColor="white" stopOpacity="0.15" />
                        <stop offset="65%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#heroTri)" mask="url(#heroFade)" />
            </svg>

            <div className="relative z-10 mx-auto max-w-7xl px-6 w-full">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Text Column */}
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-[11px] font-semibold tracking-wide mb-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {t.label}
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-4 text-balance"
                        >
                            {t.title}
                            <span className="text-primary">{t.highlight}</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                            className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed max-w-xl mb-6"
                        >
                            {t.subtitle}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                            className="flex flex-col sm:flex-row gap-3 mb-4"
                        >
                            <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20tertarik%20untuk%20konsultasi%20gratis" target="_blank" rel="noopener noreferrer">
                                <Button size="lg" className="h-12 px-6 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
                                    {t.cta1}
                                    <ArrowRight size={14} className="ml-2" />
                                </Button>
                            </Link>
                            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                                <Button size="lg" variant="outline" className="h-12 px-6 rounded-xl text-xs font-semibold border-2 hover:bg-muted/50 transition-all">
                                    <PlayCircle size={14} className="mr-2" />
                                    {isAuthenticated ? (lang === 'ID' ? 'Dashboard' : 'Dashboard') : t.cta2}
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-[10px] font-medium text-muted-foreground/70 mb-10"
                        >
                            {t.urgency}
                        </motion.p>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="flex gap-10 sm:gap-16 pt-6 border-t border-border"
                        >
                            {t.stats.map((stat, i) => (
                                <div key={i}>
                                    <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{stat.value}</div>
                                    <div className="text-[10px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Illustrated Dashboard — No Image */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/2 rounded-[2.5rem] -rotate-2" />
                            <div className="absolute -inset-4 bg-primary/2 rounded-[2.5rem] rotate-1" />

                            {/* Simulated Dashboard UI */}
                            <div className="relative rounded-2xl border border-border bg-card shadow-xl overflow-hidden p-4 md:p-5">
                                {/* Dashboard Top Bar */}
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                            <BarChart3 className="text-primary-foreground w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-foreground">Axon Dashboard</div>
                                            <div className="text-[10px] text-muted-foreground">{lang === 'ID' ? 'Overview Hari Ini' : "Today's Overview"}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-semibold text-muted-foreground">{lang === 'ID' ? 'Online' : 'Online'}</span>
                                    </div>
                                </div>

                                {/* KPI Cards Row */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {[
                                        { icon: DollarSign, label: lang === 'ID' ? 'Pendapatan' : 'Revenue', value: 'Rp 847M', change: '+12.5%', up: true, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                        { icon: ShoppingCart, label: lang === 'ID' ? 'Pesanan' : 'Orders', value: '2,847', change: '+8.2%', up: true, color: 'text-primary', bg: 'bg-primary/10' },
                                        { icon: Package, label: lang === 'ID' ? 'Stok' : 'Stock', value: '14,203', change: '-3.1%', up: false, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                    ].map((kpi, i) => (
                                        <div key={i} className={`p-2.5 rounded-lg border border-border ${kpi.bg}`}>
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <kpi.icon size={12} className={kpi.color} />
                                                <span className="text-[9px] font-medium text-muted-foreground">{kpi.label}</span>
                                            </div>
                                            <div className="text-xs font-black text-foreground mb-0.5">{kpi.value}</div>
                                            <span className={`text-[9px] font-bold ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>{kpi.change}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Chart Placeholder */}
                                <div className="h-24 rounded-lg border border-border bg-muted/30 p-3 mb-4 relative overflow-hidden">
                                    <div className="flex items-end gap-2 h-full">
                                        {[60, 85, 45, 92, 70, 55, 88, 75, 95, 65, 80, 50].map((h, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                                                className="flex-1 rounded-t-sm bg-primary/20"
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
                                </div>

                                {/* Bottom Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={14} className="text-emerald-500" />
                                            <span className="text-[10px] font-medium text-muted-foreground">{lang === 'ID' ? 'Target Bulanan' : 'Monthly Target'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full w-[78%] rounded-full bg-emerald-500" />
                                            </div>
                                            <span className="text-[10px] font-bold text-foreground">78%</span>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-border bg-muted/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users size={14} className="text-primary" />
                                            <span className="text-[10px] font-medium text-muted-foreground">{lang === 'ID' ? 'Karyawan Hadir' : 'Present Today'}</span>
                                        </div>
                                        <div className="text-sm font-black text-foreground">142 / 150</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badge */}
                            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                    <span className="text-xs font-semibold text-foreground">{lang === 'ID' ? 'Semua Modul Sinkron' : 'All Modules Synced'}</span>
                                </div>
                            </div>

                            <div className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-xl px-4 py-2 shadow-lg">
                                <span className="text-[10px] font-bold uppercase tracking-wider">{lang === 'ID' ? 'Real-time' : 'Real-time'}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
