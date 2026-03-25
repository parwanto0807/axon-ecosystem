"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
    Filter,
    ChevronRight,
    ArrowUpDown,
    Eye,
    CheckCircle2,
    Clock,
    LayoutGrid,
    Table as TableIcon,
    ArrowRight
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

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

const WO_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ON_HOLD: { label: 'On Hold', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' }
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
    const [viewingReport, setViewingReport] = useState<Report | null>(null)
    
    // Filters
    const [filterProgress, setFilterProgress] = useState<'all' | 'high' | 'mid' | 'low'>('all')

    const { data: session } = useSession()

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports`, {
                headers: {
                    'x-user-role': (session?.user as any)?.role || '',
                    'x-user-dept': (session?.user as any)?.department || '',
                    'x-user-name': session?.user?.name || ''
                }
            })
            if (res.ok) {
                const data = await res.json()
                setReports(data)
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error)
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchesSearch = 
                r.workOrder.number.toLowerCase().includes(search.toLowerCase()) ||
                r.workOrder.title.toLowerCase().includes(search.toLowerCase()) ||
                (r.reportedBy && r.reportedBy.toLowerCase().includes(search.toLowerCase())) ||
                r.description.toLowerCase().includes(search.toLowerCase());
            
            if (!matchesSearch) return false;

            if (filterProgress === 'high') return r.progress >= 80;
            if (filterProgress === 'mid') return r.progress > 30 && r.progress < 80;
            if (filterProgress === 'low') return r.progress <= 30;

            return true;
        })
    }, [reports, search, filterProgress])

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    })
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
    })

    return (
        <div className="max-w-screen mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20 shrink-0">
                        <ClipboardList className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Laporan <span className="text-indigo-600">Progress</span></h1>
                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                             Monitoring Real-time Lapangan <span className="w-1 h-1 rounded-full bg-slate-300"></span> {filteredReports.length} Data
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group flex-1 md:flex-none md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari WO, Teknisi, atau Aktivitas..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all focus:bg-white"
                        />
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <TableIcon size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    <button onClick={fetchReports}
                        className="h-12 w-12 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm text-slate-600 flex items-center justify-center shrink-0">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 ml-2">Filter Progress:</span>
                {[
                    { id: 'all', label: 'Semua Status' },
                    { id: 'high', label: 'Selesai (>80%)' },
                    { id: 'mid', label: 'Berjalan (30-80%)' },
                    { id: 'low', label: 'Awal (<30%)' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilterProgress(f.id as any)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap
                            ${filterProgress === f.id 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                        <ClipboardList className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Singkronisasi Data Lapangan...</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center px-10">
                    <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-8">
                        <Filter className="text-slate-200" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Data Tidak Ditemukan</h3>
                    <p className="text-slate-400 font-medium max-w-sm mt-2">Kriteria pencarian atau filter Anda tidak menghasilkan data laporan saat ini.</p>
                    <Button variant="outline" onClick={() => { setSearch(''); setFilterProgress('all'); }} className="mt-8 rounded-2xl font-bold uppercase tracking-wider text-xs px-8">Reset Filter</Button>
                </div>
            ) : viewMode === 'table' ? (
                /* Professional Table View */
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Laporan & Waktu</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Work Order</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Teknisi / Pelapor</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Progress Visual</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Foto</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 px-2">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="group hover:bg-slate-50/80 transition-all cursor-pointer" onClick={() => setViewingReport(report)}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    <Calendar size={14} className="mb-0.5" />
                                                    <span className="text-[8px] font-black">{new Date(report.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 leading-none mb-1.5">{fmtDate(report.date)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 marker:"><Clock size={10} /> {fmtTime(report.date)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="max-w-xs">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{report.workOrder.number}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${WO_STATUS[report.workOrder.status]?.color || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                        {WO_STATUS[report.workOrder.status]?.label || report.workOrder.status}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-slate-700 text-sm truncate uppercase tracking-tight">{report.workOrder.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                    {(report.reportedBy || "A").substring(0, 1)}
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{report.reportedBy || "Anonim"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="w-40 bg-slate-100 h-2 rounded-full overflow-hidden relative shadow-inner">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${report.progress}%` }}
                                                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ${report.progress >= 80 ? 'bg-emerald-500' : report.progress >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                                />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">{report.progress}% Complete</p>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {report.photos.length > 0 ? (
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                                                    <Package size={12} />
                                                    <span className="text-[10px] font-black pt-0.5">{report.photos.length}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-200">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link 
                                                    href={`/dashboard/operations/work-orders?id=${report.workOrderId}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm"
                                                >
                                                    <ExternalLink size={16} />
                                                </Link>
                                                <button className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm">
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Card View (Grid) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map((report) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={report.id}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer flex flex-col"
                            onClick={() => setViewingReport(report)}
                        >
                            <div className="p-6 pb-2">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        {report.workOrder.number}
                                    </span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fmtDate(report.date)}</p>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors h-14 line-clamp-2">
                                    {report.workOrder.title}
                                </h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${WO_STATUS[report.workOrder.status]?.color || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                        {WO_STATUS[report.workOrder.status]?.label || report.workOrder.status}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{report.reportedBy || "Anonim"}</p>
                                </div>
                            </div>
                            
                            <div className="px-6 pb-6">
                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-4 h-24 overflow-hidden">
                                     <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">{report.description}</p>
                                </div>
                                
                                <div className="relative pt-1 mt-auto">
                                    <div className="flex mb-2 items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress Pekerjaan</span>
                                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{report.progress}%</span>
                                    </div>
                                    <div className="overflow-hidden h-2.5 mb-2 flex rounded-full bg-slate-100 shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${report.progress}%` }}
                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${report.progress >= 80 ? 'bg-emerald-500' : report.progress >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                        ></motion.div>
                                    </div>
                                </div>
                            </div>

                            {report.photos.length > 0 && (
                                <div className="mt-auto px-1 py-1 bg-slate-50 flex border-t border-slate-100">
                                    {report.photos.slice(0, 3).map((p, idx) => (
                                        <div key={p.id} className="relative flex-1 aspect-video m-1 rounded-2xl overflow-hidden border border-slate-200">
                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${p.url}`} className="w-full h-full object-cover" alt="p" />
                                            {idx === 2 && report.photos.length > 3 && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                                    <span className="text-[11px] font-black text-white">+{report.photos.length - 2}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detailed Report Modal */}
            <AnimatePresence>
                {viewingReport && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 32 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 32 }}
                            className="bg-white max-w-2xl w-full rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 leading-none">Detail Laporan</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{viewingReport.workOrder.number} • {fmtDate(viewingReport.date)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingReport(null)} className="w-12 h-12 rounded-2xl hover:bg-slate-50 text-slate-400 flex items-center justify-center transition-all bg-slate-50/50"><X size={24} /></button>
                            </div>

                            <div className="p-8 overflow-y-auto grow space-y-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                         <span className={`text-[9px] font-black px-2 py-1 rounded uppercase border ${WO_STATUS[viewingReport.workOrder.status]?.color || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                            {WO_STATUS[viewingReport.workOrder.status]?.label || viewingReport.workOrder.status}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{viewingReport.workOrder.title}</h3>
                                    
                                    <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pt-2">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar size={14} className="text-indigo-400" />
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{fmtDate(viewingReport.date)} • {fmtTime(viewingReport.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <User size={14} className="text-indigo-400" />
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{viewingReport.reportedBy || "Anonim"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pencapaian Progress</span>
                                        <span className="text-lg font-black text-indigo-600">{viewingReport.progress}%</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50 p-1">
                                        <motion.div 
                                             initial={{ width: 0 }}
                                             animate={{ width: `${viewingReport.progress}%` }}
                                             className={`h-full rounded-full transition-all duration-1000 ${viewingReport.progress >= 80 ? 'bg-emerald-500' : viewingReport.progress >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100/50">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Catatan Operasional</span>
                                     <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{viewingReport.description}</p>
                                </div>

                                {viewingReport.photos.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lampiran Media ({viewingReport.photos.length})</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {viewingReport.photos.map((photo) => (
                                                <div 
                                                    key={photo.id}
                                                    onClick={() => setSelectedPhoto(`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`)}
                                                    className="aspect-video rounded-3xl overflow-hidden cursor-pointer group/img relative border border-slate-200"
                                                >
                                                    <img 
                                                        src={`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`} 
                                                        className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-500" 
                                                        alt="img" 
                                                    />
                                                    <div className="absolute inset-0 bg-indigo-600/0 group-hover/img:bg-indigo-600/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                                        <Eye className="text-white" size={32} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-slate-50/50 flex gap-3">
                                <Link 
                                    href={`/dashboard/operations/work-orders?id=${viewingReport.workOrderId}`}
                                    className="flex-1 bg-white border border-slate-200 text-slate-700 h-14 rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                                >
                                    Buka Detail WO
                                </Link>
                                <Button 
                                    onClick={() => setViewingReport(null)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-2xl flex items-center justify-center font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                                >
                                    Tutup Preview
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Photo Zoom Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center"
                        >
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute -top-16 right-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
                            >
                                <X size={32} />
                            </button>
                            <img src={selectedPhoto} alt="Zoomed" className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(79,70,229,0.3)] border border-white/10" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
