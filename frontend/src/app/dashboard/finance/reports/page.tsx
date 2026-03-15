"use client"

import { motion } from "framer-motion"
import {
    BarChart3, BookOpen, Activity, PieChart,
    TrendingUp, Waves, ArrowRight
} from "lucide-react"
import Link from "next/link"

const reports = [
    {
        title: "Buku Besar",
        description: "Detail transaksi per akun perkiraan (General Ledger)",
        icon: BookOpen,
        path: "/dashboard/finance/reports/ledger",
        color: "bg-blue-500"
    },
    {
        title: "Neraca Saldo",
        description: "Ringkasan saldo debit & kredit semua akun",
        icon: Activity,
        path: "/dashboard/finance/reports/trial-balance",
        color: "bg-indigo-500"
    },
    {
        title: "Neraca",
        description: "Laporan posisi keuangan (Aset, Liabilitas, Ekuitas)",
        icon: PieChart,
        path: "/dashboard/finance/reports/balance-sheet",
        color: "bg-emerald-500"
    },
    {
        title: "Laba Rugi",
        description: "Laporan kinerja keuangan (Pendapatan & Beban)",
        icon: TrendingUp,
        path: "/dashboard/finance/reports/profit-loss",
        color: "bg-orange-500"
    },
    {
        title: "Arus Kas",
        description: "Laporan pergerakan kas masuk dan keluar",
        icon: Waves,
        path: "/dashboard/finance/reports/cash-flow",
        color: "bg-cyan-500"
    },
    {
        title: "Proyeksi Arus Kas",
        description: "Estimasi arus kas masuk & keluar 1-6 bulan ke depan",
        icon: BarChart3,
        path: "/dashboard/finance/reports/cash-flow-forecast",
        color: "bg-purple-500"
    }
]

export default function ReportsDirectoryPage() {
    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 md:space-y-8 w-full font-inter max-w-7xl mx-auto pb-24 md:pb-8">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20 shrink-0">
                        <BarChart3 size={20} className="text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Laporan Keuangan</h1>
                        <p className="text-[10px] md:text-sm font-medium text-slate-400 mt-0.5 md:mt-1">Pusat pelaporan akuntansi dan keuangan perusahaan</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report, idx) => (
                    <Link key={report.path} href={report.path}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full cursor-pointer relative overflow-hidden"
                        >
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${report.color} flex items-center justify-center text-white shadow-lg mb-5 md:mb-6 group-hover:scale-110 transition-transform`}>
                                <report.icon size={24} className="md:w-7 md:h-7" />
                            </div>

                            <h2 className="text-lg md:text-xl font-black text-slate-900 mb-1.5 md:mb-2">{report.title}</h2>
                            <p className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed mb-6 md:mb-8 flex-1">
                                {report.description}
                            </p>

                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mt-auto">
                                View Report <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>

                            {/* Background Pattern */}
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <report.icon size={120} className="-mr-10 -mt-10" />
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>

            <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black mb-1.5 md:mb-2 tracking-tight">Sistem Akuntansi Otomatis</h2>
                        <p className="text-slate-400 text-[10px] md:text-sm max-w-xl leading-relaxed">
                            Setiap transaksi modul (Invoice, Expense, Stock) dalam ekosistem Axon secara otomatis menghasilkan jurnal akuntansi yang masuk ke laporan ini secara real-time.
                        </p>
                    </div>
                    <div className="flex w-full md:w-auto">
                        <div className="w-full md:w-auto px-4 md:px-6 py-3 md:py-4 bg-white/5 rounded-[1.5rem] md:rounded-3xl border border-white/10 text-center">
                            <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 md:mb-1">Status Engine</p>
                            <p className="text-lg md:text-xl font-black tracking-tight">ACTIVE</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
