"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardList,
    Search,
    Calendar,
    User,
    Package,
    ExternalLink,
    RefreshCw,
    X,
    Filter,
    Eye,
    Clock,
    LayoutGrid,
    Table as TableIcon,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

interface ReportPhoto {
    id: string
    url: string
}

interface WorkOrderInfo {
    id: string
    number: string
    title: string
    status: string
}

interface Report {
    id: string
    workOrderId: string
    description: string
    progress: number
    reportedBy: string | null
    date: string
    photos: ReportPhoto[]
    workOrder: WorkOrderInfo
}

type ProgressFilter = "all" | "high" | "mid" | "low"

const WO_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: {
        label: "Draft",
        color: "border-border bg-muted text-muted-foreground",
    },
    CONFIRMED: {
        label: "Confirmed",
        color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400",
    },
    IN_PROGRESS: {
        label: "In Progress",
        color: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
    },
    ON_HOLD: {
        label: "On Hold",
        color: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400",
    },
    COMPLETED: {
        label: "Completed",
        color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    CANCELLED: {
        label: "Cancelled",
        color: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400",
    },
}

const PROGRESS_FILTERS: { id: ProgressFilter; label: string }[] = [
    { id: "all", label: "Semua Status" },
    { id: "high", label: "Selesai (>80%)" },
    { id: "mid", label: "Berjalan (30-80%)" },
    { id: "low", label: "Awal (<30%)" },
]

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

