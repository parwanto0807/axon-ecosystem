"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
    DollarSign, 
    ArrowLeft, 
    CheckCircle2, 
    Clock, 
    User, 
    Briefcase, 
    Building2,
    Send,
    AlertCircle,
    Info,
    FileText,
    Landmark,
    CreditCard,
    Calendar as CalendarIcon,
    X
} from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

const API_BASE = "http://localhost:5000/api"

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export default function PayrollDetailPage() {
    const { id } = useParams()
    const [run, setRun] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [posting, setPosting] = useState(false)
    const [paying, setPaying] = useState(false)
    const [showPayModal, setShowPayModal] = useState(false)
    const [accounts, setAccounts] = useState<any[]>([])
    const [paymentData, setPaymentData] = useState({
        coaId: "",
        date: new Date().toISOString().split('T')[0]
    })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (id) fetchRun()
    }, [id])

    const fetchRun = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/${id}`)
            const data = await res.json()
            setRun(data)
        } catch (e) {
            console.error(e)
            alert("Failed to fetch payroll details.")
        } finally {
            setLoading(false)
        }
    }

    const fetchAccounts = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/accounts`)
            const data = await res.json()
            setAccounts(data)
            if (data.length > 0) setPaymentData(prev => ({ ...prev, coaId: data[0].id }))
        } catch (e) {
            console.error(e)
        }
    }

    const handlePost = async () => {
        if (!confirm("Posting ke Ledger? Tindakan ini akan membuat Jurnal Umum dan status menjadi POSTED.")) return
        setPosting(true)
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/${id}/post`, { method: 'POST' })
            if (res.ok) {
                alert("Berhasil diposting ke Ledger!")
                fetchRun()
            } else {
                const err = await res.json()
                alert(`Error: ${err.message}`)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to post payroll.")
        } finally {
            setPosting(false)
        }
    }

    const handlePay = async () => {
        if (!paymentData.coaId) return alert("Pilih akun pembayaran!")
        setPaying(true)
        try {
            const res = await fetch(`${API_BASE}/hr/payroll/${id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            })
            if (res.ok) {
                alert("Pembayaran berhasil dicatat dan Jurnal Pelunasan telah dibuat!")
                setShowPayModal(false)
                fetchRun()
            } else {
                const err = await res.json()
                alert(`Error: ${err.message}`)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to process payment.")
        } finally {
            setPaying(false)
        }
    }

    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest text-[10px]">Loading Payroll Data...</div>
    if (!run) return <div className="p-20 text-center font-black text-rose-400 uppercase tracking-widest text-[10px]">Payroll Not Found</div>

    const isPosted = run.status === 'POSTED'
    const isPaid = run.status === 'PAID'

    return (
        <div className="w-full p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen pb-24 md:pb-8 overflow-x-hidden box-border">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/hr/payroll">
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm shrink-0">
                            <ArrowLeft size={18} />
                        </button>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h1 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight uppercase truncate">
                                {run?.type === 'THR' ? 'THR KARYAWAN' : 'PAYROLL DETAIL'}
                            </h1>
                            <div className={`px-2.5 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${isPaid ? 'bg-indigo-50 text-indigo-600' : isPosted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {isPaid ? <CheckCircle2 size={10} className="text-indigo-500" /> : isPosted ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                {run?.status}
                            </div>
                        </div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                            Periode {MONTHS[(run?.month || 1) - 1]} {run?.year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                    {!isPosted && !isPaid && (
                        <button 
                            disabled={posting}
                            onClick={handlePost}
                            className="flex-1 md:flex-none px-6 md:px-8 py-3 bg-emerald-600 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black hover:bg-emerald-700 active:scale-[0.95] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                        >
                            <Send size={16} />
                            {posting ? 'POSTING...' : 'POST KE LEDGER'}
                        </button>
                    )}

                    {isPosted && (
                        <button 
                            onClick={() => {
                                fetchAccounts()
                                setShowPayModal(true)
                            }}
                            className="flex-1 md:flex-none px-6 md:px-8 py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black hover:bg-indigo-700 active:scale-[0.95] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            <CreditCard size={16} />
                            {isMobile ? 'PELUNASAN' : 'PELUNASAN GAJI (PAYMENT)'}
                        </button>
                    )}
                </div>
            </div>

            {/* Account Info Bar */}
            {isPaid && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                                <CheckCircle2 size={isMobile ? 20 : 24} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-black text-indigo-800 uppercase tracking-tight truncate">Status: LUNAS (PAID)</p>
                                <p className="text-[8px] md:text-[10px] font-bold text-indigo-600/60 uppercase truncate">DIBAYAR PADA {new Date(run.paidAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                                <FileText size={isMobile ? 20 : 24} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-black text-emerald-800 uppercase tracking-tight truncate">Journal Pelunasan</p>
                                <p className="text-[8px] md:text-[10px] font-bold text-emerald-600/60 uppercase truncate">ID: {run.paymentJournalId}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPosted && !isPaid && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] md:text-xs font-black text-emerald-800 uppercase tracking-tight truncate">Sudah Masuk Buku Besar (Draft Hutang)</p>
                            <p className="text-[8px] md:text-[10px] font-bold text-emerald-600/60 uppercase truncate break-all">Journal ID: {run.journalId}</p>
                        </div>
                    </div>
                    <p className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase bg-white/50 px-3 py-1 rounded-lg w-fit shrink-0">MENUNGGU PEMBAYARAN</p>
                </div>
            )}

            {!isPosted && !isPaid && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-amber-800 min-w-0 overflow-hidden">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-tight truncate">Draft - Belum Posting</p>
                        <p className="text-[8px] md:text-[10px] font-bold opacity-60 uppercase truncate">Silakan periksa data di bawah sebelum melakukan posting ke Ledger.</p>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Total Karyawan</p>
                        <p className="text-lg md:text-2xl font-black text-slate-800 truncate">{run.items?.length || 0}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ml-3">
                        <User size={showPayModal ? 20 : 24} className="md:w-6 md:h-6 w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Total Gaji</p>
                        <p className="text-lg md:text-2xl font-black text-emerald-600 truncate">Rp {run.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 ml-3">
                        <DollarSign size={24} className="md:w-6 md:h-6 w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Akun Biaya (Debit)</p>
                        <p className="text-xs md:text-sm font-black text-slate-600 uppercase truncate">OFFICE SALARY (6-10101)</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 ml-3">
                        <Info size={24} className="md:w-6 md:h-6 w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden mb-8">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-bottom border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jabatan / Dept</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jumlah Gaji / Upah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {run.items?.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {item.employee?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{item.employee?.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{item.employee?.nik || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Briefcase size={12} className="text-slate-400" />
                                            <p className="text-xs font-black text-slate-600">{item.employee?.position || 'Staff'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={12} className="text-slate-300" />
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.employee?.department || '-'}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            item.type === 'WAGE' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <p className="text-sm font-black text-slate-800">Rp {item.amount?.toLocaleString()}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col divide-y divide-slate-50">
                    {run.items?.map((item: any) => (
                        <div key={item.id} className="p-5 flex flex-col gap-4 active:bg-slate-50/80 transition-all">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-white">
                                        {item.employee?.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-black text-slate-800 truncate leading-none mb-1 uppercase tracking-tight">{item.employee?.name}</h3>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 truncate">{item.employee?.nik || 'NO-NIK'}</span>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shrink-0 ${
                                                item.type === 'WAGE' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                            }`}>{item.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TOTAL</p>
                                    <p className="text-sm font-black text-slate-800 tracking-tight">Rp{item.amount?.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-1">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Briefcase size={10} className="text-slate-300 shrink-0" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight truncate">{item.employee?.position || 'STAFF'}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Building2 size={10} className="text-slate-300 shrink-0" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight truncate">{item.employee?.department || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!run.items || run.items.length === 0) && (
                        <div className="py-20 text-center font-black text-slate-300 text-[10px] uppercase tracking-widest">Tidak ada data item</div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPayModal && (
                    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'} bg-slate-900/40 backdrop-blur-sm`}>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPayModal(false)}
                            className="absolute inset-0"
                        />
                        <motion.div 
                            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative bg-white w-full max-w-md overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2.5rem] max-h-[90vh]' : 'rounded-[2.5rem] shadow-2xl'}`}
                        >
                            {isMobile && (
                                <div className="w-full h-8 flex items-center justify-center shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                                </div>
                            )}
                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">PELUNASAN GAJI</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catat Pengeluaran Uang Kas/Bank</p>
                                        </div>
                                    </div>
                                    {!isMobile && (
                                        <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total yang akan dibayar</p>
                                    <p className="text-xl font-black text-indigo-600">Rp {run.totalAmount?.toLocaleString()}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sumber Rekening / Kas</label>
                                        <div className="relative">
                                            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <select 
                                                className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                                value={paymentData.coaId}
                                                onChange={e => setPaymentData({...paymentData, coaId: e.target.value})}
                                            >
                                                <option value="">Pilih Rekening...</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tanggal Pembayaran</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            <input 
                                                type="date"
                                                className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                                value={paymentData.date}
                                                onChange={e => setPaymentData({...paymentData, date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    {!isMobile && (
                                        <button 
                                            onClick={() => setShowPayModal(false)}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            BATAL
                                        </button>
                                    )}
                                    <button 
                                        onClick={handlePay}
                                        disabled={paying}
                                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                                    >
                                        {paying ? 'MEMPROSES...' : 'BAYAR SEKARANG'}
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
