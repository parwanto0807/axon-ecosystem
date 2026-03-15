"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
    BarChart3,
    Linkedin,
    Instagram,
    Youtube,
    Twitter,
    Facebook,
    MapPin,
    Phone,
    Mail,
    MessageCircle,
    Rocket,
    Calendar,
    ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

const translations = {
    ID: {
        tagline: "Satu Ekosistem, Untuk Semua Skala Bisnis",
        stayConnected: "Tetap terhubung dengan insight dan update terbaru dari Axon.",
        products: "PRODUK",
        solutions: "SOLUSI",
        resources: "SUMBER DAYA",
        company: "PERUSAHAAN",
        productLinks: {
            erp: "Axon ERP",
            hrm: "Axon HRM",
            guard: "Axon Guard",
            service: "Axon Service",
            pricing: "Harga",
            demo: "Demo"
        },
        solutionLinks: {
            industry: "Untuk Industri",
            foundation: "Untuk Yayasan",
            housing: "Untuk Perumahan",
            umkm: "Untuk UMKM",
            compare: "Bandingkan Modul",
            custom: "Custom Development"
        },
        resourceLinks: {
            blog: "Blog",
            caseStudy: "Studi Kasus",
            docs: "Dokumentasi",
            ebook: "eBook & Whitepaper",
            webinar: "Webinar",
            faq: "FAQ"
        },
        companyLinks: {
            about: "Tentang",
            team: "Tim",
            career: "Karir",
            contact: "Kontak",
            partner: "Mitra",
            press: "Press"
        },
        office: "Kantor:",
        cities: "Jakarta | Surabaya | Bandung",
        support: "Support:",
        sales: "Sales:",
        needHelp: "Butuh bantuan?",
        freeConsult: "Konsultasi Gratis",
        scheduleDemo: "Jadwalkan Demo",
        copyright: "© 2026 Axon Ecosystem. All rights reserved.",
        privacy: "Kebijakan Privasi",
        terms: "Syarat & Ketentuan",
        security: "Keamanan",
        sitemap: "Sitemap",
        paymentMethods: "Metode Pembayaran:"
    },
    EN: {
        tagline: "One Ecosystem, For All Business Scales",
        stayConnected: "Stay connected with the latest insights and updates from Axon.",
        products: "PRODUCTS",
        solutions: "SOLUTIONS",
        resources: "RESOURCES",
        company: "COMPANY",
        productLinks: {
            erp: "Axon ERP",
            hrm: "Axon HRM",
            guard: "Axon Guard",
            service: "Axon Service",
            pricing: "Pricing",
            demo: "Demo"
        },
        solutionLinks: {
            industry: "For Industry",
            foundation: "For Foundation",
            housing: "For Housing",
            umkm: "For SMEs",
            compare: "Compare Modules",
            custom: "Custom Development"
        },
        resourceLinks: {
            blog: "Blog",
            caseStudy: "Case Studies",
            docs: "Documentation",
            ebook: "eBook & Whitepaper",
            webinar: "Webinar",
            faq: "FAQ"
        },
        companyLinks: {
            about: "About",
            team: "Team",
            career: "Career",
            contact: "Contact",
            partner: "Partners",
            press: "Press"
        },
        office: "Office:",
        cities: "Jakarta | Surabaya | Bandung",
        support: "Support:",
        sales: "Sales:",
        needHelp: "Need help?",
        freeConsult: "Free Consultation",
        scheduleDemo: "Schedule Demo",
        copyright: "© 2026 Axon Ecosystem. All rights reserved.",
        privacy: "Privacy Policy",
        terms: "Terms & Conditions",
        security: "Security",
        sitemap: "Sitemap",
        paymentMethods: "Payment Methods:"
    }
}

const socialLinks = [
    { icon: Linkedin, href: "#", label: "LinkedIn", color: "hover:text-[#0A66C2]" },
    { icon: Instagram, href: "#", label: "Instagram", color: "hover:text-[#E4405F]" },
    { icon: Youtube, href: "#", label: "YouTube", color: "hover:text-[#FF0000]" },
    { icon: Twitter, href: "#", label: "Twitter", color: "hover:text-[#1DA1F2]" },
    { icon: Facebook, href: "#", label: "Facebook", color: "hover:text-[#1877F2]" },
]

