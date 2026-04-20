"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    ClipboardList,
    Search,
    Filter,
    Calendar,
    MapPin,
    ArrowRightLeft,
    CheckCircle2,
    AlertCircle,
    Eye,
    Download,
    Clock,
    User,
    ChevronDown,
    ChevronRight,
    X,
    ExternalLink,
    LayoutGrid,
    Camera,
    History,
    Menu as MenuIcon
} from "lucide-react"
import Image from "next/image"
import Link from 'next/link'
import { useUIStore } from "@/store/uiStore"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function AttendanceHistoryPage() {
    const { data: session } = useSession()
    const { toggleMobileMenu } = useUIStore()
    const isOperational = session?.user?.role === 'OPERATIONAL'

    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLog, setSelectedLog] = useState<any>(null)
    const [filter, setFilter] = useState({
        startDate: '',
        endDate: '',
        employeeId: ''
    })

    useEffect(() => {
        if (session) {
            fetchHistory()
        }
    }, [filter, session])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const query = new URLSearchParams(filter).toString()
            const headers = {
                'x-user-role': session?.user?.role || '',
                'x-user-id': (session?.user as any)?.id || ''
            }
            const res = await fetch(`${API_BASE}/hr/attendance/history?${query}`, { headers })
            const data = await res.json()
            setHistory(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const filteredHistory = history.filter(h => 
        h.employee?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-4 md:p-8 pb-32 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                            <ClipboardList className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">RIWAYAT ABSENSI</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[3.25rem]">Log Aktivitas Karyawan & Verifikasi</p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                    {!isOperational && (
                        <button className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shrink-0">
                            <Download size={16} />
                            <span className="hidden sm:inline">Export Excel</span>
                            <span className="sm:hidden">Export</span>
                        </button>
                    )}
                    <button className="flex items-center gap-2 px-4 md:px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all shrink-0">
                        <Calendar size={16} />
                        <span className="hidden sm:inline">Pilih Periode</span>
                        <span className="sm:hidden">Periode</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
                <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 md:gap-6 items-center">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                            placeholder="Cari nama karyawan..."
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <Filter size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semua Staff</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-300" />
                        </div>
                        <div className="flex-1 lg:flex-none flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-300" />
                        </div>
                    </div>
                </div>

            {/* Content Table/Grid */}
            <div className="bg-white md:rounded-[2.5rem] md:border border-slate-100 md:shadow-xl overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Karyawan</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipe</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lokasi / Cabang</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Clock className="mx-auto text-slate-200 animate-spin mb-4" size={40} />
                                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Memuat riwayat...</p>
                                    </td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">
                                        Tidak ada riwayat ditemukan
                                    </td>
                                </tr>
                            ) : filteredHistory.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                                                {log.employee?.name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.employee?.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.employee?.position || "Staff"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${log.type === 'CLOCK_IN' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                            <ArrowRightLeft size={12} className={log.type === 'CLOCK_IN' ? 'rotate-90' : '-rotate-90'} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{log.type === 'CLOCK_IN' ? 'MASUK' : 'PULANG'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-slate-700">
                                                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400">
                                                {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={12} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{log.location?.name || "Tidak Diketahui"}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${log.status === 'VALID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {log.status === 'VALID' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            <span className="text-[10px] font-black uppercase">{log.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Clock className="mx-auto text-slate-200 animate-spin mb-4" size={40} />
                            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Memuat riwayat...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">
                            Tidak ada riwayat ditemukan
                        </div>
                    ) : filteredHistory.map((log) => (
                        <div key={log.id} className="p-6 space-y-4 active:bg-slate-50 transition-colors" onClick={() => setSelectedLog(log)}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm">
                                        {log.employee?.name?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.employee?.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.employee?.position || "Staff"}</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${log.status === 'VALID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {log.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${log.type === 'CLOCK_IN' ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'}`}>
                                        <Clock size={12} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700">{log.type === 'CLOCK_IN' ? 'MASUK' : 'PULANG'}</p>
                                        <p className="text-[9px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2 overflow-hidden">
                                    <MapPin size={12} className="text-slate-300 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter truncate">{log.location?.name || "LOKASI"}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">CABANG</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                                <div className="flex items-center gap-2 text-slate-400/80">
                                    <Calendar size={12} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest px-3 py-1.5 bg-blue-50/50 rounded-xl">
                                    Detail <ChevronRight size={12} className="opacity-70" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Log Detail Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedLog(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`bg-white w-full ${isOperational ? 'max-w-xl' : 'max-w-4xl'} max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative flex flex-col md:flex-row m-4`}
                        >
                            {/* Left Side: Photo - Hidden for Operational Role */}
                            {!isOperational && (
                                <div className="w-full md:w-1/2 bg-slate-900 relative aspect-[4/3] md:aspect-square flex-shrink-0">
                                    {selectedLog.photoUrl ? (
                                        <img 
                                            src={`${process.env.NEXT_PUBLIC_API_URL}${selectedLog.photoUrl}`} 
                                            alt="Verification" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                                            <User size={60} />
                                            <p className="text-[10px] font-black uppercase tracking-widest mt-4">Foto tidak tersedia</p>
                                        </div>
                                    )}
                                    <div className="absolute top-6 md:top-8 left-6 md:left-8 p-2.5 md:p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Verification Photo</p>
                                        <p className="text-[10px] font-bold">MATCHED ID: {selectedLog.employeeId.slice(-8)}</p>
                                    </div>
                                </div>
                            )}
 
                            {/* Right Side: Data */}
                            <div className={`w-full ${isOperational ? 'md:w-full' : 'md:w-1/2'} p-6 md:p-10 space-y-6 md:space-y-8 flex flex-col`}>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedLog.employee?.name}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedLog.employee?.position}</p>
                                    </div>
                                    <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-100 rounded-2xl">
                                        <X className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div className="p-4 md:p-5 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipe & Waktu</p>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${selectedLog.type === 'CLOCK_IN' ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'}`}>
                                                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] md:text-xs font-black text-slate-800 truncate">{selectedLog.type}</p>
                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400">{new Date(selectedLog.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-5 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">GPS Accuracy</p>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] md:text-xs font-black text-slate-800 truncate">{selectedLog.accuracy.toFixed(1)}m</p>
                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 truncate">{selectedLog.isMocked ? "MOCK DETECTED" : "REGULAR GPS"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className={`p-6 rounded-[2rem] border-4 ${selectedLog.status === 'VALID' ? 'border-emerald-50 bg-emerald-50/20' : 'border-rose-50 bg-rose-50/20'}`}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`p-3 rounded-2xl ${selectedLog.status === 'VALID' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                                                {selectedLog.status === 'VALID' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validation Status</p>
                                                <p className={`text-xl font-black ${selectedLog.status === 'VALID' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedLog.status}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                            {selectedLog.notes || "Sistem memvalidasi kehadiran ini berdasarkan radius koordinat yang cocok dengan lokasi terdaftar."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-4">
                                    <a 
                                        href={`https://www.google.com/maps?q=${selectedLog.latitude},${selectedLog.longitude}`}
                                        target="_blank"
                                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors shadow-xl shadow-slate-900/20"
                                    >
                                        <ExternalLink size={16} />
                                        Lihat di Maps
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



        </div>
    )
}
