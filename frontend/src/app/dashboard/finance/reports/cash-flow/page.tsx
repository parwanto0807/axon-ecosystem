"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
    Waves, Printer, Download, Search,
    RefreshCw, Calendar, ArrowRight, TrendingUp,
    TrendingDown, ArrowUpCircle, ArrowDownCircle,
    Activity
} from "lucide-react"

interface CashFlowItem {
    id: string
    description: string
    amount: number
}

interface CashFlowSection {
    total: number
    items: CashFlowItem[]
}

interface CashFlowData {
    operating: CashFlowSection
    investing: CashFlowSection
    financing: CashFlowSection
}

export default function CashFlowPage() {
    const [data, setData] = useState<CashFlowData>({
        operating: { total: 0, items: [] },
        investing: { total: 0, items: [] },
        financing: { total: 0, items: [] }
    })
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return {
            startDate: new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0],
            endDate: today
        }
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams(filters).toString()
            const res = await fetch(`http://127.0.0.1:5000/api/reports/cash-flow?${query}`)
            setData(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        loadData()
    }, [loadData])

    const netCashFlow = data.operating.total + data.investing.total + data.financing.total

    return (
        <div className="px-4 py-6 space-y-6 w-full font-inter">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Waves size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arus Kas</h1>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Cash Flow Statement</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all">
                        <Printer size={18} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* Filters & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900" />
                    </div>
                    <button onClick={loadData} className="w-full py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all">Filter Period</button>
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-[2.5rem] p-6 text-center border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={40} className="text-indigo-600" /></div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Operating Cash</p>
                        <p className={`text-2xl font-black tracking-tighter ${data.operating.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {data.operating.total.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-6 text-center border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Investment & Finance</p>
                        <p className={`text-2xl font-black tracking-tighter ${(data.investing.total + data.financing.total) >= 0 ? 'text-indigo-600' : 'text-slate-600'}`}>
                            {(data.investing.total + data.financing.total).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className={`rounded-[2.5rem] p-6 text-center flex flex-col justify-center relative overflow-hidden ${netCashFlow >= 0 ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Flow</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-black tracking-tighter">{netCashFlow.toLocaleString('id-ID')}</span>
                            {netCashFlow >= 0 ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-rose-300" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8 pb-12">
                {/* Operating Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><Activity size={16} /></div>
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Aktivitas Operasional</h2>
                        </div>
                        <span className={`font-black text-sm ${data.operating.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {data.operating.total.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                            {data.operating.items.length === 0 ? (
                                <tr><td className="px-8 py-4 text-slate-400 italic">Tidak ada arus kas operasional</td></tr>
                            ) : data.operating.items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/20">
                                    <td className="px-8 py-4 text-slate-700 font-bold">{item.description}</td>
                                    <td className={`px-8 py-4 text-right font-mono font-black ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {item.amount >= 0 ? `+${item.amount.toLocaleString('id-ID')}` : item.amount.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Investing Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><ArrowUpCircle size={16} /></div>
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Aktivitas Investasi</h2>
                        </div>
                        <span className={`font-black text-sm ${data.investing.total >= 0 ? 'text-indigo-600' : 'text-slate-600'}`}>
                            {data.investing.total.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                            {data.investing.items.length === 0 ? (
                                <tr><td className="px-8 py-4 text-slate-400 italic">Tidak ada aktivitas investasi</td></tr>
                            ) : data.investing.items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/20">
                                    <td className="px-8 py-4 text-slate-700 font-bold">{item.description}</td>
                                    <td className={`px-8 py-4 text-right font-mono font-black ${item.amount >= 0 ? 'text-indigo-600' : 'text-slate-600'}`}>
                                        {item.amount >= 0 ? `+${item.amount.toLocaleString('id-ID')}` : item.amount.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Financing Section */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><ArrowDownCircle size={16} /></div>
                            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Aktivitas Pendanaan</h2>
                        </div>
                        <span className={`font-black text-sm ${data.financing.total >= 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                            {data.financing.total.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                            {data.financing.items.length === 0 ? (
                                <tr><td className="px-8 py-4 text-slate-400 italic">Tidak ada aktivitas pendanaan</td></tr>
                            ) : data.financing.items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/20">
                                    <td className="px-8 py-4 text-slate-700 font-bold">{item.description}</td>
                                    <td className={`px-8 py-4 text-right font-mono font-black ${item.amount >= 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                                        {item.amount >= 0 ? `+${item.amount.toLocaleString('id-ID')}` : item.amount.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Final Total */}
                <div className={`p-8 rounded-[3rem] text-white flex items-center justify-between shadow-2xl ${netCashFlow >= 0 ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Total Kenaikan / Penurunan Kas</p>
                        <h2 className="text-3xl font-black tracking-tighter">NET CASH FLOW OVER PERIOD</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black tracking-tighter">{netCashFlow.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] font-bold mt-1 opacity-80 uppercase tracking-widest">{netCashFlow >= 0 ? 'Cash Surplus' : 'Cash Deficit'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
