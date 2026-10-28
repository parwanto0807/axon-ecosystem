"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Terminal,
    Shield,
    Server,
    Activity,
    Cpu,
} from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl: "/dashboard",
            })

            if (res?.error) {
                setError(res.error || "Autentikasi gagal. Periksa email dan password.")
                setIsLoading(false)
            } else if (res?.ok) {
                setSuccess(true)
                router.push("/dashboard")
            }
        } catch (err) {
            setError("Terjadi kesalahan sistem gateway. Silakan coba kembali.")
            setIsLoading(false)
        }
    }

    if (!isMounted) return null

    return (
        <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden font-sans bg-slate-50 dark:bg-[#06090e] text-slate-900 dark:text-slate-100">

            {/* ===================================================
                LEFT PANEL — Systems Architecture & Telemetry Specs
                =================================================== */}
            <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] bg-[#06090e] border-r border-[#161f2e] relative flex-col justify-between p-8 xl:p-10 overflow-hidden">
                {/* Engineering grid pattern */}
                <div className="absolute inset-0 engineering-grid opacity-30 pointer-events-none" />

                {/* Top: Logo & System Identity */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                            <Cpu className="w-4 h-4" strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 leading-none">
                                <span className="text-white font-bold text-sm tracking-tight">AXON<span className="text-blue-500">.CORE</span></span>
                                <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-800">
                                    GATEWAY
                                </span>
                            </div>
                            <p className="font-mono text-[9px] text-slate-500 tracking-wider mt-0.5">
                                ENTERPRISE ECOSYSTEM // NODE JKT-01
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>ONLINE 99.98%</span>
                    </div>
                </div>

                {/* Center: System Architecture Console */}
                <div className="relative z-10 my-auto py-6">
                    <div className="mb-4">
                        <span className="font-mono text-[10px] text-blue-400 uppercase tracking-widest font-semibold">
                          [ACCESS CONTROL SUBSYSTEM]
                        </span>
                        <h1 className="text-xl xl:text-2xl font-bold text-white tracking-tight mt-1 mb-2">
                            Mission-Critical Enterprise Operations Portal
                        </h1>
                        <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-md">
                            Unified telemetry and execution platform for network infrastructure, supply chain, automated financial accounting, and field operations.
                        </p>
                    </div>

                    {/* Architecture Specs Terminal */}
                    <div className="rounded-md bg-[#0b0f17] border border-[#182234] p-3 font-mono text-xs shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[9.5px] text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Terminal size={11} className="text-blue-400" />
                                <span>SYSTEM DIAGNOSTIC STREAM</span>
                            </span>
                            <span>SECURITY: ENFORCED</span>
                        </div>

                        <div className="space-y-1 text-[10.5px] text-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">API GATEWAY:</span>
                                <span className="text-emerald-400">NOMINAL // 14ms (HTTPS/TLS 1.3)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">DATA LAYER:</span>
                                <span className="text-slate-200">POSTGRESQL CLUSTER // PRISMA 6</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">ROUTER TELEMETRY:</span>
                                <span className="text-blue-400">ROUTEROS API // AES-256 ENCRYPTED</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">ACCESS CONTROL:</span>
                                <span className="text-emerald-400">RBAC HIERARCHICAL [LEVEL 1-6]</span>
                            </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-500">
                            <span>SESSION TOKEN: ECDSA-SHA256</span>
                            <span className="text-emerald-500 font-bold">READY FOR HANDSHAKE</span>
                        </div>
                    </div>
                </div>

                {/* Bottom: Compliance & Protocols */}
                <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-500 pt-3 border-t border-[#161f2e]">
                    <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-blue-500" />
                        <span>AUDIT LOGGING ENABLED</span>
                    </div>
                    <span>CONFIDENTIAL // AUTHORIZED ACCESS ONLY</span>
                </div>
            </div>

            {/* ===================================================
                RIGHT PANEL — Precision Authentication Form
                =================================================== */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 relative">
                {/* Mobile Top Header */}
                <div className="lg:hidden w-full max-w-xs sm:max-w-sm mb-6 flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
                        <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">AXON<span className="text-blue-600">.CORE</span></span>
                    <span className="font-mono text-[9px] text-slate-400 ml-auto">NODE // JKT</span>
                </div>

                <div className="w-full max-w-xs sm:max-w-sm">
                    {/* Header */}
                    <div className="mb-5">
                        <span className="font-mono text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                            // AUTHENTICATION
                        </span>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                            Operator Sign In
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            Enter operator credentials to authenticate session
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Alert */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }}
                                    className="flex items-start gap-2.5 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-mono"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2.5 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-mono"
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Session handshake successful. Redirecting...</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email field */}
                        <div className="space-y-1">
                            <label 
                                htmlFor="email"
                                className="block font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                            >
                                Operator Identity (Email)
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Mail size={15} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="operator@axon.com"
                                    autoComplete="username"
                                    className="w-full pl-9 pr-3.5 py-2 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
                                />
                            </div>
                        </div>

                        {/* Password field */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label 
                                    htmlFor="password"
                                    className="block font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                                >
                                    Security Key (Password)
                                </label>
                                <a
                                    href="mailto:admin@axon.com?subject=Key%20Reset%20Request"
                                    className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Reset Key?
                                </a>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Lock size={15} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-9 pr-10 py-2 rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-xs mt-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : success ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            ) : (
                                <>
                                    <span>ESTABLISH SESSION</span>
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer notice */}
                    <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
                        <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            Axon Enterprise Core • RBAC Protected • Gateway v2.4.2
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
