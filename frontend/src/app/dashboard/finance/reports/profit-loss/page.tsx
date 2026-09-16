"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    TrendingUp, Printer, Download, RefreshCw, TrendingDown,
    DollarSign, Percent, FileText, Filter, ChevronDown, ChevronUp,
    ArrowUpRight, ArrowDownRight, Search, Calendar, Check,
    Layers, PieChart, SlidersHorizontal, Eye, EyeOff
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

// Format currency with Rp prefix
const formatCurrency = (value: number): string => {
    const isNegative = value < 0
    const absValue = Math.abs(value)
    const formatted = absValue.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return isNegative ? `(Rp ${formatted})` : `Rp ${formatted}`
}

// Format number without Rp prefix
const formatNumber = (value: number): string => {
    const isNegative = value < 0
    const absValue = Math.abs(value)
    const formatted = absValue.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    return isNegative ? `(${formatted})` : formatted
}

const formatDateToISO = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    const [searchQuery, setSearchQuery] = useState('')
    const [showPercentCol, setShowPercentCol] = useState(true)
    const [activePreset, setActivePreset] = useState<string>('ytd')

    // Section collapse state
    const [collapsed, setCollapsed] = useState({
        revenue: false,
        cogs: false,
        expenses: false,
        others: false
    })

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: ''
    })

    // Presets handler
    const applyPreset = (preset: 'today' | 'this_month' | 'last_month' | 'quarter' | 'ytd') => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (preset === 'today') {
            start = now
            end = now
        } else if (preset === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = now
        } else if (preset === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            end = new Date(now.getFullYear(), now.getMonth(), 0)
        } else if (preset === 'quarter') {
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3
            start = new Date(now.getFullYear(), quarterMonth, 1)
            end = now
        } else if (preset === 'ytd') {
            start = new Date(now.getFullYear(), 0, 1)
            end = now
        }

        setActivePreset(preset)
        setFilters({
            startDate: formatDateToISO(start),
            endDate: formatDateToISO(end)
        })
    }

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
        const today = formatDateToISO(d)
        const firstOfYear = formatDateToISO(new Date(d.getFullYear(), 0, 1))
        setFilters({
            startDate: firstOfYear,
            endDate: today
        })
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (isMounted && filters.startDate && filters.endDate) {
            loadData()
        }
    }, [isMounted, filters.startDate, filters.endDate, loadData])

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
    const opexRatio = totalOperatingRevenue > 0 ? (totalOperatingExpenses / totalOperatingRevenue) * 100 : 0
    const cogsRatio = totalOperatingRevenue > 0 ? (totalCOGS / totalOperatingRevenue) * 100 : 0
    const netMargin = totalOperatingRevenue > 0 ? (netProfit / totalOperatingRevenue) * 100 : 0

    // Filter accounts by search term
    const filterAccounts = (accounts: Account[] = []) => {
        if (!searchQuery.trim()) return accounts
        const q = searchQuery.toLowerCase()
        return accounts.filter(a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    }

    const filteredRevenue = useMemo(() => filterAccounts(data.operatingRevenue), [data.operatingRevenue, searchQuery])
    const filteredCOGS = useMemo(() => filterAccounts(data.cogs), [data.cogs, searchQuery])
    const filteredExpenses = useMemo(() => filterAccounts(data.operatingExpenses), [data.operatingExpenses, searchQuery])
    const filteredOtherIncome = useMemo(() => filterAccounts(data.otherIncome), [data.otherIncome, searchQuery])
    const filteredOtherExpenses = useMemo(() => filterAccounts(data.otherExpenses), [data.otherExpenses, searchQuery])

    const allCollapsed = collapsed.revenue && collapsed.cogs && collapsed.expenses && collapsed.others
    const toggleAllSections = () => {
        const nextState = !allCollapsed
        setCollapsed({
            revenue: nextState,
            cogs: nextState,
            expenses: nextState,
            others: nextState
        })
    }

    // Export to CSV
    const exportToCSV = () => {
        const rows: (string | number)[][] = [
            ['LAPORAN LABA RUGI (INCOME STATEMENT)'],
            [`Periode: ${filters.startDate} s/d ${filters.endDate}`],
            ['Dicetak Pada: ' + new Date().toLocaleString('id-ID')],
            [''],
            ['Kategori / Kode', 'Nama Akun', 'Saldo (IDR)', '% Terhadap Pendapatan']
        ]

        // Revenue
        rows.push(['1. PENDAPATAN OPERASIONAL', '', '', ''])
        data.operatingRevenue.forEach(acc => {
            const pct = totalOperatingRevenue ? ((acc.balance / totalOperatingRevenue) * 100).toFixed(2) + '%' : '0%'
            rows.push([acc.code, `"${acc.name.replace(/"/g, '""')}"`, acc.balance, pct])
        })
        rows.push(['Subtotal Pendapatan Operasional', '', totalOperatingRevenue, '100.00%'])
        rows.push([''])

        // COGS
        rows.push(['2. HARGA POKOK PENJUALAN (HPP)', '', '', ''])
        data.cogs.forEach(acc => {
            const pct = totalOperatingRevenue ? ((acc.balance / totalOperatingRevenue) * 100).toFixed(2) + '%' : '0%'
            rows.push([acc.code, `"${acc.name.replace(/"/g, '""')}"`, acc.balance, pct])
        })
        rows.push(['Subtotal HPP', '', totalCOGS, cogsRatio.toFixed(2) + '%'])
        rows.push(['LABA KOTOR (GROSS PROFIT)', '', grossProfit, grossMargin.toFixed(2) + '%'])
        rows.push([''])

        // Operating Expenses
        rows.push(['3. BEBAN OPERASIONAL', '', '', ''])
        data.operatingExpenses.forEach(acc => {
            const pct = totalOperatingRevenue ? ((acc.balance / totalOperatingRevenue) * 100).toFixed(2) + '%' : '0%'
            rows.push([acc.code, `"${acc.name.replace(/"/g, '""')}"`, acc.balance, pct])
        })
        rows.push(['Subtotal Beban Operasional', '', totalOperatingExpenses, opexRatio.toFixed(2) + '%'])
        rows.push(['LABA OPERASIONAL (EBIT)', '', operatingIncome, totalOperatingRevenue ? ((operatingIncome / totalOperatingRevenue) * 100).toFixed(2) + '%' : '0%'])
        rows.push([''])

        // Others
        rows.push(['4. PENDAPATAN & BEBAN LAINNYA', '', '', ''])
        data.otherIncome.forEach(acc => {
            rows.push([acc.code, `"${acc.name.replace(/"/g, '""')}" (Pendapatan Lain)`, acc.balance, ''])
        })
        data.otherExpenses.forEach(acc => {
            rows.push([acc.code, `"${acc.name.replace(/"/g, '""')}" (Beban Lain)`, -acc.balance, ''])
        })
        rows.push(['Subtotal Bersih Lainnya', '', totalOtherIncome - totalOtherExpenses, ''])
        rows.push([''])

        // Net Profit
        rows.push(['LABA (RUGI) BERSIH / NET PROFIT', '', netProfit, netMargin.toFixed(2) + '%'])

        const csvString = rows.map(r => r.join(',')).join('\r\n')
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Laba_Rugi_${filters.startDate}_sd_${filters.endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    if (!isMounted) return null

    const totalAccountsCount = (data.operatingRevenue?.length || 0) +
        (data.cogs?.length || 0) +
        (data.operatingExpenses?.length || 0) +
        (data.otherIncome?.length || 0) +
        (data.otherExpenses?.length || 0)

    return (
        <div className="p-3 md:p-6 space-y-4 font-inter max-w-full mx-auto pb-24 md:pb-12 text-slate-800">
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs print:border-none print:p-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                                Laporan Laba Rugi
                            </h1>
                            <span className="hidden sm:inline-flex text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Income Statement
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Periode: <span className="font-semibold text-slate-700">{filters.startDate || '—'}</span> s/d <span className="font-semibold text-slate-700">{filters.endDate || '—'}</span>
                        </p>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto print:hidden">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        title="Segarkan Data"
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-lg transition-colors border border-slate-200/80 bg-white"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>
                    <button
                        onClick={() => window.print()}
                        title="Cetak Laporan"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg transition-colors"
                    >
                        <Printer size={14} />
                        <span className="hidden md:inline">Cetak</span>
                    </button>
                    <button
                        onClick={exportToCSV}
                        title="Unduh file CSV"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-indigo-600 rounded-lg transition-all shadow-xs"
                    >
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Compact Filter Toolbar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Date Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                            <Calendar size={13} />
                            Periode:
                        </span>
                        <button
                            onClick={() => applyPreset('this_month')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${activePreset === 'this_month' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'}`}
                        >
                            Bulan Ini
                        </button>
                        <button
                            onClick={() => applyPreset('last_month')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${activePreset === 'last_month' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'}`}
                        >
                            Bulan Lalu
                        </button>
                        <button
                            onClick={() => applyPreset('quarter')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${activePreset === 'quarter' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'}`}
                        >
                            Kuartal Ini
                        </button>
                        <button
                            onClick={() => applyPreset('ytd')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${activePreset === 'ytd' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'}`}
                        >
                            Tahun Ini (YTD)
                        </button>
                    </div>

                    {/* Custom Date Pickers */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Dari</span>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={e => {
                                    setActivePreset('custom')
                                    setFilters({ ...filters, startDate: e.target.value })
                                }}
                                className="bg-transparent border-none text-slate-800 font-medium focus:outline-hidden text-xs cursor-pointer p-0"
                            />
                        </div>
                        <span className="text-slate-300 text-xs">—</span>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Sampai</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={e => {
                                    setActivePreset('custom')
                                    setFilters({ ...filters, endDate: e.target.value })
                                }}
                                className="bg-transparent border-none text-slate-800 font-medium focus:outline-hidden text-xs cursor-pointer p-0"
                            />
                        </div>
                        <button
                            onClick={loadData}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200/60 shrink-0"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>

            {/* Financial Health Overview: 5 Compact KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 md:gap-3">
                {/* 1. Total Revenue */}
                <div className="bg-white p-3 md:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan</span>
                        <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <DollarSign size={12} />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight truncate font-mono">
                            {formatCurrency(totalOperatingRevenue)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Basis pendapatan operasional
                        </p>
                    </div>
                </div>

                {/* 2. Total COGS */}
                <div className="bg-white p-3 md:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Pokok (HPP)</span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-mono">
                            {cogsRatio.toFixed(1)}%
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight truncate font-mono">
                            {formatCurrency(totalCOGS)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Harga Pokok Penjualan
                        </p>
                    </div>
                </div>

                {/* 3. Gross Profit */}
                <div className="bg-white p-3 md:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laba Kotor</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">
                            Margin {grossMargin.toFixed(1)}%
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight truncate font-mono">
                            {formatCurrency(grossProfit)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Pendapatan dikurangi HPP
                        </p>
                    </div>
                </div>

                {/* 4. Operating Expenses */}
                <div className="bg-white p-3 md:p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Opex</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                            {opexRatio.toFixed(1)}%
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight truncate font-mono">
                            {formatCurrency(totalOperatingExpenses)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Beban operasional usaha
                        </p>
                    </div>
                </div>

                {/* 5. Net Profit (Highlight) */}
                <div className={`col-span-2 md:col-span-1 p-3 md:p-3.5 rounded-xl border shadow-xs flex flex-col justify-between transition-all ${
                    netProfit >= 0
                        ? 'bg-linear-to-br from-emerald-500/10 to-teal-500/5 border-emerald-300/80'
                        : 'bg-linear-to-br from-rose-500/10 to-pink-500/5 border-rose-300/80'
                }`}>
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {netProfit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded font-mono ${
                                netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}>
                                {netMargin.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className={`text-base md:text-lg font-black tracking-tight truncate font-mono ${
                            netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                            {formatCurrency(netProfit)}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
                            netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                            {netProfit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {netProfit >= 0 ? 'Surplus Bersih' : 'Defisit Periode'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Income Distribution Visual Ratio Bar */}
            {totalOperatingRevenue > 0 && (
                <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs print:hidden">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <PieChart size={13} className="text-indigo-600" />
                            Alokasi Setiap Rupiah Pendapatan:
                        </span>
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-400" /> HPP ({cogsRatio.toFixed(1)}%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-400" /> Opex ({opexRatio.toFixed(1)}%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-600'}`} />
                                Laba Bersih ({netMargin.toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    {/* Progress multi-segment */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                            style={{ width: `${Math.min(cogsRatio, 100)}%` }}
                            className="h-full bg-rose-400 transition-all duration-500"
                            title={`HPP: ${cogsRatio.toFixed(1)}%`}
                        />
                        <div
                            style={{ width: `${Math.min(opexRatio, 100)}%` }}
                            className="h-full bg-amber-400 transition-all duration-500"
                            title={`Beban Operasional: ${opexRatio.toFixed(1)}%`}
                        />
                        {netProfit > 0 && (
                            <div
                                style={{ width: `${Math.min(netMargin, 100)}%` }}
                                className="h-full bg-emerald-500 transition-all duration-500"
                                title={`Laba Bersih: ${netMargin.toFixed(1)}%`}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Statement Container & Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Search & Table Tool Controls */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
                    <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[200px]">
                        <div className="relative w-full">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama atau kode akun..."
                                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold bg-slate-100 px-1 rounded"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle % of revenue column */}
                        <button
                            onClick={() => setShowPercentCol(!showPercentCol)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                                showPercentCol
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Tampilkan rasio persentase terhadap pendapatan"
                        >
                            <Percent size={12} />
                            <span>% Pendapatan</span>
                        </button>

                        {/* Collapse / Expand all toggle */}
                        <button
                            onClick={toggleAllSections}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                            <Layers size={12} />
                            <span>{allCollapsed ? 'Buka Semua' : 'Ciutkan Semua'}</span>
                        </button>

                        <span className="text-[11px] text-slate-400 border-l border-slate-200 pl-2">
                            {totalAccountsCount} akun
                        </span>
                    </div>
                </div>

                {/* Financial Statement Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                                <th className="px-4 py-2 text-left w-24">Kode</th>
                                <th className="px-3 py-2 text-left">Deskripsi Akun</th>
                                {showPercentCol && (
                                    <th className="px-3 py-2 text-right w-24">% Pendapatan</th>
                                )}
                                <th className="px-4 py-2 text-right w-44">Jumlah (IDR)</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={showPercentCol ? 4 : 3} className="py-16 text-center">
                                        <RefreshCw className="animate-spin text-indigo-600 mx-auto w-6 h-6 opacity-40 mb-2" />
                                        <p className="text-xs font-medium text-slate-400">Memuat rincian laporan laba rugi...</p>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {/* ======================================================== */}
                                    {/* 1. REVENUE SECTION */}
                                    {/* ======================================================== */}
                                    <tr
                                        onClick={() => setCollapsed(prev => ({ ...prev, revenue: !prev.revenue }))}
                                        className="bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer select-none transition-colors border-t border-b border-indigo-100/80"
                                    >
                                        <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {collapsed.revenue ? <ChevronDown size={14} className="text-indigo-600" /> : <ChevronUp size={14} className="text-indigo-600" />}
                                                    <span className="font-bold text-xs text-indigo-950 uppercase tracking-wide">
                                                        1. Pendapatan Operasional
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.2 rounded-full">
                                                        {filteredRevenue.length} akun
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {showPercentCol && (
                                                        <span className="text-[11px] font-semibold text-indigo-600 font-mono">100.0%</span>
                                                    )}
                                                    <span className="font-mono font-bold text-xs text-indigo-900">
                                                        {formatNumber(totalOperatingRevenue)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {!collapsed.revenue && (
                                        filteredRevenue.length === 0 ? (
                                            <tr>
                                                <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-3 text-center text-slate-400 text-xs italic">
                                                    {searchQuery ? 'Tidak ada akun pendapatan yang cocok' : 'Tidak ada transaksi pendapatan pada periode ini'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRevenue.map(acc => {
                                                const pct = totalOperatingRevenue > 0 ? (acc.balance / totalOperatingRevenue) * 100 : 0
                                                return (
                                                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 font-medium">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                                                {acc.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700 font-medium pl-4">
                                                            {acc.name}
                                                        </td>
                                                        {showPercentCol && (
                                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-400">
                                                                {pct.toFixed(1)}%
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                                                            {formatNumber(acc.balance)}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )
                                    )}

                                    {/* Subtotal Revenue Row */}
                                    <tr className="bg-slate-50/60 font-semibold border-b border-slate-200 text-slate-800">
                                        <td className="px-4 py-2 text-[11px] text-slate-400 italic" colSpan={2}>
                                            Total Pendapatan Operasional
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-indigo-600">100.0%</td>
                                        )}
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
                                            {formatNumber(totalOperatingRevenue)}
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* 2. COGS SECTION */}
                                    {/* ======================================================== */}
                                    <tr
                                        onClick={() => setCollapsed(prev => ({ ...prev, cogs: !prev.cogs }))}
                                        className="bg-rose-50/40 hover:bg-rose-50/60 cursor-pointer select-none transition-colors border-t border-b border-rose-100/70"
                                    >
                                        <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {collapsed.cogs ? <ChevronDown size={14} className="text-rose-600" /> : <ChevronUp size={14} className="text-rose-600" />}
                                                    <span className="font-bold text-xs text-rose-950 uppercase tracking-wide">
                                                        2. Beban Pokok Penjualan (HPP / COGS)
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-100/60 px-1.5 py-0.2 rounded-full">
                                                        {filteredCOGS.length} akun
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {showPercentCol && (
                                                        <span className="text-[11px] font-semibold text-rose-600 font-mono">{cogsRatio.toFixed(1)}%</span>
                                                    )}
                                                    <span className="font-mono font-bold text-xs text-rose-900">
                                                        {formatNumber(totalCOGS)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {!collapsed.cogs && (
                                        filteredCOGS.length === 0 ? (
                                            <tr>
                                                <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-3 text-center text-slate-400 text-xs italic">
                                                    {searchQuery ? 'Tidak ada akun HPP yang cocok' : 'Tidak ada beban pokok penjualan pada periode ini'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCOGS.map(acc => {
                                                const pct = totalOperatingRevenue > 0 ? (acc.balance / totalOperatingRevenue) * 100 : 0
                                                return (
                                                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 font-medium">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                                                {acc.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700 font-medium pl-4">
                                                            {acc.name}
                                                        </td>
                                                        {showPercentCol && (
                                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-rose-500">
                                                                {pct.toFixed(1)}%
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                                                            {formatNumber(acc.balance)}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )
                                    )}

                                    {/* Subtotal COGS Row */}
                                    <tr className="bg-slate-50/60 font-semibold border-b border-slate-200 text-slate-800">
                                        <td className="px-4 py-2 text-[11px] text-slate-400 italic" colSpan={2}>
                                            Total Beban Pokok Penjualan
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-rose-600">{cogsRatio.toFixed(1)}%</td>
                                        )}
                                        <td className="px-4 py-2 text-right font-mono font-bold text-rose-700">
                                            ({formatNumber(totalCOGS)})
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* MILESTONE: LABA KOTOR (GROSS PROFIT) */}
                                    {/* ======================================================== */}
                                    <tr className="bg-emerald-500/15 border-t border-b-2 border-emerald-300">
                                        <td colSpan={2} className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                <span className="font-extrabold text-xs text-emerald-950 uppercase tracking-wide">
                                                    Laba Kotor (Gross Profit)
                                                </span>
                                            </div>
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-xs text-emerald-800">
                                                {grossMargin.toFixed(1)}%
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5 text-right font-mono font-black text-sm text-emerald-950">
                                            {formatCurrency(grossProfit)}
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* 3. OPERATING EXPENSES SECTION */}
                                    {/* ======================================================== */}
                                    <tr
                                        onClick={() => setCollapsed(prev => ({ ...prev, expenses: !prev.expenses }))}
                                        className="bg-amber-50/40 hover:bg-amber-50/60 cursor-pointer select-none transition-colors border-t border-b border-amber-100/70"
                                    >
                                        <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {collapsed.expenses ? <ChevronDown size={14} className="text-amber-700" /> : <ChevronUp size={14} className="text-amber-700" />}
                                                    <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                                                        3. Beban Operasional (Operating Expenses)
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded-full">
                                                        {filteredExpenses.length} akun
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {showPercentCol && (
                                                        <span className="text-[11px] font-semibold text-amber-700 font-mono">{opexRatio.toFixed(1)}%</span>
                                                    )}
                                                    <span className="font-mono font-bold text-xs text-amber-900">
                                                        {formatNumber(totalOperatingExpenses)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {!collapsed.expenses && (
                                        filteredExpenses.length === 0 ? (
                                            <tr>
                                                <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-3 text-center text-slate-400 text-xs italic">
                                                    {searchQuery ? 'Tidak ada akun beban yang cocok' : 'Tidak ada beban operasional pada periode ini'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredExpenses.map(acc => {
                                                const pct = totalOperatingRevenue > 0 ? (acc.balance / totalOperatingRevenue) * 100 : 0
                                                return (
                                                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 font-medium">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                                                                {acc.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700 font-medium pl-4">
                                                            {acc.name}
                                                        </td>
                                                        {showPercentCol && (
                                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-amber-600">
                                                                {pct.toFixed(1)}%
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                                                            {formatNumber(acc.balance)}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )
                                    )}

                                    {/* Subtotal Operating Expenses Row */}
                                    <tr className="bg-slate-50/60 font-semibold border-b border-slate-200 text-slate-800">
                                        <td className="px-4 py-2 text-[11px] text-slate-400 italic" colSpan={2}>
                                            Total Beban Operasional
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-amber-700">{opexRatio.toFixed(1)}%</td>
                                        )}
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                                            ({formatNumber(totalOperatingExpenses)})
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* MILESTONE: LABA OPERASIONAL (EBIT) */}
                                    {/* ======================================================== */}
                                    <tr className="bg-slate-100/90 border-t border-b-2 border-slate-300">
                                        <td colSpan={2} className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-4 bg-slate-700 rounded-full" />
                                                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                                                    Laba Operasional (EBIT)
                                                </span>
                                            </div>
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-xs text-slate-700">
                                                {totalOperatingRevenue > 0 ? ((operatingIncome / totalOperatingRevenue) * 100).toFixed(1) + '%' : '0%'}
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5 text-right font-mono font-black text-sm text-slate-900">
                                            {formatCurrency(operatingIncome)}
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* 4. OTHER INCOME & EXPENSES */}
                                    {/* ======================================================== */}
                                    <tr
                                        onClick={() => setCollapsed(prev => ({ ...prev, others: !prev.others }))}
                                        className="bg-blue-50/40 hover:bg-blue-50/60 cursor-pointer select-none transition-colors border-t border-b border-blue-100/70"
                                    >
                                        <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {collapsed.others ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronUp size={14} className="text-blue-600" />}
                                                    <span className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                                                        4. Pendapatan & Beban Lainnya (Non-Operasional)
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/60 px-1.5 py-0.2 rounded-full">
                                                        {filteredOtherIncome.length + filteredOtherExpenses.length} akun
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {showPercentCol && (
                                                        <span className="text-[11px] font-semibold text-blue-600 font-mono">—</span>
                                                    )}
                                                    <span className="font-mono font-bold text-xs text-blue-900">
                                                        {formatNumber(totalOtherIncome - totalOtherExpenses)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    {!collapsed.others && (
                                        (filteredOtherIncome.length === 0 && filteredOtherExpenses.length === 0) ? (
                                            <tr>
                                                <td colSpan={showPercentCol ? 4 : 3} className="px-4 py-3 text-center text-slate-400 text-xs italic">
                                                    {searchQuery ? 'Tidak ada akun non-operasional yang cocok' : 'Tidak ada pendapatan atau beban non-operasional'}
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {filteredOtherIncome.map(acc => (
                                                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 font-medium">
                                                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                                {acc.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700 font-medium pl-4 flex items-center gap-2">
                                                            <span>{acc.name}</span>
                                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">Pendapatan Lain</span>
                                                        </td>
                                                        {showPercentCol && (
                                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-400">—</td>
                                                        )}
                                                        <td className="px-4 py-2 text-right font-mono font-semibold text-emerald-700">
                                                            {formatNumber(acc.balance)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredOtherExpenses.map(acc => (
                                                    <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 font-medium">
                                                            <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                                                {acc.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-700 font-medium pl-4 flex items-center gap-2">
                                                            <span>{acc.name}</span>
                                                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded">Beban Lain</span>
                                                        </td>
                                                        {showPercentCol && (
                                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-400">—</td>
                                                        )}
                                                        <td className="px-4 py-2 text-right font-mono font-semibold text-rose-700">
                                                            ({formatNumber(acc.balance)})
                                                        </td>
                                                    </tr>
                                                ))}
                                            </>
                                        )
                                    )}

                                    {/* Subtotal Other Row */}
                                    <tr className="bg-slate-50/60 font-semibold border-b border-slate-200 text-slate-800">
                                        <td className="px-4 py-2 text-[11px] text-slate-400 italic" colSpan={2}>
                                            Total Pendapatan / (Beban) Bersih Lainnya
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-400">—</td>
                                        )}
                                        <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                                            {formatNumber(totalOtherIncome - totalOtherExpenses)}
                                        </td>
                                    </tr>

                                    {/* ======================================================== */}
                                    {/* FINAL ROW: NET PROFIT / LOSS */}
                                    {/* ======================================================== */}
                                    <tr className={`${
                                        netProfit >= 0
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-rose-600 text-white shadow-xs'
                                    }`}>
                                        <td colSpan={2} className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                <div>
                                                    <p className="text-xs md:text-sm font-black uppercase tracking-wider">
                                                        {netProfit >= 0 ? 'Laba Bersih Tahun Berjalan (Net Profit)' : 'Rugi Bersih Periode Berjalan (Net Loss)'}
                                                    </p>
                                                    <p className="text-[10px] text-white/80 font-normal">
                                                        Laba Operasional ditambah Total Non-Operasional Bersih
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {showPercentCol && (
                                            <td className="px-3 py-3.5 text-right font-mono font-black text-xs md:text-sm text-white/90">
                                                {netMargin.toFixed(1)}%
                                            </td>
                                        )}
                                        <td className="px-4 py-3.5 text-right font-mono font-black text-base md:text-xl text-white">
                                            {formatCurrency(netProfit)}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Friendly Footer Notice */}
            <div className="hidden print:block text-center text-xs text-slate-400 pt-6">
                Laporan ini dicetak secara otomatis dari Axon Financial Ecosystem pada {new Date().toLocaleString('id-ID')}
            </div>
        </div>
    )
}
