"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardCheck, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw, Calendar, FileText,
    Briefcase, Printer, PenTool, PackageCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import BASTPDFModal from "./BASTPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface BAST {
    id: string; number: string; date: string; status: string; type: string;
    customerId: string; customer: { name: string; code: string; address?: string };
    projectId?: string; project?: { number: string; name: string };
    salesOrderId?: string; salesOrder?: { number: string };
    workOrderId?: string; workOrder?: { number: string; title: string };
    notes?: string; receiverName?: string; technicianName?: string;
    technicianSignature?: string;
    items: BASTItem[];
    createdAt: string;
}

interface BASTItem {
    id?: string; no: number; description: string; qty: number; unit: string;
}

interface Ref { id: string; number: string; name?: string; customer?: { name: string } }

interface PillConfig { label: string; color: string; dot: string }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const BAST_TYPE: Record<string, PillConfig> = {
    PROJECT_COMPLETION: {
        label: "Penyelesaian Proyek",
        color: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400",
        dot: "bg-indigo-500",
    },
    UNIT_HANDOVER: {
        label: "Serah Terima Unit",
        color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    MAINTENANCE_VISIT: {
        label: "Kunjungan Maintenance",
        color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
        dot: "bg-amber-500",
    },
}

const BAST_STATUS: Record<string, PillConfig> = {
    DRAFT: { label: "Draft", color: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
    SIGNED: {
        label: "Signed",
        color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400",
        dot: "bg-blue-500",
    },
    COMPLETED: {
        label: "Completed",
        color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    CANCELLED: {
        label: "Cancelled",
        color: "border-border bg-muted text-muted-foreground line-through",
        dot: "bg-muted-foreground/40",
    },
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const selectClass = `${inputClass} cursor-pointer`

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

function Field({
    label,
    required,
    children,
    className = "",
}: {
    label: string
    required?: boolean
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-muted-foreground">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    )
}

function Pill({ config, label }: { config?: PillConfig; label: string }) {
    const c = config || {
        label,
        color: "border-border bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/50",
    }
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {c.label}
        </span>
    )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BASTPage() {

    const [basts, setBasts] = useState<BAST[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [workOrders, setWorkOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([])

    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [saving, setSaving] = useState(false)
    const [viewModal, setViewModal] = useState<BAST | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const [form, setForm] = useState({
        customerId: '', projectId: '', salesOrderId: '', workOrderId: '',
        date: new Date().toISOString().split('T')[0],
        type: 'PROJECT_COMPLETION',
        status: 'DRAFT',
        notes: '', receiverName: '', technicianName: '',
        items: [] as BASTItem[]
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [bastRes, prjRes, soRes, woRes, custRes, coRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/basts`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`).then(r => r.json())
            ])
            setBasts(bastRes)
            setProjects(prjRes)
            setSalesOrders(soRes)
            setWorkOrders(woRes)
            setCustomers(custRes)
            setCompany(coRes)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const handleSave = async () => {
        if (!form.customerId || form.items.length === 0) return showToast('error', 'Customer dan Item wajib diisi')
        setSaving(true)
        try {
            const payload = {
                ...form,
                projectId: form.projectId || null,
                salesOrderId: form.salesOrderId || null,
                workOrderId: form.workOrderId || null,
            }
            const url = editMode ? `${process.env.NEXT_PUBLIC_API_URL}/api/basts/${selectedId}` : `${process.env.NEXT_PUBLIC_API_URL}/api/basts`
            const method = editMode ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setModalOpen(false)
                showToast('success', editMode ? 'BAST diperbarui' : 'BAST berhasil dibuat')
                loadData()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menyimpan BAST')
            }
        } catch (e: any) {
            console.error(e)
            showToast('error', e.message || 'Terjadi kesalahan sistem')
        } finally { setSaving(false) }
    }

    const addItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { no: prev.items.length + 1, description: '', qty: 1, unit: 'pcs' }]
        }))
    }

    const removeItem = (idx: number) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }))
        }))
    }

    const updateItem = (idx: number, field: keyof BASTItem, val: any) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, [field]: val } : it)
        }))
    }

    const copyFromWorkOrder = (woId: string) => {
        const wo = (workOrders as any[]).find(w => w.id === woId);
        if (wo) {
            setForm(prev => ({
                ...prev,
                workOrderId: woId,
                customerId: wo.customerId || '',
                projectId: wo.projectId || '',
                salesOrderId: wo.salesOrderId || '',
                technicianName: wo.assignedTo || '',
                items: wo.items.map((it: any, i: number) => ({
                    no: i + 1,
                    description: it.description,
                    qty: it.qty,
                    unit: it.unit
                }))
            }))
        }
    }

    const copyFromSalesOrder = (soId: string) => {
        const so = (salesOrders as any[]).find(s => s.id === soId);
        if (so) {
            setForm(prev => ({
                ...prev,
                salesOrderId: soId,
                customerId: so.customerId || '',
                projectId: so.projectId || '',
                items: so.items.map((it: any, i: number) => ({
                    no: i + 1,
                    description: it.description,
                    qty: it.qty,
                    unit: it.unit
                }))
            }))
        }
    }

    const filtered = basts.filter(b =>
        b.number.toLowerCase().includes(search.toLowerCase()) ||
        b.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        b.project?.name.toLowerCase().includes(search.toLowerCase())
    )

    const stats = [
        { label: 'Total BAST', val: basts.length, icon: FileText },
        { label: 'Completed', val: basts.filter(b => b.status === 'COMPLETED').length, icon: CheckCircle2 },
        { label: 'Signed', val: basts.filter(b => b.status === 'SIGNED').length, icon: PenTool },
        { label: 'Unit Handover', val: basts.filter(b => b.type === 'UNIT_HANDOVER').length, icon: PackageCheck },
    ]

    const openEdit = (b: BAST) => {
        setSelectedId(b.id)
        setEditMode(true)
        setForm({
            customerId: b.customerId,
            projectId: b.projectId || '',
            salesOrderId: b.salesOrderId || '',
            workOrderId: b.workOrderId || '',
            date: b.date.split('T')[0],
            type: b.type,
            status: b.status,
            notes: b.notes || '',
            receiverName: b.receiverName || '',
            technicianName: b.technicianName || '',
            items: b.items
        })
        setModalOpen(true)
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                            <ClipboardCheck size={18} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Berita Acara (BAST)</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">Serah terima pekerjaan & handover proyek</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => { setEditMode(false); setForm({ ...form, items: [] }); setModalOpen(true) }}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        <Plus size={16} className="mr-1.5" />
                        Buat BAST
                    </Button>
                </header>

                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                                <s.icon size={14} className="text-muted-foreground" />
                            </div>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{s.val}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-sm">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Cari nomor BAST, Customer..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filtered.length} BAST
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ClipboardCheck size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Tidak ada BAST</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {search
                                ? "Coba sesuaikan pencarian untuk menemukan BAST yang Anda cari."
                                : "Belum ada BAST yang dibuat. Buat BAST pertama Anda untuk memulai."}
                        </p>
                        <Button
                            onClick={() => { setEditMode(false); setForm({ ...form, items: [] }); setModalOpen(true) }}
                            className="mt-5 h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Buat BAST
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Info BAST</th>
                                            <th className="px-3 py-2.5 font-medium">Tipe</th>
                                            <th className="px-3 py-2.5 font-medium">Customer / Project</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 font-medium">Penerima</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((b) => (
                                            <tr key={b.id} className="hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <p className="font-mono text-xs font-medium text-foreground">{b.number}</p>
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Calendar size={11} />
                                                        {fmtDate(b.date)}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Pill config={BAST_TYPE[b.type]} label={b.type} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-sm font-medium text-foreground">{b.customer.name}</p>
                                                    {b.project && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Briefcase size={11} />
                                                            {b.project.name}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Pill config={BAST_STATUS[b.status]} label={b.status} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-xs font-medium text-foreground">{b.receiverName || '—'}</p>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">Oleh: {b.technicianName || '—'}</p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button
                                                            onClick={() => setViewModal(b)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Print BAST"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Printer size={15} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => openEdit(b)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Edit BAST"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Edit size={15} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filtered.map((b) => (
                                <div key={b.id} className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-mono text-xs font-medium text-foreground">{b.number}</p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Calendar size={10} />
                                                {fmtDate(b.date)}
                                            </p>
                                        </div>
                                        <Pill config={BAST_TYPE[b.type]} label={b.type} />
                                    </div>
                                    <div className="mt-2.5">
                                        <p className="truncate text-sm font-medium text-foreground">{b.customer.name}</p>
                                        {b.project && (
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Briefcase size={10} />
                                                {b.project.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                        <Pill config={BAST_STATUS[b.status]} label={b.status} />
                                        <span>Penerima: <span className="font-medium text-foreground">{b.receiverName || '—'}</span></span>
                                        <span>Teknisi: <span className="font-medium text-foreground">{b.technicianName || '—'}</span></span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2">
                                        <Button
                                            onClick={() => setViewModal(b)}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            <Printer size={14} className="mr-1.5" /> Print
                                        </Button>
                                        <Button
                                            onClick={() => openEdit(b)}
                                            variant="ghost"
                                            size="icon"
                                            title="Edit BAST"
                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <Edit size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <ClipboardCheck size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            {editMode ? 'Edit BAST' : 'Buat BAST Baru'}
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            Lengkapi data serah terima pekerjaan di bawah ini
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setModalOpen(false)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </header>

                            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Referen Sales Order (Copy Data)">
                                        <select
                                            value={form.salesOrderId}
                                            onChange={e => copyFromSalesOrder(e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Sales Order untuk Copy Data...</option>
                                            {salesOrders.map(so => (
                                                <option key={so.id} value={so.id}>{so.number} - {so.name || (so as any).subject}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Referen Work Order (Copy Data)">
                                        <select
                                            value={form.workOrderId}
                                            onChange={e => copyFromWorkOrder(e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Work Order untuk Copy Data...</option>
                                            {workOrders.filter(w => (w as any).status !== 'CLOSED').map(wo => (
                                                <option key={wo.id} value={wo.id}>{wo.number} - {wo.name || (wo as any).title}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Tipe BAST">
                                        <select
                                            value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className={selectClass}
                                        >
                                            {Object.entries(BAST_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Customer" required>
                                        <select
                                            value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Project">
                                        <select
                                            value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                                            className={selectClass}
                                        >
                                            <option value="">Pilih Project...</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Tanggal">
                                        <input
                                            type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Status" className="sm:col-span-2">
                                        <select
                                            value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                            className={selectClass}
                                        >
                                            {Object.entries(BAST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </Field>
                                </div>

                                <div className="space-y-2 border-t border-border pt-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <ClipboardCheck size={13} /> Deskripsi Pekerjaan / Handover
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addItem}
                                            className="h-8 rounded-md px-3 text-xs font-medium"
                                        >
                                            <Plus size={13} className="mr-1" /> Tambah Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {form.items.map((it, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-start"
                                            >
                                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <input
                                                        placeholder="Deskripsi Hasil Pekerjaan..."
                                                        value={it.description}
                                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={it.qty}
                                                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                        className={`${inputClass} w-20 text-center`}
                                                    />
                                                    <input
                                                        placeholder="Unit"
                                                        value={it.unit}
                                                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                        className={`${inputClass} w-20 text-center`}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(idx)}
                                                        title="Hapus item"
                                                        className="h-9 w-9 flex-shrink-0 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {form.items.length === 0 && (
                                            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                                                Belum ada item. Tambahkan deskripsi pekerjaan.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
                                    <Field label="Teknisi / Penanggung Jawab">
                                        <input
                                            placeholder="Nama teknisi Axon..."
                                            value={form.technicianName}
                                            onChange={e => setForm({ ...form, technicianName: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Penerima (Customer Signature Name)">
                                        <input
                                            placeholder="Nama penerima/customer..."
                                            value={form.receiverName}
                                            onChange={e => setForm({ ...form, receiverName: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Catatan Tambahan" className="sm:col-span-2">
                                        <textarea
                                            placeholder="Catatan hasil serah terima..."
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            className={`${textareaClass} min-h-[88px]`}
                                        />
                                    </Field>
                                </div>
                            </div>

                            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalOpen(false)}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-9 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                                    Simpan BAST
                                </Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2"
                    >
                        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
                            {toast.type === 'success' ? (
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                            )}
                            <span className="text-sm font-medium text-foreground">{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewModal && (
                    <BASTPDFModal bastData={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}
