"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardCheck, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
    Clock, MapPin, User, Calendar, FileText, Briefcase,
    Check, Ban, Printer, ArrowRight, ClipboardSignature,
    PenTool, Wrench, PackageCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import BASTPDFModal from "./BASTPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface BAST {
    id: string; number: string; date: string; status: string; type: string;
    customerId: string; customer: { name: string; code: string; address?: string };
    projectId?: string; project?: { number: string; name: string };
    salesOrderId?: string; salesOrder?: { number: string };
    workOrderId?: string; workOrder?: { number: string; title: string };
    notes?: string; receiverName?: string; technicianName?: string;
    technicianSignature?: string;
    items: BASTItem[];
    createdAt: string;
}

interface BASTItem {
    id?: string; no: number; description: string; qty: number; unit: string;
}

interface Ref { id: string; number: string; name?: string; customer?: { name: string } }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const BAST_TYPE: Record<string, { label: string; color: string; icon: any }> = {
    PROJECT_COMPLETION: { label: 'Penyelesaian Proyek', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: ClipboardCheck },
    UNIT_HANDOVER: { label: 'Serah Terima Unit', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PackageCheck },
    MAINTENANCE_VISIT: { label: 'Kunjungan Maintenance', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Wrench },
}

const BAST_STATUS: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    SIGNED: { label: 'Signed', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: PenTool },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through', icon: Ban },
}

