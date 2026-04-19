"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePWA } from "@/hooks/usePWA"
import { Download, Sparkles } from "lucide-react"

export function PWAFloatingButton() {
    const { isInstallable, showModal } = usePWA()

    return (
        <AnimatePresence>
            {isInstallable && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.8 }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="fixed bottom-24 right-6 z-[60] lg:bottom-10 lg:right-10 flex flex-col items-end"
                >
                    {/* Badge */}
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 shadow-xl shadow-indigo-600/30 flex items-center gap-2">
                        <Sparkles size={10} className="animate-pulse" />
                        Install App
                    </div>

                    {/* Main Button */}
                    <button
                        onClick={showModal}
                        className="w-14 h-14 lg:w-16 lg:h-16 rounded-[22px] bg-white dark:bg-slate-900 border-2 border-indigo-600 flex items-center justify-center text-indigo-600 shadow-2xl shadow-indigo-600/20 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                        <Download size={24} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                    </button>
                    
                    {/* Pulsing Ring */}
                    <div className="absolute inset-0 rounded-[22px] border-2 border-indigo-500/30 animate-ping -z-10" />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
