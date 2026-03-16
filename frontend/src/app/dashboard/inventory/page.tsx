"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Package, Warehouse, TrendingDown, DollarSign,
    RefreshCw, Search, AlertTriangle, CheckCircle2,
    ChevronDown, ChevronUp, ArrowUpDown, Building2,
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

export default function InventoryPage() {
    const [skus, setSkus] = useState<SKU[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState("ALL") // ALL | LOW
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [selectedSku, setSelectedSku] = useState<SKU | null>(null)
    const [movements, setMovements] = useState<Movement[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [sRes, wRes] = await Promise.all([
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/warehouses')
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

    const summaryCards = [
        { label: 'Total SKU Aktif', value: totalSKUs, icon: Package, color: 'bg-indigo-600', suffix: ' SKU' },
        { label: 'Total Nilai Aset', value: fmt(totalValue), icon: DollarSign, color: 'bg-emerald-600', raw: true },
        { label: 'Stok Menipis', value: lowStockCount, icon: AlertTriangle, color: 'bg-amber-500', suffix: ' item' },
        { label: 'Gudang Aktif', value: activeWarehouses, icon: Building2, color: 'bg-violet-600', suffix: ' gudang' },
    ]

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 w-full font-inter pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <Package size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Inventory</h1>
                        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Multi-Warehouse Stock</p>
                    </div>
                </div>
                <button onClick={load} className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 md:py-2 text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 shadow-sm">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Reload
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {summaryCards.map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-start gap-2">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl ${card.color} flex items-center justify-center shadow-md`}>
                            <card.icon size={16} className="text-white md:w-[18px] md:h-[18px]" />
                        </div>
                        <div className="mt-1 md:mt-2">
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{card.label}</p>
                            <p className="text-base md:text-xl font-black text-slate-900 tracking-tight leading-none">{card.raw ? card.value : `${card.value}${card.suffix}`}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Warehouse Strip */}
            {warehouses.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {warehouses.filter(w => w.isActive).map(w => {
                        const wStock = skus.reduce((sum, s) => {
                            const ws = s.warehouseStocks.find(whs => whs.warehouse?.id === w.id)
                            return sum + (ws?.quantity || 0) * s.purchasePrice
                        }, 0)
                        return (
                            <div key={w.id} className="flex-shrink-0 bg-white rounded-2xl md:rounded-3xl px-4 md:px-5 py-3 border border-slate-100 shadow-sm min-w-[140px]">
                                <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">{w.code}</p>
                                <p className="font-bold text-slate-800 text-xs md:text-sm mt-0.5 whitespace-nowrap">{w.name}</p>
                                <p className="text-[11px] md:text-xs font-bold text-emerald-600 mt-1">{fmt(wStock)}</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:flex-wrap">
                <div className="relative w-full md:w-auto md:flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari SKU, produk..."
                        className="w-full pl-10 pr-4 py-3 md:py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" />
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
                    {[['ALL', 'Semua'], ['LOW', '⚠ Stok Menipis']].map(([v, l]) => (
                        <button key={v} onClick={() => setFilter(v)}
                            className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === v ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table / List Container */}
            {loading ? (
                <div className="flex items-center justify-center h-48 md:h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode SKU</th>
                                    <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga Beli</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/50">Mutasi IN</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50/50">Mutasi OUT</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50">Stock Akhir</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Nilai</th>
                                    <th className="px-6 py-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((s) => {
                                    const totalVal = s.totalQty * s.purchasePrice
                                    const isExpanded = expandedId === s.id
                                    return (
                                        <Fragment key={s.id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-xs text-indigo-600">{s.code}</p>
                                                    <p className="text-[10px] text-slate-400">{s.product?.category?.name || '—'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-slate-800">{s.product?.name}</p>
                                                    <p className="text-[11px] text-slate-400">{s.name || ''}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-slate-700">{fmt(s.purchasePrice)}</td>

                                                {/* Mutasi IN */}
                                                <td className="px-6 py-4 text-right bg-emerald-50/10">
                                                    <div className="flex items-center justify-end gap-1.5 min-w-[60px]">
                                                        {s.totalIn > 0 && <ArrowDownLeft size={12} className="text-emerald-500" />}
                                                        <span className={`font-black text-xs ${s.totalIn > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{s.totalIn > 0 ? `+${s.totalIn}` : '-'}</span>
                                                    </div>
                                                </td>

                                                {/* Mutasi OUT */}
                                                <td className="px-6 py-4 text-right bg-rose-50/10">
                                                    <div className="flex items-center justify-end gap-1.5 min-w-[60px]">
                                                        {s.totalOut > 0 && <ArrowUpRight size={12} className="text-rose-400" />}
                                                        <span className={`font-black text-xs ${s.totalOut > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{s.totalOut > 0 ? `-${s.totalOut}` : '-'}</span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-right bg-indigo-50/10">
                                                    <span className={`font-black text-sm ${s.isLowStock ? 'text-rose-600' : 'text-indigo-700'}`}>{s.totalQty}</span>
                                                    {s.minStock > 0 && <p className="text-[10px] text-slate-400">min {s.minStock}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-700">{fmt(totalVal)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {s.isLowStock
                                                        ? <span className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 justify-center w-fit mx-auto"><AlertTriangle size={10} /> Low</span>
                                                        : <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 justify-center w-fit mx-auto"><CheckCircle2 size={10} /> OK</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => openHistory(s)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all title='Riwayat Stok (Kartu Stok)'">
                                                            <History size={16} />
                                                        </button>
                                                        {s.warehouseStocks.length > 0 && (
                                                            <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && s.warehouseStocks.map(ws => (
                                                <tr key={ws.id} className="bg-indigo-50/30">
                                                    <td colSpan={3} className="px-8 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <Warehouse size={12} className="text-indigo-400" />
                                                            <span className="text-[11px] font-bold text-indigo-700">{ws.warehouse?.name || '?'}</span>
                                                            <span className="text-[10px] text-slate-400">({ws.warehouse?.code})</span>
                                                        </div>
                                                    </td>
                                                    <td colSpan={2} className="px-6 py-2.5 text-center text-[10px] font-bold text-slate-400 italic">Distribusi per Gudang</td>
                                                    <td className="px-6 py-2.5 text-right font-bold text-slate-800 text-[11px]">{ws.quantity}</td>
                                                    <td className="px-6 py-2.5 text-right text-[11px] font-bold text-emerald-600">{fmt(ws.quantity * s.purchasePrice)}</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="py-20 text-center border-t border-slate-100 bg-white">
                                <Package size={48} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada data stok</p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-4">
                        {filtered.map((s) => {
                            const totalVal = s.totalQty * s.purchasePrice;
                            const isExpanded = expandedId === s.id;
                            return (
                                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">{s.code}</p>
                                                {s.isLowStock
                                                    ? <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Low</span>
                                                    : <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} /> OK</span>
                                                }
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-[15px] leading-tight break-words whitespace-normal">{s.product?.name}</h3>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{s.product?.category?.name || 'Uncategorized'} • {s.name || ''}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Stok</p>
                                            <p className={`text-xl font-black leading-none ${s.isLowStock ? 'text-rose-600' : 'text-indigo-700'}`}>{s.totalQty}</p>
                                            {s.minStock > 0 && <p className="text-[9px] text-slate-400 mt-1">Min: {s.minStock}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harga Beli</span>
                                            <span className="text-xs font-bold text-slate-700">{fmt(s.purchasePrice)}</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nilai Total</span>
                                            <span className="text-xs font-bold text-emerald-600">{fmt(totalVal)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/50 flex flex-col justify-center items-center h-16">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Barang Masuk</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                {s.totalIn > 0 && <ArrowDownLeft size={12} className="text-emerald-500" />}
                                                <span className={`text-sm font-black ${s.totalIn > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{s.totalIn > 0 ? `+${s.totalIn}` : '-'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-rose-50/50 rounded-xl p-2.5 border border-rose-100/50 flex flex-col justify-center items-center h-16">
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Barang Keluar</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                {s.totalOut > 0 && <ArrowUpRight size={12} className="text-rose-400" />}
                                                <span className={`text-sm font-black ${s.totalOut > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{s.totalOut > 0 ? `-${s.totalOut}` : '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 border-t border-slate-100 pt-3">
                                        <button onClick={() => openHistory(s)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">
                                            <History size={14} /> Kartu Stok
                                        </button>
                                        {s.warehouseStocks.length > 0 && (
                                            <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                Lokasi {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                                            </button>
                                        )}
                                    </div>

                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 overflow-hidden">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Distribusi Gudang</p>
                                            {s.warehouseStocks.map(ws => (
                                                <div key={ws.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <Warehouse size={12} className="text-indigo-400" />
                                                        <span className="text-[10px] font-bold text-slate-700">{ws.warehouse?.name || '?'} <span className="text-[9px] font-normal text-slate-400">({ws.warehouse?.code})</span></span>
                                                    </div>
                                                    <span className="text-[11px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{ws.quantity}</span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )
                        })}

                        {filtered.length === 0 && (
                            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                                <Package size={48} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada data stok</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Stock Card History Drawer */}
            <AnimatePresence>
                {historyOpen && selectedSku && (
                    <div className="fixed inset-0 z-[300] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full md:max-w-md lg:max-w-2xl bg-white shadow-2xl h-[100dvh] flex flex-col overflow-hidden">

                            {/* Drawer Header */}
                            <div className="p-4 md:p-6 border-b border-slate-100 flex items-start justify-between font-inter bg-white safe-area-top">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">Kartu Stok / Riwayat Mutasi</p>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight md:leading-none break-words whitespace-normal">{selectedSku.product.name}</h2>
                                    <p className="text-[10px] md:text-xs text-slate-400 mt-1.5 font-medium line-clamp-2 md:line-clamp-none">{selectedSku.code} — {selectedSku.name || ''}</p>
                                </div>
                                <button onClick={() => setHistoryOpen(false)} className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"><X size={18} /></button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-inter">
                                {loadingHistory ? (
                                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat riwayat...</p>
                                    </div>
                                ) : movements.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
                                        <History size={48} className="text-slate-200" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada riwayat mutasi</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {movements.map((m, i) => {
                                            const type = m.movement.type

                                            let icon = <Repeat size={14} className="text-slate-400" />
                                            let color = 'bg-slate-50 text-slate-600'
                                            if (type === 'IN' || type === 'BEGINNING') { icon = <ArrowDownLeft size={14} />; color = 'bg-emerald-50 text-emerald-700 border-emerald-100' }
                                            if (type === 'OUT') { icon = <ArrowUpRight size={14} />; color = 'bg-rose-50 text-rose-700 border-rose-100' }
                                            if (type === 'TRANSFER') { icon = <RefreshCw size={14} />; color = 'bg-indigo-50 text-indigo-700 border-indigo-100' }
                                            if (type === 'OPNAME') { icon = <ClipboardList size={14} />; color = 'bg-amber-50 text-amber-700 border-amber-100' }

                                            return (
                                                <motion.div key={m.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                                    className="group relative flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transition-all bg-white">

                                                    {/* Type Badge / Icon */}
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${color}`}>
                                                        {icon}
                                                    </div>

                                                    {/* Body */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(m.movement.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                            <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{m.movement.number}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                                    {m.movement.type} — {m.movement.warehouse.name}
                                                                    {m.movement.toWarehouse && <span className="text-indigo-400 mx-1">➜ {m.movement.toWarehouse.name}</span>}
                                                                </p>
                                                                {(m.movement.referenceType || m.movement.notes) && (
                                                                    <p className="text-[10px] text-slate-500 mt-1 italic font-medium">
                                                                        {m.movement.referenceType && `[${m.movement.referenceType}] `}
                                                                        {m.movement.referenceNumber && `${m.movement.referenceNumber} — `}
                                                                        {m.movement.notes || m.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={`text-sm font-black ${type === 'OUT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    {type === 'OUT' ? '-' : '+'}{m.qty}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PCS</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 font-inter safe-area-bottom">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Total Qty Saat Ini</p>
                                    <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight shrink-0">{selectedSku.totalQty} <span className="text-[10px] md:text-xs font-bold text-slate-400">PCS</span></p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