// Fixed import paths if needed (relative to this file)
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BASTPage() {

    const [basts, setBasts] = useState<BAST[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [workOrders, setWorkOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([])

    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [saving, setSaving] = useState(false)
    const [viewModal, setViewModal] = useState<BAST | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const [form, setForm] = useState({
        customerId: '', projectId: '', salesOrderId: '', workOrderId: '',
        date: new Date().toISOString().split('T')[0],
        type: 'PROJECT_COMPLETION',
        status: 'DRAFT',
        notes: '', receiverName: '', technicianName: '',
        items: [] as BASTItem[]
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [bastRes, prjRes, soRes, woRes, custRes, coRes] = await Promise.all([
                fetch('http://localhost:5000/api/basts').then(r => r.json()),
                fetch('http://localhost:5000/api/projects').then(r => r.json()),
                fetch('http://localhost:5000/api/orders').then(r => r.json()),
                fetch('http://localhost:5000/api/work-orders').then(r => r.json()),
                fetch('http://localhost:5000/api/customers').then(r => r.json()),
                fetch('http://localhost:5000/api/company').then(r => r.json())
            ])
            setBasts(bastRes)
            setProjects(prjRes)
            setSalesOrders(soRes)
            setWorkOrders(woRes)
            setCustomers(custRes)
            setCompany(coRes)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const handleSave = async () => {
        if (!form.customerId || form.items.length === 0) return showToast('error', 'Customer dan Item wajib diisi')
        setSaving(true)
        try {
            const payload = {
                ...form,
                projectId: form.projectId || null,
                salesOrderId: form.salesOrderId || null,
                workOrderId: form.workOrderId || null,
            }
            const url = editMode ? `http://localhost:5000/api/basts/${selectedId}` : 'http://localhost:5000/api/basts'
            const method = editMode ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setModalOpen(false)
                showToast('success', editMode ? 'BAST diperbarui' : 'BAST berhasil dibuat')
                loadData()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menyimpan BAST')
            }
        } catch (e: any) {
            console.error(e)
            showToast('error', e.message || 'Terjadi kesalahan sistem')
        } finally { setSaving(false) }
    }

    const addItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { no: prev.items.length + 1, description: '', qty: 1, unit: 'pcs' }]
        }))
    }

    const removeItem = (idx: number) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }))
        }))
    }

    const updateItem = (idx: number, field: keyof BASTItem, val: any) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, [field]: val } : it)
        }))
    }

    const copyFromWorkOrder = (woId: string) => {
        const wo = (workOrders as any[]).find(w => w.id === woId);
        if (wo) {
            setForm(prev => ({
                ...prev,
                workOrderId: woId,
                customerId: wo.customerId || '',
                projectId: wo.projectId || '',
                salesOrderId: wo.salesOrderId || '',
                technicianName: wo.assignedTo || '',
                items: wo.items.map((it: any, i: number) => ({
                    no: i + 1,
                    description: it.description,
                    qty: it.qty,
                    unit: it.unit
                }))
            }))
        }
    }

    const copyFromSalesOrder = (soId: string) => {
        const so = (salesOrders as any[]).find(s => s.id === soId);
        if (so) {
            setForm(prev => ({
                ...prev,
                salesOrderId: soId,
                customerId: so.customerId || '',
                projectId: so.projectId || '',
                items: so.items.map((it: any, i: number) => ({
                    no: i + 1,
                    description: it.description,
                    qty: it.qty,
                    unit: it.unit
                }))
            }))
        }
    }

    const filtered = basts.filter(b =>
        b.number.toLowerCase().includes(search.toLowerCase()) ||
        b.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        b.project?.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                        <ClipboardCheck className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Berita Acara (BAST)</h1>
                        <p className="text-[10px] md:text-sm text-slate-400 font-medium mt-0.5 md:mt-1">Serah terima pekerjaan & handover proyek</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text" placeholder="Cari nomor BAST, Customer..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>
                    <Button onClick={() => { setEditMode(false); setForm({ ...form, items: [] }); setModalOpen(true) }}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 md:px-5 py-2.5 h-auto rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap text-sm">
                        <Plus size={16} /> Buat BAST
                    </Button>
                </div>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total BAST', val: basts.length, icon: FileText, color: 'bg-indigo-600' },
                    { label: 'Completed', val: basts.filter(b => b.status === 'COMPLETED').length, icon: CheckCircle2, color: 'bg-emerald-600' },
                    { label: 'Signed', val: basts.filter(b => b.status === 'SIGNED').length, icon: PenTool, color: 'bg-blue-600' },
                    { label: 'Unit Handover', val: basts.filter(b => b.type === 'UNIT_HANDOVER').length, icon: PackageCheck, color: 'bg-violet-600' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-100 shadow-sm">
                        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${s.color} flex items-center justify-center mb-2 md:mb-3`}><s.icon size={15} className="text-white" /></div>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900">{s.val}</p>
                    </motion.div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Info BAST</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Tipe</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Customer / Project</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Penerima</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((b) => (
                                <tr key={b.id} className="hover:bg-emerald-600/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="font-black text-sm text-emerald-600">{b.number}</p>
                                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1"><Calendar size={11} /> {fmtDate(b.date)}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${BAST_TYPE[b.type]?.color}`}>{BAST_TYPE[b.type]?.label || b.type}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-sm text-slate-800">{b.customer.name}</p>
                                        {b.project && <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1"><Briefcase size={11} /> {b.project.name}</p>}
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-xs uppercase tracking-tight">{b.receiverName || '—'}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Oleh: {b.technicianName || '—'}</p>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setViewModal(b)} title="Print BAST" className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all"><Printer size={15} /></button>
                                            <button onClick={() => { setSelectedId(b.id); setEditMode(true); setForm({ customerId: b.customerId, projectId: b.projectId || '', salesOrderId: b.salesOrderId || '', workOrderId: b.workOrderId || '', date: b.date.split('T')[0], type: b.type, status: b.status, notes: b.notes || '', receiverName: b.receiverName || '', technicianName: b.technicianName || '', items: b.items }); setModalOpen(true); }}
                                                className="w-8 h-8 rounded-xl hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all"><Edit size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-32 border border-slate-100" />)
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <ClipboardCheck size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada BAST</p>
                    </div>
                ) : filtered.map(b => (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <div className="flex items-start justify-between pl-2">
                            <div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">{b.number}</span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={10} />{fmtDate(b.date)}</span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black border ${BAST_TYPE[b.type]?.color}`}>{BAST_TYPE[b.type]?.label || b.type}</span>
                        </div>
                        <div className="pl-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                            <p className="text-[13px] font-black text-slate-900">{b.customer.name}</p>
                            {b.project && <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5"><Briefcase size={10} />{b.project.name}</p>}
                        </div>
                        <div className="pl-2">
                            <span className="text-[10px] text-slate-400">Penerima: <strong>{b.receiverName || '—'}</strong> · Teknisi: <strong>{b.technicianName || '—'}</strong></span>
                        </div>
                        <div className="pl-2 pt-2 border-t border-slate-50 flex items-center justify-end gap-2">
                            <button onClick={() => setViewModal(b)}
                                className="h-9 px-3 rounded-xl bg-slate-50 text-slate-600 flex items-center gap-1.5 border border-slate-200 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                <Printer size={13} /> Print
                            </button>
                            <button onClick={() => { setSelectedId(b.id); setEditMode(true); setForm({ customerId: b.customerId, projectId: b.projectId || '', salesOrderId: b.salesOrderId || '', workOrderId: b.workOrderId || '', date: b.date.split('T')[0], type: b.type, status: b.status, notes: b.notes || '', receiverName: b.receiverName || '', technicianName: b.technicianName || '', items: b.items }); setModalOpen(true); }}
                                className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 active:scale-95 transition-all">
                                <Edit size={15} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col border border-white/20"
                        >
                            <div className="p-8 border-b border-border/50 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                                        {editMode ? 'Edit BAST' : 'Buat BAST Baru'}
                                    </h2>
                                    <p className="text-sm font-medium text-muted-foreground">Lengkapi data serah terima pekerjaan di bawah ini</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-full h-10 w-10 hover:bg-white hover:shadow-md transition-all">
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Referen Sales Order (Copy Data)</label>
                                        <select
                                            value={form.salesOrderId}
                                            onChange={e => copyFromSalesOrder(e.target.value)}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            <option value="">Pilih Sales Order untuk Copy Data...</option>
                                            {salesOrders.map(so => (
                                                <option key={so.id} value={so.id}>{so.number} - {so.name || (so as any).subject}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Referen Work Order (Copy Data)</label>
                                        <select
                                            value={form.workOrderId}
                                            onChange={e => copyFromWorkOrder(e.target.value)}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            <option value="">Pilih Work Order untuk Copy Data...</option>
                                            {workOrders.filter(w => (w as any).status !== 'CLOSED').map(wo => (
                                                <option key={wo.id} value={wo.id}>{wo.number} - {wo.name || (wo as any).title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Tipe BAST</label>
                                        <select
                                            value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            {Object.entries(BAST_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Customer <span className="text-rose-500">*</span></label>
                                        <select
                                            value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            <option value="">Pilih Customer...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Project</label>
                                        <select
                                            value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            <option value="">Pilih Project...</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Tanggal</label>
                                        <input
                                            type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold tracking-tight focus:ring-2 focus:ring-emerald-600/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Status</label>
                                        <select
                                            value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20"
                                        >
                                            {Object.entries(BAST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                            <ClipboardCheck size={14} /> Deskripsi Pekerjaan / Handover
                                        </h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9 rounded-xl border-emerald-600/20 text-emerald-600 hover:bg-emerald-50">
                                            <Plus size={14} className="mr-1" /> Tambah Item
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.items.map((it, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                key={idx} className="flex gap-3 items-start relative group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-xs text-muted-foreground flex-shrink-0 mt-1">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        placeholder="Deskripsi Hasil Pekerjaan..."
                                                        value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                                                        className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number" placeholder="Qty"
                                                        value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                        className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner text-center"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        placeholder="Unit"
                                                        value={it.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                        className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner text-center"
                                                    />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl mt-1">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Names Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Teknisi / Penanggung Jawab</label>
                                        <input
                                            placeholder="Nama teknisi Axon..."
                                            value={form.technicianName} onChange={e => setForm({ ...form, technicianName: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Penerima (Customer Signature Name)</label>
                                        <input
                                            placeholder="Nama penerima/customer..."
                                            value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner"
                                        />
                                    </div>
                                    <div className="col-span-full space-y-2">
                                        <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Catatan Tambahan</label>
                                        <textarea
                                            placeholder="Catatan hasil serah terima..."
                                            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                            className="w-full h-32 rounded-2xl bg-slate-50 border-none font-bold text-sm p-4 focus:ring-2 focus:ring-emerald-600/20 shadow-inner resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-border/50 flex items-center justify-end gap-3 bg-slate-50/50">
                                <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-12 rounded-2xl px-6 font-bold hover:bg-white">Batal</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-12 rounded-2xl px-10 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black tracking-tighter uppercase disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Simpan BAST
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]"
                    >
                        <div className={`px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="font-bold text-sm uppercase tracking-tight">{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {viewModal && (
                    <BASTPDFModal bastData={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}


