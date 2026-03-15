"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"

const sections = [
    { id: "beranda", label: { ID: "Beranda", EN: "Home" } },
    { id: "solutions", label: { ID: "Solusi", EN: "Solutions" } },
    { id: "products", label: { ID: "Produk", EN: "Products" } },
    { id: "pricing", label: { ID: "Harga", EN: "Pricing" } },
    { id: "about", label: { ID: "Tentang Kami", EN: "About Us" } },
    { id: "faq", label: { ID: "FAQ", EN: "FAQ" } },
]

export function ScrollNav() {
    const [activeSection, setActiveSection] = useState("beranda")
    const { lang } = useLanguage()

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id)
                    }
                })
            },
            {
                rootMargin: "-40% 0px -40% 0px" // Trigger when section is in the middle of viewport
            }
        )

        sections.forEach(({ id }) => {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        })

        return () => observer.disconnect()
    }, [])

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: "smooth" })
        }
    }

    return (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-4">
            {sections.map(({ id, label }) => (
                <div key={id} className="relative flex items-center justify-end group">
                    {/* Hover Label */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        animate={{ opacity: activeSection === id ? 1 : 0, x: activeSection === id ? -40 : 20 }}
                        className={`absolute right-0 px-3 py-1 rounded-lg backdrop-blur-md border shadow-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap pointer-events-none transition-all duration-300 ${activeSection === id
                            ? "bg-indigo-600 text-white border-indigo-500 mr-2"
                            : "bg-background/80 text-foreground border-border/20 group-hover:block group-hover:-translate-x-8 group-hover:opacity-100"
                            }`}
                    >
                        {label[lang as keyof typeof label]}
                    </motion.div>

                    {/* Dot Indicator */}
                    <button
                        onClick={() => scrollToSection(id)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 relative ${activeSection === id ? "bg-indigo-600 scale-125 ring-4 ring-indigo-600/20" : "bg-slate-300 hover:bg-indigo-400 hover:scale-110"
                            }`}
                        aria-label={`Scroll to ${label[lang as keyof typeof label]}`}
                    >
                        {activeSection === id && (
                            <motion.div
                                layoutId="activeScrollDot"
                                className="absolute inset-0 bg-white rounded-full opacity-30"
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                        )}
                    </button>

                    {/* Connecting Line (Optional visual flair) */}
                    {activeSection === id && (
                        <motion.div
                            layoutId="activeGlow"
                            className="absolute inset-0 bg-indigo-500 blur-md rounded-full -z-10"
                            transition={{ duration: 0.3 }}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
