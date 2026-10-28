"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PackagePlus, Plus, Search, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, Check, Ban, DollarSign, Eye,
    Clock, MapPin, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

interface Warehouse { id: string; code: string; name: string }
interface SKU { id: string; code: string; name: string; barcode?: string; purchasePrice: number; product: { name: string } }
interface Movement {
    id: string; number: string; type: string; status: string; date: string;
    warehouse: Warehouse; notes?: string; confirmedAt?: string; referenceNumber?: string;
    workOrder?: {
        number: string;
        title: string;
        project?: { id: string; number: string; name: string };
        customer?: { id: string; name: string; code: string };
    };
    items: { id: string; qty: number; unitCost: number; sku: { code: string; name: string; product: { name: string } } }[]
}
interface PurchaseOrder {
    id: string; number: string; date: string; status: string; grandTotal: number;
    vendor: { code: string; name: string };
    items: any[];
}
interface FormItem { skuId: string; qty: number; unitCost: number; notes?: string; _sku?: SKU }

const STATUS_CFG: Record<string, { label: string; color: string; dot: string; icon: any }> = {
    DRAFT: {
        label: 'Draft',
        color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
        dot: 'bg-amber-500',
        icon: Clock,
    },
    CONFIRMED: {
        label: 'Confirmed',
        color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
    },
    CANCELLED: {
        label: 'Cancelled',
        color: 'border-border bg-muted text-muted-foreground',
        dot: 'bg-muted-foreground/50',
        icon: Ban,
    },
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const iconButtonClass = "h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"

function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    )
}

