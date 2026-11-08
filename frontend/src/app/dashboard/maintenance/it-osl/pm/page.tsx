"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react"
import { ItOslAccessGuard } from "@/components/it-osl/ItOslAccessGuard"
import { ItOslNav } from "@/components/it-osl/ItOslNav"
import { canItOsl } from "@/lib/itOslPermissions"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"

/* ─────────────────────────── types ─────────────────────────── */

type PmStatus = "OVERDUE" | "DUE_SOON" | "SCHEDULED" | "PAUSED"

type AssetOpt = {
  id: string
  assetCode: string
  name: string
  assetType?: string | null
  brandModel?: string | null
  status?: string | null
  customerId?: string | null
  locationId?: string | null
  location?: { id: string; name: string } | null
  customer?: { id: string; name: string } | null
  recurring?: boolean
  ticketCount?: number
}

type CustomerOpt = { id: string; name: string; code?: string | null }

type CheckItem = { id: string; name: string; order?: number }

type ExecutionLite = {
  id: string
  executedAt: string
  status: string
  executor?: { id: string; name: string } | null
}

type Schedule = {
  id: string
  title: string
  description?: string | null
  intervalUnit: "DAY" | "WEEK" | "MONTH" | "YEAR"
  intervalValue: number
  intervalLabel: string
  priority: "LOW" | "MEDIUM" | "HIGH"
  isActive: boolean
  startDate: string
  nextDueAt: string | null
  lastExecutedAt: string | null
  status: PmStatus
  checkItems: CheckItem[]
  asset?: AssetOpt | null
  location?: { id: string; name: string } | null
  customer?: { id: string; name: string } | null
  executions?: ExecutionLite[]
  _count?: { executions: number }
}

type MatrixItem = {
  date: string
  status: "UPCOMING" | "OVERDUE" | "MISSED" | "DONE"
  execution: { id: string; executedAt: string; executor: string | null; result: string } | null
}

type MatrixCell = {
  periodKey: string
  due: number
  done: number
  status: "NONE" | "DONE" | "UPCOMING" | "OVERDUE" | "MISSED"
  items: MatrixItem[]
}

type MatrixRow = {
  scheduleId: string
  title: string
  assetId: string | null
  assetCode: string | null
  assetName: string | null
  assetType: string | null
  locationName: string | null
  customerName: string | null
  intervalUnit: Schedule["intervalUnit"]
  intervalValue: number
  intervalLabel: string
  isActive: boolean
  priority: Schedule["priority"]
  nextDueAt: string | null
  lastExecutedAt: string | null
  status: PmStatus
  cells: MatrixCell[]
}

type MatrixData = {
  from: string
  to: string
  granularity: "day" | "week" | "month"
  periods: { key: string; label: string; start: string; end: string }[]
  rows: MatrixRow[]
  summary: {
    totalSchedules: number
    activeSchedules: number
    pausedSchedules: number
    overdue: number
    dueSoon: number
    scheduled: number
    done: number
    missed: number
    complianceRate: number
  }
}

type EditorState = {
  mode: "create" | "edit"
  id?: string
  title: string
  assetId: string
  intervalUnit: Schedule["intervalUnit"]
  intervalValue: number
  startDate: string
  priority: Schedule["priority"]
  description: string
  itemsText: string
  isActive: boolean
}

/* ─────────────────────────── helpers ─────────────────────────── */

const pad = (value: number) => String(value).padStart(2, "0")

const toIsoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

const todayInput = () => {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const fmtDate = (value?: string | null, withYear = true) => {
  const date = parseDate(value)
  if (!date) return "—"
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  })
}

