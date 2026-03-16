"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
    Activity, Printer, Download, Search,
    RefreshCw, Calendar, ArrowUpRight, ArrowDownRight
} from "lucide-react"

interface TrialBalanceItem {
    id: string
    code: string
    name: string
    type: string
    normalBalance: string
    debit: number
    credit: number
    balance: number
}

export default function TrialBalancePage() {
    const [report, setReport] = useState<TrialBalanceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/trial-balance?date=${date}`)
            setReport(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [date])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totals = report.reduce((acc, item) => ({
        debit: acc.debit + item.debit,
        credit: acc.credit + item.credit
    }), { debit: 0, credit: 0 })

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-4 md:space-y-6 w-full font-inter max-w-7xl mx-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between font-inter gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <Activity size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Neraca Saldo</h1>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5 md:mt-1">Trial Balance Summary</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none flex justify-center items-center h-11 md:h-auto md:p-2.5 text-slate-400 bg-slate-50 md:bg-transparent hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 md:border-transparent">
                        <Printer size={18} />
                    </button>
                    <button className="flex-auto md:flex-none flex items-center justify-center gap-2 px-4 h-11 md:h-auto md:py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="space-y-1 w-full md:w-auto">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Per Tanggal</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full md:w-auto pl-10 pr-4 py-2.5 md:py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-black text-slate-900 transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 md:gap-8 px-4 md:px-8 py-3 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 uppercase tracking-widest">
                    <div className="flex flex-col text-left md:text-right w-1/2 md:w-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Debit</p>
                        <p className="text-sm md:text-lg font-black text-emerald-600 tracking-tight leading-none truncate">{totals.debit.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200 self-center shrink-0" />
                    <div className="flex flex-col text-left md:text-right w-1/2 md:w-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Credit</p>
                        <p className="text-sm md:text-lg font-black text-rose-600 tracking-tight leading-none truncate">{totals.credit.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Code & Name</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest bg-indigo-50/30">End Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><RefreshCw className="animate-spin text-slate-200 mx-auto" size={32} /></td></tr>
                        ) : report.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase italic tracking-widest">No accounting movement found</td></tr>
                        ) : (
                            report.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/20 transition-colors group">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{item.code}</span>
                                            <span className="font-black text-slate-900 tracking-tight">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className={`font-mono font-bold text-xs ${item.debit > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                            {item.debit > 0 ? item.debit.toLocaleString('id-ID') : '0'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className={`font-mono font-bold text-xs ${item.credit > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                            {item.credit > 0 ? item.credit.toLocaleString('id-ID') : '0'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right bg-indigo-50/20">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-mono font-black text-slate-900">{item.balance.toLocaleString('id-ID')}</span>
                                            {item.balance > 0 ? (
                                                <ArrowUpRight size={10} className="text-emerald-500" />
                                            ) : item.balance < 0 ? (
                                                <ArrowDownRight size={10} className="text-rose-500" />
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        {/* Footer Balance Check */}
                        <tr className="bg-slate-900 text-white font-black">
                            <td colSpan={2} className="px-8 py-5 uppercase tracking-widest text-[11px] text-slate-400 italic">Financial Balance Check</td>
                            <td className="px-8 py-5 text-right font-mono">{totals.debit.toLocaleString('id-ID')}</td>
                            <td className="px-8 py-5 text-right font-mono">{totals.credit.toLocaleString('id-ID')}</td>
                            <td className="px-8 py-5 text-right font-mono bg-indigo-600">
                                {Math.abs(totals.debit - totals.credit) < 1 ? 'BALANCED' : 'UNBALANCED'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards rendering */}
            <div className="md:hidden flex flex-col gap-3">
                {loading ? (
                    <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>
                ) : report.length === 0 ? (
                    <div className="py-12 text-center opacity-50 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Activity size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold text-sm">No accounting movement found</p>
                    </div>
                ) : (
                    report.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2 max-w-[70%]">
                                    <span className="font-mono text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0 w-11 text-center">{item.code}</span>
                                    <span className="font-black text-slate-900 leading-snug truncate">{item.name}</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg shrink-0">{item.type}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-left">
                                    <p className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">Debit</p>
                                    <p className={`font-mono font-bold text-sm ${item.debit > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{item.debit > 0 ? item.debit.toLocaleString('id-ID') : '0'}</p>
                                </div>
                                <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-left">
                                    <p className="text-[9px] font-black text-rose-600/70 uppercase tracking-widest mb-0.5">Credit</p>
                                    <p className={`font-mono font-bold text-sm ${item.credit > 0 ? 'text-rose-700' : 'text-slate-400'}`}>{item.credit > 0 ? item.credit.toLocaleString('id-ID') : '0'}</p>
                                </div>
                            </div>

                            <div className="mt-1 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">End Balance</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-indigo-950 text-base">{item.balance.toLocaleString('id-ID')}</span>
                                    {item.balance > 0 ? (
                                        <ArrowUpRight size={14} className="text-emerald-500" />
                                    ) : item.balance < 0 ? (
                                        <ArrowDownRight size={14} className="text-rose-500" />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {!loading && report.length > 0 && (
                    <div className="bg-slate-900 text-white rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-lg mt-2">
                        <p className="uppercase tracking-widest text-[9px] font-black text-slate-400 text-center italic w-full">Financial Balance Check</p>
                        <div className="grid grid-cols-2 gap-3 relative before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-white/10">
                            <div className="text-center pr-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Debit</p>
                                <p className="font-mono text-sm tracking-tight font-black text-white">{totals.debit.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="text-center pl-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Credit</p>
                                <p className="font-mono text-sm tracking-tight font-black text-white">{totals.credit.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <div className={`mt-1 py-1.5 rounded-xl text-center font-mono text-[10px] font-black tracking-widest uppercase ${Math.abs(totals.debit - totals.credit) < 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {Math.abs(totals.debit - totals.credit) < 1 ? 'BALANCED' : 'UNBALANCED'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
