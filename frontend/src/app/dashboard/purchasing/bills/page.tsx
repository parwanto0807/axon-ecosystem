"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Plus,
    Receipt,
    Search,
    FileText,
    Calendar,
    Loader2,
    PlayCircle,
    Edit,
    Eye,
    CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import EditVendorBillModal from "@/components/purchasing/EditVendorBillModal"
import VendorBillDetailModal from "@/components/purchasing/VendorBillDetailModal"
import VendorBillPaymentModal from "@/components/purchasing/VendorBillPaymentModal"

interface PurchaseInvoice {
    id: string;
    number: string;
    date: string;
    status: string;
    grandTotal: number;
    vendor: { name: string; };
    purchaseOrder?: { number: string; };
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const statusStyles: Record<string, { pill: string; dot: string }> = {
    DRAFT: {
        pill: "border-border bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/50",
    },
    POSTED: {
        pill: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
        dot: "bg-amber-500",
    },
    PAID: {
        pill: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
        dot: "bg-emerald-500",
    },
    CANCELLED: {
        pill: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400",
        dot: "bg-rose-500",
    },
}

function StatusPill({ status }: { status: string }) {
    const style = statusStyles[status] ?? {
        pill: "border-border bg-muted text-muted-foreground",
        dot: "bg-muted-foreground/50",
    }
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {status}
        </span>
    )
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

export default function VendorBillsPage() {
    const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [postingId, setPostingId] = useState<string | null>(null)
    const [editingInvoice, setEditingInvoice] = useState<any>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [viewingInvoice, setViewingInvoice] = useState<any>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [payingInvoice, setPayingInvoice] = useState<any>(null)

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices`)
            const data = await res.json()
            setInvoices(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const handlePost = async (id: string) => {
        if (!confirm('Are you sure you want to POST this Vendor Bill? This will officially create an Accounts Payable record in the General Ledger and CANNOT be undone.')) return

        setPostingId(id)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices/${id}/post`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Failed to post invoice')
            fetchInvoices()
        } catch (e) {
            alert('Failed to post invoice. Ensure System Accounts (ACCOUNTS_PAYABLE, PURCHASE_EXPENSE) are configured.')
            console.error(e)
        } finally {
            setPostingId(null)
        }
    }

    const filteredInvoices = invoices.filter(i =>
        i.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openDetail = (invoice: PurchaseInvoice) => {
        setViewingInvoice(invoice)
        setIsDetailModalOpen(true)
    }

    const openEdit = (invoice: PurchaseInvoice) => {
        setEditingInvoice(invoice)
        setIsEditModalOpen(true)
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Vendor Bills</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Supplier invoices & Accounts Payable</p>
                    </div>
                    <Link
                        href="/dashboard/purchasing/bills/new"
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <Plus size={16} className="mr-1.5" />
                        New Bill
                    </Link>
                </header>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Cari Bills atau Vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredInvoices.length} {filteredInvoices.length === 1 ? "bill" : "bills"}
                    </span>
                </div>

                {/* Desktop Table */}
                <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                    <th className="px-3 py-2.5 font-medium">Bill Number</th>
                                    <th className="px-3 py-2.5 font-medium">Date</th>
                                    <th className="px-3 py-2.5 font-medium">Vendor</th>
                                    <th className="px-3 py-2.5 font-medium">Ref PO</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Amount Due</th>
                                    <th className="px-3 py-2.5 font-medium">Status</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-20">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                                <p className="text-xs text-muted-foreground">Loading Bills...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-20">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <Receipt size={22} />
                                                </div>
                                                <p className="text-sm font-medium text-foreground">No Bills found</p>
                                                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                                    Try adjusting your search to find what you are looking for.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="group transition-colors hover:bg-muted/30">
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDetail(inv)}
                                                        title="View detail"
                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <span className="font-mono text-sm font-medium text-foreground">{inv.number}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar size={13} />
                                                    <span className="text-[13px]">{formatDate(inv.date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className="text-sm font-medium text-foreground">{inv.vendor?.name}</span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {inv.purchaseOrder ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                        <FileText size={11} />
                                                        {inv.purchaseOrder.number}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <span
                                                    className={`font-mono text-sm tabular-nums ${
                                                        inv.status === 'PAID'
                                                            ? 'text-muted-foreground line-through'
                                                            : 'font-medium text-foreground'
                                                    }`}
                                                >
                                                    Rp {inv.grandTotal?.toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <StatusPill status={inv.status} />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {inv.status === 'DRAFT' && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(inv)}
                                                                title="Edit Bill"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePost(inv.id)}
                                                                disabled={postingId === inv.id}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                                            >
                                                                {postingId === inv.id ? (
                                                                    <Loader2 size={13} className="animate-spin" />
                                                                ) : (
                                                                    <PlayCircle size={13} />
                                                                )}
                                                                Post GL
                                                            </button>
                                                        </>
                                                    )}
                                                    {inv.status === 'POSTED' && (
                                                        <button
                                                            onClick={() => setPayingInvoice(inv)}
                                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                                                        >
                                                            <CheckCircle2 size={13} />
                                                            Mark as Paid
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card List */}
                <div className="space-y-3 md:hidden">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
                        ))
                    ) : filteredInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Receipt size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">No Bills found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Try adjusting your search to find what you are looking for.
                            </p>
                        </div>
                    ) : (
                        filteredInvoices.map((inv) => (
                            <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-border bg-card p-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-sm font-medium text-foreground">{inv.number}</p>
                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <Calendar size={11} />
                                            {formatDate(inv.date)}
                                        </p>
                                    </div>
                                    <StatusPill status={inv.status} />
                                </div>

                                <div className="mt-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Vendor</p>
                                    <p className="truncate text-sm font-medium text-foreground">{inv.vendor?.name}</p>
                                    {inv.purchaseOrder && (
                                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                                            <FileText size={11} />
                                            {inv.purchaseOrder.number}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Amount Due</p>
                                        <p
                                            className={`font-mono text-sm tabular-nums ${
                                                inv.status === 'PAID'
                                                    ? 'text-muted-foreground line-through'
                                                    : 'font-medium text-foreground'
                                            }`}
                                        >
                                            Rp {inv.grandTotal?.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openDetail(inv)}
                                            title="Detail"
                                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        {inv.status === 'DRAFT' && (
                                            <>
                                                <button
                                                    onClick={() => openEdit(inv)}
                                                    title="Edit Bill"
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handlePost(inv.id)}
                                                    disabled={postingId === inv.id}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                                >
                                                    {postingId === inv.id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <PlayCircle size={13} />
                                                    )}
                                                    Post GL
                                                </button>
                                            </>
                                        )}
                                        {inv.status === 'POSTED' && (
                                            <button
                                                onClick={() => setPayingInvoice(inv)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                                            >
                                                <CheckCircle2 size={13} />
                                                Mark as Paid
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            <EditVendorBillModal
                invoice={editingInvoice}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingInvoice(null)
                }}
                onSuccess={() => {
                    fetchInvoices()
                }}
            />

            <VendorBillDetailModal
                invoice={viewingInvoice}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setViewingInvoice(null)
                }}
            />

            {payingInvoice && (
                <VendorBillPaymentModal
                    invoice={payingInvoice}
                    onClose={() => setPayingInvoice(null)}
                    onSuccess={() => {
                        setPayingInvoice(null)
                        fetchInvoices()
                    }}
                />
            )}
        </div>
    )
}
