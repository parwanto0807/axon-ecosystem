"use client"

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    BarChart3,
    TrendingUp,
    Zap,
    Globe,
    Users,
} from "lucide-react"

// Animated number counter
function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0)
    const started = useRef(false)

    useEffect(() => {
        if (started.current) return
        started.current = true
        const duration = 1800
        const steps = 60
        const increment = value / steps
        let current = 0
        const timer = setInterval(() => {
            current += increment
            if (current >= value) {
                setCount(value)
                clearInterval(timer)
            } else {
                setCount(Math.floor(current))
            }
        }, duration / steps)
        return () => clearInterval(timer)
    }, [value])

    return <span>{prefix}{count.toLocaleString('id-ID')}{suffix}</span>
}

const stats = [
    { icon: Users, label: "Klien Aktif", value: 50, suffix: "+" },
    { icon: TrendingUp, label: "Uptime", value: 99, suffix: ".9%" },
    { icon: Zap, label: "Real-time Sync", value: 24, suffix: "/7" },
    { icon: Globe, label: "Transaksi/Hari", value: 1200, suffix: "+" },
]

const features = [
    "Dashboard Enterprise Real-time",
    "Manajemen Inventaris & Stok",
    "Pipeline Penjualan Terpadu",
    "Laporan Keuangan Otomatis",
    "Presensi & HR Management",
    "Operasional & Work Orders",
]

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [focusedField, setFocusedField] = useState<string | null>(null)

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
                setError("Email atau password salah. Silakan coba lagi.")
                setIsLoading(false)
            } else {
                setSuccess(true)
                setTimeout(() => {
                    router.push("/dashboard")
                    router.refresh()
                }, 1000)
            }
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.")
            setIsLoading(false)
        }
    }

    if (!isMounted) return null

    return (
        <div className="min-h-[100dvh] flex overflow-hidden font-sans">

            {/* ============================
                LEFT PANEL — Brand/Dark
                ============================ */}
            <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%)" }}
            >
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 grid-pattern opacity-60" />

                {/* Teal ambient glow orbs */}
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,201,167,0.12) 0%, transparent 70%)" }} />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,145,255,0.08) 0%, transparent 70%)" }} />
                <div className="absolute top-[40%] right-[10%] w-[25%] h-[25%] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(0,201,167,0.06) 0%, transparent 70%)" }} />

                {/* Top: Logo */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="relative z-10 flex items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, #00C9A7, #00A589)",
                            boxShadow: "0 0 24px rgba(0,201,167,0.4)"
                        }}
                    >
                        <BarChart3 className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="text-white font-black text-2xl tracking-tighter">AXON</span>
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "#00C9A7" }}>
                            Ecosystem Intelligence
                        </p>
                    </div>
                </motion.div>

                {/* Center: Hero content */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="relative z-10 flex-1 flex flex-col justify-center py-12"
                >
                    <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                        Kelola Bisnis{" "}
                        <span className="text-gradient-teal">Lebih Cerdas</span>
                        <br />dengan Satu Platform
                    </h1>
                    <p className="text-base font-medium leading-relaxed mb-10 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Platform enterprise terpadu untuk manajemen penjualan, inventaris, keuangan, SDM, dan operasional bisnis Anda secara real-time.
                    </p>

                    {/* Feature list */}
                    <div className="grid grid-cols-2 gap-3 mb-12">
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.7 + i * 0.07, duration: 0.4 }}
                                className="flex items-center gap-2"
                            >
                                <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                                    style={{ background: "rgba(0,201,167,0.15)" }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C9A7" }} />
                                </div>
                                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                                    {feature}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.0 + i * 0.1, duration: 0.5 }}
                                className="rounded-2xl p-3 text-center"
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.07)"
                                }}
                            >
                                <stat.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: "#00C9A7" }} strokeWidth={2} />
                                <div className="text-lg font-black text-white font-financial">
                                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                                </div>
                                <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    {stat.label}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Bottom: Trust badge */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="relative z-10 flex items-center gap-3"
                >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                        style={{
                            background: "rgba(0,201,167,0.08)",
                            border: "1px solid rgba(0,201,167,0.2)"
                        }}
                    >
                        <ShieldCheck className="w-4 h-4" style={{ color: "#00C9A7" }} strokeWidth={2} />
                        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                            Enterprise-Grade Security
                        </span>
                    </div>
                    <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
                        ISO 27001 Certified
                    </span>
                </motion.div>
            </motion.div>

            {/* ============================
                RIGHT PANEL — Login Form
                ============================ */}
            <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-20 relative"
                style={{ background: "hsl(210, 20%, 97%)" }}
            >
                {/* Mobile logo (only on small screens) */}
                <div className="lg:hidden absolute top-8 left-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #00C9A7, #00A589)" }}>
                        <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-xl tracking-tighter" style={{ color: "#0D1117" }}>AXON</span>
                </div>

                <div className="w-full max-w-md">
                    {/* Header */}
                    <motion.div
                        initial={{ y: -16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="mb-10"
                    >
                        <h2 className="text-3xl font-black tracking-tight mb-2" style={{ color: "#0D1117" }}>
                            Selamat Datang
                        </h2>
                        <p className="text-sm font-medium" style={{ color: "#64748b" }}>
                            Masuk ke portal untuk melanjutkan
                        </p>
                    </motion.div>

                    {/* Form */}
                    <motion.form
                        onSubmit={handleSubmit}
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                        className="space-y-5"
                    >
                        {/* Error / Success messages */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl border"
                                    style={{
                                        background: "rgba(239,68,68,0.05)",
                                        borderColor: "rgba(239,68,68,0.2)",
                                    }}
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                                    <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>{error}</p>
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border"
                                    style={{
                                        background: "rgba(0,201,167,0.06)",
                                        borderColor: "rgba(0,201,167,0.25)",
                                    }}
                                >
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#00C9A7" }} />
                                    <p className="text-xs font-bold" style={{ color: "#008F78" }}>Autentikasi berhasil! Mengalihkan...</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Email field */}
                        <div className="space-y-1.5">
                            <label htmlFor="email"
                                className="text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
                                style={{ color: focusedField === 'email' ? '#00C9A7' : '#94a3b8' }}
                            >
                                Email Akun
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
                                    style={{ color: focusedField === 'email' ? '#00C9A7' : '#94a3b8' }}>
                                    <Mail size={17} strokeWidth={2.5} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="nama@axon.com"
                                    autoComplete="username"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all text-sm font-semibold placeholder:font-normal"
                                    style={{
                                        background: focusedField === 'email' ? '#fff' : 'rgba(255,255,255,0.8)',
                                        border: focusedField === 'email' ? '1.5px solid #00C9A7' : '1.5px solid #e2e8f0',
                                        boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(0,201,167,0.1)' : 'none',
                                        color: '#0D1117',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password field */}
                        <div className="space-y-1.5">
                            <label htmlFor="password"
                                className="text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
                                style={{ color: focusedField === 'password' ? '#00C9A7' : '#94a3b8' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
                                    style={{ color: focusedField === 'password' ? '#00C9A7' : '#94a3b8' }}>
                                    <Lock size={17} strokeWidth={2.5} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all text-sm font-semibold placeholder:font-normal"
                                    style={{
                                        background: focusedField === 'password' ? '#fff' : 'rgba(255,255,255,0.8)',
                                        border: focusedField === 'password' ? '1.5px solid #00C9A7' : '1.5px solid #e2e8f0',
                                        boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(0,201,167,0.1)' : 'none',
                                        color: '#0D1117',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading || success}
                            className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group/btn mt-2"
                            style={{
                                background: isLoading || success
                                    ? '#e2e8f0'
                                    : 'linear-gradient(135deg, #00C9A7 0%, #00A589 100%)',
                                color: isLoading || success ? '#94a3b8' : '#fff',
                                boxShadow: isLoading || success ? 'none' : '0 8px 24px rgba(0,201,167,0.35)',
                            }}
                        >
                            {/* Shimmer sweep */}
                            {!isLoading && !success && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_ease-in-out_infinite] pointer-events-none" />
                            )}

                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </motion.div>
                                ) : success ? (
                                    <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="idle" className="flex items-center gap-2.5" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <span>Masuk ke Portal</span>
                                        <ArrowRight size={17} className="transition-transform group-hover/btn:translate-x-1" strokeWidth={2.5} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </motion.form>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        className="mt-10 pt-8 border-t flex flex-col items-center gap-3"
                        style={{ borderColor: '#e2e8f0' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full animate-[teal-pulse_2s_ease-in-out_infinite]"
                                style={{ background: '#00C9A7' }} />
                            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                                Axon Biometric Security v2.4
                            </span>
                        </div>
                        <p className="text-[10px] font-medium" style={{ color: '#cbd5e1' }}>
                            Akses hanya untuk personel yang berwenang
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
