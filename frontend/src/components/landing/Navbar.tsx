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
    LayoutDashboard,
    LogIn,
    LogOut
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { ModeToggle } from "@/components/mode-toggle"
import { useSession, signOut } from "next-auth/react"

const translations = {
    ID: {
        beranda: "Beranda",
        produk: "Produk",
        solusi: "Solusi",
        harga: "Harga",
        tentang: "Tentang",
        dashboard: "Dashboard",
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
        tentang: "About",
        dashboard: "Dashboard",
        pilihBahasa: "Select Language",
        indonesia: "Indonesian",
        inggris: "English",
        login: "Login",
        demo: "Book Demo",
        faq: "FAQ"
    }
}

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [activeLink, setActiveLink] = useState("beranda")
    const [langMenuOpen, setLangMenuOpen] = useState(false)
    const { lang, setLang } = useLanguage()
    const { status } = useSession()

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
        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveLink(entry.target.id)
                })
            },
            { rootMargin: "-40% 0px -40% 0px" }
        )

        navLinks.forEach(({ id }) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [navLinks])

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled
                    ? "py-3 bg-background/80 backdrop-blur-xl border-b border-border"
                    : "py-5 bg-transparent"
            }`}
        >
            <div className="mx-auto max-w-[120rem] px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <BarChart3 className="text-primary-foreground w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xl tracking-tighter text-foreground leading-none">
                            AXON
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.25em] uppercase">
                            Ecosystem
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav Links */}
                <div className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.id}
                            href={link.href}
                            onClick={() => setActiveLink(link.id)}
                            className={`relative px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors duration-200 ${
                                activeLink === link.id
                                    ? "text-primary bg-primary/5"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Language */}
                    <div className="relative">
                        <button
                            onClick={() => setLangMenuOpen(!langMenuOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Globe size={15} />
                            <span className="text-xs font-semibold tracking-wide">{lang}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${langMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {langMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 p-1"
                                >
                                    <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t.pilihBahasa}
                                    </div>
                                    <button
                                        onClick={() => { setLang("ID"); setLangMenuOpen(false) }}
                                        className={`w-full px-3 py-2.5 text-left flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${
                                            lang === "ID" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                        }`}
                                    >
                                        {t.indonesia}
                                        {lang === "ID" && <Check size={14} />}
                                    </button>
                                    <button
                                        onClick={() => { setLang("EN"); setLangMenuOpen(false) }}
                                        className={`w-full px-3 py-2.5 text-left flex items-center justify-between rounded-lg text-sm font-medium transition-colors ${
                                            lang === "EN" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                        }`}
                                    >
                                        {t.inggris}
                                        {lang === "EN" && <Check size={14} />}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <ModeToggle />

                    <div className="w-px h-6 bg-border mx-1" />

                    {isAuthenticated ? (
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard">
                                <Button className="rounded-lg h-10 px-5 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-none transition-colors">
                                    <LayoutDashboard size={16} className="mr-2" />
                                    {t.dashboard}
                                </Button>
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="w-10 h-10 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 flex items-center justify-center transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <Link href="/login">
                            <Button className="rounded-lg h-10 px-5 text-sm font-semibold bg-foreground hover:bg-foreground/90 text-background shadow-none transition-colors">
                                {t.login}
                                <ArrowRight size={15} className="ml-2" />
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Mobile Toggle */}
                <div className="flex items-center gap-2 lg:hidden">
                    {isAuthenticated ? (
                        <Link href="/dashboard">
                            <Button className="h-9 rounded-lg px-3 text-xs font-semibold bg-primary text-primary-foreground shadow-none">
                                <LayoutDashboard size={14} />
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/login">
                            <Button className="h-9 rounded-lg px-3 text-xs font-semibold bg-foreground text-background shadow-none">
                                <LogIn size={14} />
                            </Button>
                        </Link>
                    )}

                    <button
                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg"
                    >
                        <div className="px-6 py-4 flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.id}
                                    href={link.href}
                                    onClick={() => { setActiveLink(link.id); setIsMobileMenuOpen(false) }}
                                    className={`px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                                        activeLink === link.id
                                            ? "bg-primary/10 text-primary"
                                            : "text-foreground hover:bg-muted"
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="h-px bg-border my-2" />
                            <div className="flex gap-2 px-4 py-3">
                                <button
                                    onClick={() => setLang("ID")}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                        lang === "ID" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    ID
                                </button>
                                <button
                                    onClick={() => setLang("EN")}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                        lang === "EN" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    EN
                                </button>
                            </div>
                            <div className="px-4 py-2">
                                <ModeToggle />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
