"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
    FileText, Search, RefreshCw, Download, Filter,
    Printer, Eye, CheckCircle2, Clock, AlertTriangle,
    ChevronDown, ChevronUp, ArrowUpDown,
    Layers, Receipt, Calendar, Building2,
    X, CreditCard
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { useSession } from "next-auth/react"
import SalesMonitoringPDFModal from "./SalesMonitoringPDFModal"
import {
    generateSalesMonitoringPDF,
    SummaryPDF
} from "./SalesMonitoringPDF"

export interface RecapRow {
    id: string
    customerId: string
    customer: { id: string; code: string; name: string; company?: string | null } | null
    quotationNumber: string | null
    quotationId: string | null
    quotationSubject?: string | null
    soSubject?: string | null
    soNumber: string
    poNumber: string | null
    soDate: string
    soStatus: string
    poTotal: number
    invoices: {
        id: string
        number: string
        date: string
        dueDate?: string | null
        status: string
        grandTotal: number
        paid: number
        payments?: {
            id: string
            date: string
            amount: number
            paymentMethod: string
            status: string
            notes?: string | null
            proofOfPayment?: string | null
        }[]
    }[]
    invoicedTotal: number
    paidTotal: number
    unbilledTotal: number
    unpaidTotal: number
    billingStatus: string
}

export interface QuotationOnly {
    id: string
    number: string
    date: string
    status: string
    subject?: string | null
    grandTotal: number
    customer: { id: string; code: string; name: string } | null
}

const STATUS_META: Record<string, { ID: string; EN: string; color: string; badge: string }> = {
    PO_BELUM_TAGIH: {
        ID: "PO Belum Ditagih",
        EN: "PO Not Yet Billed",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        badge: "bg-amber-500"
    },
    SEBAGIAN_DITAGIH: {
        ID: "Sebagian Ditagih",
        EN: "Partially Billed",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
        badge: "bg-indigo-500"
    },
    SUDAH_TAGIH_BELUM_BAYAR: {
        ID: "Sudah Ditagih, Belum Bayar",
        EN: "Billed, Unpaid",
        color: "bg-orange-50 text-orange-700 border-orange-200",
        badge: "bg-orange-500"
    },
    SEBAGIAN_DIBAYAR: {
        ID: "Sebagian Dibayar",
        EN: "Partially Paid",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        badge: "bg-blue-500"
    },
    LUNAS: {
        ID: "Lunas",
        EN: "Paid Off",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badge: "bg-emerald-500"
    },
    CANCELLED: {
        ID: "Batal",
        EN: "Cancelled",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        badge: "bg-rose-500"
    },
}

