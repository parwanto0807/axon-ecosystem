"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    MapPin, Clock, Check, Ban, Receipt,
    Briefcase, Users, DollarSign, ChevronRight,
    Filter, SlidersHorizontal, ArrowLeft, MoreVertical
} from "lucide-react"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; code: string }
interface Project { id: string; number: string; name: string; customerId: string }
interface SurveyExpense { id: string; category: string; amount: number; description: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface FieldSurvey {
    id: string; number: string; date: string; location: string; status: string; findings: string | null;
    customerId: string; customer: Customer; projectId: string | null; project: Project | null;
    expenses: SurveyExpense[]; createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ElementType }> = {
    PLANNED: { label: 'Planned', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', icon: Clock },
    IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', icon: MapPin },
    COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400', icon: Ban },
}

const EXPENSE_STATUS: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
    APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700' },
    POSTED: { label: 'Posted', bg: 'bg-indigo-50', text: 'text-indigo-700' },
}

const EXPENSE_CATEGORIES = ['TRANSPORT', 'MEAL', 'ACCOMMODATION', 'OFFICE', 'OTHER']
const CATEGORY_EMOJI: Record<string, string> = {
    TRANSPORT: '🚗', MEAL: '🍱', ACCOMMODATION: '🏨', OFFICE: '📋', OTHER: '📦'
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtShort = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toast }: { toast: { type: 'success' | 'error'; msg: string } | null }) {
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 80, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 80, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap
                        ${toast.type === 'success'
                            ? 'bg-slate-900 text-white'
                            : 'bg-rose-600 text-white'}`}
                >
                    {toast.type === 'success'
                        ? <CheckCircle2 size={16} className="text-emerald-400" />
                        : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ─── STAT PILL ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
    return (
        <div className={`flex-1 rounded-2xl p-3.5 ${color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{label}</p>
            <p className="text-xl font-black leading-none">{value}</p>
            {sub && <p className="text-[10px] opacity-60 mt-1 font-medium">{sub}</p>}
        </div>
    )
}

