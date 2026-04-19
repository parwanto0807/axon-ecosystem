"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useUIStore } from "@/store/uiStore"
import { usePWA } from "@/hooks/usePWA"
import { Download, X, Smartphone, BarChart3, ShieldCheck } from "lucide-react"

export function PWAInstallPrompt() {
    const { isPWAInstallPromptActive } = useUIStore()
    const { handleInstall, handleDismiss } = usePWA()

    return (
        <AnimatePresence>
            {isPWAInstallPromptActive && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleDismiss}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-[380px] bg-white rounded-[40px] shadow-2xl shadow-indigo-900/20 overflow-hidden border border-white"
                    >
                        {/* Upper Section with Logo */}
                        <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 p-10 flex flex-col items-center relative">
                            <div className="absolute top-4 right-4 group">
                                <button 
                                    onClick={handleDismiss}
                                    className="p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="w-20 h-20 bg-white rounded-[28px] shadow-2xl flex items-center justify-center mb-6"
                            >
                                <BarChart3 className="text-indigo-600 w-10 h-10" strokeWidth={2.5} />
                            </motion.div>

                            <h3 className="text-white text-2xl font-black tracking-tight mb-2">Install Axon</h3>
                            <p className="text-indigo-100 text-sm font-medium opacity-80 text-center px-4">
                                Add Axon to your home screen for a seamless native experience.
                            </p>
                        </div>

                        {/* Lower Section with Info and Actions */}
                        <div className="p-8 pt-10">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-4 text-slate-600">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Smartphone size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Fast Access from Home Screen</span>
                                </li>
                                <li className="flex items-center gap-4 text-slate-600">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Secure Native Environment</span>
                                </li>
                            </ul>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleInstall}
                                className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:bg-indigo-700 transition-all"
                            >
                                <Download size={18} strokeWidth={3} />
                                Install Axon Now
                            </motion.button>
                            
                            <button 
                                onClick={handleDismiss}
                                className="w-full mt-4 py-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:text-indigo-600 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>

                        {/* Visual flair footer */}
                        <div className="bg-slate-50 py-3 text-center border-t border-slate-100">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                AXON BIOMETRIC SECURITY COMPLIANT
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
