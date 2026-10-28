"use client"

import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PackageMinus, Plus, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, Check, Ban, DollarSign, AlertTriangle,
    Clock, Search, Wrench, MapPin, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

interface Warehouse { id: string; code: string; name: string }
interface SKUStock {
    id: string; code: string; name: string; purchasePrice: number; salePrice: number;
    totalQty: number;
    warehouseStocks: { warehouse: { id: string; name: string }; quantity: number }[];
    product: { name: string }
}
interface Movement {
    id: string; number: string; status: string; date: string;
    warehouse: Warehouse;
    workOrder?: {
        number: string;
        title: string;
        project?: { id: string; number: string; name: string };
        customer?: { id: string; name: string; code: string };
    };
    items: { id: string; qty: number; unitCost: number; sku: { code: string; product: { name: string } } }[];
    notes?: string;
    referenceNumber?: string;
}
interface WorkOrder { id: string; number: string; title: string; status: string; items: any[] }
interface FormItem { skuId: string; qty: number; unitCost: number; availableQty: number; description?: string }

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; icon: any }> = {
    DRAFT: {
        label: 'Draft',
        color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
        dot: 'bg-amber-500',
        icon: Clock
    },
    CONFIRMED: {
        label: 'Confirmed',
        color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        icon: CheckCircle2
    },
    CANCELLED: {
        label: 'Cancelled',
        color: 'border-border bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/50',
        icon: Ban
    }
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const itemInputClass =
    "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

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

function StatusPill({ status }: { status: string }) {
    const st = STATUS_CFG[status] || STATUS_CFG.DRAFT
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.label}
        </span>
    )
}

