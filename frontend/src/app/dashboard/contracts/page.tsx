"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    FileText,
    Plus,
    Search,
    Building2,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2,
    Edit3,
    RefreshCw,
    Printer,
    CreditCard,
    Copy,
    CalendarPlus,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import ContractPDFModal from "./ContractPDFModal"

interface Company {
    name?: string
    legalName?: string
    logo?: string
    address?: string
    city?: string
    province?: string
    postalCode?: string
    phone?: string
    email?: string
    taxId?: string
}

interface Contract {
    id: string
    number: string
    date: string
    subject: string
    type: string
    status: string
    startDate: string
    endDate: string
    amount: number
    firstPartyName: string
    firstPartyTitle: string
    firstPartyAddress?: string
    secondPartyName: string
    secondPartyTitle: string
    secondPartyAddress?: string
    clauses: any
    customer?: { id: string; name: string }
    vendor?: { id: string; name: string }
    project?: { id: string; title: string; number: string }
    lastBillingDate?: string
    invoices?: { grandTotal: number; status: string }[]
    purchaseInvoices?: { grandTotal: number; status: string }[]
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`
const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"] as const

const getStatusStyle = (status: string) => {
    switch (status) {
        case "ACTIVE":
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
        case "DRAFT":
            return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
        case "EXPIRED":
            return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
        default:
            return "border-border bg-muted text-muted-foreground"
    }
}

export default function ContractListPage() {
    const router = useRouter()
    const [contracts, setContracts] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")

    const [showPreview, setShowPreview] = useState(false)
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
    const [company, setCompany] = useState<Company>({})
    const [projectionModal, setProjectionModal] = useState({
        isOpen: false,
        contractId: "",
        months: 6,
        loading: false,
    })

    const handleDuplicate = (c: Contract) => {
        const { id, number, date, lastBillingDate, createdAt, updatedAt, invoices, purchaseInvoices, ...rest } =
            c as any
        localStorage.setItem(
            "duplicated_contract",
            JSON.stringify({
                ...rest,
                subject: `COPY - ${rest.subject}`,
                status: "DRAFT",
            })
        )
        router.push("/dashboard/contracts/new")
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Hapus kontrak ini secara permanen?")) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${id}`, {
                method: "DELETE",
            })
            if (res.ok) {
                setContracts(contracts.filter((c) => c.id !== id))
            } else {
                const err = await res.json()
                alert(`Gagal menghapus: ${err.message}`)
            }
        } catch (e) {
            console.error(e)
            alert("Error koneksi")
        }
    }

    const handleGenerateProjections = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setProjectionModal({ isOpen: true, contractId: id, months: 6, loading: false })
    }

    const submitProjection = async () => {
        const { contractId, months } = projectionModal
        if (months <= 0) return alert("Bulan harus lebih dari 0")

        try {
            setProjectionModal((prev) => ({ ...prev, loading: true }))
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${contractId}/generate-projections`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ months }),
                }
            )
            if (res.ok) {
                const data = await res.json()
                alert(
                    `Berhasil membuat ${data.generated} invoice proyeksi. (${data.skipped} di-skip karena sudah ada)`
                )
                setProjectionModal({ isOpen: false, contractId: "", months: 6, loading: false })
                loadData()
            } else {
                const err = await res.json()
                alert(`Gagal: ${err.message}`)
            }
        } catch (err) {
            alert("Error koneksi")
        } finally {
            setProjectionModal((prev) => ({ ...prev, loading: false }))
        }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const [cRes, sRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`),
            ])
            if (cRes.ok) setContracts(await cRes.json())
            if (sRes.ok) setCompany(await sRes.json())
        } catch (e) {
            console.error("Failed to load data:", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filtered = (Array.isArray(contracts) ? contracts : []).filter((c) => {
        const matchesSearch =
            c.number.toLowerCase().includes(search.toLowerCase()) ||
            c.subject.toLowerCase().includes(search.toLowerCase()) ||
            c.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.vendor?.name?.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = filterStatus === "ALL" || c.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setContracts(contracts.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
            } else {
                alert("Gagal memperbarui status")
            }
        } catch (e) {
            console.error(e)
            alert("Error koneksi")
        }
    }

    const handlePrint = (c: Contract) => {
        setSelectedContract(c)
        setShowPreview(true)
    }

    const handleGenerateBill = async (id: string) => {
        if (!confirm("Buat penagihan/biaya untuk bulan ini?")) return
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${id}/generate-bill`, {
                method: "POST",
            })
            if (res.ok) {
                alert("Penagihan berhasil dibuat sebagai DRAFT")
                loadData()
            } else {
                const err = await res.json()
                alert(`Gagal membuat penagihan: ${err.message || "Unknown error"}`)
            }
        } catch (e) {
            console.error(e)
            alert("Error koneksi")
        } finally {
            setLoading(false)
        }
    }

    const calcRealization = (c: Contract) => {
        const invTotal = (c.invoices || []).reduce((sum, inv) => sum + inv.grandTotal, 0)
        const piTotal = (c.purchaseInvoices || []).reduce((sum, pi) => sum + pi.grandTotal, 0)
        return invTotal > 0 ? { total: invTotal, label: "Pendapatan" } : { total: piTotal, label: "Beban" }
    }

    const stats = [
        {
            label: "Total kontrak",
            value: contracts.length,
            icon: FileText,
            iconClass: "bg-muted text-muted-foreground",
        },
        {
            label: "Kontrak aktif",
            value: contracts.filter((c) => c.status === "ACTIVE").length,
            icon: CheckCircle2,
            iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
        },
        {
            label: "Menunggu",
            value: contracts.filter((c) => c.status === "DRAFT").length,
            icon: Clock,
            iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
        },
        {
            label: "Habis masa",
            value: contracts.filter((c) => c.status === "EXPIRED").length,
            icon: AlertCircle,
            iconClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
        },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Kontrak & SPK</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Monitoring layanan berlangganan dan penagihan berkala
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadData}
                            title="Muat ulang"
                            className="h-9 w-9 rounded-lg"
                        >
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        </Button>
                        <Link
                            href="/dashboard/contracts/new"
                            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Buat kontrak
                        </Link>
                    </div>
                </header>

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-md ${stat.iconClass}`}
                                >
                                    <stat.icon size={14} />
                                </div>
                            </div>
                            <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Cari kontrak, subjek atau pelanggan"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <div className="inline-flex items-center gap-1 self-start rounded-lg border border-border bg-muted/50 p-1">
                        {["ALL", ...STATUS_OPTIONS].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`h-8 rounded-md px-2.5 text-xs font-medium transition-colors ${
                                    filterStatus === status
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {status === "ALL" ? "Semua" : status}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filtered.length} kontrak
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Info kontrak</th>
                                            <th className="px-3 py-2.5 font-medium">Pihak terkait</th>
                                            <th className="px-3 py-2.5 font-medium">Realisasi</th>
                                            <th className="px-3 py-2.5 font-medium">Periode</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((c) => {
                                            const real = calcRealization(c)
                                            return (
                                                <tr
                                                    key={c.id}
                                                    className="group transition-colors hover:bg-muted/30"
                                                >
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                                                                <FileText size={15} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                                    {c.number}
                                                                </p>
                                                                <p className="max-w-[220px] truncate text-sm font-medium text-foreground">
                                                                    {c.subject}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <p className="max-w-[180px] truncate text-sm text-foreground">
                                                            {c.customer?.name || c.vendor?.name || "Internal"}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Building2 size={10} />
                                                            {c.project ? `#${c.project.number}` : "N/A"}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <p className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground">
                                                            <CreditCard
                                                                size={12}
                                                                className={
                                                                    real.label === "Pendapatan"
                                                                        ? "text-emerald-500"
                                                                        : "text-rose-500"
                                                                }
                                                            />
                                                            {fmt(real.total)}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                            {real.label} terposting · {fmt(c.amount)}/bln
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <p className="text-[11px] text-muted-foreground">Sampai</p>
                                                        <p className="text-sm text-foreground">{fmtDate(c.endDate)}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <select
                                                            value={c.status}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                            className={`cursor-pointer appearance-none rounded-full border px-2.5 py-0.5 text-[11px] font-medium outline-none ${getStatusStyle(
                                                                c.status
                                                            )}`}
                                                        >
                                                            {STATUS_OPTIONS.map((status) => (
                                                                <option
                                                                    key={status}
                                                                    value={status}
                                                                    className="bg-background text-foreground"
                                                                >
                                                                    {status}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handlePrint(c)
                                                                }}
                                                                title="Cetak SPK"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Printer size={15} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDuplicate(c)
                                                                }}
                                                                title="Duplikasi"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Copy size={15} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleGenerateBill(c.id)
                                                                }}
                                                                title="Buat penagihan"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <TrendingUp size={15} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleGenerateProjections(c.id, e)}
                                                                title="Buat proyeksi"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <CalendarPlus size={15} />
                                                            </button>
                                                            <Link
                                                                href={`/dashboard/contracts/${c.id}/edit`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Edit"
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Edit3 size={15} />
                                                            </Link>
                                                            {real.total === 0 && (
                                                                <button
                                                                    onClick={(e) => handleDelete(c.id, e)}
                                                                    title="Hapus"
                                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="space-y-3 md:hidden">
                            {filtered.map((c) => {
                                const real = calcRealization(c)
                                return (
                                    <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                    {c.number}
                                                </p>
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {c.customer?.name || c.vendor?.name || "Internal"}
                                                </p>
                                                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                                    {c.subject}
                                                </p>
                                            </div>
                                            <select
                                                value={c.status}
                                                onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                className={`flex-shrink-0 cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10px] font-medium outline-none ${getStatusStyle(
                                                    c.status
                                                )}`}
                                            >
                                                {STATUS_OPTIONS.map((status) => (
                                                    <option
                                                        key={status}
                                                        value={status}
                                                        className="bg-background text-foreground"
                                                    >
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {real.label}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
                                                    {fmt(real.total)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Rate bulanan</p>
                                                <p className="mt-0.5 text-xs font-medium tabular-nums text-foreground">
                                                    {fmt(c.amount)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Project</p>
                                                <p className="mt-0.5 text-xs text-foreground">
                                                    {c.project ? `#${c.project.number}` : "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Sampai</p>
                                                <p className="mt-0.5 text-xs text-foreground">
                                                    {fmtDate(c.endDate)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-border pt-2">
                                            <button
                                                onClick={() => handlePrint(c)}
                                                title="Cetak SPK"
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Printer size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(c)}
                                                title="Duplikasi"
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleGenerateBill(c.id)}
                                                title="Buat penagihan"
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <TrendingUp size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleGenerateProjections(c.id, e)}
                                                title="Buat proyeksi"
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <CalendarPlus size={14} />
                                            </button>
                                            <Link
                                                href={`/dashboard/contracts/${c.id}/edit`}
                                                title="Edit"
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit3 size={14} />
                                            </Link>
                                            {real.total === 0 && (
                                                <button
                                                    onClick={(e) => handleDelete(c.id, e)}
                                                    title="Hapus"
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FileText size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Data tidak ditemukan</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            Coba gunakan kata kunci lain atau buat kontrak baru.
                        </p>
                        <div className="mt-5 flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch("")
                                    setFilterStatus("ALL")
                                }}
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                Reset filter
                            </Button>
                            <Link
                                href="/dashboard/contracts/new"
                                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                <Plus size={16} className="mr-1.5" />
                                Buat kontrak
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showPreview && selectedContract && (
                    <ContractPDFModal
                        contract={selectedContract}
                        company={company}
                        onClose={() => setShowPreview(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {projectionModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() =>
                                !projectionModal.loading &&
                                setProjectionModal((prev) => ({ ...prev, isOpen: false }))
                            }
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative w-full overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-sm sm:rounded-2xl"
                        >
                            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                        <CalendarPlus size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">Proyeksi tagihan</h3>
                                        <p className="text-[11px] text-muted-foreground">Buat invoice di awal</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 sm:p-5">
                                <label className="block text-xs font-medium text-muted-foreground">
                                    Jumlah bulan ke depan
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={projectionModal.months || ""}
                                        onChange={(e) =>
                                            setProjectionModal((prev) => ({
                                                ...prev,
                                                months: parseInt(e.target.value) || 0,
                                            }))
                                        }
                                        className={`${inputClass} text-center text-lg font-semibold`}
                                        min="1"
                                        max="60"
                                    />
                                    <span className="text-xs text-muted-foreground">Bulan</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[3, 6, 12, 24].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() =>
                                                setProjectionModal((prev) => ({ ...prev, months: n }))
                                            }
                                            className={`h-8 rounded-md border text-xs font-medium transition-colors ${
                                                projectionModal.months === n
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
                                <Button
                                    variant="outline"
                                    onClick={() => setProjectionModal((prev) => ({ ...prev, isOpen: false }))}
                                    disabled={projectionModal.loading}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={submitProjection}
                                    disabled={projectionModal.loading || projectionModal.months <= 0}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    {projectionModal.loading ? (
                                        <RefreshCw size={14} className="mr-1.5 animate-spin" />
                                    ) : null}
                                    Buat
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