export default function StockInPage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [viewModalOpen, setViewModalOpen] = useState(false)
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [form, setForm] = useState({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '', referenceNumber: '' })
    const [items, setItems] = useState<FormItem[]>([])
    const [saving, setSaving] = useState(false)
    const [poList, setPoList] = useState<PurchaseOrder[]>([])
    const [selectedPO, setSelectedPO] = useState<string>('')

    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes, poRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements?type=IN`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders`)
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
            setPoList(await poRes.json())
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const addItem = () => setItems([...items, { skuId: '', qty: 1, unitCost: 0 }])
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
    const updateItem = (i: number, field: string, val: unknown) => {
        const newItems = [...items]
        newItems[i] = { ...newItems[i], [field]: val }
        if (field === 'skuId') {
            const sku = skus.find(s => s.id === val)
            if (sku) { newItems[i]._sku = sku; newItems[i].unitCost = sku.purchasePrice }
        }
        setItems(newItems)
    }

    const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0)

    // Smart SKU matching helper for PO items
    const findMatchingSku = (desc: string) => {
        if (!desc) return undefined
        const clean = desc.trim().toLowerCase()
        // 1. Exact code match
        let match = skus.find(s => s.code.toLowerCase() === clean)
        if (match) return match

        // 2. Barcode match
        match = skus.find(s => s.barcode && s.barcode.toLowerCase() === clean)
        if (match) return match

        // 3. Name or Product name match
        match = skus.find(s => (s.name && s.name.toLowerCase() === clean) || (s.product?.name && s.product.name.toLowerCase() === clean))
        if (match) return match

        // 4. Description contains code
        match = skus.find(s => clean.includes(s.code.toLowerCase()))
        if (match) return match

        // 5. Product name containment
        match = skus.find(s => {
            const pName = s.product?.name?.toLowerCase()
            return pName && (clean.includes(pName) || pName.includes(clean))
        })
        if (match) return match

        // 6. SKU name containment
        match = skus.find(s => {
            const sName = s.name?.toLowerCase()
            return sName && (clean.includes(sName) || sName.includes(clean))
        })
        return match
    }

    // Load PO items into the form
    const loadPOItems = (poId: string) => {
        const po = poList.find(p => p.id === poId)
        if (!po) return

        if (!po.items || po.items.length === 0) {
            showToast('error', `PO ${po.number} tidak memiliki daftar item barang`)
            return
        }

        const newItems: FormItem[] = po.items.map((item: any) => {
            const matchedSku = findMatchingSku(item.description) || findMatchingSku(item.productName)
            return {
                skuId: matchedSku?.id || '',
                qty: Number(item.qty) || 1,
                unitCost: Number(item.unitPrice) || matchedSku?.purchasePrice || 0,
                notes: item.productName || item.description || '',
                _sku: matchedSku || undefined
            }
        })

        setItems(newItems)
        setSelectedPO(poId)

        // Auto pre-fill reference number & notes & warehouse
        setForm(prev => ({
            ...prev,
            referenceNumber: po.number,
            notes: prev.notes ? prev.notes : `Penerimaan PO ${po.number} dari ${po.vendor?.name || 'Vendor'}`,
            warehouseId: prev.warehouseId ? prev.warehouseId : (warehouses[0]?.id || '')
        }))

        const unmappedCount = newItems.filter(i => !i.skuId).length
        if (unmappedCount > 0) {
            showToast('error', `${newItems.length} item dimuat (${unmappedCount} item perlu dipilih SKU manual)`)
        } else {
            showToast('success', `${newItems.length} item berhasil dimuat dari PO ${po.number}`)
        }
    }

    // Clear PO reference
    const clearPO = () => {
        setSelectedPO('')
        setItems([])
        setForm(prev => ({ ...prev, referenceNumber: '', notes: '' }))
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()

        if (!form.warehouseId) {
            showToast('error', 'Silakan pilih Gudang Tujuan terlebih dahulu')
            return
        }
        if (items.length === 0) {
            showToast('error', 'Daftar barang penerimaan tidak boleh kosong')
            return
        }
        const unassigned = items.find(i => !i.skuId)
        if (unassigned) {
            showToast('error', 'Pastikan semua baris barang telah dipilih SKU-nya')
            return
        }
        const invalidQty = items.find(i => !i.qty || Number(i.qty) <= 0)
        if (invalidQty) {
            showToast('error', 'Jumlah (Qty) setiap barang harus lebih dari 0')
            return
        }

        setSaving(true)
        try {
            const po = selectedPO ? poList.find(p => p.id === selectedPO) : null
            const payload = {
                warehouseId: form.warehouseId,
                date: form.date,
                notes: form.notes,
                type: 'IN',
                referenceType: po ? 'PURCHASE_ORDER' : 'MANUAL',
                referenceNumber: po ? po.number : form.referenceNumber,
                items: items.map(i => ({
                    skuId: i.skuId,
                    qty: Number(i.qty) || 0,
                    unitCost: Number(i.unitCost) || 0,
                    notes: i.notes || ''
                }))
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setModalOpen(false)
                setItems([])
                setSelectedPO('')
                setForm({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '', referenceNumber: '' })
                showToast('success', 'Penerimaan barang berhasil dibuat (Draft)')
                load()
            } else {
                const d = await res.json()
                showToast('error', d.message || 'Gagal menyimpan penerimaan barang')
            }
        } catch (err: any) {
            showToast('error', 'Terjadi kesalahan koneksi server')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
        if (res.ok) { showToast('success', 'Stok masuk dikonfirmasi!'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const handleCancel = async (id: string) => {
        if (!confirm('Batalkan penerimaan ini?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${id}/cancel`, { method: 'PATCH' })
        showToast('success', 'Dibatalkan'); load()
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

    const totalInValue = movements.filter(m => m.status === 'CONFIRMED').reduce((acc, m) => acc + m.items.reduce((s, i) => s + i.qty * i.unitCost, 0), 0)
    const pendingCount = movements.filter(m => m.status === 'DRAFT').length
    const confirmedCount = movements.filter(m => m.status === 'CONFIRMED').length

    const stats = [
        { label: 'Total S-In', value: movements.length, icon: PackagePlus, sub: 'Total Transaksi' },
        { label: 'Pending', value: pendingCount, icon: Clock, sub: 'Perlu Konfirmasi' },
        { label: 'Confirmed', value: confirmedCount, icon: CheckCircle2, sub: 'Sudah Masuk Stok' },
        { label: 'Total Nilai', value: fmt(totalInValue), icon: DollarSign, sub: 'Confirmed Value' },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            className="fixed right-4 top-4 z-[300] flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-lg"
                        >
                            {toast.type === 'success'
                                ? <CheckCircle2 size={16} className="text-emerald-600" />
                                : <AlertCircle size={16} className="text-rose-600" />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Stok Masuk</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Penerimaan Barang ke Gudang</p>
                    </div>
                    <div className="flex gap-2">
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
                            Tambah stok masuk
                        </Button>
                    </div>
                </header>

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {stats.map((s) => {
                        const Icon = s.icon
                        return (
                            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <Icon size={15} className="text-muted-foreground" />
                                </div>
                                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">{s.value}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Cari nomor, proyek, gudang..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((s) => (
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
                                    {s === 'ALL' ? 'Semua' : s}
                                </button>
                            ))}
                        </div>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                            {filtered.length} transaksi
                        </span>
                    </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PackagePlus size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">Tidak Ada Data</p>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                Coba ubah kata kunci pencarian atau filter status untuk hasil lain.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Transaksi</th>
                                            <th className="px-3 py-2.5 font-medium">Referensi / Proyek</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Items</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Total Nilai</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map(m => {
                                            const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                                            return (
                                                <tr key={m.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-3 py-2.5">
                                                        <p className="text-xs font-medium tabular-nums text-foreground">{m.number}</p>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(m.date)}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                                                            <MapPin size={11} className="flex-shrink-0 text-muted-foreground" />
                                                            <span className="truncate">{m.warehouse?.name || '—'}</span>
                                                        </div>
                                                        {m.workOrder ? (
                                                            <div className="mt-1 space-y-1">
                                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                    <Briefcase size={10} className="flex-shrink-0" />
                                                                    <span className="max-w-[200px] truncate">
                                                                        {m.workOrder.project?.name || m.workOrder.title}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                        WO: {m.workOrder.number}
                                                                    </span>
                                                                    {m.workOrder.customer && (
                                                                        <span
                                                                            className="max-w-[140px] truncate rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                                                            title={m.workOrder.customer.name}
                                                                        >
                                                                            {m.workOrder.customer.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1">
                                                                <span className="text-[11px] text-muted-foreground">Manual In</span>
                                                                {m.referenceNumber && (
                                                                    <span className="ml-1 text-[11px] text-muted-foreground">· {m.referenceNumber}</span>
                                                                )}
                                                                {m.notes && (
                                                                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground" title={m.notes}>
                                                                        {m.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <p className="text-xs font-medium text-foreground">{m.items.length} item</p>
                                                        <div className="mt-0.5 flex flex-col items-end gap-0.5">
                                                            {m.items.slice(0, 2).map((it, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="max-w-[140px] truncate text-[11px] text-muted-foreground"
                                                                    title={it.sku?.product?.name || it.sku?.name}
                                                                >
                                                                    {it.sku?.product?.name || it.sku?.name}
                                                                </span>
                                                            ))}
                                                            {m.items.length > 2 && (
                                                                <span className="text-[10px] text-muted-foreground/70">
                                                                    +{m.items.length - 2} others
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className="text-sm font-medium tabular-nums text-foreground">{fmt(totalVal)}</span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <StatusPill status={m.status} />
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => { setSelectedMovement(m); setViewModalOpen(true); }}
                                                                title="Detail"
                                                                className={iconButtonClass}
                                                            >
                                                                <Eye size={15} />
                                                            </Button>
                                                            {m.status === 'DRAFT' && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleConfirm(m.id)}
                                                                        title="Konfirmasi"
                                                                        className={iconButtonClass}
                                                                    >
                                                                        <Check size={15} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleCancel(m.id)}
                                                                        title="Batalkan"
                                                                        className={iconButtonClass}
                                                                    >
                                                                        <Ban size={15} />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PackagePlus size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">Data tidak ditemukan</p>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                Coba ubah kata kunci pencarian atau filter status untuk hasil lain.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map(m => {
                                const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                                return (
                                    <div key={m.id} className="rounded-xl border border-border bg-card p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-medium tabular-nums text-foreground">{m.number}</p>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(m.date)}</p>
                                            </div>
                                            <StatusPill status={m.status} />
                                        </div>
                                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
                                            <p className="flex items-center gap-1.5 text-xs text-foreground">
                                                <MapPin size={11} className="flex-shrink-0 text-muted-foreground" />
                                                <span className="truncate">{m.warehouse?.name}</span>
                                            </p>
                                            {m.referenceNumber && (
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">Ref: {m.referenceNumber}</p>
                                            )}
                                            {m.workOrder && (
                                                <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                                                    <Briefcase size={10} className="flex-shrink-0" />
                                                    <span className="truncate">{m.workOrder.project?.name || m.workOrder.title}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">{m.items.length} item · Total Nilai</p>
                                                <p className="text-sm font-semibold tabular-nums text-foreground">{fmt(totalVal)}</p>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                {m.status === 'DRAFT' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleConfirm(m.id)}
                                                        className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Check size={14} className="mr-1.5" /> Konfirmasi
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setSelectedMovement(m); setViewModalOpen(true); }}
                                                    className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                >
                                                    <Eye size={14} className="mr-1.5" /> Detail
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
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
                                            <PackagePlus size={17} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Penerimaan Barang</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">Input Stok Masuk Baru</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setModalOpen(false)}
                                        className={iconButtonClass}
                                    >
                                        <X size={16} />
                                    </Button>
                                </header>

                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-medium text-muted-foreground">
                                                    Gudang Tujuan <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    required
                                                    value={form.warehouseId}
                                                    onChange={e => setForm({ ...form, warehouseId: e.target.value })}
                                                    className={`${inputClass} cursor-pointer`}
                                                >
                                                    <option value="">-- Pilih Gudang --</option>
                                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-medium text-muted-foreground">Tanggal Penerimaan</label>
                                                <input
                                                    type="date"
                                                    value={form.date}
                                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-medium text-muted-foreground">Referensi PO (Opsional)</label>
                                                <select
                                                    value={selectedPO}
                                                    onChange={e => {
                                                        if (e.target.value) { loadPOItems(e.target.value) }
                                                        else { clearPO() }
                                                    }}
                                                    className={`${inputClass} cursor-pointer pr-8`}
                                                >
                                                    <option value="">-- Pilih PO --</option>
                                                    {poList.filter(po => po.status !== 'CANCELLED').map(po => (
                                                        <option key={po.id} value={po.id}>[{po.number}] {po.vendor?.name} - Rp {po.grandTotal?.toLocaleString('id-ID')}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-medium text-muted-foreground">Nomor Referensi (Manual)</label>
                                                <input
                                                    value={form.referenceNumber}
                                                    onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                                                    placeholder="DO Number, dll."
                                                    className={inputClass}
                                                    disabled={!!selectedPO}
                                                />
                                            </div>

                                            {selectedPO && (() => {
                                                const p = poList.find(x => x.id === selectedPO)
                                                if (!p) return null
                                                return (
                                                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:col-span-2">
                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                                <CheckCircle2 size={13} className="text-emerald-600" /> Referensi PO: {p.number}
                                                            </span>
                                                            <span className="text-muted-foreground">• {p.vendor?.name}</span>
                                                            <span className="font-mono font-medium text-foreground">• {fmt(p.grandTotal)}</span>
                                                            <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                {items.length} item
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={clearPO}
                                                            className="flex-shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                                        >
                                                            ✕ Batalkan PO
                                                        </button>
                                                    </div>
                                                )
                                            })()}
                                        </div>

                                        <div className="space-y-2 border-t border-border pt-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                                    <PackagePlus size={14} className="text-muted-foreground" /> Daftar Barang
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={addItem}
                                                    className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                                >
                                                    <Plus size={13} className="mr-1" /> Tambah Baris
                                                </button>
                                            </div>
                                            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                                                {items.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center">
                                                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                            <PackagePlus size={18} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Belum ada barang</p>
                                                    </div>
                                                ) : (
                                                    items.map((item, idx) => (
                                                        <div key={idx} className="rounded-lg border border-border bg-background p-2.5">
                                                            <div className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-12 sm:col-span-5">
                                                                    <select
                                                                        value={item.skuId}
                                                                        onChange={e => updateItem(idx, 'skuId', e.target.value)}
                                                                        className={`h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
                                                                            !item.skuId
                                                                                ? 'border-amber-400 text-amber-700'
                                                                                : 'border-border text-foreground'
                                                                        }`}
                                                                    >
                                                                        <option value="">-- {!item.skuId ? '⚠️ Wajib Pilih SKU Barang' : 'Pilih Barang'} --</option>
                                                                        {skus.map(s => <option key={s.id} value={s.id}>{s.code} - {s.product?.name}</option>)}
                                                                    </select>
                                                                    {item.notes && (
                                                                        <p className="mt-1 truncate pl-1 text-[10px] text-muted-foreground" title={item.notes}>
                                                                            Item PO: <span className="font-medium text-foreground">{item.notes}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-4 sm:col-span-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0.01"
                                                                        step="any"
                                                                        placeholder="Qty"
                                                                        value={item.qty}
                                                                        onChange={e => updateItem(idx, 'qty', +e.target.value)}
                                                                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-center text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                                                    />
                                                                </div>
                                                                <div className="col-span-5 sm:col-span-3">
                                                                    <div className="relative">
                                                                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">Rp</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="Harga"
                                                                            value={item.unitCost}
                                                                            onChange={e => updateItem(idx, 'unitCost', +e.target.value)}
                                                                            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-xs tabular-nums text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                                                                    <span className="text-[11px] font-medium tabular-nums text-foreground">
                                                                        {fmt(item.qty * item.unitCost)}
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-1 flex items-center justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItem(idx)}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                        title="Hapus baris"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[11px] text-muted-foreground">Total Estimasi</p>
                                        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{fmt(totalValue)}</p>
                                    </div>
                                    <div className="flex w-full gap-2 sm:w-auto">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setModalOpen(false)}
                                            className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none"
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit()}
                                            disabled={saving || items.length === 0}
                                            className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none"
                                        >
                                            {saving ? 'Menyimpan...' : 'Simpan Draft'}
                                        </Button>
                                    </div>
                                </footer>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* View detail modal */}
                <AnimatePresence>
                    {viewModalOpen && selectedMovement && (
                        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setViewModalOpen(false)}
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
                                            <Eye size={17} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Detail Transaksi</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">{selectedMovement.number}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewModalOpen(false)}
                                        className={iconButtonClass}
                                    >
                                        <X size={16} />
                                    </Button>
                                </header>

                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    <div className="grid grid-cols-1 gap-3 border-b border-border pb-3 sm:grid-cols-2">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Gudang</p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
                                                <MapPin size={12} className="text-muted-foreground" />
                                                {selectedMovement.warehouse?.name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Tanggal</p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
                                                <Clock size={12} className="text-muted-foreground" />
                                                {new Date(selectedMovement.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Status Transaksi</p>
                                            <div className="mt-1">
                                                <StatusPill status={selectedMovement.status} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Referensi / DO</p>
                                            <p className="mt-0.5 truncate text-sm text-foreground">{selectedMovement.referenceNumber || '-'}</p>
                                        </div>
                                        {selectedMovement.workOrder && (
                                            <div className="border-t border-border pt-3 sm:col-span-2">
                                                <p className="text-[11px] text-muted-foreground">Konteks Proyek</p>
                                                <div className="mt-1 flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                                                        <Briefcase size={15} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-medium text-foreground">
                                                            {selectedMovement.workOrder.project?.name || selectedMovement.workOrder.title}
                                                        </p>
                                                        <span className="mt-1 inline-block rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                            WO: {selectedMovement.workOrder.number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="border-t border-border pt-3 sm:col-span-2">
                                            <p className="text-[11px] text-muted-foreground">Catatan</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{selectedMovement.notes || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xs font-medium text-foreground">
                                            Daftar Barang ({selectedMovement.items.length})
                                        </h3>
                                        <div className="overflow-hidden rounded-lg border border-border">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                                        <th className="px-3 py-2 font-medium">Barang / SKU</th>
                                                        <th className="w-24 px-3 py-2 text-center font-medium">Qty</th>
                                                        <th className="w-32 px-3 py-2 text-right font-medium">Unit Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {selectedMovement.items.map(item => (
                                                        <tr key={item.id} className="hover:bg-muted/30">
                                                            <td className="px-3 py-2">
                                                                <p className="text-xs font-medium text-foreground">{item.sku?.code}</p>
                                                                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.sku?.product?.name}</p>
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-xs tabular-nums text-foreground">{item.qty} item</td>
                                                            <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-foreground">{fmt(item.unitCost)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                                            <div>
                                                <p className="text-[11px] text-muted-foreground">Total Nilai</p>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground">Inventory Value Added</p>
                                            </div>
                                            <span className="text-base font-semibold tabular-nums text-foreground">
                                                {fmt(selectedMovement.items.reduce((s, i) => s + i.qty * i.unitCost, 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setViewModalOpen(false)}
                                        className="h-9 rounded-lg px-4 text-sm font-medium"
                                    >
                                        Tutup
                                    </Button>
                                    {selectedMovement.status === 'DRAFT' && (
                                        <Button
                                            type="button"
                                            onClick={() => { handleConfirm(selectedMovement.id); setViewModalOpen(false); }}
                                            className="h-9 rounded-lg px-4 text-sm font-medium"
                                        >
                                            Konfirmasi Stok Masuk
                                        </Button>
                                    )}
                                </footer>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