// ─── SURVEY CARD ──────────────────────────────────────────────────────────────
function SurveyCard({ survey, onEdit, onDelete }: { survey: FieldSurvey; onEdit: () => void; onDelete: () => void }) {
    const sc = STATUS_CONFIG[survey.status] || STATUS_CONFIG.PLANNED
    const Icon = sc.icon
    const totalExp = survey.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
        >
            {/* Top stripe by status */}
            <div className={`h-1 w-full ${sc.dot}`} />

            <div className="p-4">
                {/* Row 1: Number + Status + Menu */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em] bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {survey.number}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                        </span>
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                                <MoreVertical size={16} />
                            </button>
                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute right-0 top-9 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden w-36"
                                        onMouseLeave={() => setMenuOpen(false)}
                                    >
                                        <button onClick={() => { onEdit(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                            <Edit size={14} className="text-indigo-500" /> Edit
                                        </button>
                                        <div className="h-px bg-slate-100" />
                                        <button onClick={() => { onDelete(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Row 2: Customer + Location */}
                <div className="mb-3">
                    <p className="font-bold text-slate-900 text-[15px] md:text-base leading-tight break-words whitespace-normal">{survey.customer?.name}</p>
                    <div className="flex items-start gap-1.5 mt-1.5">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] text-slate-500 font-medium leading-snug line-clamp-2">{survey.location}</p>
                    </div>
                </div>

                {/* Row 3: Project badge + Date */}
                <div className="flex items-center justify-between mb-4">
                    {survey.project ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            <Briefcase size={9} />
                            {survey.project.number}
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">No project</span>
                    )}
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Clock size={10} />
                        {fmtShort(survey.date)}
                    </span>
                </div>

                {/* Row 4: Expenses summary */}
                {survey.expenses && survey.expenses.length > 0 ? (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Biaya</p>
                            <p className="text-base font-black text-slate-900">{fmt(totalExp)}</p>
                        </div>
                        <div className="flex gap-1">
                            {['PENDING', 'APPROVED', 'REJECTED'].map(st => {
                                const count = survey.expenses.filter(e => e.status === st).length
                                if (!count) return null
                                const es = EXPENSE_STATUS[st]
                                return (
                                    <span key={st} className={`text-[9px] font-black px-2 py-1 rounded-lg ${es.bg} ${es.text}`}>
                                        {count} {st.charAt(0)}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-slate-400 font-medium">Belum ada biaya tercatat</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SurveysPage() {
    const [surveys, setSurveys] = useState<FieldSurvey[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<FieldSurvey | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [showSearch, setShowSearch] = useState(false)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 3500)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [sR, cR, pR] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/surveys`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`)
            ])
            setSurveys(await sR.json())
            setCustomers(await cR.json())
            setProjects(await pR.json())
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus Field Survey ini?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/surveys/${id}`, { method: 'DELETE' })
        showToast('success', 'Survey dihapus'); load()
    }

    const filtered = surveys.filter(s => {
        const q = search.toLowerCase()
        return (s.number.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.customer?.name?.toLowerCase().includes(q)) &&
            (filterStatus === 'ALL' || s.status === filterStatus)
    })

    const totalExpAll = surveys.reduce((sum, s) => sum + (s.expenses?.reduce((a, e) => a + e.amount, 0) || 0), 0)
    const completedCount = surveys.filter(s => s.status === 'COMPLETED').length

    return (
        <div className="min-h-screen bg-slate-50 relative pb-28">

            {/* ─── HEADER (iOS-style sticky) */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 safe-area-top shadow-sm">
                <div className="max-w-screen-2xl mx-auto">
                    <div className="flex items-center justify-between px-4 md:px-8 pt-4 pb-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Field Surveys</h1>
                            <p className="text-[11px] md:text-xs text-slate-400 font-medium mt-1">{surveys.length} survei terdaftar</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200 hover:bg-slate-200 transition-colors"
                            >
                                <Search size={18} />
                            </button>
                            <button
                                onClick={load}
                                className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200 hover:bg-slate-200 transition-colors"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <AnimatePresence>
                        {showSearch && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden px-4 md:px-8 pb-3"
                            >
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Cari nomor, lokasi, pelanggan..."
                                        className="w-full pl-11 pr-10 py-3 text-sm bg-slate-100/80 focus:bg-slate-100 rounded-2xl outline-none placeholder:text-slate-400 text-slate-800 transition-colors border border-slate-200/50 focus:border-indigo-300"
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1 bg-white rounded-full shadow-sm">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Status filter pills */}
                    <div className="flex flex-wrap items-center gap-2 px-4 md:px-8 pb-4">
                        {['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => {
                            const isActive = filterStatus === s
                            const label = s === 'ALL' ? 'Semua' : STATUS_CONFIG[s]?.label || s
                            return (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold transition-all shadow-sm whitespace-nowrap
                                        ${isActive
                                            ? 'bg-slate-900 text-white shadow-slate-900/20 shadow-md ring-2 ring-slate-900/20 ring-offset-1'
                                            : 'bg-white border border-slate-200/60 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {label}
                                    {s !== 'ALL' && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {surveys.filter(sv => sv.status === s).length}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ─── CONTENT */}
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-32 space-y-4 md:space-y-6">

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <StatCard label="Total Survei" value={surveys.length} sub={`${completedCount} selesai`} color="bg-white text-slate-900 border border-slate-200 shadow-sm" />
                    <StatCard label="Total Biaya" value={totalExpAll > 0 ? `${(totalExpAll / 1_000_000).toFixed(1)}M` : '0'} sub="Rp" color="bg-indigo-600 text-white shadow-md shadow-indigo-600/20" />
                </div>

                {/* List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                            <MapPin size={36} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-400 text-sm">Tidak ada survei ditemukan</p>
                        <p className="text-xs text-slate-300 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {filtered.map((s) => (
                            <SurveyCard
                                key={s.id}
                                survey={s}
                                onEdit={() => { setEditing(s); setModalOpen(true) }}
                                onDelete={() => handleDelete(s.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ─── FAB */}
            <div className="fixed bottom-6 md:bottom-10 right-4 md:right-10 z-40">
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { setEditing(null); setModalOpen(true) }}
                    className="w-14 h-14 md:w-16 md:h-16 bg-indigo-600 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-600/30 active:bg-indigo-700 hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={24} className="text-white md:w-7 md:h-7" />
                </motion.button>
            </div>

            {/* ─── TOAST */}
            <Toast toast={toast} />

            {/* ─── MODAL */}
            <AnimatePresence>
                {modalOpen && (
                    <SurveyFormModal
                        survey={editing}
                        customers={customers}
                        projects={projects}
                        onClose={() => setModalOpen(false)}
                        onSuccess={() => {
                            setModalOpen(false)
                            load()
                            showToast('success', editing ? 'Survey diperbarui!' : 'Survey dibuat!')
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── BOTTOM SHEET MODAL ───────────────────────────────────────────────────────
function SurveyFormModal({ survey, customers, projects, onClose, onSuccess }: {
    survey: FieldSurvey | null; customers: Customer[]; projects: Project[];
    onClose: () => void; onSuccess: () => void
}) {
    const isEdit = !!survey
    const today = new Date().toISOString().split('T')[0]
    const [form, setForm] = useState({
        customerId: survey?.customerId || '',
        projectId: survey?.projectId || '',
        location: survey?.location || '',
        findings: survey?.findings || '',
        date: survey?.date ? survey.date.split('T')[0] : today,
        status: survey?.status || 'PLANNED'
    })
    const [expenses, setExpenses] = useState<Partial<SurveyExpense>[]>(survey?.expenses || [])
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState<'info' | 'expenses'>('info')

    const addExpense = () => {
        setExpenses([...expenses, { category: 'TRANSPORT', amount: 0, description: '', status: 'PENDING' }])
    }

    const removeExpense = (index: number) => {
        setExpenses(expenses.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!form.customerId || !form.location) return
        setSaving(true)
        try {
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/surveys/${survey!.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/surveys`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, expenses })
            })
            if (res.ok) onSuccess()
        } finally { setSaving(false) }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
    const labelCls = "block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5"

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
                onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-lg lg:max-w-xl bg-white rounded-t-[1.5rem] sm:rounded-[1.5rem] overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl"
            >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-2 sm:hidden bg-white">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
                            <MapPin size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 text-base leading-none">{isEdit ? 'Edit Survey' : 'Survei Baru'}</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">{isEdit ? survey?.number : 'Buat catatan survei lapangan'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200">
                        <X size={16} />
                    </button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-slate-100 bg-white px-5">
                    {(['info', 'expenses'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStep(s)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px
                                ${step === s
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-400'}`}
                        >
                            {s === 'info' ? 'Info Survei' : `Biaya (${expenses.length})`}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {step === 'info' ? (
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={labelCls}>Pelanggan *</label>
                                <select
                                    required
                                    value={form.customerId}
                                    onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}
                                    className={inputCls}
                                >
                                    <option value="">-- Pilih Pelanggan --</option>
                                    {Array.isArray(customers) && customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Proyek (Opsional)</label>
                                <select
                                    value={form.projectId}
                                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="">-- Tanpa Proyek --</option>
                                    {Array.isArray(projects) && projects
                                        .filter(p => !form.customerId || p.customerId === form.customerId)
                                        .map(p => <option key={p.id} value={p.id}>{p.number} – {p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Lokasi *</label>
                                <input
                                    required
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder="Kota, Nama Kantor..."
                                    className={inputCls}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Tanggal</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        className={inputCls}
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Temuan / Kebutuhan</label>
                                <textarea
                                    rows={4}
                                    value={form.findings}
                                    onChange={e => setForm({ ...form, findings: e.target.value })}
                                    placeholder="Hasil survei, catatan lapangan..."
                                    className={inputCls + " resize-none"}
                                />
                            </div>

                            <button
                                onClick={() => setStep('expenses')}
                                className="w-full flex items-center justify-between px-4 py-3.5 bg-indigo-50 rounded-xl text-indigo-600 font-bold text-sm active:bg-indigo-100 transition-colors"
                            >
                                <span>Lanjut ke Biaya Operasional</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="p-5 space-y-3">
                            {/* Expenses summary */}
                            {expenses.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between mb-1">
                                    <p className="text-xs text-slate-500 font-medium">Total biaya</p>
                                    <p className="text-base font-black text-slate-900">{fmt(totalExpenses)}</p>
                                </div>
                            )}

                            {expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl">
                                    <Receipt size={32} className="text-slate-300 mb-3" />
                                    <p className="text-xs text-slate-400 font-medium">Belum ada biaya</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {expenses.map((exp, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-lg">{CATEGORY_EMOJI[exp.category || 'OTHER'] || '📦'}</span>
                                                <select
                                                    value={exp.category}
                                                    onChange={e => {
                                                        const newE = [...expenses]; newE[idx].category = e.target.value; setExpenses(newE)
                                                    }}
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold uppercase outline-none"
                                                >
                                                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                                {(!exp.status || exp.status === 'PENDING') && (
                                                    <button
                                                        onClick={() => removeExpense(idx)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                value={exp.description || ''}
                                                onChange={e => {
                                                    const newE = [...expenses]; newE[idx].description = e.target.value; setExpenses(newE)
                                                }}
                                                placeholder="Keterangan..."
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none mb-2 text-slate-700 placeholder:text-slate-400"
                                            />
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                                <input
                                                    type="number"
                                                    value={exp.amount || ''}
                                                    onChange={e => {
                                                        const newE = [...expenses]; newE[idx].amount = +e.target.value; setExpenses(newE)
                                                    }}
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold outline-none text-slate-800 placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={addExpense}
                                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors active:bg-slate-50 flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Tambah Biaya
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3 safe-area-bottom">
                    <button
                        onClick={onClose}
                        className="flex-none px-5 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 active:bg-slate-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.customerId || !form.location}
                        className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? 'Menyimpan...' : isEdit ? 'Perbarui Survey' : 'Buat Survey'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
