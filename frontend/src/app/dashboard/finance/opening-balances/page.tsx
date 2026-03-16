"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutGrid, RefreshCw, Calendar,
    AlertCircle, CheckCircle2, Plus, Trash2, Edit2, X, Send
} from "lucide-react"

interface BalanceItem {
    id: string
    code: string
    name: string
    type: string
    debit: number
    credit: number
}

export default function OpeningBalancePage() {
    const [allAccounts, setAllAccounts] = useState<BalanceItem[]>([])
    const [draftEntries, setDraftEntries] = useState<BalanceItem[]>([])

    const [date, setDate] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })

    const [loading, setLoading] = useState(true)
    const [posting, setPosting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<BalanceItem | null>(null)
    const [modalForm, setModalForm] = useState({ accountId: '', debit: '', credit: '' })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/opening-balances')
            const data = await res.json()
            setAllAccounts(data.balances)
            // Initial draft entries are those with existing balances
            setDraftEntries(data.balances.filter((b: BalanceItem) => b.debit > 0 || b.credit > 0))
            if (data.date) setDate(data.date.split('T')[0])
        } catch (e) {
            console.error(e)
            setMessage({ type: 'error', text: 'Failed to load accounts' })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totalDebit = draftEntries.reduce((sum, b) => sum + b.debit, 0)
    const totalCredit = draftEntries.reduce((sum, b) => sum + b.credit, 0)
    const diff = totalDebit - totalCredit

    const handlePost = async () => {
        setPosting(true)
        setMessage(null)
        try {
            // Reconstruct the array that the backend expects (all accounts, but 0 for unlisted)
            const payloadBalances = allAccounts.map(acc => {
                const draft = draftEntries.find(d => d.id === acc.id)
                return draft ? { ...acc, debit: draft.debit, credit: draft.credit } : { ...acc, debit: 0, credit: 0 }
            })

            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/opening-balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, balances: payloadBalances })
            })
            if (res.ok) {
                setMessage({ type: 'success', text: 'Draft successfully posted as Opening Balances!' })
                loadData()
            } else {
                const err = await res.json()
                setMessage({ type: 'error', text: err.message || 'Failed to post' })
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Connection error' })
        } finally {
            setPosting(false)
        }
    }

    const openModal = (item?: BalanceItem) => {
        if (item) {
            setEditingItem(item)
            setModalForm({ accountId: item.id, debit: item.debit.toString(), credit: item.credit.toString() })
        } else {
            setEditingItem(null)
            // default to first available unselected account, or just empty
            setModalForm({ accountId: '', debit: '', credit: '' })
        }
        setIsModalOpen(true)
    }

    const saveModalEntry = () => {
        if (!modalForm.accountId) return

        const account = allAccounts.find(a => a.id === modalForm.accountId)
        if (!account) return

        const deb = parseFloat(modalForm.debit) || 0
        const cred = parseFloat(modalForm.credit) || 0

        if (deb === 0 && cred === 0) {
            // If they saved 0, remove it from draft
            setDraftEntries(prev => prev.filter(p => p.id !== account.id))
        } else {
            setDraftEntries(prev => {
                const exists = prev.find(p => p.id === account.id)
                if (exists) {
                    return prev.map(p => p.id === account.id ? { ...account, debit: deb, credit: cred } : p)
                } else {
                    return [...prev, { ...account, debit: deb, credit: cred }]
                }
            })
        }
        setIsModalOpen(false)
    }

    const removeEntry = (id: string) => {
        setDraftEntries(prev => prev.filter(p => p.id !== id))
    }

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 md:space-y-8 w-full font-inter max-w-7xl mx-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20 shrink-0">
                        <LayoutGrid size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Saldo Awal</h1>
                        <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5 md:mt-1">Opening Balance Draft Initialization</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-white px-3 md:px-4 py-2 w-full md:w-auto justify-between md:justify-start rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <Calendar size={16} className="text-indigo-500 shrink-0" />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="text-sm font-black text-slate-900 focus:outline-none bg-transparent w-full md:w-auto text-right md:text-left"
                        />
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                            }`}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">

                    {/* Draft Table Header Actions */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 md:px-6 md:py-4 rounded-[2rem] border border-slate-100 shadow-sm gap-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Draft Entries</h2>
                        <div className="flex flex-row w-full md:w-auto gap-2 md:gap-3">
                            <button
                                onClick={() => openModal()}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all h-11 md:h-9"
                            >
                                <Plus size={14} /> Add Entry
                            </button>
                            <button
                                onClick={handlePost}
                                disabled={posting || draftEntries.length === 0}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 h-11 md:h-9"
                            >
                                {posting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                Posting
                            </button>
                        </div>
                    </div>

                    {/* Draft Table */}
                    <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Debit</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Credit</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={4} className="py-20 text-center"><RefreshCw className="animate-spin text-slate-200 mx-auto" size={32} /></td></tr>
                                ) : draftEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <LayoutGrid size={48} className="text-slate-300 mb-4" />
                                                <p className="text-slate-500 font-bold">No draft entries yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Click "Add Entry" to build your opening balances.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : draftEntries.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-indigo-500 font-mono mb-0.5">{b.code}</span>
                                                <span className="font-black text-slate-900">{b.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className="font-mono font-bold text-slate-700">{b.debit ? b.debit.toLocaleString('id-ID') : '-'}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className="font-mono font-bold text-slate-700">{b.credit ? b.credit.toLocaleString('id-ID') : '-'}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal(b)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => removeEntry(b.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden flex flex-col gap-3 p-2 bg-slate-50/30">
                        {loading ? (
                            <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>
                        ) : draftEntries.length === 0 ? (
                            <div className="py-12 text-center opacity-50 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <LayoutGrid size={32} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-bold text-sm">No draft entries yet.</p>
                                <p className="text-[10px] text-slate-400 mt-1">Click "Add Entry" to start.</p>
                            </div>
                        ) : draftEntries.map((b) => (
                            <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-bold text-indigo-500 font-mono mb-0.5 block">{b.code}</span>
                                        <span className="font-black text-slate-900">{b.name}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => openModal(b)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => removeEntry(b.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl text-left border border-slate-100/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Debit</p>
                                        <p className="font-mono font-bold text-slate-700 text-sm tracking-tight">{b.debit ? b.debit.toLocaleString('id-ID') : '-'}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl text-right border border-slate-100/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Credit</p>
                                        <p className="font-mono font-bold text-slate-700 text-sm tracking-tight">{b.credit ? b.credit.toLocaleString('id-ID') : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-8">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                            Draft Summary
                        </h2>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debit</p>
                                    <p className="text-2xl font-black">{totalDebit.toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credit</p>
                                    <p className="text-2xl font-black">{totalCredit.toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            <div className={`p-6 rounded-3xl border ${Math.abs(diff) < 1 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Offset (Equity Adjustment)</p>
                                <div className="flex items-center justify-between">
                                    <p className={`text-xl font-black ${Math.abs(diff) < 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {Math.abs(diff).toLocaleString('id-ID')}
                                    </p>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg">
                                        {diff > 0 ? 'To Credit' : diff < 0 ? 'To Debit' : 'Balanced'}
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium mt-3 leading-relaxed">
                                    When you POST, this amount will be automatically injected into <span className="text-slate-300 font-bold">Equity Opening Balance</span> to ensure the ledger remains balanced.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-indigo-600/20 rounded-2xl border border-indigo-500/20">
                                <AlertCircle size={16} className="text-indigo-400 shrink-0" />
                                <p className="text-[10px] text-indigo-200 font-medium leading-normal">
                                    Posting this draft will overwrite any previous initialization data.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative bg-white w-full rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col 
                                ${isMobile ? "rounded-b-none mt-auto pb-8" : "max-w-md"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />}
                            <button onClick={() => setIsModalOpen(false)} className={`absolute ${isMobile ? 'top-4' : 'top-6'} right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors`}>
                                <X size={18} />
                            </button>

                            <h2 className="text-xl font-black text-slate-900 mb-6">{editingItem ? 'Edit Balance' : 'Add Balance Entry'}</h2>

                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account</label>
                                    <select
                                        value={modalForm.accountId}
                                        onChange={e => setModalForm(prev => ({ ...prev, accountId: e.target.value }))}
                                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                    >
                                        <option value="" disabled>Select an account...</option>
                                        {allAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Debit Balance</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">Rp</span>
                                            <input
                                                type="number"
                                                value={modalForm.debit}
                                                onChange={e => setModalForm(prev => ({ ...prev, debit: e.target.value, credit: e.target.value ? '' : prev.credit }))}
                                                placeholder="0"
                                                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-700 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credit Balance</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">Rp</span>
                                            <input
                                                type="number"
                                                value={modalForm.credit}
                                                onChange={e => setModalForm(prev => ({ ...prev, credit: e.target.value, debit: e.target.value ? '' : prev.debit }))}
                                                placeholder="0"
                                                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-700 text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 text-center font-medium empty:hidden">
                                    {modalForm.debit && modalForm.credit ? "Warning: Usually accounts have only Debit OR Credit, not both." : ""}
                                </p>
                            </div>

                            <button
                                onClick={saveModalEntry}
                                disabled={!modalForm.accountId || (!modalForm.debit && !modalForm.credit)}
                                className="w-full mt-8 py-3.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none"
                            >
                                {editingItem ? 'Update Draft Entry' : 'Add to Draft'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
