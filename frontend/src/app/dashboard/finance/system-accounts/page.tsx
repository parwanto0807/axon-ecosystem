"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Settings, Plus, Search, Edit2, Trash2,
    RefreshCw, X, Check, AlertCircle, Info,
    ArrowRightLeft, Link as LinkIcon
} from "lucide-react"

interface COA {
    id: string
    code: string
    name: string
}

interface SystemAccount {
    id: string
    key: string
    description: string | null
    coaId: string
    coa: COA
}

export default function SystemAccountsPage() {
    const [accounts, setAccounts] = useState<SystemAccount[]>([])
    const [coaList, setCoaList] = useState<COA[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<SystemAccount | null>(null)
    const [form, setForm] = useState({
        key: '',
        coaId: '',
        description: ''
    })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [saRes, coaRes] = await Promise.all([
                fetch('http://localhost:5000/api/system-accounts'),
                fetch('http://localhost:5000/api/coa')
            ])
            setAccounts(await saRes.json())
            const allCoa = await coaRes.json()
            // Only allow POSTING accounts for mapping
            setCoaList(allCoa.filter((a: any) => a.postingType === 'POSTING'))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = accounts.filter(acc =>
        acc.key.toLowerCase().includes(search.toLowerCase()) ||
        acc.coa.name.toLowerCase().includes(search.toLowerCase()) ||
        acc.coa.code.includes(search)
    )

    const handleEdit = (acc: SystemAccount) => {
        setEditingAccount(acc)
        setForm({
            key: acc.key,
            coaId: acc.coaId,
            description: acc.description || ''
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const url = editingAccount
            ? `http://localhost:5000/api/system-accounts/${editingAccount.id}`
            : 'http://localhost:5000/api/system-accounts'
        const method = editingAccount ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                setIsModalOpen(false)
                load()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus mapping sistem ini? Tindakan ini dapat mengganggu proses otomatis.')) return
        try {
            const res = await fetch(`http://localhost:5000/api/system-accounts/${id}`, { method: 'DELETE' })
            if (res.ok) load()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 w-full font-inter max-w-7xl mx-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <Settings size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">System Accounts</h1>
                        <p className="text-[9px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Pemetaan Akun Otomatis Sistem</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={load} className="flex-1 md:flex-none flex justify-center items-center h-11 md:h-auto md:p-2.5 text-slate-400 bg-slate-50 md:bg-transparent hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100 md:border-transparent">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingAccount(null)
                            setForm({ key: '', coaId: '', description: '' })
                            setIsModalOpen(true)
                        }}
                        className="flex-auto md:flex-none flex items-center justify-center gap-2 px-4 h-11 md:h-auto md:py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={16} /> Tambah Mapping
                    </button>
                </div>
            </header>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Info className="text-amber-600" size={20} />
                </div>
                <div className="text-sm">
                    <p className="font-black text-amber-900 uppercase tracking-tight text-xs">Informasi Penting</p>
                    <p className="text-amber-700 font-medium leading-relaxed mt-1">
                        Halaman ini digunakan untuk menentukan akun mana yang akan digunakan secara otomatis oleh sistem saat melakukan transaksi seperti penjurnalan invoice, pengakuan utang supplier, atau mutasi stok. Mengubah mapping ini akan mempengaruhi transaksi masa depan.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kunci sistem atau nama akun..."
                        className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 w-full focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">System Key</th>
                            <th className="px-6 py-4 text-center text-slate-400"><ArrowRightLeft size={14} className="mx-auto" /></th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Ledger Account</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="animate-spin text-slate-300 mx-auto" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase italic letter spacing-widest">No mapping found</td></tr>
                        ) : (
                            filtered.map((acc) => (
                                <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-black text-indigo-600 tracking-tight uppercase">{acc.key}</td>
                                    <td className="px-6 py-4 text-center text-slate-300"><LinkIcon size={12} className="mx-auto" /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{acc.coa.code}</span>
                                            <span className="font-bold text-slate-700">{acc.coa.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-medium leading-relaxed max-w-md">{acc.description}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(acc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards rendering */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center opacity-50 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Settings size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold text-sm">No mapping found</p>
                    </div>
                ) : (
                    filtered.map((acc) => (
                        <div key={acc.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">System Key</span>
                                    <span className="font-black text-indigo-600 tracking-tight uppercase">{acc.key}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => handleEdit(acc)} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(acc.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <LinkIcon size={14} className="text-slate-400 shrink-0" />
                                <div className="flex-1 flex flex-col min-w-0">
                                    <span className="font-mono text-[9px] font-bold text-slate-500">{acc.coa.code}</span>
                                    <span className="font-bold text-slate-800 text-sm truncate">{acc.coa.name}</span>
                                </div>
                            </div>

                            {acc.description && (
                                <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                    {acc.description}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div 
                            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }} 
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} 
                            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative w-full bg-white shadow-2xl flex flex-col overflow-hidden
                                ${isMobile ? "rounded-t-[2rem] mt-auto max-h-[90vh]" : "max-w-xl rounded-[2.5rem]"}`}>

                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />}
                            
                            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Mapping Configuration</p>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{editingAccount ? 'Update Mapping' : 'New System Key'}</h2>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ${isMobile ? 'absolute top-4 right-4' : ''}`}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 md:space-y-6 overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="font-black text-slate-400 uppercase tracking-widest pl-1 text-[9px] md:text-[10px]">System Key</label>
                                    <input required disabled={!!editingAccount} value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} placeholder="e.g. ACCOUNTS_PAYABLE"
                                        className="w-full px-4 py-3 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-extrabold text-indigo-600 disabled:opacity-50 transition-all" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-black text-slate-400 uppercase tracking-widest pl-1 text-[9px] md:text-[10px]">Ledger Account (COA)</label>
                                    <select required value={form.coaId} onChange={e => setForm({ ...form, coaId: e.target.value })}
                                        className="w-full px-4 py-3 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all truncate pr-8">
                                        <option value="">Pilih Akun Ledger...</option>
                                        {coaList.map(coa => (
                                            <option key={coa.id} value={coa.id}>{coa.code} - {coa.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-black text-slate-400 uppercase tracking-widest pl-1 text-[9px] md:text-[10px]">Description & Usage</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                                        className="w-full px-4 py-3 text-sm md:text-base bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all resize-none" />
                                </div>

                                <div className="pt-4 flex flex-col md:flex-row items-center justify-end gap-3 pb-8 md:pb-0">
                                    {!isMobile && (
                                        <button type="button" onClick={() => setIsModalOpen(false)}
                                            className="w-full md:w-auto px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all text-center">
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit"
                                        className="w-full md:w-auto px-8 py-3.5 md:py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl md:rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                                        <Check size={16} /> Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