function WorkOrderStatus({ status }: { status: string }) {
    const config = WO_STATUS[status]
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                config?.color || "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {config?.label || status}
        </span>
    )
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [viewMode, setViewMode] = useState<"table" | "grid">("table")
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
    const [viewingReport, setViewingReport] = useState<Report | null>(null)

    const [filterProgress, setFilterProgress] = useState<ProgressFilter>("all")

    const { data: session } = useSession()

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports`, {
                headers: {
                    "x-user-role": session?.user?.role || "",
                    "x-user-dept": session?.user?.department || "",
                    "x-user-name": session?.user?.name || "",
                },
            })
            if (res.ok) {
                const data = await res.json()
                setReports(data)
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error)
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    const filteredReports = useMemo(() => {
        return reports.filter((r) => {
            const matchesSearch =
                r.workOrder.number.toLowerCase().includes(search.toLowerCase()) ||
                r.workOrder.title.toLowerCase().includes(search.toLowerCase()) ||
                (r.reportedBy && r.reportedBy.toLowerCase().includes(search.toLowerCase())) ||
                r.description.toLowerCase().includes(search.toLowerCase())

            if (!matchesSearch) return false

            if (filterProgress === "high") return r.progress >= 80
            if (filterProgress === "mid") return r.progress > 30 && r.progress < 80
            if (filterProgress === "low") return r.progress <= 30

            return true
        })
    }, [reports, search, filterProgress])

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
    const fmtTime = (d: string) =>
        new Date(d).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
        })

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <ClipboardList size={18} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">
                                Laporan Progress
                            </h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Monitoring real-time lapangan &middot; {filteredReports.length} data
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                title="Tampilan tabel"
                                className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                                    viewMode === "table"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <TableIcon size={15} />
                                <span className="sr-only">Tabel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                title="Tampilan grid"
                                className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                                    viewMode === "grid"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <LayoutGrid size={15} />
                                <span className="sr-only">Grid</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={fetchReports}
                            title="Muat ulang"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </header>

                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari WO, Teknisi, atau Aktivitas..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Filter Progress:</span>
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                            {PROGRESS_FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFilterProgress(f.id)}
                                    className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors ${
                                        filterProgress === f.id
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        <p className="text-xs text-muted-foreground">Sinkronisasi Data Lapangan...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Filter size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Data Tidak Ditemukan</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            Kriteria pencarian atau filter Anda tidak menghasilkan data laporan saat ini.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearch("")
                                setFilterProgress("all")
                            }}
                            className="mt-5 h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            Reset Filter
                        </Button>
                    </div>
                ) : viewMode === "table" ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                        <th className="px-3 py-2.5 font-medium">Laporan &amp; Waktu</th>
                                        <th className="px-3 py-2.5 font-medium">Work Order</th>
                                        <th className="px-3 py-2.5 font-medium">Teknisi / Pelapor</th>
                                        <th className="px-3 py-2.5 font-medium">Progress Visual</th>
                                        <th className="px-3 py-2.5 text-center font-medium">Foto</th>
                                        <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredReports.map((report) => (
                                        <tr
                                            key={report.id}
                                            onClick={() => setViewingReport(report)}
                                            className="cursor-pointer transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                        <Calendar size={11} />
                                                        <span className="text-[10px] font-medium leading-none">
                                                            {new Date(report.date).getDate()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {fmtDate(report.date)}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Clock size={10} />
                                                            {fmtTime(report.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="max-w-xs">
                                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                            {report.workOrder.number}
                                                        </span>
                                                        <WorkOrderStatus status={report.workOrder.status} />
                                                    </div>
                                                    <p className="truncate text-sm text-foreground">
                                                        {report.workOrder.title}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                                                        {(report.reportedBy || "A").substring(0, 1)}
                                                    </div>
                                                    <span className="truncate text-sm text-foreground">
                                                        {report.reportedBy || "Anonim"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="w-40">
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-primary"
                                                            style={{ width: `${report.progress}%` }}
                                                        />
                                                    </div>
                                                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                                                        {report.progress}% Complete
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                {report.photos.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                        <Package size={11} />
                                                        {report.photos.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/50">&mdash;</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Link
                                                        href={`/dashboard/operations/work-orders?id=${report.workOrderId}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Buka Work Order"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        title="Lihat detail"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {filteredReports.map((report) => (
                            <div
                                key={report.id}
                                onClick={() => setViewingReport(report)}
                                className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                        {report.workOrder.number}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {fmtDate(report.date)}
                                    </span>
                                </div>

                                <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                                    {report.workOrder.title}
                                </h3>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <WorkOrderStatus status={report.workOrder.status} />
                                    <span className="text-[11px] text-muted-foreground">
                                        {report.reportedBy || "Anonim"}
                                    </span>
                                </div>

                                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5">
                                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                                        {report.description}
                                    </p>
                                </div>

                                <div className="mt-3">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">
                                            Progress Pekerjaan
                                        </span>
                                        <span className="text-[11px] font-medium text-foreground">
                                            {report.progress}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${report.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {report.photos.length > 0 && (
                                    <div className="mt-3 flex gap-1.5 border-t border-border pt-3">
                                        {report.photos.slice(0, 3).map((p, idx) => (
                                            <div
                                                key={p.id}
                                                className="relative aspect-video flex-1 overflow-hidden rounded-lg border border-border"
                                            >
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_API_URL}${p.url}`}
                                                    className="h-full w-full object-cover"
                                                    alt="Lampiran laporan"
                                                />
                                                {idx === 2 && report.photos.length > 3 && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                        <span className="text-[11px] font-medium text-white">
                                                            +{report.photos.length - 2}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {viewingReport && (
                    <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingReport(null)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <ClipboardList size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            Detail Laporan
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {viewingReport.workOrder.number} &middot;{" "}
                                            {fmtDate(viewingReport.date)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewingReport(null)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </header>

                            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                                <div>
                                    <WorkOrderStatus status={viewingReport.workOrder.status} />
                                    <h3 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
                                        {viewingReport.workOrder.title}
                                    </h3>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={13} />
                                            {fmtDate(viewingReport.date)} &middot;{" "}
                                            {fmtTime(viewingReport.date)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User size={13} />
                                            {viewingReport.reportedBy || "Anonim"}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Pencapaian Progress
                                        </span>
                                        <span className="text-sm font-semibold text-foreground">
                                            {viewingReport.progress}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${viewingReport.progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                    <span className="mb-1.5 block text-[11px] text-muted-foreground">
                                        Catatan Operasional
                                    </span>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                        {viewingReport.description}
                                    </p>
                                </div>

                                {viewingReport.photos.length > 0 && (
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">
                                                Lampiran Media ({viewingReport.photos.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {viewingReport.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    onClick={() =>
                                                        setSelectedPhoto(
                                                            `${process.env.NEXT_PUBLIC_API_URL}${photo.url}`
                                                        )
                                                    }
                                                    className="group/img relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border"
                                                >
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                                        alt="Lampiran laporan"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
                                                        <Eye className="text-white" size={20} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
                                <Link
                                    href={`/dashboard/operations/work-orders?id=${viewingReport.workOrderId}`}
                                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    Buka Detail WO
                                </Link>
                                <Button
                                    onClick={() => setViewingReport(null)}
                                    className="h-9 flex-1 rounded-lg text-sm font-medium"
                                >
                                    Tutup Preview
                                </Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedPhoto && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-10">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute inset-0 cursor-zoom-out bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute right-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
                            >
                                <X size={16} />
                            </Button>
                            <img
                                src={selectedPhoto}
                                alt="Zoomed"
                                className="max-h-[85vh] max-w-[90vw] object-contain"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