export default function StockOutPage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKUStock[]>([])
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [form, setForm] = useState({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '', referenceNumber: '', workOrderId: '' })
    const [items, setItems] = useState<FormItem[]>([])
    const [saving, setSaving] = useState(false)
    const [viewMovement, setViewMovement] = useState<Movement | null>(null)

    // Search and Filter
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes, woRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements?type=OUT`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`)
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
            setWorkOrders((await woRes.json()).filter((wo: any) => ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(wo.status)))
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const getAvailableQty = (skuId: string, whId: string) => {
        const sku = skus.find(s => s.id === skuId)
        if (!sku) return 0
        const ws = sku.warehouseStocks.find(w => w.warehouse?.id === whId)
        return ws?.quantity || 0
    }

    const addItem = () => setItems([...items, { skuId: '', qty: 1, unitCost: 0, availableQty: 0 }])
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
    const updateItem = (i: number, field: string, val: unknown) => {
        const newItems = [...items]
        newItems[i] = { ...newItems[i], [field]: val }
        if (field === 'skuId' || (field !== 'qty' && field !== 'unitCost')) {
            const skuId = field === 'skuId' ? val as string : newItems[i].skuId
            const sku = skus.find(s => s.id === skuId)
            if (sku) {
                newItems[i].unitCost = sku.purchasePrice
                newItems[i].availableQty = getAvailableQty(skuId, form.warehouseId)
            }
        }
        setItems(newItems)
    }

    useEffect(() => {
        if (form.workOrderId && skus.length > 0) {
            const wo = workOrders.find(w => w.id === form.workOrderId)
            if (wo && wo.items) {
                const materialItems = wo.items
                    .filter((i: any) => i.type === 'MATERIAL' && i.source === 'STOCK' && i.skuId)
                    .map((i: any) => {
                        const sku = skus.find(s => s.id === i.skuId)
                        return {
                            skuId: i.skuId,
                            qty: i.qty,
                            unitCost: sku?.purchasePrice || 0,
                            availableQty: getAvailableQty(i.skuId, form.warehouseId),
                            description: i.description
                        }
                    })
                setItems(materialItems)
                if (wo.number) setForm(prev => ({ ...prev, referenceNumber: wo.number }))
            }
        }
    }, [form.workOrderId, skus, form.warehouseId, workOrders])

    const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0)
    const hasOverIssue = items.some(i => {
        const avail = form.warehouseId ? getAvailableQty(i.skuId, form.warehouseId) : 0;
        return !!i.skuId && !!form.warehouseId && i.qty > avail;
    })

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    type: 'OUT',
                    referenceType: form.workOrderId ? 'WORK_ORDER' : 'MANUAL',
                    items: items.map(i => ({ skuId: i.skuId, qty: i.qty, unitCost: i.unitCost }))
                })
            })
            if (res.ok) {
                setModalOpen(false);
                setItems([]);
                setForm({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '', referenceNumber: '', workOrderId: '' });
                showToast('success', 'Pengeluaran barang dibuat');
                load()
            }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
        if (res.ok) { showToast('success', 'Barang keluar dikonfirmasi!'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const filtered = movements.filter(m => {
        const s = search.toLowerCase()
        const matchSearch = m.number.toLowerCase().includes(s) ||
            m.warehouse?.name?.toLowerCase().includes(s) ||
            m.workOrder?.number?.toLowerCase().includes(s) ||
            m.workOrder?.project?.name?.toLowerCase().includes(s) ||
            m.workOrder?.project?.number?.toLowerCase().includes(s) ||
            m.workOrder?.customer?.name?.toLowerCase().includes(s) ||
            m.items.some(it => it.sku?.product?.name?.toLowerCase().includes(s)) ||
            m.notes?.toLowerCase().includes(s) ||
            m.referenceNumber?.toLowerCase().includes(s);
        const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
        return matchSearch && matchStatus;
    })

    // Stats
    const totalOutValue = movements.filter(m => m.status === 'CONFIRMED').reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.qty * i.unitCost, 0), 0)
    const pendingCount = movements.filter(m => m.status === 'DRAFT').length
    const confirmedCount = movements.filter(m => m.status === 'CONFIRMED').length

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className={`fixed right-4 top-4 z-[300] flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg ${
                                toast.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                        >
                            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Stok Keluar</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Logistik &amp; Pengeluaran Barang</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={load}
                            className="h-9 rounded-lg px-3 text-sm font-medium"
                        >
                            <RefreshCw size={15} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                            Reload
                        </Button>
                        <Button
                            onClick={() => setModalOpen(true)}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Tambah stok keluar
                        </Button>
                    </div>
                </header>

                {/* Summary */}
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Total Pengeluaran', value: movements.length, icon: PackageMinus },
                        { label: 'Pending (Draft)', value: pendingCount, icon: Clock },
                        { label: 'Confirmed', value: confirmedCount, icon: CheckCircle2 },
                        { label: 'Total Nilai (Keluar)', value: fmt(totalOutValue), icon: DollarSign },
                    ].map((s) => (
                        <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <s.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-[11px] text-muted-foreground">{s.label}</p>
                                <p className="truncate text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari Nomor, Proyek..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setFilterStatus(s)}
                                    className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors ${
                                        filterStatus === s
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {s === 'ALL' ? 'Semua' : STATUS_CFG[s]?.label || s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                    <th className="px-3 py-2.5 font-medium">Informasi Pengeluaran</th>
                                    <th className="px-3 py-2.5 font-medium">Konteks Proyek / WO</th>
                                    <th className="px-3 py-2.5 font-medium">Gudang &amp; Items</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Total Nilai</th>
                                    <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-16">
                                            <div className="flex justify-center">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-16">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <PackageMinus size={22} />
                                                </div>
                                                <p className="text-sm font-medium text-foreground">Data tidak ditemukan</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Coba ubah pencarian atau filter status.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.map(m => {
                                    const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                                    return (
                                        <tr key={m.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-medium text-foreground">{m.number}</span>
                                                    <span className="mt-0.5 text-xs text-muted-foreground">{fmtDate(m.date)}</span>
                                                    {m.referenceNumber && (
                                                        <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                            REF: {m.referenceNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {m.workOrder ? (
                                                    <div className="max-w-[240px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Wrench size={11} className="text-muted-foreground" />
                                                            <span className="text-[11px] text-muted-foreground">{m.workOrder.number}</span>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">{m.workOrder.title}</p>
                                                        {m.workOrder.project && (
                                                            <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                                                <Search size={10} /> {m.workOrder.project.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="max-w-[220px]">
                                                        <span className="text-[11px] italic text-muted-foreground">Manual Issue</span>
                                                        {m.notes && (
                                                            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={m.notes}>
                                                                {m.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={11} className="text-muted-foreground" />
                                                        <span className="truncate text-xs font-medium text-foreground">{m.warehouse?.name}</span>
                                                    </div>
                                                    <span className="mt-0.5 text-[11px] text-muted-foreground">{m.items.length} unique items</span>
                                                    <div className="mt-1 flex flex-col gap-0.5">
                                                        {m.items.slice(0, 2).map((it, idx) => (
                                                            <span key={idx} className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={it.sku?.product?.name}>
                                                                {it.sku?.product?.name}
                                                            </span>
                                                        ))}
                                                        {m.items.length > 2 && (
                                                            <span className="text-[11px] text-muted-foreground">+{m.items.length - 2} others</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <span className="text-sm font-medium tabular-nums text-foreground">{fmt(totalVal)}</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <div className="flex justify-center">
                                                    <StatusPill status={m.status} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {m.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => handleConfirm(m.id)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            title="Konfirmasi Pengeluaran"
                                                        >
                                                            <Check size={15} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewMovement(m)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 lg:hidden">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PackageMinus size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">Data tidak ditemukan</p>
                            <p className="mt-1 text-xs text-muted-foreground">Coba ubah pencarian atau filter status.</p>
                        </div>
                    ) : filtered.map(m => {
                        const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                        return (
                            <div key={m.id} className="rounded-xl border border-border bg-card p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-xs font-medium text-foreground">{m.number}</p>
                                        <p className="mt-0.5 text-sm text-foreground">{fmtDate(m.date)}</p>
                                        {m.referenceNumber && (
                                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">REF: {m.referenceNumber}</p>
                                        )}
                                    </div>
                                    <StatusPill status={m.status} />
                                </div>

                                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
                                    {m.workOrder ? (
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <Wrench size={11} className="text-muted-foreground" />
                                                <span className="text-[11px] text-muted-foreground">{m.workOrder.number}</span>
                                            </div>
                                            <p className="mt-0.5 truncate text-xs font-medium text-foreground">{m.workOrder.title}</p>
                                            {m.workOrder.project && (
                                                <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                                    <Search size={10} /> {m.workOrder.project.name}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-[11px] italic text-muted-foreground">Manual Issue</span>
                                            {m.notes && (
                                                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{m.notes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 flex items-end justify-between border-t border-border pt-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={11} className="text-muted-foreground" />
                                            <span className="truncate text-xs font-medium text-foreground">{m.warehouse?.name}</span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{m.items.length} item unik</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] text-muted-foreground">Subtotal</p>
                                        <p className="text-sm font-medium tabular-nums text-foreground">{fmt(totalVal)}</p>
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center justify-end gap-1 border-t border-border pt-2">
                                    {m.status === 'DRAFT' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleConfirm(m.id)}
                                            className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <Check size={14} className="mr-1.5" />
                                            Konfirmasi
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        onClick={() => setViewMovement(m)}
                                        className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <Eye size={14} className="mr-1.5" />
                                        Detail
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Create modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <PackageMinus size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">Buat Pengeluaran</h2>
                                        <p className="truncate text-[11px] text-muted-foreground">Isi detail barang yang keluar</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    <X size={16} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field label="Work Order (Opsional)">
                                            <select
                                                value={form.workOrderId}
                                                onChange={e => setForm({ ...form, workOrderId: e.target.value })}
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="">-- Manual / Tanpa WO --</option>
                                                {workOrders.map(wo => (
                                                    <option key={wo.id} value={wo.id}>{wo.number} - {wo.title}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Gudang Sumber" required>
                                            <select
                                                required
                                                value={form.warehouseId}
                                                onChange={e => setForm({ ...form, warehouseId: e.target.value })}
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="">-- Pilih Gudang --</option>
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                                                ))}
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
                                        <Field label="No. Referensi">
                                            <input
                                                value={form.referenceNumber}
                                                onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                                                placeholder="SO-2024-001"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Catatan" className="sm:col-span-2">
                                            <textarea
                                                rows={2}
                                                value={form.notes}
                                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                                placeholder="Tambahkan informasi tambahan jika diperlukan..."
                                                className={textareaClass}
                                            />
                                        </Field>
                                    </div>

                                    {hasOverIssue && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/40"
                                        >
                                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                                            <p className="text-xs text-amber-800 dark:text-amber-400">
                                                Peringatan: Beberapa item melebihi stok yang tersedia di gudang terpilih.
                                            </p>
                                        </motion.div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-xs font-medium text-muted-foreground">Daftar Barang Keluar</h3>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addItem}
                                                className="h-8 rounded-lg px-3 text-xs font-medium"
                                            >
                                                <Plus size={14} className="mr-1.5" />
                                                Tambah Barang
                                            </Button>
                                        </div>

                                        <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-medium text-muted-foreground md:grid">
                                            <div className="col-span-5">Barang / SKU</div>
                                            <div className="col-span-2 text-center">Jumlah (Qty)</div>
                                            <div className="col-span-3">Unit Cost (HPP)</div>
                                            <div className="col-span-2 text-right">Subtotal</div>
                                        </div>

                                        {items.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
                                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <PackageMinus size={18} />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Belum ada barang dipilih</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {items.map((item, idx) => {
                                                    const availableQty = form.warehouseId ? getAvailableQty(item.skuId, form.warehouseId) : 0
                                                    const isOver = !!item.skuId && !!form.warehouseId && item.qty > availableQty
                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            key={idx}
                                                            className={`grid grid-cols-1 gap-2 rounded-lg border p-2.5 md:grid-cols-12 md:items-center md:gap-3 ${
                                                                isOver ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20' : 'border-border bg-background'
                                                            }`}
                                                        >
                                                            <div className="md:col-span-5">
                                                                <select
                                                                    value={item.skuId}
                                                                    onChange={e => updateItem(idx, 'skuId', e.target.value)}
                                                                    className={`${itemInputClass} cursor-pointer`}
                                                                >
                                                                    <option value="">-- Pilih SKU --</option>
                                                                    {skus.map(s => {
                                                                        const avail = form.warehouseId ? s.warehouseStocks.find(ws => ws.warehouse?.id === form.warehouseId)?.quantity || 0 : s.totalQty
                                                                        return (
                                                                            <option key={s.id} value={s.id}>
                                                                                {s.code} - {s.product.name} (Stok: {avail})
                                                                            </option>
                                                                        )
                                                                    })}
                                                                </select>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <div className="mb-1 flex items-center justify-between md:hidden">
                                                                    <span className="text-[11px] text-muted-foreground">Jumlah (Qty)</span>
                                                                    {item.skuId && (
                                                                        <span className={`text-[11px] ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                                                                            AVL: {form.warehouseId ? availableQty : 'Pilih Gudang'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="any"
                                                                    placeholder="Qty"
                                                                    value={item.qty}
                                                                    onChange={e => updateItem(idx, 'qty', +e.target.value)}
                                                                    className={`${itemInputClass} md:text-center ${
                                                                        isOver ? 'border-rose-300 text-rose-600 focus:border-rose-400 focus:ring-rose-500/15 dark:border-rose-900 dark:text-rose-400' : ''
                                                                    }`}
                                                                />
                                                                {item.skuId && (
                                                                    <p className={`mt-1 hidden text-[11px] md:block md:text-center ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                                                                        AVL: {form.warehouseId ? availableQty : 'Pilih Gudang'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-3">
                                                                <div className="mb-1 text-[11px] text-muted-foreground md:hidden">Unit Cost (HPP)</div>
                                                                <div className="relative">
                                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">Rp</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="0"
                                                                        value={item.unitCost}
                                                                        onChange={e => updateItem(idx, 'unitCost', +e.target.value)}
                                                                        className={`${itemInputClass} pl-9`}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between md:col-span-2 md:justify-end md:gap-1">
                                                                <div className="flex flex-col md:hidden">
                                                                    <span className="text-[11px] text-muted-foreground">Subtotal</span>
                                                                    <span className="text-xs font-medium tabular-nums text-foreground">{fmt(item.qty * item.unitCost)}</span>
                                                                </div>
                                                                <span className="hidden text-xs font-medium tabular-nums text-foreground md:block">
                                                                    {fmt(item.qty * item.unitCost)}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(idx)}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                    title="Hapus barang"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <footer className="border-t border-border px-4 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Total Estimasi Nilai Keluar</p>
                                            <p className="text-lg font-semibold tabular-nums text-foreground">{fmt(totalValue)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setModalOpen(false)}
                                                className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none"
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={saving || items.length === 0 || !form.warehouseId || hasOverIssue}
                                                className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none"
                                            >
                                                {saving ? 'Menyimpan...' : 'Simpan Draft'}
                                            </Button>
                                        </div>
                                    </div>
                                </footer>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Detail modal */}
            <AnimatePresence>
                {viewMovement && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewMovement(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <PackageMinus size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-mono text-sm font-semibold text-foreground">{viewMovement.number}</h2>
                                        <p className="truncate text-[11px] text-muted-foreground">{fmtDate(viewMovement.date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill status={viewMovement.status} />
                                    <button
                                        type="button"
                                        onClick={() => setViewMovement(null)}
                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </header>

                            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="text-[11px] text-muted-foreground">Gudang Asal</p>
                                        <p className="mt-0.5 text-sm font-medium text-foreground">{viewMovement.warehouse?.name}</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="text-[11px] text-muted-foreground">No. Referensi</p>
                                        <p className="mt-0.5 text-sm font-medium text-foreground">{viewMovement.referenceNumber || '—'}</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3 sm:col-span-2">
                                        <p className="text-[11px] text-muted-foreground">Konteks Proyek / WO</p>
                                        {viewMovement.workOrder ? (
                                            <div className="mt-0.5">
                                                <p className="text-sm font-medium text-foreground">
                                                    {viewMovement.workOrder.number} — {viewMovement.workOrder.title}
                                                </p>
                                                {viewMovement.workOrder.project && (
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Search size={10} /> {viewMovement.workOrder.project.name}
                                                    </p>
                                                )}
                                                {viewMovement.workOrder.customer && (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {viewMovement.workOrder.customer.name}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="mt-0.5 text-sm font-medium text-foreground">Manual Issue</p>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-border">
                                    <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                                        <div className="col-span-7">Barang</div>
                                        <div className="col-span-2 text-right">Qty</div>
                                        <div className="col-span-3 text-right">Subtotal</div>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {viewMovement.items.map((it, idx) => (
                                            <div key={idx} className="grid grid-cols-12 items-center gap-3 px-3 py-2.5">
                                                <div className="col-span-7 min-w-0">
                                                    <p className="truncate text-xs font-medium text-foreground">{it.sku?.product?.name}</p>
                                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{it.sku?.code}</p>
                                                </div>
                                                <div className="col-span-2 text-right text-xs tabular-nums text-foreground">{it.qty}</div>
                                                <div className="col-span-3 text-right text-xs font-medium tabular-nums text-foreground">
                                                    {fmt(it.qty * it.unitCost)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {viewMovement.notes && (
                                    <div className="rounded-lg border border-border p-3">
                                        <p className="text-[11px] text-muted-foreground">Catatan</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-foreground">{viewMovement.notes}</p>
                                    </div>
                                )}
                            </div>

                            <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground">Total Nilai</p>
                                    <p className="text-lg font-semibold tabular-nums text-foreground">
                                        {fmt(viewMovement.items.reduce((s, i) => s + i.qty * i.unitCost, 0))}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {viewMovement.status === 'DRAFT' && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                handleConfirm(viewMovement.id)
                                                setViewMovement(null)
                                            }}
                                            className="h-9 rounded-lg px-4 text-sm font-medium"
                                        >
                                            <Check size={15} className="mr-1.5" />
                                            Konfirmasi
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => setViewMovement(null)}
                                        className="h-9 rounded-lg px-4 text-sm font-medium"
                                    >
                                        Tutup
                                    </Button>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
