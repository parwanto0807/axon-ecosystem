"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2, AlertCircle, RefreshCw,
    Receipt, DollarSign, Clock, Check, Ban,
    Briefcase, Users, MapPin, Eye, Search,
    X, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Expense {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED';
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
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
    purchaseOrder?: {
        number: string;
        vendor: { name: string };
        projectId?: string | null;
        workOrderId?: string | null;
    }
    project?: { 
        number: string; 
        name: string;
        customer?: { name: string };
    } | null;
}

const STATUS_CONFIG = {
    PENDING: { label: 'Waiting Approval', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    POSTED: { label: 'Posted to Ledger', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Briefcase },
    REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ApprovalsPage() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])
    const [selectedAccount, setSelectedAccount] = useState("")
    const [postingExpense, setPostingExpense] = useState<Expense | null>(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [expRes, coaRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coa`)
            ])

            if (expRes.ok) setExpenses(await expRes.json())

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
        } catch { showToast('error', 'Failed to load data') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { load() }, [load])

    const handlePost = async () => {
        if (!postingExpense) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${postingExpense.id}/post`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceAccountId: selectedAccount })
            })
            if (res.ok) {
                showToast('success', 'Expense successfully posted to Ledger')
                setPostingExpense(null)
                load()
            } else {
                showToast('error', 'Failed to post to Ledger')
            }
        } catch { showToast('error', 'Update failed') }
    }

    useEffect(() => { load() }, [load])

    const handleStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, approvedBy: 'Finance Dept' })
            })
            if (res.ok) {
                showToast('success', `Expense ${status.toLowerCase()}ed`)
                load()
            }
        } catch { showToast('error', 'Update failed') }
    }

    const filtered = expenses.filter(e => {
        const q = search.toLowerCase()
        const num = (e.workOrder?.number || e.survey?.number || e.purchaseOrder?.number || '').toLowerCase()
        const custName = (e.workOrder?.customer.name || e.survey?.customer.name || e.purchaseOrder?.vendor.name || '').toLowerCase()
        const desc = (e.description || '').toLowerCase()

        const projNum = (e.project?.number || e.workOrder?.project?.number || e.survey?.project?.number || '').toLowerCase()
        const projName = (e.project?.name || e.workOrder?.project?.name || e.survey?.project?.name || '').toLowerCase()

        const matchSearch = num.includes(q) || custName.includes(q) || desc.includes(q) || projNum.includes(q) || projName.includes(q)
        const matchStatus = filterStatus === 'ALL' || e.status === filterStatus
        return matchSearch && matchStatus
    })

    const totalPending = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0)
    const totalApproved = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0)
    const totalPosted = expenses.filter(e => e.status === 'POSTED').reduce((s, e) => s + e.amount, 0)

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 md:space-y-8 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
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
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-[rgb(43,4,136)]">Operational Approvals</h1>
                        <p className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Finance Review & Expense</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="outline" onClick={load} className="rounded-xl border-slate-200 text-slate-600 h-9 md:h-10 px-4 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={13} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> {isMobile ? '' : 'Reload'}
                    </Button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-amber-50 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-amber-100 shadow-sm flex md:flex-col justify-between items-center md:items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 md:block">
                        <div className="w-10 h-10 md:w-auto md:h-auto rounded-full bg-amber-100/50 md:bg-transparent flex items-center justify-center shrink-0 md:mb-2">
                            <Clock size={16} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-[10px] md:text-xs font-black text-amber-700 uppercase tracking-widest hidden md:block">Waiting Approval</h3>
                            <p className="text-[10px] md:text-[11px] font-medium text-amber-600/80 md:mb-6 leading-tight max-w-[140px] md:max-w-none">
                                {isMobile ? 'Waiting Approval' : 'Funds requested but not yet reviewed by Finance.'}
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10 text-right md:text-left">
                        <p className="text-xl md:text-3xl font-black text-amber-700">{fmt(totalPending)}</p>
                    </div>
                </div>

                <div className="bg-rose-50 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-rose-100 shadow-sm flex md:flex-col justify-between items-center md:items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 md:block">
                        <div className="w-10 h-10 md:w-auto md:h-auto rounded-full bg-rose-100/50 md:bg-transparent flex items-center justify-center shrink-0 md:mb-2">
                            <AlertCircle size={16} className="text-rose-600" />
                        </div>
                        <div>
                            <h3 className="text-[10px] md:text-xs font-black text-rose-700 uppercase tracking-widest hidden md:block">Saldo Terblokir (Approved)</h3>
                            <p className="text-[10px] md:text-[11px] font-medium text-rose-600/80 md:mb-6 leading-tight max-w-[140px] md:max-w-none">
                                {isMobile ? 'Approved (Unposted)' : 'Approved expenses. Funds reserved but not deducted.'}
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10 text-right md:text-left">
                        <p className="text-xl md:text-3xl font-black text-rose-700">{fmt(totalApproved)}</p>
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-indigo-100 shadow-sm flex md:flex-col justify-between items-center md:items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="flex items-center gap-3 md:block">
                        <div className="w-10 h-10 md:w-auto md:h-auto rounded-full bg-indigo-100/50 md:bg-transparent flex items-center justify-center shrink-0 md:mb-2">
                            <Briefcase size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-widest hidden md:block">Saldo Terdeduct (Posted)</h3>
                            <p className="text-[10px] md:text-[11px] font-medium text-indigo-600/80 md:mb-6 leading-tight max-w-[140px] md:max-w-none">
                                {isMobile ? 'Posted to Ledger' : 'Officially posted to Ledger and deducted from books.'}
                            </p>
                        </div>
                    </div>
                    <div className="relative z-10 text-right md:text-left">
                        <p className="text-xl md:text-3xl font-black text-indigo-700">{fmt(totalPosted)}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 pb-2 border-b border-slate-100">
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Survey#, Customer or description..."
                        className="pl-10 pr-4 py-3 md:py-2.5 text-sm border border-slate-200 rounded-xl bg-white w-full focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" />
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto hide-scrollbar">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 md:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${filterStatus === s ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 flex flex-col items-center">
                    <Receipt size={64} className="text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-sm">No operational requests found</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity / Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project / Location</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((e, idx) => {
                                    const sc = STATUS_CONFIG[e.status]
                                    const StatusIcon = sc.icon

                                    let refTypeLabel = 'General'
                                    let typeColor = 'text-slate-600 bg-slate-50 border-slate-200'
                                    
                                    if (e.workOrder) {
                                        refTypeLabel = 'WO'
                                        typeColor = 'text-amber-600 bg-amber-50 border-amber-100'
                                    } else if (e.purchaseOrder) {
                                        refTypeLabel = 'PO'
                                        typeColor = 'text-indigo-600 bg-indigo-50 border-indigo-100'
                                    } else if (e.survey) {
                                        refTypeLabel = 'Survey'
                                        typeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                    } else if (e.project) {
                                        refTypeLabel = 'Project'
                                        typeColor = 'text-blue-600 bg-blue-50 border-blue-200'
                                    }

                                    const refNum = e.workOrder?.number || e.purchaseOrder?.number || e.survey?.number || e.project?.number || '—'
                                    const refCust = e.workOrder?.customer.name || e.purchaseOrder?.vendor.name || e.survey?.customer.name || e.project?.customer?.name || 'Internal / Operational'
                                    const refLoc = e.workOrder?.location || e.survey?.location || 'Operational'
                                    const refProj = e.project || e.workOrder?.project || e.survey?.project

                                    return (
                                        <motion.tr
                                            key={e.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{new Date(e.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{new Date(e.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${typeColor}`}>
                                                        {refTypeLabel}
                                                    </span>
                                                    <span className="text-xs font-black text-slate-800 tracking-tight">{refNum}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="max-w-xs xl:max-w-sm">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{refCust}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium line-clamp-1 italic mt-0.5">{e.description || 'No description'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-normal break-words max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    {refProj ? (
                                                        <div className="flex items-start gap-1.5">
                                                            <Briefcase size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-relaxed">{refProj.number} - {refProj.name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-1.5 opacity-30">
                                                            <Briefcase size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No Project</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-start gap-1.5">
                                                        <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                        <span className="text-[10px] text-slate-500 font-medium leading-relaxed">{refLoc}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">{fmt(e.amount)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{e.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${sc.color}`}>
                                                    <StatusIcon size={12} /> {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {e.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleStatus(e.id, 'APPROVED')}
                                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                <Check size={14} className="mr-1.5" /> Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleStatus(e.id, 'REJECTED')}
                                                                className="h-8 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                <Ban size={14} className="mr-1.5" /> Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {e.status === 'APPROVED' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setPostingExpense(e)}
                                                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            <Briefcase size={14} className="mr-1.5" /> Post
                                                        </Button>
                                                    )}
                                                    {(e.status === 'POSTED' || e.status === 'REJECTED') && (
                                                        <div className="text-[9px] font-bold text-slate-400 italic">
                                                            Managed by: {e.approvedBy || 'System'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Showing {filtered.length} requests
                            </p>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                                <span className="uppercase text-[10px] text-slate-400 tracking-widest">Total Page Items:</span>
                                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                    {fmt(filtered.reduce((s, e) => s + e.amount, 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-4">
                        {filtered.map((e, idx) => {
                            const sc = STATUS_CONFIG[e.status]
                            const StatusIcon = sc.icon

                            let refTypeLabel = 'General'
                            let typeColor = 'text-slate-600 bg-slate-50 border-slate-200'
                            
                            if (e.workOrder) {
                                refTypeLabel = 'WO'
                                typeColor = 'text-amber-600 bg-amber-50 border-amber-100'
                            } else if (e.purchaseOrder) {
                                refTypeLabel = 'PO'
                                typeColor = 'text-indigo-600 bg-indigo-50 border-indigo-100'
                            } else if (e.survey) {
                                refTypeLabel = 'Survey'
                                typeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100'
                            } else if (e.project) {
                                refTypeLabel = 'Project'
                                typeColor = 'text-blue-600 bg-blue-50 border-blue-200'
                            }

                            const refNum = e.workOrder?.number || e.purchaseOrder?.number || e.survey?.number || e.project?.number || '—'
                            const refCust = e.workOrder?.customer.name || e.purchaseOrder?.vendor.name || e.survey?.customer.name || e.project?.customer?.name || 'Internal / Operational'
                            const refProg = e.project || e.workOrder?.project || e.survey?.project

                            return (
                                <motion.div
                                    key={e.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col gap-4"
                                >
                                    {/* Decor */}
                                    <div className="absolute top-0 right-0 p-6 opacity-10 blur-xl pointer-events-none -mr-4 -mt-4">
                                        <div className={`w-16 h-16 rounded-full ${sc.color.split(' ')[0]}`} />
                                    </div>

                                    <div className="flex justify-between items-start z-10">
                                        <div className="space-y-1">
                                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${typeColor}`}>
                                                {refTypeLabel} - {refNum}
                                            </span>
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight pr-4">{refCust}</h3>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-black text-slate-900 text-sm">{fmt(e.amount)}</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{e.category}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="z-10 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 mt-1">
                                         <p className="text-[11px] text-slate-600 font-medium italic line-clamp-2">{e.description || 'No description'}</p>
                                         {refProg && (
                                              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
                                                  <Briefcase size={10} className="text-indigo-400 mt-0.5 shrink-0" />
                                                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest leading-relaxed line-clamp-1">{refProg.number} - {refProg.name}</span>
                                              </div>
                                         )}
                                    </div>

                                    <div className="flex items-center justify-between pt-1 z-10">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${sc.color}`}>
                                                <StatusIcon size={12} /> {sc.label}
                                            </span>
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-right">
                                            {fmtDate(e.createdAt)}
                                        </div>
                                    </div>

                                    {/* Mobile Actions */}
                                    <div className="flex gap-2 z-10 pt-2 border-t border-slate-50">
                                        {e.status === 'PENDING' && (
                                            <>
                                                <Button size="sm" onClick={() => handleStatus(e.id, 'APPROVED')} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20">
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleStatus(e.id, 'REJECTED')} className="flex-1 rounded-xl border-slate-200 text-slate-600 h-10 text-[10px] font-black uppercase tracking-widest">
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                        {e.status === 'APPROVED' && (
                                            <Button size="sm" onClick={() => setPostingExpense(e)} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">
                                                Post to Ledger
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Confirmation Dialog for Posting */}
            <AnimatePresence>
                {postingExpense && (
                    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 text-slate-900">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPostingExpense(null)} />

                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }} 
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} 
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 w-full md:max-w-md shadow-2xl relative z-10 border border-slate-100 flex flex-col max-h-[90vh]">
                            
                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />

                            <button onClick={() => setPostingExpense(null)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all hidden md:block">
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                                    <Briefcase size={28} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900">Post to Ledger</h2>
                                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Finalize Expense</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6 overflow-y-auto pr-2">
                                <p className="text-xs md:text-sm border-l-4 border-amber-400 pl-4 py-3 bg-amber-50 rounded-r-xl text-amber-800 font-medium leading-relaxed">
                                    Are you sure you want to post this expense to the General Ledger?
                                    <br /><br />
                                    This action will create a journal entry (Debit: Expense, Credit: Selected Account) for <strong className="font-black">{fmt(postingExpense.amount)}</strong>. Once posted, the status cannot be reverted.
                                </p>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sumber Dana (Source Account)</label>
                                    <select
                                        value={selectedAccount}
                                        onChange={e => setSelectedAccount(e.target.value)}
                                        className="w-full px-4 py-3 md:py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                    >
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 shrink-0 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 mt-2">
                                <button onClick={() => setPostingExpense(null)}
                                    className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border border-slate-200 text-slate-600 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-slate-50 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handlePost}
                                    className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border-t border-b-4 border-l border-r border-t-indigo-500 border-l-indigo-600 border-r-indigo-600 border-b-indigo-800 bg-indigo-600 text-white text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:border-b-0 active:mt-1">
                                    <Briefcase size={16} /> Confirm Post
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
