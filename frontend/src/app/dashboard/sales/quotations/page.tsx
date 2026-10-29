"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, FileText, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    Send, Check, Ban, Clock, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import QuotationPDFModal from "./QuotationPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null; pics: Array<{ name: string; department: string | null }> }
export interface ProductSKU { id: string; code: string; name: string | null; salePrice: number; purchasePrice: number; unit: { name: string } }
export interface Product { id: string; code: string; name: string; skus: ProductSKU[] }

export interface QuotationItem {
    id?: string; no: number; description: string; qty: number; unit: string
    unitPrice: number; discount: number; amount: number; skuId?: string; costPrice?: number
}
export interface Quotation {
    id: string; number: string; date: string; validUntil: string; status: string
    customerId: string; customer: Customer; attn: string | null; subject: string
    notes: string | null; paymentTerms: string | null; deliveryTerms: string | null
    currency: string; discountType: string; discount: number; tax: number
    subtotal: number; discountAmt: number; taxAmt: number; grandTotal: number
    createdAt: string; items: QuotationItem[]; projectId?: string; project?: { number: string; name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', icon: Clock },
    SENT: { label: 'Sent', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900', icon: Send },
    ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900', icon: Check },
    REJECTED: { label: 'Rejected', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900', icon: Ban },
    EXPIRED: { label: 'Expired', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900', icon: Clock },
}
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role
    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [filterProject, setFilterProject] = useState("ALL")
    const [modalOpen, setModalOpen] = useState(false)
    const [viewModal, setViewModal] = useState<Quotation | null>(null)
    const [editing, setEditing] = useState<Quotation | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [projects, setProjects] = useState<any[]>([])
    const [openStatusId, setOpenStatusId] = useState<string | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (openStatusId && !target.closest('.status-dropdown')) setOpenStatusId(null)
        }
        if (openStatusId) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [openStatusId])

    const load = useCallback(async () => {
        if (!userRole) return
        setLoading(true)
        try {
            const [qR, cR, pR, coR, prR] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers: { 'x-user-role': userRole } }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, { headers: { 'x-user-role': userRole } }),
            ])
            setQuotations(await qR.json())
            setCustomers(await cR.json())
            setProducts(await pR.json())
            setCompany(await coR.json())
            setProjects(await prR.json())
        } catch { showToast('error', 'Failed to load data') }
        finally { setLoading(false) }
    }, [userRole, showToast])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this quotation?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations/${id}`, { method: 'DELETE' })
        showToast('success', 'Quotation deleted'); load()
    }

    const handleStatus = async (id: string, status: string) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations/${id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
        })
        load()
    }

    const filtered = quotations.filter(q => {
        const s = search.toLowerCase()
        return (q.number.toLowerCase().includes(s) || q.customer?.name?.toLowerCase().includes(s) || q.subject?.toLowerCase().includes(s)) &&
            (filterStatus === 'ALL' || q.status === filterStatus) &&
            (filterProject === 'ALL' || q.projectId === filterProject)
    }).sort((a, b) => {
        const dA = new Date(a.date).getTime() || new Date(a.createdAt).getTime()
        const dB = new Date(b.date).getTime() || new Date(b.createdAt).getTime()
        if (dA !== dB) return dB - dA
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const stats = {
        total: quotations.length,
        draft: quotations.filter(q => q.status === 'DRAFT').length,
        sent: quotations.filter(q => q.status === 'SENT').length,
        accepted: quotations.filter(q => q.status === 'ACCEPTED').length,
        rejected: quotations.filter(q => q.status === 'REJECTED').length,
        expired: quotations.filter(q => q.status === 'EXPIRED').length,
        acceptedValue: quotations.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + q.grandTotal, 0)
    }

    const counts: Record<string, number> = {
        ALL: stats.total,
        DRAFT: stats.draft,
        SENT: stats.sent,
        ACCEPTED: stats.accepted,
        REJECTED: stats.rejected,
        EXPIRED: stats.expired,
    }

    return (
        <div className="p-3 lg:p-4 space-y-2.5 w-full">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-4 right-4 z-[300] flex items-center gap-2 px-3 py-2 rounded shadow-lg text-xs font-mono font-medium border ${toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <FileText size={13} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                            // SALES
                        </span>
                        <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white tracking-tight">Penawaran Harga</h1>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">[{quotations.length} RECORDS]</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] font-mono">
                        <span className="text-slate-500 dark:text-slate-400 text-[9.5px] uppercase">ACCEPTED VALUE:</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{fmt(stats.acceptedValue)}</strong>
                    </div>

                    <Button variant="outline" onClick={load} className="rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 h-7 px-2.5 text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs">
                        <RefreshCw size={11} className="mr-1" /> RELOAD
                    </Button>
                    <Button onClick={() => { setEditing(null); setModalOpen(true) }}
                        className="rounded bg-blue-600 hover:bg-blue-700 text-white font-mono h-7 px-3 text-[11px] shadow-2xs">
                        <Plus size={12} className="mr-1" /> NEW QUOTE
                    </Button>
                </div>
            </header>

            {/* Active Project Highlight Pill */}
            {filterProject !== 'ALL' && (
                <div className="bg-slate-900 rounded p-2 text-white border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="px-1 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded font-mono text-[9px] font-bold uppercase">Active Project</span>
                        <span className="font-mono text-slate-400 font-bold">#{projects.find(p => p.id === filterProject)?.number}</span>
                        <span className="font-semibold text-slate-200">{projects.find(p => p.id === filterProject)?.name}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-mono text-[11px]">Customer: <strong className="text-slate-200">{projects.find(p => p.id === filterProject)?.customer?.name}</strong></span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-mono font-bold text-[11px]">{fmt(filtered.reduce((s, q) => s + q.grandTotal, 0))}</span>
                    </div>
                    <button onClick={() => setFilterProject('ALL')} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Segmented Toolbar: Integrated Status Tabs & Clean Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-[#0b0f17] p-1.5 rounded-md border border-slate-200 dark:border-slate-800">
                {/* Left: Filter Tabs with counts */}
                <div className="flex flex-wrap items-center gap-1">
                    {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => {
                        const count = counts[s] || 0
                        const active = filterStatus === s
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                                    active
                                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>{s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}</span>
                                <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${active ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Right: Search and Project Filter */}
                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search number, customer, subject..."
                            className="w-48 lg:w-64 h-7 pl-7 pr-2.5 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
                        />
                    </div>
                    <select
                        value={filterProject}
                        onChange={e => setFilterProject(e.target.value)}
                        className="h-7 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
                    >
                        <option value="ALL">All Projects</option>
                        {(Array.isArray(projects) ? projects : []).map(p => (
                            <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* High-Density Data Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-[#0b0f17] border border-dashed border-slate-200 dark:border-slate-800 rounded-md py-12 flex flex-col items-center">
                    <FileText size={32} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                    <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">No quotations found</p>
                </div>
            ) : (
                <>
                {/* Desktop High-Density Linear Table */}
                <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] shadow-2xs">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                            <tr className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                <th className="py-2 px-3 font-semibold">Number</th>
                                <th className="py-2 px-3 font-semibold">Customer</th>
                                <th className="py-2 px-3 font-semibold">Subject</th>
                                <th className="py-2 px-3 font-semibold">Date</th>
                                <th className="py-2 px-3 font-semibold">Valid Until</th>
                                <th className="py-2 px-3 font-semibold text-right">Grand Total</th>
                                <th className="py-2 px-3 font-semibold text-right">HPP</th>
                                <th className="py-2 px-3 font-semibold text-right">Margin</th>
                                <th className="py-2 px-3 font-semibold text-center">Status</th>
                                <th className="py-2 px-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filtered.map((q) => {
                                const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT
                                const Icon = sc.icon
                                const totalCost = q.items?.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0) || 0
                                const margin = q.subtotal - (q.discountAmt || 0) - totalCost

                                return (
                                    <tr key={q.id} className="group hover:bg-blue-50/40 dark:hover:bg-slate-900/60 transition-colors">
                                        {/* Number */}
                                        <td className="py-2 px-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setViewModal(q)}
                                                    className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {q.number}
                                                </button>
                                                {q.project && (
                                                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded" title={q.project.name}>
                                                        {q.project.number}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Customer */}
                                        <td className="py-2 px-3 max-w-[170px] truncate">
                                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate block" title={`${q.customer?.name} (${q.customer?.code})`}>
                                                {q.customer?.name}
                                            </span>
                                        </td>

                                        {/* Subject */}
                                        <td className="py-2 px-3 max-w-[220px] truncate">
                                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate block" title={q.subject}>
                                                {q.subject}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                            {fmtDate(q.date)}
                                        </td>

                                        {/* Valid Until */}
                                        <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                            {fmtDate(q.validUntil)}
                                        </td>

                                        {/* Grand Total */}
                                        <td className="py-2 px-3 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5 font-mono">
                                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-tabular">
                                                    {fmt(q.grandTotal)}
                                                </span>
                                                {q.discountAmt > 0 && (
                                                    <span className="text-[9px] text-rose-500 font-mono" title={`Discount: ${fmt(q.discountAmt)}`}>
                                                        (-{fmt(q.discountAmt)})
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Total HPP */}
                                        <td className="py-2 px-3 whitespace-nowrap text-right">
                                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-tabular">
                                                {fmt(totalCost)}
                                            </span>
                                        </td>

                                        {/* Margin */}
                                        <td className="py-2 px-3 whitespace-nowrap text-right">
                                            <span className={`font-mono font-bold text-xs font-tabular ${margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                {fmt(margin)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                            <div className="relative status-dropdown inline-block">
                                                <button
                                                    onClick={() => setOpenStatusId(openStatusId === q.id ? null : q.id)}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold uppercase tracking-wider border cursor-pointer ${sc.color}`}
                                                >
                                                    <Icon size={9} /> {sc.label}
                                                </button>
                                                {openStatusId === q.id && (
                                                    <div className="absolute z-50 top-full mt-1 right-0 bg-white dark:bg-slate-900 shadow-xl rounded border border-slate-200 dark:border-slate-800 p-1 min-w-[120px]">
                                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                            <button
                                                                key={k}
                                                                onClick={() => { handleStatus(q.id, k); setOpenStatusId(null); }}
                                                                className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono font-semibold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${q.status === k ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                                            >
                                                                {v.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setViewModal(q)}
                                                    title="Preview PDF"
                                                    className="w-6 h-6 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center transition-colors"
                                                >
                                                    <Eye size={12} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditing(q); setModalOpen(true) }}
                                                    title="Edit"
                                                    className="w-6 h-6 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-colors"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(q.id)}
                                                    title="Delete"
                                                    className="w-6 h-6 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: High Density Cards */}
                <div className="md:hidden space-y-2">
                    {filtered.map((q) => {
                        const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT
                        const Icon = sc.icon
                        const totalCost = q.items?.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0) || 0
                        const margin = q.subtotal - (q.discountAmt || 0) - totalCost

                        return (
                            <div key={q.id} className="bg-white dark:bg-[#0b0f17] p-2.5 rounded border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setViewModal(q)} className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                            {q.number}
                                        </button>
                                        {q.project && <span className="font-mono text-[9px] text-slate-400">#{q.project.number}</span>}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase border ${sc.color}`}>
                                        <Icon size={8} /> {sc.label}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 leading-tight">{q.customer?.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{q.subject}</p>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono text-xs">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(q.grandTotal)}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setViewModal(q)} className="p-1 text-slate-500 hover:text-emerald-600"><Eye size={12} /></button>
                                        <button onClick={() => { setEditing(q); setModalOpen(true) }} className="p-1 text-slate-500 hover:text-blue-600"><Edit size={12} /></button>
                                        <button onClick={() => handleDelete(q.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                </>
            )}

            {/* Form Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <QuotationFormModal
                        quotation={editing} customers={customers} products={products} projects={projects}
                        onClose={() => setModalOpen(false)}
                        onSuccess={() => { setModalOpen(false); load(); showToast('success', editing ? 'Quotation updated!' : 'Quotation created!') }}
                    />
                )}
            </AnimatePresence>

            {/* PDF Modal */}
            <AnimatePresence>
                {viewModal && (
                    <QuotationPDFModal quotation={viewModal} company={company} products={products} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── SEARCHABLE PRODUCT (SKU) PICKER ──────────────────────────────────────────
function ProductSKUPicker({ products, value, onSelect }: {
    products: Product[]
    value?: string
    onSelect: (skuId: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [highlight, setHighlight] = useState(0)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const listRef = useRef<HTMLDivElement | null>(null)
    const [pos, setPos] = useState({ up: false, top: 0, bottom: 0, left: 0, width: 340, maxHeight: 320 })

    useEffect(() => { setMounted(true) }, [])

    const options = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list: Array<{ sku: ProductSKU; product: Product }> = []
        for (const p of products || []) {
            for (const s of p.skus || []) {
                if (!q || `${p.code} ${p.name} ${s.code} ${s.name || ''}`.toLowerCase().includes(q)) {
                    list.push({ sku: s, product: p })
                }
            }
        }
        return list
    }, [products, query])

    const selected = useMemo(() => {
        for (const p of products || []) {
            const s = p.skus?.find(x => x.id === value)
            if (s) return { sku: s, product: p }
        }
        return null
    }, [products, value])

    const updatePos = useCallback(() => {
        const el = triggerRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const width = Math.max(r.width, 360)
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const up = spaceBelow < 260 && spaceAbove > spaceBelow
        const maxHeight = Math.min(320, Math.max(140, (up ? spaceAbove : spaceBelow) - 12))
        let left = r.left
        if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
        setPos({
            up,
            top: r.bottom + 4,
            bottom: window.innerHeight - r.top + 4,
            left,
            width,
            maxHeight,
        })
    }, [])

    const openPicker = () => {
        updatePos()
        setQuery('')
        setHighlight(0)
        setOpen(true)
    }

    const closePicker = () => { setOpen(false); setQuery('') }

    const pick = (skuId: string) => {
        onSelect(skuId)
        closePicker()
    }

    useEffect(() => {
        if (!open) return
        updatePos()
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node
            if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
            setOpen(false)
        }
        const onScroll = () => updatePos()
        window.addEventListener('mousedown', onDown)
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', onScroll)
        const t = setTimeout(() => inputRef.current?.focus(), 20)
        return () => {
            clearTimeout(t)
            window.removeEventListener('mousedown', onDown)
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', onScroll)
        }
    }, [open, updatePos])

    useEffect(() => { setHighlight(0) }, [query])

    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
        el?.scrollIntoView({ block: 'nearest' })
    }, [highlight])

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight(h => Math.min(h + 1, options.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight(h => Math.max(h - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const opt = options[highlight]
            if (opt) pick(opt.sku.id)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            closePicker()
        }
    }

    const panel = (
        <div
            ref={panelRef}
            className="fixed z-[300] bg-white rounded-xl border border-slate-200 shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col"
            style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
            }}
        >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                <Search size={13} className="text-slate-400 shrink-0" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Cari produk / SKU / kode..."
                    className="w-full text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
                {query && (
                    <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={12} /></button>
                )}
            </div>
            <div ref={listRef} className="overflow-y-auto py-1">
                {options.length === 0 ? (
                    <p className="px-3 py-4 text-[11px] text-slate-400 text-center">Produk tidak ditemukan</p>
                ) : options.map(({ sku, product }, i) => (
                    <button
                        type="button"
                        key={sku.id}
                        data-idx={i}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => pick(sku.id)}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${i === highlight ? 'bg-indigo-50' : 'bg-white'} ${sku.id === value ? 'ring-1 ring-inset ring-indigo-200' : ''}`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                                {product.name}
                                {sku.name ? <span className="font-medium text-slate-500"> · {sku.name}</span> : null}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{product.code} · {sku.code}</p>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 whitespace-nowrap pt-0.5">
                            Rp{(sku.salePrice ?? 0).toLocaleString('id-ID')}
                        </span>
                    </button>
                ))}
            </div>
            <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 text-[9px] text-slate-400 flex justify-between">
                <span>{options.length} produk</span>
                <span>↑↓ navigasi · Enter pilih · Esc tutup</span>
            </div>
        </div>
    )

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => (open ? closePicker() : openPicker())}
                title={selected ? `${selected.sku.code}${selected.sku.name ? ' · ' + selected.sku.name : ''} — ${selected.product.code} ${selected.product.name}` : 'Pilih produk'}
                className={`w-full text-left text-[10px] border rounded-lg px-2 py-1.5 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${selected ? 'bg-indigo-50/60 border-indigo-200 text-indigo-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
                <span className="truncate flex-1">
                    {selected ? (selected.sku.code || selected.sku.name || 'SKU') : 'Pick SKU...'}
                </span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 opacity-60">
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {open && mounted ? createPortal(panel, document.body) : null}
        </>
    )
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────
function QuotationFormModal({ quotation, customers, products, projects, onClose, onSuccess }:
    { quotation: Quotation | null; customers: Customer[]; products: Product[]; projects: any[]; onClose: () => void; onSuccess: () => void }) {

    const isEdit = !!quotation
    const today = new Date().toISOString().split('T')[0]
    const plus30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]

    const [form, setForm] = useState({
        customerId: quotation?.customerId || '',
        attn: quotation?.attn || '',
        subject: quotation?.subject || '',
        date: quotation?.date ? quotation.date.split('T')[0] : today,
        validUntil: quotation?.validUntil ? quotation.validUntil.split('T')[0] : plus30,
        paymentTerms: quotation?.paymentTerms || 'NET 30',
        deliveryTerms: quotation?.deliveryTerms || 'FOB Jakarta',
        notes: quotation?.notes || 'Penawaran ini berlaku sesuai tanggal validitas di atas.\nHarga belum termasuk biaya pengiriman kecuali disebutkan.\nApabila ada pertanyaan, silakan hubungi kami.',
        currency: quotation?.currency || 'IDR',
        discountType: quotation?.discountType || 'PERCENTAGE',
        discount: quotation?.discount ?? 0,
        tax: quotation?.tax ?? 11,
        projectId: quotation?.projectId || '',
    })
    const [items, setItems] = useState<QuotationItem[]>(
        quotation?.items?.length
            ? [...quotation.items].sort((a, b) => a.no - b.no).map(i => ({ ...i }))
            : [{ no: 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }]
    )
    const [saving, setSaving] = useState(false)

    const calcItem = (it: QuotationItem): QuotationItem => ({ ...it, amount: it.qty * it.unitPrice * (1 - it.discount / 100) })
    const updateItem = (idx: number, patch: Partial<QuotationItem>) =>
        setItems(prev => prev.map((it, i) => i === idx ? calcItem({ ...it, ...patch }) : it))
    const addRow = () => setItems(prev => [...prev, { no: prev.length + 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }])
    const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 })))

    const fillFromSKU = (idx: number, skuId: string) => {
        for (const p of products) {
            const sku = p.skus?.find(s => s.id === skuId)
            if (sku) { updateItem(idx, { description: `${p.name}${sku.name ? ' - ' + sku.name : ''} (${sku.code})`, unitPrice: sku.salePrice, costPrice: sku.purchasePrice, unit: sku.unit?.name || 'pcs', skuId }); return }
        }
    }

    const subtotal = items.reduce((s, i) => s + i.amount, 0)
    const totalCost = items.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0)
    const discountAmt = (form as any).discountType === 'AMOUNT' ? Number(form.discount) : subtotal * (Number(form.discount) / 100)
    const taxable = subtotal - discountAmt
    const totalMargin = taxable - totalCost
    const taxAmt = taxable * (Number(form.tax) / 100)
    const grandTotal = taxable + taxAmt

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const body = { ...form, items, subtotal, discountAmt, taxAmt, grandTotal }
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/quotations/${quotation!.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/quotations`
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { onSuccess() } else { const e = await res.json(); alert(e.message) }
        } finally { setSaving(false) }
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl w-full max-w-7xl md:my-4 flex flex-col">
                <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 md:px-8 md:py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <FileText size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-slate-900 text-base uppercase tracking-wider">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h2>
                            {isEdit && <p className="text-[10px] text-indigo-500 font-black tracking-widest">{quotation!.number}</p>}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className={lc}>Customer <span className="text-rose-500">*</span></label>
                            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className={ic}>
                                <option value="">-- Select Customer --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Project (Payung ID)</label>
                            <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={ic + " text-indigo-700 font-bold border-indigo-200 bg-indigo-50/20"}>
                                <option value="">-- No Project --</option>
                                {(Array.isArray(projects) ? projects : []).map(p => <option key={p.id} value={p.id}>{p.number} — {p.name}{p.customer ? ` (${p.customer.name})` : ''}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Attention / PIC</label>
                            <input value={form.attn} onChange={e => setForm({ ...form, attn: e.target.value })} placeholder="Bpk/Ibu ..." className={ic} />
                        </div>
                        <div className="md:col-span-3">
                            <label className={lc}>Perihal / Subject <span className="text-rose-500">*</span></label>
                            <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Penawaran Harga Perangkat Jaringan" className={ic} />
                        </div>
                        <div><label className={lc}>Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ic} /></div>
                        <div><label className={lc}>Berlaku Sampai</label><input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} className={ic} /></div>
                        <div>
                            <label className={lc}>Mata Uang</label>
                            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={ic}>
                                <option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option>
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Termin Pembayaran</label>
                            <input
                                type="text"
                                list="quotation-payment-terms"
                                value={form.paymentTerms || ''}
                                onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                                placeholder="Pilih atau ketik termin pembayaran..."
                                className={ic}
                            />
                            <datalist id="quotation-payment-terms">
                                <option value="Cash / Tunai" />
                                <option value="NET 7 Hari" />
                                <option value="NET 14 Hari" />
                                <option value="NET 30 Hari" />
                                <option value="NET 45 Hari" />
                                <option value="NET 60 Hari" />
                                <option value="DP 50%, Pelunasan 50%" />
                                <option value="DP 30%, Pelunasan 70%" />
                                <option value="DP 50%, 30% 1 Bulan, 20% 2 Bulan" />
                                <option value="DP 30%, 40% Progres, 30% Retensi" />
                                <option value="Sesuai Kesepakatan / Kontrak" />
                            </datalist>
                        </div>
                        <div>
                            <label className={lc}>Syarat Pengiriman</label>
                            <input
                                type="text"
                                list="quotation-delivery-terms"
                                value={form.deliveryTerms || ''}
                                onChange={e => setForm({ ...form, deliveryTerms: e.target.value })}
                                placeholder="Pilih atau ketik syarat pengiriman..."
                                className={ic}
                            />
                            <datalist id="quotation-delivery-terms">
                                <option value="FOB Jakarta" />
                                <option value="CIF Tujuan" />
                                <option value="Ex-Works" />
                                <option value="Franco Gudang Pembeli" />
                                <option value="Loco Gudang Penjual" />
                                <option value="Sesuai Kesepakatan" />
                            </datalist>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Line Items</h3>
                            <button type="button" onClick={addRow} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                <Plus size={11} /> Add Row
                            </button>
                        </div>
                        <div className="-mx-6 px-6 md:mx-0 md:px-0 pb-4 md:pb-0 overflow-x-auto scrollbar-hide">
                            <div className="min-w-[1350px] rounded-2xl border border-slate-100">
                                <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                                        <th className="px-3 py-3 w-8">No</th>
                                        <th className="px-3 py-3 w-40">From Product</th>
                                        <th className="px-3 py-3 min-w-[450px]">Description</th>
                                        <th className="px-3 py-3 w-20">Qty</th>
                                        <th className="px-3 py-3 w-20">Unit</th>
                                        <th className="px-3 py-3 w-32">Unit Price</th>
                                        <th className="px-3 py-3 w-16">Disc%</th>
                                        <th className="px-3 py-3 w-32">HPP / Unit</th>
                                        <th className="px-3 py-3 w-32 text-right">Amount</th>
                                        <th className="px-3 py-3 w-32 text-right">Margin</th>
                                        <th className="px-3 py-3 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 align-top">
                                            <td className="px-3 py-2 text-[11px] font-black text-slate-400 text-center">{it.no}</td>
                                            <td className="px-2 py-2">
                                                <ProductSKUPicker
                                                    products={products}
                                                    value={it.skuId}
                                                    onSelect={skuId => fillFromSKU(idx, skuId)}
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <textarea value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Item description..." rows={3}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y min-h-[60px]" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" step="0.01" value={it.qty} onChange={e => updateItem(idx, { qty: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" step="any" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" max="100" step="0.1" value={it.discount} onChange={e => updateItem(idx, { discount: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" step="any" value={it.costPrice || 0} onChange={e => updateItem(idx, { costPrice: +e.target.value })}
                                                    className="w-full text-sm bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <p className="text-sm font-bold text-slate-800">Rp {it.amount.toLocaleString('id-ID')}</p>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {(() => {
                                                    const globalDiscRatio = subtotal > 0 ? (discountAmt / subtotal) : 0;
                                                    const netAmount = it.amount * (1 - globalDiscRatio);
                                                    const margin = netAmount - (it.costPrice || 0) * it.qty;
                                                    return (
                                                        <p className={`text-sm font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                            Rp {margin.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                                        </p>
                                                    )
                                                })()}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => removeRow(idx)}
                                                        className="w-6 h-6 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"><X size={12} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>

                    {/* Totals + Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={lc}>Catatan / Syarat &amp; Ketentuan</label>
                            <textarea rows={5} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                className={ic + " resize-none"} placeholder="Syarat dan ketentuan..." />
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Subtotal</span>
                                <span className="font-bold text-slate-800">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-600 font-medium">Total HPP / Modal</span>
                                <span className="font-bold text-amber-700">Rp {totalCost.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 font-medium">Margin {subtotal > 0 ? `(${((totalMargin / subtotal) * 100).toFixed(1)}%)` : ''}</span>
                                <span className={`font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>Rp {totalMargin.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-medium text-sm">Discount</span>
                                    <select value={(form as any).discountType} onChange={e => setForm({ ...form, discountType: e.target.value })} className="text-xs bg-slate-100 border border-slate-200 rounded px-1 py-0.5 outline-none text-slate-600">
                                        <option value="PERCENTAGE">%</option>
                                        <option value="AMOUNT">Rp</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" step="0.1" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })}
                                        className="w-24 text-sm bg-white border border-slate-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-indigo-500" />
                                    <span className="font-semibold text-rose-600 text-sm w-28 text-right">- Rp {discountAmt.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium text-sm">PPN (%)</span>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" max="100" step="0.1" value={form.tax} onChange={e => setForm({ ...form, tax: +e.target.value })}
                                        className="w-20 text-sm bg-white border border-slate-200 rounded-lg px-2 py-1 text-center focus:outline-none" />
                                    <span className="font-semibold text-slate-600 text-sm">+ Rp {taxAmt.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <div className="border-t border-slate-200 pt-3 flex justify-between">
                                <span className="font-black text-slate-900 uppercase tracking-wider text-sm">Grand Total</span>
                                <span className="font-black text-indigo-700 text-lg">Rp {grandTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 md:-mx-8 md:-mb-8 md:px-8 md:py-4 flex justify-end gap-3 mt-auto border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-600 h-10 md:h-12 px-6 text-xs font-bold uppercase tracking-wider flex-1 md:flex-none">Cancel</Button>
                        <Button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 md:h-12 px-8 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex-1 md:flex-none">
                            <Save size={14} className="mr-2" /> {saving ? 'Saving...' : isEdit ? 'Update' : 'Create Quotation'}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
