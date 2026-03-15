"use client"

import { useState } from "react"
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
    CheckCircle2
} from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Logo Section */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-600/20 mb-6"
                    >
                        <BarChart3 className="text-white w-8 h-8" strokeWidth={2.5} />
                    </motion.div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Log in to Axon Ecosystem Dashboard</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-[32px] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative group">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3"
                                >
                                    <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 font-medium leading-tight">{error}</p>
                                </motion.div>
                            )}
                            
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3"
                                >
                                    <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
                                    <p className="text-sm text-green-700 font-bold leading-tight">Login Successful! Redirecting...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@axon.com"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                                    <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Forgot?</button>
                                </div>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className={`
                                w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 shadow-xl
                                ${isLoading || success 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-600/20 active:scale-[0.98]'}
                            `}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : success ? (
                                <CheckCircle2 className="w-5 h-5" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-slate-400 text-sm font-medium">
                        Secure Axon Authentication System v2.1
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
