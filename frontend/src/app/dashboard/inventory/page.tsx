"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Package, Warehouse, DollarSign,
    RefreshCw, Search, AlertTriangle,
    ChevronDown, ChevronUp, Building2,
    History, X, ArrowUpRight, ArrowDownLeft, Repeat, ClipboardList
} from "lucide-react"

interface WHS { id: string; warehouse: { id: string; name: string; code: string }; quantity: number }
interface SKU {
    id: string; code: string; name: string; purchasePrice: number; salePrice: number;
    minStock: number; totalQty: number; isLowStock: boolean;
    totalIn: number; totalOut: number;
    warehouseStocks: WHS[];
    product: { name: string; category?: { name: string } }
}
interface Warehouse { id: string; code: string; name: string; type: string; isActive: boolean; stocks: unknown[] }
interface Movement {
    id: string; skuId: string; qty: number; unitCost: number; notes?: string;
    movement: {
        id: string; number: string; type: string; status: string; date: string;
        referenceType?: string; referenceNumber?: string; notes?: string;
        warehouse: { name: string; code: string };
        toWarehouse?: { name: string; code: string };
    }
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const filters: { value: string; label: string }[] = [
    { value: "ALL", label: "Semua" },
    { value: "LOW", label: "Stok Menipis" },
]

function StockPill({ low }: { low: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                low
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${low ? "bg-rose-500" : "bg-emerald-500"}`} />
            {low ? "Low" : "OK"}
        </span>
    )
}

export default function InventoryPage() {
    const [skus, setSkus] = useState<SKU[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState("ALL")
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [selectedSku, setSelectedSku] = useState<SKU | null>(null)
    const [movements, setMovements] = useState<Movement[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [sRes, wRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`)
            ])
            setSkus(await sRes.json())
            setWarehouses(await wRes.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const openHistory = async (sku: SKU) => {
        setSelectedSku(sku)
        setHistoryOpen(true)
        setLoadingHistory(true)
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock/${sku.id}/movements`)
            if (r.ok) setMovements(await r.json())
        } catch (e) { console.error(e) }
        finally { setLoadingHistory(false) }
    }

    const filtered = skus.filter(s => {
        const q = search.toLowerCase()
        const matchSearch = s.code.toLowerCase().includes(q) || s.product?.name.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q)
        return matchSearch && (filter === 'ALL' || (filter === 'LOW' && s.isLowStock))
    })

    const totalSKUs = skus.length
    const totalValue = skus.reduce((sum, s) => sum + s.totalQty * s.purchasePrice, 0)
    const lowStockCount = skus.filter(s => s.isLowStock).length
    const activeWarehouses = warehouses.filter(w => w.isActive).length

    const summaryCards: { label: string; value: string | number; icon: typeof Package; suffix?: string; raw?: boolean }[] = [
        { label: 'Total SKU Aktif', value: totalSKUs, icon: Package, suffix: ' SKU' },
        { label: 'Total Nilai Aset', value: fmt(totalValue), icon: DollarSign, raw: true },
        { label: 'Stok Menipis', value: lowStockCount, icon: AlertTriangle, suffix: ' item' },
        { label: 'Gudang Aktif', value: activeWarehouses, icon: Building2, suffix: ' gudang' },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px] space-y-5">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Inventory</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Multi-Warehouse Stock</p>
                    </div>
                    <button
                        onClick={load}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Reload
                    </button>
                </header>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[11px] text-muted-foreground">{card.label}</p>
                                    <p className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">
                                        {card.raw ? card.value : `${card.value}${card.suffix ?? ''}`}
                                    </p>
                                </div>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <card.icon size={15} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {warehouses.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {warehouses.filter(w => w.isActive).map(w => {
                            const wStock = skus.reduce((sum, s) => {
                                const ws = s.warehouseStocks.find(whs => whs.warehouse?.id === w.id)
                                return sum + (ws?.quantity || 0) * s.purchasePrice
                            }, 0)
                            return (
                                <div
                                    key={w.id}
                                    className="min-w-[150px] flex-shrink-0 rounded-xl border border-border bg-card px-4 py-3"
                                >
                                    <p className="text-[11px] font-medium text-muted-foreground">{w.code}</p>
                                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{w.name}</p>
                                    <p className="mt-1 text-xs font-medium tabular-nums text-foreground">{fmt(wStock)}</p>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari SKU, produk..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <div className="inline-flex items-center gap-1 self-start rounded-lg border border-border bg-muted/50 p-1">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                                    filter === f.value
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {f.value === "LOW" && <AlertTriangle size={12} />}
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <span className="hidden text-xs text-muted-foreground sm:ml-auto sm:block">
                        {filtered.length} SKU
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length > 0 ? (
                    <>
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40">
                                            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Kode SKU</th>
                                            <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground">Produk</th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Harga Beli</th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Mutasi IN</th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Mutasi OUT</th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Stock Akhir</th>
                                            <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Total Nilai</th>
                                            <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                                            <th className="w-20 px-3 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((s) => {
                                            const totalVal = s.totalQty * s.purchasePrice
                                            const isExpanded = expandedId === s.id
                                            return (
                                                <Fragment key={s.id}>
                                                    <tr
                                                        className={`transition-colors ${
                                                            isExpanded ? "bg-muted/30" : "hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <p className="font-mono text-[11px] font-medium text-foreground">{s.code}</p>
                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                {s.product?.category?.name || '—'}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <p className="text-sm font-medium text-foreground">{s.product?.name}</p>
                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.name || ''}</p>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-foreground">
                                                            {fmt(s.purchasePrice)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="inline-flex items-center justify-end gap-1 text-xs font-medium tabular-nums">
                                                                {s.totalIn > 0 && <ArrowDownLeft size={12} className="text-emerald-600 dark:text-emerald-400" />}
                                                                <span className={s.totalIn > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                                                    {s.totalIn > 0 ? `+${s.totalIn}` : '-'}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="inline-flex items-center justify-end gap-1 text-xs font-medium tabular-nums">
                                                                {s.totalOut > 0 && <ArrowUpRight size={12} className="text-rose-600 dark:text-rose-400" />}
                                                                <span className={s.totalOut > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                                                                    {s.totalOut > 0 ? `-${s.totalOut}` : '-'}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className={`text-sm font-semibold tabular-nums ${s.isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                                                {s.totalQty}
                                                            </span>
                                                            {s.minStock > 0 && (
                                                                <p className="text-[10px] text-muted-foreground">min {s.minStock}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-foreground">
                                                            {fmt(totalVal)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <StockPill low={s.isLowStock} />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <button
                                                                    onClick={() => openHistory(s)}
                                                                    title="Riwayat Stok (Kartu Stok)"
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                >
                                                                    <History size={15} />
                                                                </button>
                                                                {s.warehouseStocks.length > 0 && (
                                                                    <button
                                                                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                    >
                                                                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && s.warehouseStocks.map(ws => (
                                                        <tr key={ws.id} className="bg-muted/20">
                                                            <td colSpan={3} className="px-3 py-2 pl-6">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Warehouse size={12} className="text-muted-foreground" />
                                                                    <span className="text-[11px] font-medium text-foreground">
                                                                        {ws.warehouse?.name || '?'}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        ({ws.warehouse?.code})
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td colSpan={2} className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                                                                Distribusi per Gudang
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-[11px] font-medium tabular-nums text-foreground">
                                                                {ws.quantity}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-[11px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                {fmt(ws.quantity * s.purchasePrice)}
                                                            </td>
                                                            <td colSpan={2} />
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filtered.map((s) => {
                                const totalVal = s.totalQty * s.purchasePrice
                                const isExpanded = expandedId === s.id
                                return (
                                    <motion.div
                                        key={s.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border border-border bg-card p-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="font-mono text-[11px] text-muted-foreground">{s.code}</span>
                                                    <StockPill low={s.isLowStock} />
                                                </div>
                                                <p className="mt-1 break-words text-sm font-medium text-foreground">
                                                    {s.product?.name}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {s.product?.category?.name || 'Uncategorized'} • {s.name || ''}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[11px] text-muted-foreground">Stok</p>
                                                <p className={`text-lg font-semibold leading-none tabular-nums ${s.isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                                    {s.totalQty}
                                                </p>
                                                {s.minStock > 0 && (
                                                    <p className="mt-1 text-[10px] text-muted-foreground">Min: {s.minStock}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-lg border border-border bg-muted/30 p-2">
                                                <p className="text-[10px] text-muted-foreground">Harga Beli</p>
                                                <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">{fmt(s.purchasePrice)}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-2">
                                                <p className="text-[10px] text-muted-foreground">Nilai Total</p>
                                                <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">{fmt(totalVal)}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-2">
                                                <p className="text-[10px] text-muted-foreground">Barang Masuk</p>
                                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums">
                                                    {s.totalIn > 0 && <ArrowDownLeft size={12} className="text-emerald-600 dark:text-emerald-400" />}
                                                    <span className={s.totalIn > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                                        {s.totalIn > 0 ? `+${s.totalIn}` : '-'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-2">
                                                <p className="text-[10px] text-muted-foreground">Barang Keluar</p>
                                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums">
                                                    {s.totalOut > 0 && <ArrowUpRight size={12} className="text-rose-600 dark:text-rose-400" />}
                                                    <span className={s.totalOut > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                                                        {s.totalOut > 0 ? `-${s.totalOut}` : '-'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                                            <button
                                                onClick={() => openHistory(s)}
                                                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                            >
                                                <History size={14} /> Kartu Stok
                                            </button>
                                            {s.warehouseStocks.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors ${
                                                        isExpanded ? "bg-muted text-foreground" : "bg-background text-foreground hover:bg-muted"
                                                    }`}
                                                >
                                                    Lokasi {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="mt-3 overflow-hidden border-t border-border pt-3"
                                            >
                                                <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2">
                                                    {s.warehouseStocks.map(ws => (
                                                        <div
                                                            key={ws.id}
                                                            className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                <Warehouse size={12} className="shrink-0 text-muted-foreground" />
                                                                <span className="truncate text-[11px] font-medium text-foreground">
                                                                    {ws.warehouse?.name || '?'}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    ({ws.warehouse?.code})
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-medium tabular-nums text-foreground">
                                                                {ws.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Package size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Tidak ada data stok</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {search || filter !== 'ALL'
                                ? "Coba ubah pencarian atau filter untuk menemukan data."
                                : "Belum ada data stok yang tersedia."}
                        </p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {historyOpen && selectedSku && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setHistoryOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <History size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-muted-foreground">Kartu Stok / Riwayat Mutasi</p>
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            {selectedSku.product.name}
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {selectedSku.code} — {selectedSku.name || ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setHistoryOpen(false)}
                                    className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    <X size={16} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-4">
                                {loadingHistory ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                    </div>
                                ) : movements.length === 0 ? (
                                    <div className="flex h-64 flex-col items-center justify-center text-center">
                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                            <History size={22} />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">Belum ada riwayat mutasi</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Mutasi stok akan muncul di sini.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {movements.map((m) => {
                                            const type = m.movement.type

                                            let icon = <Repeat size={14} />
                                            let color = 'border-border bg-muted text-muted-foreground'
                                            if (type === 'IN' || type === 'BEGINNING') {
                                                icon = <ArrowDownLeft size={14} />
                                                color = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            }
                                            if (type === 'OUT') {
                                                icon = <ArrowUpRight size={14} />
                                                color = 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'
                                            }
                                            if (type === 'TRANSFER') {
                                                icon = <RefreshCw size={14} />
                                                color = 'border-border bg-primary/10 text-primary'
                                            }
                                            if (type === 'OPNAME') {
                                                icon = <ClipboardList size={14} />
                                                color = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                                            }

                                            return (
                                                <div
                                                    key={m.id}
                                                    className="flex gap-3 rounded-lg border border-border p-3"
                                                >
                                                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${color}`}>
                                                        {icon}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {new Date(m.movement.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            <p className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                                                {m.movement.number}
                                                            </p>
                                                        </div>
                                                        <div className="mt-1 flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-foreground">
                                                                    {m.movement.type} — {m.movement.warehouse.name}
                                                                    {m.movement.toWarehouse && (
                                                                        <span className="mx-1 text-muted-foreground">
                                                                            → {m.movement.toWarehouse.name}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                {(m.movement.referenceType || m.movement.notes) && (
                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                        {m.movement.referenceType && `[${m.movement.referenceType}] `}
                                                                        {m.movement.referenceNumber && `${m.movement.referenceNumber} — `}
                                                                        {m.movement.notes || m.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <p className={`text-sm font-semibold tabular-nums ${type === 'OUT' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                    {type === 'OUT' ? '-' : '+'}{m.qty}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground">PCS</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <footer className="border-t border-border px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-muted-foreground">Total Qty Saat Ini</p>
                                    <p className="text-sm font-semibold tabular-nums text-foreground">
                                        {selectedSku.totalQty}{' '}
                                        <span className="text-[11px] font-normal text-muted-foreground">PCS</span>
                                    </p>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
