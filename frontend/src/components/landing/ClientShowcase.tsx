"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react"
import { clients, ClientData } from "@/data/clients"
import { ClientDetailModal } from "./ClientDetailModal"
import { useLanguage } from "@/context/LanguageContext"

const translations = {
    ID: {
        title: "Dipercaya oleh Berbagai Sektor Bisnis",
        subtitle1: "Dari kontraktor institusional, layanan kesehatan, manufaktur, hingga pengelolaan kawasan perumahan — Axon Ecosystem sudah menjadi bagian dari operasional harian berbagai jenis bisnis. Setiap sektor punya tantangan berbeda, dan setiap solusi kami dirancang untuk menjawabnya secara spesifik.",
        subtitle2: "Lihat bagaimana bisnis seperti Anda sudah lebih dulu bertransformasi bersama Axon.",
        viewCaseStudy: "Lihat Studi Kasus",
        categories: ["Semua", "General Supply & Kontraktor", "Kesehatan", "Manufaktur", "Properti & Perumahan"]
    },
    EN: {
        title: "Trusted by Various Business Sectors",
        subtitle1: "From institutional contractors, healthcare, manufacturing, to residential area management — Axon Ecosystem is already part of daily operations for various types of businesses. Each sector has different challenges, and our solutions are designed to answer them specifically.",
        subtitle2: "See how businesses like yours have already transformed with Axon.",
        viewCaseStudy: "View Case Study",
        categories: ["All", "General Supply & Kontraktor", "Kesehatan", "Manufaktur", "Properti & Perumahan"] // Kept the actual tags identical for filtering, but translated "All"
    }
}

export function ClientShowcase() {
    const { lang } = useLanguage()
    const t = translations[lang as keyof typeof translations]
    const [activeFilter, setActiveFilter] = useState("Semua")
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const filteredClients = clients.filter(client => {
        if (activeFilter === "Semua" || activeFilter === "All") return true
        return client.filterCategory === activeFilter
    })

    const handleOpenModal = (client: ClientData) => {
        setSelectedClient(client)
        setIsModalOpen(true)
    }

    return (
        <section className="py-12 md:py-20 border-t border-border relative overflow-hidden" style={{ background: "hsl(210,15%,94%)" }}>
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-125 h-125 bg-primary/2 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-100 h-100 bg-primary/2 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="text-center mb-12 max-w-4xl mx-auto">
                    <motion.h2 
                        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        className="text-xl md:text-3xl font-bold text-foreground mb-4 tracking-tight text-balance"
                    >
                        {t.title}
                    </motion.h2>
                    <motion.div 
                        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                        className="space-y-3 text-muted-foreground font-medium text-sm md:text-base leading-relaxed text-balance"
                    >
                        <p>{t.subtitle1}</p>
                        <p className="font-bold text-foreground">{t.subtitle2}</p>
                    </motion.div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-12">
                    {t.categories.map((category, idx) => {
                        const originalCategory = category === "All" ? "Semua" : category
                        const isActive = activeFilter === originalCategory || (activeFilter === "Semua" && category === "All")
                        
                        return (
                            <button
                                key={idx}
                                onClick={() => setActiveFilter(originalCategory)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 border ${
                                    isActive
                                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                        : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                                }`}
                            >
                                {category}
                            </button>
                        )
                    })}
                </div>

                {/* Client Grid */}
                <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
                >
                    <AnimatePresence>
                        {filteredClients.map((client, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                key={client.id}
                                onClick={() => handleOpenModal(client)}
                                className={`group cursor-pointer rounded-2xl border ${client.borderColor} bg-card p-6 md:p-8 hover:border-primary/40 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col h-full`}
                            >
                                {/* Decorative background accent */}
                                <div className={`absolute top-0 right-0 w-32 h-32 ${client.color.replace('text-', 'bg-').split(' ')[0]}/5 rounded-bl-[100px] transition-all group-hover:scale-110`} />
                                
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-lg font-bold text-foreground">{client.name}</h3>
                                        <span className={`inline-flex px-3 py-1 rounded-lg ${client.color} text-[10px] font-bold uppercase tracking-wider w-fit border ${client.borderColor}`}>
                                            {client.sector}
                                        </span>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${client.color} border ${client.borderColor} flex items-center justify-center shrink-0`}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="mb-6 grow relative z-10">
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic border-l-4 border-muted pl-4">
                                        &ldquo;{client.shortDesc}&rdquo;
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                                    {client.badges.map((badge, i) => (
                                        <span key={i} className="text-[10px] font-semibold text-foreground/70 bg-muted/50 px-2 py-1 rounded-md border border-border flex items-center gap-1.5">
                                            <CheckCircle2 size={10} className="text-primary/60" />
                                            {badge}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-auto relative z-10 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all">
                                    {t.viewCaseStudy} <ArrowRight size={16} />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>

            <ClientDetailModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                client={selectedClient} 
            />
        </section>
    )
}
