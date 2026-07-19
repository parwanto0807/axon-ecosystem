"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Target, Lightbulb, TrendingUp, Building2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { ClientData } from "@/data/clients"
import Link from "next/link"

interface ClientDetailModalProps {
    isOpen: boolean
    onClose: () => void
    client: ClientData | null
}

const translations = {
    ID: {
        challengeTitle: "Tantangan (Problem)",
        solutionTitle: "Solusi Axon",
        resultTitle: "Hasil (Outcome)",
        modulesUsed: "Modul yang Dipakai",
        contactBtn: "Minta Penawaran"
    },
    EN: {
        challengeTitle: "The Challenge",
        solutionTitle: "Axon Solution",
        resultTitle: "The Outcome",
        modulesUsed: "Modules Used",
        contactBtn: "Request a Quote"
    }
}

export function ClientDetailModal({ isOpen, onClose, client }: ClientDetailModalProps) {
    const { lang } = useLanguage()
    const t = translations[lang as keyof typeof translations]

    if (!client) return null

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
                            className="bg-background border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto relative flex flex-col"
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10"
                            >
                                <X size={18} />
                            </button>

                            <div className="p-8 md:p-12 pb-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start mb-10">
                                    <div className={`w-16 h-16 rounded-xl ${client.color} ${client.borderColor} border flex items-center justify-center shrink-0`}>
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <span className={`inline-block px-3 py-1 rounded-lg ${client.color} text-[10px] font-bold uppercase tracking-wider mb-3`}>
                                            {client.sector}
                                        </span>
                                        <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tight mb-2">{client.name}</h2>
                                    </div>
                                </div>
                                
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t.modulesUsed}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {client.badges.map((badge, idx) => (
                                            <span key={idx} className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-semibold flex items-center gap-2 border border-border">
                                                <CheckCircle2 size={12} className="text-primary" />
                                                {badge}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mb-8">
                                    <div className="space-y-8">
                                        {/* Tantangan */}
                                        <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 relative overflow-hidden group hover:border-destructive/30 transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                                                    <Target size={16} className="text-destructive" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">{t.challengeTitle}</h3>
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                                {client.caseStudy.tantangan}
                                            </p>
                                        </div>

                                        {/* Solusi */}
                                        <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Lightbulb size={16} className="text-primary" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">{t.solutionTitle}</h3>
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                                {client.caseStudy.solusi}
                                            </p>
                                        </div>

                                        {/* Hasil */}
                                        <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                    <TrendingUp size={16} className="text-emerald-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">{t.resultTitle}</h3>
                                            </div>
                                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 leading-relaxed">
                                                {client.caseStudy.hasil}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-auto p-8 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm font-bold text-foreground max-w-md text-center sm:text-left">{client.ctaText}</p>
                                <Button
                                    asChild
                                    className="rounded-xl px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors whitespace-nowrap w-full sm:w-auto"
                                >
                                    <Link href={`https://wa.me/6281234567890?text=Halo%20Axon,%20saya%20tertarik%20dengan%20solusi%20untuk%20sektor%20${client.sector}`}>
                                        {t.contactBtn}
                                    </Link>
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
