"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    MapPin,
    Receipt,
    Briefcase,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; code: string }
interface Project { id: string; number: string; name: string; customerId: string }
interface SurveyExpense { id: string; category: string; amount: number; description: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface FieldSurvey {
    id: string; number: string; date: string; location: string; status: string; findings: string | null;
    customerId: string; customer: Customer; projectId: string | null; project: Project | null;
    expenses: SurveyExpense[]; createdAt: string;
    latitude?: number | null; longitude?: number | null
}

const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string }> = {
    PLANNED: {
        label: 'Planned',
        pill: 'border-border bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/60',
    },
    IN_PROGRESS: {
        label: 'In Progress',
        pill: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400',
        dot: 'bg-blue-500',
    },
    COMPLETED: {
        label: 'Completed',
        pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    CANCELLED: {
        label: 'Cancelled',
        pill: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400',
        dot: 'bg-rose-500',
    },
}

const EXPENSE_CATEGORIES = ['TRANSPORT', 'MEAL', 'ACCOMMODATION', 'OFFICE', 'OTHER']
const CATEGORY_EMOJI: Record<string, string> = {
    TRANSPORT: '🚗', MEAL: '🍱', ACCOMMODATION: '🏨', OFFICE: '📋', OTHER: '📦'
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

// ─── STATUS PILL ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNED
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${sc.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
        </span>
    )
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toast }: { toast: { type: 'success' | 'error'; msg: string } | null }) {
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-24 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-2xl"
                >
                    {toast.type === 'success'
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <AlertCircle size={16} className="text-rose-500" />}
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
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                {/* ─── HEADER ─── */}
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Surveys</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Field survey records, locations and operational costs
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowSearch(!showSearch)}
                            title="Search"
                            className="h-9 w-9 rounded-lg"
                        >
                            <Search size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={load}
                            title="Refresh"
                            className="h-9 w-9 rounded-lg"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Survei Baru
                        </Button>
                    </div>
                </header>

                {/* ─── SEARCH ─── */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-4 overflow-hidden"
                        >
                            <div className="relative">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari nomor, lokasi, pelanggan..."
                                    className={`${inputClass} pl-9 pr-9`}
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── STATS ─── */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-card p-3.5">
                        <p className="text-xs font-medium text-muted-foreground">Total Survei</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{surveys.length}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{completedCount} selesai</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3.5">
                        <p className="text-xs font-medium text-muted-foreground">Total Biaya</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                            {totalExpAll > 0 ? `${(totalExpAll / 1_000_000).toFixed(1)}M` : '0'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Rp</p>
                    </div>
                </div>

                {/* ─── STATUS FILTER ─── */}
                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    {['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => {
                        const isActive = filterStatus === s
                        const label = s === 'ALL' ? 'Semua' : STATUS_CONFIG[s]?.label || s
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                                    isActive
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {label}
                                {s !== 'ALL' && (
                                    <span className={`rounded px-1 text-[10px] ${isActive ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'}`}>
                                        {surveys.filter(sv => sv.status === s).length}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                    <span className="ml-auto text-xs text-muted-foreground">
                        {filtered.length} survei
                    </span>
                </div>

                {/* ─── CONTENT ─── */}
                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <MapPin size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Tidak ada survei ditemukan</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            Coba ubah filter atau kata kunci pencarian
                        </p>
                        <Button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="mt-5 h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Survei Baru
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Survey</th>
                                            <th className="px-3 py-2.5 font-medium">Pelanggan</th>
                                            <th className="px-3 py-2.5 font-medium">Lokasi</th>
                                            <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-center font-medium">Proyek</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Biaya</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((s, idx) => {
                                            const totalExp = s.expenses?.reduce((a, e) => a + e.amount, 0) || 0
                                            return (
                                                <motion.tr
                                                    key={s.id}
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className="group transition-colors hover:bg-muted/30"
                                                >
                                                    <td className="px-3 py-2.5">
                                                        <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                                                            {s.number}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <span className="text-sm font-medium text-foreground">{s.customer?.name || '-'}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={12} className="flex-shrink-0 text-muted-foreground" />
                                                            <span className="max-w-[220px] truncate text-sm text-muted-foreground">{s.location}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <StatusPill status={s.status} />
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {s.project ? (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                <Briefcase size={10} />
                                                                {s.project.number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className="text-sm tabular-nums text-foreground">{totalExp > 0 ? fmt(totalExp) : '—'}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className="text-xs text-muted-foreground">{fmtDate(s.date)}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <Button
                                                                onClick={() => { setEditing(s); setModalOpen(true) }}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Edit survey"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Edit size={15} />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(s.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete survey"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2 size={15} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 lg:hidden">
                            {filtered.map((s, idx) => {
                                const totalExp = s.expenses?.reduce((a, e) => a + e.amount, 0) || 0
                                return (
                                    <motion.div
                                        key={s.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className="rounded-xl border border-border bg-card p-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                                                    {s.number}
                                                </span>
                                                <p className="mt-1.5 truncate text-sm font-medium text-foreground">{s.customer?.name || '-'}</p>
                                            </div>
                                            <StatusPill status={s.status} />
                                        </div>

                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <MapPin size={12} className="flex-shrink-0" />
                                                <span className="truncate">{s.location}</span>
                                            </div>
                                            {s.project && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Briefcase size={12} className="flex-shrink-0" />
                                                    <span className="truncate">{s.project.number}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                                            <span>
                                                Biaya{' '}
                                                <span className="font-medium text-foreground">{totalExp > 0 ? fmt(totalExp) : '—'}</span>
                                            </span>
                                            <span>{fmtDate(s.date)}</span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-end gap-0.5">
                                            <Button
                                                onClick={() => { setEditing(s); setModalOpen(true) }}
                                                variant="ghost"
                                                size="icon"
                                                title="Edit survey"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(s.id)}
                                                variant="ghost"
                                                size="icon"
                                                title="Delete survey"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

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

function SurveyMap({ lat, lon, className = "" }: { lat: number; lon: number; className?: string }) {
    if (!lat || !lon) return null
    const mapUrl = `https://maps.google.com/maps?ll=${lat},${lon}&q=${lat},${lon}&hl=id&t=&z=16&ie=UTF8&iwloc=&output=embed`
    return (
        <div className={`overflow-hidden rounded-lg border border-border bg-muted ${className}`}>
            <iframe key={`${lat}-${lon}`} src={mapUrl} title="Peta Lokasi Survey" className="h-full w-full" loading="lazy" />
        </div>
    )
}

const geocodeLocation = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
        }
    } catch { }
    return null
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
        latitude: survey?.latitude?.toString() || '',
        longitude: survey?.longitude?.toString() || '',
        findings: survey?.findings || '',
        date: survey?.date ? survey.date.split('T')[0] : today,
        status: survey?.status || 'PLANNED'
    })
    const [expenses, setExpenses] = useState<Partial<SurveyExpense>[]>(survey?.expenses || [])
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState<'info' | 'expenses'>('info')
    const [modalToast, setModalToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [geoBusy, setGeoBusy] = useState(false)

    const showModalToast = (type: 'success' | 'error', msg: string) => {
        setModalToast({ type, msg })
        setTimeout(() => setModalToast(null), 3500)
    }

    const applyGeo = async () => {
        if (!form.location.trim()) return showModalToast('error', 'Isi Lokasi dulu')
        setGeoBusy(true)
        try {
            const coords = await geocodeLocation(form.location)
            if (coords) {
                setForm(f => ({ ...f, latitude: coords.lat.toFixed(6), longitude: coords.lon.toFixed(6) }))
                showModalToast('success', 'Koordinat ditemukan dari Lokasi')
            } else {
                showModalToast('error', 'Lokasi tidak ditemukan, coba detailkan alamatnya')
            }
        } finally { setGeoBusy(false) }
    }

    const useMyLocation = () => {
        if (!navigator.geolocation) return showModalToast('error', 'Browser tidak mendukung geolokasi')
        setGeoBusy(true)
        navigator.geolocation.getCurrentPosition(async pos => {
            if (form.location.trim()) {
                const coords = await geocodeLocation(form.location)
                if (coords) {
                    setForm(f => ({ ...f, latitude: coords.lat.toFixed(6), longitude: coords.lon.toFixed(6) }))
                    showModalToast('success', 'Koordinat diarahkan ke alamat Lokasi')
                    setGeoBusy(false)
                    return
                }
            }
            setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }))
            setGeoBusy(false)
        }, () => { setGeoBusy(false); showModalToast('error', 'Gagal mengambil lokasi') })
    }

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
                body: JSON.stringify({
                    ...form,
                    latitude: form.latitude ? parseFloat(form.latitude.replace(',', '.')) : null,
                    longitude: form.longitude ? parseFloat(form.longitude.replace(',', '.')) : null,
                    expenses
                })
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

    const labelCls = "block text-xs font-medium text-muted-foreground"

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
                onClick={e => e.stopPropagation()}
                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-xl sm:rounded-2xl"
            >
                {/* Header */}
                <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <MapPin size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Edit Survey' : 'Survei Baru'}</h2>
                            <p className="text-[11px] text-muted-foreground">{isEdit ? survey?.number : 'Buat catatan survei lapangan'}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <X size={16} />
                    </Button>
                </header>

                {/* Step tabs */}
                <div className="flex border-b border-border px-4">
                    {(['info', 'expenses'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStep(s)}
                            className={`h-9 flex-1 border-b-2 text-xs font-medium transition-colors ${
                                step === s
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {s === 'info' ? 'Info Survei' : `Biaya (${expenses.length})`}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {step === 'info' ? (
                        <div className="space-y-4 p-4 sm:p-5">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Pelanggan *</label>
                                <select
                                    required
                                    value={form.customerId}
                                    onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Pilih Pelanggan --</option>
                                    {Array.isArray(customers) && customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelCls}>Proyek (Opsional)</label>
                                <select
                                    value={form.projectId}
                                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Tanpa Proyek --</option>
                                    {Array.isArray(projects) && projects
                                        .filter(p => !form.customerId || p.customerId === form.customerId)
                                        .map(p => <option key={p.id} value={p.id}>{p.number} – {p.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelCls}>Lokasi *</label>
                                <input
                                    required
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder="Kota, Nama Kantor..."
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Latitude</label>
                                    <input
                                        value={form.latitude}
                                        onChange={e => setForm({ ...form, latitude: e.target.value })}
                                        placeholder="-6.200000"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Longitude</label>
                                    <input
                                        value={form.longitude}
                                        onChange={e => setForm({ ...form, longitude: e.target.value })}
                                        placeholder="106.800000"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Peta Lokasi</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={applyGeo}
                                        disabled={geoBusy || !form.location.trim()}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={geoBusy ? 'animate-spin' : ''} /> Cari dari Lokasi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={useMyLocation}
                                        disabled={geoBusy}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline disabled:opacity-50"
                                    >
                                        <MapPin size={12} /> Pakai Lokasi Saya
                                    </button>
                                </div>
                            </div>
                            <SurveyMap
                                lat={parseFloat(form.latitude.replace(',', '.')) || 0}
                                lon={parseFloat(form.longitude.replace(',', '.')) || 0}
                                className="h-44"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Tanggal</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelCls}>Temuan / Kebutuhan</label>
                                <textarea
                                    rows={4}
                                    value={form.findings}
                                    onChange={e => setForm({ ...form, findings: e.target.value })}
                                    placeholder="Hasil survei, catatan lapangan..."
                                    className={`${inputClass} h-auto resize-none py-2.5`}
                                />
                            </div>

                            <button
                                onClick={() => setStep('expenses')}
                                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                <span>Lanjut ke Biaya Operasional</span>
                                <ChevronRight size={16} className="text-muted-foreground" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 p-4 sm:p-5">
                            {expenses.length > 0 && (
                                <div className="mb-1 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                                    <p className="text-xs font-medium text-muted-foreground">Total biaya</p>
                                    <p className="text-sm font-semibold tabular-nums text-foreground">{fmt(totalExpenses)}</p>
                                </div>
                            )}

                            {expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-10">
                                    <Receipt size={24} className="text-muted-foreground" />
                                    <p className="mt-2 text-xs text-muted-foreground">Belum ada biaya</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {expenses.map((exp, idx) => (
                                        <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-base">{CATEGORY_EMOJI[exp.category || 'OTHER'] || '📦'}</span>
                                                <select
                                                    value={exp.category}
                                                    onChange={e => {
                                                        const newE = [...expenses]; newE[idx].category = e.target.value; setExpenses(newE)
                                                    }}
                                                    className={`${inputClass} h-9 flex-1 cursor-pointer`}
                                                >
                                                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                                {(!exp.status || exp.status === 'PENDING') && (
                                                    <button
                                                        onClick={() => removeExpense(idx)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
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
                                                className={`${inputClass} mb-2`}
                                            />
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                                                <input
                                                    type="number"
                                                    value={exp.amount || ''}
                                                    onChange={e => {
                                                        const newE = [...expenses]; newE[idx].amount = +e.target.value; setExpenses(newE)
                                                    }}
                                                    placeholder="0"
                                                    className={`${inputClass} pl-9 font-medium`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={addExpense}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground active:bg-muted/30"
                            >
                                <Plus size={16} /> Tambah Biaya
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || !form.customerId || !form.location}
                        className="h-9 flex-1 rounded-lg px-4 text-sm font-medium"
                    >
                        {saving ? 'Menyimpan...' : isEdit ? 'Perbarui Survey' : 'Buat Survey'}
                    </Button>
                </footer>
            </motion.div>
            <Toast toast={modalToast} />
        </motion.div>
    )
}
