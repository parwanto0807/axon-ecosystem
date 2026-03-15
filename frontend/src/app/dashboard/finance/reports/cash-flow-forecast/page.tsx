"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, TrendingDown, Calendar, Wallet,
    ArrowUpCircle, ArrowDownCircle, Info, RefreshCw,
    ChevronDown, ChevronRight, Building2, CheckCircle2,
    AlertCircle, Clock, BarChart3, Zap, Eye, X
} from "lucide-react"

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.abs(n).toLocaleString('id-ID')}`

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface InvoiceDetail {
    number: string;
    grandTotal: number;
    dueDate: string | null;
    status: string;
    isOverdue: boolean;
    paymentType?: string;
}
interface BillDetail extends InvoiceDetail {
    paymentType?: string;
}
interface OpexDetail {
    name: string;
    category: string;
    amount: number;
    date: string;
    status: string;
}
interface ForecastMonth {
    month: string;
    monthType: 'ACTUAL' | 'CURRENT' | 'PROJECTED';
    openingBalance: number;
    inflow: number;
    outflow: number;
    netChange: number;
    closingBalance: number;
    breakdown: {
        actualIn: number;
        actualOut: number;
        projectedInflowAmt: number;
        projectedBillAmt: number;
        projectedOpexAmt: number;
    };
    details: {
        invoices: InvoiceDetail[];
        bills: BillDetail[];
        opex: OpexDetail[];
    };
}
interface ForecastData {
    today: string;
    openingBalance: number;
    currentBalance: number;
    cashAccountsCount: number;
    forecast: ForecastMonth[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const MonthTypeBadge = ({ type }: { type: ForecastMonth['monthType'] }) => {
    const cfg = {
        ACTUAL:    { label: 'Aktual',    cls: 'bg-slate-100 text-slate-600',    icon: CheckCircle2 },
        CURRENT:   { label: 'Berjalan',  cls: 'bg-indigo-100 text-indigo-700',  icon: Zap },
        PROJECTED: { label: 'Proyeksi',  cls: 'bg-amber-100 text-amber-700',    icon: Clock },
    }[type];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.cls}`}>
            <Icon size={9} /> {cfg.label}
        </span>
    );
};

