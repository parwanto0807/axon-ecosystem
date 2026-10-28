"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PackageCheck, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
    Clock, Calendar, FileText, Briefcase,
    Check, Ban, Printer
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import DeliveryOrderPDFModal from "./DeliveryOrderPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DO {
    id: string; number: string; date: string; status: string;
    customerId: string; customer: { name: string; code: string; address?: string };
    projectId?: string; project?: { number: string; name: string };
    salesOrderId?: string; salesOrder?: { number: string };
    workOrderId?: string; workOrder?: { number: string; title: string };
    notes?: string; receiverName?: string; deliveryAddress?: string;
    items: DOItem[];
    createdAt: string;
}

interface DOItem {
    id?: string; no: number; description: string; qty: number; unit: string;
}

interface Ref { id: string; number: string; name?: string; customer?: { name: string } }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const DO_STATUS: Record<string, { label: string; color: string; dot: string; icon: LucideIcon }> = {
    DRAFT: { label: 'Draft', color: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60', icon: Clock },
    SHIPPED: { label: 'Shipped', color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400', dot: 'bg-blue-500', icon: PackageCheck },
    DELIVERED: { label: 'Selesai Kirim', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
    INVOICED: { label: 'Invoiced', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500', icon: FileText },
    PAID: { label: 'Paid', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'border-border bg-muted text-muted-foreground line-through', dot: 'bg-muted-foreground/50', icon: Ban },
}

const STATUS_FILTERS = [
    { value: 'ALL', label: 'Semua' },
    ...Object.entries(DO_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
]

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

const pillBase = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"

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

function statusColor(status: string) {
    return DO_STATUS[status]?.color || 'border-border bg-muted text-muted-foreground'
}

function statusDot(status: string) {
    return DO_STATUS[status]?.dot || 'bg-muted-foreground/50'
}

function statusLabel(status: string) {
    return DO_STATUS[status]?.label || status
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DeliveryOrdersPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role
    const userName = session?.user?.name || ''
    const userDept = (session?.user as any)?.department || ''

    const [dos, setDos] = useState<DO[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [workOrders, setWorkOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string; address?: string }[]>([])

    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    const [saving, setSaving] = useState(false)
    const [viewModal, setViewModal] = useState<DO | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [openStatusId, setOpenStatusId] = useState<string | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const [form, setForm] = useState({
        customerId: '', projectId: '', salesOrderId: '', workOrderId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '', receiverName: '', deliveryAddress: '',
        items: [] as DOItem[]
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const headers = {
                'x-user-role': userRole || '',
                'x-user-dept': userDept || '',
                'x-user-name': userName || ''
            }

            const [doRes, prjRes, soRes, woRes, custRes, coRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders`, { headers }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, { headers }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, { headers }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`, { headers }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, { headers }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers }).then(r => r.json())
            ])
            setDos(Array.isArray(doRes) ? doRes : [])
            setProjects(Array.isArray(prjRes) ? prjRes : [])
            setSalesOrders(Array.isArray(soRes) ? soRes : [])
            setWorkOrders(Array.isArray(woRes) ? woRes : [])
            setCustomers(Array.isArray(custRes) ? custRes : [])
            setCompany(Array.isArray(coRes) ? {} : coRes || {})
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [userRole, userDept, userName])

    useEffect(() => { loadData() }, [loadData])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (openStatusId && !target.closest('.status-dropdown')) setOpenStatusId(null)
        }
        if (openStatusId) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [openStatusId])

    const handleStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': userRole || '',
                    'x-user-dept': userDept || '',
                    'x-user-name': userName || ''
                },
                body: JSON.stringify({ status })
            })
            if (res.ok) { showToast('success', 'Status DO diperbarui'); loadData() }
            else { const err = await res.json(); showToast('error', err.message || 'Gagal update status') }
        } catch (e: any) { showToast('error', e.message || 'Terjadi kesalahan sistem') }
    }

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
            const url = editMode ? `${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders/${selectedId}` : `${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders`
            const method = editMode ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-role': userRole || '',
                    'x-user-dept': userDept || '',
                    'x-user-name': userName || ''
                },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setModalOpen(false)
                showToast('success', editMode ? 'DO diperbarui' : 'DO berhasil dibuat')
                loadData()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menyimpan DO')
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

    const updateItem = (idx: number, field: keyof DOItem, val: any) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, [field]: val } : it)
        }))
    }

    const copyFromWorkOrder = (woId: string) => {
        const wo = (workOrders as any[]).find(w => w.id === woId);
        if (wo) {
            const srcItems = (wo.items && wo.items.length) ? wo.items : (wo.salesOrder?.items || [])
            setForm(prev => ({
                ...prev,
                workOrderId: woId,
                customerId: wo.customerId || '',
                projectId: wo.projectId || '',
                salesOrderId: wo.salesOrderId || '',
                deliveryAddress: wo.customer?.address || prev.deliveryAddress,
                items: srcItems
                    .map((it: any, i: number) => ({
                        no: i + 1,
                        description: it.sku ? `${it.sku.code} - ${it.sku.product.name}` : (it.description || ''),
                        qty: it.qty,
                        unit: it.unit
                    }))
            }))
        }
    }

    const filtered = dos.filter(d => {
        const matchesSearch =
            d.number.toLowerCase().includes(search.toLowerCase()) ||
            d.customer.name.toLowerCase().includes(search.toLowerCase()) ||
            d.project?.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const openCreate = () => {
        setEditMode(false)
        setForm({ ...form, items: [] })
        setModalOpen(true)
    }

    const openEdit = (d: DO) => {
        setSelectedId(d.id)
        setEditMode(true)
        setForm({
            customerId: d.customerId,
            projectId: d.projectId || '',
            salesOrderId: d.salesOrderId || '',
            workOrderId: d.workOrderId || '',
            date: d.date.split('T')[0],
            notes: d.notes || '',
            receiverName: d.receiverName || '',
            deliveryAddress: d.deliveryAddress || '',
            items: d.items
        })
        setModalOpen(true)
    }

    const stats = [
        { label: 'Total DO', val: dos.length, icon: FileText },
        { label: 'Delivered', val: dos.filter(d => d.status === 'DELIVERED').length, icon: CheckCircle2 },
        { label: 'Pending', val: dos.filter(d => d.status === 'DRAFT' || d.status === 'SHIPPED').length, icon: Clock },
        { label: 'Bulan Ini', val: dos.filter(d => new Date(d.date).getMonth() === new Date().getMonth()).length, icon: Calendar },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                {/* Header */}
                <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Delivery Order</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Pengiriman barang ke lokasi Customer</p>
                    </div>
                    <Button onClick={openCreate} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        Buat Surat Jalan
                    </Button>
                </header>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <s.icon size={14} />
                                </span>
                                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                            </div>
                            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{s.val}</p>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Cari nomor DO, Customer..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {STATUS_FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => setStatusFilter(f.value)}
                                    className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors ${
                                        statusFilter === f.value
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground lg:ml-auto">
                        {filtered.length} {filtered.length === 1 ? "delivery order" : "delivery orders"}
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <PackageCheck size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Tidak ada Delivery Order</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {search || statusFilter !== 'ALL'
                                ? "Coba sesuaikan pencarian atau filter untuk menemukan data."
                                : "Belum ada surat jalan. Buat surat jalan pertama Anda."}
                        </p>
                        <Button onClick={openCreate} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Buat Surat Jalan
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
                                            <th className="px-3 py-2.5 font-medium">Info DO</th>
                                            <th className="px-3 py-2.5 font-medium">Customer / Project</th>
                                            <th className="px-3 py-2.5 font-medium">Items</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((d) => (
                                            <tr key={d.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <p className="text-sm font-medium text-foreground">{d.number}</p>
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Calendar size={11} /> {fmtDate(d.date)}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-sm font-medium text-foreground">{d.customer.name}</p>
                                                    {d.project && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Briefcase size={11} /> {d.project.name}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                        {d.items.length} items
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="status-dropdown relative inline-block">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenStatusId(openStatusId === d.id ? null : d.id)}
                                                            className={`${pillBase} cursor-pointer select-none ${statusColor(d.status)}`}
                                                        >
                                                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(d.status)}`} />
                                                            {statusLabel(d.status)}
                                                            <ChevronDown size={10} />
                                                        </button>
                                                        {openStatusId === d.id && (
                                                            <div className="absolute left-0 z-50 mt-1 min-w-[150px] rounded-lg border border-border bg-card p-1 shadow-lg">
                                                                {Object.keys(DO_STATUS).map(k => (
                                                                    <button
                                                                        key={k}
                                                                        onClick={() => { handleStatus(d.id, k); setOpenStatusId(null) }}
                                                                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                                                                            d.status === k ? 'font-medium text-foreground' : 'text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {DO_STATUS[k].label}
                                                                        {d.status === k && <Check size={12} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button
                                                            onClick={() => setViewModal(d)}
                                                            title="Print DO"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Printer size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEdit(d)}
                                                            title="Edit DO"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
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
                            {filtered.map((d) => (
                                <div key={d.id} className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-foreground">{d.number}</p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Calendar size={10} /> {fmtDate(d.date)}
                                            </p>
                                        </div>
                                        <div className="status-dropdown relative inline-block">
                                            <button
                                                type="button"
                                                onClick={() => setOpenStatusId(openStatusId === d.id ? null : d.id)}
                                                className={`${pillBase} cursor-pointer select-none ${statusColor(d.status)}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(d.status)}`} />
                                                {statusLabel(d.status)}
                                                <ChevronDown size={10} />
                                            </button>
                                            {openStatusId === d.id && (
                                                <div className="absolute right-0 z-50 mt-1 min-w-[150px] rounded-lg border border-border bg-card p-1 shadow-lg">
                                                    {Object.keys(DO_STATUS).map(k => (
                                                        <button
                                                            key={k}
                                                            onClick={() => { handleStatus(d.id, k); setOpenStatusId(null) }}
                                                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                                                                d.status === k ? 'font-medium text-foreground' : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {DO_STATUS[k].label}
                                                            {d.status === k && <Check size={12} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-foreground">{d.customer.name}</p>
                                        {d.project && (
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Briefcase size={10} /> {d.project.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                                        <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {d.items.length} items
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => setViewModal(d)}
                                                title="Print DO"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Printer size={15} />
                                            </button>
                                            <button
                                                onClick={() => openEdit(d)}
                                                title="Edit DO"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit size={15} />
                                            </button>
                                        </div>
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
                            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <PackageCheck size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            {editMode ? 'Edit Delivery Order' : 'Buat DO Baru'}
                                        </h2>
                                        <p className="text-[11px] text-muted-foreground">Lengkapi data serah terima barang di bawah ini</p>
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
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Referen Work Order (Copy Data)" className="sm:col-span-2">
                                        <select
                                            value={form.workOrderId}
                                            onChange={e => copyFromWorkOrder(e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">Pilih Work Order untuk Copy Data...</option>
                                            {workOrders.map((w: any) => {
                                                const src = (w.items && w.items.length) ? w.items : (w.salesOrder?.items || [])
                                                return (
                                                    <option key={w.id} value={w.id}>
                                                        {w.number} — {src.map((it: any) => it.description).join(' · ') || (w.name || w.title)}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                    </Field>

                                    <Field label="Customer" required>
                                        <select
                                            value={form.customerId}
                                            onChange={e => {
                                                const cId = e.target.value;
                                                const cust = customers.find(c => c.id === cId);
                                                setForm({
                                                    ...form,
                                                    customerId: cId,
                                                    deliveryAddress: cust?.address || form.deliveryAddress
                                                })
                                            }}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">Pilih Customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Project">
                                        <select
                                            value={form.projectId}
                                            onChange={e => setForm({ ...form, projectId: e.target.value })}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">Pilih Project...</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Sales Order">
                                        <select
                                            value={form.salesOrderId}
                                            onChange={e => setForm({ ...form, salesOrderId: e.target.value })}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">Pilih Sales Order...</option>
                                            {salesOrders.map(so => <option key={so.id} value={so.id}>{so.number}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Tanggal">
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={e => setForm({ ...form, date: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                {/* Items Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                            <PackageCheck size={14} /> Daftar Barang / Hasil Pekerjaan
                                        </h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addItem}
                                            className="h-8 rounded-lg px-3 text-xs font-medium"
                                        >
                                            <Plus size={13} className="mr-1" /> Tambah Item
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.items.map((it, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    placeholder="Deskripsi Barang / Jasa..."
                                                    value={it.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    className={`${inputClass} min-w-0 flex-1`}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={it.qty}
                                                    onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                    className={`${inputClass} w-16 text-center sm:w-20`}
                                                />
                                                <input
                                                    placeholder="Unit"
                                                    value={it.unit}
                                                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                    className={`${inputClass} w-16 text-center sm:w-20`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    title="Hapus item"
                                                    className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        ))}
                                        {form.items.length === 0 && (
                                            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                                                Belum ada item. Tambahkan barang atau hasil pekerjaan.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Delivery Info */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Penerima (Receiver Name)">
                                        <input
                                            placeholder="Nama penandatangan BAST..."
                                            value={form.receiverName}
                                            onChange={e => setForm({ ...form, receiverName: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Alamat Pengiriman" className="sm:col-span-2">
                                        <textarea
                                            placeholder="Alamat serah terima..."
                                            value={form.deliveryAddress}
                                            onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
                                            rows={3}
                                            className={textareaClass}
                                        />
                                    </Field>
                                    <Field label="Catatan" className="sm:col-span-2">
                                        <textarea
                                            placeholder="Catatan tambahan..."
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            rows={2}
                                            className={textareaClass}
                                        />
                                    </Field>
                                </div>
                            </div>

                            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                                <Button
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
                                    Simpan DO
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
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2"
                    >
                        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
                            {toast.type === 'success'
                                ? <CheckCircle2 size={16} className="text-emerald-500" />
                                : <AlertCircle size={16} className="text-rose-500" />}
                            <span className="text-sm font-medium text-foreground">{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewModal && (
                    <DeliveryOrderPDFModal doData={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}
