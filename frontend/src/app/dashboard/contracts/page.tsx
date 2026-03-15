"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    FileText, Plus, Search, Filter, MoreVertical,
    Calendar, User, Building2, TrendingUp, ArrowRight,
    CheckCircle2, Clock, AlertCircle, XCircle, Trash2, Edit3, Eye,
    RefreshCw, Download, FilePlus, Printer, CreditCard, Copy
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ContractPDFModal from "./ContractPDFModal"

interface Company {
    name?: string;
    legalName?: string;
    logo?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    taxId?: string;
}

interface Contract {
    id: string;
    number: string;
    date: string;
    subject: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    amount: number;
    firstPartyName: string;
    firstPartyTitle: string;
    firstPartyAddress?: string;
    secondPartyName: string;
    secondPartyTitle: string;
    secondPartyAddress?: string;
    clauses: any;
    customer?: { id: string; name: string };
    vendor?: { id: string; name: string };
    project?: { id: string; title: string; number: string };
    lastBillingDate?: string;
    invoices?: { grandTotal: number; status: string }[];
    purchaseInvoices?: { grandTotal: number; status: string }[];
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function ContractListPage() {
    const router = useRouter()
    const [contracts, setContracts] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    
    // PDF Preview State
    const [showPreview, setShowPreview] = useState(false)
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
    const [company, setCompany] = useState<Company>({})

    const handleDuplicate = (c: Contract) => {
        const { id, number, date, lastBillingDate, createdAt, updatedAt, invoices, purchaseInvoices, ...rest } = c as any;
        localStorage.setItem('duplicated_contract', JSON.stringify({
            ...rest,
            subject: `COPY - ${rest.subject}`,
            status: "DRAFT"
        }));
        router.push('/dashboard/contracts/new');
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const [cRes, sRes] = await Promise.all([
                fetch('http://localhost:5000/api/contracts'),
                fetch('http://localhost:5000/api/company')
            ])
            if (cRes.ok) setContracts(await cRes.json())
            if (sRes.ok) setCompany(await sRes.json())
        } catch (e) {
            console.error("Failed to load data:", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const filtered = (Array.isArray(contracts) ? contracts : []).filter(c => {
        const matchesSearch = c.number.toLowerCase().includes(search.toLowerCase()) || 
                             c.subject.toLowerCase().includes(search.toLowerCase()) ||
                             c.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
                             c.vendor?.name?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    })

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20';
            case 'DRAFT': return 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20';
            case 'EXPIRED': return 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20';
            case 'TERMINATED': return 'bg-slate-100 text-slate-500 ring-1 ring-slate-500/20';
            default: return 'bg-slate-50 text-slate-400';
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/contracts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                setContracts(contracts.map(c => c.id === id ? { ...c, status: newStatus } : c))
            } else {
                alert("Gagal memperbarui status")
            }
        } catch (e) {
            console.error(e)
            alert("Error koneksi")
        }
    }

    const handlePrint = (c: Contract) => {
        setSelectedContract(c)
        setShowPreview(true)
    }

    const handleGenerateBill = async (id: string) => {
        if (!confirm("Buat penagihan/biaya untuk bulan ini?")) return
        setLoading(true)
        try {
            const res = await fetch(`http://localhost:5000/api/contracts/${id}/generate-bill`, { method: 'POST' })
            if (res.ok) {
                alert("Penagihan berhasil dibuat sebagai DRAFT")
                loadData()
            } else {
                const err = await res.json()
                alert(`Gagal membuat penagihan: ${err.message || 'Unknown error'}`)
            }
        } catch (e) {
            console.error(e)
            alert("Error koneksi")
        } finally {
            setLoading(false)
        }
    }

    const calcRealization = (c: Contract) => {
        const invTotal = (c.invoices || []).reduce((sum, inv) => sum + inv.grandTotal, 0);
        const piTotal = (c.purchaseInvoices || []).reduce((sum, pi) => sum + pi.grandTotal, 0);
        return invTotal > 0 ? { total: invTotal, label: 'Pendapatan' } : { total: piTotal, label: 'Beban' };
    }

