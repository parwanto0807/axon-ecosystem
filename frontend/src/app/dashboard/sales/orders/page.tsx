"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, FileText, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, ShoppingCart,
    Paperclip, Image as ImageIcon,
    ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import SalesOrderPDFModal from "./SalesOrderPDFModal"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null; pics: Array<{ name: string; department: string | null }> }
interface Quotation { id: string; number: string; subject: string; status: string; customerId: string; customer: { name: string }; items: any[]; discountType?: string; discount: number; tax: number; paymentTerms: string | null; deliveryTerms: string | null; currency: string; attn: string | null; notes: string | null; projectId?: string }
interface OrderItem {
    id?: string; no: number; description: string; qty: number; unit: string
    unitPrice: number; discount: number; amount: number; _skuId?: string
}
interface SalesOrder {
    id: string; number: string; poNumber: string | null; date: string; status: string
    customerId: string; customer: Customer; attn: string | null; subject: string
    notes: string | null; paymentTerms: string | null; deliveryTerms: string | null
    currency: string; discountType: string; discount: number; tax: number
    subtotal: number; discountAmt: number; taxAmt: number; grandTotal: number
    createdAt: string; items: OrderItem[]; quotationId?: string; quotation?: { number: string }
    poProof?: string | null; projectId?: string; project?: { number: string; name: string }
    businessCategoryId: string | null; businessCategory?: { id: string; name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    DRAFT: { label: 'Draft', color: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/50' },
    PENDING: { label: 'Pending', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
    PROCESSING: { label: 'Processing', color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400', dot: 'bg-blue-500' },
    PARTIAL: { label: 'Partial', color: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400', dot: 'bg-indigo-500' },
    SHIPPED: { label: 'Shipped', color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-400', dot: 'bg-purple-500' },
    DELIVERED: { label: 'Delivered', color: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-400', dot: 'bg-cyan-500' },
    INVOICED: { label: 'Invoiced', color: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400', dot: 'bg-orange-500' },
    PAID: { label: 'Paid', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    CANCELLED: { label: 'Cancelled', color: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400', dot: 'bg-rose-500' },
    COMPLETED: { label: 'Completed', color: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', dot: 'bg-emerald-500' },
}
const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
const textareaClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
const cellInputClass = "h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
const cellSelectClass = "h-8 w-full rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const ImagePreviewModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
                <img src={url} alt="PO Proof Preview" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
                <button onClick={onClose} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70">
                    <X size={16} />
                </button>
            </motion.div>
        </div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SalesOrdersPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role
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
    const [openStatusId, setOpenStatusId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const perPage = 10

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
            const [oR, cR, pR, coR, qR, prR, bcR] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers: { 'x-user-role': userRole } }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, { headers: { 'x-user-role': userRole } }),
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
    }, [userRole, showToast])

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
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
    })

    useEffect(() => { setPage(1) }, [search, filterStatus, filterProject, filterBusinessCategory])

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    const stats = {
        total: orders.length,
        processing: orders.filter(o => o.status === 'PROCESSING').length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        totalValue: orders.reduce((s, o) => s + o.grandTotal, 0)
    }

    const today = new Date();
    const last6Months = Array.from({length: 6}, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
        return d.toLocaleDateString('id-ID', { month: 'short' });
    });

    const chartData = {
        labels: last6Months,
        datasets: [{
            label: 'Total Penjualan',
            data: last6Months.map((_, i) => {
                const targetDate = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
                const month = targetDate.getMonth();
                const year = targetDate.getFullYear();
                return orders.reduce((sum, o) => {
                    if (o.status === 'CANCELLED' || o.status === 'DRAFT') return sum;
                    const d = new Date(o.date);
                    if (d.getMonth() === month && d.getFullYear() === year) {
                        return sum + o.grandTotal;
                    }
                    return sum;
                }, 0);
            }),
            backgroundColor: '#4f46e5',
            borderRadius: 6,
            barThickness: 32
        }]
    };

    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
                    }
                }
            }
        },
        scales: {
            x: { display: false },
            y: { display: false }
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`fixed right-6 top-6 z-[300] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Pesanan Penjualan</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Kelola dan lacak siklus pemesanan hingga pengiriman.</p>
                    </div>
                    <Button onClick={() => { setEditing(null); setModalOpen(true) }} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" /> Pesanan Baru
                    </Button>
                </header>

                {loading && !filtered.length ? null : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-xl border border-border bg-card p-4 md:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">Total Piutang Berjalan</p>
                                <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{fmt(filtered.reduce((s, o) => s + (o.grandTotal - (o.status === 'PAID' ? o.grandTotal : 0)), 0))}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Active Orders</p>
                                    <p className="mt-0.5 text-sm font-semibold text-foreground">{filtered.filter(o => !['CANCELLED', 'COMPLETED'].includes(o.status)).length}</p>
                                </div>
                                <div className="hidden h-8 w-px bg-border sm:block" />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Accumulated Order Value</p>
                                    <p className="mt-0.5 text-sm font-semibold text-foreground">{fmt(filtered.reduce((s, o) => s + o.grandTotal, 0))}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setFilterProject('ALL')} className="ml-auto h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                    <X size={15} />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {[
                        { label: 'Total Orders', value: stats.total, big: false },
                        { label: 'Processing', value: stats.processing, big: false },
                        { label: 'Pending', value: stats.pending, big: false },
                        { label: 'Total Order Value', value: fmt(stats.totalValue), big: true },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col justify-center rounded-xl border border-border bg-card p-4">
                            <p className="truncate text-xs font-medium text-muted-foreground">{s.label}</p>
                            <p className={`mt-1 truncate font-semibold text-foreground ${s.big ? 'text-sm' : 'text-lg'}`}>{s.value}</p>
                        </div>
                    ))}

                    <div className="col-span-2 flex flex-col justify-center rounded-xl border border-border bg-card p-4 md:col-span-1">
                        <p className="mb-1 truncate text-xs font-medium text-muted-foreground">Tren Penjualan (6 Bln)</p>
                        <div className="mt-auto h-10 w-full">
                            <Bar data={chartData} options={sparklineOptions as any} />
                        </div>
                    </div>
                </div>

                <div className="mb-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:max-w-xs sm:shrink-0">
                            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SO#, PO#, customer..."
                                className={`${inputClass} pl-9`} />
                        </div>
                        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                            <select value={filterBusinessCategory} onChange={e => setFilterBusinessCategory(e.target.value)}
                                className={`${inputClass} min-w-0 flex-1 cursor-pointer text-xs sm:w-48 sm:flex-none`}>
                                <option value="ALL">All Business Units</option>
                                {Array.isArray(businessCategories) && businessCategories.map(bc => <option key={bc.id} value={bc.id}>{bc.name}</option>)}
                            </select>
                            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                                className={`${inputClass} min-w-0 flex-1 cursor-pointer text-xs sm:w-48 sm:flex-none`}>
                                <option value="ALL">All Projects</option>
                                {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`h-8 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors ${filterStatus === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                {s === 'ALL' ? 'All Status' : STATUS_CONFIG[s].label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ShoppingCart size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No sales orders found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">Try adjusting your search or filters to find what you are looking for.</p>
                        <Button onClick={() => { setEditing(null); setModalOpen(true) }} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" /> Pesanan Baru
                        </Button>
                    </div>
                ) : (
                    <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                        <th className="px-3 py-2.5 font-medium">SO Number</th>
                                        <th className="px-3 py-2.5 font-medium">Customer</th>
                                        <th className="px-3 py-2.5 font-medium">Date</th>
                                        <th className="hidden px-3 py-2.5 font-medium min-[1400px]:table-cell">Perihal</th>
                                        <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                                        <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginated.map((o, idx) => {
                                        const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.DRAFT
                                        return (
                                            <motion.tr key={o.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * .03 }}
                                                className="group transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="whitespace-nowrap font-mono text-xs font-medium text-foreground">{o.number}</span>
                                                        {o.businessCategory && (
                                                            <span className="whitespace-nowrap rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                {o.businessCategory.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        {o.project && (
                                                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                {o.project.number}
                                                            </span>
                                                        )}
                                                        {o.quotation && (
                                                            <span className="inline-flex cursor-help items-center gap-1 text-[10px] font-medium text-muted-foreground" title="Based on Quotation">
                                                                <FileText size={10} />{o.quotation.number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-sm font-medium text-foreground">{o.customer?.name}</p>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <span className="text-[11px] text-muted-foreground">PO: {o.poNumber || '-'}</span>
                                                        {o.poProof && (
                                                            <button onClick={() => setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`)}
                                                                className="text-muted-foreground transition-colors hover:text-foreground" title="View PO Proof">
                                                                <ImageIcon size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(o.date)}</td>
                                                <td className="hidden px-3 py-2.5 text-xs text-foreground min-[1400px]:table-cell">{o.subject || '-'}</td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                                    <p className="text-[11px] text-muted-foreground">Sblm Disc: {fmt(o.subtotal)}</p>
                                                    {o.discountAmt > 0 && <p className="text-[11px] text-rose-600 dark:text-rose-400">Disc: -{fmt(o.discountAmt)}</p>}
                                                    <p className="mt-0.5 text-sm font-medium text-foreground">{fmt(o.grandTotal)}</p>
                                                    <p className="text-[10px] text-muted-foreground">{o.items?.length || 0} items</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <div className="status-dropdown relative inline-block">
                                                        <span onClick={() => setOpenStatusId(openStatusId === o.id ? null : o.id)}
                                                            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${sc.color}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} /> {sc.label}
                                                        </span>
                                                        {openStatusId === o.id && (
                                                            <div className="absolute left-1/2 top-full z-50 mt-1 min-w-[132px] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg">
                                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                                    <button key={k} onClick={() => { handleStatus(o.id, k); setOpenStatusId(null); }}
                                                                        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted ${o.status === k ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                                        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} /> {v.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button onClick={() => setViewModal(o)} variant="ghost" size="icon" title="View PDF"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                                            <Eye size={15} />
                                                        </Button>
                                                        <Button onClick={() => { setEditing(o); setModalOpen(true) }} variant="ghost" size="icon" title="Edit"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                                            <Edit size={15} />
                                                        </Button>
                                                        <Button onClick={() => handleDelete(o.id)} variant="ghost" size="icon" title="Delete"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                            <Trash2 size={15} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-2 md:hidden">
                        {paginated.map((o, idx) => {
                            const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.DRAFT;
                            return (
                                <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                    className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-mono text-xs font-medium text-foreground">{o.number}</span>
                                                {o.businessCategory && (
                                                    <span className="whitespace-nowrap rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{o.businessCategory.name}</span>
                                                )}
                                            </div>
                                            <p className="mt-1 truncate text-sm font-medium text-foreground">{o.customer?.name}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                {o.project && (
                                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">{o.project.number}</span>
                                                )}
                                                {o.quotation && (
                                                    <span className="inline-flex cursor-help items-center gap-1 text-[10px] font-medium text-muted-foreground" title="Based on Quotation">
                                                        <FileText size={10} />{o.quotation.number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <select value={o.status} onChange={(e) => handleStatus(o.id, e.target.value)}
                                            className={`cursor-pointer appearance-none rounded-full border py-0.5 pl-2 pr-4 text-center text-[11px] font-medium outline-none ${sc.color}`}>
                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                <option key={k} value={k} className="bg-card text-foreground">{v.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-muted/50 p-2">
                                            <p className="text-[10px] text-muted-foreground">Date</p>
                                            <p className="mt-0.5 text-xs font-medium text-foreground">{fmtDate(o.date)}</p>
                                        </div>
                                        <div className="rounded-lg bg-muted/50 p-2">
                                            <p className="text-[10px] text-muted-foreground">Total</p>
                                            <p className="mt-0.5 text-xs font-medium text-foreground">{fmt(o.grandTotal)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span>{o.items?.length || 0} items</span>
                                            <span className="h-3 w-px bg-border" />
                                            <span className="flex items-center gap-1">
                                                PO: {o.poNumber || '-'}
                                                {o.poProof && (
                                                    <button onClick={() => setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL}${o.poProof}`)}
                                                        className="text-muted-foreground transition-colors hover:text-foreground">
                                                        <ImageIcon size={12} />
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <Button onClick={() => setViewModal(o)} variant="ghost" size="icon" title="View PDF"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                                <Eye size={14} />
                                            </Button>
                                            <Button onClick={() => { setEditing(o); setModalOpen(true) }} variant="ghost" size="icon" title="Edit"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                                <Edit size={14} />
                                            </Button>
                                            <Button onClick={() => handleDelete(o.id)} variant="ghost" size="icon" title="Delete"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5">
                            <span className="text-xs text-muted-foreground">
                                {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
                                    <ChevronLeft size={16} />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`h-8 min-w-[32px] rounded-md px-2 text-xs font-medium transition-colors ${page === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                        {p}
                                    </button>
                                ))}
                                <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30">
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        </div>
                    )}
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
        discountType: order?.discountType || 'PERCENTAGE',
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
            discountType: q.discountType || f.discountType,
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
    const discountAmt = form.discountType === 'PERCENTAGE' 
        ? subtotal * (Number(form.discount) / 100) 
        : Number(form.discount);
    const taxable = Math.max(0, subtotal - discountAmt)
    const taxAmt = taxable * (Number(form.tax) / 100)
    const grandTotal = taxable + taxAmt

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); setSaving(true)
        try {
            const body = { ...form, items, subtotal, discountAmt, taxAmt, grandTotal }
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${order!.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/orders`
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { onSuccess() } else { const e = await res.json(); alert(e.message) }
        } finally { setSaving(false) }
    }

    const lc = "mb-1 block text-xs font-medium text-muted-foreground"

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-5xl sm:rounded-2xl">
                <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <ShoppingCart size={16} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-foreground">{isEdit ? 'Edit Sales Order' : 'New Sales Order'}</h2>
                            <p className="truncate text-[11px] text-muted-foreground">{isEdit ? order!.number : 'Pesanan penjualan baru'}</p>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X size={16} />
                    </Button>
                </header>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="md:col-span-2">
                                <label className={lc}>Customer <span className="text-rose-500">*</span></label>
                                <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className={inputClass}>
                                    <option value="">-- Select Customer --</option>
                                    {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lc}>Berdasarkan Penawaran (Opsional)</label>
                                <select value={form.quotationId} onChange={e => fillFromQuotation(e.target.value)} className={`${inputClass} font-medium`}>
                                    <option value="">-- Tanpa Penawaran --</option>
                                    {quotations.filter(q => q.status === 'ACCEPTED' && (!form.customerId || q.customerId === form.customerId)).map(q => {
                                        const sub = (q.items || []).reduce((s: number, it: any) => s + (it.qty * it.unitPrice * (1 - (it.discount || 0) / 100)), 0)
                                        return <option key={q.id} value={q.id}>{q.number} — {q.customer?.name || ''} — {q.subject || ''} ({q.items?.length || 0} item, {fmt(sub)})</option>
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className={lc}>Project (Payung ID)</label>
                                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className={`${inputClass} font-medium`}>
                                    <option value="">-- No Project --</option>
                                    {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.number} — {p.name}{p.customer ? ` (${p.customer.name})` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={lc}>Business Unit / Category <span className="text-rose-500">*</span></label>
                                <select required value={form.businessCategoryId} onChange={e => setForm({ ...form, businessCategoryId: e.target.value })} className={`${inputClass} font-medium`}>
                                    <option value="">-- Select Business Unit --</option>
                                    {Array.isArray(businessCategories) && businessCategories.map(bc => <option key={bc.id} value={bc.id}>{bc.name}</option>)}
                                </select>
                            </div>
                            <div><label className={lc}>Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} /></div>
                            <div>
                                <label className={lc}>Customer PO Number</label>
                                <input value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} placeholder="PO-12345 ..." className={inputClass} />
                            </div>
                            <div>
                                <label className={lc}>Attention / PIC</label>
                                <input value={form.attn} onChange={e => setForm({ ...form, attn: e.target.value })} placeholder="Bpk/Ibu ..." className={inputClass} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={lc}>Perihal / Subject <span className="text-rose-500">*</span></label>
                                <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="PO Customer - ..." className={inputClass} />
                            </div>
                            <div className="md:col-span-1">
                                <label className={lc}>Upload Bukti PO</label>
                                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
                                    {form.poProof ? (
                                        <button type="button" onClick={() => onPreview(`${process.env.NEXT_PUBLIC_API_URL}${form.poProof}`)}
                                            className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted transition-transform active:scale-95">
                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${form.poProof}`} alt="PO Proof" className="h-full w-full object-cover" />
                                        </button>
                                    ) : (
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                                            <Paperclip size={16} />
                                        </div>
                                    )}
                                    <div className="relative min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground">
                                            {form.poProof ? 'File Terunggah' : 'Pilih File PO'}
                                        </p>
                                        <p className="truncate text-[10px] text-muted-foreground">
                                            {form.poProof ? 'Klik thumbnail untuk lihat' : 'JPG/PNG/WEBP'}
                                        </p>
                                        <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={async (e) => {
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
                                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className={lc}>Termin Pembayaran</label>
                                <input
                                    type="text"
                                    list="order-payment-terms"
                                    value={form.paymentTerms || ''}
                                    onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                                    placeholder="Pilih atau ketik termin pembayaran..."
                                    className={inputClass}
                                />
                                <datalist id="order-payment-terms">
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
                                    list="order-delivery-terms"
                                    value={form.deliveryTerms || ''}
                                    onChange={e => setForm({ ...form, deliveryTerms: e.target.value })}
                                    placeholder="Pilih atau ketik syarat pengiriman..."
                                    className={inputClass}
                                />
                                <datalist id="order-delivery-terms">
                                    <option value="FOB Jakarta" />
                                    <option value="CIF Tujuan" />
                                    <option value="Ex-Works" />
                                    <option value="Franco Gudang Pembeli" />
                                    <option value="Loco Gudang Penjual" />
                                    <option value="Sesuai Kesepakatan" />
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-xs font-medium text-muted-foreground">Ordered Items</h3>
                                <Button type="button" variant="outline" onClick={addRow} className="h-8 rounded-lg px-2.5 text-xs font-medium">
                                    <Plus size={14} className="mr-1" /> Add Item
                                </Button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full min-w-[820px] border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="w-8 px-2 py-2 text-center font-medium">No</th>
                                            <th className="w-40 px-2 py-2 font-medium">From SKU</th>
                                            <th className="min-w-[220px] px-2 py-2 font-medium">Description</th>
                                            <th className="w-16 px-2 py-2 text-center font-medium">Qty</th>
                                            <th className="w-16 px-2 py-2 text-center font-medium">Unit</th>
                                            <th className="w-28 px-2 py-2 text-right font-medium">Unit Price</th>
                                            <th className="w-14 px-2 py-2 text-center font-medium">Disc%</th>
                                            <th className="w-28 px-2 py-2 text-right font-medium">Amount</th>
                                            <th className="w-8 px-2 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {items.map((it, idx) => (
                                            <tr key={idx} className="transition-colors hover:bg-muted/30">
                                                <td className="px-2 py-2 text-center text-[11px] font-medium text-muted-foreground">{it.no}</td>
                                                <td className="px-2 py-2">
                                                    <select onChange={e => fillFromSKU(idx, e.target.value)} defaultValue=""
                                                        className={cellSelectClass}>
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
                                                        className={cellInputClass} />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input type="number" min="0" step="0.01" value={it.qty} onChange={e => updateItem(idx, { qty: +e.target.value })}
                                                        className={`${cellInputClass} text-center`} />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                                                        className={`${cellInputClass} text-center`} />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input type="number" min="0" step="1" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: +e.target.value })}
                                                        className={`${cellInputClass} text-right`} />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <input type="number" min="0" max="100" step="0.1" value={it.discount} onChange={e => updateItem(idx, { discount: +e.target.value })}
                                                        className={`${cellInputClass} text-center`} />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <p className="whitespace-nowrap text-xs font-medium text-foreground">Rp {it.amount.toLocaleString('id-ID')}</p>
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    {items.length > 1 && (
                                                        <button type="button" onClick={() => removeRow(idx)}
                                                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><X size={13} /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div>
                                <label className={lc}>Catatan / Instruksi Khusus</label>
                                <textarea rows={5} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className={textareaClass} placeholder="Instruksi tambahan..." />
                            </div>
                            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium text-foreground">{fmt(subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Diskon</span>
                                        <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value, discount: 0 })}
                                            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus:border-primary">
                                            <option value="PERCENTAGE">%</option>
                                            <option value="AMOUNT">Rp</option>
                                        </select>
                                        <input type="number" min="0" max={form.discountType === 'PERCENTAGE' ? 100 : undefined} step={form.discountType === 'PERCENTAGE' ? "0.1" : "1"} 
                                            value={form.discount || ''} onChange={e => setForm({ ...form, discount: +e.target.value })}
                                            className="h-7 w-24 rounded-md border border-border bg-background px-2 text-right text-xs font-medium text-foreground outline-none focus:border-primary" />
                                    </div>
                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">- {fmt(discountAmt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Tax (PPN %)</span>
                                        <input type="number" min="0" max="100" step="0.1" value={form.tax} onChange={e => setForm({ ...form, tax: +e.target.value })}
                                            className="h-7 w-16 rounded-md border border-border bg-background px-2 text-center text-xs font-medium text-foreground outline-none focus:border-primary" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">+ {fmt(taxAmt)}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
                                    <span className="text-xs font-medium text-muted-foreground">Total Pesanan</span>
                                    <span className="text-base font-semibold tracking-tight text-foreground">{fmt(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                        <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-lg px-4 text-sm font-medium">Cancel</Button>
                        <Button type="submit" disabled={saving} className="h-9 rounded-lg px-4 text-sm font-medium">
                            <Save size={14} className="mr-1.5" /> {saving ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
