"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardList,
    Search,
    Calendar,
    User,
    Package,
    ExternalLink,
    RefreshCw,
    X,
    Filter
} from "lucide-react"
import Link from "next/link"

interface ReportPhoto {
    id: string;
    url: string;
}

interface WorkOrderInfo {
    id: string;
    number: string;
    title: string;
    status: string;
}

interface Report {
    id: string;
    workOrderId: string;
    description: string;
    progress: number;
    reportedBy: string | null;
    date: string;
    photos: ReportPhoto[];
    workOrder: WorkOrderInfo;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('http://localhost:5000/api/reports')
            if (res.ok) {
                const data = await res.json()
                setReports(data)
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    const filteredReports = reports.filter(r =>
        r.workOrder.number.toLowerCase().includes(search.toLowerCase()) ||
        r.workOrder.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.reportedBy && r.reportedBy.toLowerCase().includes(search.toLowerCase())) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    )

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <ClipboardList className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Laporan Progress</h1>
                        <p className="text-[10px] md:text-sm text-slate-400 font-medium mt-0.5 md:mt-1">Pantau perkembangan pekerjaan lapangan</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari WO, Teknisi, Deskripsi..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <button onClick={fetchReports}
                        className="h-10 w-10 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600 flex items-center justify-center shrink-0">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Reports List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <RefreshCw className="animate-spin text-indigo-600" size={32} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Data Laporan...</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                        <Filter className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tidak Ada Laporan</h3>
                    <p className="text-slate-500 text-sm max-w-xs mt-1">Belum ada laporan progress yang sesuai dengan kriteria pencarian Anda.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredReports.map((report) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={report.id}
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden group hover:border-indigo-200 transition-all"
                        >
                            <div className="flex flex-col lg:flex-row">
                                {/* Left Side: WO Info & Header */}
                                <div className="p-6 lg:p-8 flex-1">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    {report.workOrder.number}
                                                </span>
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    {report.progress}% PROGRESS
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                                {report.workOrder.title}
                                            </h2>
                                        </div>
                                        <Link
                                            href={`/dashboard/operations/work-orders?id=${report.workOrderId}`}
                                            className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-indigo-600"
                                        >
                                            <ExternalLink size={18} />
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={14} className="text-indigo-400" />
                                                <span className="text-xs font-bold">{fmtDate(report.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <User size={14} className="text-indigo-400" />
                                                <span className="text-xs font-bold">{report.reportedBy || "Anonim"}</span>
                                            </div>
                                        </div>
                                        <div className="relative pt-1">
                                            <div className="flex mb-2 items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-black inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200/30">
                                                        Progress Kerja
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black inline-block text-indigo-600">
                                                        {report.progress}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${report.progress}%` }}
                                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                                                ></motion.div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                            {report.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Photos */}
                                {report.photos.length > 0 && (
                                    <div className="lg:w-80 p-6 lg:p-8 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Package size={14} className="text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Lampiran Foto ({report.photos.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {report.photos.map((photo) => (
                                                <button
                                                    key={photo.id}
                                                    onClick={() => setSelectedPhoto(`http://localhost:5000${photo.url}`)}
                                                    className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-all shadow-sm group/photo"
                                                >
                                                    <img
                                                        src={`http://localhost:5000${photo.url}`}
                                                        alt="Progress"
                                                        className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-500"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Photo Preview Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
                        >
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute -top-12 right-0 p-2 text-white hover:text-indigo-400 transition-colors"
                            >
                                <X size={32} />
                            </button>
                            <img src={selectedPhoto} alt="Full Preview" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl shadow-indigo-500/10" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
