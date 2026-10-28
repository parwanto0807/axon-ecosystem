"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeftRight, Plus, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, Check, DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse { id: string; code: string; name: string }
interface SKUStock {
    id: string; code: string; name: string; purchasePrice: number; totalQty: number;
    warehouseStocks: { warehouse: { id: string }; quantity: number }[];
    product: { name: string }
}
interface Movement {
    id: string; number: string; status: string; date: string;
    warehouse: Warehouse; toWarehouse: Warehouse;
    items: { qty: number; unitCost: number; sku: { code: string; product: { name: string } } }[]
}
interface FormItem { skuId: string; qty: number; unitCost: number; availableQty: number }

const STATUS_CFG: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    CANCELLED: 'bg-muted text-muted-foreground border-border'
}
const STATUS_DOT: Record<string, string> = {
    DRAFT: 'bg-amber-500',
    CONFIRMED: 'bg-emerald-500',
    CANCELLED: 'bg-muted-foreground/50'
}
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
const itemInputClass =
    "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
    const dot = STATUS_DOT[status] || STATUS_DOT.DRAFT
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {status}
        </span>
    )
}

export default function TransferPage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKUStock[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [form, setForm] = useState({ warehouseId: '', toWarehouseId: '', date: new Date().toISOString().split('T')[0], notes: '' })
    const [items, setItems] = useState<FormItem[]>([])
    const [saving, setSaving] = useState(false)

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements?type=TRANSFER`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`)
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const addItem = () => setItems([...items, { skuId: '', qty: 1, unitCost: 0, availableQty: 0 }])
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
    const updateItem = (idx: number, field: string, val: unknown) => {
        const newItems = [...items]
        newItems[idx] = { ...newItems[idx], [field]: val }
        if (field === 'skuId') {
            const sku = skus.find(s => s.id === val)
            if (sku) {
                newItems[idx].unitCost = sku.purchasePrice
                const ws = sku.warehouseStocks.find(w => w.warehouse?.id === form.warehouseId)
                newItems[idx].availableQty = ws?.quantity || 0
            }
        }
        setItems(newItems)
    }

    const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.warehouseId === form.toWarehouseId) { showToast('error', 'Gudang asal dan tujuan tidak boleh sama'); return }
        setSaving(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: 'TRANSFER', items: items.map(i => ({ skuId: i.skuId, qty: i.qty, unitCost: i.unitCost })) })
            })
            if (res.ok) { setModalOpen(false); setItems([]); setForm({ warehouseId: '', toWarehouseId: '', date: new Date().toISOString().split('T')[0], notes: '' }); showToast('success', 'Transfer dibuat'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
        if (res.ok) { showToast('success', 'Transfer gudang dikonfirmasi!'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`fixed right-6 top-6 z-[300] flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Transfer Gudang</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Perpindahan Stok Antar Gudang</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={load} className="h-9 rounded-lg px-4 text-sm font-medium">
                            <RefreshCw size={15} className="mr-1.5" /> Reload
                        </Button>
                        <Button onClick={() => setModalOpen(true)} className="h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" /> Buat transfer
                        </Button>
                    </div>
                </header>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : movements.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                        <th className="px-3 py-2.5 font-medium">Nomor</th>
                                        <th className="px-3 py-2.5 font-medium">Dari Gudang</th>
                                        <th className="px-3 py-2.5 font-medium">Ke Gudang</th>
                                        <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                        <th className="px-3 py-2.5 text-right font-medium">Nilai Transfer</th>
                                        <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                        <th className="px-3 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {movements.map(m => {
                                        const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                                        return (
                                            <tr key={m.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <span className="font-mono text-xs font-medium text-foreground">{m.number}</span>
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-foreground">{m.warehouse?.name}</td>
                                                <td className="px-3 py-2.5 font-medium text-foreground">{m.toWarehouse?.name}</td>
                                                <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(totalVal)}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <StatusPill status={m.status} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end">
                                                        {m.status === 'DRAFT' && (
                                                            <Button onClick={() => handleConfirm(m.id)} variant="ghost" size="icon" title="Konfirmasi Transfer" className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                                                <Check size={15} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <ArrowLeftRight size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">Belum ada transfer gudang</p>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">Buat transfer untuk memindahkan stok antar gudang.</p>
                        </div>
                    )}
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />)
                    ) : movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <ArrowLeftRight size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">Belum ada transfer gudang</p>
                            <p className="mt-1 text-xs text-muted-foreground">Buat transfer untuk memindahkan stok antar gudang.</p>
                        </div>
                    ) : movements.map(m => {
                        const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                        return (
                            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-border bg-card p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs font-medium text-foreground">{m.number}</p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <StatusPill status={m.status} />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex-1 rounded-lg border border-border bg-muted/40 p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">Dari</p>
                                        <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{m.warehouse?.name}</p>
                                    </div>
                                    <ArrowLeftRight size={14} className="shrink-0 text-muted-foreground" />
                                    <div className="flex-1 rounded-lg border border-border bg-muted/40 p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">Ke</p>
                                        <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{m.toWarehouse?.name}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">{m.items.length} item &bull; Total Nilai</p>
                                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(totalVal)}</p>
                                    </div>
                                    {m.status === 'DRAFT' && (
                                        <Button onClick={() => handleConfirm(m.id)} variant="outline" className="h-8 rounded-md px-2.5 text-xs font-medium">
                                            <Check size={13} className="mr-1.5" /> Konfirmasi
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl">
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <ArrowLeftRight size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">Transfer Antar Gudang</h2>
                                        <p className="truncate text-[11px] text-muted-foreground">Perpindahan stok antar gudang</p>
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                    <X size={16} />
                                </Button>
                            </header>

                            <form id="transfer-form" onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-muted-foreground">Dari Gudang <span className="text-rose-500">*</span></label>
                                            <select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className={`${inputClass} cursor-pointer`}>
                                                <option value="">-- Gudang Asal --</option>
                                                {warehouses.filter(w => w.id !== form.toWarehouseId).map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-muted-foreground">Ke Gudang <span className="text-rose-500">*</span></label>
                                            <select required value={form.toWarehouseId} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })} className={`${inputClass} cursor-pointer`}>
                                                <option value="">-- Gudang Tujuan --</option>
                                                {warehouses.filter(w => w.id !== form.warehouseId).map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-muted-foreground">Tanggal</label>
                                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-muted-foreground">Catatan</label>
                                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Alasan transfer..." className={inputClass} />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="text-xs font-medium text-muted-foreground">Barang yang Ditransfer</h3>
                                            <Button type="button" variant="outline" onClick={addItem} className="h-8 rounded-md px-2.5 text-xs font-medium">
                                                <Plus size={13} className="mr-1" /> Tambah Barang
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {items.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                                                    <p className="text-xs text-muted-foreground">Pilih barang yang akan ditransfer</p>
                                                </div>
                                            ) : (
                                                items.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5 md:grid md:grid-cols-12 md:items-center">
                                                        <div className="w-full md:col-span-5">
                                                            <select value={item.skuId} onChange={e => updateItem(idx, 'skuId', e.target.value)} className={`${itemInputClass} cursor-pointer`}>
                                                                <option value="">-- Pilih SKU --</option>
                                                                {skus.map(s => {
                                                                    const avail = form.warehouseId ? s.warehouseStocks.find(ws => ws.warehouse?.id === form.warehouseId)?.quantity || 0 : s.totalQty
                                                                    return <option key={s.id} value={s.id}>{s.code} (Stok: {avail})</option>
                                                                })}
                                                            </select>
                                                        </div>
                                                        <div className="grid w-full grid-cols-3 gap-2 md:contents">
                                                            <div className="md:col-span-2">
                                                                <input type="number" min="0.01" step="any" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} className={`${itemInputClass} text-center`} />
                                                            </div>
                                                            <div className="relative md:col-span-3">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Rp</span>
                                                                <input type="number" min="0" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', +e.target.value)} className={`${itemInputClass} pl-7`} />
                                                            </div>
                                                            <div className="flex items-center justify-between md:col-span-1 md:justify-end">
                                                                <p className="text-[11px] font-medium text-foreground md:hidden">{fmt(item.qty * item.unitCost)}</p>
                                                                <button type="button" onClick={() => removeItem(idx)} title="Hapus barang" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="hidden justify-end md:col-span-1 md:flex">
                                                            <p className="text-[11px] font-medium tabular-nums text-foreground">{fmt(item.qty * item.unitCost)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <footer className="border-t border-border px-4 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Total Nilai Transfer</p>
                                            <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                                                <DollarSign size={15} className="text-muted-foreground" />{fmt(totalValue)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 sm:justify-end">
                                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none">
                                                Batal
                                            </Button>
                                            <Button type="submit" disabled={saving || items.length === 0} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none">
                                                {saving ? 'Menyimpan...' : 'Buat Transfer'}
                                            </Button>
                                        </div>
                                    </div>
                                </footer>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
