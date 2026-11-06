"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Chart as MixedChart, Doughnut } from "react-chartjs-2"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  Layers,
  Lightbulb,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  Wrench,
} from "lucide-react"
import { ItOslAccessGuard } from "@/components/it-osl/ItOslAccessGuard"
import { ItOslNav } from "@/components/it-osl/ItOslNav"
import { generateItOslAnalyticsPDF, type CompanyProfile, type ItOslPdfData } from "@/lib/itOslDashboardPdf"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
)

const API = process.env.NEXT_PUBLIC_API_URL

type Analytics = ItOslPdfData

type CustomerOption = { id: string; name: string; company?: string | null; code?: string | null }

type Preset = "today" | "7d" | "30d" | "month" | "lastMonth" | "custom"

const pad = (value: number) => String(value).padStart(2, "0")
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const fmtNumber = (value: number) => new Intl.NumberFormat("id-ID").format(Number(value) || 0)

const fmtMinutes = (value: number) => {
  const minutes = Math.max(0, Math.round(Number(value) || 0))
  if (minutes < 60) return `${minutes} mnt`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return `${hours}j ${rest}m`
  const days = Math.floor(hours / 24)
  return `${days}h ${hours % 24}j`
}

const fmtDate = (value: string) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "-"
  }
}

const presetRange = (preset: Preset): { from: string; to: string } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const minusDays = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    return d
  }
  switch (preset) {
    case "today":
      return { from: toIsoDate(today), to: toIsoDate(today) }
    case "7d":
      return { from: toIsoDate(minusDays(6)), to: toIsoDate(today) }
    case "30d":
      return { from: toIsoDate(minusDays(29)), to: toIsoDate(today) }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    case "month":
    default:
      return { from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toIsoDate(today) }
  }
}

