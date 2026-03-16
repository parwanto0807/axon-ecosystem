"use client"

import { useState, useEffect } from "react"
import {
    Wallet,
    Plus,
    Trash2,
    CheckCircle2,
    Clock,
    ArrowRight,
    Calendar,
    TrendingUp,
    AlertCircle,
    Info,
    Landmark,
    CreditCard,
    Zap,
    Droplets,
    Globe,
    Server,
    DollarSign,
    Search,
    X,
    Image
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const API_BASE = "${process.env.NEXT_PUBLIC_API_URL}/api"
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

const CATEGORIES = [
    { name: "Utilities", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
    { name: "Rent", icon: Landmark, color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Internet & Telecom", icon: Globe, color: "text-indigo-500", bg: "bg-indigo-50" },
    { name: "Server & Provider", icon: Server, color: "text-rose-500", bg: "bg-rose-50" },
    { name: "Others", icon: Info, color: "text-slate-500", bg: "bg-slate-50" }
]

export default function OperationalExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([])
    const [coaList, setCoaList] = useState<any[]>([])
    const [bankAccounts, setBankAccounts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showPayModal, setShowPayModal] = useState(false)
    const [selectedExpense, setSelectedExpense] = useState<any | null>(null)
    const [saving, setSaving] = useState(false)
    const [posting, setPosting] = useState(false)
    const [paying, setPaying] = useState(false)

    const [newExpense, setNewExpense] = useState({
        name: '',
        category: CATEGORIES[0].name,
        amount: 0,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        coaId: '',
        attachment: null as File | null
    })
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const [paymentData, setPaymentData] = useState({
        coaId: "",
        date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchExpenses()
        fetchCoa()
        fetchBankAccounts()
    }, [])

    const fetchExpenses = async () => {
        try {
            const res = await fetch(`${API_BASE}/finance/operational-expenses`)
            if (!res.ok) throw new Error("Failed to fetch expenses")
            const data = await res.json()
            setExpenses(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
            setExpenses([])
        } finally {
            setLoading(false)
        }
    }

    const fetchCoa = async () => {
        try {
            const res = await fetch(`${API_BASE}/coa`)
            if (!res.ok) throw new Error("Failed to fetch COA")
            const data = await res.json()
            // Filter only expense accounts (6-xxxx)
            if (Array.isArray(data)) {
                setCoaList(data.filter(acc => acc.code.startsWith('6-')))
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/accounts`)
            if (!res.ok) throw new Error("Failed to fetch bank accounts")
            const data = await res.json()
            if (Array.isArray(data)) {
                setBankAccounts(data)
                if (data.length > 0) setPaymentData(prev => ({ ...prev, coaId: data[0].id }))
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleSubmit = async () => {
        if (!newExpense.name || !newExpense.amount || !newExpense.coaId) {
            alert("Harap isi Nama, Amount, dan COA")
            return
        }
        setSaving(true)
        try {
            const formData = new FormData()
            formData.append('name', newExpense.name)
            formData.append('category', newExpense.category)
            formData.append('amount', String(newExpense.amount))
            formData.append('month', String(newExpense.month))
            formData.append('year', String(newExpense.year))
            formData.append('coaId', newExpense.coaId)
            if (newExpense.attachment) {
                formData.append('attachment', newExpense.attachment)
            }

            const res = await fetch(`${API_BASE}/finance/operational-expenses`, {
                method: 'POST',
                body: formData
            })
            if (res.ok) {
                setShowModal(false)
                setNewExpense({
                    name: '',
                    category: CATEGORIES[0].name,
                    amount: 0,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear(),
                    coaId: '',
                    attachment: null
                })
                fetchExpenses()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const handlePost = async (id: string) => {
        if (!confirm("Posting ke Ledger? Ini akan membuat Jurnal Akrual.")) return
        setPosting(true)
        try {
            const res = await fetch(`${API_BASE}/finance/operational-expenses/${id}/post`, {
                method: 'POST'
            })
            if (res.ok) {
                fetchExpenses()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setPosting(false)
        }
    }

    const handlePay = async () => {
        if (!paymentData.coaId || !selectedExpense) return
        setPaying(true)
        try {
            const res = await fetch(`${API_BASE}/finance/operational-expenses/${selectedExpense.id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            })
            if (res.ok) {
                fetchExpenses()
                setShowPayModal(false)
                setSelectedExpense(null)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setPaying(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus biaya ini?")) return
        try {
            await fetch(`${API_BASE}/finance/operational-expenses/${id}`, { method: 'DELETE' })
            fetchExpenses()
        } catch (e) {
            console.error(e)
        }
    }

    const getIcon = (category: string) => {
        const cat = CATEGORIES.find(c => c.name === category) || CATEGORIES[4]
        return <cat.icon className={cat.color} size={20} />
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-full bg-slate-50/50 min-h-screen pb-24 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Wallet className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">BIAYA OPERASIONAL</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest md:pl-[3.25rem]">Manajemen Pengeluaran Rutin & Utilitas</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={16} />
                        INPUT BIAYA BARU
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center justify-between md:items-start md:justify-start gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase md:hidden">Total Unpaid</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1">Total Unpaid</span>
                        <p className="text-lg md:text-xl font-black text-slate-800 text-right md:text-left">
                            Rp {Array.isArray(expenses) ? expenses.filter(e => e?.status !== 'PAID').reduce((sum, e) => sum + (e?.amount || 0), 0).toLocaleString() : '0'}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center justify-between md:items-start md:justify-start gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase md:hidden">Paid this month</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1">Paid this month</span>
                        <p className="text-lg md:text-xl font-black text-slate-800 text-right md:text-left">
                            Rp {Array.isArray(expenses) ? expenses.filter(e => e?.status === 'PAID').reduce((sum, e) => sum + (e?.amount || 0), 0).toLocaleString() : '0'}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center justify-between md:items-start md:justify-start gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase md:hidden">Pending Approval</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1">Pending Approval</span>
                        <p className="text-lg md:text-xl font-black text-slate-800 text-right md:text-left">
                            {Array.isArray(expenses) ? expenses.filter(e => e?.status === 'DRAFT').length : '0'} Items
                        </p>
                    </div>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Daftar Biaya Operasional</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Cari biaya..."
                            className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-bold w-64 focus:ring-2 ring-indigo-500/10 outline-none"
                        />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">Nama Biaya</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulan/Tahun</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-8 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-[10px] font-bold text-slate-400 uppercase">Memuat data biaya...</td></tr>
                            ) : !Array.isArray(expenses) || expenses.length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center text-[10px] font-bold text-slate-300 uppercase">Belum ada data biaya</td></tr>
                            ) : expenses.map((expense: any) => (
                                <tr key={expense.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="p-4 pl-8">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-800 uppercase">{expense.name}</span>
                                                {expense.attachment && (
                                                    <button
                                                        onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_API_URL}${expense.attachment}`)}
                                                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase flex items-center gap-1"
                                                    >
                                                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                        Lihat Bukti
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">COA: {expense.coa?.name} ({expense.coa?.code})</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getIcon(expense.category)}
                                            <span className="text-[10px] font-black text-slate-600 uppercase">{expense.category}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-[10px] font-black text-slate-600 uppercase italic">
                                            {MONTHS[expense.month - 1]} {expense.year}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-black text-slate-800">Rp {expense.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase ${expense.status === 'PAID' ? 'bg-indigo-50 text-indigo-600' :
                                            expense.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${expense.status === 'PAID' ? 'bg-indigo-500' :
                                                expense.status === 'POSTED' ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`} />
                                            {expense.status}
                                        </div>
                                    </td>
                                    <td className="p-4 pr-8 text-right space-x-2">
                                        {expense.status === 'DRAFT' && (
                                            <>
                                                <button
                                                    onClick={() => handlePost(expense.id)}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                    title="Post to Ledger"
                                                >
                                                    <CheckCircle2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                        {expense.status === 'POSTED' && (
                                            <button
                                                onClick={() => { setSelectedExpense(expense); setShowPayModal(true); }}
                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                                            >
                                                PELUNASAN
                                            </button>
                                        )}
                                        {expense.status === 'PAID' && (
                                            <span className="text-[9px] font-black text-slate-400 uppercase italic">Paid on {expense.paidAt ? new Date(expense.paidAt).toLocaleDateString() : '-'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                    {loading ? (
                        <div className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase">Memuat data biaya...</div>
                    ) : !Array.isArray(expenses) || expenses.length === 0 ? (
                        <div className="p-10 text-center text-[10px] font-bold text-slate-300 uppercase">Belum ada data biaya</div>
                    ) : expenses.map((expense: any) => (
                        <div key={expense.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex justify-between items-start z-10">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase leading-tight pr-4">{expense.name}</h3>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">COA: {expense.coa?.name}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-sm font-black text-slate-900">Rp {expense.amount.toLocaleString()}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 italic">{MONTHS[expense.month - 1]} {expense.year}</div>
                                </div>
                            </div>

                            <div className="z-10 bg-slate-50/80 p-3 rounded-xl border border-slate-100/50 flex items-center gap-2">
                                {getIcon(expense.category)}
                                <span className="text-[11px] font-bold text-slate-700 uppercase">{expense.category}</span>
                            </div>

                            <div className="flex flex-col gap-3 z-10">
                                <div className="flex items-center justify-between">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border ${expense.status === 'PAID' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                        expense.status === 'POSTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${expense.status === 'PAID' ? 'bg-indigo-500' :
                                            expense.status === 'POSTED' ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`} />
                                        {expense.status}
                                    </div>
                                    {expense.attachment && (
                                        <button onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_API_URL}${expense.attachment}`)} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1">
                                            <Image size={12} className="text-indigo-500" /> Lihat Bukti
                                        </button>
                                    )}
                                </div>

                                {/* Mobile Actions */}
                                {expense.status !== 'PAID' && (
                                    <div className="flex gap-2 pt-2 border-t border-slate-50">
                                        {expense.status === 'DRAFT' && (
                                            <>
                                                <button onClick={() => handlePost(expense.id)} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                                    Post Ledger
                                                </button>
                                                <button onClick={() => handleDelete(expense.id)} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                        {expense.status === 'POSTED' && (
                                            <button onClick={() => { setSelectedExpense(expense); setShowPayModal(true); }} className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                                Pelunasan
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 outline-none">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`bg-white w-full max-w-md max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2.5rem] mt-auto' : 'rounded-[2.5rem]'}`}>

                            {isMobile && <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />}

                            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Plus size={isMobile ? 20 : 24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">DATA BIAYA OPERASIONAL</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Biaya Rutin Bulanan</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Biaya</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Pembayaran Listrik PLN"
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={newExpense.name}
                                            onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kategori</label>
                                            <select
                                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                                value={newExpense.category}
                                                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                            >
                                                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Amount (Rp)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                                value={newExpense.amount}
                                                onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bulan</label>
                                            <select
                                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                                value={newExpense.month}
                                                onChange={e => setNewExpense({ ...newExpense, month: Number(e.target.value) })}
                                            >
                                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tahun</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                                value={newExpense.year}
                                                onChange={e => setNewExpense({ ...newExpense, year: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Akun Beban (COA)</label>
                                        <select
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={newExpense.coaId}
                                            onChange={e => setNewExpense({ ...newExpense, coaId: e.target.value })}
                                        >
                                            <option value="">Pilih Akun Beban...</option>
                                            {coaList.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bukti Pembayaran (Nota/Kwitansi)</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={e => {
                                                    const file = e.target.files?.[0]
                                                    if (file) setNewExpense({ ...newExpense, attachment: file })
                                                }}
                                            />
                                            <div className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                    <Image size={16} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest text-center">
                                                    {newExpense.attachment ? newExpense.attachment.name : 'Pilih File Gambar (webp, jpg, png)'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 md:py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">BATAL</button>
                                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3.5 md:py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50">
                                        {saving ? 'SAVING...' : 'SIMPAN BIAYA'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPayModal && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 outline-none">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPayModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className={`bg-white w-full max-w-sm max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2.5rem] mt-auto' : 'rounded-[2.5rem]'}`}>

                            {isMobile && <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />}

                            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Landmark size={isMobile ? 20 : 24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">PELUNASAN BIAYA</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Sumber Pembayaran</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Dibayar</p>
                                        <p className="text-lg font-black text-slate-800">Rp {selectedExpense?.amount.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sumber Rekening</label>
                                        <select
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={paymentData.coaId}
                                            onChange={e => setPaymentData({ ...paymentData, coaId: e.target.value })}
                                        >
                                            {Array.isArray(bankAccounts) && bankAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tanggal Bayar</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={paymentData.date}
                                            onChange={e => setPaymentData({ ...paymentData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button onClick={() => setShowPayModal(false)} className="flex-1 py-3.5 md:py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">BATAL</button>
                                    <button onClick={handlePay} disabled={paying} className="flex-1 py-3.5 md:py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
                                        {paying ? 'MEMPROSES...' : 'BAYAR SEKARANG'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Image Preview Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-[95vw] md:w-auto max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-white shadow-2xl">
                            <button onClick={() => setSelectedImage(null)} className="absolute top-4 md:top-6 right-4 md:right-6 w-10 md:w-12 h-10 md:h-12 rounded-2xl bg-slate-900/20 md:bg-white/20 hover:bg-slate-900/40 md:hover:bg-white/40 backdrop-blur-xl text-white flex items-center justify-center transition-all z-20">
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                            <img src={selectedImage} alt="Bukti Pembayaran" className="w-full h-full object-contain" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
