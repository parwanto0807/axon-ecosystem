"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    PackagePlus, Plus, Search, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, Check, Ban, DollarSign, Eye,
    Clock, Tag, MapPin, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

interface Warehouse { id: string; code: string; name: string }
interface SKU { id: string; code: string; name: string; purchasePrice: number; product: { name: string } }
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

interface FormItem { skuId: string; qty: number; unitCost: number; notes?: string; _sku?: SKU }

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Ban }
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

    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes] = await Promise.all([
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements?type=IN'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/warehouses'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock')
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, type: 'IN', referenceType: 'MANUAL', items: items.map(i => ({ skuId: i.skuId, qty: i.qty, unitCost: i.unitCost, notes: i.notes })) })
            })
            if (res.ok) { setModalOpen(false); setItems([]); setForm({ warehouseId: '', date: new Date().toISOString().split('T')[0], notes: '', referenceNumber: '' }); showToast('success', 'Penerimaan barang dibuat'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
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

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm"
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
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                        <PackagePlus size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Stok Masuk</h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 md:mt-1.5">Penerimaan Barang ke Gudang</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 bg-white text-slate-600 h-11 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        <RefreshCw size={13} className={`mr-1.5 md:mr-2 ${loading ? 'animate-spin' : ''}`} /> Reload
                    </Button>
                    <Button onClick={() => setModalOpen(true)} className="flex-[2] md:flex-none rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
                        <Plus size={14} className="mr-1.5 md:mr-2" /> Penerimaan Baru
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total S-In', value: movements.length, icon: PackagePlus, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Total Transaksi' },
                    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Perlu Konfirmasi' },
                    { label: 'Confirmed', value: confirmedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Sudah Masuk Stok' },
                    { label: 'Total Nilai', value: fmt(totalInValue), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Confirmed Value' },
                ].map((s, i) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} key={i}
                        className="bg-white p-4 md:p-5 rounded-[1.25rem] md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-xl md:rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                            <s.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className="text-base md:text-lg font-black text-slate-900 leading-tight">{s.value}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 italic hidden md:block">{s.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 md:p-4 rounded-[1.25rem] md:rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:flex-1 md:max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nomor, proyek, gudang..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl md:rounded-2xl pl-11 pr-4 py-2.5 text-[11px] md:text-sm font-medium focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-300 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar w-full md:w-auto">
                    <div className="bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl flex gap-1 min-w-max">
                        {['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterStatus === s
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {s === 'ALL' ? 'Semua' : s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">

                <div className="overflow-x-auto" style={{ display: 'block' }}>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaksi</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang & Referensi</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyek / Work Order</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Nilai</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(m => {
                                const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                                const status = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-xs text-emerald-600 tabular-nums tracking-tight">{m.number}</span>
                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">{fmtDate(m.date)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 group/wh">
                                                    <MapPin size={10} className="text-slate-300 group-hover/wh:text-emerald-500 transition-colors" />
                                                    <span className="font-bold text-slate-700 text-xs">{m.warehouse?.name}</span>
                                                </div>
                                                {m.referenceNumber && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Tag size={10} className="text-slate-300" />
                                                        <span className="text-[10px] font-medium text-slate-400 italic">Ref: {m.referenceNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {m.workOrder ? (
                                                <div className="flex flex-col max-w-[220px]">
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <Briefcase size={10} className="text-slate-400 flex-shrink-0" />
                                                        <span className="font-black text-[10px] text-slate-700 truncate">{m.workOrder.project?.name || m.workOrder.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-100/50">WO: {m.workOrder.number}</span>
                                                        {m.workOrder.customer && (
                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-slate-100 truncate max-w-[120px]" title={m.workOrder.customer.name}>
                                                                {m.workOrder.customer.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest leading-none">Manual In</span>
                                                    {m.notes && (
                                                        <span className="text-[10px] font-medium text-slate-500 mt-1.5 line-clamp-2 leading-tight" title={m.notes}>
                                                            {m.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-700 text-xs">{m.items.length} Items</span>
                                                <div className="flex flex-col items-end gap-0.5 mt-1">
                                                    {m.items.slice(0, 2).map((it, idx) => (
                                                        <span key={idx} className="text-[9px] font-bold text-slate-400 truncate max-w-[140px] leading-none uppercase tracking-tighter" title={it.sku?.product?.name || it.sku?.name}>
                                                            {it.sku?.product?.name || it.sku?.name}
                                                        </span>
                                                    ))}
                                                    {m.items.length > 2 && <span className="text-[8px] font-black text-slate-300">+{m.items.length - 2} OTHERS</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-emerald-700 text-xs tabular-nums tracking-tight">{fmt(totalVal)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${status.color}`}>
                                                    <status.icon size={12} className="opacity-80" />
                                                    {status.label}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setSelectedMovement(m); setViewModalOpen(true); }}
                                                    className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    title="Detail"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                {m.status === 'DRAFT' && (
                                                    <>
                                                        <button onClick={() => handleConfirm(m.id)} className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm" title="Konfirmasi"><Check size={14} /></button>
                                                        <button onClick={() => handleCancel(m.id)} className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm" title="Batalkan"><Ban size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {(loading || filtered.length === 0) && (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                {loading ? <RefreshCw size={32} className="text-emerald-500 animate-spin" /> : <PackagePlus size={32} className="text-slate-200" />}
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">{loading ? 'Memuat Data...' : 'Tidak Ada Data'}</h3>
                            <p className="text-xs font-bold text-slate-400 max-w-[240px] leading-relaxed">
                                {loading ? 'Sabar ya, data sedang kami ambil dari server.' : 'Coba ubah kata kunci pencarian atau filter status untuk hasil lain.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-36 border border-slate-100" />)
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <PackagePlus size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data tidak ditemukan</p>
                    </div>
                ) : filtered.map(m => {
                    const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                    const st = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                    const StatusIcon = st.icon
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                            <div className="flex items-start justify-between gap-3 pl-2">
                                <div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">{m.number}</span>
                                    <span className="text-[15px] font-extrabold text-slate-900">{fmtDate(m.date)}</span>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${st.color}`}>
                                    <StatusIcon size={12} /> {st.label}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ml-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <MapPin size={11} className="text-slate-400" />
                                    <span className="text-[11px] font-black text-slate-700">{m.warehouse?.name}</span>
                                </div>
                                {m.referenceNumber && <span className="text-[10px] font-medium text-slate-400 italic">Ref: {m.referenceNumber}</span>}
                                {m.workOrder && (
                                    <span className="text-[9px] font-black text-indigo-600 mt-1.5 flex items-center gap-1.5 bg-indigo-50/50 w-fit px-2 py-1 rounded-md border border-indigo-100/50">
                                        <Briefcase size={10} /> {m.workOrder.project?.name || m.workOrder.title}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between pl-2 pt-2 border-t border-slate-50">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{m.items.length} item &bull; Total Nilai</span>
                                    <span className="text-sm font-black text-emerald-700">{fmt(totalVal)}</span>
                                </div>
                                <div className="flex gap-2">
                                    {m.status === 'DRAFT' && (
                                        <button onClick={() => handleConfirm(m.id)} className="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-emerald-100 active:scale-95 transition-all">
                                            <Check size={13} /> Konfirmasi
                                        </button>
                                    )}
                                    <button onClick={() => { setSelectedMovement(m); setViewModalOpen(true); }} className="h-9 px-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-slate-200 active:scale-95 transition-all">
                                        <Eye size={13} /> Detail
                                    </button>
                                </div>
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
                            className="bg-white rounded-t-[1.5rem] md:rounded-[2rem] shadow-2xl w-full max-w-3xl mx-auto relative flex flex-col max-h-[95vh] md:max-h-[85vh] border border-white/20">
                            <div className="flex justify-center pt-3 pb-2 md:hidden bg-slate-50/50 shrink-0 rounded-t-[1.5rem]">
                                <div className="w-12 h-1.5 bg-slate-300/50 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between px-6 md:px-8 py-4 md:py-6 border-b border-slate-50 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20"><Plus size={18} className="text-white" /></div>
                                    <div>
                                        <h2 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-tight leading-none">Penerimaan Barang</h2>
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-1.5 uppercase tracking-widest">Input Stok Masuk Baru</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 md:w-10 md:h-10 rounded-full md:rounded-xl bg-white hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shadow-sm"><X size={18} /></button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 md:space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className={lc}>Gudang Tujuan <span className="text-rose-500">*</span></label>
                                            <div className="relative group">
                                                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                <select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className={`${ic} pl-10`}>
                                                    <option value="">-- Pilih Gudang --</option>
                                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={lc}>Tanggal Penerimaan</label>
                                            <div className="relative group">
                                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={`${ic} pl-10`} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={lc}>Nomor Referensi</label>
                                            <div className="relative group">
                                                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                                <input value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} placeholder="No. DO Vendor, PO, dsb." className={`${ic} pl-10`} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-slate-400">
                                            <label className={lc}>Catatan Tambahan</label>
                                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opsional..." className={ic} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><PackagePlus size={16} className="text-emerald-500" /> Daftar Barang</h3>
                                            <button type="button" onClick={addItem} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm border border-emerald-100">+ Tambah Baris</button>
                                        </div>
                                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                            {items.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                                    <PackagePlus size={32} className="text-slate-200 mx-auto mb-3" />
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada barang</p>
                                                </div>
                                            ) : (
                                                items.map((item, idx) => (
                                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={idx} className="grid grid-cols-12 gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm items-center hover:shadow-md transition-shadow group/item">
                                                        <div className="col-span-5">
                                                            <select value={item.skuId} onChange={e => updateItem(idx, 'skuId', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all">
                                                                <option value="">-- Pilih Barang --</option>
                                                                {skus.map(s => <option key={s.id} value={s.id}>{s.code} - {s.product?.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <div className="relative shadow-sm">
                                                                <input type="number" min="0.01" step="any" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black outline-none text-center focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all" />
                                                                <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] font-black text-slate-300 uppercase">Qty</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3">
                                                            <div className="relative shadow-sm">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                                                                <input type="number" min="0" placeholder="Harga" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', +e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-emerald-600" />
                                                                <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] font-black text-slate-300 uppercase">Unit Cost</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <p className="text-[10px] font-black text-emerald-600 tabular-nums">{fmt(item.qty * item.unitCost)}</p>
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button type="button" onClick={() => removeItem(idx)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover/item:opacity-100"><Trash2 size={16} /></button>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimasi</span>
                                        <p className="text-xl font-black text-emerald-700 mt-0.5">{fmt(totalValue)}</p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 md:flex-none rounded-xl bg-white h-12 md:h-14 md:px-8 font-black uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50 transition-all">Batal</Button>
                                        <Button type="submit" disabled={saving || items.length === 0} className="flex-[2] md:flex-none rounded-xl h-12 md:h-14 md:px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50 active:scale-95">
                                            {saving ? 'Menyimpan...' : 'Simpan Draft'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewModalOpen && selectedMovement && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/40 backdrop-blur-md overflow-y-auto pt-8 pb-20 no-scrollbar">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20"><Eye size={20} className="text-white" /></div>
                                    <div>
                                        <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none">Detail Transaksi</h2>
                                        <p className="text-[10px] font-bold text-indigo-600 mt-1.5 uppercase tracking-widest">{selectedMovement.number}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewModalOpen(false)} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"><X size={24} /></button>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-y-6 gap-x-8 pb-8 border-b border-slate-100">
                                    <div className="space-y-1"><label className={lc}>Gudang</label><p className="font-black text-slate-900 flex items-center gap-2"><MapPin size={12} className="text-indigo-500" />{selectedMovement.warehouse?.name}</p></div>
                                    <div className="space-y-1"><label className={lc}>Tanggal</label><p className="font-black text-slate-900 flex items-center gap-2"><Clock size={12} className="text-indigo-500" />{new Date(selectedMovement.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                                    <div className="space-y-1">
                                        <label className={lc}>Status Transaksi</label>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${STATUS_CFG[selectedMovement.status]?.color || ''}`}>
                                            {STATUS_CFG[selectedMovement.status]?.label || selectedMovement.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1"><label className={lc}>Referensi / DO</label><p className="font-black text-slate-900 uppercase italic text-xs">{selectedMovement.referenceNumber || '-'}</p></div>
                                    {selectedMovement.workOrder && (
                                        <div className="col-span-2 pt-4 border-t border-slate-50">
                                            <label className={lc}>Konteks Proyek</label>
                                            <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/50 mt-1">
                                                <div className="w-10 h-10 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm"><Briefcase size={20} /></div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-xs">{selectedMovement.workOrder.project?.name || selectedMovement.workOrder.title}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-tighter">WO: {selectedMovement.workOrder.number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-span-2 pt-2"><label className={lc}>Catatan</label><p className="font-medium text-slate-500 italic text-xs leading-relaxed">{selectedMovement.notes || '-'}</p></div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">Daftar Barang ({selectedMovement.items.length})</h3>
                                    <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
                                        <table className="w-full text-xs text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 bg-slate-50/50">
                                                    <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">Barang / SKU</th>
                                                    <th className="px-6 py-4 text-center font-black text-slate-400 uppercase tracking-widest w-24">Qty</th>
                                                    <th className="px-6 py-4 text-right font-black text-slate-400 uppercase tracking-widest w-32">Unit Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {selectedMovement.items.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900">{item.sku?.code}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.sku?.product?.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-black text-slate-900 tabular-nums">{item.qty} Items</td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600 tabular-nums">{fmt(item.unitCost)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Nilai</span>
                                            <span className="text-[9px] font-bold opacity-60 italic uppercase mt-0.5 tracking-tighter">Inventory Value Added</span>
                                        </div>
                                        <span className="font-black text-2xl text-emerald-400 tabular-nums tracking-tighter">{fmt(selectedMovement.items.reduce((s, i) => s + i.qty * i.unitCost, 0))}</span>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <Button onClick={() => setViewModalOpen(false)} className="flex-1 rounded-2xl h-14 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 border-b-4 border-black">Tutup</Button>
                                    {selectedMovement.status === 'DRAFT' && (
                                        <Button
                                            onClick={() => { handleConfirm(selectedMovement.id); setViewModalOpen(false); }}
                                            className="flex-2 rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 border-b-4 border-emerald-800"
                                        >
                                            Konfirmasi Stok Masuk
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