const STATUS_META: Record<string, { label: string; color: string; badge: string; dot: string }> = {
  NEW: { label: "Baru", color: "#6366f1", badge: "bg-indigo-50 text-indigo-700 border-indigo-100", dot: "bg-indigo-500" },
  IN_PROGRESS: { label: "Dikerjakan", color: "#0ea5e9", badge: "bg-sky-50 text-sky-700 border-sky-100", dot: "bg-sky-500" },
  PENDING: { label: "Tertahan", color: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
  RESOLVED: { label: "Selesai", color: "#10b981", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  CLOSED: { label: "Ditutup", color: "#64748b", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  CANCELLED: { label: "Dibatalkan", color: "#f43f5e", badge: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
  DUPLICATE: { label: "Duplikat", color: "#94a3b8", badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
  REOPENED: { label: "Dibuka Ulang", color: "#a855f7", badge: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-500" },
}

const SEVERITY_META: Record<string, { label: string; color: string; badge: string }> = {
  CRITICAL: { label: "Kritis", color: "#e11d48", badge: "bg-rose-50 text-rose-700 border-rose-100" },
  MEDIUM: { label: "Sedang", color: "#d97706", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  LOW: { label: "Rendah", color: "#059669", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
}

const TYPE_LABEL: Record<string, string> = {
  INCIDENT: "Insiden",
  REQUEST: "Permintaan",
  PM: "Preventive",
}

const statusMeta = (key: string) =>
  STATUS_META[key] || { label: key, color: "#94a3b8", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-300" }

const severityMeta = (key: string) =>
  SEVERITY_META[key] || { label: key, color: "#64748b", badge: "bg-slate-100 text-slate-600 border-slate-200" }

const slaTone = (value: number) => {
  if (value >= 90) return { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", bar: "bg-emerald-500" }
  if (value >= 75) return { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100", bar: "bg-amber-500" }
  return { text: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-100", bar: "bg-rose-500" }
}

function DeltaBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null || Number.isNaN(value)) {
    return <span className="text-[10px] font-semibold text-white/50">tanpa pembanding</span>
  }
  const isGood = inverse ? value <= 0 : value >= 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        isGood ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
      }`}
    >
      <Icon size={10} />
      {Math.abs(value)}%
    </span>
  )
}

export default function ItOslDashboardPage() {
  return (
    <ItOslAccessGuard>
      <ItOslDashboardContent />
    </ItOslAccessGuard>
  )
}

function ItOslDashboardContent() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || ""
  const currentRole = (session?.user as { role?: string })?.role || ""
  const currentEmail = session?.user?.email || ""
  const currentName = session?.user?.name || "Administrator"

  const getAuthHeaders = useCallback(
    (): Record<string, string> => ({
      "x-user-id": currentUserId,
      "x-user-role": currentRole,
      "x-user-email": currentEmail,
    }),
    [currentUserId, currentRole, currentEmail],
  )

  const [preset, setPreset] = useState<Preset>("month")
  const initialRange = presetRange("month")
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [customerId, setCustomerId] = useState("")

  const [data, setData] = useState<Analytics | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<"print" | "download" | null>(null)

  const applyPreset = (next: Preset) => {
    setPreset(next)
    if (next === "custom") return
    const range = presetRange(next)
    setFrom(range.from)
    setTo(range.to)
  }

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ from, to })
        if (customerId) params.set("customerId", customerId)
        const res = await fetch(`${API}/api/it-osl/analytics?${params.toString()}`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || `Gagal memuat analisa (${res.status})`)
        }
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data analisa")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [from, to, customerId, getAuthHeaders],
  )

  useEffect(() => {
    if (session === undefined) return
    loadAnalytics()
  }, [loadAnalytics, session])

  useEffect(() => {
    if (session === undefined) return
    const loadMaster = async () => {
      try {
        const [customerRes, companyRes] = await Promise.all([
          fetch(`${API}/api/it-osl/customers`, { headers: getAuthHeaders() }),
          fetch(`${API}/api/company`, { headers: getAuthHeaders() }).catch(() => null),
        ])
        if (customerRes.ok) {
          const list = await customerRes.json()
          setCustomers(Array.isArray(list) ? list : [])
        }
        if (companyRes?.ok) setCompany(await companyRes.json())
      } catch {
        // master data opsional — dashboard tetap dapat digunakan
      }
    }
    loadMaster()
  }, [session, getAuthHeaders])

  const customerLabel = useMemo(() => {
    if (!customerId) return "Semua Customer"
    const found = customers.find((c) => c.id === customerId)
    return found ? found.company || found.name : "Customer terpilih"
  }, [customerId, customers])

  const insights = useMemo(() => {
    if (!data) return []
    const lines: string[] = []
    const tone = data.slaCompliance >= 90 ? "sehat" : data.slaCompliance >= 75 ? "perlu perhatian" : "kritis"
    lines.push(
      `SLA compliance ${data.slaCompliance}% (${tone}) dari ${fmtNumber(data.slaEligible)} tiket yang diukur; ${fmtNumber(data.breachCount)} tiket melewati batas respons.`,
    )
    if (data.byCategory.length) {
      const top = data.byCategory[0]
      lines.push(
        `Beban terbesar ada pada kategori ${top.name} sebanyak ${fmtNumber(top.count)} tiket (${data.total ? Math.round((top.count / data.total) * 100) : 0}% dari total).`,
      )
    }
    const busiest = [...data.technicians].filter((t) => t.id !== "__unassigned__").sort((a, b) => b.open - a.open)[0]
    if (busiest) {
      lines.push(
        `Teknisi dengan beban aktif tertinggi: ${busiest.name} (${fmtNumber(busiest.open)} tiket terbuka, ${busiest.completionRate}% penyelesaian).`,
      )
    }
    if (data.backlogAging.gt7 > 0) {
      lines.push(
        `Perhatian: ${data.backlogAging.gt7} tiket berumur lebih dari 7 hari masih terbuka — lakukan eskalasi atau penjadwalan ulang.`,
      )
    }
    if (data.bySeverity.CRITICAL) {
      lines.push(
        `Terdapat ${fmtNumber(data.bySeverity.CRITICAL)} tiket Critical pada periode ini; pastikan seluruhnya memiliki acknowledged time dan corrective action.`,
      )
    }
    if (data.topAssets.length) {
      const asset = data.topAssets[0]
      lines.push(
        `Aset paling sering bermasalah: ${asset.assetCode} — ${asset.name} (${fmtNumber(asset.count)} tiket). Pertimbangkan inspeksi atau penggantian.`,
      )
    }
    if (data.pm.issueFound > 0) {
      lines.push(
        `Preventive maintenance menemukan ${fmtNumber(data.pm.issueFound)} masalah dari ${fmtNumber(data.pm.executions)} eksekusi — jadwalkan tindak lanjut.`,
      )
    }
    if (data.comparison.totalDelta !== null) {
      const direction = data.comparison.totalDelta >= 0 ? "naik" : "turun"
      lines.push(
        `Volume tiket ${direction} ${Math.abs(data.comparison.totalDelta)}% dibanding periode sebelumnya (${fmtNumber(data.comparison.prevTotal)} → ${fmtNumber(data.total)}).`,
      )
    }
    return lines
  }, [data])

  const trendData = useMemo(() => {
    if (!data) return null
    return {
      labels: data.trend.labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Tiket Masuk",
          data: data.trend.created,
          backgroundColor: "rgba(79, 70, 229, 0.72)",
          hoverBackgroundColor: "#4338ca",
          borderRadius: 4,
          barPercentage: 0.68,
          categoryPercentage: 0.72,
          order: 2,
        },
        {
          type: "line" as const,
          label: "Tiket Selesai",
          data: data.trend.resolved,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#10b981",
          borderWidth: 2,
          order: 1,
        },
      ],
    }
  }, [data])

  const statusChart = useMemo(() => {
    if (!data) return null
    const entries = Object.entries(data.byStatus).filter(([, value]) => value > 0)
    return {
      labels: entries.map(([key]) => statusMeta(key).label),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map(([key]) => statusMeta(key).color),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 6,
        },
      ],
    }
  }, [data])

  const severityChart = useMemo(() => {
    if (!data) return null
    const order = ["CRITICAL", "MEDIUM", "LOW"]
    const keys = order.filter((key) => data.bySeverity[key])
    Object.keys(data.bySeverity).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
    return {
      labels: keys.map((key) => severityMeta(key).label),
      datasets: [
        {
          data: keys.map((key) => data.bySeverity[key]),
          backgroundColor: keys.map((key) => severityMeta(key).color),
          borderWidth: 0,
          borderRadius: 5,
          barThickness: 14,
        },
      ],
    }
  }, [data])

  const exportPdf = async (mode: "print" | "download") => {
    if (!data) return
    setPdfLoading(mode)
    try {
      await generateItOslAnalyticsPDF({
        data,
        insights,
        company,
        userName: currentName,
        userRole: currentRole || "IT Support",
        customerLabel,
        mode,
      })
    } catch (err) {
      console.error(err)
      setError("Gagal membuat PDF. Silakan coba lagi.")
    } finally {
      setPdfLoading(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        <div className="h-40 rounded-3xl bg-slate-900/90 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          <div className="h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24 md:pb-6">
      <ItOslNav />

      {/* ── HERO / HEADER ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative p-5 sm:p-6 lg:p-7 flex flex-col xl:flex-row xl:items-center gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-200 ring-1 ring-white/10">
                <Activity size={11} /> IT Maintenance Command Center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 ring-1 ring-white/10">
                <CalendarDays size={11} /> {fmtDate(data?.range.from || from)} — {fmtDate(data?.range.to || to)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 ring-1 ring-white/10">
                <Users size={11} /> {customerLabel}
              </span>
            </div>
            <h1 className="mt-3 text-xl sm:text-2xl font-black tracking-tight">
              Dashboard Analisa IT Maintenance
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-300/90 leading-relaxed">
              Satu tampilan untuk seluruh data insiden, SLA, beban teknisi, aset, sparepart, dan preventive
              maintenance — siap dianalisa dan dicetak sebagai laporan resmi ke atasan.
            </p>
            {data && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${data.slaCompliance >= 90 ? "bg-emerald-400" : data.slaCompliance >= 75 ? "bg-amber-400" : "bg-rose-400"}`} />
                  SLA {data.slaCompliance}%
                </span>
                <span className="text-slate-500">•</span>
                <span>{fmtNumber(data.total)} tiket periode ini</span>
                <span className="text-slate-500">•</span>
                <span>{fmtNumber(data.active)} backlog aktif</span>
                <span className="text-slate-500">•</span>
                <span>MTTR {fmtMinutes(data.avgMttrMin)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => exportPdf("print")}
              disabled={!data || pdfLoading !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              {pdfLoading === "print" ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
              Cetak PDF
            </button>
            <button
              onClick={() => exportPdf("download")}
              disabled={!data || pdfLoading !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white ring-1 ring-inset ring-white/20 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {pdfLoading === "download" ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              Unduh Laporan
            </button>
            <Link
              href="/dashboard/maintenance/it-osl/tickets"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/10"
            >
              <Layers size={14} /> Buka Tiket
            </Link>
          </div>
        </div>
      </header>

      {/* ── FILTER BAR ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Periode</span>
            {([
              ["today", "Hari Ini"],
              ["7d", "7 Hari"],
              ["30d", "30 Hari"],
              ["month", "Bulan Ini"],
              ["lastMonth", "Bulan Lalu"],
              ["custom", "Custom"],
            ] as [Preset, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                  preset === key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
              <CalendarDays size={13} className="text-slate-400" />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setPreset("custom")
                }}
                className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
              />
              <span className="text-slate-400 text-[11px]">s/d</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => {
                  setTo(event.target.value)
                  setPreset("custom")
                }}
                className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
              />
            </div>

            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">Semua Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company || customer.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadAnalytics(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Muat ulang
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Gagal memuat data</p>
            <p>{error}</p>
          </div>
          <button onClick={() => loadAnalytics()} className="rounded-lg bg-white px-2.5 py-1 font-bold text-rose-700 ring-1 ring-rose-200">
            Coba lagi
          </button>
        </div>
      )}

      {data && (
        <>
          {/* ── KPI GRID ───────────────────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              {
                label: "Total Tiket",
                value: fmtNumber(data.total),
                sub: `${data.range.days} hari terpilih`,
                delta: data.comparison.totalDelta,
                icon: Layers,
                accent: "bg-indigo-600",
              },
              {
                label: "Tiket Aktif",
                value: fmtNumber(data.openInRange),
                sub: `${fmtNumber(data.inProgress)} dikerjakan • ${fmtNumber(data.pending)} tertahan`,
                delta: null,
                icon: Activity,
                accent: "bg-sky-600",
              },
              {
                label: "Selesai",
                value: fmtNumber(data.resolved + data.closed),
                sub: `${data.completionRate}% completion rate`,
                delta: data.comparison.resolvedDelta,
                icon: CheckCircle2,
                accent: "bg-emerald-600",
              },
              {
                label: "SLA Compliance",
                value: `${data.slaCompliance}%`,
                sub: `${fmtNumber(data.breachCount)} breach / ${fmtNumber(data.slaEligible)} tiket`,
                delta: data.comparison.prevSlaCompliance ? data.slaCompliance - data.comparison.prevSlaCompliance : null,
                icon: ShieldCheck,
                accent: data.slaCompliance >= 90 ? "bg-emerald-600" : data.slaCompliance >= 75 ? "bg-amber-500" : "bg-rose-600",
              },
              {
                label: "Avg First Response",
                value: fmtMinutes(data.avgFrtMin),
                sub: "waktu tanggap pertama",
                delta: data.comparison.prevAvgFrtMin ? Math.round(((data.avgFrtMin - data.comparison.prevAvgFrtMin) / data.comparison.prevAvgFrtMin) * 100) : null,
                icon: Timer,
                accent: "bg-violet-600",
              },
              {
                label: "Avg MTTR",
                value: fmtMinutes(data.avgMttrMin),
                sub: `median ${fmtMinutes(data.medianMttrMin)}`,
                delta: data.comparison.prevAvgMttrMin ? Math.round(((data.avgMttrMin - data.comparison.prevAvgMttrMin) / data.comparison.prevAvgMttrMin) * 100) : null,
                icon: TrendingUp,
                accent: "bg-teal-600",
              },
            ].map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.accent}`}>
                    <card.icon size={14} className="text-white" />
                  </div>
                  <DeltaBadge value={card.delta} inverse={card.label.includes("Response") || card.label.includes("MTTR")} />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                <p className="mt-0.5 text-xl font-black tracking-tight text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{card.sub}</p>
              </motion.div>
            ))}
          </section>

          {/* ── TREN & STATUS ──────────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <BarChart3 size={16} className="text-indigo-600" /> Tren Tiket Masuk vs Selesai
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Pola volume pekerjaan per {data.trend.mode === "day" ? "hari" : data.trend.mode === "week" ? "minggu" : "bulan"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-indigo-600" /> Masuk</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Selesai</span>
                </div>
              </div>
              <div className="mt-4 h-[260px]">
                {trendData && (
                  <MixedChart
                    type="bar"
                    data={trendData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: "#0f172a",
                          padding: 10,
                          titleFont: { size: 11, weight: "bold" },
                          bodyFont: { size: 11 },
                          cornerRadius: 8,
                        },
                      },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { font: { size: 10 }, color: "#94a3b8", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                        },
                        y: {
                          beginAtZero: true,
                          ticks: { precision: 0, font: { size: 10 }, color: "#94a3b8" },
                          grid: { color: "rgba(148, 163, 184, 0.14)" },
                          border: { display: false },
                        },
                      },
                    }}
                  />
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rata-rata / hari</p>
                  <p className="text-sm font-black text-slate-800">{(data.total / data.range.days).toFixed(1)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rasio selesai</p>
                  <p className="text-sm font-black text-emerald-600">{data.completionRate}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reopened</p>
                  <p className="text-sm font-black text-slate-800">{fmtNumber(data.reopened)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Gauge size={16} className="text-sky-600" /> Distribusi Status
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">Posisi seluruh tiket periode ini</p>
                </div>
              </div>
              <div className="relative mt-3 h-[170px]">
                {statusChart && (
                  <Doughnut
                    data={statusChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "70%",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: "#0f172a",
                          padding: 9,
                          bodyFont: { size: 11 },
                          cornerRadius: 8,
                        },
                      },
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-black text-slate-900">{fmtNumber(data.total)}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Tiket</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {Object.entries(data.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, value]) => {
                    const meta = statusMeta(key)
                    return (
                      <div key={key} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        <span className="truncate text-[10px] font-semibold text-slate-500">{meta.label}</span>
                        <span className="ml-auto text-[11px] font-black text-slate-800">{value}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </section>

          {/* ── KATEGORI & TEKNISI ─────────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Boxes size={16} className="text-violet-600" /> Beban per Kategori
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">Kategori pekerjaan dengan volume dan breach SLA</p>
                </div>
                <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{data.byCategory.length} kategori</span>
              </div>
              <div className="mt-4 space-y-3">
                {data.byCategory.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada data kategori pada periode ini.</p>
                )}
                {data.byCategory.map((row) => {
                  const max = data.byCategory[0]?.count || 1
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate font-bold text-slate-700">{row.name}</span>
                        <span className="shrink-0 font-black text-slate-800">{fmtNumber(row.count)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                            style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
                          />
                        </div>
                        {row.breach > 0 ? (
                          <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-600">
                            {row.breach} breach
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-600">
                            0 breach
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Users size={16} className="text-teal-600" /> Kinerja Teknisi
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">Beban, penyelesaian, dan SLA per penanggung jawab</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-2 pr-2">Teknisi</th>
                      <th className="pb-2 px-1 text-center">Total</th>
                      <th className="pb-2 px-1 text-center">Selesai</th>
                      <th className="pb-2 px-1 text-center">Aktif</th>
                      <th className="pb-2 px-1 text-center">SLA</th>
                      <th className="pb-2 pl-1 text-right">MTTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.technicians.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-400">Belum ada penugasan pada periode ini.</td>
                      </tr>
                    )}
                    {data.technicians.map((tech) => (
                      <tr key={tech.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${tech.id === "__unassigned__" ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-teal-700"}`}>
                              {tech.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-700">{tech.name}</p>
                              <p className="text-[9px] text-slate-400">{tech.completionRate}% completion</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-1 text-center font-black text-slate-800">{tech.total}</td>
                        <td className="px-1 text-center font-bold text-emerald-600">{tech.resolved}</td>
                        <td className="px-1 text-center font-bold text-sky-600">{tech.open}</td>
                        <td className="px-1 text-center">
                          {tech.breach > 0 ? (
                            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-600">{tech.breach}</span>
                          ) : (
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-600">0</span>
                          )}
                        </td>
                        <td className="pl-1 text-right font-semibold text-slate-600">{fmtMinutes(tech.avgMttrMin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── SEBARAN LOKASI, CUSTOMER & KANAL ───────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <MapPin size={16} className="text-rose-500" /> Sebaran Lokasi
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Titik dengan insiden terbanyak</p>
              <div className="mt-3 space-y-2">
                {data.byLocation.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada data lokasi.</p>}
                {data.byLocation.slice(0, 6).map((location, index) => {
                  const max = data.byLocation[0]?.count || 1
                  return (
                    <div key={location.name} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-50 text-[9px] font-black text-rose-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-semibold text-slate-600">{location.name}</p>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(5, (location.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-slate-800">{location.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Users size={16} className="text-indigo-600" /> Sebaran Customer
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Distribusi tiket per customer / unit</p>
              <div className="mt-3 space-y-2">
                {data.byCustomer.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada data customer.</p>}
                {data.byCustomer.slice(0, 6).map((customer, index) => {
                  const max = data.byCustomer[0]?.count || 1
                  return (
                    <div key={customer.name} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[9px] font-black text-indigo-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-semibold text-slate-600">{customer.name}</p>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.max(5, (customer.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-slate-800">{customer.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Activity size={16} className="text-sky-600" /> Kanal & Jenis Tiket
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Sumber laporan masuk dan klasifikasi pekerjaan</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.entries(data.byTicketType).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{TYPE_LABEL[key] || key}</p>
                    <p className="text-lg font-black text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kanal pelaporan</p>
                {Object.entries(data.byChannel).length === 0 && <p className="text-[11px] text-slate-400">Belum ada data kanal.</p>}
                {Object.entries(data.byChannel)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([channel, value]) => {
                    const max = Math.max(...Object.values(data.byChannel), 1)
                    return (
                      <div key={channel} className="flex items-center gap-2">
                        <span className="w-24 truncate text-[10px] font-semibold text-slate-500">{channel}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(5, (value / max) * 100)}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] font-black text-slate-800">{value}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </section>

          {/* ── ANALISA AKAR MASALAH ───────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Clock3 size={16} className="text-amber-600" /> Analisa Penyebab Tertahan
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Alasan backlog aktif — dasar tindakan perbaikan proses</p>
              <div className="mt-3 space-y-2">
                {data.pendingReasons.length === 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={15} /> Tidak ada tiket aktif yang sedang tertahan.
                  </div>
                )}
                {data.pendingReasons.slice(0, 6).map((reason, index) => {
                  const max = data.pendingReasons[0]?.count || 1
                  return (
                    <div key={reason.name} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-[9px] font-black text-amber-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-semibold text-slate-600">{reason.name}</p>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(5, (reason.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-slate-800">{reason.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Wrench size={16} className="text-emerald-600" /> Kategori Penyelesaian
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Tindakan perbaikan yang paling sering dilakukan</p>
              <div className="mt-3 space-y-2">
                {data.bySolutionCategory.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                    Belum ada data kategori penyelesaian pada periode ini.
                  </p>
                )}
                {data.bySolutionCategory.slice(0, 6).map((solution, index) => {
                  const max = data.bySolutionCategory[0]?.count || 1
                  return (
                    <div key={solution.name} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[9px] font-black text-emerald-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-semibold text-slate-600">{solution.name}</p>
                        <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(5, (solution.count / max) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-slate-800">{solution.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── SLA ATTENTION & ASET ───────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <ShieldAlert size={16} className="text-rose-600" /> Papan Perhatian SLA
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">Tiket yang melewati batas respons — perlu eskalasi segera</p>
                </div>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${data.breachList.some((t) => ["NEW", "IN_PROGRESS", "PENDING", "REOPENED"].includes(t.status)) ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {data.breachList.filter((t) => ["NEW", "IN_PROGRESS", "PENDING", "REOPENED"].includes(t.status)).length} terbuka
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {data.breachList.filter((t) => ["NEW", "IN_PROGRESS", "PENDING", "REOPENED"].includes(t.status)).length === 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Tidak ada tiket terbuka yang melewati SLA saat ini.
                      {data.breachCount > 0 && (
                        <span className="mt-1 block text-[10px] font-normal text-emerald-600">
                          {data.breachCount} breach historis tercatat pada periode ini (sudah ditutup/selesai).
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {data.breachList.filter((t) => ["NEW", "IN_PROGRESS", "PENDING", "REOPENED"].includes(t.status)).map((ticket) => {
                  const severity = severityMeta(ticket.severity)
                  return (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/maintenance/it-osl/tickets?ticketId=${ticket.id}`}
                      className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition hover:border-rose-200 hover:bg-rose-50/50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${ticket.severity === "CRITICAL" ? "bg-rose-500" : ticket.severity === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-700">{ticket.ticketNumber}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black ${severity.badge}`}>{severity.label}</span>
                          <span className="text-[9px] font-bold text-slate-400">{statusMeta(ticket.status).label}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-600">{ticket.summary}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-[9px] text-slate-400">
                          <MapPin size={9} /> {ticket.location || "Tanpa lokasi"}
                          <span>•</span>
                          <UserRound size={9} /> {ticket.assignedTo || "Belum ditugaskan"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Umur</p>
                        <p className="text-[11px] font-black text-rose-600">{fmtMinutes(ticket.ageMinutes)}</p>
                        <p className="text-[9px] text-slate-400">batas {fmtMinutes(ticket.thresholdMinutes)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Package size={16} className="text-amber-600" /> Aset Rawan
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Aset dengan tiket terbanyak pada periode ini</p>
              <div className="mt-4 space-y-2.5">
                {data.topAssets.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada aset yang tercatat bermasalah.</p>
                )}
                {data.topAssets.slice(0, 5).map((asset, index) => (
                  <div key={asset.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[10px] font-black text-amber-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-700">{asset.name}</p>
                      <p className="truncate text-[9px] text-slate-400">{asset.assetCode} • {asset.location || "Tanpa lokasi"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-slate-800">{asset.count}</p>
                      <p className="text-[9px] text-slate-400">tiket</p>
                    </div>
                  </div>
                ))}
              </div>
              {data.partsUsed.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Wrench size={12} /> Sparepart terbanyak
                  </p>
                  <div className="mt-2 space-y-1">
                    {data.partsUsed.slice(0, 3).map((part) => (
                      <div key={`${part.partName}-${part.unit}`} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-slate-600">{part.partName}</span>
                        <span className="shrink-0 font-black text-slate-800">{part.quantity} {part.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── OPERASIONAL: BACKLOG, PM, SEVERITY, INSIGHT ────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Clock3 size={16} className="text-amber-600" /> Backlog Aging
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Umur tiket yang masih terbuka</p>
              <div className="mt-4 space-y-2.5">
                {[
                  { key: "d0_1", label: "0 – 1 hari", value: data.backlogAging.d0_1, color: "bg-emerald-500" },
                  { key: "d1_3", label: "1 – 3 hari", value: data.backlogAging.d1_3, color: "bg-sky-500" },
                  { key: "d3_7", label: "3 – 7 hari", value: data.backlogAging.d3_7, color: "bg-amber-500" },
                  { key: "gt7", label: "> 7 hari", value: data.backlogAging.gt7, color: "bg-rose-500" },
                ].map((bucket) => {
                  const max = Math.max(1, data.backlogAging.d0_1, data.backlogAging.d1_3, data.backlogAging.d3_7, data.backlogAging.gt7)
                  return (
                    <div key={bucket.key}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500">{bucket.label}</span>
                        <span className="font-black text-slate-800">{bucket.value}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${Math.max(bucket.value ? 5 : 0, (bucket.value / max) * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500">
                Rata-rata umur backlog: <b className="text-slate-800">{data.avgBacklogAgeDays} hari</b>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Wrench size={16} className="text-teal-600" /> Preventive & Aset
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Kesiapan pemeliharaan dan kondisi aset</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-teal-50 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-teal-600">Eksekusi PM</p>
                  <p className="text-lg font-black text-teal-800">{fmtNumber(data.pm.executions)}</p>
                  <p className="text-[9px] text-teal-600">{data.pm.activeSchedules} jadwal aktif</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Temuan PM</p>
                  <p className="text-lg font-black text-amber-800">{fmtNumber(data.pm.issueFound)}</p>
                  <p className="text-[9px] text-amber-600">{data.pm.completionRate}% berhasil</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Aset</p>
                  <p className="text-lg font-black text-slate-800">{fmtNumber(data.assets.total)}</p>
                  <p className="text-[9px] text-slate-400">{data.assets.byStatus.ACTIVE || 0} aktif</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">Garansi ≤30 hari</p>
                  <p className="text-lg font-black text-rose-800">{fmtNumber(data.assets.warrantyExpiring30d)}</p>
                  <p className="text-[9px] text-rose-600">perlu perpanjangan</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                {Object.entries(data.byTicketType).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-50 px-1 py-1.5">
                    <p className="text-[9px] font-bold text-slate-400">{TYPE_LABEL[key] || key}</p>
                    <p className="text-xs font-black text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Gauge size={16} className="text-rose-600" /> Severity
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Komposisi tingkat urgensi tiket</p>
              <div className="mt-4 h-[130px]">
                {severityChart && (
                  <MixedChart
                    type="bar"
                    data={severityChart}
                    options={{
                      indexAxis: "y" as const,
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: "#0f172a", padding: 8, bodyFont: { size: 10 }, cornerRadius: 6 },
                      },
                      scales: {
                        x: { beginAtZero: true, ticks: { precision: 0, font: { size: 9 }, color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" }, border: { display: false } },
                        y: { grid: { display: false }, ticks: { font: { size: 10, weight: "bold" }, color: "#64748b" } },
                      },
                    }}
                  />
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {Object.entries(data.bySeverity).map(([key, value]) => {
                  const meta = severityMeta(key)
                  const pct = data.total ? Math.round((value / data.total) * 100) : 0
                  return (
                    <div key={key} className="flex items-center gap-2 text-[10px]">
                      <span className={`rounded-md border px-1.5 py-0.5 font-black ${meta.badge}`}>{meta.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                      </div>
                      <span className="w-9 text-right font-black text-slate-800">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Lightbulb size={16} className="text-indigo-600" /> Insight & Rekomendasi
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Dibuat otomatis dari data periode terpilih</p>
              <div className="mt-3 space-y-2">
                {insights.slice(0, 5).map((line, index) => (
                  <div key={index} className="flex gap-2 rounded-lg bg-white/70 p-2 ring-1 ring-indigo-100/70">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-[10px] leading-relaxed text-slate-600">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── RECENT TICKETS ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <FileText size={16} className="text-slate-500" /> Aktivitas Tiket Terbaru
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">Perubahan terakhir pada periode {fmtDate(data.range.from)} — {fmtDate(data.range.to)}</p>
              </div>
              <Link
                href="/dashboard/maintenance/it-osl/tickets"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Lihat semua tiket
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-2.5">No. Tiket</th>
                    <th className="px-2 py-2.5">Ringkasan</th>
                    <th className="px-2 py-2.5">Kategori</th>
                    <th className="px-2 py-2.5">Lokasi</th>
                    <th className="px-2 py-2.5">Teknisi</th>
                    <th className="px-2 py-2.5 text-center">Severity</th>
                    <th className="px-2 py-2.5 text-center">Status</th>
                    <th className="px-2 py-2.5 text-center">SLA</th>
                    <th className="px-4 py-2.5 text-right">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-400">
                        Belum ada aktivitas tiket pada periode ini.
                      </td>
                    </tr>
                  )}
                  {data.recent.map((ticket) => {
                    const severity = severityMeta(ticket.severity)
                    const status = statusMeta(ticket.status)
                    return (
                      <tr key={ticket.id} className="border-b border-slate-50 transition hover:bg-slate-50/70 last:border-0">
                        <td className="px-4 py-2.5">
                          <Link href={`/dashboard/maintenance/it-osl/tickets?ticketId=${ticket.id}`} className="font-black text-indigo-600 hover:underline">
                            {ticket.ticketNumber}
                          </Link>
                        </td>
                        <td className="max-w-[260px] truncate px-2 py-2.5 font-semibold text-slate-700">{ticket.summary}</td>
                        <td className="px-2 py-2.5 text-slate-500">{ticket.category?.name || "-"}</td>
                        <td className="px-2 py-2.5 text-slate-500">{ticket.location?.name || "-"}</td>
                        <td className="px-2 py-2.5 text-slate-500">{ticket.assignedTo || "Belum ditugaskan"}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-black ${severity.badge}`}>{severity.label}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-black ${status.badge}`}>{status.label}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black ${ticket.slaBreach ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {ticket.slaBreach ? "BREACH" : "OK"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400">{fmtDate(ticket.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p className="pb-2 text-center text-[10px] text-slate-400">
            Data dihitung langsung dari ticketing engine IT-OSL. Gunakan tombol <b>Cetak PDF</b> untuk laporan resmi
            lengkap dengan kop perusahaan, ringkasan eksekutif, tabel analisa, dan kolom tanda tangan.
          </p>
        </>
      )}
    </div>
  )
}
