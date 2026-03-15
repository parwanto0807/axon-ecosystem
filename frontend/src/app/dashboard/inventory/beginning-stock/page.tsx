"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2, AlertCircle, RefreshCw, DollarSign, Package, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse { id: string; code: string; name: string }
interface SKU {
    id: string; code: string; name: string; purchasePrice: number;
    product: { name: string }; warehouseStocks: { warehouse: { id: string }; quantity: number }[]
}
interface Item { skuId: string; qty: number; unitCost: number; _name: string; _code: string }

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

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
                fetch('http://localhost:5000/api/warehouses'),
                fetch('http://localhost:5000/api/inventory/stock')
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
            const res = await fetch('http://localhost:5000/api/stock-movements', {
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
            await fetch(`http://localhost:5000/api/stock-movements/${data.id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmedBy: 'Admin' })
            })
            showToast('success', 'Beginning stock berhasil disimpan!')
            load()
        } finally { setSaving(false) }
    }

    return (
        <div className="px-4 py-6 space-y-6 font-inter w-full">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-700/20">
                        <Package size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Beginning Stock</h1>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Input Stok Awal per Gudang</p>
                    </div>
                </div>
                <Button variant="outline" onClick={load} className="rounded-xl border-slate-200 text-slate-600 h-10 px-4 text-xs font-bold uppercase tracking-wider"><RefreshCw size={13} className="mr-2" /> Reload</Button>
            </header>

            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 px-5 py-4">
                <Info size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-semibold text-indigo-700">Pilih gudang, kemudian masukkan kuantitas stok awal untuk setiap SKU. Klik <strong>Simpan Beginning Stock</strong> untuk mengaplikasikannya ke sistem.</p>
            </div>

            <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Pilih Gudang <span className="text-rose-500">*</span></label>
                    <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm">
                        <option value="">-- Pilih Gudang --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Tanggal Efektif</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm" />
                </div>
            </div>

            {selectedWh && (
                <>
                    {/* Summary */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="bg-white rounded-2xl border border-slate-100 px-5 py-3">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKU dengan Stok</p>
                            <p className="font-black text-slate-900">{itemsWithQty.length} SKU</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 px-5 py-3">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Nilai Aset</p>
                            <p className="font-black text-emerald-700 flex items-center gap-1"><DollarSign size={13} />{fmt(totalValue)}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode SKU</th>
                                    <th className="px-6 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Produk</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-36">Harga Beli (Rp)</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Qty Awal</th>
                                    <th className="px-6 py-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Nilai</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <tr key={item.skuId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 font-black text-xs text-indigo-600">{item._code}</td>
                                        <td className="px-6 py-3 font-medium text-slate-700">{item._name}</td>
                                        <td className="px-6 py-3">
                                            <input type="number" min="0" value={item.unitCost}
                                                onChange={e => { const ni = [...items]; ni[idx].unitCost = +e.target.value; setItems(ni) }}
                                                className="w-full text-right bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                                        </td>
                                        <td className="px-6 py-3">
                                            <input type="number" min="0" step="any" value={item.qty}
                                                onChange={e => { const ni = [...items]; ni[idx].qty = +e.target.value; setItems(ni) }}
                                                className={`w-full text-center border rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 transition-all ${item.qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-800 focus:ring-indigo-100' : 'bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`} />
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-emerald-700 text-xs">{item.qty > 0 ? fmt(item.qty * item.unitCost) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving || itemsWithQty.length === 0} className="rounded-xl h-12 bg-indigo-700 hover:bg-indigo-800 text-white font-bold uppercase tracking-wider text-xs px-8 shadow-lg shadow-indigo-700/20">
                            {saving ? 'Menyimpan...' : `Simpan Beginning Stock (${itemsWithQty.length} SKU)`}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}
