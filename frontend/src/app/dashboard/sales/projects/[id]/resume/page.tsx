"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
    ArrowLeft, FileText, ShoppingCart, ShoppingBag,
    MapPin, Receipt, Wrench, Truck, ClipboardCheck,
    DollarSign, TrendingUp, TrendingDown, Percent,
    AlertCircle, CheckCircle2, Clock, Ban, Download,
    Printer, Building2, Calendar, Package, Activity,
    Loader2, BarChart3, Briefcase
} from "lucide-react"
import Link from "next/link"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    SENT: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
    COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
    POSTED: { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500' },
    PAID: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    CONFIRMED: { bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-500' },
    DELIVERED: { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-500' },
    PARTIALLY_RECEIVED: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
    VOID: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
    ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    CLOSED: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

const StatusBadge = ({ status }: { status: string }) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.DRAFT
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {status}
        </span>
    )
}

interface Project {
    id: string; number: string; name: string; status: string; createdAt: string; deadline?: string
    customer?: { name: string; code?: string; phone?: string; email?: string }
    businessCategory?: { name: string }
    surveys?: any[]; quotations?: any[]; salesOrders?: any[]; purchaseOrders?: any[]
    workOrders?: any[]; invoices?: any[]; surveyExpenses?: any[]; operationalExpenses?: any[]
    deliveryOrders?: any[]; basts?: any[]
}

export default function ProjectResumePage() {
    const { id } = useParams()
    const router = useRouter()
    const { data: session } = useSession()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id && session?.user?.role) fetchProject()
    }, [id, session])

    const fetchProject = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                headers: {
                    'x-user-role': session?.user?.role || ''
                }
            })
            const data = await res.json()
            if (res.ok && !data.message) {
                setProject(data)
            } else {
                setProject(null)
            }
        } catch (e) {
            console.error(e)
            setProject(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Project Resume...</p>
            </div>
        </div>
    )

    if (!project) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <AlertCircle size={32} className="text-rose-400" />
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Project Not Found</p>
                <Link href="/dashboard/sales/projects" className="text-xs text-indigo-600 hover:underline">Kembali ke Projects</Link>
            </div>
        </div>
    )

    // ─── CALCULATIONS ───────────────────────────────────────────────────────
    const revenue = project.salesOrders?.reduce((acc, so) => acc + (so.grandTotal || 0), 0) || 0

    let materialUsageCosts = 0
    let operationalExpenses = 0
    const processedExpenseIds = new Set<string>()

    let validSurveyCosts = 0
    let validWoSurveyCosts = 0
    let validProjectSurveyCosts = 0
    let validOpExCosts = 0

    const processExpense = (e: any, category?: string) => {
        if (!e || !e.id || processedExpenseIds.has(e.id)) return
        if (e.status === 'APPROVED' || e.status === 'POSTED' || e.status === 'PAID') {
            if (!e.purchaseOrderId) {
                const amt = e.amount || 0
                operationalExpenses += amt
                if (category === 'survey') validSurveyCosts += amt
                if (category === 'wo_survey') validWoSurveyCosts += amt
                if (category === 'project_survey') validProjectSurveyCosts += amt
                if (category === 'opex') validOpExCosts += amt
            }
        }
        processedExpenseIds.add(e.id)
    }

    project.workOrders?.forEach(wo => {
        wo.stockMovements?.forEach((sm: any) => {
            if (sm.status === 'CONFIRMED' && (sm.type === 'OUT' || sm.type === 'STOK_OUT')) {
                sm.items?.forEach((item: any) => { materialUsageCosts += (item.qty || 0) * (item.unitCost || 0) })
            }
        })
    })

    const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'POSTED']
    let totalPOGrandTotal = 0
    project.purchaseOrders?.forEach(po => {
        if (validPOStatuses.includes(po.status)) {
            totalPOGrandTotal += po.grandTotal || 0
        }
    })

    project.surveys?.forEach(s => s.expenses?.forEach((e: any) => processExpense(e, 'survey')))
    project.workOrders?.forEach(wo => wo.surveyExpenses?.forEach((e: any) => processExpense(e, 'wo_survey')))
    project.surveyExpenses?.forEach((e: any) => processExpense(e, 'project_survey'))
    project.operationalExpenses?.forEach((e: any) => processExpense(e, 'opex'))

    const totalCOGS = materialUsageCosts + totalPOGrandTotal
    const totalExpenses = totalCOGS + operationalExpenses
    const profit = revenue - totalExpenses
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    const isProfit = profit >= 0

    // Quotation aggregates
    const okQuotations = project.quotations?.filter((q: any) => ['ACCEPTED', 'SENT'].includes(q.status)) || []
    const okQuotationsTotal = okQuotations.reduce((a: number, q: any) => a + (q.grandTotal || 0), 0)
    const okQuotationsHPP = okQuotations.reduce((a: number, q: any) => a + (q.items?.reduce((ia: number, item: any) => ia + (item.costPrice || 0) * (item.qty || 1), 0) || 0), 0)

    const rejectedQuotations = project.quotations?.filter((q: any) => ['REJECTED', 'VOID', 'CANCELLED', 'EXPIRED'].includes(q.status)) || []
    const rejectedQuotationsTotal = rejectedQuotations.reduce((a: number, q: any) => a + (q.grandTotal || 0), 0)
    const rejectedQuotationsHPP = rejectedQuotations.reduce((a: number, q: any) => a + (q.items?.reduce((ia: number, item: any) => ia + (item.costPrice || 0) * (item.qty || 1), 0) || 0), 0)

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <Link href="/dashboard/sales/projects">
                            <button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all">
                                <ArrowLeft size={18} />
                            </button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">{project.number}</p>
                                <StatusBadge status={project.status} />
                            </div>
                            <h1 className="text-base md:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">{project.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-all">
                            <Printer size={14} />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

                {/* Project Info Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 px-6 md:px-8 py-5 md:py-6 relative overflow-hidden">
                        {/* Decorative background circles */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                                <BarChart3 size={24} className="text-indigo-100" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Project Resume</p>
                                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">{project.name}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 p-6 md:px-8 bg-white">
                        <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Building2 size={12} /> Customer</p>
                            <p className="text-sm font-extrabold text-slate-800">{project.customer?.name || '-'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Briefcase size={12} /> Unit Bisnis</p>
                            <p className="text-sm font-extrabold text-slate-800">{project.businessCategory?.name || '-'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar size={12} /> Dibuat</p>
                            <p className="text-sm font-extrabold text-slate-800">{fmtDate(project.createdAt)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={12} /> Deadline</p>
                            <p className="text-sm font-extrabold text-slate-800">{project.deadline ? fmtDate(project.deadline) : '-'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Profit / Loss Hero Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`rounded-2xl md:rounded-3xl border border-slate-200/50 shadow-2xl overflow-hidden ${isProfit ? 'bg-gradient-to-br from-emerald-50 via-white to-white' : 'bg-gradient-to-br from-rose-50 via-white to-white'}`}>
                    <div className="p-6 md:p-8 relative">
                        {/* Decorative icon background */}
                        <div className={`absolute top-4 right-4 md:top-8 md:right-8 opacity-5 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? <TrendingUp size={120} /> : <TrendingDown size={120} />}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md ${isProfit ? 'bg-emerald-500 shadow-emerald-500/30 text-white' : 'bg-rose-500 shadow-rose-500/30 text-white'}`}>
                                    {isProfit ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                                </div>
                                <div>
                                    <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Profit & Loss Summary</p>
                                    <h3 className={`text-3xl md:text-5xl font-black tracking-tighter ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isProfit ? '+' : ''}{fmt(profit)}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${margin > 20 ? 'bg-emerald-100 text-emerald-700' : margin > 10 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                <Percent size={16} />
                                Margin: {margin.toFixed(1)}%
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><DollarSign size={12}/> Total Pendapatan</p>
                                <p className="text-2xl font-black text-slate-800">{fmt(revenue)}</p>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Package size={12}/> HPP / Modal</p>
                                <p className="text-2xl font-black text-slate-800">({fmt(totalCOGS)})</p>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Wrench size={12}/> Biaya Operasional</p>
                                <p className="text-2xl font-black text-slate-800">({fmt(operationalExpenses)})</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Breakdown Sections */}
                <div className="space-y-6">

                    {/* ─── SURVEY LAPANGAN ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <MapPin size={16} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Survey Lapangan</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.surveys?.length || 0} survey</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Biaya</p>
                                <p className="text-sm font-extrabold text-amber-600">{fmt(validSurveyCosts)}</p>
                            </div>
                        </div>
                        {project.surveys && project.surveys.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lokasi</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Biaya</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.surveys.map((s, idx) => {
                                            const surveyExpense = s.expenses?.reduce((a: number, e: any) => a + (e.amount || 0), 0) || 0
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="px-6 py-3 text-xs font-semibold text-slate-700">{fmtDate(s.date)}</td>
                                                    <td className="px-6 py-3 text-xs font-semibold text-slate-700 max-w-[200px] truncate">{s.location || '-'}</td>
                                                    <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
                                                    <td className="px-6 py-3 text-xs font-bold text-amber-600 text-right">{fmt(surveyExpense)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Belum ada survey</p>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── PENAWARAN HARGA ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <FileText size={16} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Penawaran Harga</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.quotations?.length || 0} penawaran</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div className="hidden md:flex flex-col bg-emerald-50 border border-emerald-200 rounded-xl p-3 min-w-[150px]">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 border-b border-emerald-200/50 pb-1 text-center">Disetujui</p>
                                    <div className="flex justify-between items-center text-[10px] w-full">
                                        <span className="text-slate-500 font-semibold">Nilai:</span>
                                        <span className="font-extrabold text-emerald-600">{fmt(okQuotationsTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] w-full mt-0.5">
                                        <span className="text-slate-500 font-semibold">HPP:</span>
                                        <span className="font-extrabold text-rose-500">{fmt(okQuotationsHPP)}</span>
                                    </div>
                                </div>
                                <div className="hidden md:flex flex-col bg-rose-50 border border-rose-200 rounded-xl p-3 min-w-[150px]">
                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5 border-b border-rose-200/50 pb-1 text-center">Ditolak</p>
                                    <div className="flex justify-between items-center text-[10px] w-full">
                                        <span className="text-slate-500 font-semibold">Nilai:</span>
                                        <span className="font-extrabold text-rose-600">{fmt(rejectedQuotationsTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] w-full mt-0.5">
                                        <span className="text-slate-500 font-semibold">HPP:</span>
                                        <span className="font-extrabold text-rose-500">{fmt(rejectedQuotationsHPP)}</span>
                                    </div>
                                </div>
                                <div className="pl-4 md:pl-2 flex flex-col justify-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Keseluruhan</p>
                                    <p className="text-sm font-extrabold text-blue-600">{fmt(project.quotations?.reduce((a, q) => a + (q.grandTotal || 0), 0) || 0)}</p>
                                </div>
                            </div>
                        </div>
                        {project.quotations && project.quotations.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomor</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subjek</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Estimasi HPP</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.quotations.map((q, idx) => {
                                            const estimasiHpp = q.items?.reduce((a: number, item: any) => a + (item.costPrice || 0) * (item.qty || 1), 0) || 0;
                                            return (
                                            <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-indigo-600">{q.number}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{fmtDate(q.date)}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700 max-w-[200px] truncate">{q.subject || '-'}</td>
                                                <td className="px-6 py-3"><StatusBadge status={q.status} /></td>
                                                <td className="px-6 py-3 text-xs font-bold text-rose-500 text-right">{fmt(estimasiHpp)}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-blue-600 text-right">{fmt(q.grandTotal || 0)}</td>
                                            </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Belum ada penawaran</p>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── PESANAN PENJUALAN ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                    <ShoppingCart size={16} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Pesanan Penjualan (SO)</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.salesOrders?.length || 0} pesanan</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                                <p className="text-sm font-extrabold text-emerald-600">{fmt(revenue)}</p>
                            </div>
                        </div>
                        {project.salesOrders && project.salesOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomor</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subjek</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.salesOrders.map((so, idx) => (
                                            <tr key={so.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-indigo-600">{so.number}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{fmtDate(so.date)}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700 max-w-[200px] truncate">{so.subject || '-'}</td>
                                                <td className="px-6 py-3"><StatusBadge status={so.status} /></td>
                                                <td className="px-6 py-3 text-xs font-bold text-emerald-600 text-right">{fmt(so.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl border border-rose-200">
                                    <AlertCircle size={14} className="text-rose-500" />
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Belum ada Pesanan Penjualan</p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── PURCHASE ORDER ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                                    <ShoppingBag size={16} className="text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Purchase Order (PO)</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.purchaseOrders?.length || 0} PO</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Biaya</p>
                                <p className="text-sm font-extrabold text-orange-600">{fmt(totalPOGrandTotal)}</p>
                            </div>
                        </div>
                        {project.purchaseOrders && project.purchaseOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomor</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vendor</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.purchaseOrders.map((po, idx) => (
                                            <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-indigo-600">{po.number}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{fmtDate(po.date)}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{po.vendor?.name || '-'}</td>
                                                <td className="px-6 py-3"><StatusBadge status={po.status} /></td>
                                                <td className="px-6 py-3 text-xs font-bold text-orange-600 text-right">{fmt(po.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Belum ada PO</p>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── BIAYA OPERASIONAL ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                                    <Wrench size={16} className="text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Biaya Operasional</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Survey expenses + OpEx</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Biaya</p>
                                <p className="text-sm font-extrabold text-rose-600">{fmt(operationalExpenses)}</p>
                            </div>
                        </div>
                        {operationalExpenses > 0 ? (
                            <div className="p-6 md:px-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Survey Expenses</p>
                                        <p className="text-lg font-extrabold text-amber-600">{fmt(validSurveyCosts)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WO Expenses</p>
                                        <p className="text-lg font-extrabold text-orange-600">{fmt(validWoSurveyCosts)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Expenses</p>
                                        <p className="text-lg font-extrabold text-rose-600">{fmt(validProjectSurveyCosts)}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">OpEx</p>
                                        <p className="text-lg font-extrabold text-indigo-600">{fmt(validOpExCosts)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Belum ada biaya operasional</p>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── INVOICE / TAGIHAN ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <Receipt size={16} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Invoice / Tagihan</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.invoices?.length || 0} invoice</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan</p>
                                <p className="text-sm font-extrabold text-indigo-600">{fmt(project.invoices?.reduce((a, inv) => a + (inv.grandTotal || 0), 0) || 0)}</p>
                            </div>
                        </div>
                        {project.invoices && project.invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">No</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomor</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jatuh Tempo</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {project.invoices.map((inv, idx) => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-indigo-600">{inv.number}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{fmtDate(inv.date)}</td>
                                                <td className="px-6 py-3 text-xs font-semibold text-slate-700">{inv.dueDate ? fmtDate(inv.dueDate) : '-'}</td>
                                                <td className="px-6 py-3"><StatusBadge status={inv.status} /></td>
                                                <td className="px-6 py-3 text-xs font-bold text-indigo-600 text-right">{fmt(inv.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="px-6 py-8 text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                                    <AlertCircle size={14} className="text-amber-500" />
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Belum ada Invoice</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ─── P&L SUMMARY TABLE ─── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 md:px-8 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                                <BarChart3 size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Ringkasan Profit & Loss</h3>
                        </div>
                    </div>
                    <div className="p-6 md:px-8">
                        <div className="max-w-lg space-y-3">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Pendapatan (SO)</span>
                                <span className="text-sm font-extrabold text-emerald-600">{fmt(revenue)}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200" />
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biaya Material (Stok Keluar)</span>
                                <span className="text-xs font-bold text-rose-500">({fmt(materialUsageCosts)})</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biaya Pembelian (PO)</span>
                                <span className="text-xs font-bold text-rose-500">({fmt(totalPOGrandTotal)})</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biaya Operasional</span>
                                <span className="text-xs font-bold text-rose-500">({fmt(operationalExpenses)})</span>
                            </div>
                            <div className="border-t border-slate-200" />
                            <div className="flex items-center justify-between py-3 bg-slate-50 -mx-6 md:-mx-8 px-6 md:px-8 rounded-xl">
                                <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Laba / Rugi Bersih</span>
                                <span className={`text-lg font-extrabold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isProfit ? '+' : ''}{fmt(profit)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Margin</span>
                                <span className={`text-lg font-extrabold ${margin > 20 ? 'text-emerald-600' : margin > 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {margin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer Spacer */}
                <div className="h-8" />
            </div>
        </div>
    )
}