const DetailSection = ({
    icon: Icon, title, colorClass, items, emptyMsg, renderItem
}: {
    icon: any; title: string; colorClass: string; items: any[];
    emptyMsg: string; renderItem: (item: any, i: number) => React.ReactNode;
}) => (
    <section>
        <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-slate-100`}>
            <Icon size={13} className={colorClass} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{title}</span>
            <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500`}>{items.length}</span>
        </div>
        <div className="space-y-1.5">
            {items.length === 0
                ? <p className="text-[10px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">{emptyMsg}</p>
                : items.map((item, i) => renderItem(item, i))
            }
        </div>
    </section>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CashFlowForecastPage() {
    const [data, setData] = useState<ForecastData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<number>(0)
    const [expandedDetail, setExpandedDetail] = useState<string | null>('invoices')
    const [modalIndex, setModalIndex] = useState<number | null>(null)
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
            const res = await fetch('http://127.0.0.1:5000/api/reports/cash-flow-forecast')
            if (res.ok) setData(await res.json())
        } catch (e) {
            console.error("Failed to fetch forecast:", e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Menyiapkan Proyeksi...</p>
                </div>
            </div>
        )
    }
    if (!data) return <div className="flex justify-center p-20 text-slate-400">Gagal memuat data.</div>

    const currentMonth = data.forecast[selectedMonth]
    const totalForecastInflow = data.forecast.reduce((s, m) => s + m.inflow, 0)
    const totalForecastOutflow = data.forecast.reduce((s, m) => s + m.outflow, 0)
    const projectedEndBalance = data.forecast[data.forecast.length - 1].closingBalance
    const maxBarVal = Math.max(...data.forecast.map(m => Math.max(m.inflow, m.outflow, Math.abs(m.closingBalance))), 1)

    return (
        <div className="w-full p-4 md:p-8 space-y-6 md:space-y-8 font-inter bg-slate-50/50 min-h-screen pb-24 md:pb-8 overflow-x-hidden box-border">

            {/* ── Header ── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-xl shadow-indigo-600/20 shrink-0">
                        <BarChart3 size={isMobile ? 24 : 26} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight truncate">Proyeksi Arus Kas</h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 mt-0.5 md:mt-1 flex items-center gap-2">
                            <Calendar size={10} className="shrink-0" />
                            <span className="truncate">7-Bulan Cash Flow Forecast</span>
                            <span className="text-slate-300 shrink-0">•</span>
                            <span className="text-indigo-500 truncate">{data?.cashAccountsCount} akun terhubung</span>
                        </p>
                    </div>
                </div>
                <button onClick={loadData} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 md:px-5 md:py-3 bg-white text-slate-700 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm border border-slate-200 active:scale-95">
                    <RefreshCw size={14} className="md:w-4 md:h-4" /> Refresh Data
                </button>
            </header>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Saldo Saat Ini', value: data.currentBalance, icon: Wallet,
                        color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Real-time dari jurnal'
                    },
                    {
                        label: 'Total Proyeksi Masuk', value: totalForecastInflow, icon: ArrowUpCircle,
                        color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Invoice + kas aktual'
                    },
                    {
                        label: 'Total Proyeksi Keluar', value: totalForecastOutflow, icon: ArrowDownCircle,
                        color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Tagihan + OpEx + kas aktual'
                    },
                    {
                        label: 'Proyeksi Saldo Akhir', value: projectedEndBalance, icon: projectedEndBalance >= 0 ? TrendingUp : TrendingDown,
                        color: projectedEndBalance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                        bg: projectedEndBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
                        sub: `Akhir ${data.forecast[data.forecast.length - 1].month}`
                    },
                ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className={`absolute -right-4 -top-4 w-16 h-16 md:w-20 md:h-20 ${card.bg} rounded-full opacity-60 group-hover:scale-125 transition-transform duration-500`} />
                        <card.icon size={isMobile ? 16 : 18} className={`${card.color} mb-2 md:mb-3 relative z-10`} />
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">{card.label}</p>
                        <p className={`text-lg md:text-xl font-black tracking-tight relative z-10 ${card.color}`}>{fmt(card.value)}</p>
                        <p className="text-[8px] md:text-[9px] text-slate-400 mt-0.5 relative z-10">{card.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Chart + Detail Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Chart */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Tren Arus Kas Bulanan</h2>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 inline-block" /> Masuk</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-rose-500 inline-block" /> Keluar</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-indigo-500 inline-block" /> Saldo</span>
                        </div>
                    </div>

                    <div className="relative h-48 md:h-64 w-full">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-full border-t border-slate-50" />
                            ))}
                        </div>

                        {/* Bars */}
                        <div className="absolute inset-0 flex items-end justify-between gap-2 px-1">
                            {data.forecast.map((m, idx) => {
                                const hIn = Math.max((m.inflow / maxBarVal) * 100, 2);
                                const hOut = Math.max((m.outflow / maxBarVal) * 100, 2);
                                const isSelected = selectedMonth === idx;
                                const isDeficit = m.netChange < 0;
                                return (
                                    <div key={idx}
                                        className="flex-1 flex flex-col items-center gap-2 cursor-pointer group relative"
                                        onClick={() => setSelectedMonth(idx)}>

                                        {/* Hover Tooltip */}
                                        <div className={`
                                            absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50
                                            bg-slate-900 text-white rounded-2xl shadow-xl p-3 w-36 md:w-44
                                            pointer-events-none transition-all duration-200
                                            opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                                        `}>
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-700 pb-1.5">
                                                {m.month}
                                            </p>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Masuk
                                                    </span>
                                                    <span className="text-[10px] font-black text-emerald-300">
                                                        {m.inflow >= 1000000 ? `${(m.inflow/1000000).toFixed(1)}M` : fmt(m.inflow)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-1 text-[10px] text-rose-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" /> Keluar
                                                    </span>
                                                    <span className="text-[10px] font-black text-rose-300">
                                                        {m.outflow >= 1000000 ? `${(m.outflow/1000000).toFixed(1)}M` : fmt(m.outflow)}
                                                    </span>
                                                </div>
                                                <div className={`flex justify-between items-center pt-1 border-t border-slate-700`}>
                                                    <span className="text-[10px] text-slate-300">Net</span>
                                                    <span className={`text-[10px] font-black ${isDeficit ? 'text-rose-300' : 'text-emerald-300'}`}>
                                                        {isDeficit ? '-' : '+'}{m.netChange >= 1000000 || m.netChange <= -1000000
                                                            ? `${(Math.abs(m.netChange)/1000000).toFixed(1)}M`
                                                            : fmt(m.netChange)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-300">Saldo Akhir</span>
                                                    <span className={`text-[10px] font-black ${m.closingBalance < 0 ? 'text-rose-300' : 'text-white'}`}>
                                                        {m.closingBalance >= 1000000 || m.closingBalance <= -1000000
                                                            ? `${(Math.abs(m.closingBalance)/1000000).toFixed(1)}M`
                                                            : fmt(m.closingBalance)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Tooltip arrow */}
                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 rounded-sm" />
                                        </div>

                                        <div className="w-full flex justify-center items-end gap-1 h-36 md:h-52 relative">
                                            {/* Value labels above bars on hover/select */}
                                            <div className={`absolute inset-x-0 flex justify-center items-end gap-1 h-full pointer-events-none ${isMobile ? 'opacity-0' : 'opacity-100'}`}>
                                                <div className="flex flex-col items-center justify-end h-full" style={{ width: 16 }}>
                                                    <span className={`text-[7px] font-black text-emerald-600 mb-0.5 whitespace-nowrap transition-opacity opacity-0 group-hover:opacity-100`}>
                                                        {m.inflow >= 1000000 ? `${(m.inflow/1000000).toFixed(1)}M` : m.inflow > 0 ? `${(m.inflow/1000).toFixed(0)}K` : ''}
                                                    </span>
                                                    <div style={{ height: `${hIn}%` }} />
                                                </div>
                                                <div className="flex flex-col items-center justify-end h-full" style={{ width: 16 }}>
                                                    <span className={`text-[7px] font-black text-rose-600 mb-0.5 whitespace-nowrap transition-opacity opacity-0 group-hover:opacity-100`}>
                                                        {m.outflow >= 1000000 ? `${(m.outflow/1000000).toFixed(1)}M` : m.outflow > 0 ? `${(m.outflow/1000).toFixed(0)}K` : ''}
                                                    </span>
                                                    <div style={{ height: `${hOut}%` }} />
                                                </div>
                                            </div>

                                            {/* Inflow bar */}
                                            <motion.div initial={{ height: 0 }} animate={{ height: `${hIn}%` }}
                                                className={`${isMobile ? 'w-2.5' : 'w-4'} rounded-t-lg transition-all ${isSelected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-emerald-200 group-hover:bg-emerald-400'}`} />
                                            {/* Outflow bar */}
                                            <motion.div initial={{ height: 0 }} animate={{ height: `${hOut}%` }}
                                                className={`${isMobile ? 'w-2.5' : 'w-4'} rounded-t-lg transition-all ${isSelected ? 'bg-rose-500 shadow-lg shadow-rose-500/30' : 'bg-rose-200 group-hover:bg-rose-400'}`} />
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-[9px] font-black uppercase leading-none ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {m.month.split(' ')[0].substring(0, 3)}
                                            </p>
                                            <MonthTypeBadge type={m.monthType} />
                                        </div>
                                        {isSelected && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className={`w-2 h-2 rounded-full ${isDeficit ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                        )}

                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-7 border border-slate-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Bulan</p>
                            <h3 className="text-sm md:text-base font-black text-slate-900 mt-0.5">{currentMonth.month}</h3>
                        </div>
                        <MonthTypeBadge type={currentMonth.monthType} />
                    </div>

                    {/* Balance flow */}
                    <div className="space-y-2 text-xs">
                        {[
                            { label: 'Saldo Awal', value: currentMonth.openingBalance, cls: 'text-slate-700' },
                            { label: '+ Uang Masuk', value: currentMonth.inflow, cls: 'text-emerald-600' },
                            { label: '− Uang Keluar', value: currentMonth.outflow, cls: 'text-rose-600' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                <span className="font-semibold text-slate-500">{row.label}</span>
                                <span className={`font-black ${row.cls}`}>{fmt(row.value)}</span>
                            </div>
                        ))}
                        <div className={`flex items-center justify-between p-3 rounded-2xl mt-1 ${currentMonth.netChange >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <span className="font-black text-slate-700 text-[10px] uppercase tracking-wider">Saldo Akhir</span>
                            <span className={`font-black text-base ${currentMonth.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(currentMonth.closingBalance)}</span>
                        </div>
                    </div>

                    {/* Breakdown */}
                    {currentMonth.monthType === 'CURRENT' && (
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-[10px]">
                            <p className="font-black text-slate-500 uppercase tracking-wider mb-2">Rincian Komponen</p>
                            {[
                                { label: 'Kas Masuk Aktual', val: currentMonth.breakdown.actualIn, color: 'text-indigo-600' },
                                { label: 'Invoice Proyeksi', val: currentMonth.breakdown.projectedInflowAmt, color: 'text-emerald-600' },
                                { label: 'Kas Keluar Aktual', val: currentMonth.breakdown.actualOut, color: 'text-rose-500' },
                                { label: 'Tagihan Proyeksi', val: currentMonth.breakdown.projectedBillAmt, color: 'text-rose-600' },
                                { label: 'Biaya Operasional', val: currentMonth.breakdown.projectedOpexAmt, color: 'text-orange-600' },
                            ].map(r => (
                                <div key={r.label} className="flex justify-between">
                                    <span className="text-slate-500">{r.label}</span>
                                    <span className={`font-black ${r.color}`}>{fmt(r.val)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Monthly Projection Table / Cards ── */}
            <section className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 md:px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-3">
                    <Calendar size={16} className="text-indigo-600" />
                    <h2 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Rincian Proyeksi Bulanan</h2>
                </div>
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {['Bulan', 'Saldo Awal', 'Uang Masuk', 'Uang Keluar', 'Perubahan Netto', 'Saldo Akhir', 'Detail'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.forecast.map((m, idx) => (
                                <tr key={idx}
                                    className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${selectedMonth === idx ? 'bg-indigo-50/40 border-l-4 border-l-indigo-400' : ''}`}
                                    onClick={() => setSelectedMonth(idx)}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-black text-slate-900">{m.month}</p>
                                            <MonthTypeBadge type={m.monthType} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-500 font-medium">{fmt(m.openingBalance)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-emerald-600">+{fmt(m.inflow)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-rose-600">-{fmt(m.outflow)}</td>
                                    <td className={`px-6 py-4 text-right text-sm font-black ${m.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {m.netChange >= 0 ? '+' : '-'}{fmt(m.netChange)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-3 py-1.5 rounded-xl text-sm font-black ${m.closingBalance >= 0 ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
                                            {fmt(m.closingBalance)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModalIndex(idx);
                                            }}
                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group/btn"
                                            title="Lihat Rincian"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-50">
                    {data.forecast.map((m, idx) => (
                        <div key={idx} 
                            onClick={() => setSelectedMonth(idx)}
                            className={`p-5 space-y-4 active:bg-slate-50 transition-colors ${selectedMonth === idx ? 'bg-indigo-50/30 border-l-4 border-l-indigo-500' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-black text-slate-900">{m.month}</p>
                                    <div className="mt-1"><MonthTypeBadge type={m.monthType} /></div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setModalIndex(idx); }}
                                    className="p-3 bg-white border border-slate-100 text-indigo-600 rounded-2xl shadow-sm active:scale-95 transition-all">
                                    <Eye size={18} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pemasukan</p>
                                    <p className="text-xs font-black text-emerald-600">+{fmt(m.inflow)}</p>
                                </div>
                                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pengeluaran</p>
                                    <p className="text-xs font-black text-rose-600">-{fmt(m.outflow)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Akhir</p>
                                    <p className={`text-sm font-black truncate ${m.closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(m.closingBalance)}</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${m.netChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {m.netChange >= 0 ? '+' : ''}{fmt(m.netChange)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Detail Drawer for Selected Month ── */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <button
                    className="w-full px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
                    onClick={() => setExpandedDetail(expandedDetail ? null : 'invoices')}>
                    <div className="flex items-center gap-3">
                        <Info size={16} className="text-indigo-600" />
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            Detail Dokumen — {currentMonth.month}
                        </h2>
                        <MonthTypeBadge type={currentMonth.monthType} />
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedDetail ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {expandedDetail !== null && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="p-5 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* Invoice Inflows */}
                                <DetailSection
                                    icon={ArrowUpCircle} title="Invoice Penagihan" colorClass="text-emerald-500"
                                    items={[
                                        ...(currentMonth.breakdown.actualIn > 0 ? [{
                                            number: 'Realisasi Kas (Actual In)',
                                            grandTotal: currentMonth.breakdown.actualIn,
                                            status: 'Lunas (Jurnal)',
                                            paymentType: 'CASH'
                                        } as any] : []),
                                        ...currentMonth.details.invoices
                                    ]} 
                                    emptyMsg="Tidak ada invoice outstanding bulan ini"
                                    renderItem={(item: InvoiceDetail, i) => {
                                        const isCash = item.paymentType === 'CASH';
                                        return (
                                            <div key={i} className="flex flex-col p-2.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-emerald-200 transition-all group/item relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-1.5 relative z-10">
                                                    <span className="text-[10px] font-black text-slate-700">{item.number}</span>
                                                    {item.isOverdue && !isCash && (
                                                        <span className="flex items-center gap-1 text-[8px] font-black text-rose-600 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded-md animate-pulse">
                                                            <AlertCircle size={8} /> Overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isCash ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isCash ? 'Lunas (Cash)' : item.status}
                                                        </span>
                                                        <span className="text-[11px] font-black text-slate-900">{fmt(item.grandTotal)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />

                                {/* Bill Outflows */}
                                <DetailSection
                                    icon={ArrowDownCircle} title="Tagihan Vendor (Bills)" colorClass="text-rose-500"
                                    items={[
                                        ...(currentMonth.breakdown.actualOut > 0 ? [{
                                            number: 'Realisasi Kas (Actual Out)',
                                            grandTotal: currentMonth.breakdown.actualOut,
                                            status: 'Lunas (Jurnal)',
                                            paymentType: 'CASH'
                                        } as any] : []),
                                        ...currentMonth.details.bills
                                    ]} 
                                    emptyMsg="Tidak ada tagihan vendor bulan ini"
                                    renderItem={(item: BillDetail, i) => {
                                        const isCash = item.paymentType === 'CASH';
                                        return (
                                            <div key={i} className="flex flex-col p-2.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-rose-200 transition-all group/item relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-1.5 relative z-10">
                                                    <span className="text-[10px] font-black text-slate-700">{item.number}</span>
                                                    {item.isOverdue && !isCash && (
                                                        <span className="flex items-center gap-1 text-[8px] font-black text-rose-600 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded-md animate-pulse">
                                                            <AlertCircle size={8} /> Overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isCash ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isCash ? 'Lunas (Cash)' : item.status}
                                                        </span>
                                                        <span className="text-[11px] font-black text-slate-900">{fmt(item.grandTotal)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />

                                {/* Operational Expenses */}
                                <DetailSection
                                    icon={Building2} title="Biaya Operasional (OpEx)" colorClass="text-orange-500"
                                    items={currentMonth.details.opex} emptyMsg="Tidak ada biaya operasional bulan ini"
                                    renderItem={(exp: OpexDetail, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/30 border border-orange-100/50">
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{exp.name}</p>
                                                <p className="text-[9px] font-bold text-orange-600">{exp.category}</p>
                                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{exp.status}</span>
                                            </div>
                                            <p className="text-xs font-black text-orange-700">{fmt(exp.amount)}</p>
                                        </div>
                                    )}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* ── Info Alert ── */}
            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 flex items-start gap-4">
                <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-xs font-black text-amber-900 mb-1">Catatan Metodologi Proyeksi</h4>
                    <p className="text-[11px] text-amber-700/80 leading-relaxed">
                        <strong>Bulan Aktual</strong> — data 100% dari jurnal entri yang sudah di-posting. &nbsp;
                        <strong>Bulan Berjalan</strong> — gabungan kas aktual s/d hari ini + proyeksi invoice/tagihan outstanding. &nbsp;
                        <strong>Bulan Proyeksi</strong> — estimasi berdasarkan jatuh tempo invoice, bills, dan biaya operasional yang belum dibayar.
                        Item tanpa tanggal jatuh tempo dianggap <em>overdue</em> dan dimasukkan ke bulan berjalan.
                    </p>
                </div>
            </div>
            {/* ── Modal Detail ── */}
            <AnimatePresence>
                {modalIndex !== null && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 outline-none">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setModalIndex(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        
                        {/* Modal Content / Bottom Sheet */}
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-5xl max-h-[90vh] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-slate-200"
                        >
                            {/* Mobile Drag Handle */}
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />}

                            {/* Modal Header */}
                            <div className="px-6 md:px-10 py-6 md:py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3 md:gap-5">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                                        <Calendar size={isMobile ? 24 : 28} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Detail Proyeksi Bulanan</p>
                                        <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3 truncate">
                                            {data.forecast[modalIndex].month}
                                            <MonthTypeBadge type={data.forecast[modalIndex].monthType} />
                                        </h2>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setModalIndex(null)}
                                    className="p-3 md:p-4 bg-white text-slate-400 hover:text-rose-500 rounded-2xl md:rounded-3xl transition-all shadow-sm border border-slate-100 hover:border-rose-100 group shrink-0"
                                >
                                    <X size={isMobile ? 20 : 24} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                    {/* Inflow Section */}
                                    <DetailSection
                                        icon={ArrowUpCircle} title="Invoice & Masukan" colorClass="text-emerald-500"
                                        items={[
                                            ...(data.forecast[modalIndex].breakdown.actualIn > 0 ? [{
                                                number: 'Realisasi Kas (Actual In)',
                                                grandTotal: data.forecast[modalIndex].breakdown.actualIn,
                                                status: 'Lunas (Jurnal)',
                                                paymentType: 'CASH'
                                            } as any] : []),
                                            ...data.forecast[modalIndex].details.invoices
                                        ]} 
                                        emptyMsg="Tidak ada proyeksi pemasukan"
                                        renderItem={(item: InvoiceDetail, i) => {
                                            const isCash = item.paymentType === 'CASH';
                                            return (
                                                <div key={i} className="flex flex-col p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-black text-slate-700">{item.number}</span>
                                                        {item.isOverdue && !isCash && (
                                                            <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg animate-pulse">OVERDUE</span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isCash ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isCash ? 'Lunas (Cash)' : item.status}
                                                        </span>
                                                        <span className="text-sm font-black text-slate-900">{fmt(item.grandTotal)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />

                                    {/* Outflow Section */}
                                    <DetailSection
                                        icon={ArrowDownCircle} title="Tagihan Vendor" colorClass="text-rose-500"
                                        items={[
                                            ...(data.forecast[modalIndex].breakdown.actualOut > 0 ? [{
                                                number: 'Realisasi Kas (Actual Out)',
                                                grandTotal: data.forecast[modalIndex].breakdown.actualOut,
                                                status: 'Lunas (Jurnal)',
                                                paymentType: 'CASH'
                                            } as any] : []),
                                            ...data.forecast[modalIndex].details.bills
                                        ]} 
                                        emptyMsg="Tidak ada proyeksi tagihan"
                                        renderItem={(item: BillDetail, i) => {
                                            const isCash = item.paymentType === 'CASH';
                                            return (
                                                <div key={i} className="flex flex-col p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-rose-200 transition-all shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-black text-slate-700">{item.number}</span>
                                                        {item.isOverdue && !isCash && (
                                                            <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg animate-pulse">OVERDUE</span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isCash ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {isCash ? 'Lunas (Cash)' : item.status}
                                                        </span>
                                                        <span className="text-sm font-black text-slate-900">{fmt(item.grandTotal)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />

                                    {/* OpEx Section */}
                                    <DetailSection
                                        icon={Building2} title="Biaya Operasional" colorClass="text-orange-500"
                                        items={data.forecast[modalIndex].details.opex} 
                                        emptyMsg="Tidak ada biaya terencana"
                                        renderItem={(exp: OpexDetail, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-orange-50/20 border border-orange-100/30 hover:bg-white hover:border-orange-200 transition-all">
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{exp.name}</p>
                                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">{exp.category}</p>
                                                </div>
                                                <p className="text-sm font-black text-orange-700">{fmt(exp.amount)}</p>
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer Summary */}
                            <div className="px-6 md:px-10 py-6 md:py-8 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between text-white gap-6">
                                <div className="flex gap-8 md:gap-12">
                                    <div>
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Masuk</p>
                                        <p className="text-lg md:text-xl font-black text-emerald-400">+{fmt(data.forecast[modalIndex].inflow)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Keluar</p>
                                        <p className="text-lg md:text-xl font-black text-rose-400">-{fmt(data.forecast[modalIndex].outflow)}</p>
                                    </div>
                                </div>
                                <div className="md:text-right">
                                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Akhir Bulan</p>
                                    <p className="text-xl md:text-2xl font-black">{fmt(data.forecast[modalIndex].closingBalance)}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
