"use client"

import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import {
    FileText, Search, RefreshCw, Download, Users, Filter,
    Printer, Eye, CheckCircle2, Clock, AlertTriangle,
    TrendingUp, ChevronDown, ChevronUp, ArrowUpDown,
    DollarSign, Layers, Receipt, Calendar, Building2,
    X, Sparkles, CreditCard, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { useSession } from "next-auth/react"
import SalesMonitoringPDFModal from "./SalesMonitoringPDFModal"
import {
    generateSalesMonitoringPDF,
    RecapRowPDF,
    QuotationOnlyPDF,
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
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen">
            {/* Top Bar / Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1.5">
                            <Sparkles size={11} /> Enterprise Sales Hub
                        </span>
                        {lastRefresh && (
                            <span className="text-[11px] text-slate-400 font-medium">
                                • Diperbarui {lastRefresh}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <FileText size={22} />
                        </div>
                        {ID ? "Monitoring & Rekap Penjualan" : "Sales Order & Billing Recap"}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
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
                        className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
                        Refresh
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportCSV}
                        disabled={filteredRows.length === 0}
                        className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                    >
                        <Download size={13} /> CSV
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPdfModalOpen(true)}
                        disabled={filteredRows.length === 0}
                        className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm"
                    >
                        <Eye size={13} /> Pratinjau PDF
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDirectDownloadPDF}
                        disabled={filteredRows.length === 0 || isDownloadingDirect}
                        className="h-9 px-3 text-xs font-bold gap-1.5 border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm"
                    >
                        {isDownloadingDirect ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                        Unduh PDF
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleDirectPrintPDF}
                        disabled={filteredRows.length === 0 || isPrintingDirect}
                        className="h-9 px-4 text-xs font-black gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-600/25"
                    >
                        {isPrintingDirect ? <RefreshCw size={13} className="animate-spin" /> : <Printer size={14} />}
                        Cetak PDF (jsPDF)
                    </Button>
                </div>
            </div>

            {/* Executive KPI Metric Cards (Full Width 5 Cards Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Nilai Total PO / SO */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {ID ? "Total Nilai PO / SO" : "Total PO / SO Value"}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Layers size={14} />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {loading ? "..." : fmt(summary.poTotal)}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                        <span>{summary.count} Dokumen Pesanan</span>
                        <span className="text-blue-600 font-bold">100% Kontrak</span>
                    </div>
                </div>

                {/* 2. Sudah Ditagih (Invoiced) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {ID ? "Sudah Ditagih (Invoiced)" : "Invoiced Value"}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Receipt size={14} />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
                        {loading ? "..." : fmt(summary.invoicedTotal)}
                    </div>
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Realisasi Penagihan</span>
                            <span className="text-indigo-700 font-bold">{invoicedPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${invoicedPercent}%` }} />
                        </div>
                    </div>
                </div>

                {/* 3. Sudah Dibayar (Cash In) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600" />
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {ID ? "Kas Diterima (Paid)" : "Cash Received (Paid)"}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 size={14} />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                        {loading ? "..." : fmt(summary.paidTotal)}
                    </div>
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Efektivitas Kas (Collection)</span>
                            <span className="text-emerald-700 font-bold">{collectionPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${collectionPercent}%` }} />
                        </div>
                    </div>
                </div>

                {/* 4. PO Belum Ditagih */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {ID ? "PO Belum Ditagih" : "Unbilled PO"}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Clock size={14} />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                        {loading ? "..." : fmt(summary.unbilledTotal)}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                        <span>Pipeline Tagihan</span>
                        <span className="text-amber-700 font-bold">{unbilledPercent}% sisa</span>
                    </div>
                </div>

                {/* 5. Piutang Belum Dibayar (Unpaid) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-red-600" />
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {ID ? "Piutang Belum Dibayar" : "Unpaid Receivables"}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                            <AlertTriangle size={14} />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                        {loading ? "..." : fmt(summary.unpaidTotal)}
                    </div>
                    <div className="mt-2 text-[11px] flex items-center justify-between font-medium">
                        <span className="text-slate-500">Tertunggak di Invoice</span>
                        <span className={summary.unpaidTotal > 0 ? "text-rose-600 font-bold flex items-center gap-1" : "text-emerald-700 font-bold"}>
                            {summary.unpaidTotal > 0 ? "Perlu Follow-up" : "Lancar"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Section Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    {/* Customer Picker */}
                    <div className="md:col-span-5 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Building2 size={13} className="text-indigo-600" />
                                {ID ? "Pilih Customer / Pelanggan" : "Select Customer"}
                            </label>
                            {customerId !== "ALL" && (
                                <button
                                    onClick={() => { setCustomerId("ALL"); setCustomerSearch("") }}
                                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                                >
                                    <X size={10} /> Reset Customer
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    placeholder={ID ? "Ketik untuk menyaring customer..." : "Filter customer list..."}
                                    className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-8 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder:text-slate-400"
                                />
                                {customerSearch && (
                                    <button
                                        onClick={() => setCustomerSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Filter size={13} className="text-indigo-600" />
                            {ID ? "Filter Status Tagihan" : "Billing Status"}
                        </label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="ALL">{ID ? "Semua Status Pembayaran" : "All Status"}</option>
                            {Object.entries(STATUS_META).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {ID ? v.ID : v.EN} ({statusCounts[k] || 0})
                                </option>
                            ))}
                        </select>
                        {selectedCustomer && (
                            <p className="text-[11px] font-semibold text-emerald-700 truncate">
                                Terpilih: {selectedCustomer.name}
                            </p>
                        )}
                    </div>

                    {/* Global Search Doc Number */}
                    <div className="md:col-span-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Search size={13} className="text-indigo-600" />
                                {ID ? "Pencarian No. Dokumen / Kata Kunci" : "Search Doc Number"}
                            </label>
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                                >
                                    <X size={10} /> Hapus
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari No. SO, No. PO, Invoice, Perihal..."
                                className="w-full text-xs border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Sort Selector */}
                        <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <ArrowUpDown size={11} /> Urutkan:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="text-[11px] font-medium border-0 bg-transparent text-slate-700 focus:outline-none cursor-pointer"
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
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1.5">
                        Filter Cepat:
                    </span>
                    <button
                        onClick={() => setStatus("ALL")}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                            status === "ALL"
                                ? "bg-slate-900 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                                className={`text-xs px-3 py-1 rounded-full font-bold border transition-all flex items-center gap-1.5 ${
                                    isSelected
                                        ? `${v.color} shadow-sm ring-2 ring-indigo-500/20`
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${v.badge}`} />
                                {ID ? v.ID : v.EN}
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Main Data Table Card (Full Width) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Layers size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-black text-slate-900">
                                {ID ? "Daftar Rincian Rekapitulasi SO & Penagihan" : "Detailed Sales Order & Billing Records"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Menampilkan {filteredRows.length} dari total {rows.length} dokumen pesanan penjualan
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {filteredRows.length > 0 && (
                            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">
                                Total PO: <strong className="text-slate-900">{fmt(filteredRows.reduce((s, r) => s + r.poTotal, 0))}</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-700 text-left border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                                <th className="px-2.5 py-3 w-8 text-center">No</th>
                                <th className="px-3 py-3 min-w-[160px]">Customer</th>
                                <th className="px-3 py-3 min-w-[210px]">Penawaran & Perihal</th>
                                <th className="px-3 py-3 min-w-[140px]">SO & Ref PO</th>
                                <th className="px-3 py-3 min-w-[100px] text-right">Nilai PO</th>
                                <th className="px-3 py-3 min-w-[150px]">No. Invoice Terkait</th>
                                <th className="px-3 py-3 min-w-[95px] text-right">Ditagih</th>
                                <th className="px-3 py-3 min-w-[105px] text-right">Sudah Dibayar</th>
                                <th className="px-3 py-3 min-w-[95px] text-right">Belum Tagih</th>
                                <th className="px-3 py-3 min-w-[95px] text-right">Sisa Piutang</th>
                                <th className="px-3 py-3 min-w-[120px] text-center">Status</th>
                                <th className="px-2 py-3 w-10 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RefreshCw size={24} className="animate-spin text-indigo-600" />
                                            <p className="text-xs font-semibold">Memuat rekapitulasi data penjualan...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-4 py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText size={32} className="text-slate-300" />
                                            <p className="text-sm font-bold text-slate-700">
                                                {customerId === "ALL"
                                                    ? "Tidak ada data yang cocok dengan kriteria pencarian / filter."
                                                    : "Tidak ditemukan transaksi PO/SO untuk customer ini."}
                                            </p>
                                            <p className="text-xs text-slate-400">
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
                                            <tr className={`hover:bg-slate-50/80 transition-colors align-top ${isExpanded ? "bg-indigo-50/40" : ""}`}>
                                                {/* No */}
                                                <td className="px-3.5 py-3.5 text-center text-slate-400 font-bold">
                                                    {idx + 1}
                                                </td>

                                                {/* Customer */}
                                                <td className="px-3.5 py-3.5">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                                            {(r.customer?.name || "C").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">
                                                                {r.customer?.name || "-"}
                                                            </p>
                                                            {r.customer?.company && (
                                                                <p className="text-[11px] text-slate-500 font-medium">
                                                                    {r.customer.company}
                                                                </p>
                                                            )}
                                                            <span className="inline-block text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 border border-slate-200">
                                                                {r.customer?.code || "-"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Penawaran & Perihal */}
                                                <td className="px-3.5 py-3.5">
                                                    {r.quotationNumber ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                                                                <FileText size={11} className="shrink-0 text-indigo-600" />
                                                                {r.quotationNumber}
                                                            </span>
                                                            {r.quotationSubject && (
                                                                <p className="text-[11px] text-slate-700 font-medium leading-snug break-words">
                                                                    <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Perihal:</span>
                                                                    {r.quotationSubject}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : r.quotationSubject || r.soSubject ? (
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] text-slate-400 italic">Tanpa Ref Penawaran</span>
                                                            <p className="text-[11px] text-slate-700 font-medium leading-snug break-words">
                                                                <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Perihal:</span>
                                                                {r.quotationSubject || r.soSubject}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>

                                                {/* SO & PO */}
                                                <td className="px-3.5 py-3.5">
                                                    <div className="space-y-0.5">
                                                        <p className="font-black text-indigo-600 flex items-center gap-1">
                                                            {r.soNumber}
                                                        </p>
                                                        {r.poNumber && (
                                                            <p className="text-[11px] text-slate-700 font-medium">
                                                                PO: <strong className="font-mono">{r.poNumber}</strong>
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {fmtDate(r.soDate)}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Nilai PO */}
                                                <td className="px-3.5 py-3.5 text-right font-black text-slate-900">
                                                    {fmt(r.poTotal)}
                                                </td>

                                                {/* Invoices List */}
                                                <td className="px-3.5 py-3.5">
                                                    {r.invoices.length === 0 ? (
                                                        <span className="text-slate-400 italic text-[11px]">Belum ada invoice</span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {r.invoices.slice(0, 2).map(inv => (
                                                                <div key={inv.id} className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex items-center justify-between">
                                                                    <span className="font-bold text-slate-800">
                                                                        {inv.number}
                                                                    </span>
                                                                    <span className="text-slate-600 font-mono text-[10px]">
                                                                        {fmt(inv.grandTotal)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {r.invoices.length > 2 && (
                                                                <button
                                                                    onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                                >
                                                                    +{r.invoices.length - 2} invoice lainnya...
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Ditagih */}
                                                <td className="px-3.5 py-3.5 text-right font-semibold text-slate-800">
                                                    {fmt(r.invoicedTotal)}
                                                </td>

                                                {/* Sudah Dibayar */}
                                                <td className="px-3.5 py-3.5 text-right">
                                                    <p className="font-black text-emerald-600">
                                                        {fmt(r.paidTotal)}
                                                    </p>
                                                    {r.invoicedTotal > 0 && (
                                                        <span className="text-[10px] font-bold text-emerald-700">
                                                            ({payPercent}%)
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Belum Ditagih */}
                                                <td className="px-3.5 py-3.5 text-right">
                                                    <span className={r.unbilledTotal > 0 ? "font-bold text-amber-700" : "text-slate-400 font-medium"}>
                                                        {fmt(r.unbilledTotal)}
                                                    </span>
                                                </td>

                                                {/* Sisa Piutang */}
                                                <td className="px-3.5 py-3.5 text-right">
                                                    <span className={r.unpaidTotal > 0 ? "font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded" : "text-slate-400 font-medium"}>
                                                        {fmt(r.unpaidTotal)}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-3.5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${meta?.color || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${meta?.badge || "bg-slate-400"}`} />
                                                        {ID ? meta?.ID : meta?.EN || r.billingStatus}
                                                    </span>
                                                </td>

                                                {/* Aksi / Expand */}
                                                <td className="px-3.5 py-3.5 text-center">
                                                    <button
                                                        onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                                                        title="Lihat detail rincian"
                                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Row Detail Drawer */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 border-t border-b border-indigo-100">
                                                    <td colSpan={12} className="p-4 sm:p-5">
                                                        <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-xs">
                                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                                                    <Receipt size={14} className="text-indigo-600" />
                                                                    Rincian Faktur & Pembayaran untuk SO: <span className="text-indigo-600 font-mono">{r.soNumber}</span>
                                                                </h4>
                                                                <span className="text-[11px] text-slate-500 font-medium">
                                                                    Customer: {r.customer?.name} ({r.customer?.code})
                                                                </span>
                                                            </div>

                                                            {r.invoices.length === 0 ? (
                                                                <p className="text-xs text-slate-500 py-3 text-center">
                                                                    Belum ada invoice yang diterbitkan untuk Sales Order ini. Seluruh nilai pesanan ({fmt(r.poTotal)}) masih berupa PO Belum Ditagih.
                                                                </p>
                                                            ) : (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="text-slate-500 border-b border-slate-100 font-bold text-[10px] uppercase">
                                                                                <th className="py-2 text-left">No. Invoice</th>
                                                                                <th className="py-2 text-left">Tgl Invoice</th>
                                                                                <th className="py-2 text-left">Jatuh Tempo</th>
                                                                                <th className="py-2 text-right">Nilai Tagihan</th>
                                                                                <th className="py-2 text-right">Dibayar</th>
                                                                                <th className="py-2 text-right">Sisa Piutang</th>
                                                                                <th className="py-2 text-center">Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {r.invoices.map(inv => {
                                                                                const remaining = Math.max(inv.grandTotal - inv.paid, 0)
                                                                                return (
                                                                                    <tr key={inv.id}>
                                                                                        <td className="py-2 font-black text-indigo-600">{inv.number}</td>
                                                                                        <td className="py-2 text-slate-700">{fmtDate(inv.date)}</td>
                                                                                        <td className="py-2 text-slate-700">{inv.dueDate ? fmtDate(inv.dueDate) : "-"}</td>
                                                                                        <td className="py-2 text-right font-bold text-slate-900">{fmt(inv.grandTotal)}</td>
                                                                                        <td className="py-2 text-right text-emerald-600 font-bold">{fmt(inv.paid)}</td>
                                                                                        <td className="py-2 text-right font-bold text-rose-600">{fmt(remaining)}</td>
                                                                                        <td className="py-2 text-center">
                                                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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

                        {/* Grand Totals Sticky Footer */}
                        {filteredRows.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                                    <td colSpan={4} className="px-3.5 py-3.5 text-right uppercase text-[11px] tracking-wider text-slate-600">
                                        TOTAL KESELURUHAN ({filteredRows.length} SO)
                                    </td>
                                    <td className="px-3.5 py-3.5 text-right text-slate-900">
                                        {fmt(filteredRows.reduce((s, r) => s + r.poTotal, 0))}
                                    </td>
                                    <td></td>
                                    <td className="px-3.5 py-3.5 text-right text-indigo-700">
                                        {fmt(filteredRows.reduce((s, r) => s + r.invoicedTotal, 0))}
                                    </td>
                                    <td className="px-3.5 py-3.5 text-right text-emerald-700">
                                        {fmt(filteredRows.reduce((s, r) => s + r.paidTotal, 0))}
                                    </td>
                                    <td className="px-3.5 py-3.5 text-right text-amber-700">
                                        {fmt(filteredRows.reduce((s, r) => s + r.unbilledTotal, 0))}
                                    </td>
                                    <td className="px-3.5 py-3.5 text-right text-rose-700">
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
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div
                        onClick={() => setShowQuoSection(!showQuoSection)}
                        className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <CreditCard size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    {ID ? "Penawaran Harga Belum Menjadi SO / PO" : "Quotations Without SO (Pipeline)"}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        {quoOnly.length} Penawaran
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Estimasi potensi omzet: <strong className="text-amber-700">{fmt(quoOnly.reduce((s, q) => s + q.grandTotal, 0))}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            {showQuoSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </div>

                    {showQuoSection && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-left font-black uppercase text-[10px] tracking-wider text-slate-600 border-b border-slate-200">
                                        <th className="px-4 py-2.5 w-12 text-center">No</th>
                                        <th className="px-4 py-2.5 min-w-[200px]">No. Penawaran & Perihal</th>
                                        <th className="px-4 py-2.5">Customer</th>
                                        <th className="px-4 py-2.5">Tanggal</th>
                                        <th className="px-4 py-2.5">Status Penawaran</th>
                                        <th className="px-4 py-2.5 text-right">Potensi Nilai (IDR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {quoOnly.map((q, i) => (
                                        <tr key={q.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2.5 text-center text-slate-400 font-bold">{i + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="font-black text-indigo-600">{q.number}</p>
                                                {q.subject && (
                                                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Perihal:</span>
                                                        {q.subject}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800">
                                                {q.customer?.name || "-"}
                                                {q.customer?.code && (
                                                    <span className="text-[10px] text-slate-400 ml-1">({q.customer.code})</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600">{fmtDate(q.date)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-black text-slate-900">
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
        </div>
    )
}
