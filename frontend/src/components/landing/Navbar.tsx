"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Menu,
    X,
    ChevronDown,
    Globe,
    BarChart3,
    ArrowRight,
    Check,
    Lock,
    Zap
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { ModeToggle } from "@/components/mode-toggle"
import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

const translations = {
    ID: {
        beranda: "Beranda",
        produk: "Produk",
        solusi: "Solusi",
        harga: "Harga",
        tentang: "Tentang Kami",
        dashboard: "Ke Dashboard",
        pilihBahasa: "Pilih Bahasa",
        indonesia: "Bahasa Indonesia",
        inggris: "English",
        login: "Masuk",
        demo: "Jadwal Demo",
        faq: "FAQ"
    },
    EN: {
        beranda: "Home",
        produk: "Products",
        solusi: "Solutions",
        harga: "Pricing",
        tentang: "About Us",
        dashboard: "Dashboard",
        pilihBahasa: "Select Language",
        indonesia: "Indonesian",
        inggris: "English",
        login: "Login",
        demo: "Book a Demo",
        faq: "FAQ"
    }
}

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { lang, setLang } = useLanguage()
    const { status } = useSession()
    const [activeLink, setActiveLink] = useState("beranda")

    const t = translations[lang]
    const isAuthenticated = status === "authenticated"

    const navLinks = [
        { id: "beranda", name: t.beranda, href: "#beranda" },
        { id: "products", name: t.produk, href: "#products" },
        { id: "solutions", name: t.solusi, href: "#solutions" },
        { id: "pricing", name: t.harga, href: "#pricing" },
        { id: "about", name: t.tentang, href: "#about" },
        { id: "faq", name: t.faq, href: "#faq" },
    ]

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Scroll Spy Logic
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveLink(entry.target.id)
                    }
                })
            },
            {
                rootMargin: "-40% 0px -40% 0px"
            }
        )

        navLinks.forEach(({ id }) => {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        })

        return () => observer.disconnect()
    }, [navLinks])

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? "py-3.5 glass shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]"
                : "py-6 bg-transparent"
                }`}
        >
            <div className="container mx-auto px-6 h-full flex items-center justify-between">
                {/* Logo Section */}
                <Link href="/" className="flex items-center gap-3.5 group relative">
                    <motion.div
                        whileHover={{ rotate: -15, scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(79,70,229,0.3)] border border-white/20 relative overflow-hidden"
                    >
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute inset-0 bg-white/20 blur-xl"
                        />
                        <BarChart3 className="text-white w-6 h-6 relative z-10" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="font-black text-2xl tracking-tighter text-foreground leading-[0.9] flex items-center gap-1">
                            AXON
                            <motion.div
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-indigo-600 mb-2"
                            />
                        </span>
                        <span className="text-[10px] font-black text-indigo-600/60 tracking-[0.4em] uppercase">Ecosystem</span>
                    </div>
                </Link>

                {/* Desktop Menu - Professional Refined */}
                <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-border/40 shadow-sm">
                    {navLinks.map((link) => (
                        <Link
                            key={link.id}
                            href={link.href}
                            onClick={() => setActiveLink(link.id)}
                            className={`relative px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl group ${activeLink === link.id
                                ? "text-indigo-600"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <span className="relative z-10">{link.name}</span>

                            {/* Hover Background - Subtle Glow */}
                            <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                            {/* Active Indicator - Minimalist Line */}
                            {activeLink === link.id && (
                                <motion.div
                                    layoutId="navIndicator"
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]"
                                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-4">
                    {/* Language Selector Dropdown - Refined */}
                    <div className="relative group">
                        <button className="relative flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-border/80 hover:border-indigo-600/30 hover:shadow-lg transition-all duration-300 group shadow-sm">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                <Globe size={14} />
                            </div>
                            <span className="text-xs font-black text-foreground tracking-widest">{lang}</span>
                            <ChevronDown size={14} className="text-muted-foreground group-hover:rotate-180 transition-transform duration-500" />
                        </button>

                        <div className="absolute top-full right-0 mt-3 w-56 glass-card opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-4 group-hover:translate-y-0 transition-all duration-500 py-2 border border-border/50 rounded-[1.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-[60] p-1.5">
                            <div className="px-4 py-2 text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                                {t.pilihBahasa}
                            </div>
                            <button
                                onClick={() => setLang("ID")}
                                className={`w-full px-4 py-3.5 text-left flex items-center justify-between rounded-xl transition-all duration-300 ${lang === "ID"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "hover:bg-secondary text-foreground"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] font-bold tracking-tight">{t.indonesia}</span>
                                </div>
                                {lang === "ID" && <Check size={14} className="text-white" />}
                            </button>
                            <button
                                onClick={() => setLang("EN")}
                                className={`w-full px-4 py-3.5 text-left flex items-center justify-between rounded-xl transition-all duration-300 ${lang === "EN"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                    : "hover:bg-secondary text-foreground"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] font-bold tracking-tight">{t.inggris}</span>
                                </div>
                                {lang === "EN" && <Check size={14} className="text-white" />}
                            </button>
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        <ModeToggle />
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                            <Button className="relative rounded-2xl px-8 h-12 font-black text-[10px] uppercase tracking-[0.2em] bg-indigo-600 hover:bg-slate-900 text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.4)] border-t border-white/20 transition-all duration-300 group overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    {isAuthenticated ? t.dashboard : t.login}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </Button>
                        </Link>
                        
                        {isAuthenticated && (
                            <button
                                onClick={() => signOut()}
                                className="w-12 h-12 rounded-2xl bg-white border border-red-100 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm group"
                                title="Sign Out"
                            >
                                <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Action */}
                <button
                    className="lg:hidden w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <AnimatePresence mode="wait">
                        {isMobileMenuOpen
                            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}><X size={20} /></motion.div>
                            : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}><Menu size={20} /></motion.div>}
                    </AnimatePresence>
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="lg:hidden absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-xl h-screen z-[-1] pt-32 p-8 shadow-2xl flex flex-col gap-10 border-b border-border/50"
                    >
                        <div className="flex flex-col gap-6">
                            {navLinks.map((link, idx) => (
                                <motion.div
                                    key={link.id}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Link
                                        href={link.href}
                                        className="text-4xl font-black text-foreground hover:text-indigo-600 transition-all flex items-center justify-between group"
                                        onClick={() => {
                                            setActiveLink(link.id)
                                            setIsMobileMenuOpen(false)
                                        }}
                                    >
                                        <span className="tracking-tighter">{link.name}</span>
                                        <ArrowRight size={32} className="opacity-0 group-hover:opacity-100 -translate-x-8 group-hover:translate-x-0 transition-all" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-auto flex flex-col gap-6">
                            <div className="h-px bg-border/50" />
                            <div className="flex flex-col gap-4">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                                    {t.pilihBahasa}
                                </span>
                                <div className="grid grid-cols-2 gap-3 items-center">
                                    <div className="col-span-2 flex justify-end mb-2">
                                        <ModeToggle />
                                    </div>
                                    <button
                                        onClick={() => setLang("ID")}
                                        className={`px-5 py-4 rounded-[1.5rem] text-sm font-black tracking-widest transition-all ${lang === "ID"
                                            ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-600/10"
                                            : "bg-secondary/50 border border-border/80 text-foreground"
                                            }`}
                                    >
                                        INDONESIA
                                    </button>
                                    <button
                                        onClick={() => setLang("EN")}
                                        className={`px-5 py-4 rounded-[1.5rem] text-sm font-black tracking-widest transition-all ${lang === "EN"
                                            ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-600/10"
                                            : "bg-secondary/50 border border-border/80 text-foreground"
                                            }`}
                                    >
                                        ENGLISH
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Link href={isAuthenticated ? "/dashboard" : "/login"} onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] bg-indigo-600 text-white hover:bg-slate-900 shadow-2xl shadow-indigo-600/20">
                                        {isAuthenticated ? t.dashboard : t.login}
                                    </Button>
                                </Link>
                                
                                {isAuthenticated && (
                                    <button 
                                        onClick={() => signOut()}
                                        className="w-full h-14 rounded-[1.5rem] font-bold text-sm text-red-500 bg-red-50 border border-red-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                                    >
                                        <LogOut size={18} />
                                        SIGN OUT
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
