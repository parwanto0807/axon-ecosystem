"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Receipt, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
    Clock, DollarSign, Calendar, FileText, Briefcase,
    Check, Ban, Printer, ArrowRight, Percent, Tag, Send, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import InvoicePDFModal from "./InvoicePDFModal"
import InvoiceDetailModal from "./InvoiceDetailModal"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Invoice {
    id: string; number: string; date: string; dueDate?: string; status: string;
    customerId: string; customer: { name: string; code: string };
    projectId?: string; project?: { number: string; name: string };
    contractId?: string; contract?: { number: string; subject: string };
    salesOrderId?: string; salesOrder?: { number: string };
    deliveryOrderId?: string; deliveryOrder?: { number: string };
    bankAccountId?: string; bankAccount?: BankAccount;
    signerName?: string; signerPosition?: string;
    currency: string; subtotal: number; tax: number; discount: number;
    discountAmt: number; taxAmt: number; grandTotal: number;
    notes?: string; paymentTerms?: string;
    items: InvoiceItem[];
    createdAt: string;
}

interface ContractRef {
    id: string; number: string; subject: string; customerId?: string;
}

interface BankAccount {
    id: string; bankName: string; accountNumber: string; accountHolder: string; branch?: string;
}

interface InvoiceItem {
    id?: string; no: number; description: string; qty: number; unit: string;
    unitPrice: number; discount: number; amount: number;
}

