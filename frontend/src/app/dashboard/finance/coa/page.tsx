"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TableProperties, Plus, Search, Filter,
    ChevronRight, ChevronDown, Edit2, Trash2,
    RefreshCw, Download, FileText, LayoutList,
    X, Check, AlertCircle
} from "lucide-react"

interface Account {
    id: string
    code: string
    name: string
    description: string | null
    type: string
    normalBalance: string
    postingType: string
    cashflowType: string
    isReconcilable: boolean
    status: string
    parentId: string | null
    parent?: { id: string, code: string, name: string }
    _count?: { children: number }
}

const TYPE_COLORS: Record<string, string> = {
    'ASET': 'bg-blue-50 text-blue-600 border-blue-200',
    'LIABILITAS': 'bg-orange-50 text-orange-600 border-orange-200',
    'EKUITAS': 'bg-purple-50 text-purple-600 border-purple-200',
    'PENDAPATAN': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'HPP': 'bg-amber-50 text-amber-600 border-amber-200',
    'BEBAN': 'bg-rose-50 text-rose-600 border-rose-200',
}

export default function COAPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState("ALL")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        type: 'ASET',
        normalBalance: 'DEBIT',
        postingType: 'POSTING',
        cashflowType: 'NONE',
        isReconcilable: false,
        status: 'ACTIVE',
        parentId: ''
    })

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/coa')
            const data = await res.json()
            setAccounts(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = accounts.filter(acc => {
        const matchesSearch = acc.code.includes(search) || acc.name.toLowerCase().includes(search.toLowerCase())
        const matchesType = typeFilter === "ALL" || acc.type === typeFilter
        return matchesSearch && matchesType
    })

    const getIndent = (code: string) => {
        const parts = code.split('-')
        if (parts.length < 2) return 0
        const num = parts[1]
        if (num.endsWith('0000')) return 0
        if (num.endsWith('000')) return 1
        if (num.endsWith('00')) return 2
        return 3
    }

    const handleEdit = (acc: Account) => {
        setEditingAccount(acc)
        setForm({
            code: acc.code,
            name: acc.name,
            description: acc.description || '',
            type: acc.type,
            normalBalance: acc.normalBalance,
            postingType: acc.postingType,
            cashflowType: acc.cashflowType,
            isReconcilable: acc.isReconcilable,
            status: acc.status,
            parentId: acc.parentId || ''
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin ingin menghapus akun ini?')) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coa/${id}`, { method: 'DELETE' })
            if (res.ok) load()
            else {
                const err = await res.json()
                alert(err.message)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const url = editingAccount
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/coa/${editingAccount.id}`
            : '${process.env.NEXT_PUBLIC_API_URL}/api/coa'
        const method = editingAccount ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    parentId: form.parentId === '' ? null : form.parentId
                })
            })
            if (res.ok) {
                setIsModalOpen(false)
                setEditingAccount(null)
                load()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-4 md:space-y-6 w-full font-inter overflow-hidden pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <TableProperties size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Chart of Accounts</h1>
                        <p className="text-[10px] md:text-sm font-semibold text-slate-400 md:font-medium uppercase md:normal-case tracking-widest md:tracking-normal mt-0.5 md:mt-1">Daftar Akun & Struktur Ledger</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={load} className="flex-none p-3 lg:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 md:border-transparent bg-white md:bg-transparent">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingAccount(null)
                            setForm({
                                code: '', name: '', description: '', type: 'ASET',
                                normalBalance: 'DEBIT', postingType: 'POSTING', cashflowType: 'NONE',
                                isReconcilable: false, status: 'ACTIVE', parentId: ''
                            })
                            setIsModalOpen(true)
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 bg-indigo-600 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl md:rounded-[1.25rem] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={16} /> Tambah Akun
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 flex-1 w-full md:min-w-[300px]">
                    <div className="relative flex-1 w-full">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari kode atau nama akun..."
                            className="pl-9 pr-4 py-2.5 md:py-3 text-xs md:text-sm border border-slate-200 rounded-[1rem] md:rounded-xl bg-slate-50/50 w-full focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 md:py-3 text-xs md:text-sm border border-slate-200 rounded-[1rem] md:rounded-xl bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-600 w-full sm:w-auto"
                    >
                        <option value="ALL">Semua Tipe</option>
                        <option value="ASET">Aset</option>
                        <option value="LIABILITAS">Liabilitas</option>
                        <option value="EKUITAS">Ekuitas</option>
                        <option value="PENDAPATAN">Pendapatan</option>
                        <option value="HPP">HPP</option>
                        <option value="BEBAN">Beban</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto hidden md:flex">
                    <button className="flex-1 md:flex-none p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 flex justify-center items-center">
                        <Download size={16} />
                    </button>
                    <button className="flex-1 md:flex-none p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 flex justify-center items-center">
                        <FileText size={16} />
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] no-scrollbar">
                    <table className="w-full text-sm border-collapse sticky-header">
                        <thead className="sticky top-0 z-10">
                            <tr className="border-b border-slate-100 bg-slate-50/90 backdrop-blur-md">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Kode Akun</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Akun</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Posting</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20 mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12 mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <LayoutList size={48} className="text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ada data akun</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((acc) => {
                                    const indent = getIndent(acc.code)
                                    const isHeader = acc.postingType === 'HEADER'

                                    return (
                                        <tr key={acc.id} className={`${isHeader ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'} transition-colors group`}>
                                            <td className="px-6 py-4">
                                                <span className={`font-mono text-xs font-black ${isHeader ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                    {acc.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2" style={{ marginLeft: `${indent * 20}px` }}>
                                                    {isHeader ? (
                                                        <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center">
                                                            <ChevronRight size={12} className="text-indigo-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5" />
                                                    )}
                                                    <div>
                                                        <p className={`text-sm ${isHeader ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                            {acc.name}
                                                        </p>
                                                        {acc.description && !isHeader && (
                                                            <p className="text-[10px] text-slate-400 line-clamp-1">{acc.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${TYPE_COLORS[acc.type] || 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                    {acc.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${acc.postingType === 'HEADER' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                    {acc.postingType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-[10px] font-black text-slate-500">
                                                {acc.normalBalance}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(acc)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Edit Account"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(acc.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete Account"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="py-20 text-center"><RefreshCw className="animate-spin text-slate-300 mx-auto" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                        <LayoutList size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada data akun</p>
                    </div>
                ) : (
                    filtered.map((acc) => {
                        const indent = getIndent(acc.code)
                        const isHeader = acc.postingType === 'HEADER'
                        return (
                            <div key={acc.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-3" style={{ marginLeft: `${indent * 12}px` }}>
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1 pr-3">
                                        <span className={`font-mono text-[9px] font-black uppercase tracking-widest ${isHeader ? 'text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit' : 'text-slate-400'}`}>{acc.code}</span>
                                        <span className={`text-sm leading-tight ${isHeader ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>{acc.name}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border shrink-0 ${TYPE_COLORS[acc.type] || 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {acc.type}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className={`uppercase tracking-widest ${acc.postingType === 'HEADER' ? 'text-indigo-600' : 'text-slate-400'}`}>{acc.postingType}</span>
                                    <span className="text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{acc.normalBalance}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100 justify-end">
                                    <button onClick={() => handleEdit(acc)} className="p-2 text-slate-400 bg-slate-50 rounded-xl hover:text-indigo-600 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(acc.id)} className="p-2 text-slate-400 bg-slate-50 rounded-xl hover:text-rose-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Account Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className={`fixed inset-0 z-[500] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'}`}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }} animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isMobile ? 'rounded-t-[2rem]' : 'rounded-[2.5rem]'}`}>

                            {isMobile && (
                                <div className="w-full flex justify-center pt-4 pb-2 shrink-0 bg-white">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                                </div>
                            )}

                            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Account Management</p>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{editingAccount ? 'Edit Account' : 'New Account'}</h2>
                                </div>
                                {!isMobile && (
                                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X size={20} /></button>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Nomor Akun (Code)</label>
                                        <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1-10001"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Nama Akun</label>
                                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kas Bank"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-black text-slate-400 uppercase tracking-widest pl-1 text-[10px]">Deskripsi</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all resize-none text-sm md:text-xs" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Tipe Akun</label>
                                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs">
                                            <option value="ASET">ASET</option>
                                            <option value="LIABILITAS">LIABILITAS</option>
                                            <option value="EKUITAS">EKUITAS</option>
                                            <option value="PENDAPATAN">PENDAPATAN</option>
                                            <option value="HPP">HPP</option>
                                            <option value="BEBAN">BEBAN</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Normal Balance</label>
                                        <select value={form.normalBalance} onChange={e => setForm({ ...form, normalBalance: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs">
                                            <option value="DEBIT">DEBIT</option>
                                            <option value="CREDIT">CREDIT</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Posting Type</label>
                                        <select value={form.postingType} onChange={e => setForm({ ...form, postingType: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs">
                                            <option value="HEADER">HEADER</option>
                                            <option value="POSTING">POSTING</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-black text-slate-400 uppercase tracking-widest pl-1">Cashflow Type</label>
                                        <select value={form.cashflowType} onChange={e => setForm({ ...form, cashflowType: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs">
                                            <option value="NONE">NONE</option>
                                            <option value="OPERATING">OPERATING</option>
                                            <option value="INVESTING">INVESTING</option>
                                            <option value="FINANCING">FINANCING</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-black text-slate-400 uppercase tracking-widest pl-1 text-[10px]">Induk Akun (Parent)</label>
                                    <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm md:text-xs">
                                        <option value="">(Tanpa Induk)</option>
                                        {accounts.filter(a => a.postingType === 'HEADER').map(h => (
                                            <option key={h.id} value={h.id}>{h.code} - {h.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative shrink-0">
                                            <input type="checkbox" checked={form.isReconcilable} onChange={e => setForm({ ...form, isReconcilable: e.target.checked })} className="sr-only" />
                                            <div className={`w-12 h-6 rounded-full transition-all ${form.isReconcilable ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${form.isReconcilable ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-700">Reconcilable</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative shrink-0">
                                            <input type="checkbox" checked={form.status === 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })} className="sr-only" />
                                            <div className={`w-12 h-6 rounded-full transition-all ${form.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${form.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-700">Active</span>
                                    </label>
                                </div>

                                {isMobile && (
                                    <div className="pt-2 flex gap-3 pb-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all border border-slate-100 rounded-[1.25rem] bg-white"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-[1.25rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                                        >
                                            <Check size={16} /> Simpan
                                        </button>
                                    </div>
                                )}
                            </form>

                            {!isMobile && (
                                <div className="p-8 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                                    <button onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleSubmit}
                                        className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                                        <Check size={16} /> {editingAccount ? 'Save Changes' : 'Create Account'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .sticky-header thead th {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
