"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { usePWA } from "@/hooks/usePWA"
import { Download, Sparkles } from "lucide-react"

export function PWAFloatingButton() {
    const { isInstallable, showModal } = usePWA()
    const pathname = usePathname()

    // Jangan tampilkan di halaman auth / halaman cetak
    if (pathname?.startsWith("/login") || pathname?.startsWith("/invoice-print")) return null

    return (
        <AnimatePresence>
            {isInstallable && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.9 }}
                    whileTap={{ scale: 0.95 }}
                    className="fixed right-3 sm:right-6 lg:right-10 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-10 z-40 flex flex-col items-end pointer-events-none"
                >
                    {/* Badge hanya di layar >= sm */}
                    <div className="pointer-events-auto hidden sm:flex bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 shadow-lg shadow-indigo-600/25 items-center gap-2">
                        <Sparkles size={10} className="animate-pulse" />
                        Install App
                    </div>

                    <button
                        onClick={showModal}
                        aria-label="Install aplikasi"
                        className="pointer-events-auto w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-[22px] bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-indigo-200 lg:border-2 lg:border-indigo-600 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-600/15 lg:shadow-2xl lg:shadow-indigo-600/20 hover:bg-indigo-50 transition-colors"
                    >
                        <Download size={20} strokeWidth={2.5} className="lg:hidden" />
                        <Download size={24} strokeWidth={2.5} className="hidden lg:block" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
