"use client"

import { useState, useEffect, useCallback } from "react"
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

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-500 border-slate-200', icon: Ban }
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
                fetch('http://localhost:5000/api/stock-movements?type=OUT'),
                fetch('http://localhost:5000/api/warehouses'),
                fetch('http://localhost:5000/api/inventory/stock'),
                fetch('http://localhost:5000/api/work-orders')
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
    const hasOverIssue = items.some(i => i.qty > i.availableQty && i.availableQty > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const res = await fetch('http://localhost:5000/api/stock-movements', {
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
        const res = await fetch(`http://localhost:5000/api/stock-movements/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmedBy: 'Admin' }) })
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

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all text-sm"
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
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
                        <PackageMinus size={24} className="text-white md:w-6 md:h-6 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Stok Keluar</h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 md:mt-1.5 flex items-center gap-2">
                            Logistik & Pengeluaran Barang
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-1 md:mt-0">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 h-11 px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm transition-all">
                        <RefreshCw size={13} className={`mr-1.5 md:mr-2 ${loading ? 'animate-spin' : ''}`} /> Reload
                    </Button>
                    <Button onClick={() => setModalOpen(true)} className="flex-[2] md:flex-none rounded-xl bg-rose-600 hover:bg-rose-700 text-white h-11 px-6 text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all active:scale-95">
                        <Plus size={16} className="mr-1.5 md:mr-2" /> Pengeluaran Baru
                    </Button>
                </div>
            </header>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Pengeluaran', value: movements.length, icon: PackageMinus, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Pending (Draft)', value: pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Confirmed', value: confirmedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Total Nilai (Keluar)', value: fmt(totalOutValue), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((s, i) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white p-4 md:p-5 rounded-[1.25rem] md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                            <s.icon size={18} className="md:w-5 md:h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 md:mb-1.5">{s.label}</p>
                            <p className="text-base md:text-lg font-black text-slate-900 leading-tight">{s.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-[1.25rem] md:rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:flex-1 md:max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari Nomor, Proyek..."
                        className="w-full pl-11 pr-4 py-2.5 text-[11px] md:text-sm bg-slate-50/50 border border-slate-100 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar w-full md:w-auto">
                    <div className="bg-slate-100 p-1 md:p-1.5 rounded-xl md:rounded-2xl flex gap-1 min-w-max">
                        {['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === s ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {s === 'ALL' ? 'Semua' : STATUS_CFG[s]?.label || s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Pengeluaran</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konteks Proyek / WO</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang & Items</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Nilai</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-8 py-8"><div className="h-10 bg-slate-100 rounded-2xl w-full"></div></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <PackageMinus size={64} className="text-slate-100 mx-auto mb-4" />
                                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Data tidak ditemukan</p>
                                </td>
                            </tr>
                        ) : filtered.map(m => {
                            const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                            const st = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                            const StatusIcon = st.icon
                            return (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1.5">{m.number}</span>
                                            <span className="text-sm font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors">
                                                {fmtDate(m.date)}
                                            </span>
                                            {m.referenceNumber && (
                                                <span className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1 uppercase tracking-tighter">
                                                    REF: {m.referenceNumber}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {m.workOrder ? (
                                            <div className="flex flex-col max-w-[220px]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Wrench size={10} className="text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.workOrder.number}</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-1">{m.workOrder.title}</span>
                                                {m.workOrder.project && (
                                                    <span className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-tighter flex items-center gap-1">
                                                        <Search size={8} /> {m.workOrder.project.name}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest leading-none">Manual Issue</span>
                                                {m.notes && (
                                                    <span className="text-[10px] font-medium text-slate-500 mt-1.5 line-clamp-2 leading-tight" title={m.notes}>
                                                        {m.notes}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <MapPin size={10} className="text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.warehouse?.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{m.items.length} unique items</span>
                                            <div className="flex flex-col gap-0.5 mt-2">
                                                {m.items.slice(0, 2).map((it, idx) => (
                                                    <span key={idx} className="text-[9px] font-bold text-slate-400 truncate max-w-[160px] leading-tight uppercase tracking-tighter" title={it.sku?.product?.name}>
                                                        {it.sku?.product?.name}
                                                    </span>
                                                ))}
                                                {m.items.length > 2 && <span className="text-[8px] font-black text-slate-300">+{m.items.length - 2} OTHERS</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Subtotal</p>
                                        <p className="text-sm font-black text-rose-700">{fmt(totalVal)}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex justify-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${st.color}`}>
                                                <StatusIcon size={10} /> {st.label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {m.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleConfirm(m.id)}
                                                    className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-100 transition-all active:scale-95"
                                                    title="Konfirmasi Pengeluaran"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            <button className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center shadow-sm border border-slate-200 transition-all">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-36 border border-slate-100"></div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <PackageMinus size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data tidak ditemukan</p>
                    </div>
                ) : filtered.map(m => {
                    const totalVal = m.items.reduce((s, i) => s + i.qty * i.unitCost, 0)
                    const st = STATUS_CFG[m.status] || STATUS_CFG.DRAFT
                    const StatusIcon = st.icon
                    return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />

                            <div className="flex items-start justify-between gap-3 pl-2">
                                <div>
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1 block">{m.number}</span>
                                    <span className="text-[15px] font-extrabold text-slate-900">{fmtDate(m.date)}</span>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${st.color}`}>
                                    <StatusIcon size={12} /> {st.label}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ml-2">
                                {m.workOrder ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Wrench size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.workOrder.number}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 leading-tight">{m.workOrder.title}</span>
                                        {m.workOrder.project && (
                                            <span className="text-[9px] font-black text-indigo-600 mt-2 uppercase tracking-tight flex items-center gap-1.5 bg-indigo-50/50 w-fit px-2 py-1 rounded-md border border-indigo-100/50">
                                                <Search size={10} /> {m.workOrder.project.name}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest leading-none">Manual Issue</span>
                                        {m.notes && <span className="text-[11px] font-medium text-slate-600 mt-1.5 line-clamp-2 leading-snug">{m.notes}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 ml-2 mt-1">
                                <div className="flex items-start justify-between pb-3 border-b border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gudang Asal</span>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={12} className="text-slate-500" />
                                            <span className="text-[11px] font-black text-slate-700">{m.warehouse?.name}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1">{m.items.length} item unik</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Subtotal</p>
                                        <p className="text-sm font-black text-rose-700">{fmt(totalVal)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {m.status === 'DRAFT' && (
                                        <button onClick={() => handleConfirm(m.id)} className="flex-1 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-100 text-[10px] font-black uppercase tracking-widest gap-2 transition-all active:scale-95">
                                            <Check size={14} /> Konfirmasi
                                        </button>
                                    )}
                                    <button className="flex-1 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center shadow-sm border border-slate-200 text-[10px] font-black uppercase tracking-widest gap-2 transition-all active:scale-95">
                                        <Eye size={14} /> Detail
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0" />

                        <motion.div initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl mx-auto relative flex flex-col max-h-[95vh] md:max-h-[85vh] border border-white/20">

                            {/* Handle bar (mobile) */}
                            <div className="flex justify-center pt-3 pb-2 md:hidden bg-slate-50/50 shrink-0 rounded-t-[1.5rem]">
                                <div className="w-12 h-1.5 bg-slate-300/50 rounded-full" />
                            </div>

                            <div className="flex items-center justify-between px-6 md:px-10 py-5 md:py-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/20"><PackageMinus size={18} className="text-white md:w-5 md:h-5" /></div>
                                    <div>
                                        <h2 className="font-black text-slate-900 text-base md:text-lg uppercase tracking-tight leading-none">Buat Pengeluaran</h2>
                                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 md:mt-1.5">Isi detail barang yang keluar</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 md:w-10 md:h-10 rounded-full md:rounded-2xl bg-white md:bg-transparent hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center shadow-sm md:shadow-none"><X size={18} className="md:w-6 md:h-6" /></button>
                            </div>

                            <div className="overflow-y-auto w-full flex-1">
                                <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className={lc}>Work Order <span className="text-slate-300 font-medium">(Opsional)</span></label>
                                                <select value={form.workOrderId} onChange={e => setForm({ ...form, workOrderId: e.target.value })} className={ic}>
                                                    <option value="">-- Manual / Tanpa WO --</option>
                                                    {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.number} - {wo.title}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={lc}>Gudang Sumber <span className="text-rose-500">*</span></label>
                                                <select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className={ic}>
                                                    <option value="">-- Pilih Gudang --</option>
                                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className={lc}>Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ic} /></div>
                                                <div><label className={lc}>No. Referensi</label><input value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} placeholder="SO-2024-001" className={ic} /></div>
                                            </div>
                                            <div><label className={lc}>Catatan</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Tambahkan informasi tambahan jika diperlukan..." className={`${ic} py-3 resize-none`} /></div>
                                        </div>
                                    </div>

                                    {hasOverIssue && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-[1.5rem] px-6 py-4 shadow-sm shadow-amber-200/20">
                                            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                                            <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Peringatan: Beberapa item melebihi stok yang tersedia di gudang terpilih.</p>
                                        </motion.div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-3">
                                                <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                                                Daftar Barang Keluar
                                            </h3>
                                            <button type="button" onClick={addItem} className="text-[10px] font-black uppercase tracking-widest text-white bg-rose-500 hover:bg-rose-600 px-5 py-2.5 rounded-2xl shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-2">
                                                <Plus size={14} /> Tambah Barang
                                            </button>
                                        </div>

                                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="col-span-5">Barang / SKU</div>
                                            <div className="col-span-2 text-center">Jumlah (Qty)</div>
                                            <div className="col-span-3">Unit Cost (HPP)</div>
                                            <div className="col-span-2 text-right">Subtotal</div>
                                        </div>

                                        <div className="space-y-4 md:space-y-3 border-t border-slate-100 md:border-none pt-4 md:pt-0">
                                            {items.length === 0 ? (
                                                <div className="text-center py-10 md:py-16 bg-slate-50/50 rounded-3xl md:rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                                                    <PackageMinus size={40} className="text-slate-200 mb-3 md:mb-4 md:w-12 md:h-12" />
                                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Belum ada barang dipilih</p>
                                                </div>
                                            ) : (
                                                items.map((item, idx) => {
                                                    const isOver = item.qty > item.availableQty && item.availableQty > 0
                                                    return (
                                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={idx} className={`flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 p-4 rounded-2xl border items-start md:items-center transition-all ${isOver ? 'bg-rose-50/30 border-rose-200 shadow-rose-500/5' : 'bg-white border-slate-100 md:hover:border-slate-200 shadow-sm'}`}>
                                                            <div className="w-full md:col-span-5">
                                                                <select value={item.skuId} onChange={e => updateItem(idx, 'skuId', e.target.value)} className="w-full bg-slate-50 border border-slate-100 md:border-none rounded-xl px-4 py-3 md:py-2.5 text-xs outline-none font-bold text-slate-700">
                                                                    <option value="">-- Pilih SKU --</option>
                                                                    {skus.map(s => {
                                                                        const avail = form.warehouseId ? s.warehouseStocks.find(ws => ws.warehouse?.id === form.warehouseId)?.quantity || 0 : s.totalQty
                                                                        return <option key={s.id} value={s.id}>{s.code} - {s.product.name} (Stok: {avail})</option>
                                                                    })}
                                                                </select>
                                                            </div>
                                                            <div className="w-full md:col-span-2 relative">
                                                                <div className="flex md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Jumlah (Qty)</div>
                                                                <input type="number" min="0.01" step="any" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} className={`w-full md:text-center bg-slate-50 border border-slate-100 md:border-none rounded-xl px-4 py-3 md:py-2.5 text-xs font-black outline-none ${isOver ? 'text-rose-600 border-rose-200 ring-2 ring-rose-500/20' : 'text-slate-700'}`} />
                                                                {item.availableQty > 0 && <p className="text-[9px] md:text-center font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">AVL: {item.availableQty}</p>}
                                                            </div>
                                                            <div className="w-full md:col-span-3 relative">
                                                                <div className="flex md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unit Cost (HPP)</div>
                                                                <span className="absolute left-4 top-[35px] md:top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 hidden md:block">Rp</span>
                                                                <span className="absolute left-4 top-[32px] md:hidden text-[10px] font-black text-slate-400">Rp</span>
                                                                <input type="number" min="0" placeholder="0" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', +e.target.value)} className="w-full bg-slate-50 border border-slate-100 md:border-none rounded-xl pl-10 pr-4 py-3 md:py-2.5 text-xs font-black text-slate-700 outline-none" />
                                                            </div>
                                                            <div className="w-full md:col-span-2 flex items-center justify-between mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none">
                                                                <div className="flex flex-col md:hidden">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Subtotal</span>
                                                                    <span className="text-sm font-black text-rose-700">{fmt(item.qty * item.unitCost)}</span>
                                                                </div>
                                                                <span className="hidden md:block text-xs font-black text-rose-700">{fmt(item.qty * item.unitCost).replace('Rp ', '')}</span>
                                                                <button type="button" onClick={() => removeItem(idx)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-lg md:rounded-xl transition-all border border-slate-100 md:border-none"><Trash2 size={16} className="md:w-4 md:h-4 w-5 h-5" /></button>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })
                                            )}
                                        </div>

                                    </div>
                                </form>
                            </div>

                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0 safe-area-bottom">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex flex-col md:w-auto">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Total Estimasi Nilai Keluar</span>
                                        <div className="flex justify-between items-center md:hidden">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimasi</span>
                                            <span className="text-lg font-black text-rose-700 leading-none">{fmt(totalValue)}</span>
                                        </div>
                                        <span className="text-2xl font-black text-rose-700 leading-none mt-1 hidden md:block">{fmt(totalValue)}</span>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-[1] md:flex-none bg-white rounded-xl md:rounded-2xl h-12 md:h-14 md:px-8 font-black uppercase tracking-[0.2em] text-[10px] border-slate-200 hover:bg-slate-50 transition-all">Batal</Button>
                                        <Button onClick={handleSubmit} disabled={saving || items.length === 0} className="flex-[2] md:flex-none rounded-xl md:rounded-2xl h-12 md:h-14 md:px-10 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-70 disabled:shadow-none">
                                            {saving ? 'Menyimpan...' : 'Simpan Draft'}
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
