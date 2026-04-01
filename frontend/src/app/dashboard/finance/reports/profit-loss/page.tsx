"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, Printer, Download, RefreshCw, TrendingDown,
    DollarSign, Percent, FileText, Filter
} from "lucide-react"

interface Account {
    id: string
    code: string
    name: string
    balance: number
}

interface ProfitLossData {
    operatingRevenue: Account[]
    cogs: Account[]
    operatingExpenses: Account[]
    otherIncome: Account[]
    otherExpenses: Account[]
    totalOperatingRevenue: number
    totalCOGS: number
    grossProfit: number
    totalOperatingExpenses: number
    operatingIncome: number
    totalOtherIncome: number
    totalOtherExpenses: number
    netProfit: number
}

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
}

export default function ProfitLossPage() {
    const [data, setData] = useState<ProfitLossData>({ 
        operatingRevenue: [], 
        cogs: [], 
        operatingExpenses: [], 
        otherIncome: [], 
        otherExpenses: [],
        totalOperatingRevenue: 0,
        totalCOGS: 0,
        grossProfit: 0,
        totalOperatingExpenses: 0,
        operatingIncome: 0,
        totalOtherIncome: 0,
        totalOtherExpenses: 0,
        netProfit: 0
    })
    const [isMounted, setIsMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: ''
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams(filters).toString()
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/profit-loss?${query}`)
            const rawData = await res.json()
            setData({
                operatingRevenue: [],
                cogs: [],
                operatingExpenses: [],
                otherIncome: [],
                otherExpenses: [],
                totalOperatingRevenue: 0,
                totalCOGS: 0,
                grossProfit: 0,
                totalOperatingExpenses: 0,
                operatingIncome: 0,
                totalOtherIncome: 0,
                totalOtherExpenses: 0,
                netProfit: 0,
                ...rawData
            })
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        setFilters({
            startDate: new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0],
            endDate: today
        })
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (isMounted && filters.startDate && filters.endDate) {
            loadData()
        }
    }, [isMounted, filters, loadData])

    if (!isMounted) return null

    const { 
        totalOperatingRevenue = 0, 
        totalCOGS = 0, 
        grossProfit = 0, 
        totalOperatingExpenses = 0, 
        operatingIncome = 0, 
        totalOtherIncome = 0, 
        totalOtherExpenses = 0, 
        netProfit = 0 
    } = data || {}

    const grossMargin = totalOperatingRevenue > 0 ? (grossProfit / totalOperatingRevenue) * 100 : 0
    const netMargin = totalOperatingRevenue > 0 ? (netProfit / totalOperatingRevenue) * 100 : 0

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-4 md:px-8 md:py-10 space-y-6 md:space-y-10 font-inter max-w-full mx-auto pb-32 md:pb-12 bg-slate-50/50"
        >
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 md:gap-6">
                    <motion.div 
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl from-indigo-600 to-violet-700 flex items-center justify-center shadow-2xl shadow-indigo-500/30 shrink-0"
                    >
                        <TrendingUp size={28} className="text-white md:w-8 md:h-8" />
                    </motion.div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Laba Rugi
                        </h1>
                        <p className="text-[10px] md:text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 md:mt-2 bg-slate-100 w-fit px-2 py-1 rounded-md">Income Statement</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => window.print()} 
                        className="flex-1 lg:flex-none flex justify-center items-center h-12 w-12 text-slate-500 bg-white hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all border border-slate-200 shadow-sm"
                    >
                        <Printer size={20} />
                    </motion.button>
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        className="flex-3 lg:flex-none flex items-center justify-center gap-2 px-8 h-12 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10"
                    >
                        <Download size={18} /> Export Report
                    </motion.button>
                </div>
            </header>

            {/* Filter & Key Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
                <motion.div 
                    variants={itemVariants}
                    className="xl:col-span-3 bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 flex flex-col justify-between space-y-6"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Filter size={14} className="text-indigo-600" />
                        </div>
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Filter Period</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-5 py-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sampai</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-5 py-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900 transition-all" />
                        </div>
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={loadData} 
                        className="w-full py-4 bg-linear-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        Apply Filters
                    </motion.button>
                </motion.div>

                <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <motion.div 
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-slate-900 rounded-[2.5rem] p-8 text-left flex flex-col justify-between relative overflow-hidden group shadow-2xl shadow-slate-900/20"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-500" />
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                            <DollarSign size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Pendapatan</p>
                            <p className="text-3xl md:text-4xl font-black text-white tracking-tighter truncate leading-none">
                                <span className="text-indigo-400 mr-2 font-light">Rp</span>
                                {totalOperatingRevenue.toLocaleString('id-ID')}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div 
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-[2.5rem] p-8 text-left border border-white flex flex-col justify-between shadow-2xl shadow-slate-200/50"
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-6">
                            <Percent size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Gross Profit Margin</p>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl md:text-4xl font-black text-indigo-900 tracking-tighter leading-none">{grossMargin.toFixed(1)}%</span>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${grossMargin}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-indigo-600 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className={`rounded-[2.5rem] p-8 text-left flex flex-col justify-between border relative overflow-hidden shadow-2xl ${netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100 shadow-emerald-200/20' : 'bg-rose-50/50 border-rose-100 shadow-rose-200/20'}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            {netProfit >= 0 ? <TrendingUp size={20} className="text-emerald-600" /> : <TrendingDown size={20} className="text-rose-600" />}
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                            </p>
                            <p className={`text-3xl md:text-4xl font-black tracking-tighter truncate leading-none ${netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{netProfit.toLocaleString('id-ID')}</p>
                            <p className={`text-[11px] font-black mt-2 inline-block px-2 py-0.5 rounded-md ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{netMargin.toFixed(1)}% Margin</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <motion.div 
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50"
            >
                <div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-8 py-6 text-left">Nama Akun</th>
                                <th className="px-8 py-6 text-right">Saldo (IDR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                             {/* Operating Revenue Section */}
                             <tr className="bg-slate-50/30">
                                 <td colSpan={2} className="px-8 py-5">
                                     <div className="flex items-center gap-3">
                                         <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                         <span className="font-black text-[11px] text-indigo-900 uppercase tracking-[0.2em]">Pendapatan Operasional</span>
                                     </div>
                                 </td>
                             </tr>
                             <AnimatePresence mode="wait">
                                 {loading ? (
                                     <motion.tr 
                                         initial={{ opacity: 0 }}
                                         animate={{ opacity: 1 }}
                                         exit={{ opacity: 0 }}
                                     >
                                         <td colSpan={2} className="py-24 text-center">
                                             <RefreshCw className="animate-spin text-indigo-600 mx-auto w-10 h-10 opacity-20" />
                                             <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Report Data...</p>
                                         </td>
                                     </motion.tr>
                                 ) : (data.operatingRevenue || []).length === 0 ? (
                                     <tr><td colSpan={2} className="px-8 py-10 text-center text-slate-400 italic text-sm">No revenue recorded in this period</td></tr>
                                 ) : (data.operatingRevenue || []).map((acc, idx) => (
                                     <motion.tr 
                                         key={acc.id}
                                         initial={{ opacity: 0, x: -10 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         transition={{ delay: idx * 0.05 }}
                                         className="group hover:bg-slate-50/50 transition-colors"
                                     >
                                         <td className="px-8 py-5 flex items-center gap-4">
                                             <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">{acc.code}</span>
                                             <span className="font-bold text-slate-800 tracking-tight">{acc.name}</span>
                                         </td>
                                         <td className="px-8 py-5 text-right font-mono font-black text-slate-900 tracking-tighter">{acc.balance.toLocaleString('id-ID')}</td>
                                     </motion.tr>
                                 ))}
                             </AnimatePresence>
                             <tr className="bg-indigo-50/20 font-black">
                                 <td className="px-8 py-6 text-[10px] uppercase tracking-widest text-indigo-900">Total Pendapatan Operasional</td>
                                 <td className="px-8 py-6 text-right text-indigo-600 text-lg md:text-xl tracking-tighter">{totalOperatingRevenue.toLocaleString('id-ID')}</td>
                             </tr>

                            {/* COGS Section */}
                            <tr className="bg-slate-50/30">
                                <td colSpan={2} className="px-8 py-5 mt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                                        <span className="font-black text-[11px] text-rose-900 uppercase tracking-[0.2em]">Harga Pokok Penjualan (COGS)</span>
                                    </div>
                                </td>
                            </tr>
                            {(data.cogs || []).map((acc, idx) => (
                                <motion.tr 
                                    key={acc.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-8 py-5 flex items-center gap-4">
                                        <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors shrink-0">{acc.code}</span>
                                        <span className="font-bold text-slate-800 tracking-tight">{acc.name}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono font-black text-slate-900 tracking-tighter">{acc.balance.toLocaleString('id-ID')}</td>
                                </motion.tr>
                            ))}
                             <tr className="bg-rose-50/20 font-black">
                                 <td className="px-8 py-6 text-[10px] uppercase tracking-widest text-rose-900">Total HPP</td>
                                 <td className="px-8 py-6 text-right text-rose-600 text-lg md:text-xl tracking-tighter">{totalCOGS.toLocaleString('id-ID')}</td>
                             </tr>

                            {/* Gross Profit */}
                            <tr className="bg-slate-900 text-white font-black">
                                <td className="px-8 py-8 uppercase tracking-[0.3em] text-[11px] md:text-xs">Laba Kotor (Gross Profit)</td>
                                <td className="px-8 py-8 text-right text-xl md:text-3xl tracking-tighter flex items-center justify-end gap-3">
                                    <span className="text-indigo-400 text-lg md:text-xl font-light">Rp</span>
                                    {grossProfit.toLocaleString('id-ID')}
                                </td>
                            </tr>

                             {/* Operating Expenses Section */}
                             <tr className="bg-slate-50/30">
                                 <td colSpan={2} className="px-8 py-5 mt-4">
                                     <div className="flex items-center gap-3">
                                         <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                                         <span className="font-black text-[11px] text-slate-600 uppercase tracking-[0.2em]">Beban Operasional</span>
                                     </div>
                                 </td>
                             </tr>
                             {(data.operatingExpenses || []).map((acc, idx) => (
                                 <motion.tr 
                                     key={acc.id}
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     transition={{ delay: idx * 0.05 }}
                                     className="group hover:bg-slate-50/50 transition-colors"
                                 >
                                     <td className="px-8 py-5 flex items-center gap-4">
                                         <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors shrink-0">{acc.code}</span>
                                         <span className="font-bold text-slate-800 tracking-tight">{acc.name}</span>
                                     </td>
                                     <td className="px-8 py-5 text-right font-mono font-black text-slate-900 tracking-tighter">{acc.balance.toLocaleString('id-ID')}</td>
                                 </motion.tr>
                             ))}
                             <tr className="bg-slate-50 font-black">
                                 <td className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-500">Total Beban Operasional</td>
                                 <td className="px-8 py-6 text-right text-slate-900 text-lg md:text-xl tracking-tighter">{totalOperatingExpenses.toLocaleString('id-ID')}</td>
                             </tr>
 
                             {/* Operating Income */}
                             <tr className="bg-slate-800 text-white font-black">
                                 <td className="px-8 py-8 uppercase tracking-[0.3em] text-[11px] md:text-xs">Laba Operasional (EBIT)</td>
                                 <td className="px-8 py-8 text-right text-xl md:text-3xl tracking-tighter flex items-center justify-end gap-3">
                                     <span className="text-emerald-400 text-lg md:text-xl font-light">Rp</span>
                                     {operatingIncome.toLocaleString('id-ID')}
                                 </td>
                             </tr>
 
                             {/* Other Income & Expenses Section */}
                             <tr className="bg-slate-50/30">
                                 <td colSpan={2} className="px-8 py-5 mt-4">
                                     <div className="flex items-center gap-3">
                                         <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                         <span className="font-black text-[11px] text-amber-900 uppercase tracking-[0.2em]">Pendapatan & Beban Lainnya</span>
                                     </div>
                                 </td>
                             </tr>
                             {(data.otherIncome || []).map((acc, idx) => (
                                 <motion.tr 
                                     key={acc.id}
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     transition={{ delay: idx * 0.05 }}
                                     className="group hover:bg-slate-50/50 transition-colors"
                                 >
                                     <td className="px-8 py-5 flex items-center gap-4">
                                         <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-50 px-2 py-1 rounded-lg group-hover:bg-amber-100 transition-colors shrink-0">{acc.code}</span>
                                         <span className="font-bold text-slate-800 tracking-tight">{acc.name}</span>
                                     </td>
                                     <td className="px-8 py-5 text-right font-mono font-black text-emerald-600 tracking-tighter">{acc.balance.toLocaleString('id-ID')}</td>
                                 </motion.tr>
                             ))}
                             {(data.otherExpenses || []).map((acc, idx) => (
                                 <motion.tr 
                                     key={acc.id}
                                     initial={{ opacity: 0, x: -10 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     transition={{ delay: ((data.otherIncome || []).length + idx) * 0.05 }}
                                     className="group hover:bg-slate-50/50 transition-colors"
                                 >
                                     <td className="px-8 py-5 flex items-center gap-4">
                                         <span className="font-mono text-[10px] text-rose-400 font-bold bg-rose-50 px-2 py-1 rounded-lg group-hover:bg-rose-100 transition-colors shrink-0">{acc.code}</span>
                                         <span className="font-bold text-slate-800 tracking-tight">{acc.name}</span>
                                     </td>
                                     <td className="px-8 py-5 text-right font-mono font-black text-rose-600 tracking-tighter">({acc.balance.toLocaleString('id-ID')})</td>
                                 </motion.tr>
                             ))}
                             <tr className="bg-slate-50 font-black border-b-2 border-slate-200">
                                 <td className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-500">Total Pendapatan/Beban Bersih Lainnya</td>
                                 <td className="px-8 py-6 text-right text-slate-900 text-lg md:text-xl tracking-tighter">{(totalOtherIncome - totalOtherExpenses).toLocaleString('id-ID')}</td>
                             </tr>

                            {/* Net Profit */}
                            <tr className={`font-black overflow-hidden relative ${netProfit >= 0 ? 'bg-linear-to-r from-indigo-600 to-violet-700 text-white' : 'bg-linear-to-r from-rose-600 to-red-700 text-white'}`}>
                                <td className="px-8 py-10 uppercase tracking-[0.4em] text-[12px] md:text-sm z-10 relative">
                                    {netProfit >= 0 ? 'Laba Bersih (Net Profit)' : 'Rugi Bersih (Net Loss)'}
                                </td>
                                <td className="px-8 py-10 text-right text-2xl md:text-5xl tracking-tighter z-10 relative">
                                    <div className="flex items-center justify-end gap-3 md:gap-5">
                                        <span className="opacity-40 text-lg md:text-3xl font-light">Rp</span>
                                        <span className="truncate">{netProfit.toLocaleString('id-ID')}</span>
                                    </div>
                                </td>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-20 -mt-20" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-[80px] rounded-full -ml-20 -mb-20" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Bottom Insight */}
            <motion.div 
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                <div className="bg-indigo-50/50 p-6 rounded-4xl border border-indigo-100 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <FileText size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">Financial Note</h4>
                        <p className="text-sm text-indigo-800 leading-relaxed font-medium">Laporan ini disusun berdasarkan data transaksi yang telah disetujui untuk periode terpilih. Margin kotor menunjukkan efisiensi operasional langsung.</p>
                    </div>
                </div>
                <div className="bg-slate-100/50 p-6 rounded-4xl border border-slate-200 flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <RefreshCw size={18} className="text-slate-600" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Auto Generation</h4>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">Laporan diperbarui setiap kali filter diterapkan. Pastikan saldo awal telah diinput dengan benar untuk akurasi data.</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
