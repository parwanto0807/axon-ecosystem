"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Receipt, Plus, Trash2, X, CheckCircle2,
    AlertCircle, RefreshCw, Camera, DollarSign,
    User, Calendar, Tag, FileText, ImageIcon, Eye,
    Search, Briefcase, Clock, Ban, ShieldCheck, MapPin,
    ChevronRight, ChevronDown, CornerDownRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED';
    type: 'FUND_REQUEST' | 'SETTLEMENT';
    staffName: string | null;
    receiptImage: string | null;
    createdAt: string;
    purchaseOrderId: string | null;
    parentExpenseId?: string | null;
    parentExpense?: Expense | null;
    settlements?: Expense[];
    survey?: {
        number: string;
        location: string;
        customer: { name: string };
        project: { number: string; name: string } | null;
    }
    workOrder?: {
        number: string;
        location: string;
        customer: { name: string };
        project: { number: string; name: string } | null;
        salesOrder?: { number: string } | null;
    }
}

const TYPE_CFG = {
    FUND_REQUEST: { label: 'Kas Bon / Panjar', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: DollarSign },
    SETTLEMENT: { label: 'LPJ / Realisasi', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: CheckCircle2 }
}

const STATUS_CFG = {
    PENDING: { label: 'Waiting Approval', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    POSTED: { label: 'Posted to Ledger', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Briefcase },
    REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
}

const CATEGORIES = [
    "Beban Mobilisasi",
    "Bensin & Tol",
    "Parkir",
    "Makan & Akomodasi",
    "Alat Tulis & Kantor",
    "Material Kecil",
    "Lain-lain"
]

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ExpenseReportsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [saving, setSaving] = useState(false)
    const [previewImg, setPreviewImg] = useState<string | null>(null)
    const [postingExpense, setPostingExpense] = useState<Expense | null>(null)
    const [accounts, setAccounts] = useState<any[]>([])
    const [selectedAccount, setSelectedAccount] = useState("")
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])


    // Form State
    const [form, setForm] = useState({
        staffName: '',
        type: 'SETTLEMENT' as 'FUND_REQUEST' | 'SETTLEMENT',
        category: CATEGORIES[0],
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        parentExpenseId: ''
    })
    const [file, setFile] = useState<File | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const toggleRow = (id: string) => {
        const next = new Set(expandedRows)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedRows(next)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [expRes, coaRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coa`)
            ])

            if (expRes.ok) {
                const allExpenses: Expense[] = await expRes.json()
                setExpenses(allExpenses.filter(e => !e.purchaseOrderId))
            }

            if (coaRes.ok) {
                const allCoa = await coaRes.json()
                const cashAccounts = allCoa.filter((c: any) =>
                    c.type === 'ASET' &&
                    c.postingType === 'POSTING' &&
                    (c.name.toLowerCase().includes('kas') || c.name.toLowerCase().includes('bank'))
                )
                setAccounts(cashAccounts)
                if (cashAccounts.length > 0) setSelectedAccount(cashAccounts[0].id)
            }
        } catch { showToast('error', 'Gagal memuat data') }
        finally { setLoading(false) }
    }, [showToast])

    // Data Derivations
    const filteredExpenses = expenses.filter(e => {
        const matchesSearch =
            e.staffName?.toLowerCase().includes(search.toLowerCase()) ||
            e.description?.toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = filterStatus === "ALL" || e.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const rootExpenses = filteredExpenses.filter(e => !e.parentExpenseId)
    const settlements = expenses.filter(e => e.parentExpenseId)

    const visibleRoots = rootExpenses.filter(root => {
        if (search === "" && filterStatus === "ALL") return true
        const parentMatches = filteredExpenses.some(fe => fe.id === root.id)
        if (parentMatches) return true
        const childrenMatches = settlements.some(s => s.parentExpenseId === root.id && filteredExpenses.some(fe => fe.id === s.id))
        return childrenMatches
    })

    // Effects
    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (search || filterStatus !== "ALL") {
            const matchIds = new Set<string>()
            rootExpenses.forEach(root => {
                const hasMatchingChild = settlements.some(s =>
                    s.parentExpenseId === root.id &&
                    filteredExpenses.some(fe => fe.id === s.id)
                )
                if (hasMatchingChild) matchIds.add(root.id)
            })
            if (matchIds.size > 0) {
                setExpandedRows(prev => {
                    const next = new Set(prev)
                    matchIds.forEach(id => next.add(id))
                    return next
                })
            }
        }
    }, [search, filterStatus, rootExpenses, settlements, filteredExpenses])

    // Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.amount <= 0) return showToast('error', 'Nominal harus lebih dari 0')
        if (!form.staffName) return showToast('error', 'Nama staff wajib diisi')
        if (form.type === 'SETTLEMENT' && !file) return showToast('error', 'Bukti kwitansi wajib diunggah')

        setSaving(true)
        try {
            const formData = new FormData()
            formData.append('staffName', form.staffName)
            formData.append('type', form.type)
            formData.append('category', form.category)
            formData.append('amount', form.amount.toString())
            formData.append('description', form.description)
            formData.append('date', form.date)
            if (form.parentExpenseId) formData.append('parentExpenseId', form.parentExpenseId)
            if (file) formData.append('receipt', file)

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses`, {
                method: 'POST',
                body: formData
            })

            if (res.ok) {
                setModalOpen(false)
                setForm({ staffName: '', type: 'SETTLEMENT', category: CATEGORIES[0], amount: 0, description: '', date: new Date().toISOString().split('T')[0], parentExpenseId: '' })
                setFile(null)
                showToast('success', 'Laporan pertanggungjawaban berhasil dikirim')
                load()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menyimpan laporan')
            }
        } catch { showToast('error', 'Terjadi kesalahan koneksi') }
        finally { setSaving(false) }
    }

    const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, approvedBy: 'Finance Admin' })
            })
            if (res.ok) {
                showToast('success', `Berhasil ${status === 'APPROVED' ? 'menyetujui' : 'menolak'} laporan`)
                load()
            } else {
                showToast('error', 'Gagal update status')
            }
        } catch { showToast('error', 'Terjadi kesalahan koneksi') }
    }

    const handlePost = async () => {
        if (!postingExpense) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${postingExpense.id}/post`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceAccountId: selectedAccount })
            })
            if (res.ok) {
                showToast('success', 'Berhasil posting ke Ledger & Update Uang Muka')
                setPostingExpense(null)
                load()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal posting')
            }
        } catch { showToast('error', 'Terjadi kesalahan koneksi') }
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
    const lc = "text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block"

    return (
        <div className="p-4 md:px-4 md:py-8 space-y-6 md:space-y-8 font-inter w-full min-h-screen bg-slate-50/30 pb-24 md:pb-8">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed top-8 right-8 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-rose-500" />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-600/20 ring-4 ring-emerald-50 shrink-0">
                            <Receipt size={20} className="text-white md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Accountability Reports</h1>
                            <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase md:tracking-[0.2em] flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-0 leading-tight">
                                <ShieldCheck size={12} className="text-emerald-500 shrink-0" /> Expense & Settlement Management
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button onClick={() => setModalOpen(true)} className="flex-1 md:flex-none rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Plus size={16} className="mr-2 stroke-[3]" /> Request <span className="hidden md:inline">/ Settle Expense</span>
                    </Button>
                    <Button variant="outline" onClick={load} className="rounded-2xl border-slate-200 bg-white text-slate-600 h-12 w-12 p-0 shadow-sm hover:bg-slate-50 transition-all shrink-0">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by staff, category or description..."
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 h-12 text-sm font-medium focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                </div>
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-2 overflow-x-auto hide-scrollbar w-full">
                    {["ALL", "PENDING", "APPROVED", "POSTED"].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2.5 md:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${filterStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/30">
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Requested Date</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Staff / Type</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Category / Project</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Amount</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {visibleRoots.map(e => {
                                const rootChildren = settlements.filter(s => s.parentExpenseId === e.id && (search === "" || filteredExpenses.some(fe => fe.id === s.id)));
                                const isExpanded = expandedRows.has(e.id);
                                const hasChildren = rootChildren.length > 0;

                                return (
                                    <React.Fragment key={e.id}>
                                        <motion.tr layout className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    {hasChildren ? (
                                                        <button onClick={() => toggleRow(e.id)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400">
                                                            {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                                                        </button>
                                                    ) : <div className="w-6" />}
                                                    <div>
                                                        <div className="font-bold text-slate-900">{fmtDate(e.createdAt)}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium font-mono uppercase mt-1">ID: {e.id.slice(-8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-white group-hover:shadow-md transition-all">
                                                        {e.staffName?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{e.staffName || 'Anonymous Staff'}</div>
                                                        <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${TYPE_CFG[e.type]?.color}`}>
                                                            {TYPE_CFG[e.type]?.label}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                    <Tag size={12} className="text-slate-400" /> {e.category}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-medium italic">
                                                    <MapPin size={10} /> {e.description || 'No description provided'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                <div className="font-black text-slate-900 text-base">{fmt(e.amount)}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${STATUS_CFG[e.status]?.color}`}>
                                                        {(() => { const C = STATUS_CFG[e.status]?.icon; return C ? <C size={12} strokeWidth={3} /> : null })()}
                                                        {STATUS_CFG[e.status]?.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                                    {e.receiptImage && (
                                                        <Button size="icon" variant="outline" onClick={() => setPreviewImg(`${process.env.NEXT_PUBLIC_API_URL}${e.receiptImage}`)} className="w-8 h-8 rounded-lg border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
                                                            <ImageIcon size={14} />
                                                        </Button>
                                                    )}
                                                    {e.status === 'PENDING' && (
                                                        <>
                                                            <Button size="sm" onClick={() => handleStatusUpdate(e.id, 'APPROVED')}
                                                                className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-4 shadow-lg shadow-emerald-600/10">
                                                                Approve
                                                            </Button>
                                                            <Button size="icon" variant="outline" onClick={() => handleStatusUpdate(e.id, 'REJECTED')}
                                                                className="w-8 h-8 rounded-lg border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all">
                                                                <X size={14} strokeWidth={3} />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {e.status === 'APPROVED' && (
                                                        <Button size="sm" onClick={() => setPostingExpense(e)}
                                                            className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-4 shadow-lg shadow-slate-900/10">
                                                            Post
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                        <AnimatePresence>
                                            {isExpanded && rootChildren.map(c => (
                                                <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} key={c.id} className="bg-slate-50/30 border-l-4 border-emerald-500/20 group/child">
                                                    <td className="px-6 py-4 pl-14">
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <CornerDownRight size={14} />
                                                            <div>
                                                                <div className="font-bold text-slate-600 text-xs">{fmtDate(c.createdAt)}</div>
                                                                <div className="text-[9px] font-mono text-slate-400">ID: {c.id.slice(-6)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${TYPE_CFG[c.type]?.color}`}>
                                                            {TYPE_CFG[c.type]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs">
                                                            <Tag size={10} className="text-slate-400" /> {c.category}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-medium italic">
                                                            {c.description || 'Settlement detail'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-bold text-slate-700">{fmt(c.amount)}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center">
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${STATUS_CFG[c.status]?.color}`}>
                                                                {STATUS_CFG[c.status]?.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {c.receiptImage && (
                                                                <Button size="icon" variant="outline" onClick={() => setPreviewImg(`${process.env.NEXT_PUBLIC_API_URL}${c.receiptImage}`)} className="w-7 h-7 rounded-md border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200">
                                                                    <ImageIcon size={12} />
                                                                </Button>
                                                            )}
                                                            {c.status === 'PENDING' && (
                                                                <>
                                                                    <Button size="sm" onClick={() => handleStatusUpdate(c.id, 'APPROVED')}
                                                                        className="h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase px-3">
                                                                        Approve
                                                                    </Button>
                                                                    <Button size="icon" variant="outline" onClick={() => handleStatusUpdate(c.id, 'REJECTED')}
                                                                        className="w-7 h-7 rounded-md border-slate-200 text-rose-500 hover:bg-rose-50 transition-all">
                                                                        <X size={12} strokeWidth={3} />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {c.status === 'APPROVED' && (
                                                                <Button size="sm" onClick={() => setPostingExpense(c)}
                                                                    className="h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold uppercase px-3">
                                                                    Post
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-4">
                {visibleRoots.map(e => {
                    const rootChildren = settlements.filter(s => s.parentExpenseId === e.id && (search === "" || filteredExpenses.some(fe => fe.id === s.id)));
                    const isExpanded = expandedRows.has(e.id);
                    const hasChildren = rootChildren.length > 0;
                    const StatusIcon = STATUS_CFG[e.status]?.icon || Clock;

                    return (
                        <div key={e.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col gap-4">
                            <div className="flex justify-between items-start z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${TYPE_CFG[e.type]?.color}`}>
                                            {TYPE_CFG[e.type]?.label}
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-mono uppercase">ID: {e.id.slice(-6)}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{e.staffName || 'Anonymous Staff'}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-black text-slate-900 text-sm">{fmt(e.amount)}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fmtDate(e.createdAt)}</div>
                                </div>
                            </div>

                            <div className="z-10 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                    <Tag size={12} className="text-slate-400" /> {e.category}
                                </div>
                                <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium italic">
                                    <MapPin size={10} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{e.description || 'No description provided'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between z-10">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_CFG[e.status]?.color}`}>
                                    <StatusIcon size={12} strokeWidth={3} /> {STATUS_CFG[e.status]?.label}
                                </span>
                                <div className="flex items-center gap-2">
                                    {e.receiptImage && (
                                        <Button size="icon" variant="outline" onClick={() => setPreviewImg(`${process.env.NEXT_PUBLIC_API_URL}${e.receiptImage}`)} className="w-8 h-8 rounded-lg border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
                                            <ImageIcon size={14} />
                                        </Button>
                                    )}
                                    {hasChildren && (
                                        <Button size="sm" variant="ghost" onClick={() => toggleRow(e.id)} className="h-8 px-2 text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                                            {isExpanded ? 'Hide LPJ' : 'View LPJ'} {isExpanded ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Actions */}
                            <div className="flex gap-2 z-10 pt-2 border-t border-slate-50 mt-1">
                                {e.status === 'PENDING' && (
                                    <>
                                        <Button size="sm" onClick={() => handleStatusUpdate(e.id, 'APPROVED')} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20">
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(e.id, 'REJECTED')} className="flex-1 rounded-xl border-slate-200 text-slate-600 h-10 text-[10px] font-black uppercase tracking-widest">
                                            Reject
                                        </Button>
                                    </>
                                )}
                                {e.status === 'APPROVED' && (
                                    <Button size="sm" onClick={() => setPostingExpense(e)} className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                        Post
                                    </Button>
                                )}
                            </div>

                            <AnimatePresence>
                                {isExpanded && rootChildren.length > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 mt-2 pt-3 border-t-2 border-dashed border-slate-100 overflow-hidden">
                                        {rootChildren.map(c => {
                                            const CStatusIcon = STATUS_CFG[c.status]?.icon || Clock;
                                            return (
                                                <div key={c.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <CornerDownRight size={12} className="text-slate-400" />
                                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${TYPE_CFG[c.type]?.color}`}>
                                                                    {TYPE_CFG[c.type]?.label}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] mt-1">
                                                                <Tag size={10} className="text-slate-400" /> {c.category}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="font-bold text-slate-700 text-sm">{fmt(c.amount)}</div>
                                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fmtDate(c.createdAt)}</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] text-slate-500 font-medium italic line-clamp-2">
                                                        {c.description || 'Settlement detail'}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border ${STATUS_CFG[c.status]?.color}`}>
                                                            {STATUS_CFG[c.status]?.label}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            {c.receiptImage && (
                                                                <Button size="icon" variant="outline" onClick={() => setPreviewImg(`${process.env.NEXT_PUBLIC_API_URL}${c.receiptImage}`)} className="w-7 h-7 rounded-md border-slate-200 text-slate-500">
                                                                    <ImageIcon size={12} />
                                                                </Button>
                                                            )}
                                                            {c.status === 'PENDING' && (
                                                                <>
                                                                    <Button size="sm" onClick={() => handleStatusUpdate(c.id, 'APPROVED')} className="h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase px-3 shadow-sm">
                                                                        Approve
                                                                    </Button>
                                                                    <Button size="icon" variant="outline" onClick={() => handleStatusUpdate(c.id, 'REJECTED')} className="w-7 h-7 rounded-md border-rose-200 text-rose-500 hover:bg-rose-50">
                                                                        <X size={12} strokeWidth={3} />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {c.status === 'APPROVED' && (
                                                                <Button size="sm" onClick={() => setPostingExpense(c)} className="h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold uppercase px-3">
                                                                    Post
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {filteredExpenses.length === 0 && (
                <div className="py-32 text-center bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 scale-110">
                        <Receipt size={32} className="text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">No Reports Found</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto mt-2 italic">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
            )}

            {/* Request Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-start justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden md:overflow-y-auto md:pt-12">
                        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl md:my-4 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />

                            <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-600/20"><Receipt size={isMobile ? 20 : 24} className="text-white" /></div>
                                    <div>
                                        <h2 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tight">Create Report</h2>
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense & Settlement Submission</p>
                                    </div>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"><X size={20} className="md:w-6 md:h-6" /></button>
                            </div>

                            <div className="overflow-y-auto p-6 md:p-10 custom-scrollbar">
                                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className={lc}>Report Type</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {(['SETTLEMENT', 'FUND_REQUEST'] as const).map(t => (
                                                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                                                        className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border-2 transition-all font-black text-xs uppercase tracking-widest ${form.type === t ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-inner' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                                        {(() => { const I = TYPE_CFG[t].icon; return <I size={20} /> })()}
                                                        {TYPE_CFG[t].label}
                                                        {form.type === t && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {form.type === 'SETTLEMENT' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden">
                                                <label className={lc}>Source Kas Bon (Posted Fund Request)</label>
                                                <select
                                                    value={form.parentExpenseId}
                                                    onChange={e => setForm({ ...form, parentExpenseId: e.target.value })}
                                                    className={ic}
                                                >
                                                    <option value="">-- Choose Source Kas Bon --</option>
                                                    {expenses
                                                        .filter(ex => ex.type === 'FUND_REQUEST' && ex.status === 'POSTED')
                                                        .map(ex => (
                                                            <option key={ex.id} value={ex.id}>
                                                                {fmtDate(ex.createdAt)} - {ex.staffName} ({fmt(ex.amount)})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <p className="text-[9px] text-emerald-600 font-bold italic">* Settlement must be linked to a posted Fund Request</p>
                                            </motion.div>
                                        )}

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className={lc}>Staff Name</label>
                                                <input required value={form.staffName} onChange={e => setForm({ ...form, staffName: e.target.value })} placeholder="e.g. Budi (Driver)" className={ic} />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className={lc}>Transaction Date</label>
                                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ic} />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className={lc}>Category</label>
                                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={ic}>
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className={lc}>Nominal (IDR)</label>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600/50">RP</div>
                                                    <input type="number" required min="1" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className={`${ic} pl-10 font-black text-emerald-700 text-base`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={lc}>Evidence / Receipt {form.type === 'SETTLEMENT' && <span className="text-rose-500 ml-1 italic font-black">*Required</span>}</label>
                                            <div className="relative h-32 group">
                                                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                <div className={`w-full h-full border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 group-hover:border-emerald-300 group-hover:bg-slate-50'}`}>
                                                    {file ? (
                                                        <>
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={24} className="text-emerald-600" /></div>
                                                            <span className="text-xs font-black text-emerald-900 truncate max-w-[240px] px-4">{file.name}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera size={28} className="text-slate-300 group-hover:scale-110 transition-transform" />
                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Click or Drag Receipt</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={lc}>Description</label>
                                            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide some detail for this expense..." className={`${ic} resize-none py-3`} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 h-14 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] border-slate-200 text-slate-400">Cancel</Button>
                                        <Button type="submit" disabled={saving} className="flex-1 h-14 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all">
                                            {saving ? 'Processing...' : 'Submit Report'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Posting Modal */}
            <AnimatePresence>
                {postingExpense && (
                    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }} animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />

                            <div className="p-6 md:p-10 text-center space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] md:rounded-[2.5rem] bg-slate-900 flex items-center justify-center mx-auto shadow-2xl shadow-slate-900/20 ring-4 md:ring-8 ring-slate-50">
                                    <Briefcase size={isMobile ? 24 : 32} className="text-white" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="font-black text-slate-900 text-2xl uppercase tracking-tight">Post to General Ledger</h2>
                                    <p className="text-xs text-slate-400 font-medium px-4">
                                        {postingExpense.type === 'SETTLEMENT'
                                            ? `Confirming settlement for ${postingExpense.staffName}. This will reduce the Staff Advance account.`
                                            : "Please select the source account for this cash advance request."
                                        }
                                    </p>
                                </div>

                                {postingExpense.type === 'FUND_REQUEST' && (
                                    <div className="text-left px-2">
                                        <label className={lc}>Source Bank Account</label>
                                        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className={ic}>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                        <span className="font-black text-slate-900 text-xl">{fmt(postingExpense.amount)}</span>
                                    </div>
                                    <div className="h-px bg-slate-200" />
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</span>
                                        <span className="font-bold text-slate-700 text-sm">{postingExpense.staffName}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setPostingExpense(null)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200">Cancel</Button>
                                    <Button onClick={handlePost} className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20">
                                        Confirm Posting
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Preview */}
            <AnimatePresence>
                {previewImg && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-xl" onClick={() => setPreviewImg(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative max-w-5xl max-h-full">
                            <button onClick={() => setPreviewImg(null)} className="absolute -top-12 md:-top-16 right-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/10 rounded-full border border-white/10"><X size={24} className="md:w-7 md:h-7" /></button>
                            <img src={previewImg} alt="Receipt Preview" className="rounded-2xl md:rounded-[3rem] shadow-2xl max-w-full max-h-[80vh] object-contain border-4 md:border-8 border-white/10 ring-1 ring-white/20" />
                            <div className="mt-6 text-center">
                                <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Evidence of Expenditure</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
