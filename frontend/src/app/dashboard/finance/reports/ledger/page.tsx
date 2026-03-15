"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
    BookOpen, Search, Filter, Calendar,
    ArrowRight, Printer, Download, RefreshCw
} from "lucide-react"

interface LedgerItem {
    id: string
    debit: number
    credit: number
    description: string
    journalEntry: {
        id: string
        number: string
        date: string
        reference: string
    }
    coa: {
        code: string
        name: string
        normalBalance: 'DEBIT' | 'CREDIT'
        type: string
    }
}

interface COA {
    id: string
    code: string
    name: string
}

export default function LedgerPage() {
    const [items, setItems] = useState<LedgerItem[]>([])
    const [coaList, setCoaList] = useState<COA[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState(() => {
        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        const formatDate = (d: Date) => {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        return {
            coaId: '',
            startDate: formatDate(firstDay),
            endDate: formatDate(lastDay)
        }
    })

    const loadData = useCallback(async () => {
        if (!filters.startDate || !filters.endDate) {
            alert("Harap isi Dari Tanggal dan Sampai Tanggal");
            return;
        }
        setLoading(true)
        try {
            const query = new URLSearchParams(filters).toString()
            const [itemsRes, coaRes] = await Promise.all([
                fetch(`http://127.0.0.1:5000/api/reports/ledger?${query}&_t=${Date.now()}`),
                fetch('http://127.0.0.1:5000/api/coa')
            ])
            setItems(await itemsRes.json())
            const allCoa = await coaRes.json()
            setCoaList(allCoa.filter((a: any) => a.postingType === 'POSTING'))
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        loadData()
    }, [loadData])

    // First, explicitly sort items to guarantee chronological order before calculating balance
    const sortedItems = [...items].sort((a, b) => {
        // 1. Sort by Date
        const dateA = new Date(a.journalEntry.date).getTime();
        const dateB = new Date(b.journalEntry.date).getTime();
        if (dateA !== dateB) return dateA - dateB;

        // 2. Sort by Reference Number
        if (a.journalEntry.number !== b.journalEntry.number) {
            return a.journalEntry.number.localeCompare(b.journalEntry.number);
        }

        // 3. Sort by COA Code (this ensures 1-xxxx comes before 4-xxxx in the same transaction)
        return a.coa.code.localeCompare(b.coa.code);
    });

    // Calculate running balance per account (needs chronological order)
    const runningBalances: Record<string, number> = {}
    const itemsWithBalance = sortedItems.map((item) => {
        // Find the coaId, either directly from item if mapped or infer it from the relation
        const coaId = (item as any).coaId || item.coa?.code;
        if (coaId && runningBalances[coaId] === undefined) {
            runningBalances[coaId] = 0
        }
        if (coaId) {
            if (item.coa.normalBalance === 'DEBIT') {
                runningBalances[coaId] += (item.debit - item.credit)
            } else {
                runningBalances[coaId] += (item.credit - item.debit)
            }
        }
        return { ...item, balance: coaId ? runningBalances[coaId] : 0 }
    })

    // Reverse the array to show newest entries first
    const displayItems = [...itemsWithBalance].reverse();

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-4 md:space-y-6 font-inter max-w-full mx-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <BookOpen size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Buku Besar</h1>
                        <p className="text-[9px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-0.5 md:mt-1">General Ledger Detail</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none flex justify-center items-center h-11 md:h-auto md:p-2.5 text-slate-400 bg-slate-50 md:bg-transparent hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 md:border-transparent">
                        <Printer size={18} />
                    </button>
                    <button className="flex-auto md:flex-none flex items-center justify-center gap-2 px-4 h-11 md:h-auto md:py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 md:p-6 rounded-[2rem] md:rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account</label>
                    <select
                        value={filters.coaId}
                        onChange={e => setFilters({ ...filters, coaId: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    >
                        <option value="">Semua Akun</option>
                        {coaList.map(coa => (
                            <option key={coa.id} value={coa.id}>{coa.code} - {coa.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    />
                </div>
                <div className="flex items-end pb-1">
                    <button onClick={loadData} className="w-full h-[42px] bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                        Tampilkan
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Ref</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit</th>
                            {filters.coaId && (
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Balance
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                        {loading ? (
                            <tr><td colSpan={filters.coaId ? 5 : 4} className="py-20 text-center"><RefreshCw className="animate-spin text-slate-200 mx-auto" size={32} /></td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={filters.coaId ? 5 : 4} className="py-20 text-center text-slate-400 font-bold uppercase italic tracking-widest">Tidak ada record transaksi</td></tr>
                        ) : (
                            displayItems.map((item, idx) => {
                                const isNewEntry = idx === 0 || item.journalEntry.id !== displayItems[idx - 1].journalEntry.id;
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors group ${isNewEntry && idx !== 0 ? 'border-t-2 border-slate-100' : ''}`}>
                                        <td className="px-6 py-4 align-top">
                                            {isNewEntry && (
                                                <>
                                                    <div className="font-bold text-slate-900">{new Date(item.journalEntry.date).toLocaleDateString('id-ID')}</div>
                                                    <div className="text-[10px] font-black text-indigo-500 uppercase mt-0.5">{item.journalEntry.number}</div>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{item.description}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 italic">
                                                {item.coa.code} <ArrowRight size={10} /> {item.coa.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                                            {item.debit > 0 ? item.debit.toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-rose-600 font-bold">
                                            {item.credit > 0 ? item.credit.toLocaleString('id-ID') : '-'}
                                        </td>
                                        {filters.coaId && (
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-900 bg-slate-50/50">
                                                {item.balance.toLocaleString('id-ID')}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards rendering */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center opacity-50 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold text-sm">Tidak ada record transaksi</p>
                    </div>
                ) : (
                    displayItems.map((item, idx) => {
                        const isNewEntry = idx === 0 || item.journalEntry.id !== displayItems[idx - 1].journalEntry.id;
                        return (
                            <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                                {isNewEntry && (
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100/50 mb-1">
                                        <span className="font-bold text-slate-900 text-xs">{new Date(item.journalEntry.date).toLocaleDateString('id-ID')}</span>
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">{item.journalEntry.number}</span>
                                    </div>
                                )}

                                <div>
                                    <p className="font-bold text-slate-800 text-sm leading-snug">{item.description}</p>
                                    <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5 italic bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 w-fit line-clamp-1">
                                        <span className="font-mono">{item.coa.code}</span> <ArrowRight size={10} className="shrink-0" /> {item.coa.name}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-right">
                                        <p className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">Debit</p>
                                        <p className="font-mono font-bold text-emerald-700 text-sm">{item.debit > 0 ? item.debit.toLocaleString('id-ID') : '-'}</p>
                                    </div>
                                    <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-right">
                                        <p className="text-[9px] font-black text-rose-600/70 uppercase tracking-widest mb-0.5">Credit</p>
                                        <p className="font-mono font-bold text-rose-700 text-sm">{item.credit > 0 ? item.credit.toLocaleString('id-ID') : '-'}</p>
                                    </div>
                                </div>

                                {filters.coaId && (
                                    <div className="mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</span>
                                        <span className="font-mono font-black text-slate-900 text-base">{item.balance.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
