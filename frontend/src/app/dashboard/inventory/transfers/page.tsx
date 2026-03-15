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
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-violet-50 text-violet-700 border-violet-200',
    CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200'
}
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

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
                fetch('http://localhost:5000/api/stock-movements?type=TRANSFER'),
                fetch('http://localhost:5000/api/warehouses'),
                fetch('http://localhost:5000/api/inventory/stock')
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
            const res = await fetch('http://localhost:5000/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: 'TRANSFER', items: items.map(i => ({ skuId: i.skuId, qty: i.qty, unitCost: i.unitCost })) })
            })
            if (res.ok) { setModalOpen(false); setItems([]); setForm({ warehouseId: '', toWarehouseId: '', date: new Date().toISOString().split('T')[0], notes: '' }); showToast('success', 'Transfer dibuat'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`http://localhost:5000/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
        if (res.ok) { showToast('success', 'Transfer gudang dikonfirmasi!'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all text-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 font-inter w-full bg-slate-50/30 min-h-screen pb-24 md:pb-8">
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
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
                        <ArrowLeftRight size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Transfer Gudang</h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Perpindahan Stok Antar Gudang</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-11 px-4 text-[10px] font-black uppercase tracking-wider">
                        <RefreshCw size={13} className="mr-1.5" /> Reload
                    </Button>
                    <Button onClick={() => setModalOpen(true)} className="flex-[2] md:flex-none rounded-xl bg-violet-600 hover:bg-violet-700 text-white h-11 px-5 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-violet-600/20">
                        <Plus size={14} className="mr-1.5" /> Transfer Baru
                    </Button>
                </div>
            </header>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nomor</th>
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari Gudang</th>
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Ke Gudang</th>
                            <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                            <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Nilai Transfer</th>
                            <th className="px-6 py-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-3.5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {movements.map(m => {
                            const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                            return (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-black text-xs text-violet-600">{m.number}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-700">{m.warehouse?.name}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-700">{m.toWarehouse?.name}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-6 py-4 text-right font-bold text-violet-700">{fmt(totalVal)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${STATUS_CFG[m.status]}`}>{m.status}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.status === 'DRAFT' && (
                                            <button onClick={() => handleConfirm(m.id)} className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center" title="Konfirmasi Transfer"><Check size={13} /></button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {movements.length === 0 && !loading && (
                    <div className="py-20 text-center"><ArrowLeftRight size={48} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Belum ada transfer gudang</p></div>
                )}
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-28 border border-slate-100" />)
                ) : movements.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <ArrowLeftRight size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada transfer gudang</p>
                    </div>
                ) : movements.map(m => {
                    const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                    const stColor = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                            <div className="flex items-start justify-between pl-2">
                                <div>
                                    <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest block mb-0.5">{m.number}</span>
                                    <span className="text-xs font-bold text-slate-500">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${stColor}`}>{m.status}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-2">
                                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dari</p>
                                    <p className="text-[11px] font-black text-slate-700 leading-tight">{m.warehouse?.name}</p>
                                </div>
                                <ArrowLeftRight size={14} className="text-violet-400 shrink-0" />
                                <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-2.5 text-center">
                                    <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1">Ke</p>
                                    <p className="text-[11px] font-black text-violet-700 leading-tight">{m.toWarehouse?.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pl-2 pt-2 border-t border-slate-50">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{m.items.length} item &bull; Total Nilai</span>
                                    <span className="text-sm font-black text-violet-700">{fmt(totalVal)}</span>
                                </div>
                                {m.status === 'DRAFT' && (
                                    <button onClick={() => handleConfirm(m.id)} className="h-9 px-3 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-violet-100 active:scale-95 transition-all">
                                        <Check size={13} /> Konfirmasi
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[1.5rem] md:rounded-3xl shadow-2xl w-full max-w-3xl mx-auto relative flex flex-col max-h-[95vh] md:max-h-[85vh]">
                            <div className="flex justify-center pt-3 pb-2 md:hidden bg-slate-50/50 shrink-0 rounded-t-[1.5rem]">
                                <div className="w-12 h-1.5 bg-slate-300/50 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between px-6 md:px-8 py-4 md:py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-violet-600 flex items-center justify-center"><ArrowLeftRight size={16} className="text-white" /></div>
                                    <h2 className="font-extrabold text-slate-900 text-base md:text-lg uppercase tracking-wider">Transfer Antar Gudang</h2>
                                </div>
                                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm"><X size={18} /></button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5 md:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={lc}>Dari Gudang <span className="text-rose-500">*</span></label>
                                            <select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className={ic}>
                                                <option value="">-- Gudang Asal --</option>
                                                {warehouses.filter(w => w.id !== form.toWarehouseId).map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={lc}>Ke Gudang <span className="text-rose-500">*</span></label>
                                            <select required value={form.toWarehouseId} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })} className={ic}>
                                                <option value="">-- Gudang Tujuan --</option>
                                                {warehouses.filter(w => w.id !== form.warehouseId).map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={lc}>Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ic} /></div>
                                        <div><label className={lc}>Catatan</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Alasan transfer..." className={ic} /></div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Barang yang Ditransfer</h3>
                                            <button type="button" onClick={addItem} className="text-[10px] font-bold uppercase tracking-wider text-violet-600 hover:text-violet-800 bg-violet-50 px-3 py-1.5 rounded-lg transition-colors">+ Tambah Barang</button>
                                        </div>
                                        <div className="space-y-3">
                                            {items.length === 0 ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih barang yang akan ditransfer</p></div>
                                            ) : (
                                                items.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 items-start md:items-center">
                                                        <div className="w-full md:col-span-5">
                                                            <select value={item.skuId} onChange={e => updateItem(idx, 'skuId', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs outline-none font-medium">
                                                                <option value="">-- Pilih SKU --</option>
                                                                {skus.map(s => {
                                                                    const avail = form.warehouseId ? s.warehouseStocks.find(ws => ws.warehouse?.id === form.warehouseId)?.quantity || 0 : s.totalQty
                                                                    return <option key={s.id} value={s.id}>{s.code} (Stok: {avail})</option>
                                                                })}
                                                            </select>
                                                        </div>
                                                        <div className="w-full grid grid-cols-3 md:contents gap-2">
                                                            <div className="md:col-span-2"><input type="number" min="0.01" step="any" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none" /></div>
                                                            <div className="md:col-span-3 relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                                                <input type="number" min="0" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', +e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-2 text-xs font-bold outline-none" />
                                                            </div>
                                                            <div className="md:col-span-1 flex items-center justify-between md:justify-end">
                                                                <p className="text-[10px] font-bold text-violet-600 md:hidden">{fmt(item.qty * item.unitCost)}</p>
                                                                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:flex md:col-span-1 justify-end"><p className="text-[10px] font-bold text-violet-600">{fmt(item.qty * item.unitCost)}</p></div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Nilai Transfer</span>
                                        <p className="text-lg font-black text-violet-700 mt-0.5 flex items-center gap-1"><DollarSign size={15} />{fmt(totalValue)}</p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 md:flex-none rounded-xl h-12 font-bold uppercase tracking-wider text-xs">Batal</Button>
                                        <Button onClick={handleSubmit} disabled={saving || items.length === 0} className="flex-[2] md:flex-none rounded-xl h-12 md:px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-violet-600/20 disabled:opacity-60 active:scale-95 transition-all">
                                            {saving ? 'Menyimpan...' : 'Buat Transfer'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
