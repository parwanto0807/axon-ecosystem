"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    MapPin, Clock, Check, Ban, Receipt,
    Briefcase, Users, DollarSign, ChevronRight,
    Filter, SlidersHorizontal, ArrowLeft, MoreVertical,
    Home, ChevronRight as ArrowRight, Building2, Calendar
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
    PLANNED: { label: 'Planned', bg: 'bg-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', icon: Clock },
    IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', icon: MapPin },
    COMPLETED: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-400', icon: Ban },
}

const EXPENSE_STATUS: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
    APPROVED: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-100', text: 'text-rose-800' },
    POSTED: { label: 'Posted', bg: 'bg-indigo-100', text: 'text-indigo-800' },
}

const EXPENSE_CATEGORIES = ['TRANSPORT', 'MEAL', 'ACCOMMODATION', 'OFFICE', 'OTHER']
const CATEGORY_EMOJI: Record<string, string> = {
    TRANSPORT: '🚗', MEAL: '🍱', ACCOMMODATION: '🏨', OFFICE: '📋', OTHER: '📦'
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
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
                    className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-500 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap
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
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, { headers: { 'x-user-role': 'SUPER_ADMIN' } })
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
        <div className="min-h-screen bg-white">
            {/* ─── HEADER ─── */}
            <header className="sticky top-16 lg:top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Dashboard</span>
                                    <span className="text-slate-300">›</span>
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Sales</span>
                                    <span className="text-slate-300">›</span>
                                    <span className="text-indigo-600 font-semibold">Field Surveys</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-slate-900 leading-none">Surveys</h1>
                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {surveys.length} survei
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                        >
                            <Plus size={16} />
                            Survei Baru
                        </button>
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            <Search size={16} />
                        </button>
                        <button
                            onClick={load}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
                            className="overflow-hidden mt-3"
                        >
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari nomor, lokasi, pelanggan..."
                                    className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status filter pills */}
                <div className="flex items-center gap-2 mt-3">
                    {['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => {
                        const isActive = filterStatus === s
                        const label = s === 'ALL' ? 'Semua' : STATUS_CONFIG[s]?.label || s
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {label}
                                {s !== 'ALL' && (
                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {surveys.filter(sv => sv.status === s).length}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </header>

            {/* ─── CONTENT ─── */}
            <div className="px-4 lg:px-5 pt-4 pb-32 space-y-4">

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Survei</p>
                        <p className="text-xl font-black text-slate-900">{surveys.length}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{completedCount} selesai</p>
                    </div>
                    <div className="bg-indigo-600 rounded-xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Total Biaya</p>
                        <p className="text-xl font-black text-white">{totalExpAll > 0 ? `${(totalExpAll / 1_000_000).toFixed(1)}M` : '0'}</p>
                        <p className="text-[10px] text-white/60 mt-1 font-medium">Rp</p>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-6 text-center text-sm text-slate-400 animate-pulse">Memuat...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                            <MapPin size={28} className="text-slate-300" />
                        </div>
                        <p className="font-semibold text-slate-500 text-sm">Tidak ada survei ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Survey</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pelanggan</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Lokasi</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">Proyek</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Biaya</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Tanggal</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s, idx) => {
                                        const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.PLANNED
                                        const StatusIcon = sc.icon
                                        const totalExp = s.expenses?.reduce((a, e) => a + e.amount, 0) || 0
                                        return (
                                            <motion.tr
                                                key={s.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                                        {s.number}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-semibold text-slate-800 text-sm">{s.customer?.name || '-'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={11} className="text-slate-400 shrink-0" />
                                                        <span className="text-sm text-slate-600 truncate max-w-45">{s.location}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[20px] text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                                                        <StatusIcon size={10} />
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {s.project ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                                            <Briefcase size={9} />
                                                            {s.project.number}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-semibold text-slate-800 text-sm">{totalExp > 0 ? fmt(totalExp) : '—'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm text-slate-500">{fmtDate(s.date)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => { setEditing(s); setModalOpen(true) }} aria-label="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">
                                                            <Edit size={11} />
                                                        </button>
                                                        <button onClick={() => handleDelete(s.id)} aria-label="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── FAB (mobile) ─── */}
            <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 active:bg-indigo-700 z-200"
            >
                <Plus size={24} className="text-white" />
            </button>

            {/* ─── TOAST ─── */}
            <Toast toast={toast} />

            {/* ─── MODAL ─── */}
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
    const [modalToast, setModalToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const addExpense = () => {
        setExpenses([...expenses, { category: 'TRANSPORT', amount: 0, description: '', status: 'APPROVED' }])
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
            if (res.ok) { onSuccess(); return }
            const err = await res.json().catch(() => ({ message: 'Gagal menyimpan survei' }))
            throw new Error(err.message)
        } catch (e: any) {
            const errMsg = e?.message || 'Gagal menyimpan survei';
            setModalToast({ type: 'error', msg: errMsg })
            setTimeout(() => setModalToast(null), 3500)
        } finally { setSaving(false) }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
    const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1"

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
                onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-lg lg:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200"
            >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-2 sm:hidden bg-white">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                            <MapPin size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 text-base leading-none">{isEdit ? 'Edit Survey' : 'Survei Baru'}</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">{isEdit ? survey?.number : 'Buat catatan survei lapangan'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                        <X size={16} />
                    </button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-slate-200 bg-white px-5">
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
                                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-lg text-indigo-600 font-semibold text-sm hover:bg-indigo-100 transition-colors"
                            >
                                <span>Lanjut ke Biaya Operasional</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="p-5 space-y-3">
                            {expenses.length > 0 && (
                                <div className="bg-slate-50 rounded-lg p-3.5 flex items-center justify-between border border-slate-100 mb-1">
                                    <p className="text-xs text-slate-500 font-medium">Total biaya</p>
                                    <p className="text-base font-bold text-slate-900">{fmt(totalExpenses)}</p>
                                </div>
                            )}

                            {expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                                    <Receipt size={32} className="text-slate-300 mb-3" />
                                    <p className="text-xs text-slate-400 font-medium">Belum ada biaya</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {expenses.map((exp, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-lg">{CATEGORY_EMOJI[exp.category || 'OTHER'] || '📦'}</span>
                                                <select
                                                    value={exp.category}
                                                    onChange={e => {
                                                        const newE = [...expenses]; newE[idx].category = e.target.value; setExpenses(newE)
                                                    }}
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none"
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
                                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-500 transition-colors active:bg-slate-50 flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Tambah Biaya
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-4 border-t border-slate-200 bg-white flex gap-3">
                    <button onClick={onClose} className="flex-none px-5 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.customerId || !form.location}
                        className="flex-1 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? 'Menyimpan...' : isEdit ? 'Perbarui Survey' : 'Buat Survey'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
