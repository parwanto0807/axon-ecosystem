"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardList, Plus, X, CheckCircle2, AlertCircle,
    RefreshCw, Check, TrendingUp, TrendingDown, Minus, DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse { id: string; code: string; name: string }
interface SKU {
    id: string; code: string; name: string; purchasePrice: number;
    product: { name: string }; warehouseStocks: { warehouse: { id: string }; quantity: number }[]
}
interface Movement {
    id: string; number: string; status: string; date: string;
    warehouse: Warehouse; notes?: string; confirmedAt?: string;
    items: { qty: number; systemQty?: number; sku: { code: string; product: { name: string } } }[]
}
interface OpnameItem { skuId: string; systemQty: number; actualQty: number; unitCost: number; _name: string; _code: string }

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const STATUS_CFG: Record<string, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200'
}

export default function OpnamePage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [selectedWh, setSelectedWh] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<OpnameItem[]>([])
    const [saving, setSaving] = useState(false)

    const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes] = await Promise.all([
                fetch('http://localhost:5000/api/stock-movements?type=OPNAME'),
                fetch('http://localhost:5000/api/warehouses'),
                fetch('http://localhost:5000/api/inventory/stock')
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
        } catch { showToast('error', 'Gagal memuat') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const openNew = () => {
        setSelectedWh(''); setItems([]); setNotes(''); setModalOpen(true)
    }

    const loadItemsForWarehouse = (whId: string) => {
        setSelectedWh(whId)
        setItems(skus
            .filter(s => s.warehouseStocks.some(ws => ws.warehouse?.id === whId))
            .map(s => {
                const systemQty = s.warehouseStocks.find(ws => ws.warehouse?.id === whId)?.quantity || 0
                return { skuId: s.id, systemQty, actualQty: systemQty, unitCost: s.purchasePrice, _name: s.product?.name, _code: s.code }
            })
        )
    }

    const handleSave = async () => {
        if (!selectedWh || items.length === 0) return
        setSaving(true)
        try {
            const res = await fetch('http://localhost:5000/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId: selectedWh, type: 'OPNAME', date, notes,
                    items: items.map(i => ({ skuId: i.skuId, qty: i.actualQty, systemQty: i.systemQty, unitCost: i.unitCost }))
                })
            })
            if (res.ok) { setModalOpen(false); showToast('success', 'Session opname dibuat sebagai Draft'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`http://localhost:5000/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
        if (res.ok) { showToast('success', 'Stock Opname dikonfirmasi! Stok telah disesuaikan.'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const discrepancies = items.filter(i => i.actualQty !== i.systemQty).length
    const totalDiff = items.reduce((s, i) => s + (i.actualQty - i.systemQty) * i.unitCost, 0)

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-4 py-6 md:py-6 md:max-w-screen space-y-5 md:space-y-6 font-inter w-full bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                        <ClipboardList size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Stock Opname</h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Perhitungan Fisik & Penyesuaian Stok</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-11 px-4 text-[10px] font-black uppercase tracking-wider">
                        <RefreshCw size={13} className="mr-1.5" /> Reload
                    </Button>
                    <Button onClick={openNew} className="flex-[2] md:flex-none rounded-xl bg-amber-500 hover:bg-amber-600 text-white h-11 px-5 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/20">
                        <Plus size={14} className="mr-1.5" /> Opname Baru
                    </Button>
                </div>
            </header>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nomor</th>
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Gudang</th>
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                            <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Items Diopname</th>
                            <th className="px-6 py-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-3.5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {movements.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-black text-xs text-amber-600">{m.number}</td>
                                <td className="px-6 py-4 font-semibold text-slate-700">{m.warehouse?.name}</td>
                                <td className="px-6 py-4 text-slate-500 text-xs">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-6 py-4 text-right">
                                    <p className="font-bold text-slate-700">{m.items.length} SKU</p>
                                    <p className="text-[10px] text-slate-400">{m.items.filter(i => i.qty !== i.systemQty).length} selisih</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${STATUS_CFG[m.status]}`}>{m.status}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {m.status === 'DRAFT' && (
                                        <button onClick={() => handleConfirm(m.id)} className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center" title="Konfirmasi & Terapkan Penyesuaian"><Check size={13} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {movements.length === 0 && !loading && (
                    <div className="py-20 text-center"><ClipboardList size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada session opname</p></div>
                )}
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-28 border border-slate-100" />)
                ) : movements.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <ClipboardList size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada session opname</p>
                    </div>
                ) : movements.map(m => {
                    const stColor = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                    const selisih = m.items.filter(i => i.qty !== i.systemQty).length
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                            <div className="flex items-start justify-between pl-2">
                                <div>
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-0.5">{m.number}</span>
                                    <span className="text-xs font-bold text-slate-500">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${stColor}`}>{m.status}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ml-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gudang</p>
                                <p className="text-[13px] font-black text-slate-700">{m.warehouse?.name}</p>
                                <div className="flex gap-3 mt-2">
                                    <span className="text-[9px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">{m.items.length} SKU</span>
                                    {selisih > 0 && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">{selisih} selisih</span>}
                                </div>
                            </div>
                            {m.status === 'DRAFT' && (
                                <div className="pl-2">
                                    <button onClick={() => handleConfirm(m.id)} className="w-full h-10 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-amber-200 active:scale-95 transition-all">
                                        <Check size={14} /> Konfirmasi & Terapkan
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Opname Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[1.5rem] md:rounded-3xl shadow-2xl w-full max-w-4xl mx-auto relative flex flex-col max-h-[95vh] md:max-h-[90vh]">
                            <div className="flex justify-center pt-3 pb-2 md:hidden bg-slate-50/50 shrink-0 rounded-t-[1.5rem]">
                                <div className="w-12 h-1.5 bg-slate-300/50 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between px-5 md:px-8 py-4 md:py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-amber-500 flex items-center justify-center"><ClipboardList size={16} className="text-white" /></div>
                                    <h2 className="font-extrabold text-slate-900 text-base md:text-lg uppercase tracking-wider">Stock Opname Baru</h2>
                                </div>
                                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm"><X size={18} /></button>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                <div className="p-5 md:p-8 space-y-5 md:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Gudang yang Diopname <span className="text-rose-500">*</span></label>
                                            <select value={selectedWh} onChange={e => loadItemsForWarehouse(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all">
                                                <option value="">-- Pilih Gudang --</option>
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Tanggal</label>
                                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" />
                                        </div>
                                    </div>

                                    {selectedWh && discrepancies > 0 && (
                                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
                                            <p className="text-xs font-bold text-amber-700">{discrepancies} item dengan selisih stok</p>
                                            <p className={`font-black text-sm flex items-center gap-1 ${totalDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                <DollarSign size={13} />{totalDiff >= 0 ? '+' : ''}{fmt(totalDiff)}
                                            </p>
                                        </div>
                                    )}

                                    {selectedWh && (
                                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                            {/* Desktop table */}
                                            <div className="hidden md:block overflow-y-auto max-h-96">
                                                <table className="w-full text-sm">
                                                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm">
                                                        <tr className="border-b border-slate-100">
                                                            <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</th>
                                                            <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                                                            <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Stok Sistem</th>
                                                            <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Stok Fisik</th>
                                                            <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Selisih</th>
                                                            <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Nilai Selisih</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {items.map((item, idx) => {
                                                            const diff = item.actualQty - item.systemQty
                                                            return (
                                                                <tr key={item.skuId} className={diff !== 0 ? 'bg-amber-50/40' : ''}>
                                                                    <td className="px-5 py-2.5 font-black text-xs text-indigo-600">{item._code}</td>
                                                                    <td className="px-5 py-2.5 text-slate-700 font-medium text-xs">{item._name}</td>
                                                                    <td className="px-5 py-2.5 text-center font-bold text-slate-600">{item.systemQty}</td>
                                                                    <td className="px-5 py-2.5">
                                                                        <input type="number" min="0" step="any" value={item.actualQty}
                                                                            onChange={e => { const ni = [...items]; ni[idx].actualQty = +e.target.value; setItems(ni) }}
                                                                            className={`w-20 text-center border rounded-lg px-2 py-1 text-xs font-bold outline-none mx-auto block transition-all ${diff > 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : diff < 0 ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white'}`} />
                                                                    </td>
                                                                    <td className="px-5 py-2.5 text-center">
                                                                        {diff === 0 ? <Minus size={14} className="text-slate-300 mx-auto" />
                                                                            : diff > 0 ? <span className="flex items-center justify-center gap-1 text-emerald-600 font-black text-xs"><TrendingUp size={12} />+{diff}</span>
                                                                                : <span className="flex items-center justify-center gap-1 text-rose-600 font-black text-xs"><TrendingDown size={12} />{diff}</span>}
                                                                    </td>
                                                                    <td className="px-5 py-2.5 text-right text-xs font-bold">
                                                                        {diff !== 0 && (
                                                                            <span className={diff > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                                                {diff > 0 ? '+' : ''}{fmt(diff * item.unitCost)}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Mobile stacked cards */}
                                            <div className="md:hidden space-y-2 p-3 max-h-[50vh] overflow-y-auto">
                                                {items.map((item, idx) => {
                                                    const diff = item.actualQty - item.systemQty
                                                    return (
                                                        <div key={item.skuId} className={`p-3 rounded-xl border flex flex-col gap-2 ${diff !== 0 ? 'bg-amber-50/40 border-amber-100' : 'bg-white border-slate-100'}`}>
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{item._code}</span>
                                                                    <span className="text-[11px] font-bold text-slate-700">{item._name}</span>
                                                                </div>
                                                                {diff !== 0 && (
                                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${diff > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                                                                        {diff > 0 ? '+' : ''}{diff}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 text-center">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sistem</p>
                                                                    <p className="text-sm font-black text-slate-700">{item.systemQty}</p>
                                                                </div>
                                                                <div className="text-slate-300">→</div>
                                                                <div className="flex-1 text-center">
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fisik</p>
                                                                    <input type="number" min="0" step="any" value={item.actualQty}
                                                                        onChange={e => { const ni = [...items]; ni[idx].actualQty = +e.target.value; setItems(ni) }}
                                                                        className={`w-full text-center border rounded-lg px-2 py-1.5 text-sm font-black outline-none transition-all ${diff > 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : diff < 0 ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50'}`} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                                <div className="flex gap-3 w-full">
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 md:flex-none rounded-xl h-12 font-bold uppercase tracking-wider text-xs">Batal</Button>
                                    <Button onClick={handleSave} disabled={saving || !selectedWh} className="flex-[2] md:flex-none rounded-xl h-12 md:px-8 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 disabled:opacity-60 active:scale-95 transition-all">
                                        {saving ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
