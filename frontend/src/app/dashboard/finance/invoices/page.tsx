"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Receipt, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    Clock, DollarSign, FileText,
    Ban, Printer, Percent, Tag, Send, Eye
} from "lucide-react"
import { FinancePageShell } from "@/components/finance/FinanceUI"
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
    currency: string; subtotal: number; tax: number; discountType?: string; discount: number;
    discountAmt: number; taxAmt: number; grandTotal: number;
    payments?: { id: string; amount: number; date: string; status: string; notes?: string }[];
    notes?: string; paymentTerms?: string; invoiceType?: string; terminType?: string; terminPercent?: number; terminNominal?: number;
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

interface Ref { id: string; number: string; name?: string; customer?: { name: string }; grandTotal?: number; items: any[]; salesOrderId?: string }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const INV_STATUS: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    POSTED: { label: 'Posted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Send },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
    PARTIAL: { label: 'Partial', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
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
    const [coas, setCoas] = useState<{ id: string; name: string; code: string; type: string }[]>([])
    const [showBankForm, setShowBankForm] = useState(false)
    const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', branch: '', coaId: '' })

    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [filterProject, setFilterProject] = useState('ALL')

    const [saving, setSaving] = useState(false)
    const [viewModal, setViewModal] = useState<Invoice | null>(null)
    const [detailModal, setDetailModal] = useState<Invoice | null>(null)
    const [postingInvoice, setPostingInvoice] = useState<Invoice | null>(null)
    const [paymentConfirm, setPaymentConfirm] = useState<{ invoice: Invoice, bankAccountId: string, amount: number } | null>(null)
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
        dueDate: '', notes: '', paymentTerms: '', invoiceType: 'STANDARD', terminType: 'PERCENT', terminPercent: 30, terminNominal: 0,
        subtotal: 0, tax: 11, discountType: 'PERCENTAGE', discount: 0, discountAmt: 0, taxAmt: 0, grandTotal: 0,
        items: [] as InvoiceItem[]
    })

    const loadData = useCallback(async () => {
        if (!userRole) return
        setLoading(true)
        try {
            const [invRes, prjRes, soRes, doRes, custRes, cntRes, coRes, bankRes, coaRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, { headers: { 'x-user-role': userRole } }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/delivery-orders`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers: { 'x-user-role': userRole } }).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banks`).then(r => r.json()),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coa?type=ASSET`).then(r => r.json())
            ])
            setInvoices(invRes)
            setProjects(prjRes)
            setSalesOrders(soRes)
            setDeliveryOrders(doRes)
            setCustomers(custRes)
            setContracts(cntRes)
            setCompany(coRes)
            setBanks(bankRes)
            setCoas(coaRes)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [userRole])

    useEffect(() => { loadData() }, [loadData])

    const calculateTotals = (items: InvoiceItem[], taxRate: number, discValue: number, discountType: string = 'PERCENTAGE') => {
        const subtotal = items.reduce((acc, it) => acc + (it.amount || 0), 0)
        const discountAmt = discountType === 'AMOUNT'
            ? Math.min(Math.max(discValue, 0), subtotal)
            : (subtotal * Math.min(Math.max(discValue, 0), 100)) / 100
        const taxable = Math.max(0, subtotal - discountAmt)
        const taxAmt = (taxable * Math.max(taxRate, 0)) / 100
        const grandTotal = taxable + taxAmt
        return { subtotal, discountAmt, taxAmt, grandTotal }
    }

    const handleSave = async () => {
        if (!form.customerId || form.items.length === 0) return showToast('error', 'Customer dan Item wajib diisi')
        setSaving(true)
        try {
            const { terminType, terminPercent, terminNominal, ...cleanForm } = form;
            const payload = {
                ...cleanForm,
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

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus invoice ini?')) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}`, { method: 'DELETE' })
            if (res.ok) {
                showToast('success', 'Invoice berhasil dihapus')
                loadData()
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Gagal menghapus invoice')
            }
        } catch (e: any) {
            showToast('error', e.message)
        }
    }

    const addItem = () => {
        const newItems = [...form.items, { no: form.items.length + 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }]
        const totals = calculateTotals(newItems, form.tax, form.discount, (form as any).discountType)
        setForm(prev => ({ ...prev, items: newItems, ...totals }))
    }

    const removeItem = (idx: number) => {
        const newItems = form.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }))
        const totals = calculateTotals(newItems, form.tax, form.discount, (form as any).discountType)
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
        const totals = calculateTotals(newItems, form.tax, form.discount, (form as any).discountType)
        setForm(prev => ({ ...prev, items: newItems, ...totals }))
    }

    const copyFromSalesOrder = (soId: string, currentInvoiceType: string = form.invoiceType, currentTerminPercent: number = form.terminPercent, currentTerminType: string = form.terminType, currentTerminNominal: number = form.terminNominal) => {
        const so = salesOrders.find(s => s.id === soId);
        if (so) {
            let items = [];
            
            if (currentInvoiceType !== 'STANDARD') {
                const soTotal = so.grandTotal || 0;
                let terminLabel = "Tagihan";
                if (currentInvoiceType === 'DOWN_PAYMENT') terminLabel = "Down Payment (Uang Muka)";
                else if (currentInvoiceType === 'PROGRESS') terminLabel = "Termin Progress";
                else if (currentInvoiceType === 'FINAL') terminLabel = "Pelunasan (Final)";
                else if (currentInvoiceType === 'RETENTION') terminLabel = "Retensi";

                const terminAmount = currentTerminType === 'PERCENT' ? soTotal * (currentTerminPercent / 100) : currentTerminNominal;
                const subtotalBeforeTax = terminAmount;
                
                const descSuffix = currentTerminType === 'PERCENT' ? `${currentTerminPercent}%` : `(Nominal)`;

                items = [{
                    no: 1,
                    description: `${terminLabel} ${descSuffix} - SO ${so.number}`,
                    qty: 1,
                    unit: 'lot',
                    unitPrice: subtotalBeforeTax,
                    discount: 0,
                    amount: subtotalBeforeTax
                }];
            } else {
                items = so.items.map((it: any, i: number) => ({
                    no: i + 1,
                    description: it.description,
                    qty: it.qty,
                    unit: it.unit,
                    unitPrice: it.unitPrice,
                    discount: it.discount,
                    amount: it.amount
                }));
            }

            const totals = calculateTotals(items, form.tax, form.discount, (form as any).discountType);
            const linkedDo = deliveryOrders.find(d => d.salesOrderId === soId);
            setForm(prev => ({
                ...prev,
                customerId: (so as any).customerId || '',
                projectId: (so as any).projectId || '',
                salesOrderId: soId,
                deliveryOrderId: linkedDo?.id || prev.deliveryOrderId,
                items,
                ...totals
            }));
        }
    }

    const openEdit = (inv: Invoice) => {
        setSelectedId(inv.id)
        setEditMode(true)
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
            invoiceType: inv.invoiceType || 'STANDARD',
            terminType: inv.terminType || 'PERCENT',
            terminPercent: inv.terminPercent || 30,
            terminNominal: inv.terminNominal || 0,
            subtotal: inv.subtotal,
            tax: inv.tax,
            discountType: (inv as any).discountType || 'PERCENTAGE',
            discount: inv.discount,
            discountAmt: inv.discountAmt,
            taxAmt: inv.taxAmt,
            grandTotal: inv.grandTotal,
            items: inv.items
        })
        setModalOpen(true)
    }

    const paidOf = (inv: Invoice) => (inv.payments || [])
        .filter(p => p.status === 'SUCCESS')
        .reduce((s, p) => s + p.amount, 0)

    const filtered = (invoices || [])
        .filter(inv => {
            const s = search.toLowerCase()
            const matchSearch =
                inv.number.toLowerCase().includes(s) ||
                (inv.customer?.name?.toLowerCase().includes(s) ?? false) ||
                (inv.contract?.number?.toLowerCase().includes(s) ?? false) ||
                (inv.project?.number?.toLowerCase().includes(s) ?? false) ||
                (inv.salesOrder?.number?.toLowerCase().includes(s) ?? false)
            return matchSearch &&
                (filterStatus === 'ALL' || inv.status === filterStatus) &&
                (filterProject === 'ALL' || inv.projectId === filterProject)
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const billable = invoices.filter(i => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
    const stats = {
        total: invoices.length,
        docValue: billable.reduce((s, inv) => s + inv.grandTotal, 0),
        paid: billable.reduce((s, inv) => s + paidOf(inv), 0),
        outstanding: billable.reduce((s, inv) => s + Math.max(0, inv.grandTotal - paidOf(inv)), 0),
    }

    const counts: Record<string, number> = {
        ALL: invoices.length,
        ...Object.keys(INV_STATUS).reduce((acc, k) => ({ ...acc, [k]: invoices.filter(i => i.status === k).length }), {} as Record<string, number>)
    }

    return (
        <FinancePageShell>
            {/* Compact Header */}
            <header className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-600 text-white shadow-2xs">
                        <Receipt size={13} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400">
                            // FINANCE
                        </span>
                        <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white lg:text-base">Invoice / Penagihan</h1>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">[{invoices.length} RECORDS]</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="hidden items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-900 xl:flex">
                        <span className="text-[9.5px] uppercase text-slate-500 dark:text-slate-400">BILLED:</span>
                        <strong className="font-bold text-slate-700 dark:text-slate-300">{fmt(stats.docValue)}</strong>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 font-mono text-[11px] dark:border-rose-900 dark:bg-rose-950/30 md:flex">
                        <span className="text-[9.5px] uppercase text-slate-500 dark:text-slate-400">OUTSTANDING:</span>
                        <strong className="font-bold text-rose-600 dark:text-rose-400">{fmt(stats.outstanding)}</strong>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-[11px] dark:border-emerald-900 dark:bg-emerald-950/30 lg:flex">
                        <span className="text-[9.5px] uppercase text-slate-500 dark:text-slate-400">PAID:</span>
                        <strong className="font-bold text-emerald-700 dark:text-emerald-400">{fmt(stats.paid)}</strong>
                    </div>

                    <Button variant="outline" onClick={loadData} className="h-7 rounded border border-slate-200 px-2.5 font-mono text-[11px] text-slate-700 shadow-2xs hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                        <RefreshCw size={11} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> RELOAD
                    </Button>
                    <Button
                        onClick={() => { setEditMode(false); setForm({ ...form, items: [], contractId: '', projectId: '', customerId: '', salesOrderId: '', deliveryOrderId: '' }); setModalOpen(true) }}
                        className="h-7 rounded bg-emerald-600 px-3 font-mono text-[11px] text-white shadow-2xs hover:bg-emerald-700"
                    >
                        <Plus size={12} className="mr-1" /> NEW INVOICE
                    </Button>
                </div>
            </header>

            {/* Segmented Toolbar: Status Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-[#0b0f17]">
                <div className="flex flex-wrap items-center gap-1">
                    {['ALL', ...Object.keys(INV_STATUS)].map(s => {
                        const count = counts[s] || 0
                        const active = filterStatus === s
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] transition-colors ${active
                                        ? 'bg-emerald-600 font-semibold text-white shadow-2xs'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                            >
                                <span>{s === 'ALL' ? 'All' : INV_STATUS[s].label}</span>
                                <span className={`rounded px-1 py-0.2 font-mono text-[9.5px] ${active ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search number, customer, contract..."
                            className="h-7 w-48 rounded border border-slate-200 bg-white pl-7 pr-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white lg:w-64"
                        />
                    </div>
                    <select
                        value={filterProject}
                        onChange={e => setFilterProject(e.target.value)}
                        className="h-7 rounded border border-slate-200 bg-white px-2 font-mono text-xs text-slate-700 focus:border-emerald-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                        <option value="ALL">All Projects</option>
                        {(Array.isArray(projects) ? projects : []).map(p => (
                            <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active Project Highlight Pill */}
            {filterProject !== 'ALL' && (() => {
                const p = projects.find(x => x.id === filterProject)
                return (
                    <div className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900 p-2 text-xs text-white">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded border border-emerald-800 bg-emerald-950 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-emerald-300">Active Project</span>
                            <span className="font-mono font-bold text-slate-400">#{p?.number}</span>
                            <span className="font-semibold text-slate-200">{p?.name}</span>
                            <span className="text-slate-500">•</span>
                            <span className="font-mono text-[11px] font-bold text-emerald-400">{fmt(filtered.reduce((s, i) => s + i.grandTotal, 0))}</span>
                        </div>
                        <button onClick={() => setFilterProject('ALL')} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                            <X size={13} />
                        </button>
                    </div>
                )
            })()}

            {/* High-Density Data Table */}
            {loading ? (
                <div className="flex h-48 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-b-2 border-emerald-600" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center rounded-md border border-dashed border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-[#0b0f17]">
                    <Receipt size={32} className="mb-1.5 text-slate-300 dark:text-slate-600" />
                    <p className="font-mono text-xs uppercase tracking-wider text-slate-400">No invoices found</p>
                </div>
            ) : (
                <>
                    {/* Desktop High-Density Linear Table */}
                    <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#0b0f17] md:block">
                        <table className="w-full border-collapse text-left font-sans text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                                    <th className="px-3 py-2 font-semibold">Number</th>
                                    <th className="px-3 py-2 font-semibold">Customer</th>
                                    <th className="px-3 py-2 font-semibold">Date</th>
                                    <th className="px-3 py-2 font-semibold">Due Date</th>
                                    <th className="px-3 py-2 text-right font-semibold">Grand Total</th>
                                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                                    <th className="px-3 py-2 text-right font-semibold">Sisa</th>
                                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {filtered.map(inv => {
                                    const sc = INV_STATUS[inv.status] || INV_STATUS.DRAFT
                                    const Icon = sc.icon
                                    const paid = paidOf(inv)
                                    const remaining = Math.max(0, inv.grandTotal - paid)
                                    const overdue = remaining > 0 && inv.status !== 'CANCELLED' && !!inv.dueDate && new Date(inv.dueDate).getTime() < Date.now()

                                    return (
                                        <tr key={inv.id} className="group transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-900/60">
                                            {/* Number */}
                                            <td className="whitespace-nowrap px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => setDetailModal(inv)} className="font-mono text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                                                        {inv.number}
                                                    </button>
                                                    {inv.project && (
                                                        <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[9px] text-slate-400 dark:bg-slate-800 dark:text-slate-500" title={inv.project.name}>
                                                            {inv.project.number}
                                                        </span>
                                                    )}
                                                </div>
                                                {inv.contract && (
                                                    <p className="mt-0.5 max-w-[150px] truncate font-mono text-[9px] text-slate-400 dark:text-slate-500" title={inv.contract.subject}>
                                                        KTR {inv.contract.number}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Customer */}
                                            <td className="max-w-[170px] px-3 py-2 truncate">
                                                <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={`${inv.customer?.name} (${inv.customer?.code})`}>
                                                    {inv.customer?.name}
                                                </span>
                                                {inv.salesOrder && (
                                                    <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400" title={`Sales Order ${inv.salesOrder.number}`}>
                                                        SO {inv.salesOrder.number}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Date */}
                                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-500">
                                                {fmtDate(inv.date)}
                                            </td>

                                            {/* Due Date */}
                                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                                                <span className={overdue ? 'font-semibold text-rose-500' : 'text-slate-500'}>{fmtDate(inv.dueDate)}</span>
                                                {overdue && <span className="ml-1 rounded bg-rose-50 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-rose-500">Overdue</span>}
                                            </td>

                                            {/* Grand Total */}
                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{fmt(inv.grandTotal)}</span>
                                            </td>

                                            {/* Paid */}
                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                <span className={`font-mono text-xs ${paid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{paid > 0 ? fmt(paid) : '—'}</span>
                                            </td>

                                            {/* Sisa */}
                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                <span className={`font-mono text-xs font-bold ${remaining > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{remaining > 0 ? fmt(remaining) : 'LUNAS'}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="whitespace-nowrap px-3 py-2 text-center">
                                                <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider ${sc.color}`}>
                                                    <Icon size={9} /> {sc.label}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {inv.status === 'DRAFT' && (
                                                        <button onClick={() => setPostingInvoice(inv)} title="Posting ke Buku Besar" className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 font-mono text-[9px] font-semibold uppercase text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                                                            <Send size={10} /> POST
                                                        </button>
                                                    )}
                                                    {['POSTED', 'PARTIAL'].includes(inv.status) && (
                                                        <button onClick={() => setPaymentConfirm({ invoice: inv, bankAccountId: inv.bankAccountId || '', amount: remaining })} title="Catat Pembayaran" className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 font-mono text-[9px] font-semibold uppercase text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                                            <DollarSign size={10} /> PAY
                                                        </button>
                                                    )}
                                                    <button onClick={() => setDetailModal(inv)} title="View Detail" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40">
                                                        <Eye size={12} />
                                                    </button>
                                                    <button onClick={() => setViewModal(inv)} title="Print / Preview Invoice" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800">
                                                        <Printer size={12} />
                                                    </button>
                                                    <button onClick={() => openEdit(inv)} title="Edit" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40">
                                                        <Edit size={12} />
                                                    </button>
                                                    <button onClick={() => handleDelete(inv.id)} title="Delete" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
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
                    <div className="space-y-2 md:hidden">
                        {filtered.map(inv => {
                            const sc = INV_STATUS[inv.status] || INV_STATUS.DRAFT
                            const Icon = sc.icon
                            const paid = paidOf(inv)
                            const remaining = Math.max(0, inv.grandTotal - paid)
                            return (
                                <div key={inv.id} className="space-y-1.5 rounded border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-[#0b0f17]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => setDetailModal(inv)} className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{inv.number}</button>
                                            {inv.project && <span className="font-mono text-[9px] text-slate-400">#{inv.project.number}</span>}
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase ${sc.color}`}>
                                            <Icon size={8} /> {sc.label}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-200">{inv.customer?.name}</p>
                                        <p className="truncate text-[10px] text-slate-500">
                                            Due: {fmtDate(inv.dueDate)}{inv.contract ? ` • ${inv.contract.number}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 font-mono text-xs dark:border-slate-800/60">
                                        <div className="min-w-0">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(inv.grandTotal)}</span>
                                            {remaining > 0 && paid > 0 && (
                                                <span className="ml-1 text-[9px] text-rose-500">sisa {fmt(remaining)}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {inv.status === 'DRAFT' && (
                                                <button onClick={() => setPostingInvoice(inv)} title="Posting" className="rounded p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"><Send size={12} /></button>
                                            )}
                                            {['POSTED', 'PARTIAL'].includes(inv.status) && (
                                                <button onClick={() => setPaymentConfirm({ invoice: inv, bankAccountId: inv.bankAccountId || '', amount: remaining })} title="Pay" className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"><DollarSign size={12} /></button>
                                            )}
                                            <button onClick={() => setViewModal(inv)} title="Print" className="rounded p-1 text-slate-500 hover:text-slate-900 dark:hover:bg-slate-800"><Printer size={12} /></button>
                                            <button onClick={() => openEdit(inv)} title="Edit" className="rounded p-1 text-slate-500 hover:text-blue-600 dark:hover:bg-blue-950/40"><Edit size={12} /></button>
                                            <button onClick={() => handleDelete(inv.id)} title="Delete" className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Modal Form */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
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
                                ${isMobile ? "h-[100dvh] max-h-none rounded-none" : "max-w-5xl rounded-2xl border border-white/20 lg:rounded-3xl"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 shrink-0" />}
                            <div className="flex items-center justify-between border-b border-border/50 bg-slate-50/50 p-3 sm:p-4 lg:p-6">
                                <div>
                                    <h2 className="text-base font-semibold uppercase tracking-tight text-foreground sm:text-lg lg:text-xl">
                                        {editMode ? 'Edit Invoice' : 'Buat Invoice Baru'}
                                    </h2>
                                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">Detail penagihan piutang dan termin pembayaran</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-full h-10 w-10 hover:bg-white hover:shadow-md transition-all">
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-3 pb-24 sm:space-y-6 sm:p-4 sm:pb-24 md:pb-6 lg:p-6 lg:pb-8">
                                <div className="flex flex-col gap-3 rounded-xl border border-emerald-600/10 bg-emerald-600/5 p-3 sm:p-4 lg:flex-row lg:items-center">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 sm:text-xs">Tarik Data dari SO / Penagihan Termin</p>
                                            <p className="text-[9px] font-medium text-emerald-600/80 sm:text-[10px]">Otomatis isi item dan nominal berdasarkan jenis tagihan</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                                        <select
                                            className="h-9 w-full rounded-lg border-2 border-emerald-600/20 bg-white px-3 text-xs font-semibold focus:outline-none sm:h-10 sm:w-36"
                                            value={form.invoiceType}
                                            onChange={e => {
                                                setForm({ ...form, invoiceType: e.target.value });
                                                if (form.salesOrderId) copyFromSalesOrder(form.salesOrderId, e.target.value, form.terminPercent);
                                            }}
                                        >
                                            <option value="STANDARD">Tagihan Penuh</option>
                                            <option value="DOWN_PAYMENT">Down Payment (DP)</option>
                                            <option value="PROGRESS">Termin Progress</option>
                                            <option value="FINAL">Pelunasan</option>
                                            <option value="RETENTION">Retensi</option>
                                        </select>
                                        
                                        {form.invoiceType !== 'STANDARD' && (
                                            <div className="flex h-9 w-full items-center overflow-hidden rounded-lg border-2 border-emerald-600/20 bg-white sm:h-10 sm:w-auto">
                                                <select 
                                                    className="h-full border-r border-emerald-600/20 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 focus:outline-none"
                                                    value={form.terminType}
                                                    onChange={e => {
                                                        const tType = e.target.value;
                                                        setForm({ ...form, terminType: tType });
                                                        if (form.salesOrderId) copyFromSalesOrder(form.salesOrderId, form.invoiceType, form.terminPercent, tType, form.terminNominal);
                                                    }}
                                                >
                                                    <option value="PERCENT">%</option>
                                                    <option value="NOMINAL">Rp</option>
                                                </select>
                                                <div className="relative flex-1">
                                                    {form.terminType === 'PERCENT' ? (
                                                        <input 
                                                            type="number" 
                                                            className="h-full w-full bg-transparent pl-7 pr-2 text-xs font-semibold focus:outline-none sm:w-20"
                                                            value={form.terminPercent}
                                                            onChange={e => {
                                                                const pct = Number(e.target.value);
                                                                setForm({ ...form, terminPercent: pct });
                                                                if (form.salesOrderId) copyFromSalesOrder(form.salesOrderId, form.invoiceType, pct, form.terminType, form.terminNominal);
                                                            }}
                                                        />
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            className="h-full w-full bg-transparent pl-7 pr-2 text-xs font-semibold focus:outline-none sm:w-28"
                                                            value={form.terminNominal || ''}
                                                            placeholder="Nominal..."
                                                            onChange={e => {
                                                                const nom = Number(e.target.value);
                                                                setForm({ ...form, terminNominal: nom });
                                                                if (form.salesOrderId) copyFromSalesOrder(form.salesOrderId, form.invoiceType, form.terminPercent, form.terminType, nom);
                                                            }}
                                                        />
                                                    )}
                                                    {form.terminType === 'PERCENT' ? (
                                                        <Percent size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    ) : (
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400">Rp</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <select
                                            className="h-9 w-full rounded-lg border-2 border-emerald-600/20 bg-white px-3 text-xs font-semibold focus:outline-none sm:h-10 sm:w-auto sm:min-w-[180px] lg:min-w-[200px]"
                                            value={form.salesOrderId}
                                            onChange={e => copyFromSalesOrder(e.target.value)}
                                        >
                                            <option value="">Pilih SO...</option>
                                            {salesOrders.map(so => <option key={so.id} value={so.id}>{so.number} ({fmt(so.grandTotal || 0)})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: parties & payment info */}
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Customer <span className="text-rose-500">*</span></label>
                                            <select
                                                value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                                className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            >
                                                <option value="">Pilih Customer...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1 flex justify-between items-center px-1">
                                                <span>Rekening Bank Pembayaran</span>
                                                <button type="button" onClick={() => setShowBankForm(true)} className="text-emerald-600 hover:underline text-[9px] font-bold uppercase tracking-widest"> + Tambah Bank</button>
                                            </label>
                                            <select
                                                value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })}
                                                className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            >
                                                <option value="">Pilih Rekening Bank...</option>
                                                {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.accountHolder})</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Penandatangan (Nama)</label>
                                                <input
                                                    placeholder="Nama Jelas..."
                                                    value={form.signerName} onChange={e => setForm({ ...form, signerName: e.target.value })}
                                                    className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Jabatan</label>
                                                <input
                                                    placeholder="Contoh: Finance Manager"
                                                    value={form.signerPosition} onChange={e => setForm({ ...form, signerPosition: e.target.value })}
                                                    className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: dates & references */}
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-indigo-600 ml-1">Kaitkan Kontrak (Opsional)</label>
                                            <select
                                                value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })}
                                                className="w-full h-10 rounded-xl sm:h-11 bg-indigo-50/50 border-2 border-indigo-600/10 font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600/20 px-4 text-indigo-900"
                                            >
                                                <option value="">Tanpa Kontrak...</option>
                                                {contracts.map(c => <option key={c.id} value={c.id}>{c.number} - {c.subject}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-emerald-600 ml-1">Judul Project</label>
                                            <select
                                                value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                                                className="w-full h-10 rounded-xl sm:h-11 bg-emerald-50/50 border-2 border-emerald-600/10 font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4 text-emerald-900"
                                            >
                                                <option value="">Pilih Project (Opsional)...</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Terbitkan Dari BAST</label>
                                                <select
                                                    value={form.deliveryOrderId} onChange={e => setForm({ ...form, deliveryOrderId: e.target.value })}
                                                    className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                >
                                                    <option value="">Pilih DO/BAST...</option>
                                                    {deliveryOrders.map(do_ => <option key={do_.id} value={do_.id}>{do_.number}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Jatuh Tempo</label>
                                                <input
                                                    type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                                    className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-bold tracking-tight focus:ring-2 focus:ring-emerald-600/20 px-4"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase p-1 tracking-widest text-muted-foreground ml-1">Tanggal Invoice</label>
                                            <input
                                                type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                                className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-bold tracking-tight focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                            <Receipt size={14} /> Daftar Tagihan (Items)
                                        </h3>
                                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9 rounded-xl border-emerald-600/20 text-emerald-600 hover:bg-emerald-50 font-bold">
                                            <Plus size={14} className="mr-1" /> Tambah Item
                                        </Button>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner bg-slate-50/30">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="bg-slate-50">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground transition-all">Deskripsi</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground w-16 text-center">Qty</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground w-32">Harga</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground w-16 text-center">Disc%</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground w-40 text-right pr-6">Total</th>
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
                                                                className="w-full bg-transparent border-none font-semibold text-xs sm:text-sm focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                                className="w-full bg-transparent border-none font-semibold text-xs sm:text-sm text-center focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" value={it.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                                className="w-full bg-transparent border-none font-semibold text-xs sm:text-sm focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="number" value={it.discount} onChange={e => updateItem(idx, 'discount', e.target.value)}
                                                                className="w-full bg-transparent border-none font-semibold text-xs sm:text-sm text-center focus:ring-0 text-rose-600"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-xs sm:text-sm pr-6">
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
                                            className="w-full h-20 rounded-xl sm:h-24 bg-slate-50 border-none font-semibold text-xs sm:text-sm p-4 focus:ring-2 focus:ring-emerald-600/20 shadow-inner resize-none"
                                        />
                                    </div>
                                    <div className="w-full md:w-80 space-y-3">
                                        <div className="flex justify-between text-sm font-bold text-muted-foreground px-1 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span>{fmt(form.subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                                            <div className="flex items-center gap-2">
                                                <span>Discount</span>
                                                <select
                                                    value={(form as any).discountType}
                                                    onChange={e => {
                                                        const dt = e.target.value;
                                                        const totals = calculateTotals(form.items, form.tax, 0, dt);
                                                        setForm({ ...form, discountType: dt, discount: 0, ...totals });
                                                    }}
                                                    className="h-6 px-1 rounded-md bg-slate-100 border-none text-[10px] font-bold focus:ring-0 text-emerald-700 cursor-pointer"
                                                    title="Tipe diskon: persen atau nominal rupiah"
                                                >
                                                    <option value="PERCENTAGE">%</option>
                                                    <option value="AMOUNT">Rp</option>
                                                </select>
                                                {(form as any).discountType === 'AMOUNT' ? (
                                                    <div className="relative">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">Rp</span>
                                                        <input
                                                            type="number" min="0" value={form.discount || ''}
                                                            placeholder="0"
                                                            onChange={e => {
                                                                const disc = Number(e.target.value) || 0;
                                                                const totals = calculateTotals(form.items, form.tax, disc, 'AMOUNT');
                                                                setForm({ ...form, discount: disc, ...totals });
                                                            }}
                                                            className="w-28 h-6 pl-7 pr-1 rounded-md bg-slate-100 border-none text-[10px] font-bold text-right focus:ring-0"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number" min="0" max="100" value={form.discount}
                                                            onChange={e => {
                                                                const disc = Number(e.target.value) || 0;
                                                                const totals = calculateTotals(form.items, form.tax, disc, 'PERCENTAGE');
                                                                setForm({ ...form, discount: disc, ...totals });
                                                            }}
                                                            className="w-12 h-6 px-1 rounded-md bg-slate-100 border-none text-[10px] font-bold text-center focus:ring-0"
                                                        />
                                                        <Percent size={10} />
                                                    </div>
                                                )}
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
                                                        const totals = calculateTotals(form.items, tx, form.discount, (form as any).discountType);
                                                        setForm({ ...form, tax: tx, ...totals });
                                                    }}
                                                    className="w-12 h-6 px-1 rounded-md bg-slate-100 border-none text-[10px] font-bold text-center focus:ring-0"
                                                />
                                                <Percent size={10} />
                                            </div>
                                            <span>+ {fmt(form.taxAmt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-1">
                                            <span className="text-sm font-bold uppercase tracking-widest text-foreground">Grand Total</span>
                                            <span className="text-base font-semibold tracking-tight text-emerald-600 sm:text-lg">{fmt(form.grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/50 bg-slate-50/50 p-3 sm:gap-3 sm:p-4 lg:p-6">
                                <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-10 rounded-xl sm:h-11 px-6 font-bold hover:bg-white text-muted-foreground bg-white">Batal</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-10 rounded-xl bg-emerald-600 px-5 sm:h-11 sm:px-10 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-bold tracking-tight uppercase disabled:opacity-50"
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
                        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 shadow-xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="font-semibold text-xs sm:text-sm uppercase tracking-tight">{toast.msg}</span>
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
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBankForm(false)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl overflow-hidden flex flex-col
                                ${isMobile ? "w-full rounded-t-2xl mt-auto max-h-[90vh]" : "rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />}
                            <div className={`${isMobile ? 'p-4 pb-6 overflow-y-auto sm:p-6 sm:pb-8' : ''}`}>
                                <h3 className="mb-4 text-base font-semibold uppercase tracking-tight sm:mb-6 sm:text-lg">Tambah Rekening Bank</h3>
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nama Bank</label>
                                        <input value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="Contoh: Bank Central Asia (BCA)" className="w-full h-10 px-3 rounded-lg sm:h-11 sm:px-4 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nomor Rekening</label>
                                        <input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="000-000-0000" className="w-full h-10 px-3 rounded-lg sm:h-11 sm:px-4 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Atas Nama</label>
                                        <input value={bankForm.accountHolder} onChange={e => setBankForm({ ...bankForm, accountHolder: e.target.value })} placeholder="PT. Axon Ecosystem" className="w-full h-10 px-3 rounded-lg sm:h-11 sm:px-4 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Cabang (Opsional)</label>
                                        <input value={bankForm.branch} onChange={e => setBankForm({ ...bankForm, branch: e.target.value })} placeholder="Pekayon, Bekasi" className="w-full h-10 px-3 rounded-lg sm:h-11 sm:px-4 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Hubungkan ke Akun Buku Besar (COA) <span className="text-rose-500">*</span></label>
                                        <select
                                            value={bankForm.coaId}
                                            onChange={e => setBankForm({ ...bankForm, coaId: e.target.value })}
                                            className="w-full h-10 px-3 rounded-lg sm:h-11 sm:px-4 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 shadow-inner"
                                        >
                                            <option value="">Pilih Akun Buku Besar...</option>
                                            {coas.filter(c => c.name.toLowerCase().includes('bank') || c.name.toLowerCase().includes('kas')).map(c => (
                                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[9px] text-muted-foreground mt-1 ml-1 leading-tight italic">Pilih akun asset (Kas/Bank) yang sesuai agar pencatatan keuangan akurat.</p>
                                    </div>
                                    <div className="flex gap-2 pt-3 sm:pt-4">
                                        <Button variant="outline" className="h-10 flex-1 rounded-xl text-xs font-semibold sm:h-11 sm:text-sm" onClick={() => setShowBankForm(false)}>Batal</Button>
                                        <Button className="h-10 flex-1 rounded-xl bg-emerald-600 text-xs font-semibold hover:bg-emerald-700 sm:h-11 sm:text-sm" onClick={async () => {
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
                                                setBankForm({ bankName: '', accountNumber: '', accountHolder: '', branch: '', coaId: '' });
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
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setPostingInvoice(null)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl flex flex-col 
                                ${isMobile ? "w-full rounded-t-2xl mt-auto border-t-4 border-indigo-600 px-4 pb-6 pt-4" : "rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md border-t-8 border-indigo-600"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />}
                            <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-11 sm:w-11">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold uppercase tracking-tight sm:text-lg">Konfirmasi Posting</h3>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Invoice {postingInvoice.number}</p>
                                </div>
                            </div>

                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:mb-6 sm:p-4">
                                <p className="text-xs font-semibold leading-relaxed text-amber-800 sm:text-sm">
                                    <span className="block mb-1 font-bold">⚠️ PERINGATAN!</span>
                                    Posting invoice akan secara otomatis mencatat transaksi ke dalam **Buku Besar (General Ledger)**. Tindakan ini tidak dapat dibatalkan. Pastikan semua data sudah benar.
                                </p>
                            </div>

                            <div className="mt-6 flex gap-2 sm:mt-8 sm:gap-3">
                                <Button variant="outline" className="h-10 flex-1 rounded-xl text-xs font-semibold sm:h-11 sm:text-sm" onClick={() => setPostingInvoice(null)}>Batal</Button>
                                <Button
                                    className="h-10 flex-1 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 sm:h-11 sm:text-sm"
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
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setPaymentConfirm(null)} />
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white relative z-10 shadow-2xl flex flex-col 
                                ${isMobile ? "w-full rounded-t-2xl mt-auto border-t-4 border-emerald-600 px-4 pb-6 pt-4" : "rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md border-t-8 border-emerald-600"}`}
                        >
                            {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />}
                            <div className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-11 sm:w-11">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold uppercase tracking-tight sm:text-lg">Konfirmasi Pembayaran</h3>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Invoice {paymentConfirm.invoice.number}</p>
                                </div>
                            </div>

                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:mb-6 sm:p-4">
                                <p className="text-xs font-semibold leading-relaxed text-amber-800 sm:text-sm">
                                    <span className="block mb-1 font-bold">⚠️ INFO PEMBAYARAN</span>
                                    Konfirmasi pembayaran akan mencatat penerimaan uang ke kas/bank dan mengurangi piutang. Anda dapat mengedit nominal jika pelanggan membayar cicilan.
                                </p>
                            </div>

                            <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pilih Rekening Penerima <span className="text-rose-500">*</span></label>
                                    <select
                                        className="w-full h-10 rounded-xl sm:h-11 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                        value={paymentConfirm.bankAccountId}
                                        onChange={(e) => setPaymentConfirm({ ...paymentConfirm, bankAccountId: e.target.value })}
                                    >
                                        <option value="">Pilih Bank...</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.accountHolder})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nominal Pembayaran <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">Rp</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full h-10 pl-10 rounded-xl sm:h-11 sm:pl-12 bg-slate-50 border-none font-semibold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600/20 px-4"
                                            value={paymentConfirm.amount}
                                            onChange={(e) => setPaymentConfirm({ ...paymentConfirm, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                    <p className="ml-1 text-[9px] text-muted-foreground sm:text-[10px]">Total Tagihan: {fmt(paymentConfirm.invoice.grandTotal)}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2 sm:mt-8 sm:gap-3">
                                <Button variant="outline" className="h-10 flex-1 rounded-xl text-xs font-semibold sm:h-11 sm:text-sm" onClick={() => setPaymentConfirm(null)}>Batal</Button>
                                <Button
                                    className="h-10 flex-1 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 sm:h-11 sm:text-sm"
                                    disabled={!paymentConfirm.bankAccountId}
                                    onClick={() => {
                                        handleAction(paymentConfirm.invoice.id, 'pay', { 
                                            bankAccountId: paymentConfirm.bankAccountId,
                                            amount: paymentConfirm.amount
                                        });
                                        setPaymentConfirm(null);
                                    }}
                                >
                                    Konfirmasi Pembayaran
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </FinancePageShell>
    )
}