const fmt = (n: number) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`
const fmtDate = (d: string) => {
    try {
        if (!d) return "-"
        return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
        return "-"
    }
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

export default function SalesBillingRecapPage() {
    const { lang } = useLanguage()
    const { data: session } = useSession()
    const ID = lang === "ID"

    const [customers, setCustomers] = useState<{ id: string; code: string; name: string; company?: string | null }[]>([])
    const [customerId, setCustomerId] = useState("ALL")
    const [customerSearch, setCustomerSearch] = useState("")
    const [status, setStatus] = useState("ALL")
    const [search, setSearch] = useState("")
    const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'PO_DESC' | 'UNPAID_DESC' | 'UNBILLED_DESC'>('DATE_DESC')
    const [rows, setRows] = useState<RecapRow[]>([])
    const [quoOnly, setQuoOnly] = useState<QuotationOnly[]>([])
    const [summary, setSummary] = useState<SummaryPDF>({ poTotal: 0, invoicedTotal: 0, paidTotal: 0, unbilledTotal: 0, unpaidTotal: 0, count: 0 })
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState<string>("")
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
    const [paymentDetailRow, setPaymentDetailRow] = useState<RecapRow | null>(null)
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
    const [isPrintingDirect, setIsPrintingDirect] = useState(false)
    const [isDownloadingDirect, setIsDownloadingDirect] = useState(false)
    const [showQuoSection, setShowQuoSection] = useState(true)

    // Load Company Info for PDF letterhead
    const loadCompany = useCallback(async () => {
        try {
            const userRole = (session?.user as any)?.role || 'USER'
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, {
                headers: { 'x-user-role': userRole }
            })
            if (r.ok) {
                const data = await r.json()
                setCompany(data)
            }
        } catch {
            // fallback silently
        }
    }, [session])

    const loadCustomers = useCallback(async () => {
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`)
            const data = await r.json()
            setCustomers(Array.isArray(data) ? data : data.customers || [])
        } catch {
            /* ignore */
        }
    }, [])

    const loadRecap = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (customerId !== "ALL") params.append("customerId", customerId)
            if (status !== "ALL") params.append("status", status)
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sales-billing-recap?${params.toString()}`)
            const data = await r.json()
            setRows(data.rows || [])
            setQuoOnly(data.quotationsWithoutSO || [])
            setSummary(data.summary || { poTotal: 0, invoicedTotal: 0, paidTotal: 0, unbilledTotal: 0, unpaidTotal: 0, count: 0 })
            setLastRefresh(new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        } catch {
            /* ignore */
        }
        setLoading(false)
    }, [customerId, status])

    useEffect(() => {
        loadCustomers()
        loadCompany()
    }, [loadCustomers, loadCompany])

    useEffect(() => {
        loadRecap()
    }, [loadRecap])

    const customerOptions = useMemo(() => {
        const q = customerSearch.toLowerCase().trim()
        if (!q) return customers
        return customers.filter(c => `${c.code} ${c.name} ${c.company || ""}`.toLowerCase().includes(q))
    }, [customers, customerSearch])

    const selectedCustomer = useMemo(() => {
        return customers.find(c => c.id === customerId) || null
    }, [customers, customerId])

    // Filter and Sort rows
    const filteredRows = useMemo(() => {
        const q = search.toLowerCase().trim()
        let res = rows

        if (q) {
            res = res.filter(r =>
                r.soNumber.toLowerCase().includes(q) ||
                (r.poNumber || "").toLowerCase().includes(q) ||
                (r.quotationNumber || "").toLowerCase().includes(q) ||
                (r.quotationSubject || "").toLowerCase().includes(q) ||
                (r.soSubject || "").toLowerCase().includes(q) ||
                (r.customer?.name || "").toLowerCase().includes(q) ||
                (r.customer?.code || "").toLowerCase().includes(q) ||
                r.invoices.some(inv => inv.number.toLowerCase().includes(q))
            )
        }

        // Sorting
        return [...res].sort((a, b) => {
            if (sortBy === 'DATE_DESC') return new Date(b.soDate).getTime() - new Date(a.soDate).getTime()
            if (sortBy === 'DATE_ASC') return new Date(a.soDate).getTime() - new Date(b.soDate).getTime()
            if (sortBy === 'PO_DESC') return b.poTotal - a.poTotal
            if (sortBy === 'UNPAID_DESC') return b.unpaidTotal - a.unpaidTotal
            if (sortBy === 'UNBILLED_DESC') return b.unbilledTotal - a.unbilledTotal
            return 0
        })
    }, [rows, search, sortBy])

    // Status counts for badge tabs
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: rows.length }
        rows.forEach(r => {
            counts[r.billingStatus] = (counts[r.billingStatus] || 0) + 1
        })
        return counts
    }, [rows])

    // Status label helper
    const currentStatusLabel = useMemo(() => {
        if (status === 'ALL') return ID ? 'Semua Status' : 'All Status'
        return ID ? STATUS_META[status]?.ID || status : STATUS_META[status]?.EN || status
    }, [status, ID])

    // Export CSV handler
    const exportCSV = () => {
        const header = [
            "Customer", "Kode Customer", "No. Penawaran", "Perihal Penawaran / SO", "No. SO", "No. PO",
            "Tgl SO", "Nilai PO (IDR)", "No. Invoice", "Nilai Ditagih (IDR)",
            "Sudah Dibayar (IDR)", "PO Belum Ditagih (IDR)", "Piutang Belum Dibayar (IDR)", "Status"
        ]
        const lines = filteredRows.map(r => [
            `"${(r.customer?.name || "-").replace(/"/g, '""')}"`,
            `"${r.customer?.code || "-"}"`,
            `"${r.quotationNumber || "-"}"`,
            `"${(r.quotationSubject || r.soSubject || "-").replace(/"/g, '""')}"`,
            `"${r.soNumber}"`,
            `"${(r.poNumber || "-").replace(/"/g, '""')}"`,
            fmtDate(r.soDate),
            r.poTotal,
            `"${r.invoices.map(i => i.number).join("; ") || "-"}"`,
            r.invoicedTotal,
            r.paidTotal,
            r.unbilledTotal,
            r.unpaidTotal,
            `"${STATUS_META[r.billingStatus]?.ID || r.billingStatus}"`,
        ].join(","))

        const blob = new Blob([["\uFEFF" + header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `rekap-monitoring-sales-${selectedCustomer?.code || "semua"}-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Direct Print PDF using Pure jsPDF
    const handleDirectPrintPDF = async () => {
        setIsPrintingDirect(true)
        try {
            await generateSalesMonitoringPDF({
                rows: filteredRows,
                summary,
                quotationsWithoutSO: quoOnly,
                selectedCustomer,
                selectedStatus: status,
                statusLabel: currentStatusLabel,
                company,
                userName: session?.user?.name || 'Administrator',
                mode: 'print'
            })
        } catch (e) {
            console.error("Direct print failed:", e)
        } finally {
            setIsPrintingDirect(false)
        }
    }

    // Direct Download PDF using Pure jsPDF
    const handleDirectDownloadPDF = async () => {
        setIsDownloadingDirect(true)
        try {
            await generateSalesMonitoringPDF({
                rows: filteredRows,
                summary,
                quotationsWithoutSO: quoOnly,
                selectedCustomer,
                selectedStatus: status,
                statusLabel: currentStatusLabel,
                company,
                userName: session?.user?.name || 'Administrator',
                mode: 'download'
            })
        } catch (e) {
            console.error("Direct download failed:", e)
        } finally {
            setIsDownloadingDirect(false)
        }
    }

    // Realization Percentages
    const invoicedPercent = summary.poTotal > 0 ? Math.min(100, Math.round((summary.invoicedTotal / summary.poTotal) * 100)) : 0
    const collectionPercent = summary.invoicedTotal > 0 ? Math.min(100, Math.round((summary.paidTotal / summary.invoicedTotal) * 100)) : 0
    const unbilledPercent = summary.poTotal > 0 ? Math.min(100, Math.round((summary.unbilledTotal / summary.poTotal) * 100)) : 0

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                {/* Header */}
                <header className="mb-5 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>Enterprise Sales Hub</span>
                            {lastRefresh && (
                                <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span>Diperbarui {lastRefresh}</span>
                                </>
                            )}
                        </div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                            <FileText size={18} className="text-muted-foreground" />
                            {ID ? "Monitoring & Rekap Penjualan" : "Sales Order & Billing Recap"}
                        </h1>
                        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                            {ID
                                ? "Pelacakan terintegrasi real-time siklus pesanan penjualan (SO/PO), realisasi penagihan faktur, arus kas pembayaran, dan piutang tertunggak."
                                : "Real-time unified tracking for sales orders (SO/PO), invoice billing realization, payment cash-in, and unpaid receivables."}
                        </p>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { loadRecap(); loadCustomers() }}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportCSV}
                            disabled={filteredRows.length === 0}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Download size={14} className="mr-1.5" /> CSV
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPdfModalOpen(true)}
                            disabled={filteredRows.length === 0}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Eye size={14} className="mr-1.5" /> Pratinjau PDF
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDirectDownloadPDF}
                            disabled={filteredRows.length === 0 || isDownloadingDirect}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            {isDownloadingDirect ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                            Unduh PDF
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleDirectPrintPDF}
                            disabled={filteredRows.length === 0 || isPrintingDirect}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            {isPrintingDirect ? <RefreshCw size={14} className="mr-1.5 animate-spin" /> : <Printer size={14} className="mr-1.5" />}
                            Cetak PDF (jsPDF)
                        </Button>
                    </div>
                </header>

                {/* KPI Metric Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {/* 1. Nilai Total PO / SO */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {ID ? "Total Nilai PO / SO" : "Total PO / SO Value"}
                            </span>
                            <Layers size={14} className="shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
                            {loading ? "..." : fmt(summary.poTotal)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{summary.count} Dokumen Pesanan</span>
                            <span>100% Kontrak</span>
                        </div>
                    </div>

                    {/* 2. Sudah Ditagih (Invoiced) */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {ID ? "Sudah Ditagih (Invoiced)" : "Invoiced Value"}
                            </span>
                            <Receipt size={14} className="shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
                            {loading ? "..." : fmt(summary.invoicedTotal)}
                        </p>
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Realisasi Penagihan</span>
                                <span className="font-medium text-foreground">{invoicedPercent}%</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${invoicedPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Sudah Dibayar (Cash In) */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {ID ? "Kas Diterima (Paid)" : "Cash Received (Paid)"}
                            </span>
                            <CheckCircle2 size={14} className="shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
                            {loading ? "..." : fmt(summary.paidTotal)}
                        </p>
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Efektivitas Kas (Collection)</span>
                                <span className="font-medium text-foreground">{collectionPercent}%</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${collectionPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* 4. PO Belum Ditagih */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {ID ? "PO Belum Ditagih" : "Unbilled PO"}
                            </span>
                            <Clock size={14} className="shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
                            {loading ? "..." : fmt(summary.unbilledTotal)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Pipeline Tagihan</span>
                            <span>{unbilledPercent}% sisa</span>
                        </div>
                    </div>

                    {/* 5. Piutang Belum Dibayar (Unpaid) */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                {ID ? "Piutang Belum Dibayar" : "Unpaid Receivables"}
                            </span>
                            <AlertTriangle size={14} className="shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">
                            {loading ? "..." : fmt(summary.unpaidTotal)}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Tertunggak di Invoice</span>
                            <span className="font-medium text-foreground">
                                {summary.unpaidTotal > 0 ? "Perlu Follow-up" : "Lancar"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        {/* Customer Picker */}
                        <div className="space-y-1.5 md:col-span-5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Building2 size={13} />
                                    {ID ? "Pilih Customer / Pelanggan" : "Select Customer"}
                                </label>
                                {customerId !== "ALL" && (
                                    <button
                                        onClick={() => { setCustomerId("ALL"); setCustomerSearch("") }}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <X size={10} /> Reset Customer
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <div className="relative">
                                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        placeholder={ID ? "Ketik untuk menyaring customer..." : "Filter customer list..."}
                                        className={`${inputClass} pl-9 pr-8`}
                                    />
                                    {customerSearch && (
                                        <button
                                            onClick={() => setCustomerSearch("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <select
                                    value={customerId}
                                    onChange={e => setCustomerId(e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="ALL">{ID ? "— Semua Customer (Tampilkan Seluruh Data) —" : "— All Customers —"}</option>
                                    {customerOptions.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.code} — {c.company || c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status Dropdown */}
                        <div className="space-y-1.5 md:col-span-3">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Filter size={13} />
                                {ID ? "Filter Status Tagihan" : "Billing Status"}
                            </label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className={`${inputClass} cursor-pointer`}
                            >
                                <option value="ALL">{ID ? "Semua Status Pembayaran" : "All Status"}</option>
                                {Object.entries(STATUS_META).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {ID ? v.ID : v.EN} ({statusCounts[k] || 0})
                                    </option>
                                ))}
                            </select>
                            {selectedCustomer && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                    Terpilih: <span className="font-medium text-foreground">{selectedCustomer.name}</span>
                                </p>
                            )}
                        </div>

                        {/* Global Search Doc Number */}
                        <div className="space-y-1.5 md:col-span-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Search size={13} />
                                    {ID ? "Pencarian No. Dokumen / Kata Kunci" : "Search Doc Number"}
                                </label>
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <X size={10} /> Hapus
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari No. SO, No. PO, Invoice, Perihal..."
                                    className={`${inputClass} pl-9 pr-8`}
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Sort Selector */}
                            <div className="flex items-center gap-2 pt-0.5">
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <ArrowUpDown size={11} /> Urutkan:
                                </span>
                                <select
                                    value={sortBy}
                                    onChange={(e: any) => setSortBy(e.target.value)}
                                    className="h-9 cursor-pointer rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                >
                                    <option value="DATE_DESC">Tanggal SO Terbaru</option>
                                    <option value="DATE_ASC">Tanggal SO Terlama</option>
                                    <option value="PO_DESC">Nilai PO Tertinggi</option>
                                    <option value="UNPAID_DESC">Piutang Tertinggi</option>
                                    <option value="UNBILLED_DESC">Belum Ditagih Tertinggi</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Quick Status Pill Filters */}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                        <span className="mr-1 text-[11px] text-muted-foreground">
                            Filter Cepat:
                        </span>
                        <button
                            onClick={() => setStatus("ALL")}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                status === "ALL"
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            Semua ({rows.length})
                        </button>
                        {Object.entries(STATUS_META).map(([k, v]) => {
                            const count = statusCounts[k] || 0
                            const isSelected = status === k
                            return (
                                <button
                                    key={k}
                                    onClick={() => setStatus(k)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        isSelected
                                            ? "border-primary bg-primary/10 text-foreground"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${v.badge}`} />
                                    {ID ? v.ID : v.EN}
                                    <span className="text-muted-foreground">
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Main Data Table */}
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <Layers size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-foreground">
                                    {ID ? "Daftar Rincian Rekapitulasi SO & Penagihan" : "Detailed Sales Order & Billing Records"}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Menampilkan {filteredRows.length} dari total {rows.length} dokumen pesanan penjualan
                                </p>
                            </div>
                        </div>

                        {filteredRows.length > 0 && (
                            <span className="inline-flex items-center gap-1 self-start rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground sm:self-auto">
                                Total PO: <span className="font-medium text-foreground">{fmt(filteredRows.reduce((s, r) => s + r.poTotal, 0))}</span>
                            </span>
                        )}
                    </div>

                    {/* Table Container */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                    <th className="w-8 px-3 py-2.5 text-center font-medium">No</th>
                                    <th className="min-w-[160px] px-3 py-2.5 font-medium">Customer</th>
                                    <th className="min-w-[210px] px-3 py-2.5 font-medium">Penawaran & Perihal</th>
                                    <th className="min-w-[140px] px-3 py-2.5 font-medium">SO & Ref PO</th>
                                    <th className="min-w-[100px] px-3 py-2.5 text-right font-medium">Nilai PO</th>
                                    <th className="min-w-[150px] px-3 py-2.5 font-medium">No. Invoice Terkait</th>
                                    <th className="min-w-[95px] px-3 py-2.5 text-right font-medium">Ditagih</th>
                                    <th className="min-w-[105px] px-3 py-2.5 text-right font-medium">Sudah Dibayar</th>
                                    <th className="min-w-[95px] px-3 py-2.5 text-right font-medium">Belum Tagih</th>
                                    <th className="min-w-[95px] px-3 py-2.5 text-right font-medium">Sisa Piutang</th>
                                    <th className="min-w-[120px] px-3 py-2.5 text-center font-medium">Status</th>
                                    <th className="w-10 px-3 py-2.5 text-center font-medium">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                                <p className="text-xs text-muted-foreground">Memuat rekapitulasi data penjualan...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <FileText size={22} />
                                                </div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {customerId === "ALL"
                                                        ? "Tidak ada data yang cocok dengan kriteria pencarian / filter."
                                                        : "Tidak ditemukan transaksi PO/SO untuk customer ini."}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Silakan sesuaikan filter status atau reset pencarian customer.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((r, idx) => {
                                        const meta = STATUS_META[r.billingStatus]
                                        const isExpanded = expandedRowId === r.id
                                        const payPercent = r.invoicedTotal > 0 ? Math.min(100, Math.round((r.paidTotal / r.invoicedTotal) * 100)) : 0

                                        return (
                                            <React.Fragment key={r.id}>
                                                <tr className={`align-top transition-colors ${isExpanded ? "bg-muted/20" : "hover:bg-muted/30"}`}>
                                                    {/* No */}
                                                    <td className="px-3 py-2.5 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
                                                        {idx + 1}
                                                    </td>

                                                    {/* Customer */}
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                                                                {(r.customer?.name || "C").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium leading-tight text-foreground">
                                                                    {r.customer?.name || "-"}
                                                                </p>
                                                                {r.customer?.company && (
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {r.customer.company}
                                                                    </p>
                                                                )}
                                                                <span className="mt-1 inline-block rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                                                    {r.customer?.code || "-"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Penawaran & Perihal */}
                                                    <td className="px-3 py-2.5">
                                                        {r.quotationNumber ? (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                                                                    <FileText size={11} className="shrink-0 text-muted-foreground" />
                                                                    {r.quotationNumber}
                                                                </span>
                                                                {r.quotationSubject && (
                                                                    <p className="text-[11px] leading-snug text-muted-foreground break-words">
                                                                        <span className="mr-1 text-[10px] font-medium text-muted-foreground">Perihal:</span>
                                                                        {r.quotationSubject}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : r.quotationSubject || r.soSubject ? (
                                                            <div className="space-y-1">
                                                                <span className="text-[11px] italic text-muted-foreground">Tanpa Ref Penawaran</span>
                                                                <p className="text-[11px] leading-snug text-muted-foreground break-words">
                                                                    <span className="mr-1 text-[10px] font-medium text-muted-foreground">Perihal:</span>
                                                                    {r.quotationSubject || r.soSubject}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>

                                                    {/* SO & PO */}
                                                    <td className="px-3 py-2.5">
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-medium text-foreground">
                                                                {r.soNumber}
                                                            </p>
                                                            {r.poNumber && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    PO: <strong className="font-mono font-medium text-foreground">{r.poNumber}</strong>
                                                                </p>
                                                            )}
                                                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <Calendar size={10} />
                                                                {fmtDate(r.soDate)}
                                                            </p>
                                                        </div>
                                                    </td>

                                                    {/* Nilai PO */}
                                                    <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">
                                                        {fmt(r.poTotal)}
                                                    </td>

                                                    {/* Invoices List */}
                                                    <td className="px-3 py-2.5">
                                                        {r.invoices.length === 0 ? (
                                                            <span className="text-[11px] italic text-muted-foreground">Belum ada invoice</span>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {r.invoices.slice(0, 2).map(inv => (
                                                                    <div key={inv.id} className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px]">
                                                                        <span className="font-medium text-foreground">
                                                                            {inv.number}
                                                                        </span>
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            {fmt(inv.grandTotal)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {r.invoices.length > 2 && (
                                                                    <button
                                                                        onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                                                        className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
                                                                    >
                                                                        +{r.invoices.length - 2} invoice lainnya...
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Ditagih */}
                                                    <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">
                                                        {fmt(r.invoicedTotal)}
                                                    </td>

                                                    {/* Sudah Dibayar */}
                                                    <td className="px-3 py-2.5 text-right">
                                                        <p className="text-sm font-medium tabular-nums text-foreground">
                                                            {fmt(r.paidTotal)}
                                                        </p>
                                                        {r.invoicedTotal > 0 && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                ({payPercent}%)
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setPaymentDetailRow(r)}
                                                            title="Lihat detail pembayaran"
                                                            className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
                                                        >
                                                            <CreditCard size={10} />
                                                            Detail
                                                        </button>
                                                    </td>

                                                    {/* Belum Ditagih */}
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className={r.unbilledTotal > 0 ? "text-sm font-medium tabular-nums text-foreground" : "text-sm tabular-nums text-muted-foreground"}>
                                                            {fmt(r.unbilledTotal)}
                                                        </span>
                                                    </td>

                                                    {/* Sisa Piutang */}
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className={r.unpaidTotal > 0 ? "inline-flex rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-sm font-medium tabular-nums text-foreground" : "text-sm tabular-nums text-muted-foreground"}>
                                                            {fmt(r.unpaidTotal)}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${meta?.badge || "bg-muted-foreground"}`} />
                                                            {ID ? meta?.ID : meta?.EN || r.billingStatus}
                                                        </span>
                                                    </td>

                                                    {/* Aksi / Expand */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <button
                                                            onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                                            title="Lihat detail rincian"
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Row Detail */}
                                                {isExpanded && (
                                                    <tr className="bg-muted/20">
                                                        <td colSpan={12} className="px-3 pb-4 pt-0">
                                                            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                                                                <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
                                                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                                        <Receipt size={14} className="text-muted-foreground" />
                                                                        Rincian Faktur & Pembayaran untuk SO: <span className="font-mono">{r.soNumber}</span>
                                                                    </h4>
                                                                    <span className="text-[11px] text-muted-foreground">
                                                                        Customer: {r.customer?.name} ({r.customer?.code})
                                                                    </span>
                                                                </div>

                                                                {r.invoices.length === 0 ? (
                                                                    <p className="py-3 text-center text-xs text-muted-foreground">
                                                                        Belum ada invoice yang diterbitkan untuk Sales Order ini. Seluruh nilai pesanan ({fmt(r.poTotal)}) masih berupa PO Belum Ditagih.
                                                                    </p>
                                                                ) : (
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-left text-sm">
                                                                            <thead>
                                                                                <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                                                                    <th className="px-2 py-2 font-medium">No. Invoice</th>
                                                                                    <th className="px-2 py-2 font-medium">Tgl Invoice</th>
                                                                                    <th className="px-2 py-2 font-medium">Jatuh Tempo</th>
                                                                                    <th className="px-2 py-2 text-right font-medium">Nilai Tagihan</th>
                                                                                    <th className="px-2 py-2 text-right font-medium">Dibayar</th>
                                                                                    <th className="px-2 py-2 text-right font-medium">Sisa Piutang</th>
                                                                                    <th className="px-2 py-2 text-center font-medium">Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-border">
                                                                                {r.invoices.map(inv => {
                                                                                    const remaining = Math.max(inv.grandTotal - inv.paid, 0)
                                                                                    return (
                                                                                        <tr key={inv.id}>
                                                                                            <td className="px-2 py-2 font-mono text-[11px] font-medium text-foreground">{inv.number}</td>
                                                                                            <td className="px-2 py-2 text-xs text-muted-foreground">{fmtDate(inv.date)}</td>
                                                                                            <td className="px-2 py-2 text-xs text-muted-foreground">{inv.dueDate ? fmtDate(inv.dueDate) : "-"}</td>
                                                                                            <td className="px-2 py-2 text-right text-xs font-medium tabular-nums text-foreground">{fmt(inv.grandTotal)}</td>
                                                                                            <td className="px-2 py-2 text-right text-xs font-medium tabular-nums text-foreground">{fmt(inv.paid)}</td>
                                                                                            <td className="px-2 py-2 text-right text-xs font-medium tabular-nums text-foreground">{fmt(remaining)}</td>
                                                                                            <td className="px-2 py-2 text-center">
                                                                                                <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                                                    {inv.status}
                                                                                                </span>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })
                                )}
                            </tbody>

                            {/* Grand Totals Footer */}
                            {filteredRows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-border bg-muted/40 text-sm font-medium text-foreground">
                                        <td colSpan={4} className="px-3 py-2.5 text-right text-[11px] font-medium text-muted-foreground">
                                            Total keseluruhan ({filteredRows.length} SO)
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {fmt(filteredRows.reduce((s, r) => s + r.poTotal, 0))}
                                        </td>
                                        <td></td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {fmt(filteredRows.reduce((s, r) => s + r.invoicedTotal, 0))}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {fmt(filteredRows.reduce((s, r) => s + r.paidTotal, 0))}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {fmt(filteredRows.reduce((s, r) => s + r.unbilledTotal, 0))}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                            {fmt(filteredRows.reduce((s, r) => s + r.unpaidTotal, 0))}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Pipeline Penawaran Belum Jadi PO (Quotations Without SO) */}
                {quoOnly.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                        <button
                            type="button"
                            onClick={() => setShowQuoSection(!showQuoSection)}
                            className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left select-none transition-colors hover:bg-muted/30"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <CreditCard size={16} />
                                </div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        {ID ? "Penawaran Harga Belum Menjadi SO / PO" : "Quotations Without SO (Pipeline)"}
                                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                            {quoOnly.length} Penawaran
                                        </span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Estimasi potensi omzet: <span className="font-medium text-foreground">{fmt(quoOnly.reduce((s, q) => s + q.grandTotal, 0))}</span>
                                    </p>
                                </div>
                            </div>

                            <span className="text-muted-foreground">
                                {showQuoSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </span>
                        </button>

                        {showQuoSection && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="w-12 px-3 py-2.5 text-center font-medium">No</th>
                                            <th className="min-w-[200px] px-3 py-2.5 font-medium">No. Penawaran & Perihal</th>
                                            <th className="px-3 py-2.5 font-medium">Customer</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Status Penawaran</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Potensi Nilai (IDR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {quoOnly.map((q, i) => (
                                            <tr key={q.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 text-center text-[11px] font-medium tabular-nums text-muted-foreground">{i + 1}</td>
                                                <td className="px-3 py-2.5">
                                                    <p className="font-mono text-[11px] font-medium text-foreground">{q.number}</p>
                                                    {q.subject && (
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                            <span className="mr-1 text-[10px] font-medium text-muted-foreground">Perihal:</span>
                                                            {q.subject}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {q.customer?.name || "-"}
                                                    </span>
                                                    {q.customer?.code && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">({q.customer.code})</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(q.date)}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">
                                                    {fmt(q.grandTotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Interactive PDF Preview & Print Modal */}
            <SalesMonitoringPDFModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                rows={filteredRows}
                summary={summary}
                quotationsWithoutSO={quoOnly}
                selectedCustomer={selectedCustomer}
                selectedStatus={status}
                statusLabel={currentStatusLabel}
                company={company}
                userName={session?.user?.name || 'Administrator'}
            />

            {/* Payment Detail Modal */}
            {paymentDetailRow && (() => {
                const payments = paymentDetailRow.invoices
                    .flatMap(inv => (inv.payments || []).map(p => ({ ...p, invoiceNumber: inv.number })))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                const successPaid = payments
                    .filter(p => p.status === 'SUCCESS')
                    .reduce((s, p) => s + p.amount, 0)
                const statusColor = (s: string) =>
                    s === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : s === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setPaymentDetailRow(null)}
                        />
                        <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <CreditCard size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">Detail Pembayaran</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {paymentDetailRow.soNumber} · {paymentDetailRow.customer?.name || '-'}
                                            {paymentDetailRow.customer?.code ? ` (${paymentDetailRow.customer.code})` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPaymentDetailRow(null)}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label="Tutup"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 border-b border-border bg-muted/20 px-5 py-3">
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Nilai Ditagih</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(paymentDetailRow.invoicedTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sudah Dibayar</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-600">{fmt(successPaid)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sisa Piutang</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(Math.max(paymentDetailRow.invoicedTotal - successPaid, 0))}</p>
                                </div>
                            </div>

                            <div className="overflow-auto px-5 py-3">
                                {payments.length === 0 ? (
                                    <p className="py-8 text-center text-xs text-muted-foreground">
                                        Belum ada pembayaran tercatat untuk SO ini.
                                    </p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border text-[11px] font-medium text-muted-foreground">
                                                <th className="py-2 pr-2 font-medium">No. Invoice</th>
                                                <th className="py-2 pr-2 font-medium">Tanggal</th>
                                                <th className="py-2 pr-2 font-medium">Metode</th>
                                                <th className="py-2 pr-2 font-medium">Status</th>
                                                <th className="py-2 pr-2 text-right font-medium">Nominal</th>
                                                <th className="py-2 font-medium">Catatan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {payments.map(p => (
                                                <tr key={p.id}>
                                                    <td className="py-2 pr-2 font-mono text-[11px] font-medium text-foreground">{p.invoiceNumber}</td>
                                                    <td className="py-2 pr-2 text-xs text-muted-foreground">{fmtDate(p.date)}</td>
                                                    <td className="py-2 pr-2 text-xs text-foreground">{p.paymentMethod}</td>
                                                    <td className="py-2 pr-2">
                                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor(p.status)}`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className={`py-2 pr-2 text-right text-xs font-medium tabular-nums ${p.status === 'SUCCESS' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                        {fmt(p.amount)}
                                                    </td>
                                                    <td className="py-2 text-xs text-muted-foreground">{p.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
