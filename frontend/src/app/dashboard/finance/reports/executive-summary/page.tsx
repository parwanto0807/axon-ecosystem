"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, Wallet, ShieldAlert,
    PieChart, ArrowUpRight, ArrowDownRight, Printer, Download, RefreshCw,
    AlertTriangle, CheckCircle2, Info, ArrowRight, Layers, FileText
} from "lucide-react"
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

const fmt = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0)
}

export default function ExecutiveSummaryPage() {
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    const fetchSummary = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/executive-summary?period=${period}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (e) {
            console.error('Error fetching executive summary', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSummary()
    }, [period])

    const handlePrint = () => {
        window.print()
    }

    const handleExportCSV = () => {
        if (!data) return
        const rows = [
            ["Metric", "Nilai (IDR)", "Pertumbuhan (%)"],
            ["Total Pendapatan", data.highlights?.revenue?.value, data.highlights?.revenue?.growth],
            ["Laba Bersih", data.highlights?.netProfit?.value, data.highlights?.netProfit?.growth],
            ["Total Aset", data.highlights?.totalAssets?.value, data.highlights?.totalAssets?.growth],
            ["Kas & Setara Kas", data.highlights?.cashAndEquivalents?.value, "-"],
            ["Arus Kas Operasi Bersih", data.highlights?.netOperatingCashFlow?.value, "-"],
            ["Total Liabilitas", data.highlights?.totalLiabilities?.value, data.highlights?.totalLiabilities?.growth]
        ]
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `Executive_Summary_${period}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading && !data) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={32} className="animate-spin text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-500">Memuat Executive Summary...</p>
                </div>
            </div>
        )
    }

    const h = data?.highlights || {}
    const bs = data?.balanceSheetSummary || {}
    const isSum = data?.incomeStatementSummary || {}
    const cf = data?.cashFlowSummary || {}

    // Doughnut Chart Data for Assets & Capital Structure
    const assetDoughnutData = {
        labels: ['Aset Lancar', 'Aset Tidak Lancar'],
        datasets: [{
            data: [bs.currentAssets || 0, bs.nonCurrentAssets || 0],
            backgroundColor: ['#6366f1', '#cbd5e1'],
            borderWidth: 0
        }]
    }

    const capitalDoughnutData = {
        labels: ['Liabilitas (Utang)', 'Ekuitas (Modal)'],
        datasets: [{
            data: [bs.totalLiabilities || 0, bs.totalEquity || 0],
            backgroundColor: ['#f43f5e', '#10b981'],
            borderWidth: 0
        }]
    }

    // Monthly Trend Chart Data
    const trendData = {
        labels: data?.monthlyTrend?.map((t: any) => t.month) || [],
        datasets: [
            {
                label: 'Pendapatan',
                data: data?.monthlyTrend?.map((t: any) => t.revenue) || [],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.3
            },
            {
                label: 'Laba Bersih',
                data: data?.monthlyTrend?.map((t: any) => t.netProfit) || [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3
            }
        ]
    }

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-8 w-full font-inter print:p-0">
            {/* ── HEADER & CONTROLS ──────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                            Executive View
                        </span>
                        {data?.hasUnpostedDrafts && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                <AlertTriangle size={12} /> {data.unpostedCount} Draft Pending
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                        Executive Summary Laporan Keuangan
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                        Konsolidasi ringkasan kesehatan finansial perusahaan dari Neraca, Laba Rugi & Arus Kas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Period Tabs */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                        {(['month', 'quarter', 'year'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                                    period === p
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {p === 'month' ? 'Bulan Ini' : p === 'quarter' ? 'Kuartal Ini' : 'Tahun Ini'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchSummary}
                        className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download size={14} /> Excel/CSV
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
                    >
                        <Printer size={14} /> Cetak / PDF
                    </button>
                </div>
            </div>

            {/* PRINT-ONLY HEADER */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-2xl font-black text-slate-900">EXECUTIVE SUMMARY FINANCIAL REPORT</h1>
                <p className="text-xs text-slate-500">Axon Ecosystem • Per Tanggal: {new Date(data?.endDate || Date.now()).toLocaleDateString('id-ID')}</p>
            </div>

            {/* ── UNPOSTED DRAFT ALERT ───────────────────────────────────────────── */}
            {data?.hasUnpostedDrafts && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 print:hidden">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-900">
                        <p className="font-bold">Perhatian: Terdapat {data.unpostedCount} jurnal belum difinalisasi (Draft)</p>
                        <p className="mt-0.5 text-amber-700 font-medium">
                            Angka pada ringkasan ini hanya menghitung transaksi final/posted. Finalisasikan transaksi draft agar angka laporan konsisten.
                        </p>
                    </div>
                </div>
            )}

            {/* ── 6 KEY HIGHLIGHT CARDS ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* 1. Total Revenue */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Total Pendapatan</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 mt-2">{fmt(h.revenue?.value)}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold">
                        {h.revenue?.growth >= 0 ? (
                            <span className="text-emerald-600 flex items-center"><ArrowUpRight size={14} /> +{h.revenue?.growth?.toFixed(1)}%</span>
                        ) : (
                            <span className="text-rose-600 flex items-center"><ArrowDownRight size={14} /> {h.revenue?.growth?.toFixed(1)}%</span>
                        )}
                        <span className="text-slate-400 font-normal">vs periode lalu</span>
                    </div>
                </div>

                {/* 2. Net Profit */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Laba Bersih</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 mt-2">{fmt(h.netProfit?.value)}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold">
                        {h.netProfit?.growth >= 0 ? (
                            <span className="text-emerald-600 flex items-center"><ArrowUpRight size={14} /> +{h.netProfit?.growth?.toFixed(1)}%</span>
                        ) : (
                            <span className="text-rose-600 flex items-center"><ArrowDownRight size={14} /> {h.netProfit?.growth?.toFixed(1)}%</span>
                        )}
                        <span className="text-slate-400 font-normal">vs periode lalu</span>
                    </div>
                </div>

                {/* 3. Kas & Setara Kas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Kas & Setara Kas</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <Wallet size={16} />
                        </div>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 mt-2">{fmt(h.cashAndEquivalents?.value)}</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Saldo likuid siap pakai</p>
                </div>

                {/* 4. Arus Kas Operasi */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Kas Operasi Bersih</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <BarChart3 size={16} />
                        </div>
                    </div>
                    <p className={`text-lg md:text-2xl font-black mt-2 ${h.netOperatingCashFlow?.value >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {fmt(h.netOperatingCashFlow?.value)}
                    </p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Kas riil dari bisnis utama</p>
                </div>

                {/* 5. Total Aset */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Total Aset</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <PieChart size={16} />
                        </div>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 mt-2">{fmt(h.totalAssets?.value)}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-slate-500">
                        <span>Modal Kerja:</span>
                        <span className="text-indigo-600 font-extrabold">{fmt(bs.workingCapital)}</span>
                    </div>
                </div>

                {/* 6. Total Liabilitas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Total Liabilitas (Utang)</span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <ShieldAlert size={16} />
                        </div>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 mt-2">{fmt(h.totalLiabilities?.value)}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-400">
                        <span>Ekuitas: {fmt(bs.totalEquity)}</span>
                    </div>
                </div>
            </div>

            {/* ── AUTOMATED NARRATIVE INSIGHTS ──────────────────────────────────── */}
            {data?.insights?.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Info className="text-indigo-600" size={18} />
                            Ringkasan Insight & Rekomendasi Otomatis
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            Rule-Based Engine
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.insights.map((item: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded-2xl border flex items-start gap-3 ${
                                item.type === 'POSITIVE' || item.type === 'HEALTHY'
                                    ? 'bg-emerald-50/50 border-emerald-200/60 text-emerald-950'
                                    : item.type === 'CRITICAL' || item.type === 'NEGATIVE'
                                    ? 'bg-rose-50/50 border-rose-200/60 text-rose-950'
                                    : 'bg-amber-50/50 border-amber-200/60 text-amber-950'
                            }`}>
                                {item.type === 'POSITIVE' || item.type === 'HEALTHY' ? (
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                ) : item.type === 'CRITICAL' || item.type === 'NEGATIVE' ? (
                                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                ) : (
                                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <h4 className="text-xs font-bold">{item.title}</h4>
                                    <p className="text-xs mt-0.5 font-medium leading-relaxed opacity-90">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CHARTS & BREAKDOWNS (2 COLUMNS) ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Statement Trend & Waterfall */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Tren Pendapatan & Laba Bersih</h3>
                                <p className="text-xs text-slate-400 font-medium">Performa 6 bulan terakhir</p>
                            </div>
                            <Link href="/dashboard/finance/reports/profit-loss" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 print:hidden">
                                Laporan Laba Rugi <ArrowRight size={12} />
                            </Link>
                        </div>
                        <div className="h-56 w-full">
                            <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>

                    {/* Waterfall breakdown */}
                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Margin Laba Kotor</span>
                            <p className="text-base font-black text-slate-900 mt-1">{isSum.grossProfitMargin || 0}%</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Margin Laba Bersih</span>
                            <p className="text-base font-black text-slate-900 mt-1">{isSum.netProfitMargin || 0}%</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Total HPP</span>
                            <p className="text-base font-black text-slate-900 mt-1">{fmt(isSum.totalCOGS)}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Beban Operasional</span>
                            <p className="text-base font-black text-slate-900 mt-1">{fmt(isSum.totalExpenses)}</p>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet Composition */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Struktur Neraca & Permodalan</h3>
                                <p className="text-xs text-slate-400 font-medium">Komposisi Aset, Liabilitas & Ekuitas</p>
                            </div>
                            <Link href="/dashboard/finance/reports/balance-sheet" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 print:hidden">
                                Laporan Neraca <ArrowRight size={12} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4 h-48 my-auto">
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-600 mb-2">Komposisi Aset</span>
                                <div className="h-36 w-full">
                                    <Doughnut data={assetDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-slate-600 mb-2">Liabilitas vs Ekuitas</span>
                                <div className="h-36 w-full">
                                    <Doughnut data={capitalDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500">Modal Kerja Bersih (Working Capital):</span>
                        <span className="font-extrabold text-indigo-600">{fmt(bs.workingCapital)}</span>
                    </div>
                </div>
            </div>

            {/* ── KEY FINANCIAL RATIOS TABLE ────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-4 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Rasio Keuangan Utama</h3>
                        <p className="text-xs text-slate-400 font-medium">Evaluasi tingkat kesehatan likuiditas, profitabilitas & solvabilitas</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="p-3">Nama Rasio</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3">Rumus Kalkulasi</th>
                                <th className="p-3 text-right">Nilai Saat Ini</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3">Keterangan / Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.ratios?.map((r: any) => (
                                <tr key={r.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-bold text-slate-900">{r.name}</td>
                                    <td className="p-3 text-slate-500 font-medium">{r.category}</td>
                                    <td className="p-3 text-slate-400 font-mono text-[11px]">{r.formula}</td>
                                    <td className="p-3 text-right font-black text-slate-900">
                                        {r.value} {r.isPercent ? '%' : ''}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                                            r.status === 'HEALTHY'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : r.status === 'WARNING'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : r.status === 'N/A'
                                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}>
                                            {r.status === 'HEALTHY' ? 'BAIK' : r.status === 'WARNING' ? 'WASPADA' : r.status === 'N/A' ? 'N/A' : 'KRITIS'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-500 font-medium">{r.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── FOOTER DRILL-DOWN LINKS ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                <Link href="/dashboard/finance/reports/balance-sheet" className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <PieChart size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Laporan Neraca Detail</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Buka perincian aset & utang</p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/dashboard/finance/reports/profit-loss" className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Laporan Laba Rugi Detail</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Buka perincian pendapatan & beban</p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/dashboard/finance/reports/cash-flow" className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Laporan Arus Kas Detail</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Buka perincian kas masuk & keluar</p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    )
}
