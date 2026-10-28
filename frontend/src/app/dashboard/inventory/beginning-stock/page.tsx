"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, AlertCircle, RefreshCw, DollarSign, Package, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse { id: string; code: string; name: string }
interface SKU {
    id: string; code: string; name: string; purchasePrice: number;
    product: { name: string }; warehouseStocks: { warehouse: { id: string }; quantity: number }[]
}
interface Item { skuId: string; qty: number; unitCost: number; _name: string; _code: string }

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const inputClass =
    "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const numInputClass =
    "h-9 rounded-md border border-border bg-background px-2 text-right text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

export default function BeginningStockPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [selectedWh, setSelectedWh] = useState('')
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [wRes, sRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`)
            ])
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const loadItems = useCallback(() => {
        if (!selectedWh) return
        setItems(skus.map(s => ({
            skuId: s.id,
            qty: s.warehouseStocks.find(w => w.warehouse?.id === selectedWh)?.quantity || 0,
            unitCost: s.purchasePrice,
            _name: s.product?.name || '',
            _code: s.code
        })))
    }, [selectedWh, skus])

    useEffect(() => { loadItems() }, [loadItems])

    const totalValue = items.reduce((s, i) => s + i.qty * i.unitCost, 0)
    const itemsWithQty = items.filter(i => i.qty > 0)

    const handleSave = async () => {
        if (!selectedWh || itemsWithQty.length === 0) { showToast('error', 'Pilih gudang dan masukkan minimal 1 item stok'); return }
        setSaving(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId: selectedWh,
                    type: 'BEGINNING',
                    date,
                    notes: 'Beginning stock entry',
                    items: itemsWithQty.map(i => ({ skuId: i.skuId, qty: i.qty, unitCost: i.unitCost }))
                })
            })
            if (!res.ok) { const d = await res.json(); showToast('error', d.message); return }

            const data = await res.json()
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${data.id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmedBy: 'Admin' })
            })
            showToast('success', 'Beginning stock berhasil disimpan!')
            load()
        } finally { setSaving(false) }
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1200px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`fixed right-4 top-4 z-[300] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg ${
                                toast.type === 'success'
                                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400'
                                    : 'border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-400'
                            }`}
                        >
                            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Beginning Stock</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Input Stok Awal per Gudang</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !selectedWh || itemsWithQty.length === 0}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        {saving ? 'Menyimpan...' : `Simpan Beginning Stock (${itemsWithQty.length} SKU)`}
                    </Button>
                </header>

                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                    <Info size={15} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Pilih gudang, kemudian masukkan kuantitas stok awal untuk setiap SKU. Klik{' '}
                        <span className="font-medium text-foreground">Simpan Beginning Stock</span> untuk mengaplikasikannya ke sistem.
                    </p>
                </div>

                <div className="mb-4 rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5 sm:max-w-sm">
                            <label className="block text-xs font-medium text-muted-foreground">
                                Pilih Gudang <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedWh}
                                onChange={e => setSelectedWh(e.target.value)}
                                className={`${inputClass} w-full cursor-pointer`}
                            >
                                <option value="">-- Pilih Gudang --</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-muted-foreground">Tanggal Efektif</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className={`${inputClass} w-full sm:w-auto`}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={load}
                            className="h-10 rounded-lg px-3 text-sm font-medium"
                        >
                            <RefreshCw size={14} className="mr-1.5" />
                            Reload
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : selectedWh && items.length > 0 ? (
                    <>
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Kode SKU</th>
                                            <th className="px-3 py-2.5 font-medium">Nama Produk</th>
                                            <th className="w-36 px-3 py-2.5 text-right font-medium">Harga Beli (Rp)</th>
                                            <th className="w-32 px-3 py-2.5 text-right font-medium">Qty Awal</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {items.map((item, idx) => (
                                            <tr key={item.skuId} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item._code}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{item._name}</td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.unitCost}
                                                        onChange={e => {
                                                            const ni = [...items]
                                                            ni[idx].unitCost = +e.target.value
                                                            setItems(ni)
                                                        }}
                                                        className={`${numInputClass} w-28`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.qty}
                                                        onChange={e => {
                                                            const ni = [...items]
                                                            ni[idx].qty = +e.target.value
                                                            setItems(ni)
                                                        }}
                                                        className={`${numInputClass} w-24 ${
                                                            item.qty > 0 ? 'border-primary/40 bg-primary/5' : ''
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-sm tabular-nums text-foreground">
                                                    {item.qty > 0 ? fmt(item.qty * item.unitCost) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-20 mt-4 border-t border-border bg-card px-4 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Package size={13} />
                                        <span>SKU dengan Stok</span>
                                        <span className="font-medium text-foreground">{itemsWithQty.length} SKU</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <DollarSign size={13} />
                                        <span>Total Nilai Aset</span>
                                        <span className="font-medium tabular-nums text-foreground">{fmt(totalValue)}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || itemsWithQty.length === 0}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    {saving ? 'Menyimpan...' : `Simpan Beginning Stock (${itemsWithQty.length} SKU)`}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Package size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            {selectedWh ? 'Tidak ada SKU' : 'Pilih gudang'}
                        </p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {selectedWh
                                ? 'Belum ada SKU yang tersedia untuk gudang ini.'
                                : 'Pilih gudang terlebih dahulu untuk menampilkan daftar SKU.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
