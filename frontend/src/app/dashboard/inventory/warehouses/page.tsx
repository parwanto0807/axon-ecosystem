"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Database, Plus, Edit, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, MapPin, Phone, User, Package
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse {
    id: string; code: string; name: string; location?: string; type: string;
    managedBy?: string; phone?: string; isActive: boolean;
    _count?: { stocks: number }; stocks?: { quantity: number; sku: { purchasePrice: number } }[]
    createdAt: string;
}

const TYPE_CFG: Record<string, string> = {
    MAIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    BRANCH: 'bg-violet-50 text-violet-700 border-violet-200',
    VIRTUAL: 'bg-slate-50 text-slate-600 border-slate-200'
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const defaultForm = { code: '', name: '', location: '', type: 'MAIN', managedBy: '', phone: '', isActive: true }

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Warehouse | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [form, setForm] = useState(defaultForm)
    const [saving, setSaving] = useState(false)

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`)
            setWarehouses(await res.json())
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true) }
    const openEdit = (w: Warehouse) => { setEditing(w); setForm({ code: w.code, name: w.name, location: w.location || '', type: w.type, managedBy: w.managedBy || '', phone: w.phone || '', isActive: w.isActive }); setModalOpen(true) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const url = editing ? `${process.env.NEXT_PUBLIC_API_URL}/api/warehouses/${editing.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`
            const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (res.ok) { setModalOpen(false); showToast('success', editing ? 'Gudang diperbarui' : 'Gudang dibuat'); load() }
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus gudang "${name}"?`)) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses/${id}`, { method: 'DELETE' })
        showToast('success', 'Gudang dihapus'); load()
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm text-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-5 md:space-y-6 font-inter w-full pb-24 md:pb-8">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
                        <Database size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Manajemen Gudang</h1>
                        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Kelola Lokasi Penyimpanan Stok</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-11 md:h-10 px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={13} className={`mr-1.5 md:mr-2 ${loading ? 'animate-spin' : ''}`} /> Reload
                    </Button>
                    <Button onClick={openCreate} className="flex-[2] md:flex-none rounded-xl bg-violet-600 hover:bg-violet-700 text-white h-11 md:h-10 px-4 md:px-5 text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-600/20">
                        <Plus size={14} className="mr-1.5 md:mr-2" /> Tambah Gudang
                    </Button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {warehouses.map((w, idx) => {
                        const totalValue = w.stocks?.reduce((s, ws) => s + ws.quantity * ws.sku.purchasePrice, 0) || 0
                        return (
                            <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                className={`bg-white rounded-2xl md:rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${!w.isActive ? 'opacity-60' : 'border-slate-100'}`}>
                                <div className="p-4 md:p-6 space-y-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] md:text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">{w.code}</p>
                                            <h3 className="font-black text-slate-900 text-[15px] md:text-lg leading-tight break-words whitespace-normal">{w.name}</h3>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${TYPE_CFG[w.type]}`}>{w.type}</span>
                                                {!w.isActive && <span className="inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-200">Nonaktif</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Nilai Aset</p>
                                            <p className="font-black text-emerald-700 text-sm md:text-base">{fmt(totalValue)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 py-4 border-y border-slate-50 flex-1">
                                        {w.location && <div className="flex items-start gap-2 text-[11px] md:text-[12px] text-slate-500"><MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /><span className="leading-snug">{w.location}</span></div>}
                                        {w.managedBy && <div className="flex items-center gap-2 text-[11px] md:text-[12px] text-slate-500"><User size={14} className="text-slate-400 shrink-0" /><span className="truncate">{w.managedBy}</span></div>}
                                        {w.phone && <div className="flex items-center gap-2 text-[11px] md:text-[12px] text-slate-500"><Phone size={14} className="text-slate-400 shrink-0" /><span className="truncate">{w.phone}</span></div>}
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Package size={13} className="text-indigo-400" /> {w._count?.stocks || 0} SKU
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => openEdit(w)} className="w-8 h-8 md:w-9 md:h-9 rounded-xl text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 flex items-center justify-center transition-colors"><Edit size={14} /></button>
                                            <button onClick={() => handleDelete(w.id, w.name)} className="w-8 h-8 md:w-9 md:h-9 rounded-xl text-rose-500 bg-rose-50/50 hover:bg-rose-100 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0" />
                        
                        <motion.div initial={{ y: '100%', scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: '100%', scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[1.5rem] sm:rounded-3xl shadow-2xl w-full max-w-lg mx-auto relative flex flex-col max-h-[90vh] sm:max-h-[85vh]">
                            
                            {/* Handle bar (mobile) */}
                            <div className="flex justify-center pt-3 pb-2 sm:hidden bg-white shrink-0 rounded-t-[1.5rem]">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                            </div>

                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-600/20"><Database size={16} className="text-white" /></div>
                                    <h2 className="font-extrabold text-slate-900 text-sm md:text-base uppercase tracking-wider">{editing ? 'Edit Gudang' : 'Tambah Gudang'}</h2>
                                </div>
                                <button type="button" onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
                            </div>
                            
                            <div className="overflow-y-auto w-full">
                                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-1"><label className={lc}>Kode <span className="text-rose-500">*</span></label><input required maxLength={10} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GDG-01" className={ic} /></div>
                                        <div className="md:col-span-1"><label className={lc}>Tipe</label>
                                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={ic}>
                                                <option value="MAIN">Main (Utama)</option>
                                                <option value="BRANCH">Branch (Cabang)</option>
                                                <option value="VIRTUAL">Virtual</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-2"><label className={lc}>Nama Gudang <span className="text-rose-500">*</span></label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gudang Utama Jakarta" className={ic} /></div>
                                        <div className="col-span-1 md:col-span-2"><label className={lc}>Lokasi / Alamat</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Jl. Contoh No. 1, Jakarta" className={ic} /></div>
                                        <div className="md:col-span-1"><label className={lc}>Penanggung Jawab</label><input value={form.managedBy} onChange={e => setForm({ ...form, managedBy: e.target.value })} placeholder="Nama PIC" className={ic} /></div>
                                        <div className="md:col-span-1"><label className={lc}>Telepon</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxx" className={ic} /></div>
                                        
                                        <div className="col-span-1 md:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                                            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500" />
                                            <label htmlFor="isActive" className="text-xs font-bold text-slate-700 tracking-wide uppercase cursor-pointer">Gudang Aktif</label>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0 safe-area-bottom">
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-[1] bg-white rounded-xl md:rounded-2xl h-12 md:h-14 font-black uppercase tracking-wider text-[10px] md:text-xs">Batal</Button>
                                    <Button onClick={handleSubmit} disabled={saving} className="flex-[2] rounded-xl md:rounded-2xl h-12 md:h-14 bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-wider text-[10px] md:text-xs shadow-lg shadow-violet-600/20 disabled:opacity-70 disabled:shadow-none">
                                        {saving ? 'Menyimpan...' : editing ? 'Update Gudang' : 'Buat Gudang'}
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
