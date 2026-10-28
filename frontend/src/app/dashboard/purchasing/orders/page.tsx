"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    FileText,
    Search,
    Edit2,
    Trash2,
    Calendar,
    Printer,
    CheckCircle2,
    X,
    Receipt,
    ChevronDown,
} from "lucide-react"
import Link from "next/link"
import PurchaseOrderPDFModal from "./PurchaseOrderPDFModal"

interface PurchaseOrder {
    id: string
    number: string
    date: string
    status: string
    paymentType?: string
    grandTotal: number
    vendor: {
        code: string
        name: string
    }
    businessCategoryId: string | null
    businessCategory?: {
        id: string
        name: string
    }
    items: any[]
    receives: any[]
    surveyExpenses: any[]
    invoices: any[]
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [companyInfo, setCompanyInfo] = useState<any>({})
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [showPdf, setShowPdf] = useState(false)
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [businessCategories, setBusinessCategories] = useState<any[]>([])
    const [filterBusinessCategory, setFilterBusinessCategory] = useState("ALL")

    // Modal state for Stock-In confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean
        poId: string
        newStatus: string
        warehouseId: string
    } | null>(null)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const [poRes, wRes, bcRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`),
            ])
            const poData = await poRes.json()
            const wData = await wRes.json()
            const bcData = await bcRes.json()
            setOrders(Array.isArray(poData) ? poData : [])
            setWarehouses(Array.isArray(wData) ? wData.filter((w: any) => w.isActive) : [])
            setBusinessCategories(Array.isArray(bcData) ? bcData : [])
        } catch (e) {
            console.error("Failed to fetch data")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
        // Fetch company info for PDF
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/company`)
            .then((res) => res.json())
            .then((data) => setCompanyInfo(data))
            .catch((e) => console.error(e))
    }, [])

    const handlePrint = async (id: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`)
            const data = await res.json()
            setSelectedOrder(data)
            setShowPdf(true)
        } catch (e) {
            console.error("Failed to load order for PDF", e)
        }
    }

    const handleStatusUpdate = async (
        id: string,
        newStatus: string,
        createGRN: boolean = false,
        warehouseId?: string
    ) => {
        if (newStatus === "SENT" && !createGRN) {
            setConfirmModal({ isOpen: true, poId: id, newStatus, warehouseId: "" })
            return
        }

        if (newStatus === "SENT" && createGRN && !warehouseId) {
            alert("Silakan pilih gudang tujuan terlebih dahulu")
            return
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, createGRN, warehouseId }),
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || "Failed to update status")
            }

            fetchOrders()
            setConfirmModal(null)
        } catch (e: any) {
            console.error(e)
            alert(e.message)
            // Re-fetch to ensure UI is in sync with backend status
            fetchOrders()
            setConfirmModal(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Purchase Order?")) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`, { method: "DELETE" })
            fetchOrders()
        } catch (e) {
            console.error(e)
        }
    }

    const filteredOrders = orders.filter((o) => {
        const matchesSearch =
            o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory =
            filterBusinessCategory === "ALL" || o.businessCategoryId === filterBusinessCategory
        return matchesSearch && matchesCategory
    })

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "DRAFT":
                return "border-border bg-muted text-muted-foreground"
            case "APPROVED":
                return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
            case "SENT":
                return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400"
            case "PARTIALLY_RECEIVED":
                return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
            case "COMPLETED":
                return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            case "CANCELLED":
                return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
            default:
                return "border-border bg-muted text-muted-foreground"
        }
    }

    const getBillStyle = (status: string) => {
        switch (status) {
            case "PAID":
                return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            case "POSTED":
                return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400"
            case "UNBILLED":
                return "border-border bg-muted text-muted-foreground"
            default:
                return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
        }
    }

    const statusOptions = (
        <>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT</option>
            <option value="PARTIALLY_RECEIVED">PART_RECEIVED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
        </>
    )

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Purchase Orders</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Procurement orders to vendors</p>
                    </div>
                    <Link
                        href="/dashboard/purchasing/orders/new"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <Plus size={16} />
                        New PO
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
                            placeholder="Cari PO atau Vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={filterBusinessCategory}
                        onChange={(e) => setFilterBusinessCategory(e.target.value)}
                        className={`${inputClass} cursor-pointer sm:w-52`}
                    >
                        <option value="ALL">All Business Units</option>
                        {businessCategories.map((bc) => (
                            <option key={bc.id} value={bc.id}>
                                {bc.name}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                    </span>
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                    <th className="px-3 py-2.5 font-medium">PO Number</th>
                                    <th className="px-3 py-2.5 font-medium">Vendor</th>
                                    <th className="px-3 py-2.5 font-medium">Date</th>
                                    <th className="w-64 px-3 py-2.5 font-medium">Items</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                                    <th className="px-3 py-2.5 text-right font-medium">Expenses</th>
                                    <th className="px-3 py-2.5 text-center font-medium">Receive Bills</th>
                                    <th className="px-3 py-2.5 font-medium">Status PO</th>
                                    <th className="w-24 px-3 py-2.5 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                <FileText size={22} />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">
                                                No Purchase Orders found
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Try adjusting your search or filter.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((po) => {
                                        const totalExpense =
                                            po.surveyExpenses?.reduce((acc, exp) => acc + exp.amount, 0) || 0
                                        const billStatus =
                                            po.invoices && po.invoices.length > 0
                                                ? po.invoices[0].status
                                                : "UNBILLED"
                                        return (
                                            <tr key={po.id} className="group transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-mono text-xs font-medium text-primary">
                                                            {po.number}
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                                    po.paymentType === "CASH"
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                                        : "border-border bg-muted text-muted-foreground"
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                                        po.paymentType === "CASH"
                                                                            ? "bg-emerald-500"
                                                                            : "bg-muted-foreground/50"
                                                                    }`}
                                                                />
                                                                {po.paymentType === "CASH" ? "Cash" : "Tempo"}
                                                            </span>
                                                            {po.businessCategory && (
                                                                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                    {po.businessCategory.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground">
                                                            {po.vendor?.name}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {po.vendor?.code}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Calendar size={13} />
                                                        {new Date(po.date).toLocaleDateString("id-ID", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                            {po.items?.length || 0} Items
                                                        </span>
                                                        {po.items && po.items.length > 0 && (
                                                            <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                                                                {po.items
                                                                    .map((i: any) => i.productName || i.description)
                                                                    .join(", ")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span className="text-sm font-medium tabular-nums text-foreground">
                                                        Rp {po.grandTotal?.toLocaleString("id-ID")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span
                                                        className={`text-sm tabular-nums ${
                                                            totalExpense > 0
                                                                ? "font-medium text-amber-600 dark:text-amber-400"
                                                                : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        Rp {totalExpense.toLocaleString("id-ID")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getBillStyle(
                                                            billStatus
                                                        )}`}
                                                    >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                                        {billStatus}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div
                                                        className={`relative inline-flex items-center rounded-full border ${getStatusStyle(
                                                            po.status
                                                        )}`}
                                                    >
                                                        <span className="ml-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                                        <select
                                                            value={po.status}
                                                            onChange={(e) =>
                                                                handleStatusUpdate(po.id, e.target.value)
                                                            }
                                                            className="cursor-pointer appearance-none bg-transparent py-0.5 pl-1.5 pr-5 text-[11px] font-medium text-current outline-none"
                                                        >
                                                            {statusOptions}
                                                        </select>
                                                        <ChevronDown
                                                            size={11}
                                                            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Link
                                                            href={`/dashboard/purchasing/bills/new?poId=${po.id}`}
                                                            title="Create Bill"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Receipt size={15} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handlePrint(po.id)}
                                                            title="Print PDF"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Printer size={15} />
                                                        </button>
                                                        <Link
                                                            href={`/dashboard/purchasing/orders/${po.id}/edit`}
                                                            title="Edit PO"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Edit2 size={15} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(po.id)}
                                                            title="Delete PO"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                    {loading ? (
                        <div className="flex h-60 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <FileText size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">No Purchase Orders found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Try adjusting your search or filter.
                            </p>
                        </div>
                    ) : (
                        filteredOrders.map((po) => {
                            const totalExpense =
                                po.surveyExpenses?.reduce((acc, exp) => acc + exp.amount, 0) || 0
                            const billStatus = (po.invoices?.length || 0) > 0 ? po.invoices[0].status : "UNBILLED"
                            return (
                                <motion.div
                                    key={po.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl border border-border bg-card p-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-mono text-xs font-medium text-primary">
                                                {po.number}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Calendar size={11} />
                                                {new Date(po.date).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                        <div
                                            className={`relative inline-flex flex-shrink-0 items-center rounded-full border ${getStatusStyle(
                                                po.status
                                            )}`}
                                        >
                                            <span className="ml-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                            <select
                                                value={po.status}
                                                onChange={(e) => handleStatusUpdate(po.id, e.target.value)}
                                                className="cursor-pointer appearance-none bg-transparent py-0.5 pl-1.5 pr-5 text-[11px] font-medium text-current outline-none"
                                            >
                                                {statusOptions}
                                            </select>
                                            <ChevronDown
                                                size={11}
                                                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-1">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                po.paymentType === "CASH"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                    : "border-border bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    po.paymentType === "CASH"
                                                        ? "bg-emerald-500"
                                                        : "bg-muted-foreground/50"
                                                }`}
                                            />
                                            {po.paymentType === "CASH" ? "Cash" : "Tempo"}
                                        </span>
                                        {po.businessCategory && (
                                            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {po.businessCategory.name}
                                            </span>
                                        )}
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getBillStyle(
                                                billStatus
                                            )}`}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                            {billStatus}
                                        </span>
                                    </div>

                                    <div className="mt-2 border-t border-border pt-2">
                                        <p className="text-xs font-medium text-muted-foreground">Vendor</p>
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {po.vendor?.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                            <span>{po.items?.length || 0} items</span>
                                            <span>
                                                Expenses{" "}
                                                <span
                                                    className={
                                                        totalExpense > 0
                                                            ? "font-medium text-amber-600 dark:text-amber-400"
                                                            : ""
                                                    }
                                                >
                                                    Rp {totalExpense.toLocaleString("id-ID")}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground">Grand Total</p>
                                            <p className="text-sm font-medium tabular-nums text-foreground">
                                                Rp {po.grandTotal?.toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/dashboard/purchasing/bills/new?poId=${po.id}`}
                                                title="Create Bill"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Receipt size={15} />
                                            </Link>
                                            <button
                                                onClick={() => handlePrint(po.id)}
                                                title="Print PDF"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Printer size={15} />
                                            </button>
                                            <Link
                                                href={`/dashboard/purchasing/orders/${po.id}/edit`}
                                                title="Edit PO"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit2 size={15} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(po.id)}
                                                title="Delete PO"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>

                <AnimatePresence>
                    {confirmModal?.isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    setConfirmModal(null)
                                    fetchOrders()
                                }}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl"
                            >
                                <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">
                                                Otomatisasi Stock In
                                            </h2>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                Status diubah menjadi SENT
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setConfirmModal(null)
                                            fetchOrders()
                                        }}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                        <X size={16} />
                                    </button>
                                </header>

                                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Status diubah menjadi{" "}
                                        <span className="font-medium text-foreground">SENT</span>. Apakah Anda
                                        ingin sistem membuatkan dokumen{" "}
                                        <span className="font-medium text-foreground">Stock In</span> secara
                                        otomatis?
                                    </p>

                                    <div className="mt-4 space-y-1.5">
                                        <label className="block text-xs font-medium text-muted-foreground">
                                            Pilih Gudang Tujuan{" "}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={`${inputClass} cursor-pointer`}
                                            value={confirmModal.warehouseId}
                                            onChange={(e) =>
                                                setConfirmModal({
                                                    ...confirmModal,
                                                    warehouseId: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="">-- Pilih Gudang --</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.code} - {w.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
                                    <span className="hidden text-[10px] text-muted-foreground sm:inline">
                                        Axon Ecosystem v1.0
                                    </span>
                                    <div className="flex w-full justify-end gap-2 sm:w-auto">
                                        <button
                                            onClick={() =>
                                                handleStatusUpdate(
                                                    confirmModal.poId,
                                                    confirmModal.newStatus,
                                                    false
                                                )
                                            }
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                        >
                                            Hanya Ubah Status
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleStatusUpdate(
                                                    confirmModal.poId,
                                                    confirmModal.newStatus,
                                                    true,
                                                    confirmModal.warehouseId
                                                )
                                            }
                                            disabled={!confirmModal.warehouseId}
                                            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            Ya, Buat Otomatis
                                        </button>
                                    </div>
                                </footer>
                            </motion.div>
                        </div>
                    )}

                    {showPdf && selectedOrder && (
                        <PurchaseOrderPDFModal
                            order={selectedOrder}
                            company={companyInfo}
                            onClose={() => setShowPdf(false)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
