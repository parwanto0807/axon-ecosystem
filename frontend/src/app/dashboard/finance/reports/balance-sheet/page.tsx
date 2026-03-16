"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
    PieChart, Printer, Download, Search,
    RefreshCw, Calendar, ArrowRight, ShieldCheck
} from "lucide-react"

interface Account {
    id: string
    code: string
    name: string
    balance: number
}

interface BalanceSheetData {
    assets: Account[]
    liabilities: Account[]
    equity: Account[]
}

export default function BalanceSheetPage() {
    const [data, setData] = useState<BalanceSheetData>({ assets: [], liabilities: [], equity: [] })
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/balance-sheet?date=${date}`)
            setData(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [date])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totalAssets = data.assets.reduce((sum, a) => sum + a.balance, 0)
    const totalLiabilities = data.liabilities.reduce((sum, a) => sum + a.balance, 0)
    const totalEquity = data.equity.reduce((sum, a) => sum + a.balance, 0)
    const totalLiabAndEquity = totalLiabilities + totalEquity

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-4 md:space-y-6 font-inter max-w-full mx-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <PieChart size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Neraca</h1>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5 md:mt-1">Balance Sheet Summary</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none flex justify-center items-center h-11 md:h-auto md:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 md:border-transparent">
                        <Printer size={18} />
                    </button>
                    <button className="flex-auto md:flex-none flex items-center justify-center gap-2 px-4 h-11 md:h-auto md:py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* Date Filter & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Per Tanggal</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-black text-slate-900 transition-all"
                        />
                    </div>
                </div>

                <div className="lg:col-span-2 bg-slate-900 flex-col md:flex-row rounded-[2rem] md:rounded-[2.5rem] p-6 flex flex-wrap md:flex-nowrap gap-4 md:gap-0 items-center justify-around overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="text-center z-10 w-full sm:w-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Aktiva (Assets)</p>
                        <p className="text-xl md:text-2xl font-black text-white tracking-tighter truncate">{totalAssets.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="w-full h-px md:w-px md:h-12 bg-slate-700/50" />
                    <div className="text-center z-10 w-full sm:w-auto">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pasiva (Liab + Equity)</p>
                        <p className="text-xl md:text-2xl font-black text-indigo-400 tracking-tighter truncate">{totalLiabAndEquity.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="w-full h-px md:w-px md:h-12 bg-slate-700/50" />
                    <div className="text-center z-10 w-full sm:w-auto flex justify-center">
                        <div className={`px-4 py-2 md:py-2.5 rounded-2xl flex items-center justify-center gap-2 w-full md:w-auto ${Math.abs(totalAssets - totalLiabAndEquity) < 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {Math.abs(totalAssets - totalLiabAndEquity) < 1 ? <ShieldCheck size={16} /> : <Search size={16} />}
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                                {Math.abs(totalAssets - totalLiabAndEquity) < 1 ? 'Balanced' : 'Unbalanced'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                {/* Left Side: Assets */}
                <div className="space-y-4 md:space-y-6">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-full md:min-h-[500px]">
                        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 border-b border-slate-100">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">AKTIVA (ASSETS)</h2>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-xs">
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td className="py-20 text-center"><RefreshCw className="animate-spin text-slate-200 mx-auto" /></td></tr>
                                    ) : data.assets.map(acc => (
                                        <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 md:px-8 py-3 md:py-4">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <span className="font-mono text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                                                    <span className="font-bold text-slate-700 leading-tight">{acc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 md:px-8 py-3 md:py-4 text-right font-mono font-black text-slate-900">
                                                {acc.balance.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 md:px-8 py-4 md:py-6 bg-indigo-600 text-white flex items-center justify-between mt-auto">
                            <span className="font-black text-[10px] uppercase tracking-widest">TOTAL AKTIVA</span>
                            <span className="text-base md:text-lg font-black tracking-tight">{totalAssets.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Liab & Equity */}
                <div className="space-y-4 md:space-y-6">
                    {/* Liabilities */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 border-b border-slate-100">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">KEWAJIBAN (LIABILITIES)</h2>
                        </div>
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-slate-50">
                                {data.liabilities.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 md:px-8 py-3 md:py-4">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <span className="font-mono text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                                                <span className="font-bold text-slate-700 leading-tight">{acc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 md:px-8 py-3 md:py-4 text-right font-mono font-black text-slate-900">
                                            {acc.balance.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 md:px-8 py-3 md:py-4 bg-slate-900 text-slate-100 flex items-center justify-between border-t border-slate-700">
                            <span className="font-black text-[9px] uppercase tracking-widest text-slate-400">TOTAL KEWAJIBAN</span>
                            <span className="font-black tracking-tight">{totalLiabilities.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {/* Equity */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 md:px-8 py-4 md:py-6 bg-slate-50/50 border-b border-slate-100">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">EKUITAS (EQUITY)</h2>
                        </div>
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-slate-50">
                                {data.equity.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 md:px-8 py-3 md:py-4">
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <span className="font-mono text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                                                <span className="font-bold text-slate-700 leading-tight">{acc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 md:px-8 py-3 md:py-4 text-right font-mono font-black text-slate-900">
                                            {acc.balance.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 md:px-8 py-3 md:py-4 bg-slate-900 text-slate-100 flex items-center justify-between border-t border-slate-700">
                            <span className="font-black text-[9px] uppercase tracking-widest text-slate-400">TOTAL EKUITAS</span>
                            <span className="font-black tracking-tight">{totalEquity.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="px-5 md:px-8 py-4 md:py-6 bg-indigo-600 text-white flex items-center justify-between">
                            <span className="font-black text-[10px] uppercase tracking-widest">TOTAL PASIVA</span>
                            <span className="text-base md:text-lg font-black tracking-tight">{totalLiabAndEquity.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