export function Footer() {
    const { lang } = useLanguage()
    const t = translations[lang]

    const productLinks = [
        { name: t.productLinks.erp, href: "#products" },
        { name: t.productLinks.hrm, href: "#products" },
        { name: t.productLinks.guard, href: "#products" },
        { name: t.productLinks.service, href: "#products" },
        { name: t.productLinks.pricing, href: "#pricing" },
        { name: t.productLinks.demo, href: "#demo" },
    ]

    const solutionLinks = [
        { name: t.solutionLinks.industry, href: "#solutions" },
        { name: t.solutionLinks.foundation, href: "#solutions" },
        { name: t.solutionLinks.housing, href: "#solutions" },
        { name: t.solutionLinks.umkm, href: "#solutions" },
        { name: t.solutionLinks.compare, href: "#solutions" },
        { name: t.solutionLinks.custom, href: "#solutions" },
    ]

    const resourceLinks = [
        { name: t.resourceLinks.blog, href: "#blog" },
        { name: t.resourceLinks.caseStudy, href: "#case-study" },
        { name: t.resourceLinks.docs, href: "#docs" },
        { name: t.resourceLinks.ebook, href: "#ebook" },
        { name: t.resourceLinks.webinar, href: "#webinar" },
        { name: t.resourceLinks.faq, href: "#faq" },
    ]

    const companyLinks = [
        { name: t.companyLinks.about, href: "#about" },
        { name: t.companyLinks.team, href: "#team" },
        { name: t.companyLinks.career, href: "#career" },
        { name: t.companyLinks.contact, href: "#contact" },
        { name: t.companyLinks.partner, href: "#partner" },
        { name: t.companyLinks.press, href: "#press" },
    ]

    return (
        <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 glowing-grid" />
            </div>

            {/* Glow Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />

            <div className="relative container mx-auto px-4 md:px-6 py-10 md:py-16">
                {/* Top Section: Logo, Tagline & Social */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    {/* Logo & Tagline */}
                    <div className="flex flex-col gap-4">
                        <Link href="/" className="flex items-center gap-3.5 group">
                            <motion.div
                                whileHover={{ rotate: -15, scale: 1.15 }}
                                className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(79,70,229,0.5)] border border-white/20"
                            >
                                <BarChart3 className="text-white w-7 h-7" />
                            </motion.div>
                            <div className="flex flex-col">
                                <span className="font-black text-3xl tracking-tighter text-white leading-[0.9]">
                                    AXON
                                </span>
                                <span className="text-[10px] font-black text-indigo-400 tracking-[0.4em] uppercase">
                                    Ecosystem
                                </span>
                            </div>
                        </Link>
                        <p className="text-slate-400 text-sm max-w-md font-medium">
                            {t.tagline}
                        </p>
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                            {t.stayConnected}
                        </div>
                    </div>

                    {/* Social Media Links */}
                    <div className="flex flex-wrap gap-3">
                        {socialLinks.map((social) => (
                            <motion.a
                                key={social.label}
                                href={social.href}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={`w-11 h-11 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-slate-400 transition-all duration-300 ${social.color} hover:bg-white/10 hover:border-white/20 hover:shadow-lg`}
                                aria-label={social.label}
                            >
                                <social.icon size={18} />
                            </motion.a>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

                {/* Main Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
                    {/* Products Column */}
                    <div>
                        <h3 className="text-[10px] font-black text-white/90 uppercase tracking-[0.3em] mb-6">
                            {t.products}
                        </h3>
                        <ul className="space-y-3">
                            {productLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Solutions Column */}
                    <div>
                        <h3 className="text-[10px] font-black text-white/90 uppercase tracking-[0.3em] mb-6">
                            {t.solutions}
                        </h3>
                        <ul className="space-y-3">
                            {solutionLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h3 className="text-[10px] font-black text-white/90 uppercase tracking-[0.3em] mb-6">
                            {t.resources}
                        </h3>
                        <ul className="space-y-3">
                            {resourceLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h3 className="text-[10px] font-black text-white/90 uppercase tracking-[0.3em] mb-6">
                            {t.company}
                        </h3>
                        <ul className="space-y-3">
                            {companyLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                                    >
                                        <ChevronRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

                {/* Contact Information */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Office Locations */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                <MapPin size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">{t.office}</p>
                                <p className="text-sm font-semibold">{t.cities}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-white/90">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                <Phone size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">+62 21 1234 5678</p>
                            </div>
                        </div>
                    </div>

                    {/* Email Contacts */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                <Mail size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">hello@axonecosystem.com</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-sm text-slate-400">
                            <span className="font-bold text-indigo-400">{t.support}</span>
                            <a href="mailto:support@axonecosystem.com" className="hover:text-indigo-400 transition-colors">
                                support@axonecosystem.com
                            </a>
                        </div>

                        <div className="flex items-start gap-3 text-sm text-slate-400">
                            <span className="font-bold text-indigo-400">{t.sales}</span>
                            <a href="mailto:sales@axonecosystem.com" className="hover:text-indigo-400 transition-colors">
                                sales@axonecosystem.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <Button className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm font-bold text-sm transition-all duration-300 group">
                        <MessageCircle size={18} className="mr-2 group-hover:rotate-12 transition-transform" />
                        {t.needHelp}
                    </Button>
                    <Button className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] transition-all duration-300 group">
                        <Rocket size={18} className="mr-2 group-hover:translate-y-[-2px] transition-transform" />
                        {t.freeConsult}
                    </Button>
                    <Button className="h-14 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] transition-all duration-300 group">
                        <Calendar size={18} className="mr-2 group-hover:scale-110 transition-transform" />
                        {t.scheduleDemo}
                    </Button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                {/* Bottom Section: Copyright & Legal */}
                <div className="space-y-6">
                    {/* Copyright */}
                    <div className="text-center">
                        <p className="text-slate-500 text-sm font-medium mb-4">
                            {t.copyright}
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
                            <Link href="#privacy" className="hover:text-indigo-400 transition-colors font-medium">
                                {t.privacy}
                            </Link>
                            <span className="text-slate-700">|</span>
                            <Link href="#terms" className="hover:text-indigo-400 transition-colors font-medium">
                                {t.terms}
                            </Link>
                            <span className="text-slate-700">|</span>
                            <Link href="#security" className="hover:text-indigo-400 transition-colors font-medium">
                                {t.security}
                            </Link>
                            <span className="text-slate-700">|</span>
                            <Link href="#sitemap" className="hover:text-indigo-400 transition-colors font-medium">
                                {t.sitemap}
                            </Link>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            {t.paymentMethods}
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {["Visa", "Mastercard", "BCA", "Mandiri", "Permata"].map((method) => (
                                <div
                                    key={method}
                                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-slate-400 text-xs font-bold hover:bg-white/10 transition-all duration-200"
                                >
                                    {method}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