    return (
        <div className="px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-8 w-full font-inter bg-slate-50/30 min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-lg md:shadow-2xl shadow-indigo-600/30 rotate-3 group hover:rotate-0 transition-all duration-500 shrink-0">
                            <FileText size={24} className="text-white md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Kontrak & SPK</h1>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-600 animate-pulse" />
                                Monitoring Layanan Berlangganan
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full md:w-auto">
                    <button onClick={loadData} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <Link href="/dashboard/contracts/new" className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3.5 bg-slate-900 text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 group">
                        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Buat Kontrak
                    </Link>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Kontrak', value: contracts.length, icon: FileText, color: 'indigo' },
                    { label: 'Kontrak Aktif', value: contracts.filter(c => c.status === 'ACTIVE').length, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Menunggu', value: contracts.filter(c => c.status === 'DRAFT').length, icon: Clock, color: 'amber' },
                    { label: 'Habis Masa', value: contracts.filter(c => c.status === 'EXPIRED').length, icon: AlertCircle, color: 'rose' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 group hover:border-indigo-100 transition-all">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform shrink-0`}>
                            <stat.icon size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight">{stat.label}</p>
                            <p className="text-xl md:text-2xl font-black text-slate-900 mt-1 md:mt-0.5">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-white p-3 md:p-3 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm md:px-8">
                <div className="relative w-full md:flex-1 min-w-0 group">
                    <Search className="absolute left-3 md:left-0 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cari kontrak, subjek, pelanggan..."
                        className="w-full pl-10 md:pl-8 pr-4 md:pr-6 py-2.5 md:py-4 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none text-xs md:text-sm font-semibold focus:outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 md:focus:ring-0 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 md:py-2 md:border-l border-slate-100 md:pl-4">
                    {["ALL", "ACTIVE", "DRAFT", "EXPIRED"].map(status => (
                        <button 
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 md:flex-none ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md md:shadow-xl shadow-indigo-600/20' : 'bg-slate-50 md:bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table */}
            <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-12 pr-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Info Kontrak</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pihak Terkait</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Realisasi Keuangan</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Periode & Status</th>
                                <th className="pr-12 pl-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((c, idx) => {
                                    const real = calcRealization(c);
                                    return (
                                        <motion.tr 
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={c.id}
                                            className="group hover:bg-indigo-50/30 transition-all duration-300"
                                        >
                                            <td className="pl-12 pr-6 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-900/10">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">{c.number}</p>
                                                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 line-clamp-1 max-w-[200px]">{c.subject}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{c.customer?.name || c.vendor?.name || "Internal"}</p>
                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{c.project ? `#${c.project.number}` : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl ${real.label === 'Pendapatan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} shrink-0`}>
                                                        <CreditCard size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 tracking-tight">{fmt(real.total)}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className={`text-[9px] font-black uppercase tracking-widest ${real.label === 'Pendapatan' ? 'text-emerald-500' : 'text-rose-500'}`}>{real.label} Terposting</p>
                                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rate: {fmt(c.amount)}/bln</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-8 text-center group/cell">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Sampai</p>
                                                            <p className="text-[11px] font-black text-slate-900">{fmtDate(c.endDate)}</p>
                                                        </div>
                                                        <div className="w-px h-6 bg-slate-100" />
                                                        <select 
                                                            value={c.status}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                            className={`text-[9px] font-black px-3 py-1.5 rounded-full border-none outline-none appearance-none cursor-pointer tracking-[0.15em] transition-all hover:scale-105 active:scale-95 ${getStatusStyle(c.status)}`}
                                                        >
                                                            <option value="DRAFT">DRAFT</option>
                                                            <option value="ACTIVE">ACTIVE</option>
                                                            <option value="EXPIRED">EXPIRED</option>
                                                            <option value="TERMINATED">TERMINATED</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="pr-12 pl-6 py-8 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handlePrint(c); }}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-lg shadow-transparent hover:shadow-indigo-600/10 border border-transparent hover:border-slate-100 transition-all"
                                                        title="Cetak SPK"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(c); }}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-lg shadow-transparent hover:shadow-amber-600/10 border border-transparent hover:border-slate-100 transition-all"
                                                        title="Duplikasi"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateBill(c.id); }}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl shadow-lg shadow-transparent hover:shadow-emerald-600/10 border border-transparent hover:border-slate-100 transition-all"
                                                        title="Billing"
                                                    >
                                                        <TrendingUp size={16} />
                                                    </button>
                                                    <Link 
                                                        href={`/dashboard/contracts/${c.id}/edit`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl shadow-lg shadow-transparent hover:shadow-slate-900/10 border border-transparent hover:border-slate-100 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                            {(filtered.length === 0 && !loading) && (
                                <tr>
                                    <td colSpan={5} className="px-12 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 border border-dashed border-slate-200">
                                                <FileText size={48} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-base font-black text-slate-900 uppercase tracking-widest">Data Tidak Ditemukan</p>
                                                <p className="text-xs text-slate-400 font-medium">Coba gunakan kata kunci pencarian lain atau buat kontrak baru.</p>
                                            </div>
                                            <button onClick={() => { setSearch(""); setFilterStatus("ALL"); }} className="px-6 py-3 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all">Reset Filter</button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {filtered.map((c, idx) => {
                    const real = calcRealization(c);
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: idx * 0.05 }}
                            key={c.id}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 relative"
                        >
                            <div className="flex justify-between items-start mb-1 gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{c.number}</p>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight break-words whitespace-normal">{c.customer?.name || c.vendor?.name || "Internal"}</h3>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{c.subject}</p>
                                </div>
                                <select 
                                    value={c.status}
                                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                    className={`appearance-none bg-transparent outline-none cursor-pointer pl-2 pr-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border text-center whitespace-nowrap ${getStatusStyle(c.status)}`}
                                >
                                    <option value="DRAFT" className="text-slate-800 bg-white">DRAFT</option>
                                    <option value="ACTIVE" className="text-slate-800 bg-white">ACTIVE</option>
                                    <option value="EXPIRED" className="text-slate-800 bg-white">EXPIRED</option>
                                    <option value="TERMINATED" className="text-slate-800 bg-white">TERMINATED</option>
                                </select>
                            </div>

                            <div className="bg-slate-50/50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100 mt-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 size={12} className="text-indigo-600" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Project:</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 uppercase">{c.project ? `#${c.project.number}` : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <CreditCard size={12} className={real.label === 'Pendapatan' ? 'text-emerald-600' : 'text-rose-600'} />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
                                            {real.label}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{fmt(real.total)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rate Bulanan</span>
                                    <span className="text-[10px] font-extrabold text-indigo-700">{fmt(c.amount)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sampai</span>
                                    <span className="text-[10px] font-black text-slate-700">{fmtDate(c.endDate)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <button onClick={() => handlePrint(c)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center"><Printer size={14} /></button>
                                    <button onClick={() => handleDuplicate(c)} className="w-8 h-8 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center"><Copy size={14} /></button>
                                    <button onClick={() => handleGenerateBill(c.id)} className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp size={14} /></button>
                                    <Link href={`/dashboard/contracts/${c.id}/edit`} className="w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center"><Edit3 size={14} /></Link>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {(filtered.length === 0 && !loading) && (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-16 flex flex-col items-center">
                        <FileText size={48} className="text-slate-200 mb-4" />
                        <p className="font-black text-slate-800 uppercase tracking-wider text-[11px] mb-1">Data Tidak Ditemukan</p>
                        <p className="text-[10px] text-slate-400 font-medium px-8 text-center mb-4">Coba gunakan kata kunci pencarian lain.</p>
                        <button onClick={() => { setSearch(""); setFilterStatus("ALL"); }} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100">Reset Filter</button>
                    </div>
                )}
            </div>
            </>

            {/* Preview Modal */}
            <AnimatePresence>
                {showPreview && selectedContract && (
                    <ContractPDFModal 
                        contract={selectedContract}
                        company={company}
                        onClose={() => setShowPreview(false)}
                    />
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-6 p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-slate-100 rounded-full" />
                            <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black text-slate-900 uppercase tracking-widest">Singkronisasi</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Mengambil Data Keuangan...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
