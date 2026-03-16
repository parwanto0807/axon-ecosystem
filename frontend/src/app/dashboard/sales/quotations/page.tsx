"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, FileText, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    Send, Check, Ban, Clock, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import QuotationPDFModal from "./QuotationPDFModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null; pics: Array<{ name: string; department: string | null }> }
export interface ProductSKU { id: string; code: string; name: string | null; salePrice: number; unit: { name: string } }
export interface Product { id: string; code: string; name: string; skus: ProductSKU[] }

export interface QuotationItem {
    id?: string; no: number; description: string; qty: number; unit: string
    unitPrice: number; discount: number; amount: number; _skuId?: string
}
export interface Quotation {
    id: string; number: string; date: string; validUntil: string; status: string
    customerId: string; customer: Customer; attn: string | null; subject: string
    notes: string | null; paymentTerms: string | null; deliveryTerms: string | null
    currency: string; discount: number; tax: number
    subtotal: number; discountAmt: number; taxAmt: number; grandTotal: number
    createdAt: string; items: QuotationItem[]; projectId?: string; project?: { number: string; name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send },
    ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Check },
    REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
    EXPIRED: { label: 'Expired', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
}
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
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

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [qR, cR, pR, coR, prR] = await Promise.all([
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/quotations'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/customers'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/products'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/company'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/projects'),
            ])
            setQuotations(await qR.json())
            setCustomers(await cR.json())
            setProducts(await pR.json())
            setCompany(await coR.json())
            setProjects(await prR.json())
        } catch { showToast('error', 'Failed to load data') }
        finally { setLoading(false) }
    }, [showToast])

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
    }).sort((a, b) => (a.projectId || '').localeCompare(b.projectId || ''))

    const stats = {
        total: quotations.length,
        draft: quotations.filter(q => q.status === 'DRAFT').length,
        sent: quotations.filter(q => q.status === 'SENT').length,
        acceptedValue: quotations.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + q.grandTotal, 0)
    }

    return (
        <div className="px-4 py-6 space-y-6 w-full">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <FileText size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Penawaran Harga</h1>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Sales Quotation Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-10 px-4 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={13} className="mr-2" /> Reload
                    </Button>
                    <Button onClick={() => { setEditing(null); setModalOpen(true) }}
                        className="flex-1 md:flex-none rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                        <Plus size={15} className="mr-2" /> New
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
                                <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">Project Value</span>
                                <span className="text-sm font-bold">{fmt(filtered.reduce((s, q) => s + q.grandTotal, 0))}</span>
                            </div>
                            <button onClick={() => setFilterProject('ALL')} className="absolute top-0 right-0 md:static md:top-auto md:right-auto md:ml-auto bg-white/10 hover:bg-white/20 p-2 md:p-2 rounded-xl transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Quotations', value: stats.total },
                    { label: 'Draft', value: stats.draft },
                    { label: 'Sent', value: stats.sent },
                    { label: 'Accepted Value', value: fmt(stats.acceptedValue), big: true },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{s.label}</p>
                        <p className={`font-extrabold mt-1 ${s.big ? 'text-sm md:text-base' : 'text-2xl md:text-3xl'} text-slate-900 truncate`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative w-full md:w-auto flex-1 min-w-0">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search number, customer, subject..."
                        className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white w-full md:w-72 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-300" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap font-bold uppercase tracking-wider transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
                <div className="md:ml-auto w-full md:w-auto flex items-center gap-2">
                    <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                        className="w-full md:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none">
                        <option value="ALL">All Projects</option>
                        {(Array.isArray(projects) ? projects : []).map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 flex flex-col items-center">
                    <FileText size={64} className="text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-sm">No quotations found</p>
                </div>
            ) : (
                <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100 bg-slate-50/80">
                                <th className="px-6 py-4">Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Valid Until</th>
                                <th className="px-6 py-4 text-right">Grand Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 && (() => {
                                let lastProject: string | null = "INITIAL";
                                return filtered.map((q, idx) => {
                                    const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT
                                    const Icon = sc.icon
                                    const showHeader = q.projectId !== lastProject;
                                    lastProject = q.projectId || null;

                                    return (
                                        <Fragment key={q.id}>
                                            {showHeader && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={8} className="px-6 py-2 border-y border-slate-100 italic">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project:</span>
                                                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">
                                                                {q.project ? `${q.project.number} — ${q.project.name}` : 'No Project / Regular Sales'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <motion.tr initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * .03 }}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                                <td className="px-6 py-4">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{q.number}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800 text-sm">{q.customer?.name}</p>
                                                    <p className="text-[10px] text-slate-400">{q.customer?.code}</p>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px]"><p className="text-sm text-slate-700 truncate font-medium">{q.subject}</p></td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">{fmtDate(q.date)}</td>
                                                <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">{fmtDate(q.validUntil)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-bold text-slate-900 text-sm">{fmt(q.grandTotal)}</p>
                                                    <p className="text-[9px] text-slate-400">{q.items?.length || 0} items</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="relative group/status inline-block">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border cursor-pointer ${sc.color}`}>
                                                            <Icon size={9} /> {sc.label}
                                                        </span>
                                                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-xl border border-slate-100 p-1 hidden group-hover/status:block min-w-[120px]">
                                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                                <button key={k} onClick={() => handleStatus(q.id, k)}
                                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors ${q.status === k ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                                    {v.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => setViewModal(q)} title="Preview / Download PDF"
                                                            className="w-7 h-7 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors"><Eye size={14} /></button>
                                                        <button onClick={() => { setEditing(q); setModalOpen(true) }} title="Edit"
                                                            className="w-7 h-7 rounded-lg text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(q.id)} title="Delete"
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
                        return filtered.map((q, idx) => {
                            const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT;
                            const Icon = sc.icon;
                            const showHeader = q.projectId !== lastProject;
                            lastProject = q.projectId || null;

                            return (
                                <Fragment key={q.id}>
                                    {showHeader && (
                                        <div className="flex items-start gap-2 mt-6 mb-2">
                                            <div className="w-1 h-3.5 bg-indigo-500 rounded-full shrink-0 mt-0.5" />
                                            <span className="flex-1 min-w-0 text-[10px] font-black text-indigo-600 uppercase tracking-widest break-words leading-relaxed">
                                                {q.project ? `${q.project.number} — ${q.project.name}` : 'Regular Sales'}
                                            </span>
                                        </div>
                                    )}
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{q.number}</p>
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{q.customer?.name}</h3>
                                                <p className="text-[11px] text-slate-500 line-clamp-1">{q.subject}</p>
                                            </div>
                                            <select value={q.status} onChange={(e) => handleStatus(q.id, e.target.value)}
                                                className={`appearance-none bg-transparent outline-none cursor-pointer pl-2 pr-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border text-center ${sc.color}`}>
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <option key={k} value={k} className="text-slate-800 bg-white">{v.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="bg-slate-50 p-2 rounded-xl">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Valid Until</p>
                                                <p className="text-xs font-semibold text-slate-700">{fmtDate(q.validUntil)}</p>
                                            </div>
                                            <div className="bg-indigo-50/50 p-2 rounded-xl">
                                                <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Grand Total</p>
                                                <p className="text-xs font-bold text-indigo-700">{fmt(q.grandTotal)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                                            <span className="text-[10px] text-slate-400 font-medium">{q.items?.length || 0} items included</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setViewModal(q)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Eye size={14} /></button>
                                                <button onClick={() => { setEditing(q); setModalOpen(true) }} className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><Edit size={14} /></button>
                                                <button onClick={() => handleDelete(q.id)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 size={14} /></button>
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
                    <QuotationPDFModal quotation={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
        </div>
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
            if (sku) { updateItem(idx, { description: `${p.name}${sku.name ? ' - ' + sku.name : ''} (${sku.code})`, unitPrice: sku.salePrice, unit: sku.unit?.name || 'pcs', _skuId: skuId }); return }
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
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/quotations/${quotation!.id}` : '${process.env.NEXT_PUBLIC_API_URL}/api/quotations'
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { onSuccess() } else { const e = await res.json(); alert(e.message) }
        } finally { setSaving(false) }
    }

    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white min-h-screen md:min-h-0 md:rounded-3xl shadow-2xl w-full max-w-5xl md:my-4 flex flex-col">
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
                                {projects.filter(p => p.customerId === form.customerId || !form.customerId).map(p => <option key={p.id} value={p.id}>{p.number} — {p.name}</option>)}
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

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Line Items</h3>
                            <button type="button" onClick={addRow} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                <Plus size={11} /> Add Row
                            </button>
                        </div>
                        <div className="-mx-6 px-6 md:mx-0 md:px-0 pb-4 md:pb-0 overflow-x-auto scrollbar-hide">
                            <div className="min-w-[800px] rounded-2xl border border-slate-100">
                                <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                                        <th className="px-3 py-3 w-8">No</th>
                                        <th className="px-3 py-3 w-40">From Product</th>
                                        <th className="px-3 py-3 min-w-[220px]">Description</th>
                                        <th className="px-3 py-3 w-16">Qty</th>
                                        <th className="px-3 py-3 w-16">Unit</th>
                                        <th className="px-3 py-3 w-28">Unit Price</th>
                                        <th className="px-3 py-3 w-14">Disc%</th>
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
                                                    className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                    <option value="">Pick SKU...</option>
                                                    {products.map(p => (
                                                        <optgroup key={p.id} label={`${p.code} – ${p.name}`}>
                                                            {p.skus?.map(s => <option key={s.id} value={s.id}>{s.code}{s.name ? ' · ' + s.name : ''} — Rp{s.salePrice?.toLocaleString()}</option>)}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Item description..."
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" step="0.01" value={it.qty} onChange={e => updateItem(idx, { qty: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" step="100" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input type="number" min="0" max="100" step="0.1" value={it.discount} onChange={e => updateItem(idx, { discount: +e.target.value })}
                                                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
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
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium text-sm">Discount (%)</span>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" max="100" step="0.1" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })}
                                        className="w-20 text-sm bg-white border border-slate-200 rounded-lg px-2 py-1 text-center focus:outline-none" />
                                    <span className="font-semibold text-rose-600 text-sm">- Rp {discountAmt.toLocaleString('id-ID')}</span>
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