const fmtDateTime = (value?: string | null) => {
  const date = parseDate(value)
  if (!date) return "—"
  return `${fmtDate(value)} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
}

const fmtInterval = (unit: Schedule["intervalUnit"], value: number) => {
  const v = Math.max(1, Number(value) || 1)
  if (v === 1) {
    return { DAY: "Harian", WEEK: "Mingguan", MONTH: "Bulanan", YEAR: "Tahunan" }[unit]
  }
  const label = { DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" }[unit]
  return `Tiap ${v} ${label}`
}

const rangeForMonths = (months: number) => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const from = new Date(Date.UTC(y, m - 2, 1))
  const to = new Date(Date.UTC(y, m + months - 2, 0))
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

const statusMeta: Record<PmStatus, { label: string; dot: string; chip: string }> = {
  OVERDUE: { label: "Terlambat", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  DUE_SOON: { label: "Jatuh tempo", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  SCHEDULED: { label: "Terjadwal", dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  PAUSED: { label: "Pause", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600 ring-slate-200" },
}

const cellTone: Record<MatrixCell["status"], string> = {
  NONE: "bg-slate-50 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600",
  DONE: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  UPCOMING: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
  OVERDUE: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/30",
  MISSED: "bg-rose-500 text-white ring-1 ring-inset ring-rose-600 hover:bg-rose-600",
}

const presetList: { label: string; unit: Schedule["intervalUnit"]; value: number }[] = [
  { label: "Harian", unit: "DAY", value: 1 },
  { label: "Mingguan", unit: "WEEK", value: 1 },
  { label: "Bulanan", unit: "MONTH", value: 1 },
  { label: "2 Bulan", unit: "MONTH", value: 2 },
  { label: "3 Bulan", unit: "MONTH", value: 3 },
  { label: "6 Bulan", unit: "MONTH", value: 6 },
  { label: "Tahunan", unit: "YEAR", value: 1 },
]

const checklistTemplates: { match: string[]; items: string[] }[] = [
  {
    match: ["cctv", "kamera", "nvr", "dvr"],
    items: [
      "Cek rekaman 7 hari terakhir",
      "Bersihkan lensa & housing kamera",
      "Cek kesehatan HDD/NVR",
      "Cek konektivitas & kabel kamera",
      "Cek adaptor/PoE dan suhu perangkat",
    ],
  },
  {
    match: ["pc", "komputer", "laptop", "desktop", "workstation"],
    items: [
      "Bersihkan debu CPU, kipas & heatsink",
      "Cek suhu dan performa sistem",
      "Cek kesehatan disk (SMART)",
      "Update OS, driver & antivirus",
      "Verifikasi backup data penting",
    ],
  },
  {
    match: ["printer", "scanner", "plotter"],
    items: [
      "Test print & scan",
      "Cek level tinta/toner",
      "Bersihkan roller & jalur kertas",
      "Cek koneksi jaringan/USB",
      "Cek kualitas hasil cetak",
    ],
  },
  {
    match: ["router", "switch", "access point", "ap", "firewall", "jaringan", "network"],
    items: [
      "Cek konektivitas & latency",
      "Cek suhu dan beban perangkat",
      "Periksa log error / packet loss",
      "Cek firmware & konfigurasi backup",
      "Periksa kabel, konektor & grounding",
    ],
  },
  {
    match: ["server", "nas", "storage"],
    items: [
      "Cek suhu ruang server & pendingin",
      "Cek status RAID/disk & kapasitas",
      "Cek log sistem & service kritis",
      "Verifikasi backup terjadwal",
      "Cek UPS, baterai & distribusi daya",
    ],
  },
  {
    match: ["ac", "pendingin", "hvac"],
    items: [
      "Cek suhu & aliran udara",
      "Bersihkan filter udara",
      "Cek drainase & kebocoran",
      "Cek tekanan freon",
      "Cek suara/vibrasi kompresor",
    ],
  },
]

const templateFor = (asset?: AssetOpt | null) => {
  if (!asset) return null
  const haystack = `${asset.assetType || ""} ${asset.name || ""} ${asset.brandModel || ""}`.toLowerCase()
  return checklistTemplates.find((template) => template.match.some((key) => haystack.includes(key))) || null
}

/* ─────────────────────────── page ─────────────────────────── */

export default function ItOslPmPage() {
  return (
    <ItOslAccessGuard>
      <ItOslPmContent />
    </ItOslAccessGuard>
  )
}

function ItOslPmContent() {
  const { data: session, status } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || ""
  const currentRole = (session?.user as { role?: string })?.role || ""
  const currentEmail = session?.user?.email || ""
  const canPlan = canItOsl(currentRole, "pm.plan")
  const canExecute = canItOsl(currentRole, "pm.execute")

  const authHeaders = useMemo<Record<string, string>>(
    () => ({
      "x-user-id": currentUserId,
      "x-user-role": currentRole,
      "x-user-email": currentEmail,
    }),
    [currentUserId, currentRole, currentEmail]
  )

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [assets, setAssets] = useState<AssetOpt[]>([])
  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [matrix, setMatrix] = useState<MatrixData | null>(null)
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [loadingMatrix, setLoadingMatrix] = useState(true)
  const [error, setError] = useState("")

  const [tab, setTab] = useState<"matrix" | "list">("matrix")
  const [rangeMonths, setRangeMonths] = useState(12)
  const [granularity, setGranularity] = useState<"auto" | "month" | "week" | "day">("auto")
  const [customerId, setCustomerId] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL")

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editorSaving, setEditorSaving] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [assetSearch, setAssetSearch] = useState("")

  const [execTarget, setExecTarget] = useState<Schedule | null>(null)
  const [execItems, setExecItems] = useState<{ checkItemId: string | null; name: string; result: "NORMAL" | "ATTENTION" | "ISSUE"; notes?: string }[]>([])
  const [execNotes, setExecNotes] = useState("")
  const [execSaving, setExecSaving] = useState(false)

  const [cellDetail, setCellDetail] = useState<{ row: MatrixRow; cell: MatrixCell } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)

  const notify = useCallback((type: "success" | "error" | "info", message: string) => {
    setToast({ type, message })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(timer)
  }, [toast])

  const apiGet = useCallback(
    async (path: string) => {
      const res = await fetch(`${API}${path}`, { headers: authHeaders, cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
      return data
    },
    [authHeaders]
  )

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true)
    try {
      const data = await apiGet("/api/it-osl/pm/schedules")
      setSchedules(Array.isArray(data) ? data : [])
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat jadwal PM")
    } finally {
      setLoadingSchedules(false)
    }
  }, [apiGet])

  const loadMaster = useCallback(async () => {
    try {
      const [assetData, customerData] = await Promise.all([
        apiGet("/api/it-osl/assets"),
        apiGet("/api/it-osl/customers"),
      ])
      setAssets(Array.isArray(assetData) ? assetData : [])
      setCustomers(Array.isArray(customerData) ? customerData : [])
    } catch {
      /* master data opsional untuk tampilan; error utama ditangani di load */
    }
  }, [apiGet])

  const loadMatrix = useCallback(async () => {
    setLoadingMatrix(true)
    try {
      const range = rangeForMonths(rangeMonths)
      const params = new URLSearchParams({
        from: range.from,
        to: range.to,
        granularity,
        includePaused: "true",
      })
      if (customerId) params.set("customerId", customerId)
      const data = await apiGet(`/api/it-osl/pm/matrix?${params.toString()}`)
      setMatrix(data)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat matrix PM")
    } finally {
      setLoadingMatrix(false)
    }
  }, [apiGet, rangeMonths, granularity, customerId])

  useEffect(() => {
    if (status !== "authenticated") return
    loadSchedules()
    loadMaster()
  }, [status, loadSchedules, loadMaster])

  useEffect(() => {
    if (status !== "authenticated") return
    loadMatrix()
  }, [status, loadMatrix])

  const refreshAll = () => {
    loadSchedules()
    loadMatrix()
  }

  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase()
    return schedules.filter((schedule) => {
      if (statusFilter === "ACTIVE" && !schedule.isActive) return false
      if (statusFilter === "PAUSED" && schedule.isActive) return false
      if (customerId && (schedule.asset?.customerId || schedule.customer?.id) !== customerId) return false
      if (!term) return true
      const haystack = [
        schedule.title,
        schedule.asset?.assetCode,
        schedule.asset?.name,
        schedule.asset?.brandModel,
        schedule.customer?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [schedules, search, statusFilter, customerId])

  const filteredRows = useMemo(() => {
    if (!matrix) return []
    const term = search.trim().toLowerCase()
    return matrix.rows.filter((row) => {
      if (statusFilter === "ACTIVE" && !row.isActive) return false
      if (statusFilter === "PAUSED" && row.isActive) return false
      if (!term) return true
      const haystack = [row.assetCode, row.assetName, row.title, row.customerName, row.locationName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [matrix, search, statusFilter])

  const summary = matrix?.summary
  const range = rangeForMonths(rangeMonths)

  /* ── editor ── */

  const openCreate = () => {
    setEditorError("")
    setAssetSearch("")
    setEditor({
      mode: "create",
      title: "",
      assetId: "",
      intervalUnit: "MONTH",
      intervalValue: 1,
      startDate: todayInput(),
      priority: "MEDIUM",
      description: "",
      itemsText: "",
      isActive: true,
    })
  }

  const openEdit = (schedule: Schedule) => {
    setEditorError("")
    setAssetSearch("")
    setEditor({
      mode: "edit",
      id: schedule.id,
      title: schedule.title,
      assetId: schedule.asset?.id || "",
      intervalUnit: schedule.intervalUnit,
      intervalValue: schedule.intervalValue,
      startDate: schedule.startDate ? toIsoDate(new Date(schedule.startDate)) : todayInput(),
      priority: schedule.priority || "MEDIUM",
      description: schedule.description || "",
      itemsText: schedule.checkItems.map((item) => item.name).join("\n"),
      isActive: schedule.isActive,
    })
  }

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === editor?.assetId) || null,
    [assets, editor?.assetId]
  )

  const assetOptions = useMemo(() => {
    const term = assetSearch.trim().toLowerCase()
    if (!term) return assets
    return assets.filter((asset) =>
      `${asset.assetCode} ${asset.name} ${asset.assetType || ""} ${asset.customer?.name || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [assets, assetSearch])

  const applyAsset = (assetId: string) => {
    if (!editor) return
    const asset = assets.find((item) => item.id === assetId)
    const autoTitle = asset && (!editor.title.trim() || editor.title.startsWith("PM Rutin")) ? `PM Rutin — ${asset.name}` : editor.title
    setEditor({ ...editor, assetId, title: autoTitle })
  }

  const saveEditor = async () => {
    if (!editor) return
    if (!editor.title.trim()) {
      setEditorError("Judul jadwal wajib diisi.")
      return
    }
    if (!editor.startDate) {
      setEditorError("Tanggal mulai wajib diisi.")
      return
    }
    setEditorSaving(true)
    setEditorError("")
    try {
      const payload = {
        title: editor.title.trim(),
        assetId: editor.assetId || null,
        intervalUnit: editor.intervalUnit,
        intervalValue: Math.max(1, Number(editor.intervalValue) || 1),
        startDate: editor.startDate,
        priority: editor.priority,
        description: editor.description.trim() || null,
        isActive: editor.isActive,
        checkItems: editor.itemsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
      }
      const res = await fetch(
        editor.mode === "edit" ? `${API}/api/it-osl/pm/schedules/${editor.id}` : `${API}/api/it-osl/pm/schedules`,
        {
          method: editor.mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Gagal menyimpan jadwal")
      notify("success", editor.mode === "edit" ? "Jadwal PM diperbarui." : "Jadwal PM dibuat.")
      setEditor(null)
      refreshAll()
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "Gagal menyimpan jadwal")
    } finally {
      setEditorSaving(false)
    }
  }

  const toggleSchedule = async (schedule: Schedule) => {
    try {
      const res = await fetch(`${API}/api/it-osl/pm/schedules/${schedule.id}/toggle`, {
        method: "PATCH",
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Gagal mengubah status")
      notify("success", data.isActive ? "Jadwal diaktifkan kembali." : "Jadwal dipause.")
      refreshAll()
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal mengubah status")
    }
  }

  const deleteSchedule = async () => {
    if (!confirmDelete) return
    try {
      const res = await fetch(`${API}/api/it-osl/pm/schedules/${confirmDelete.id}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Gagal menghapus jadwal")
      notify("success", "Jadwal PM dihapus.")
      setConfirmDelete(null)
      refreshAll()
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menghapus jadwal")
    }
  }

  /* ── execute ── */

  const startExecution = (schedule: Schedule) => {
    if (!canExecute) {
      notify("error", "Role Anda tidak memiliki izin eksekusi PM.")
      return
    }
    setExecTarget(schedule)
    setExecNotes("")
    setExecItems(
      schedule.checkItems.map((item) => ({
        checkItemId: item.id,
        name: item.name,
        result: "NORMAL",
        notes: "",
      }))
    )
  }

  const submitExecution = async () => {
    if (!execTarget) return
    setExecSaving(true)
    try {
      const res = await fetch(`${API}/api/it-osl/pm/schedules/${execTarget.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ notes: execNotes, items: execItems }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Gagal menyimpan eksekusi")
      const hasIssue = execItems.some((item) => item.result === "ISSUE")
      notify(
        "success",
        hasIssue
          ? "Eksekusi tersimpan. Temuan bermasalah otomatis dibuatkan tiket PM."
          : "Eksekusi tersimpan. Checklist selesai tanpa temuan."
      )
      setExecTarget(null)
      refreshAll()
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan eksekusi")
    } finally {
      setExecSaving(false)
    }
  }

  const scheduleById = (id: string) => schedules.find((schedule) => schedule.id === id)

  /* ── render ── */

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8 space-y-4 font-sans">
      <ItOslNav />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <CalendarCheck2 size={21} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">IT Maintenance</div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Preventive Maintenance
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jadwal perawatan per aset — harian, mingguan, bulanan, 2/3/6 bulan, tahunan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          >
            <RefreshCw size={14} className={loadingMatrix || loadingSchedules ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canPlan && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition"
            >
              <Plus size={15} strokeWidth={2.6} />
              Jadwal Baru
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <SummaryCard
          icon={<Wrench size={16} />}
          tone="indigo"
          label="Jadwal aktif"
          value={summary ? `${summary.activeSchedules}` : "—"}
          hint={summary ? `${summary.totalSchedules} total jadwal` : "Memuat…"}
        />
        <SummaryCard
          icon={<AlertTriangle size={16} />}
          tone="rose"
          label="Terlambat"
          value={summary ? `${summary.overdue}` : "—"}
          hint={summary ? `${summary.missed} occurrence terlewat` : "Memuat…"}
        />
        <SummaryCard
          icon={<Clock3 size={16} />}
          tone="amber"
          label="Jatuh tempo 7 hari"
          value={summary ? `${summary.dueSoon}` : "—"}
          hint="Termasuk hari ini"
        />
        <SummaryCard
          icon={<CheckCircle2 size={16} />}
          tone="emerald"
          label="Kepatuhan"
          value={summary ? `${summary.complianceRate}%` : "—"}
          hint={summary ? `${summary.done} eksekusi dalam rentang` : "Memuat…"}
        />
      </section>

      {/* toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setTab("matrix")}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === "matrix" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={14} /> Matrix
            </button>
            <button
              onClick={() => setTab("list")}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === "list" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={14} /> Daftar Jadwal
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <div className="relative col-span-2 sm:col-span-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari aset / jadwal…"
                className="w-full sm:w-56 pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">Semua customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PAUSED">Pause</option>
            </select>
          </div>
        </div>

        {tab === "matrix" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rentang</span>
            {[6, 12, 18].map((months) => (
              <button
                key={months}
                onClick={() => setRangeMonths(months)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                  rangeMonths === months
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                {months} bln
              </button>
            ))}
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Granularitas</span>
            <select
              value={granularity}
              onChange={(event) => setGranularity(event.target.value as typeof granularity)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="auto">Otomatis</option>
              <option value="month">Bulanan</option>
              <option value="week">Mingguan</option>
              <option value="day">Harian</option>
            </select>
            <span className="ml-auto text-[10px] text-slate-400">
              {fmtDate(matrix?.from || range.from)} — {fmtDate(matrix?.to || range.to)}
            </span>
          </div>
        )}
      </section>

      {tab === "matrix" ? (
        <MatrixView
          matrix={matrix}
          rows={filteredRows}
          loading={loadingMatrix}
          onOpenCell={(row, cell) => setCellDetail({ row, cell })}
          onOpenCreate={canPlan ? openCreate : undefined}
        />
      ) : (
        <ListView
          schedules={filteredSchedules}
          loading={loadingSchedules}
          canPlan={canPlan}
          canExecute={canExecute}
          onExecute={startExecution}
          onEdit={openEdit}
          onToggle={toggleSchedule}
          onDelete={(schedule) => setConfirmDelete(schedule)}
          onOpenCreate={canPlan ? openCreate : undefined}
        />
      )}

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 px-1">
        <span className="font-bold uppercase tracking-wider text-slate-400">Legenda matrix</span>
        <Legend tone="bg-emerald-100 text-emerald-700 ring-emerald-200" label="Selesai" />
        <Legend tone="bg-indigo-100 text-indigo-700 ring-indigo-200" label="Terjadwal" />
        <Legend tone="bg-amber-200 text-amber-800 ring-amber-300" label="Terlambat" />
        <Legend tone="bg-rose-500 text-white ring-rose-600" label="Terlewat" />
        <span className="inline-flex items-center gap-1">
          <span className="font-mono">1/2</span> = selesai / jumlah jadwal
        </span>
      </div>

      {/* ── editor modal ── */}
      {editor && (
        <Modal onClose={() => setEditor(null)} title={editor.mode === "edit" ? "Edit Jadwal PM" : "Jadwal PM Baru"} subtitle="Hubungkan ke aset, atur interval, lalu susun checklist.">
          <div className="space-y-4">
            {editorError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{editorError}</div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label>Aset yang dirawat</Label>
                  <input
                    value={assetSearch}
                    onChange={(event) => setAssetSearch(event.target.value)}
                    placeholder="Cari kode / nama aset…"
                    className={inputClass}
                  />
                  <select
                    value={editor.assetId}
                    onChange={(event) => applyAsset(event.target.value)}
                    className={`${inputClass} mt-2`}
                  >
                    <option value="">— Tanpa aset (jadwal umum) —</option>
                    {assetOptions.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetCode} — {asset.name}
                        {asset.customer?.name ? ` · ${asset.customer.name}` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedAsset && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedAsset.assetCode}</span>
                        <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                          {selectedAsset.assetType || "Aset"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} /> {selectedAsset.location?.name || "Tanpa lokasi"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Info size={10} /> {selectedAsset.customer?.name || "Tanpa customer"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Wrench size={10} /> {selectedAsset.ticketCount ?? 0} tiket / 90 hari
                        </span>
                      </div>
                      {selectedAsset.recurring && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          <AlertTriangle size={10} /> Aset sering bermasalah — pertimbangkan interval lebih pendek.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Judul jadwal</Label>
                  <input
                    value={editor.title}
                    onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                    placeholder="Contoh: PM Rutin — PC Produksi"
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label>Tanggal mulai</Label>
                  <input
                    type="date"
                    value={editor.startDate}
                    onChange={(event) => setEditor({ ...editor, startDate: event.target.value })}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Tanggal pertama jadwal. Jatuh tempo berikutnya dihitung otomatis dari interval.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Interval perawatan</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {presetList.map((preset) => {
                      const active = editor.intervalUnit === preset.unit && editor.intervalValue === preset.value
                      return (
                        <button
                          key={preset.label}
                          onClick={() =>
                            setEditor({ ...editor, intervalUnit: preset.unit, intervalValue: preset.value })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                            active
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={editor.intervalValue}
                      onChange={(event) =>
                        setEditor({ ...editor, intervalValue: Math.max(1, Number(event.target.value) || 1) })
                      }
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                    <select
                      value={editor.intervalUnit}
                      onChange={(event) =>
                        setEditor({ ...editor, intervalUnit: event.target.value as Schedule["intervalUnit"] })
                      }
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="DAY">Hari</option>
                      <option value="WEEK">Minggu</option>
                      <option value="MONTH">Bulan</option>
                      <option value="YEAR">Tahun</option>
                    </select>
                    <span className="text-[11px] text-slate-500">{fmtInterval(editor.intervalUnit, editor.intervalValue)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Prioritas</Label>
                    <select
                      value={editor.priority}
                      onChange={(event) => setEditor({ ...editor, priority: event.target.value as Schedule["priority"] })}
                      className={inputClass}
                    >
                      <option value="LOW">Rendah</option>
                      <option value="MEDIUM">Sedang</option>
                      <option value="HIGH">Tinggi</option>
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <button
                      onClick={() => setEditor({ ...editor, isActive: !editor.isActive })}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                        editor.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {editor.isActive ? "Aktif" : "Pause"}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Deskripsi (opsional)</Label>
                  <textarea
                    value={editor.description}
                    onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                    placeholder="Catatan teknis / lingkup pekerjaan…"
                    className={`${inputClass} min-h-[64px]`}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Checklist pemeriksaan (1 baris 1 item)</Label>
                {templateFor(selectedAsset) && (
                  <button
                    onClick={() => setEditor({ ...editor, itemsText: templateFor(selectedAsset)!.items.join("\n") })}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <Sparkles size={12} /> Gunakan template
                  </button>
                )}
              </div>
              <textarea
                value={editor.itemsText}
                onChange={(event) => setEditor({ ...editor, itemsText: event.target.value })}
                placeholder={"Cek suhu & kipas\nCek kesehatan disk\nVerifikasi backup"}
                className={`${inputClass} min-h-[110px] font-mono text-[11px]`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={() => setEditor(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={saveEditor}
                disabled={editorSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
              >
                {editorSaving && <Loader2 size={13} className="animate-spin" />}
                {editor.mode === "edit" ? "Simpan Perubahan" : "Simpan Jadwal"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── execute modal ── */}
      {execTarget && (
        <Modal
          onClose={() => setExecTarget(null)}
          title="Eksekusi Checklist PM"
          subtitle={`${execTarget.asset?.assetCode || "Tanpa aset"} · ${execTarget.title}`}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Due {fmtDate(execTarget.nextDueAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wrench size={12} /> {execTarget.intervalLabel}
              </span>
            </div>

            {execItems.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Jadwal ini belum memiliki checklist. Tambahkan item lewat Edit terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                {execItems.map((item, index) => (
                  <div
                    key={`${item.checkItemId}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                    <div className="mt-2 flex gap-1">
                      {(["NORMAL", "ATTENTION", "ISSUE"] as const).map((result) => (
                        <button
                          key={result}
                          onClick={() =>
                            setExecItems((prev) =>
                              prev.map((entry, idx) => (idx === index ? { ...entry, result } : entry))
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                            item.result === result
                              ? result === "ISSUE"
                                ? "bg-rose-600 text-white border-rose-600"
                                : result === "ATTENTION"
                                  ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {result === "NORMAL" ? "Normal" : result === "ATTENTION" ? "Perhatian" : "Bermasalah"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Catatan hasil</Label>
              <textarea
                value={execNotes}
                onChange={(event) => setExecNotes(event.target.value)}
                placeholder="Ringkasan hasil pemeriksaan, tindakan, atau rekomendasi…"
                className={`${inputClass} min-h-[70px]`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={() => setExecTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={submitExecution}
                disabled={execSaving || execItems.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/25"
              >
                {execSaving && <Loader2 size={13} className="animate-spin" />}
                Simpan Eksekusi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── cell detail ── */}
      {cellDetail && (
        <Modal
          onClose={() => setCellDetail(null)}
          title="Detail Jadwal"
          subtitle={`${cellDetail.row.assetCode || "Tanpa aset"} · ${cellDetail.row.title}`}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>{cellDetail.row.intervalLabel}</span>
              <span>·</span>
              <span>{cellDetail.cell.due} jadwal pada periode ini</span>
              <span>·</span>
              <span>{cellDetail.cell.done} selesai</span>
            </div>

            {cellDetail.cell.items.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                Tidak ada jadwal pada periode ini.
              </div>
            ) : (
              <div className="space-y-2">
                {cellDetail.cell.items.map((item) => (
                  <div
                    key={`${item.date}-${item.status}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{fmtDate(item.date)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {item.execution
                          ? `Dieksekusi ${fmtDateTime(item.execution.executedAt)}${item.execution.executor ? ` · ${item.execution.executor}` : ""}`
                          : "Belum ada eksekusi"}
                      </p>
                    </div>
                    <OccurrenceBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={() => setCellDetail(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Tutup
              </button>
              {canExecute && (
                <button
                  onClick={() => {
                    const schedule = scheduleById(cellDetail.row.scheduleId)
                    setCellDetail(null)
                    if (schedule) startExecution(schedule)
                    else notify("info", "Muat ulang daftar jadwal untuk mengeksekusi dari matrix.")
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25"
                >
                  <Play size={13} /> Eksekusi
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── delete confirm ── */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Hapus Jadwal PM?" subtitle={confirmDelete.title}>
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Jadwal beserta riwayat eksekusinya akan dihapus permanen. Untuk menghentikan sementara, gunakan
              tombol <span className="font-bold">Pause</span>.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={deleteSchedule}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-[200] max-w-sm">
          <div
            className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-white text-emerald-700"
                : toast.type === "error"
                  ? "border-rose-200 bg-white text-rose-700"
                  : "border-indigo-200 bg-white text-indigo-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            ) : (
              <Info size={15} className="mt-0.5 shrink-0" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {canPlan && (
        <button
          onClick={openCreate}
          className="fixed bottom-20 right-4 sm:hidden w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
          aria-label="Buat Jadwal PM Baru"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────── sub-components ─────────────────────────── */

const inputClass =
  "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</label>
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone: "indigo" | "rose" | "amber" | "emerald"
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  } as const
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-400">{hint}</p>
    </div>
  )
}

function MatrixView({
  matrix,
  rows,
  loading,
  onOpenCell,
  onOpenCreate,
}: {
  matrix: MatrixData | null
  rows: MatrixRow[]
  loading: boolean
  onOpenCell: (row: MatrixRow, cell: MatrixCell) => void
  onOpenCreate?: () => void
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 flex flex-col items-center justify-center gap-2 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <Loader2 size={20} className="animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Menyusun matrix jadwal…</span>
      </div>
    )
  }

  if (!matrix || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-6 flex flex-col items-center justify-center gap-2 text-center dark:border-slate-700 dark:bg-slate-900">
        <CalendarCheck2 size={26} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada jadwal PM</p>
        <p className="max-w-sm text-xs text-slate-500">
          Buat jadwal pertama dan hubungkan ke aset. Jatuh tempo akan muncul otomatis di matrix.
        </p>
        {onOpenCreate && (
          <button
            onClick={onOpenCreate}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            <Plus size={14} /> Buat Jadwal
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[240px] max-w-[280px] bg-white px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                Aset / Jadwal
              </th>
              {matrix.periods.map((period) => (
                <th
                  key={period.key}
                  className="min-w-[56px] px-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800"
                >
                  {period.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.scheduleId} className={rowIndex % 2 ? "bg-slate-50/40 dark:bg-slate-800/20" : ""}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${statusMeta[row.status].dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400 truncate">
                          {row.assetCode || "TANPA ASET"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {row.intervalUnit === "DAY"
                            ? "Harian"
                            : row.intervalUnit === "WEEK"
                              ? "Mingguan"
                              : row.intervalUnit === "YEAR"
                                ? "Tahunan"
                                : `${row.intervalValue}x bulan`}
                        </span>
                      </div>
                      <p className="truncate text-[11.5px] font-semibold text-slate-900 dark:text-white">
                        {row.assetName || row.title}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{row.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[9.5px] text-slate-400">
                        <span>{row.locationName || "Tanpa lokasi"}</span>
                        <span>·</span>
                        <span className={row.status === "OVERDUE" ? "text-rose-600 font-bold" : ""}>
                          Due {fmtDate(row.nextDueAt, false)}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                {row.cells.map((cell) => (
                  <td key={`${row.scheduleId}-${cell.periodKey}`} className="px-0.5 py-1 border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => cell.due > 0 && onOpenCell(row, cell)}
                      disabled={cell.due === 0}
                      className={`w-full min-w-[48px] h-9 rounded-lg text-[10px] font-bold transition ${cellTone[cell.status]} ${
                        cell.due === 0 ? "cursor-default" : "cursor-pointer"
                      }`}
                      title={
                        cell.due
                          ? `${cell.due} jadwal · ${cell.done} selesai (${cell.status})`
                          : "Tidak ada jadwal"
                      }
                    >
                      {cell.due > 0 ? (
                        <span className="inline-flex items-center justify-center gap-0.5">
                          {cell.status === "MISSED" && <AlertTriangle size={9} />}
                          {cell.done === cell.due && cell.due > 0 && cell.status !== "MISSED" && (
                            <CheckCircle2 size={9} />
                          )}
                          {cell.done}/{cell.due}
                        </span>
                      ) : (
                        "·"
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ListView({
  schedules,
  loading,
  canPlan,
  canExecute,
  onExecute,
  onEdit,
  onToggle,
  onDelete,
  onOpenCreate,
}: {
  schedules: Schedule[]
  loading: boolean
  canPlan: boolean
  canExecute: boolean
  onExecute: (schedule: Schedule) => void
  onEdit: (schedule: Schedule) => void
  onToggle: (schedule: Schedule) => void
  onDelete: (schedule: Schedule) => void
  onOpenCreate?: () => void
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 flex flex-col items-center justify-center gap-2 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <Loader2 size={20} className="animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Memuat jadwal PM…</span>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-6 flex flex-col items-center justify-center gap-2 text-center dark:border-slate-700 dark:bg-slate-900">
        <Wrench size={26} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada jadwal PM</p>
        {onOpenCreate && (
          <button
            onClick={onOpenCreate}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            <Plus size={14} /> Buat Jadwal
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* desktop table */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {["Aset / Jadwal", "Interval", "Jatuh Tempo", "Terakhir", "Status", "Eksekusi", ""].map((header) => (
                <th
                  key={header || "actions"}
                  className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${header === "" ? "text-right" : ""}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/30">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${statusMeta[schedule.status].dot}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{schedule.title}</p>
                      <p className="text-[10px] text-slate-500">
                        {schedule.asset?.assetCode || "Tanpa aset"}
                        {schedule.asset?.name ? ` · ${schedule.asset.name}` : ""}
                        {schedule.asset?.customer?.name ? ` · ${schedule.asset.customer.name}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-300">{schedule.intervalLabel}</td>
                <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {fmtDate(schedule.nextDueAt)}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-slate-500">
                  {schedule.lastExecutedAt ? fmtDate(schedule.lastExecutedAt) : "Belum pernah"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ring-inset ${statusMeta[schedule.status].chip}`}
                  >
                    {statusMeta[schedule.status].label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-slate-500">{schedule._count?.executions ?? 0}x</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {canExecute && (
                      <IconButton title="Eksekusi" onClick={() => onExecute(schedule)} disabled={!schedule.isActive}>
                        <Play size={13} />
                      </IconButton>
                    )}
                    {canPlan && (
                      <>
                        <IconButton title="Edit" onClick={() => onEdit(schedule)}>
                          <Pencil size={13} />
                        </IconButton>
                        <IconButton title={schedule.isActive ? "Pause" : "Aktifkan"} onClick={() => onToggle(schedule)}>
                          {schedule.isActive ? <Pause size={13} /> : <Play size={13} />}
                        </IconButton>
                        <IconButton title="Hapus" onClick={() => onDelete(schedule)} tone="danger">
                          <Trash2 size={13} />
                        </IconButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="md:hidden space-y-2.5">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{schedule.title}</p>
                <p className="text-[10px] text-slate-500">
                  {schedule.asset?.assetCode || "Tanpa aset"}
                  {schedule.asset?.name ? ` · ${schedule.asset.name}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${statusMeta[schedule.status].chip}`}>
                {statusMeta[schedule.status].label}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/50">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Interval</p>
                <p className="text-slate-700 dark:text-slate-200">{schedule.intervalLabel}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/50">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Jatuh tempo</p>
                <p className="text-slate-700 dark:text-slate-200">{fmtDate(schedule.nextDueAt)}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {canExecute && (
                <button
                  onClick={() => onExecute(schedule)}
                  disabled={!schedule.isActive}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10.5px] font-bold text-white disabled:opacity-50"
                >
                  <Play size={12} /> Eksekusi
                </button>
              )}
              {canPlan && (
                <>
                  <button
                    onClick={() => onEdit(schedule)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => onToggle(schedule)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    {schedule.isActive ? <Pause size={12} /> : <Play size={12} />}
                    {schedule.isActive ? "Pause" : "Aktif"}
                  </button>
                  <button
                    onClick={() => onDelete(schedule)}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children,
  disabled,
  tone = "default",
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  tone?: "default" | "danger"
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:opacity-40 ${
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ring-1 ring-inset ${tone}`} />
      {label}
    </span>
  )
}

function OccurrenceBadge({ status }: { status: MatrixItem["status"] }) {
  const map = {
    DONE: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    UPCOMING: { label: "Terjadwal", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    OVERDUE: { label: "Terlambat", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    MISSED: { label: "Terlewat", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  } as const
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${map[status].cls}`}>
      {map[status].label}
    </span>
  )
}
