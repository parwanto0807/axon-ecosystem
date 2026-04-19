"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
    BarChart3, 
    Mail, 
    Lock, 
    ArrowRight, 
    Loader2, 
    AlertCircle,
    CheckCircle2,
    Fingerprint,
    ShieldCheck
} from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError("Invalid email or password. Please try again.")
                setIsLoading(false)
            } else {
                setSuccess(true)
                setTimeout(() => {
                    router.push("/dashboard")
                    router.refresh()
                }, 1000)
            }
        } catch (err) {
            setError("Something went wrong. Please try again later.")
            setIsLoading(false)
        }
    }

    if (!isMounted) return null

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col items-center justify-center p-0 sm:p-6 relative overflow-hidden font-sans">
            {/* Premium Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[130px] rounded-full animate-pulse [animation-delay:2s]" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full animate-pulse [animation-delay:4s]" />

            {/* Content Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10 flex flex-col h-full sm:h-auto"
            >
                {/* Header Section - Native Mobile Style */}
                <div className="px-8 pt-6 pb-4 sm:pt-6 sm:pb-10 text-center flex flex-col items-center">
                    <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-4 sm:mb-6 group cursor-default"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                        <BarChart3 className="text-white w-7 h-7 sm:w-9 sm:h-9" strokeWidth={2.2} />
                    </motion.div>
                    
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1 sm:mb-2">Axon</h1>
                        <p className="text-slate-500 font-semibold tracking-wide uppercase text-[9px] sm:text-[10px]">Ecosystem Intelligence</p>
                    </motion.div>
                </div>

                {/* Login Card - Glassmorphism */}
                <div className="flex-1 sm:flex-none">
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.7 }}
                        className="bg-white/70 backdrop-blur-3xl sm:rounded-[40px] px-6 sm:px-10 py-6 sm:py-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border-t sm:border border-white/60 relative h-full sm:h-auto overflow-hidden"
                    >
                        {/* Decorative Line for Mobile Form */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 sm:hidden opacity-50" />

                        <div className="mb-6 sm:mb-10 text-left">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-0.5 sm:mb-1">Sign In</h2>
                            <p className="text-slate-500 text-xs sm:text-sm">Please enter your credentials to continue.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="bg-red-50/50 backdrop-blur-sm border border-red-100 p-4 rounded-2xl flex items-start gap-3"
                                    >
                                        <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-700 font-bold leading-relaxed">{error}</p>
                                    </motion.div>
                                )}
                                
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-green-50/50 backdrop-blur-sm border border-green-100 p-4 rounded-2xl flex items-center gap-3"
                                    >
                                        <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                                        <p className="text-xs text-green-700 font-bold">Successfully authenticated!</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-4 sm:space-y-6">
                                {/* Email Field */}
                                <div className="space-y-2 group">
                                    <label htmlFor="email" className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                                        Account Email
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all">
                                            <Mail size={18} strokeWidth={2.5} />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@axon.com"
                                            autoComplete="username"
                                            className="w-full pl-12 pr-4 py-4.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-500/50 focus:bg-white transition-all text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2 group">
                                    <div className="flex items-center justify-between px-1">
                                        <label htmlFor="password" className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-indigo-600 transition-colors">
                                            Security Access
                                        </label>
                                        {/* Recovery disabled as per requirements */}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-all">
                                            <Lock size={18} strokeWidth={2.5} />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            className="w-full pl-12 pr-4 py-4.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl outline-none focus:ring-8 focus:ring-indigo-600/5 focus:border-indigo-500/50 focus:bg-white transition-all text-slate-800 font-bold placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isLoading || success}
                                className={`
                                    w-full py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-500 relative overflow-hidden group/btn
                                    ${isLoading || success 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                                        : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-2xl shadow-slate-900/20 hover:shadow-indigo-600/30'}
                                `}
                            >
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        </motion.div>
                                    ) : success ? (
                                        <motion.div
                                            key="success"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            <CheckCircle2 className="w-6 h-6" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            className="flex items-center gap-3"
                                            initial={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            Secure Portal Access
                                            <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                {/* Button Highlight Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] pointer-events-none" />
                            </motion.button>
                        </form>

                        {/* Mobile Footer Visual flair */}
                        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100/50 flex flex-col items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-8 text-slate-300">
                                <Fingerprint size={24} className="opacity-40 hover:opacity-100 transition-opacity cursor-help" strokeWidth={1.5} />
                                <ShieldCheck size={24} className="opacity-40 hover:opacity-100 transition-opacity cursor-help" strokeWidth={1.5} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                                AXON BIOMETRIC SECURITY V2.4
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Outer Footer */}
                <div className="px-8 py-10 sm:py-8 text-center sm:block hidden">
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        Authorized Personnel Only
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    </p>
                </div>
            </motion.div>

            <style jsx global>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                .py-4.5 {
                    padding-top: 0.875rem;
                    padding-bottom: 0.875rem;
                }
                @media (min-width: 640px) {
                    .py-4.5 {
                        padding-top: 1.125rem;
                        padding-bottom: 1.125rem;
                    }
                }
            `}</style>
        </div>
    )
}
