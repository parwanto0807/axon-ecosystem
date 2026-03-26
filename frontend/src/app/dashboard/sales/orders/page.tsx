"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, FileText, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    Send, Check, Ban, Clock, ShoppingCart, Truck, Package,
    Paperclip, Image as ImageIcon, FileImage, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import SalesOrderPDFModal from "./SalesOrderPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null; pics: Array<{ name: string; department: string | null }> }
interface Quotation { id: string; number: string; subject: string; status: string; customerId: string; customer: { name: string }; items: any[]; discount: number; tax: number; paymentTerms: string | null; deliveryTerms: string | null; currency: string; attn: string | null; notes: string | null; projectId?: string }
interface OrderItem {
    id?: string; no: number; description: string; qty: number; unit: string
    unitPrice: number; discount: number; amount: number; _skuId?: string
}
interface SalesOrder {
    id: string; number: string; poNumber: string | null; date: string; status: string
    customerId: string; customer: Customer; attn: string | null; subject: string
    notes: string | null; paymentTerms: string | null; deliveryTerms: string | null
    currency: string; discount: number; tax: number
    subtotal: number; discountAmt: number; taxAmt: number; grandTotal: number
    createdAt: string; items: OrderItem[]; quotationId?: string; quotation?: { number: string }
    poProof?: string | null; projectId?: string; project?: { number: string; name: string }
    businessCategoryId: string | null; businessCategory?: { id: string; name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    PROCESSING: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package },
    PARTIAL: { label: 'Partial', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck },
    SHIPPED: { label: 'Shipped', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
    COMPLETED: { label: 'Completed', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: CheckCircle2 },
}
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const ImagePreviewModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm transition-all" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-white p-2 rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <img src={url} alt="PO Proof Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md">
                    <X size={20} />
                </button>
            </motion.div>
        </div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SalesOrdersPage() {
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [filterProject, setFilterProject] = useState("ALL")
    const [modalOpen, setModalOpen] = useState(false)
    const [viewModal, setViewModal] = useState<SalesOrder | null>(null)
    const [editing, setEditing] = useState<SalesOrder | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [projects, setProjects] = useState<any[]>([])
    const [businessCategories, setBusinessCategories] = useState<any[]>([])
    const [filterBusinessCategory, setFilterBusinessCategory] = useState("ALL")

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [oR, cR, pR, coR, qR, prR, bcR] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`),
            ])
            setOrders(await oR.json())
            setCustomers(await cR.json())
            setProducts(await pR.json())
            setCompany(await coR.json())
            setQuotations(await qR.json())
            setProjects(await prR.json())
            setBusinessCategories(await bcR.json())
        } catch { showToast('error', 'Failed to load data') }
        finally { setLoading(false) }
    }, [showToast])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this Sales Order?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}`, { method: 'DELETE' })
        showToast('success', 'Sales Order deleted'); load()
    }

    const handleStatus = async (id: string, status: string) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
        })
        load()
    }

    const filtered = orders.filter(o => {
        const s = search.toLowerCase()
        return (o.number.toLowerCase().includes(s) || (o.poNumber || '').toLowerCase().includes(s) || o.customer?.name?.toLowerCase().includes(s) || o.subject?.toLowerCase().includes(s)) &&
            (filterStatus === 'ALL' || o.status === filterStatus) &&
            (filterProject === 'ALL' || o.projectId === filterProject) &&
            (filterBusinessCategory === 'ALL' || o.businessCategoryId === filterBusinessCategory)
    }).sort((a, b) => (a.projectId || '').localeCompare(b.projectId || ''))

    const stats = {
        total: orders.length,
        processing: orders.filter(o => o.status === 'PROCESSING').length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        totalValue: orders.reduce((s, o) => s + o.grandTotal, 0)
    }

    return (
        <div className="px-4 py-6 space-y-6 w-full">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <ShoppingCart size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pesanan Penjualan</h1>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Sales Order Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-10 px-4 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={13} className="mr-2" /> Reload
                    </Button>
                    <Button onClick={() => { setEditing(null); setModalOpen(true) }}
                        className="flex-1 md:flex-none rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                        <Plus size={15} className="mr-2" /> New Order
                    </Button>
                </div>
            </header>

            {/* Project Highlight Title */}
            {filterProject !== 'ALL' && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Briefcase size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-black uppercase tracking-widest">Active Project</span>
                            <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest"># {projects.find(p => p.id === filterProject)?.number}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-sm pr-10 md:pr-0 break-words whitespace-normal">
                            {projects.find(p => p.id === filterProject)?.name}
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mt-4">
                            <div className="flex flex-col">
                                <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">Customer</span>
                                <span className="text-sm font-bold">{projects.find(p => p.id === filterProject)?.customer?.name}</span>
                            </div>
                            <div className="hidden md:block w-px h-8 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">Accumulated Order Value</span>
                                <span className="text-sm font-bold">{fmt(filtered.reduce((s, o) => s + o.grandTotal, 0))}</span>
                            </div>
                            <button onClick={() => setFilterProject('ALL')} className="absolute top-0 right-0 md:static md:top-auto md:right-auto md:ml-auto bg-white/10 hover:bg-white/20 p-2 md:p-2 rounded-xl transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Orders', value: stats.total },
                    { label: 'Processing', value: stats.processing },
                    { label: 'Pending', value: stats.pending },
                    { label: 'Total Order Value', value: fmt(stats.totalValue), big: true },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{s.label}</p>
                        <p className={`font-extrabold mt-1 ${s.big ? 'text-sm md:text-base' : 'text-2xl md:text-3xl'} text-slate-900 truncate`}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative w-full md:w-auto flex-1 min-w-0">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SO#, PO#, customer..."
                        className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white w-full md:w-72 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-300" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap font-bold uppercase tracking-wider transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            {s === 'ALL' ? 'All Status' : STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
                <div className="md:ml-auto w-full md:w-auto flex items-center gap-2">
                    <select value={filterBusinessCategory} onChange={e => setFilterBusinessCategory(e.target.value)}
                        className="w-full md:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none">
                        <option value="ALL">All Business Units</option>
                        {Array.isArray(businessCategories) && businessCategories.map(bc => <option key={bc.id} value={bc.id}>{bc.name}</option>)}
                    </select>
                    <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                        className="w-full md:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none">
                        <option value="ALL">All Projects</option>
                        {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 flex flex-col items-center">
                    <ShoppingCart size={64} className="text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-sm">No sales orders found</p>
                </div>
            ) : (
                <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100 bg-slate-50/80">
                                <th className="px-6 py-4">PO Proof</th>
                                <th className="px-6 py-4">SO Number</th>
                                <th className="px-6 py-4">Business Unit</th>
                                <th className="px-6 py-4">Customer / PO#</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Grand Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 && (() => {
                                let lastProject: string | null = "INITIAL";
                                return filtered.map((o, idx) => {
                                    const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.DRAFT
                                    const Icon = sc.icon
                                    const showHeader = o.projectId !== lastProject;
                                    lastProject = o.projectId || null;

                                    return (
                                        <Fragment key={o.id}>
                                            {showHeader && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={8} className="px-6 py-2 border-y border-slate-100 italic">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project:</span>
                                                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">
                                                                {o.project ? `${o.project.number} — ${o.project.name}` : 'No Project / Regular Sales'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <motion.tr initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * .03 }}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                                <td className="px-6 py-4">
                                                    {o.poProof ? (
                                                        <button onClick={() => setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`)}
                                                            className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 active:scale-95 group/thumb">
                                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`} alt="PO Proof" className="w-full h-full object-cover grayscale group-hover/thumb:grayscale-0 transition-all" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                                            <FileImage size={18} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{o.number}</p>
                                                    {o.quotation && (
                                                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded cursor-help" title="Based on Quotation">
                                                            <FileText size={8} /> {o.quotation.number}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {o.businessCategory ? (
                                                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                                            {o.businessCategory.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest italic">Generic</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800 text-sm">{o.customer?.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">PO: {o.poNumber || '-'}</p>
                                                        {o.poProof && (
                                                            <button onClick={() => setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`)}
                                                                className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors">
                                                                <ImageIcon size={8} /> Preview
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px]"><p className="text-sm text-slate-700 truncate font-medium">{o.subject}</p></td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">{fmtDate(o.date)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-bold text-slate-900 text-sm">{fmt(o.grandTotal)}</p>
                                                    <p className="text-[9px] text-slate-400">{o.items?.length || 0} items</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="relative group/status inline-block">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border cursor-pointer ${sc.color}`}>
                                                            <Icon size={9} /> {sc.label}
                                                        </span>
                                                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-xl border border-slate-100 p-1 hidden group-hover/status:block min-w-[120px]">
                                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                                <button key={k} onClick={() => handleStatus(o.id, k)}
                                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors ${o.status === k ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                                    {v.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => setViewModal(o)} title="Preview / Download PDF"
                                                            className="w-7 h-7 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors"><Eye size={14} /></button>
                                                        <button onClick={() => { setEditing(o); setModalOpen(true) }} title="Edit"
                                                            className="w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(o.id)} title="Delete"
                                                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        </Fragment>
                                    )
                                })
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {(() => {
                        let lastProject: string | null = "INITIAL";
                        return filtered.map((o, idx) => {
                            const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.DRAFT;
                            const Icon = sc.icon;
                            const showHeader = o.projectId !== lastProject;
                            lastProject = o.projectId || null;

                            return (
                                <Fragment key={o.id}>
                                    {showHeader && (
                                        <div className="flex items-start gap-2 mt-6 mb-2">
                                            <div className="w-1 h-3.5 bg-indigo-500 rounded-full shrink-0 mt-0.5" />
                                            <span className="flex-1 min-w-0 text-[10px] font-black text-indigo-600 uppercase tracking-widest break-words leading-relaxed">
                                                {o.project ? `${o.project.number} — ${o.project.name}` : 'Regular Sales'}
                                            </span>
                                        </div>
                                    )}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{o.number}</p>
                                                    {o.poProof && (
                                                        <button onClick={() => setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`)}
                                                            className="text-indigo-500 hover:text-indigo-700">
                                                            <ImageIcon size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{o.customer?.name}</h3>
                                                    {o.businessCategory && (
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-wider border border-indigo-100 shrink-0">
                                                            {o.businessCategory.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 line-clamp-1">{o.subject}</p>
                                            </div>
                                            <select value={o.status} onChange={(e) => handleStatus(o.id, e.target.value)}
                                                className={`appearance-none bg-transparent outline-none cursor-pointer pl-2 pr-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border text-center ${sc.color}`}>
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <option key={k} value={k} className="text-slate-800 bg-white">{v.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="bg-slate-50 p-2 rounded-xl">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SO Date</p>
                                                <p className="text-xs font-semibold text-slate-700">{fmtDate(o.date)}</p>
                                            </div>
                                            <div className="bg-indigo-50/50 p-2 rounded-xl">
                                                <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Grand Total</p>
                                                <p className="text-xs font-bold text-indigo-700">{fmt(o.grandTotal)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-medium">{o.items?.length || 0} items</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-ellipsis overflow-hidden max-w-[120px]">PO: {o.poNumber || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setViewModal(o)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Eye size={14} /></button>
                                                <button onClick={() => { setEditing(o); setModalOpen(true) }} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Edit size={14} /></button>
                                                <button onClick={() => handleDelete(o.id)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Fragment>
                            );
                        });
                    })()}
                </div>
                </>
            )}

            <AnimatePresence>
                {modalOpen && (
                    <OrderFormModal
                        order={editing} customers={customers} products={products} quotations={quotations} projects={projects} businessCategories={businessCategories}
                        onClose={() => setModalOpen(false)}
                        onPreview={setPreviewImage}
                        onSuccess={() => { setModalOpen(false); load(); showToast('success', editing ? 'Sales Order updated!' : 'Sales Order created!') }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewModal && (
                    <SalesOrderPDFModal order={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {previewImage && <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />}
            </AnimatePresence>
        </div>
    )
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────
function OrderFormModal({ order, customers, products, quotations, projects, businessCategories, onClose, onSuccess, onPreview }:
    { order: SalesOrder | null; customers: Customer[]; products: any[]; quotations: Quotation[]; projects: any[]; businessCategories: any[]; onClose: () => void; onSuccess: () => void; onPreview: (url: string) => void }) {

    const isEdit = !!order
    const today = new Date().toISOString().split('T')[0]

    const [form, setForm] = useState({
        customerId: order?.customerId || '',
        poNumber: order?.poNumber || '',
        attn: order?.attn || '',
        subject: order?.subject || '',
        date: order?.date ? order.date.split('T')[0] : today,
        paymentTerms: order?.paymentTerms || 'NET 30',
        deliveryTerms: order?.deliveryTerms || 'FOB Jakarta',
        notes: order?.notes || '',
        currency: order?.currency || 'IDR',
        discount: order?.discount ?? 0,
        tax: order?.tax ?? 11,
        quotationId: order?.quotationId || '',
        poProof: order?.poProof || null,
        projectId: order?.projectId || '',
        businessCategoryId: order?.businessCategoryId || '',
    })
    const [items, setItems] = useState<OrderItem[]>(
        order?.items?.length ? order.items.map(i => ({ ...i })) :
            [{ no: 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }]
    )
    const [saving, setSaving] = useState(false)

    const calcItem = (it: OrderItem): OrderItem => ({ ...it, amount: it.qty * it.unitPrice * (1 - it.discount / 100) })
    const updateItem = (idx: number, patch: Partial<OrderItem>) =>
        setItems(prev => prev.map((it, i) => i === idx ? calcItem({ ...it, ...patch }) : it))
    const addRow = () => setItems(prev => [...prev, { no: prev.length + 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }])
    const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 })))

    const fillFromSKU = (idx: number, skuId: string) => {
        for (const p of products) {
            const sku = p.skus?.find((s: any) => s.id === skuId)
            if (sku) { updateItem(idx, { description: `${p.name}${sku.name ? ' - ' + sku.name : ''} (${sku.code})`, unitPrice: sku.salePrice, unit: sku.unit?.name || 'pcs', _skuId: skuId }); return }
        }
    }

    const fillFromQuotation = (qId: string) => {
        const q = quotations.find(quo => quo.id === qId)
        if (!q) return
        setForm(f => ({
            ...f,
            customerId: q.customerId || f.customerId,
            attn: q.attn || f.attn,
            subject: q.subject || f.subject,
            paymentTerms: q.paymentTerms || f.paymentTerms,
            deliveryTerms: q.deliveryTerms || f.deliveryTerms,
            notes: q.notes || f.notes,
            currency: q.currency || f.currency,
            discount: q.discount ?? f.discount,
            tax: q.tax ?? f.tax,
            quotationId: qId,
            projectId: q.projectId || f.projectId
        }))
        if (q.items?.length) {
            setItems(q.items.map((it: any, idx: number) => ({
                no: idx + 1,
                description: it.description,
                qty: it.qty,
                unit: it.unit,
                unitPrice: it.unitPrice,
                discount: it.discount,
                amount: it.amount
            })))
        }
    }

    const subtotal = items.reduce((s, i) => s + i.amount, 0)
    const discountAmt = subtotal * (Number(form.discount) / 100)
    const taxable = subtotal - discountAmt
    const taxAmt = taxable * (Number(form.tax) / 100)
    const grandTotal = taxable + taxAmt

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const body = { ...form, items, subtotal, discountAmt, taxAmt, grandTotal }
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${order!.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/orders`
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { onSuccess() } else { const e = await res.json(); alert(e.message) }
        } finally { setSaving(false) }
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto font-inter">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl w-full max-w-5xl md:my-4 flex flex-col">
                <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 md:px-8 md:py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <ShoppingCart size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-slate-900 text-base uppercase tracking-wider">{isEdit ? 'Edit Sales Order' : 'New Sales Order'}</h2>
                            {isEdit && <p className="text-[10px] text-indigo-500 font-black tracking-widest">{order!.number}</p>}
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
                                {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Berdasarkan Penawaran (Opsional)</label>
                            <select value={form.quotationId} onChange={e => fillFromQuotation(e.target.value)} className={ic + " text-indigo-700 font-bold border-indigo-200 bg-indigo-50/20"}>
                                <option value="">-- Tanpa Penawaran --</option>
                                {quotations.filter(q => q.status === 'ACCEPTED').map(q => <option key={q.id} value={q.id}>{q.number} — {q.customer?.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Project (Payung ID)</label>
                            <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={ic + " text-indigo-700 font-bold border-indigo-200 bg-indigo-50/20"}>
                                <option value="">-- No Project --</option>
                                {Array.isArray(projects) && projects.filter(p => p.customerId === form.customerId || !form.customerId).map(p => <option key={p.id} value={p.id}>{p.number} — {p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Business Unit / Category <span className="text-rose-500">*</span></label>
                            <select required value={form.businessCategoryId} onChange={e => setForm({ ...form, businessCategoryId: e.target.value })} className={ic + " font-bold text-indigo-600"}>
                                <option value="">-- Select Business Unit --</option>
                                {Array.isArray(businessCategories) && businessCategories.map(bc => <option key={bc.id} value={bc.id}>{bc.name}</option>)}
                            </select>
                        </div>
                        <div><label className={lc}>Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ic} /></div>
                        <div>
                            <label className={lc}>Customer PO Number</label>
                            <input value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} placeholder="PO-12345 ..." className={ic} />
                        </div>
                        <div>
                            <label className={lc}>Attention / PIC</label>
                            <input value={form.attn} onChange={e => setForm({ ...form, attn: e.target.value })} placeholder="Bpk/Ibu ..." className={ic} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={lc}>Perihal / Subject <span className="text-rose-500">*</span></label>
                            <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="PO Customer - ..." className={ic} />
                        </div>
                        <div className="md:col-span-1">
                            <label className={lc}>Upload Bukti PO</label>
                            <div className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                                {form.poProof ? (
                                    <button type="button" onClick={() => onPreview(`${process.env.NEXT_PUBLIC_API_URL}${form.poProof}`)}
                                        className="w-12 h-12 rounded-lg bg-indigo-600 overflow-hidden shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform">
                                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${form.poProof}`} alt="PO Proof" className="w-full h-full object-cover" />
                                    </button>
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                                        <Paperclip size={18} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 relative">
                                    <p className="text-[11px] font-bold text-slate-600 truncate">
                                        {form.poProof ? 'File Terunggah' : 'Pilih File PO'}
                                    </p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter truncate">
                                        {form.poProof ? 'Klik thumbnail untuk lihat' : 'JPG/PNG/WEBP'}
                                    </p>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const formData = new FormData()
                                        formData.append('file', file)
                                        try {
                                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/upload`, { method: 'POST', body: formData })
                                            if (res.ok) {
                                                const { url } = await res.json()
                                                setForm({ ...form, poProof: url })
                                            }
                                        } catch (err) { alert('Upload failed') }
                                    }} />
                                </div>
                                {form.poProof && (
                                    <button type="button" onClick={() => setForm({ ...form, poProof: null })}
                                        className="w-7 h-7 rounded-lg bg-white border border-slate-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center shadow-sm transition-colors">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className={lc}>Termin Pembayaran</label>
                            <select value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className={ic}>
                                <option>Cash/Tunai</option><option>NET 7</option><option>NET 14</option><option>NET 30</option><option>NET 45</option><option>NET 60</option><option>50% DP, 50% Lunas</option><option>30% DP, 70% Lunas</option>
                            </select>
                        </div>
                        <div>
                            <label className={lc}>Syarat Pengiriman</label>
                            <select value={form.deliveryTerms} onChange={e => setForm({ ...form, deliveryTerms: e.target.value })} className={ic}>
                                <option>FOB Jakarta</option><option>CIF Tujuan</option><option>Ex-Works</option><option>Franco Gudang Pembeli</option><option>Sesuai Kesepakatan</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Ordered Items</h3>
                            <button type="button" onClick={addRow} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                <Plus size={11} /> Add Item
                            </button>
                        </div>
                        <div className="-mx-6 px-6 md:mx-0 md:px-0 pb-4 md:pb-0 overflow-x-auto scrollbar-hide">
                            <div className="min-w-[800px] rounded-2xl border border-slate-100">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                                            <th className="px-3 py-3 w-8 text-center">No</th>
                                            <th className="px-3 py-3 w-40">From SKU</th>
                                            <th className="px-3 py-3 min-w-[220px]">Description</th>
                                            <th className="px-3 py-3 w-16 text-center">Qty</th>
                                            <th className="px-3 py-3 w-16 text-center">Unit</th>
                                            <th className="px-3 py-3 w-28 text-right">Unit Price</th>
                                            <th className="px-3 py-3 w-14 text-center">Disc%</th>
                                            <th className="px-3 py-3 w-28 text-right">Amount</th>
                                            <th className="px-3 py-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                <td className="px-3 py-2 text-[11px] font-black text-slate-400 text-center">{it.no}</td>
                                                <td className="px-2 py-2">
                                                    <select onChange={e => fillFromSKU(idx, e.target.value)} defaultValue=""
                                                        className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                                                        <option value="">Pick SKU...</option>
                                                        {products.map(p => (
                                                            <optgroup key={p.id} label={`${p.code} – ${p.name}`}>
                                                                {p.skus?.map((s: any) => <option key={s.id} value={s.id}>{s.code} · {s.name || 'Main'}</option>)}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Item description..."
                                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <input type="number" min="0" step="0.01" value={it.qty} onChange={e => updateItem(idx, { qty: +e.target.value })}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none" />
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none text-[10px] font-semibold uppercase tracking-wider" />
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <input type="number" min="0" step="1" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: +e.target.value })}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-medium focus:outline-none" />
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <input type="number" min="0" max="100" step="0.1" value={it.discount} onChange={e => updateItem(idx, { discount: +e.target.value })}
                                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none" />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <p className="text-sm font-bold text-slate-800">Rp {it.amount.toLocaleString('id-ID')}</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={lc}>Catatan / Instruksi Khusus</label>
                            <textarea rows={5} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                className={ic + " resize-none"} placeholder="Instruksi tambahan..." />
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-100 shadow-inner">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium tracking-tight">Subtotal</span>
                                <span className="font-bold text-slate-800">{fmt(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-medium text-sm">Disc%</span>
                                    <input type="number" min="0" max="100" step="0.1" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })}
                                        className="w-16 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold" />
                                </div>
                                <span className="font-semibold text-rose-600 text-sm">- {fmt(discountAmt)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-medium text-sm">Tax (PPN %)</span>
                                    <input type="number" min="0" max="100" step="0.1" value={form.tax} onChange={e => setForm({ ...form, tax: +e.target.value })}
                                        className="w-16 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold" />
                                </div>
                                <span className="font-semibold text-slate-600 text-sm">+ {fmt(taxAmt)}</span>
                            </div>
                            <div className="border-t border-slate-200/60 pt-3 mt-1 flex justify-between items-center">
                                <span className="font-black text-slate-900 uppercase tracking-widest text-xs">Total Pesanan</span>
                                <span className="font-black text-indigo-700 text-2xl tracking-tighter">{fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 md:-mx-8 md:-mb-8 md:px-8 md:py-4 flex justify-end gap-3 mt-auto border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] text-right">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-600 h-10 md:h-12 px-6 text-xs font-bold uppercase tracking-wider flex-1 md:flex-none">Cancel</Button>
                        <Button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 md:h-12 px-8 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex-1 md:flex-none">
                            <Save size={14} className="mr-2" /> {saving ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
