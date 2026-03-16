"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    DollarSign, 
    Plus, 
    Calendar, 
    ChevronRight, 
    CheckCircle2, 
    Clock, 
    FileText,
    ArrowRight,
    TrendingUp,
    Download,
    Trash2
} from "lucide-react"
import Link from "next/link"

const API_BASE = "${process.env.NEXT_PUBLIC_API_URL}/api"

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export default function PayrollListPage() {
    const [runs, setRuns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [newPayroll, setNewPayroll] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        type: 'SALARY'
    })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        fetchRuns()
    }, [])

    const fetchRuns = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/payroll`)
            const data = await res.json()
            setRuns(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPayroll)
            })
            if (res.ok) {
                const run = await res.json()
                fetchRuns()
                setShowModal(false)
            } else {
                const err = await res.json()
                alert(`Error: ${err.message}`)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to generate payroll.")
        } finally {
            setGenerating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus data penggajian ini?")) return
        try {
            await fetch(`${API_BASE}/hr/payroll/${id}`, { method: 'DELETE' })
            fetchRuns()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen pb-24 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                            <DollarSign className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">PENGGAJIAN KARYAWAN</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[3.25rem]">Manajemen Gaji & Upah Bulanan</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowModal(true)}
                        className="w-full md:w-auto px-6 py-3.5 md:py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] md:text-xs font-black hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                        <Plus size={16} />
                        GENERATE GAJI / THR
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center md:items-start justify-between md:justify-start gap-3 md:gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Calendar size={18} />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase md:hidden tracking-widest shrink-0">Periode</span>
                    </div>
                    <div className="text-right md:text-left overflow-hidden">
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1 tracking-widest">Periode Aktif</span>
                        <p className="text-sm md:text-xl font-black text-slate-800 truncate">{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</p>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center md:items-start justify-between md:justify-start gap-3 md:gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase md:hidden tracking-widest shrink-0">Terakhir</span>
                    </div>
                    <div className="text-right md:text-left overflow-hidden">
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1 tracking-widest">Total Terakhir</span>
                        <p className="text-sm md:text-xl font-black text-slate-800 truncate">
                            Rp {runs[0]?.totalAmount?.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>
                <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex md:flex-col items-center md:items-start justify-between md:justify-start gap-3 md:gap-4">
                    <div className="flex items-center gap-3 md:mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={18} />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase md:hidden tracking-widest shrink-0">Drafts</span>
                    </div>
                    <div className="text-right md:text-left overflow-hidden">
                        <span className="text-[10px] font-black text-slate-400 uppercase hidden md:inline-block mb-1 tracking-widest">Status Draft</span>
                        <p className="text-sm md:text-xl font-black text-slate-800 truncate">
                            {runs.filter(r => r.status === 'DRAFT').length} Periode
                        </p>
                    </div>
                </div>
            </div>

            {/* Payroll History */}
            <div className="space-y-4">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider pl-1">Riwayat Penggajian & THR</h2>
                <div className="grid grid-cols-1 gap-3">
                    {loading ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase">Memuat data...</div>
                    ) : runs.length === 0 ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-300 uppercase border-2 border-dashed border-slate-100 rounded-[2rem]">Belum ada data penggajian</div>
                    ) : runs.map((run) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={run.id}
                            className="bg-white group p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-500/20 transition-all cursor-pointer flex items-center justify-between gap-4 md:gap-6"
                        >
                            <Link href={`/dashboard/hr/payroll/${run.id}`} className="flex-1 flex items-center gap-4 md:gap-6">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-center transition-all shrink-0 ${run.status === 'POSTED' || run.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="text-[8px] md:text-[10px] font-black uppercase">{MONTHS[run.month-1].substring(0,3)}</span>
                                    <span className="text-sm md:text-lg font-black">{run.year}</span>
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1">
                                        <p className="text-xs md:text-sm font-black text-slate-800 leading-tight">
                                            {run.type === 'THR' ? 'THR KARYAWAN' : 'PAYROLL'} - {MONTHS[run.month-1]} {run.year}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 ${
                                                run.status === 'PAID' ? 'bg-indigo-50 text-indigo-600' :
                                                run.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                                    run.status === 'PAID' ? 'bg-indigo-500' :
                                                    run.status === 'POSTED' ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`} />
                                                {run.status}
                                            </div>
                                            {run.type === 'THR' && (
                                                <div className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] md:text-[9px] font-black rounded-lg border border-rose-100">THR</div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Dibuat {new Date(run.createdAt).toLocaleDateString()}</p>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-0.5">Total</p>
                                    <p className="text-xs md:text-lg font-black text-slate-800 tracking-tight">Rp {run.totalAmount?.toLocaleString()}</p>
                                </div>
                            </Link>


                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDelete(run.id)}
                                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <Link href={`/dashboard/hr/payroll/${run.id}`}>
                                    <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white rounded-xl transition-all">
                                        <ArrowRight size={18} />
                                    </div>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Generate Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 outline-none">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`bg-white w-full max-w-md max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2.5rem] mt-auto' : 'rounded-[2.5rem]'}`}
                        >
                            {isMobile && <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 shrink-0" />}
                            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                                        <Plus size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">GENERATE PAYROLL / THR</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buat Draft Bulanan atau THR</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipe</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setNewPayroll({...newPayroll, type: 'SALARY'})}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                                                    newPayroll.type === 'SALARY' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                                                }`}
                                            >
                                                GAJI BULANAN
                                            </button>
                                            <button 
                                                onClick={() => setNewPayroll({...newPayroll, type: 'THR'})}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${
                                                    newPayroll.type === 'THR' ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/20' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                                                }`}
                                            >
                                                THR (1 BULAN)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bulan</label>
                                        <select 
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-emerald-500/10 outline-none"
                                            value={newPayroll.month}
                                            onChange={e => setNewPayroll({...newPayroll, month: Number(e.target.value)})}
                                        >
                                            {MONTHS.map((m, i) => (
                                                <option key={m} value={i + 1}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tahun</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-emerald-500/10 outline-none"
                                            value={newPayroll.year}
                                            onChange={e => setNewPayroll({...newPayroll, year: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        BATAL
                                    </button>
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 ${
                                            newPayroll.type === 'THR' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                        }`}
                                    >
                                        {generating ? 'PROCESSING...' : 'GENERATE DRAFT'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
