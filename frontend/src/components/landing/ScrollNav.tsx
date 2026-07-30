"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"

const sections = [
    { id: "beranda", label: { ID: "Beranda", EN: "Home" } },
    { id: "solutions", label: { ID: "Solusi", EN: "Solutions" } },
    { id: "products", label: { ID: "Produk", EN: "Products" } },
    { id: "pricing", label: { ID: "Harga", EN: "Pricing" } },
    { id: "about", label: { ID: "Tentang", EN: "About" } },
    { id: "faq", label: { ID: "FAQ", EN: "FAQ" } },
]

export function ScrollNav() {
    const [activeSection, setActiveSection] = useState("beranda")
    const { lang } = useLanguage()

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveSection(entry.target.id)
                })
            },
            { rootMargin: "-40% 0px -40% 0px" }
        )

        sections.forEach(({ id }) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [])

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id)
        if (element) element.scrollIntoView({ behavior: "smooth" })
    }

    return (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-3">
            {sections.map(({ id, label }) => (
                <div key={id} className="relative flex items-center justify-end group">
                    {/* Label */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileHover={{ opacity: 1, x: -38 }}
                        animate={{
                            opacity: activeSection === id ? 1 : 0,
                            x: activeSection === id ? -38 : 20
                        }}
                        className="absolute right-0 px-2.5 py-1 rounded-md bg-foreground text-background text-[10px] font-semibold tracking-wider whitespace-nowrap pointer-events-none"
                    >
                        {label[lang as keyof typeof label]}
                    </motion.div>

                    <button
                        onClick={() => scrollToSection(id)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                            activeSection === id
                                ? "bg-primary scale-125"
                                : "bg-border hover:bg-muted-foreground/40"
                        }`}
                        aria-label={`Scroll to ${label[lang as keyof typeof label]}`}
                    />
                </div>
            ))}
        </div>
    )
}
