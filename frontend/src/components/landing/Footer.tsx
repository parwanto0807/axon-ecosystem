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
        tagline: "Solusi TI Terpadu — Dari Bekasi untuk Indonesia",
        stayConnected: "PT. Intech Mitra Abadi — Development, Maintenance IT & IoT.",
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
        office: "PT. Intech Mitra Abadi",
        cities: "BEKASI",
        support: "Support:",
        sales: "Sales:",
        needHelp: "Butuh bantuan?",
        freeConsult: "Konsultasi Gratis",
        scheduleDemo: "Jadwalkan Demo",
        copyright: "© 2026 PT. Intech Mitra Abadi. All rights reserved.",
        privacy: "Kebijakan Privasi",
        terms: "Syarat & Ketentuan",
        security: "Keamanan",
        sitemap: "Sitemap",
        paymentMethods: "Metode Pembayaran:"
    },
    EN: {
        tagline: "Integrated IT Solutions — From Bekasi, Indonesia",
        stayConnected: "PT. Intech Mitra Abadi — Software Development, IT Maintenance & IoT.",
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
        office: "PT. Intech Mitra Abadi",
        cities: "BEKASI",
        support: "Support:",
        sales: "Sales:",
        needHelp: "Need help?",
        freeConsult: "Free Consultation",
        scheduleDemo: "Schedule Demo",
        copyright: "© 2026 PT. Intech Mitra Abadi. All rights reserved.",
        privacy: "Privacy Policy",
        terms: "Terms & Conditions",
        security: "Security",
        sitemap: "Sitemap",
        paymentMethods: "Payment Methods:"
    }
}

const socialLinks: { icon: any; href: string; label: string }[] = []

export function Footer() {
    const { lang } = useLanguage()
    const t = translations[lang]

    const productLinks = [
        { name: t.productLinks.erp, href: "#products" },
        { name: t.productLinks.hrm, href: "#products" },
        { name: t.productLinks.guard, href: "#products" },
        { name: t.productLinks.service, href: "#products" },
        { name: t.productLinks.pricing, href: "#pricing" },
    ]

    const solutionLinks = [
        { name: t.solutionLinks.industry, href: "#solutions" },
        { name: t.solutionLinks.foundation, href: "#solutions" },
        { name: t.solutionLinks.umkm, href: "#solutions" },
    ]

    const resourceLinks = [
        { name: t.resourceLinks.caseStudy, href: "#case-study" },
        { name: t.resourceLinks.faq, href: "#faq" },
    ]

    const companyLinks = [
        { name: t.companyLinks.about, href: "#about" },
        { name: t.companyLinks.contact, href: "#contact" },
    ]

    const linkColumns = [
        { heading: t.products, links: productLinks },
        { heading: t.solutions, links: solutionLinks },
        { heading: t.resources, links: resourceLinks },
        { heading: t.company, links: companyLinks },
    ]

    return (
        <footer className="bg-slate-900 text-slate-100">
            <div className="mx-auto max-w-480 px-6 py-16 md:py-20">
                {/* Top: Logo + Social */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex flex-col gap-3">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-12 h-12 rounded-xl bg-slate-100/10 flex items-center justify-center">
                                <BarChart3 className="text-slate-100 w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-2xl tracking-tighter text-slate-100 leading-none">AXON</span>
                                <span className="text-[10px] font-semibold text-slate-400/50 tracking-[0.3em] uppercase">
                                    Ecosystem
                                </span>
                            </div>
                        </Link>
                        <p className="text-slate-400/60 text-sm max-w-md font-medium">{t.tagline}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {socialLinks.map((social) => (
                            <motion.a
                                key={social.label}
                                href={social.href}
                                whileHover={{ scale: 1.05 }}
                                className="w-10 h-10 rounded-lg bg-slate-100/5 border border-slate-100/10 flex items-center justify-center text-slate-400/50 hover:text-slate-100 hover:bg-slate-100/10 transition-colors"
                                aria-label={social.label}
                            >
                                <social.icon size={16} />
                            </motion.a>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-slate-100/10 mb-12" />

                {/* Link Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
                    {linkColumns.map((col) => (
                        <div key={col.heading}>
                            <h3 className="text-[10px] font-bold text-slate-400/40 uppercase tracking-[0.2em] mb-5">
                                {col.heading}
                            </h3>
                            <ul className="space-y-3">
                                {col.links.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.href}
                                            className="text-slate-400/60 hover:text-slate-100 text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
                                        >
                                            <ChevronRight size={12} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="h-px bg-slate-100/10 mb-12" />

                {/* Contact */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100/5 flex items-center justify-center">
                                <MapPin size={16} className="text-slate-400/50" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400/40">{t.office}</p>
                                <p className="text-sm font-medium text-slate-100">{t.cities}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100/5 flex items-center justify-center">
                                <Phone size={16} className="text-slate-400/50" />
                            </div>
                            <p className="text-sm font-medium text-slate-100">0812 8021 2068</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100/5 flex items-center justify-center">
                                <Mail size={16} className="text-slate-400/50" />
                            </div>
                            <p className="text-sm font-medium text-slate-100">admin-user@solusiit.id</p>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <span className="font-semibold text-slate-400/50">{t.support}</span>
                            <a href="mailto:admin-user@solusiit.id" className="text-slate-400/60 hover:text-slate-100 transition-colors">
                                admin-user@solusiit.id
                            </a>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <span className="font-semibold text-slate-400/50">{t.sales}</span>
                            <a href="mailto:admin-user@solusiit.id" className="text-slate-400/60 hover:text-slate-100 transition-colors">
                                admin-user@solusiit.id
                            </a>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100/10 mb-12" />

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
                    <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20butuh%20bantuan" target="_blank" rel="noopener noreferrer">
                        <Button className="h-12 px-6 rounded-xl text-sm font-semibold bg-slate-100/5 hover:bg-slate-100/10 text-slate-100 border border-slate-100/10 transition-colors">
                            <MessageCircle size={16} className="mr-2" />
                            {t.needHelp}
                        </Button>
                    </Link>
                    <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20ingin%20konsultasi%20gratis" target="_blank" rel="noopener noreferrer">
                        <Button className="h-12 px-6 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-100/90 text-slate-900 transition-colors">
                            <Rocket size={16} className="mr-2" />
                            {t.freeConsult}
                        </Button>
                    </Link>
                    <Link href="https://wa.me/6281280212068?text=Halo%20Axon,%20saya%20ingin%20jadwalkan%20demo" target="_blank" rel="noopener noreferrer">
                        <Button className="h-12 px-6 rounded-xl text-sm font-semibold bg-slate-100/10 hover:bg-slate-100/15 text-slate-100 border border-slate-100/15 transition-colors">
                            <Calendar size={16} className="mr-2" />
                            {t.scheduleDemo}
                        </Button>
                    </Link>
                </div>

                <div className="h-px bg-slate-100/10 mb-8" />

                {/* Bottom */}
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-slate-400/40 text-sm font-medium mb-4">{t.copyright}</p>
                        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400/40">
                            <Link href="#privacy" className="hover:text-slate-100/70 transition-colors font-medium">{t.privacy}</Link>
                            <span className="text-slate-100/20">|</span>
                            <Link href="#terms" className="hover:text-slate-100/70 transition-colors font-medium">{t.terms}</Link>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400/30">
                            {t.paymentMethods}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {["Visa", "Mastercard", "BCA", "Mandiri", "Permata"].map((method) => (
                                <span key={method} className="px-3 py-1.5 rounded-lg bg-slate-100/5 border border-slate-100/10 text-slate-400/40 text-xs font-medium">
                                    {method}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