interface Ref { id: string; number: string; name?: string; customer?: { name: string }; grandTotal?: number; items: any[] }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const INV_STATUS: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    POSTED: { label: 'Posted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Send },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
    PAID: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    OVERDUE: { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through', icon: Ban },
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function InvoicesPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [deliveryOrders, setDeliveryOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([])
    const [contracts, setContracts] = useState<ContractRef[]>([])
    const [banks, setBanks] = useState<BankAccount[]>([])
    const [showBankForm, setShowBankForm] = useState(false)
    const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', branch: '' })

    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [saving, setSaving] = useState(false)
    const [viewModal, setViewModal] = useState<Invoice | null>(null)
    const [detailModal, setDetailModal] = useState<Invoice | null>(null)
    const [postingInvoice, setPostingInvoice] = useState<Invoice | null>(null)
    const [paymentConfirm, setPaymentConfirm] = useState<{ invoice: Invoice, bankAccountId: string } | null>(null)
    const [company, setCompany] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const [form, setForm] = useState({
        customerId: '', projectId: '', contractId: '', salesOrderId: '', deliveryOrderId: '',
        bankAccountId: '', signerName: '', signerPosition: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '', notes: '', paymentTerms: '',
        subtotal: 0, tax: 11, discount: 0, discountAmt: 0, taxAmt: 0, grandTotal: 0,
        items: [] as InvoiceItem[]
    })

    const loadData = useCallback(async () => {
        if (!userRole) return
        setLoading(true)
        try {
            const [invRes, prjRes, soRes, doRes, custRes, cntRes, coRes, bankRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers: { 'x-user-role': userRole } }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banks`).then(r => r.json())
            ])
            setInvoices(invRes)
            setProjects(prjRes)
            setSalesOrders(soRes)
            setDeliveryOrders(doRes)
            setCustomers(custRes)
            setContracts(cntRes)
            setCompany(coRes)
            setBanks(bankRes)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [userRole])

    useEffect(() => { loadData() }, [loadData])

    const calculateTotals = (items: InvoiceItem[], taxRate: number, discRate: number) => {
        const subtotal = items.reduce((acc, it) => acc + (it.amount || 0), 0)
        const discountAmt = (subtotal * discRate) / 100
        const taxAmt = ((subtotal - discountAmt) * taxRate) / 100
        const grandTotal = subtotal - discountAmt + taxAmt
        return { subtotal, discountAmt, taxAmt, grandTotal }
    }

    const handleSave = async () => {
        if (!form.customerId || form.items.length === 0) return showToast('error', 'Customer dan Item wajib diisi')
        setSaving(true)
        try {
            const payload = {
                ...form,
                projectId: form.projectId || null,
                contractId: form.contractId || null,
                salesOrderId: form.salesOrderId || null,
                deliveryOrderId: form.deliveryOrderId || null,
                bankAccountId: form.bankAccountId || null,
                signerName: form.signerName || null,
                signerPosition: form.signerPosition || null,
            }
            const url = editMode ? `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${selectedId}` : `${process.env.NEXT_PUBLIC_API_URL}/api/invoices`
            const method = editMode ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setModalOpen(false)
                showToast('success', editMode ? 'Invoice diperbarui' : 'Invoice berhasil dibuat')
                loadData()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menyimpan Invoice')
            }
        } catch (e: any) {
            console.error(e)
            showToast('error', e.message || 'Terjadi kesalahan sistem')
        } finally { setSaving(false) }
    }

    const handleAction = async (id: string, action: 'post' | 'pay', extraData: any = {}) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}/${action}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extraData)
            });
            if (res.ok) {
                showToast('success', action === 'post' ? 'Invoice berhasil di-Posting' : 'Pembayaran berhasil dicatat');
                loadData();
            } else {
                const err = await res.json();
                showToast('error', err.message || `Gagal ${action} invoice`);
            }
        } catch (e: any) {
            showToast('error', e.message);
        }
    }

    const addItem = () => {
        const newItems = [...form.items, { no: form.items.length + 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }]
        const totals = calculateTotals(newItems, form.tax, form.discount)
        setForm(prev => ({ ...prev, items: newItems, ...totals }))
    }

    const removeItem = (idx: number) => {
        const newItems = form.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }))
        const totals = calculateTotals(newItems, form.tax, form.discount)
        setForm(prev => ({ ...prev, items: newItems, ...totals }))
    }

    const updateItem = (idx: number, field: keyof InvoiceItem, val: any) => {
        const newItems = form.items.map((it, i) => {
            if (i !== idx) return it;
            const updated = { ...it, [field]: val };
            const qty = Number(updated.qty) || 0;
            const price = Number(updated.unitPrice) || 0;
            const disc = Number(updated.discount) || 0;
            updated.amount = qty * price * (1 - disc / 100);
            return updated;
        });
        const totals = calculateTotals(newItems, form.tax, form.discount)
        setForm(prev => ({ ...prev, items: newItems, ...totals }))
    }

    const copyFromSalesOrder = (soId: string) => {
        const so = salesOrders.find(s => s.id === soId);
        if (so) {
            const items = so.items.map((it: any, i: number) => ({
                no: i + 1,
                description: it.description,
                qty: it.qty,
                unit: it.unit,
                unitPrice: it.unitPrice,
                discount: it.discount,
                amount: it.amount
            }))
            const totals = calculateTotals(items, 11, 0)
            setForm(prev => ({
                ...prev,
                customerId: (so as any).customerId || '',
                projectId: (so as any).projectId || '',
                salesOrderId: soId,
                items,
                ...totals
            }))
        }
    }

    const filtered = invoices.filter(inv =>
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        inv.contract?.number.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-full mx-auto pb-24 md:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/20 shrink-0">
                            <Receipt className="text-white w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        INVOICES / PENAGIHAN
                    </h1>
                    <p className="text-[10px] md:text-sm text-muted-foreground font-medium mt-1">Kelola penagihan piutang customer hasil dari penjualan dan project</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={loadData} className="w-full md:w-auto h-11 rounded-xl glass">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => { setEditMode(false); setForm({ ...form, items: [], contractId: '', projectId: '', customerId: '', salesOrderId: '', deliveryOrderId: '' }); setModalOpen(true) }}
                        className="w-full md:w-auto h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 px-6 font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Invoice Baru
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Invoices', val: invoices.length, icon: FileText, color: 'text-blue-600' },
                    { label: 'Paid Invoices', val: invoices.filter(i => i.status === 'PAID').length, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Pending / Unpaid', val: invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').length, icon: Clock, color: 'text-amber-600' },
                    { label: 'Total Receivables', val: fmt(invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((a, b) => a + b.grandTotal, 0)), icon: DollarSign, color: 'text-rose-600' },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="glass-card p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-border/50 shadow-xl shadow-slate-200/50 flex md:block items-center justify-between"
                    >
                        <div className="flex items-center gap-3 md:block">
                            <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 ${s.color} shrink-0`}>
                                <s.icon size={18} className="md:w-5 md:h-5" />
                            </div>
                            <p className="md:mt-4 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        </div>
                        <span className="text-lg md:text-xl font-black tracking-tight">{s.val}</span>
                    </motion.div>
                ))}
            </div>

            {/* Content Table */}
            <div className="glass-card rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text" placeholder="Cari nomor Invoice atau Customer..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 h-12 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-600/20 font-medium transition-all"
                        />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Invoice Info</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customer & Kontrak</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Total Tagihan</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.map((inv) => (
                                <tr key={inv.id} className="hover:bg-emerald-600/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <p className="font-black text-foreground group-hover:text-emerald-600 transition-colors tracking-tight">{inv.number}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{fmtDate(inv.date)}</p>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Due: {fmtDate(inv.dueDate)}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-sm tracking-tight">{inv.customer.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {inv.contract ? (
                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-tighter shadow-sm">
                                                    Contract {inv.contract.number}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter border-l-2 border-slate-200 pl-2">Tanpa Kontrak</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <p className="font-black text-foreground">{fmt(inv.grandTotal)}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${INV_STATUS[inv.status]?.color || ''}`}>
                                            {inv.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => setDetailModal(inv)} title="View Detail" className="h-9 w-9 rounded-xl hover:bg-emerald-50 text-emerald-600">
                                                <Eye size={16} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setViewModal(inv)} title="Print / Preview Invoice" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                                                <Printer size={16} />
                                            </Button>
                                            {inv.status === 'DRAFT' && (
                                                <Button
                                                    variant="ghost" size="sm"
                                                    onClick={() => setPostingInvoice(inv)}
                                                    className="h-9 rounded-xl hover:bg-indigo-50 text-indigo-600 font-bold px-3 gap-1"
                                                >
                                                    <Send size={14} /> POSTING
                                                </Button>
                                            )}
                                            {inv.status === 'POSTED' && (
                                                <Button
                                                    variant="ghost" size="sm"
                                                    onClick={() => setPaymentConfirm({ invoice: inv, bankAccountId: inv.bankAccountId || '' })}
                                                    className="h-9 rounded-xl hover:bg-emerald-50 text-emerald-600 font-bold px-3 gap-1"
                                                >
                                                    <DollarSign size={14} /> PAID
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setSelectedId(inv.id);
                                                setEditMode(true);
                                                setForm({
                                                    customerId: inv.customerId,
                                                    projectId: inv.projectId || '',
                                                    contractId: inv.contractId || '',
                                                    salesOrderId: inv.salesOrderId || '',
                                                    deliveryOrderId: inv.deliveryOrderId || '',
                                                    bankAccountId: inv.bankAccountId || '',
                                                    signerName: inv.signerName || '',
                                                    signerPosition: inv.signerPosition || '',
                                                    date: inv.date.split('T')[0],
                                                    dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
                                                    notes: inv.notes || '',
                                                    paymentTerms: inv.paymentTerms || '',
                                                    subtotal: inv.subtotal,
                                                    tax: inv.tax,
                                                    discount: inv.discount,
                                                    discountAmt: inv.discountAmt,
                                                    taxAmt: inv.taxAmt,
                                                    grandTotal: inv.grandTotal,
                                                    items: inv.items
                                                });
                                                setModalOpen(true);
                                            }} className="h-9 w-9 rounded-xl hover:bg-emerald-50 text-emerald-600">
                                                <Edit size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/30">
                    {filtered.map((inv) => (
                        <div key={inv.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-black text-slate-800 tracking-tight">{inv.number}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">{fmtDate(inv.date)}</p>
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-wider ${INV_STATUS[inv.status]?.color || ''}`}>
                                    {inv.status}
                                </div>
                            </div>

                            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/50">
                                <p className="font-bold text-sm text-slate-800 tracking-tight">{inv.customer.name}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {inv.contract ? (
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter shadow-sm bg-indigo-50 px-2 rounded-md">
                                            Contract {inv.contract.number}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter border-l-2 border-slate-200 pl-2">Tanpa Kontrak</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                                <div className="space-y-1">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Total Tagihan</p>
                                    <p className="font-black text-slate-900">{fmt(inv.grandTotal)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-50 overflow-x-auto pb-1 custom-scrollbar">
                                <Button variant="ghost" size="sm" onClick={() => setDetailModal(inv)} className="h-9 rounded-xl hover:bg-emerald-50 text-emerald-600 shrink-0">
                                    <Eye size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setViewModal(inv)} className="h-9 rounded-xl hover:bg-slate-100 shrink-0">
                                    <Printer size={16} />
                                </Button>
                                {inv.status === 'DRAFT' && (
                                    <Button variant="ghost" size="sm" onClick={() => setPostingInvoice(inv)} className="h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-3 gap-1 shrink-0">
                                        <Send size={14} /> POSTING
                                    </Button>
                                )}
                                {inv.status === 'POSTED' && (
                                    <Button variant="ghost" size="sm" onClick={() => setPaymentConfirm({ invoice: inv, bankAccountId: inv.bankAccountId || '' })} className="h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-3 gap-1 shrink-0">
                                        <DollarSign size={14} /> PAID
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedId(inv.id);
                                    setEditMode(true);
                                    setForm({
                                        customerId: inv.customerId,
                                        projectId: inv.projectId || '',
                                        contractId: inv.contractId || '',
                                        salesOrderId: inv.salesOrderId || '',
                                        deliveryOrderId: inv.deliveryOrderId || '',
                                        bankAccountId: inv.bankAccountId || '',
                                        signerName: inv.signerName || '',
                                        signerPosition: inv.signerPosition || '',
                                        date: inv.date.split('T')[0],
                                        dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
                                        notes: inv.notes || '',
                                        paymentTerms: inv.paymentTerms || '',
                                        subtotal: inv.subtotal,
                                        tax: inv.tax,
                                        discount: inv.discount,
                                        discountAmt: inv.discountAmt,
                                        taxAmt: inv.taxAmt,
                                        grandTotal: inv.grandTotal,
                                        items: inv.items
                                    });
                                    setModalOpen(true);
                                }} className="h-9 rounded-xl hover:bg-emerald-50 text-emerald-600 shrink-0">
                                    <Edit size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}
                        />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white w-full max-h-[95vh] overflow-hidden shadow-2xl relative z-10 flex flex-col 
                                ${isMobile ? "rounded-t-[2rem] mt-auto h-[95vh]" : "rounded-[2.5rem] max-w-5xl border border-white/20"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 shrink-0" />}
                            <div className="p-4 md:p-8 border-b border-border/50 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                                        {editMode ? 'Edit Invoice' : 'Buat Invoice Baru'}
                                    </h2>
                                    <p className="text-sm font-medium text-muted-foreground">Detail penagihan piutang dan termin pembayaran</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-full h-10 w-10 hover:bg-white hover:shadow-md transition-all">
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar space-y-6 md:space-y-8 pb-24 md:pb-8">
                                {/* Auto-Pull Row */}
                                <div className="p-4 bg-emerald-600/5 rounded-2xl border border-emerald-600/10 flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                                            <Tag size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-emerald-700 tracking-wider">Tarik Data dari SO</p>
                                            <p className="text-[10px] font-medium text-emerald-600/80">Otomatis isi item dan nominal dari Pesanan Penjualan</p>
                                        </div>
                                    </div>
                                    <select
                                        className="h-11 px-4 rounded-xl bg-white border-2 border-emerald-600/20 font-bold text-sm focus:outline-none min-w-[300px]"
                                        onChange={e => copyFromSalesOrder(e.target.value)}
                                    >
                                        <option value="">Pilih Pesanan Penjualan (SO)...</option>
                                        {salesOrders.map(so => <option key={so.id} value={so.id}>{so.number} - {so.customer?.name} ({fmt(so.grandTotal || 0)})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: parties & payment info */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Customer <span className="text-rose-500">*</span></label>
                                            <select
                                                value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            >
                                                <option value="">Pilih Customer...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1 flex justify-between items-center px-1">
                                                <span>Rekening Bank Pembayaran</span>
                                                <button type="button" onClick={() => setShowBankForm(true)} className="text-emerald-600 hover:underline text-[9px] font-black uppercase tracking-widest"> + Tambah Bank</button>
                                            </label>
                                            <select
                                                value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            >
                                                <option value="">Pilih Rekening Bank...</option>
                                                {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.accountHolder})</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Penandatangan (Nama)</label>
                                                <input
                                                    placeholder="Nama Jelas..."
                                                    value={form.signerName} onChange={e => setForm({ ...form, signerName: e.target.value })}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Jabatan</label>
                                                <input
                                                    placeholder="Contoh: Finance Manager"
                                                    value={form.signerPosition} onChange={e => setForm({ ...form, signerPosition: e.target.value })}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: dates & references */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase p-1 tracking-widest text-indigo-600 ml-1">Kaitkan Kontrak (Opsional)</label>
                                            <select
                                                value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })}
                                                className="w-full h-12 rounded-2xl bg-indigo-50/50 border-2 border-indigo-600/10 font-bold text-sm focus:ring-2 focus:ring-indigo-600/20 px-4 text-indigo-900"
                                            >
                                                <option value="">Tanpa Kontrak...</option>
                                                {contracts.map(c => <option key={c.id} value={c.id}>{c.number} - {c.subject}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase p-1 tracking-widest text-emerald-600 ml-1">Judul Project</label>
                                            <select
                                                value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                                                className="w-full h-12 rounded-2xl bg-emerald-50/50 border-2 border-emerald-600/10 font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4 text-emerald-900"
                                            >
                                                <option value="">Pilih Project (Opsional)...</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Terbitkan Dari BAST</label>
                                                <select
                                                    value={form.deliveryOrderId} onChange={e => setForm({ ...form, deliveryOrderId: e.target.value })}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                >
                                                    <option value="">Pilih DO/BAST...</option>
                                                    {deliveryOrders.map(do_ => <option key={do_.id} value={do_.id}>{do_.number}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Jatuh Tempo</label>
                                                <input
                                                    type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold tracking-tight focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase p-1 tracking-widest text-muted-foreground ml-1">Tanggal Invoice</label>
                                            <input
                                                type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold tracking-tight focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                            <Receipt size={14} /> Daftar Tagihan (Items)
                                        </h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9 rounded-xl border-emerald-600/20 text-emerald-600 hover:bg-emerald-50 font-bold">
                                            <Plus size={14} className="mr-1" /> Tambah Item
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 shadow-inner bg-slate-50/30">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="bg-slate-50">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground transition-all">Deskripsi</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground w-16 text-center">Qty</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground w-32">Harga</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground w-16 text-center">Disc%</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground w-40 text-right pr-6">Total</th>
                                                    <th className="px-4 py-3 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {form.items.map((it, idx) => (
                                                    <tr key={idx} className="group hover:bg-white transition-colors">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                placeholder="Deskripsi..."
                                                                value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                                                                className="w-full bg-transparent border-none font-bold text-sm focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                                className="w-full bg-transparent border-none font-bold text-sm text-center focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" value={it.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                                className="w-full bg-transparent border-none font-bold text-sm focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="number" value={it.discount} onChange={e => updateItem(idx, 'discount', e.target.value)}
                                                                className="w-full bg-transparent border-none font-bold text-sm text-center focus:ring-0 text-rose-600"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-black text-sm pr-6">
                                                            {fmt(it.amount)}
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <button onClick={() => removeItem(idx)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Calculation Footer */}
                                <div className="flex flex-col md:flex-row gap-8 justify-between pt-4 border-t border-border/50">
                                    <div className="flex-1 space-y-4">
                                        <textarea
                                            placeholder="Termin Pembayaran / Catatan..."
                                            value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                                            className="w-full h-24 rounded-2xl bg-slate-50 border-none font-bold text-sm p-4 focus:ring-2 focus:ring-emerald-600/20 shadow-inner resize-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-80 space-y-3">
                                        <div className="flex justify-between text-sm font-bold text-muted-foreground px-1 uppercase tracking-tighter">
                                            <span>Subtotal</span>
                                            <span>{fmt(form.subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                                            <div className="flex items-center gap-2">
                                                <span>Discount</span>
                                                <input
                                                    type="number" value={form.discount}
                                                    onChange={e => {
                                                        const disc = Number(e.target.value) || 0;
                                                        const totals = calculateTotals(form.items, form.tax, disc);
                                                        setForm({ ...form, discount: disc, ...totals });
                                                    }}
                                                    className="w-12 h-6 px-1 rounded-md bg-slate-100 border-none text-[10px] font-black text-center focus:ring-0"
                                                />
                                                <Percent size={10} />
                                            </div>
                                            <span>- {fmt(form.discountAmt)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1 border-b pb-3 border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span>Tax</span>
                                                <input
                                                    type="number" value={form.tax}
                                                    onChange={e => {
                                                        const tx = Number(e.target.value) || 0;
                                                        const totals = calculateTotals(form.items, tx, form.discount);
                                                        setForm({ ...form, tax: tx, ...totals });
                                                    }}
                                                    className="w-12 h-6 px-1 rounded-md bg-slate-100 border-none text-[10px] font-black text-center focus:ring-0"
                                                />
                                                <Percent size={10} />
                                            </div>
                                            <span>+ {fmt(form.taxAmt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-1">
                                            <span className="text-sm font-black uppercase tracking-widest text-foreground">Grand Total</span>
                                            <span className="text-xl font-black text-emerald-600 tracking-tighter">{fmt(form.grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-border/50 flex items-center justify-end gap-3 bg-slate-50/50 mt-auto">
                                <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-12 rounded-2xl px-6 font-bold hover:bg-white text-muted-foreground bg-white">Batal</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-12 rounded-2xl px-12 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black tracking-tighter uppercase disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Simpan Invoice
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200]"
                    >
                        <div className={`px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="font-bold text-sm uppercase tracking-tight">{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {viewModal && (
                    <InvoicePDFModal invoice={viewModal} company={company} onClose={() => setViewModal(null)} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {detailModal && (
                    <InvoiceDetailModal
                        invoice={detailModal}
                        onClose={() => setDetailModal(null)}
                        onPrint={() => {
                            const inv = detailModal;
                            setDetailModal(null);
                            setTimeout(() => setViewModal(inv), 300);
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBankForm && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBankForm(false)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl overflow-hidden flex flex-col
                                ${isMobile ? "w-full rounded-t-[2rem] mt-auto max-h-[90vh]" : "rounded-[2rem] p-8 w-full max-w-md"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />}
                            <div className={`${isMobile ? 'p-6 pb-8 overflow-y-auto' : ''}`}>
                                <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Tambah Rekening Bank</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nama Bank</label>
                                        <input value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="Contoh: Bank Central Asia (BCA)" className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nomor Rekening</label>
                                        <input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="000-000-0000" className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Atas Nama</label>
                                        <input value={bankForm.accountHolder} onChange={e => setBankForm({ ...bankForm, accountHolder: e.target.value })} placeholder="PT. Axon Ecosystem" className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang (Opsional)</label>
                                        <input value={bankForm.branch} onChange={e => setBankForm({ ...bankForm, branch: e.target.value })} placeholder="Pekayon, Bekasi" className="w-full h-11 px-4 rounded-xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        <Button variant="outline" className="flex-1 rounded-xl font-bold h-11" onClick={() => setShowBankForm(false)}>Batal</Button>
                                        <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold h-11" onClick={async () => {
                                            if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder) return showToast('error', 'Semua field wajib diisi');
                                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banks`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(bankForm)
                                            });
                                            if (res.ok) {
                                                const newBank = await res.json();
                                                setBanks(prev => [newBank, ...prev]);
                                                setForm(f => ({ ...f, bankAccountId: newBank.id }));
                                                setShowBankForm(false);
                                                setBankForm({ bankName: '', accountNumber: '', accountHolder: '', branch: '' });
                                                showToast('success', 'Rekening Bank berhasil ditambahkan');
                                            }
                                        }}>Simpan Bank</Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {postingInvoice && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 md:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setPostingInvoice(null)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl flex flex-col 
                                ${isMobile ? "w-full rounded-t-[2rem] mt-auto pb-8 pt-4 px-6 border-t-8 border-indigo-600" : "rounded-[2rem] p-8 w-full max-w-md border-t-8 border-indigo-600"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Konfirmasi Posting</h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Invoice {postingInvoice.number}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
                                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                                    <span className="block mb-1 font-black">⚠️ PERINGATAN!</span>
                                    Posting invoice akan secara otomatis mencatat transaksi ke dalam **Buku Besar (General Ledger)**. Tindakan ini tidak dapat dibatalkan. Pastikan semua data sudah benar.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <Button variant="outline" className="flex-1 rounded-xl font-bold h-12" onClick={() => setPostingInvoice(null)}>Batal</Button>
                                <Button
                                    className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold h-12 shadow-lg shadow-indigo-600/20 text-white"
                                    onClick={() => {
                                        handleAction(postingInvoice.id, 'post');
                                        setPostingInvoice(null);
                                    }}
                                >
                                    Ya, Posting Sekarang
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {paymentConfirm && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setPaymentConfirm(null)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl flex flex-col 
                                ${isMobile ? "w-full rounded-t-[2rem] mt-auto pb-8 pt-4 px-6 border-t-8 border-emerald-600" : "rounded-[2rem] p-8 w-full max-w-md border-t-8 border-emerald-600"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Konfirmasi Pembayaran</h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Invoice {paymentConfirm.invoice.number}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
                                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                                    <span className="block mb-1 font-black">⚠️ PERINGATAN!</span>
                                    Konfirmasi pembayaran akan mencatat penerimaan uang ke kas/bank dan mengurangi piutang. **Tindakan ini tidak dapat dibatalkan.**
                                </p>
                            </div>

                            <div className="space-y-2 mb-6">
                                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pilih Rekening Penerima <span className="text-rose-500">*</span></label>
                                <select
                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none font-bold text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                    value={paymentConfirm.bankAccountId}
                                    onChange={(e) => setPaymentConfirm({ ...paymentConfirm, bankAccountId: e.target.value })}
                                >
                                    <option value="">Pilih Bank...</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.accountHolder})</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <Button variant="outline" className="flex-1 rounded-xl font-bold h-12" onClick={() => setPaymentConfirm(null)}>Batal</Button>
                                <Button
                                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold h-12 shadow-lg shadow-emerald-600/20 text-white disabled:opacity-50"
                                    disabled={!paymentConfirm.bankAccountId}
                                    onClick={() => {
                                        handleAction(paymentConfirm.invoice.id, 'pay', { bankAccountId: paymentConfirm.bankAccountId });
                                        setPaymentConfirm(null);
                                    }}
                                >
                                    Konfirmasi Lunas
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
