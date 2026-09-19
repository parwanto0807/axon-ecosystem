"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Package, QrCode, MapPin, Search, AlertTriangle, CheckCircle2, 
  Upload, Download, X, Loader2, User, 
  Edit2, Eye, Trash2, LayoutGrid, LayoutList, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Printer, ArrowUpDown, RotateCcw, Plus, Wrench,
  CheckSquare, Square, Info, FileSpreadsheet, Copy, Check, Calendar,
  MessageCircle, Users
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type PicOpt = {
  id: string
  name: string
  position?: string | null
  department?: string | null
  phone?: string | null
}

type Asset = {
  id: string
  assetCode: string
  name: string
  assetType: string | null
  brandModel: string | null
  serialNumber: string | null
  status: string
  location: { id: string; name: string; code?: string } | null
  locationId: string | null
  picId: string | null
  pic: PicOpt | null
  picUser: { id: string; name: string | null; email: string | null } | null
  picUserId: string | null
  ticketCount: number
  recurring: boolean
  warrantyUntil: string | null
  purchaseDate: string | null
  notes: string | null
  createdAt?: string
}

type TicketItem = {
  id: string
  ticketNumber: string
  summary: string
  status: string
  severity: string
  createdAt: string
  category?: { name: string; groupName: string } | null
  location?: { name: string } | null
}

type AssetDetail = Asset & {
  tickets?: TicketItem[]
}

type Location = { id: string; code: string; name: string }

const ASSET_TYPES = [
  "Switch", "Router", "Access Point", "PC/Desktop", "Laptop", 
  "Printer", "CCTV", "NVR/DVR", "UPS", "Server", "Barrier Gate", "Lainnya"
]

const STATUS_OPTS = [
  { v: "ACTIVE", l: "Aktif", c: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { v: "IN_REPAIR", l: "Perbaikan", c: "bg-amber-100 text-amber-700 border-amber-200" },
  { v: "RETIRED", l: "Afkir", c: "bg-slate-200 text-slate-700 border-slate-300" },
]

export default function ItOslAssetsPage() {
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [pics, setPics] = useState<PicOpt[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [q, setQ] = useState("")
  const [filterLocation, setFilterLocation] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterPic, setFilterPic] = useState<string>("")
  const [filterWarranty, setFilterWarranty] = useState<string>("") // "all" | "active" | "expired" | "none"
  const [filterRecurringOnly, setFilterRecurringOnly] = useState(false)

  // View & Pagination
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Sorting
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchPrint, setShowBatchPrint] = useState(false)

  // Modals & Detail
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState({
    name: "", assetCode: "", assetType: "", brandModel: "", serialNumber: "",
    locationId: "", status: "ACTIVE", picId: "", purchaseDate: "", warrantyUntil: "", notes: ""
  })
  const [saving, setSaving] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [singlePrintAsset, setSinglePrintAsset] = useState<Asset | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Fetch initial data
  const load = async () => {
    setLoading(true)
    try {
      const [aRes, lRes, pRes] = await Promise.all([
        fetch(`${API}/api/it-osl/assets`),
        fetch(`${API}/api/it-osl/locations`),
        fetch(`${API}/api/it-osl/pics`),
      ])

      if (aRes.ok) {
        const data = await aRes.json()
        setAllAssets(Array.isArray(data) ? data : [])
      }
      if (lRes.ok) setLocations(await lRes.json())
      if (pRes.ok) setPics(await pRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Fetch detail with ticket history
  const loadDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API}/api/it-osl/assets/${id}`)
      if (res.ok) {
        setDetail(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (detailId) loadDetail(detailId)
    else setDetail(null)
  }, [detailId])

  // Map counts per PIC
  const assetsByPic = useMemo(() => {
    const m = new Map<string, number>()
    allAssets.forEach(a => {
      const pid = a.picId || a.pic?.id
      if (pid) m.set(pid, (m.get(pid) || 0) + 1)
    })
    return m
  }, [allAssets])

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const now = new Date().getTime()
    let active = 0
    let inRepair = 0
    let retired = 0
    let inWarranty = 0
    let recurring = 0

    allAssets.forEach(a => {
      if (a.status === "ACTIVE") active++
      else if (a.status === "IN_REPAIR") inRepair++
      else if (a.status === "RETIRED") retired++

      if (a.warrantyUntil && new Date(a.warrantyUntil).getTime() > now) {
        inWarranty++
      }

      if (a.recurring || a.ticketCount >= 3) {
        recurring++
      }
    })

    return {
      total: allAssets.length,
      active,
      inRepair,
      retired,
      inWarranty,
      recurring
    }
  }, [allAssets])

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    const now = new Date().getTime()
    const query = q.trim().toLowerCase()

    return allAssets.filter(a => {
      // Search
      if (query) {
        const matchCode = a.assetCode.toLowerCase().includes(query)
        const matchName = a.name.toLowerCase().includes(query)
        const matchSerial = (a.serialNumber || "").toLowerCase().includes(query)
        const matchBrand = (a.brandModel || "").toLowerCase().includes(query)
        const matchLocation = (a.location?.name || "").toLowerCase().includes(query)
        const matchPic = (a.pic?.name || a.picUser?.name || a.picUser?.email || "").toLowerCase().includes(query)
        if (!matchCode && !matchName && !matchSerial && !matchBrand && !matchLocation && !matchPic) {
          return false
        }
      }

      // Location
      if (filterLocation && a.locationId !== filterLocation) return false

      // Type
      if (filterType && a.assetType !== filterType) return false

      // Status
      if (filterStatus && a.status !== filterStatus) return false

      // PIC Filter
      if (filterPic) {
        if (filterPic === "UNASSIGNED") {
          if (a.picId || a.pic || a.picUserId) return false
        } else if (a.picId !== filterPic && a.pic?.id !== filterPic) {
          return false
        }
      }

      // Warranty
      if (filterWarranty === "active") {
        if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() <= now) return false
      } else if (filterWarranty === "expired") {
        if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() > now) return false
      } else if (filterWarranty === "none") {
        if (a.warrantyUntil) return false
      }

      // Recurring filter
      if (filterRecurringOnly && !a.recurring && a.ticketCount < 3) return false

      return true
    }).sort((a, b) => {
      let res = 0
      if (sortBy === "name") {
        res = a.name.localeCompare(b.name)
      } else if (sortBy === "assetCode") {
        res = a.assetCode.localeCompare(b.assetCode)
      } else if (sortBy === "ticketCount") {
        res = (a.ticketCount || 0) - (b.ticketCount || 0)
      } else if (sortBy === "location") {
        res = (a.location?.name || "").localeCompare(b.location?.name || "")
      } else if (sortBy === "warrantyUntil") {
        const timeA = a.warrantyUntil ? new Date(a.warrantyUntil).getTime() : 0
        const timeB = b.warrantyUntil ? new Date(b.warrantyUntil).getTime() : 0
        res = timeA - timeB
      } else {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        res = timeA - timeB
      }
      return sortDir === "asc" ? res : -res
    })
  }, [allAssets, q, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly, sortBy, sortDir])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [q, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly, pageSize])

  // Pagination Slice
  const totalItems = filteredAssets.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAssets.slice(start, start + pageSize)
  }, [filteredAssets, currentPage, pageSize])

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (q) count++
    if (filterLocation) count++
    if (filterType) count++
    if (filterStatus) count++
    if (filterPic) count++
    if (filterWarranty) count++
    if (filterRecurringOnly) count++
    return count
  }, [q, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly])

  const clearAllFilters = () => {
    setQ("")
    setFilterLocation("")
    setFilterType("")
    setFilterStatus("")
    setFilterPic("")
    setFilterWarranty("")
    setFilterRecurringOnly(false)
  }

  // Selection handlers
  const handleSelectAllCurrentPage = () => {
    const next = new Set(selectedIds)
    const pageIds = paginatedAssets.map(a => a.id)
    const allSelected = pageIds.every(id => next.has(id))
    if (allSelected) {
      pageIds.forEach(id => next.delete(id))
    } else {
      pageIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  // Sorting helper
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDir("asc")
    }
  }

  // Form CRUD
  const openCreate = () => {
    setEditing(null)
    setForm({
      name: "", assetCode: "", assetType: "", brandModel: "", serialNumber: "",
      locationId: locations[0]?.id || "", status: "ACTIVE", picId: "",
      purchaseDate: "", warrantyUntil: "", notes: ""
    })
    setShowForm(true)
  }

  const openEdit = (a: Asset) => {
    setEditing(a)
    setForm({
      name: a.name,
      assetCode: a.assetCode,
      assetType: a.assetType || "",
      brandModel: a.brandModel || "",
      serialNumber: a.serialNumber || "",
      locationId: a.locationId || "",
      status: a.status,
      picId: a.picId || a.pic?.id || "",
      purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : "",
      warrantyUntil: a.warrantyUntil ? a.warrantyUntil.slice(0, 10) : "",
      notes: a.notes || ""
    })
    setShowForm(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) return alert("Nama aset wajib diisi (contoh: Switch Core Lantai 2)")
    if (!form.locationId) return alert("Pilih lokasi penempatan fisik aset")

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        assetType: form.assetType || null,
        brandModel: form.brandModel || null,
        serialNumber: form.serialNumber || null,
        locationId: form.locationId || null,
        status: form.status,
        picId: form.picId || null,
        purchaseDate: form.purchaseDate || null,
        warrantyUntil: form.warrantyUntil || null,
        notes: form.notes || null,
      }
      if (form.assetCode.trim()) payload.assetCode = form.assetCode.trim()

      const url = editing ? `${API}/api/it-osl/assets/${editing.id}` : `${API}/api/it-osl/assets`
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menyimpan aset")

      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const deleteAsset = async (id: string, name: string) => {
    if (!confirm(`Hapus aset "${name}"? Aset yang pernah memiliki riwayat tiket disarankan diubah statusnya menjadi RETIRED (Afkir).`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/assets/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menghapus aset")
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menghapus")
    }
  }

  // Copy code helper
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // WhatsApp Helper
  const getWhatsAppUrl = (phoneStr?: string | null) => {
    if (!phoneStr) return null
    let clean = phoneStr.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    else if (!clean.startsWith("62")) clean = "62" + clean
    return `https://wa.me/${clean}`
  }

  // CSV Export & Import
  const exportCsv = (assetsToExport: Asset[] = filteredAssets) => {
    if (assetsToExport.length === 0) return alert("Tidak ada data aset untuk diekspor")

    const headers = [
      "Kode Aset", "Nama Perangkat", "Jenis", "Merek / Model", "Serial Number",
      "Lokasi", "PIC Penanggung Jawab", "No HP PIC", "Status", "Garansi Hingga",
      "Tanggal Beli", "Total Tiket Servis", "Catatan"
    ]

    const rows = assetsToExport.map(a => [
      `"${a.assetCode}"`,
      `"${(a.name || "").replace(/"/g, '""')}"`,
      `"${a.assetType || ""}"`,
      `"${(a.brandModel || "").replace(/"/g, '""')}"`,
      `"${a.serialNumber || ""}"`,
      `"${a.location?.name || ""}"`,
      `"${a.pic?.name || a.picUser?.name || ""}"`,
      `"${a.pic?.phone || ""}"`,
      `"${a.status}"`,
      `"${a.warrantyUntil ? a.warrantyUntil.slice(0, 10) : ""}"`,
      `"${a.purchaseDate ? a.purchaseDate.slice(0, 10) : ""}"`,
      `"${a.ticketCount || 0}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `axon_assets_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadCsvTemplate = () => {
    const headers = ["name", "assetCode", "assetType", "brandModel", "serialNumber", "locationCode", "status", "notes"]
    const sample = ["Switch Cisco 24 Port", "AST-SW-001", "Switch", "Cisco Catalyst 2960", "FCW2140A01", "LT2", "ACTIVE", "Rak Server Utama"]
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), sample.join(",")].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `template_import_aset_axon.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importCsv = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length < 2) return alert("File CSV kosong atau tidak memiliki data")

      const header = lines[0]?.split(",").map(s => s.trim().toLowerCase().replace(/['"]/g, ""))
      const idxName = header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("nama perangkat")
      const idxCode = header.indexOf("assetcode") !== -1 ? header.indexOf("assetcode") : header.indexOf("kode aset")
      const idxType = header.indexOf("assettype") !== -1 ? header.indexOf("assettype") : header.indexOf("jenis")
      const idxBrand = header.indexOf("brandmodel") !== -1 ? header.indexOf("brandmodel") : header.indexOf("merek / model")
      const idxSerial = header.indexOf("serialnumber") !== -1 ? header.indexOf("serialnumber") : header.indexOf("serial number")
      const idxNotes = header.indexOf("notes") !== -1 ? header.indexOf("notes") : header.indexOf("catatan")

      const assetsArr = lines.slice(1).map(l => {
        const cols = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || l.split(",")
        const clean = cols.map(c => c.replace(/^"|"$/g, "").trim())
        return {
          name: clean[idxName >= 0 ? idxName : 0],
          assetCode: idxCode >= 0 ? clean[idxCode] : undefined,
          assetType: idxType >= 0 ? clean[idxType] : undefined,
          brandModel: idxBrand >= 0 ? clean[idxBrand] : undefined,
          serialNumber: idxSerial >= 0 ? clean[idxSerial] : undefined,
          notes: idxNotes >= 0 ? clean[idxNotes] : undefined,
        }
      }).filter(a => a.name && a.name !== "name")

      if (assetsArr.length === 0) return alert("Format CSV tidak sesuai atau kolom nama tidak ditemukan")

      const res = await fetch(`${API}/api/it-osl/assets/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: assetsArr })
      })
      const d = await res.json()
      alert(`Berhasil mengimpor ${d.created || assetsArr.length} aset ke dalam sistem!`)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal mengimpor file CSV")
    }
  }

  // Selected assets list for batch printing
  const selectedAssetsList = useMemo(() => {
    return allAssets.filter(a => selectedIds.has(a.id))
  }, [allAssets, selectedIds])

  return (
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 pb-28 md:pb-8 overflow-x-hidden">
      {/* ── 1. HEADER & GLOBAL ACTIONS ────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
            <Package size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span>Registri Aset IT & QR</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {allAssets.length} Aset
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Enterprise Asset Directory • Label QR Cetak • Terhubung dengan Modul Direktori PIC Unit
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportCsv(filteredAssets)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            title="Ekspor data saat ini ke format CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>

          <label className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition">
            <Upload size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Import</span> CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  importCsv(e.target.files[0])
                  e.target.value = ""
                }
              }}
            />
          </label>

          <button
            onClick={downloadCsvTemplate}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-slate-700 transition shadow-sm"
            title="Unduh Template CSV untuk impor data baru"
          >
            <FileSpreadsheet size={16} />
          </button>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Tambah Aset</span>
          </button>
        </div>
      </header>

      {/* ── 2. KPI METRIC CARDS (Fast 1-Click Filters) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 w-full">
        <button
          onClick={clearAllFilters}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilterCount === 0 
              ? "bg-slate-900 text-white border-slate-900 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${activeFilterCount === 0 ? "text-slate-300" : "text-slate-400"}`}>
            Total Aset
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.total}</p>
          <p className={`text-[10px] mt-1 truncate ${activeFilterCount === 0 ? "text-slate-300" : "text-slate-500"}`}>
            Semua kategori
          </p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterStatus("ACTIVE"); }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filterStatus === "ACTIVE" 
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-emerald-600"}`}>
            Aktif / Siap Pakai
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.active}</p>
          <p className={`text-[10px] mt-1 truncate ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-slate-500"}`}>
            Operasional normal
          </p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterStatus("IN_REPAIR"); }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filterStatus === "IN_REPAIR" 
              ? "bg-amber-500 text-white border-amber-500 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-amber-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-amber-600"}`}>
            Dalam Perbaikan
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.inRepair}</p>
          <p className={`text-[10px] mt-1 truncate ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-slate-500"}`}>
            Maintenance / Servis
          </p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterStatus("RETIRED"); }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filterStatus === "RETIRED" 
              ? "bg-slate-700 text-white border-slate-700 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-500"}`}>
            Afkir / Retired
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.retired}</p>
          <p className={`text-[10px] mt-1 truncate ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-400"}`}>
            Non-aktif / Rusak berat
          </p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterWarranty("active"); }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filterWarranty === "active" 
              ? "bg-sky-600 text-white border-sky-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-sky-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider ${filterWarranty === "active" ? "text-sky-100" : "text-sky-600"}`}>
            Dalam Garansi
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.inWarranty}</p>
          <p className={`text-[10px] mt-1 truncate ${filterWarranty === "active" ? "text-sky-100" : "text-slate-500"}`}>
            Proteksi klaim pabrik
          </p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterRecurringOnly(true); }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            filterRecurringOnly 
              ? "bg-rose-600 text-white border-rose-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-rose-300 shadow-sm"
          }`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${filterRecurringOnly ? "text-rose-100" : "text-rose-600"}`}>
            <AlertTriangle size={11} /> Sering Rusak
          </p>
          <p className="text-xl sm:text-2xl font-black mt-0.5">{metrics.recurring}</p>
          <p className={`text-[10px] mt-1 truncate ${filterRecurringOnly ? "text-rose-100" : "text-slate-500"}`}>
            ≥3 tiket / 90 hari
          </p>
        </button>
      </div>

      {/* ── 3. SEARCH & ADVANCED FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari berdasarkan kode aset, nama, serial number, merek, lokasi, PIC..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Jenis</option>
              {ASSET_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* PIC Filter - from PIC Directory */}
            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700 max-w-[190px]"
            >
              <option value="">Semua PIC</option>
              <option value="UNASSIGNED">Tanpa PIC (Belum Set)</option>
              {pics.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.department ? `(${p.department})` : ""} {assetsByPic.get(p.id) ? `• ${assetsByPic.get(p.id)} aset` : ""}
                </option>
              ))}
            </select>

            {/* View Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Tampilan Tabel Data"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Tampilan Kartu / Grid"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">Filter Aktif:</span>
            {activeFilterCount === 0 && <span className="text-slate-400">Tidak ada filter (menampilkan semua)</span>}

            {q && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                Pencarian: "{q}"
                <button onClick={() => setQ("")}><X size={12} /></button>
              </span>
            )}
            {filterLocation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Lokasi: {locations.find(l => l.id === filterLocation)?.name}
                <button onClick={() => setFilterLocation("")}><X size={12} /></button>
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Jenis: {filterType}
                <button onClick={() => setFilterType("")}><X size={12} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Status: {STATUS_OPTS.find(s => s.v === filterStatus)?.l}
                <button onClick={() => setFilterStatus("")}><X size={12} /></button>
              </span>
            )}
            {filterPic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                PIC: {filterPic === "UNASSIGNED" ? "Tanpa PIC" : (pics.find(p => p.id === filterPic)?.name || filterPic)}
                <button onClick={() => setFilterPic("")}><X size={12} /></button>
              </span>
            )}
            {filterWarranty && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                Garansi: {filterWarranty === "active" ? "Aktif" : filterWarranty === "expired" ? "Habis" : "Tanpa Garansi"}
                <button onClick={() => setFilterWarranty("")}><X size={12} /></button>
              </span>
            )}
            {filterRecurringOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                Sering Rusak
                <button onClick={() => setFilterRecurringOnly(false)}><X size={12} /></button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-indigo-600 hover:text-indigo-800 font-bold ml-1 flex items-center gap-1">
                <RotateCcw size={12} /> Reset Semua
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Ditemukan <b>{filteredAssets.length}</b> dari <b>{allAssets.length}</b> aset</span>
          </div>
        </div>
      </div>

      {/* ── 4. BATCH ACTIONS BAR ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 flex-wrap z-30"
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="text-xs font-bold">Aset terpilih untuk tindakan massal</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowBatchPrint(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95 text-xs font-black flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer size={14} />
                <span>Cetak {selectedIds.size} Label QR</span>
              </button>

              <button
                onClick={() => exportCsv(selectedAssetsList)}
                className="px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download size={14} />
                <span>Export Terpilih</span>
              </button>

              <button onClick={handleDeselectAll} className="px-3 py-1.5 rounded-xl hover:bg-indigo-800 text-indigo-200 text-xs font-bold transition">
                Batal Pilih
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. DATA VIEW (TABLE OR GRID) ───────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-sm font-bold text-slate-600">Memuat Registri Aset...</p>
        </div>
      ) : paginatedAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-500 space-y-3">
          <Package size={40} className="mx-auto text-slate-300" />
          <h3 className="font-black text-base text-slate-800">Tidak ada aset yang sesuai</h3>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold">
              Reset Filter
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ──────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-10 text-center">
                    <button onClick={handleSelectAllCurrentPage} className="text-slate-400 hover:text-indigo-600 transition">
                      {paginatedAssets.every(a => selectedIds.has(a.id)) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("assetCode")}>
                    <div className="flex items-center gap-1.5">
                      <span>Kode Aset (QR)</span>
                      <ArrowUpDown size={12} className={sortBy === "assetCode" ? "text-indigo-600" : "text-slate-400"} />
                    </div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Perangkat & Spesifikasi</span>
                      <ArrowUpDown size={12} className={sortBy === "name" ? "text-indigo-600" : "text-slate-400"} />
                    </div>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("location")}>
                    <div className="flex items-center gap-1.5">
                      <span>Lokasi Fisik</span>
                      <ArrowUpDown size={12} className={sortBy === "location" ? "text-indigo-600" : "text-slate-400"} />
                    </div>
                  </th>
                  <th className="p-3.5">
                    <span>PIC Penanggung Jawab</span>
                  </th>
                  <th className="p-3.5">
                    <span>Status</span>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("warrantyUntil")}>
                    <div className="flex items-center gap-1.5">
                      <span>Garansi</span>
                      <ArrowUpDown size={12} className={sortBy === "warrantyUntil" ? "text-indigo-600" : "text-slate-400"} />
                    </div>
                  </th>
                  <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort("ticketCount")}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Tiket Servis</span>
                      <ArrowUpDown size={12} className={sortBy === "ticketCount" ? "text-indigo-600" : "text-slate-400"} />
                    </div>
                  </th>
                  <th className="p-3.5 text-right w-24">
                    <span>Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedAssets.map((a) => {
                  const isSelected = selectedIds.has(a.id)
                  const isWarrantyActive = a.warrantyUntil && new Date(a.warrantyUntil) > new Date()
                  const isWarrantyExpired = a.warrantyUntil && new Date(a.warrantyUntil) <= new Date()
                  const picName = a.pic?.name || a.picUser?.name || a.picUser?.email || null
                  const picPhone = a.pic?.phone || null
                  const waUrl = getWhatsAppUrl(picPhone)

                  return (
                    <tr key={a.id} className={`hover:bg-indigo-50/40 transition-colors ${isSelected ? "bg-indigo-50/70" : ""}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => handleToggleSelect(a.id)} className="text-slate-400 hover:text-indigo-600 transition">
                          {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setDetailId(a.id) }}
                            className="font-mono text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {a.assetCode}
                          </button>
                          <button onClick={() => copyCode(a.assetCode)} className="text-slate-400 hover:text-slate-600 p-1 rounded" title="Salin kode">
                            {copiedCode === a.assetCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(a.id)}>
                            {a.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {a.assetType ? <span className="font-semibold text-slate-700">{a.assetType}</span> : "Lainnya"}
                            {a.brandModel ? ` • ${a.brandModel}` : ""}
                            {a.serialNumber ? ` • SN: ${a.serialNumber}` : ""}
                          </p>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-medium">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{a.location?.name || "-"}</span>
                        </span>
                      </td>

                      {/* PIC Column */}
                      <td className="p-3 whitespace-nowrap">
                        {picName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-200">
                              {picName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate max-w-[130px]">{picName}</p>
                              {a.pic?.department && <p className="text-[10px] text-slate-400 truncate">{a.pic.department}</p>}
                            </div>
                            {waUrl && (
                              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-emerald-600 hover:bg-emerald-50" title="Chat WhatsApp PIC">
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Belum set PIC</span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          STATUS_OPTS.find(s => s.v === a.status)?.c || "bg-slate-100 text-slate-700"
                        }`}>
                          {STATUS_OPTS.find(s => s.v === a.status)?.l || a.status}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {isWarrantyActive && (
                          <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            <CheckCircle2 size={11} /> s/d {new Date(a.warrantyUntil!).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {isWarrantyExpired && <span className="text-slate-400 text-[10px]">Habis</span>}
                        {!a.warrantyUntil && <span className="text-slate-400 text-[10px]">-</span>}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                            {a.ticketCount || 0}
                          </span>
                          {(a.recurring || (a.ticketCount || 0) >= 3) && (
                            <span className="p-1 rounded bg-rose-100 text-rose-700" title="Sering bermasalah (≥3 tiket)">
                              <AlertTriangle size={13} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSinglePrintAsset(a)} className="p-1.5 rounded-lg border hover:bg-slate-100 text-slate-600" title="Cetak Label QR">
                            <QrCode size={13} />
                          </button>
                          <button onClick={() => setDetailId(a.id)} className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800" title="Detail">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg border hover:bg-slate-100 text-slate-600" title="Edit">
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ───────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
          {paginatedAssets.map((a) => {
            const isSelected = selectedIds.has(a.id)
            const isWarrantyActive = a.warrantyUntil && new Date(a.warrantyUntil) > new Date()
            const picName = a.pic?.name || a.picUser?.name || null

            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                  isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-md" : "border-slate-200/80"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleToggleSelect(a.id)} className="text-slate-400 hover:text-indigo-600 transition">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                      <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        {a.assetCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(a.recurring || (a.ticketCount || 0) >= 3) && (
                        <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} /> Sering Rusak
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                        STATUS_OPTS.find(s => s.v === a.status)?.c || "bg-slate-100 text-slate-700"
                      }`}>
                        {STATUS_OPTS.find(s => s.v === a.status)?.l || a.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm mt-2 line-clamp-1 hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(a.id)}>
                    {a.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {a.assetType || "Lainnya"} • {a.brandModel || "Tanpa Merek"} • SN: {a.serialNumber || "-"}
                  </p>

                  <div className="space-y-1 mt-2.5 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{a.location?.name || "-"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={13} className="text-indigo-500 shrink-0" />
                      <span className="truncate font-medium">
                        PIC: {picName || <span className="text-slate-400 italic font-normal">Belum set</span>}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium">Tiket: <b className="text-slate-900">{a.ticketCount || 0}</b></span>
                    {isWarrantyActive ? (
                      <span className="text-sky-700 font-bold flex items-center gap-1 text-[10px]">
                        <CheckCircle2 size={11} /> Garansi Aktif
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Tanpa Garansi</span>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailId(a.id)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  <button onClick={() => setSinglePrintAsset(a)} className="p-2 rounded-xl border hover:bg-slate-50 text-slate-700" title="Cetak Label QR">
                    <QrCode size={14} />
                  </button>
                  <button onClick={() => openEdit(a)} className="p-2 rounded-xl border hover:bg-slate-50 text-slate-700" title="Edit Aset">
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 6. PAGINATION ──────────────────────────────────────────────────────── */}
      {!loading && totalItems > 0 && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>Menampilkan <b>{(currentPage - 1) * pageSize + 1}</b>–<b>{Math.min(currentPage * pageSize, totalItems)}</b> dari <b>{totalItems}</b> aset</span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-xl border disabled:opacity-40"><ChevronsLeft size={14} /></button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl border disabled:opacity-40"><ChevronLeft size={14} /></button>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl border disabled:opacity-40"><ChevronRight size={14} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-xl border disabled:opacity-40"><ChevronsRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ── 7. ASSET DETAIL DRAWER ────────────────────────────────────────────── */}
      <AnimatePresence>
        {detailId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
            onClick={() => setDetailId(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-xl lg:max-w-2xl h-[100dvh] flex flex-col shadow-2xl"
            >
              {loadingDetail && !detail ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <Loader2 size={36} className="animate-spin text-indigo-600" />
                  <p className="text-sm font-bold text-slate-700">Memuat detail aset...</p>
                </div>
              ) : detail ? (
                <>
                  <div className="p-4 sm:p-5 border-b shrink-0 bg-slate-50 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded">
                          {detail.assetCode}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          STATUS_OPTS.find(s => s.v === detail.status)?.c || "bg-slate-100"
                        }`}>
                          {STATUS_OPTS.find(s => s.v === detail.status)?.l || detail.status}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 mt-2 break-words">
                        {detail.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {detail.assetType || "Lainnya"} • {detail.brandModel || "-"} • Lokasi: {detail.location?.name || "-"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setSinglePrintAsset(detail)} className="p-2 rounded-xl border bg-white text-slate-700" title="Cetak Label QR">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => { setDetailId(null); openEdit(detail); }} className="p-2 rounded-xl border bg-white text-slate-700" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* QR Code Sticker Card Preview */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(detail.assetCode)}`}
                          alt="qr label"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Label QR Asset Ready</p>
                        <p className="font-mono text-sm font-black text-slate-900">{detail.assetCode}</p>
                        <button
                          onClick={() => setSinglePrintAsset(detail)}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                        >
                          <Printer size={13} /> Cetak Label Stiker
                        </button>
                      </div>
                    </div>

                    {/* PIC Contact Card in Asset Detail */}
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <Users size={13} /> PIC Penanggung Jawab Perangkat
                      </p>
                      {detail.pic ? (
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-black text-slate-900 text-sm">{detail.pic.name}</p>
                            <p className="text-xs text-slate-600">
                              {detail.pic.position ? `${detail.pic.position} • ` : ""}{detail.pic.department || "Unit Umum"}
                            </p>
                            {detail.pic.phone && <p className="font-mono text-xs text-indigo-700 mt-0.5">{detail.pic.phone}</p>}
                          </div>
                          {detail.pic.phone && getWhatsAppUrl(detail.pic.phone) && (
                            <a
                              href={getWhatsAppUrl(detail.pic.phone)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                            >
                              <MessageCircle size={14} /> Hubungi WhatsApp
                            </a>
                          )}
                        </div>
                      ) : detail.picUser ? (
                        <p className="text-xs font-bold text-slate-800">{detail.picUser.name || detail.picUser.email}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada PIC penanggung jawab untuk perangkat ini.</p>
                      )}
                    </div>

                    {/* Technical Specs */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                        <Info size={14} /> Spesifikasi Perangkat
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Jenis Aset</p>
                          <p className="font-bold text-slate-800 mt-0.5">{detail.assetType || "-"}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Merek / Model</p>
                          <p className="font-bold text-slate-800 mt-0.5">{detail.brandModel || "-"}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Serial Number (SN)</p>
                          <p className="font-mono font-bold text-slate-800 mt-0.5">{detail.serialNumber || "-"}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <p className="text-slate-400 text-[10px] font-bold uppercase">Lokasi Penempatan</p>
                          <p className="font-bold text-slate-800 mt-0.5">{detail.location?.name || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Service History */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Wrench size={14} /> Riwayat Tiket ({detail.tickets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.tickets || detail.tickets.length === 0) ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-400">
                          Belum ada riwayat perbaikan untuk perangkat ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detail.tickets.map(t => (
                            <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                                  {t.ticketNumber}
                                </span>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                                  {t.status}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-xs">{t.summary}</p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(t.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3">
                    <button onClick={() => deleteAsset(detail.id, detail.name)} className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5">
                      <Trash2 size={14} /> Hapus Aset
                    </button>
                    <button onClick={() => { setDetailId(null); openEdit(detail); }} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5">
                      <Edit2 size={14} /> Edit Data Aset
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. BATCH / SINGLE QR LABEL PRINT MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {(showBatchPrint || singlePrintAsset) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-4xl p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    <Printer size={18} className="text-indigo-600" />
                    <span>Cetak Label Stiker QR Perangkat</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {singlePrintAsset
                      ? `Mencetak 1 label untuk ${singlePrintAsset.name} (${singlePrintAsset.assetCode})`
                      : `Mencetak ${selectedAssetsList.length} label stiker terpilih`}
                  </p>
                </div>
                <button onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <div id="printable-labels-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1">
                  {(singlePrintAsset ? [singlePrintAsset] : selectedAssetsList).map(a => (
                    <div key={a.id} className="border-2 border-dashed border-slate-300 rounded-2xl p-3.5 bg-white flex flex-col justify-between space-y-2 text-center">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-black text-[10px] tracking-widest text-slate-900 uppercase">AXON ASSET</span>
                        <span className="text-[9px] font-bold text-slate-400">{a.location?.name || "IT"}</span>
                      </div>
                      <div className="flex justify-center py-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(a.assetCode)}`}
                          alt={a.assetCode}
                          className="w-24 h-24 object-contain bg-white p-1 rounded-lg border border-slate-100"
                        />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-black text-indigo-700 bg-slate-50 py-0.5 rounded border border-slate-200">{a.assetCode}</p>
                        <p className="font-bold text-slate-900 text-xs mt-1 truncate">{a.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{a.assetType || "IT Device"} • SN: {a.serialNumber || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Tip: Gunakan ukuran kertas A4 / stiker label saat mencetak dari browser.</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} className="px-4 py-2.5 rounded-xl border text-slate-700 text-xs font-bold hover:bg-slate-50">
                    Tutup
                  </button>
                  <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-lg">
                    <Printer size={15} /> Cetak Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 9. CREATE / EDIT ASSET MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl pb-safe"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    {editing ? "Edit Informasi Aset" : "Tambah Aset Baru"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Isi data identitas perangkat, penempatan lokasi, dan PIC penanggung jawab unit.
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Package size={14} /> Identitas Perangkat
                  </h4>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nama Aset *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: Switch Core Lantai 2, PC Kasir 01..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Kode Aset (QR)</label>
                      <input
                        value={form.assetCode}
                        onChange={(e) => setForm({ ...form, assetCode: e.target.value.toUpperCase() })}
                        placeholder="Auto: AST-..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Aset</label>
                      <select
                        value={form.assetType}
                        onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="">— Pilih Jenis Aset —</option>
                        {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Merek / Model</label>
                      <input
                        value={form.brandModel}
                        onChange={(e) => setForm({ ...form, brandModel: e.target.value })}
                        placeholder="Contoh: Cisco SG350 / Dell 7080"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Serial Number (SN)</label>
                      <input
                        value={form.serialNumber}
                        onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                        placeholder="Contoh: FOC21390A1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <MapPin size={14} /> Penempatan & PIC Penanggung Jawab
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Lokasi Fisik *</label>
                      <select
                        value={form.locationId}
                        onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="">— Pilih Lokasi Penempatan —</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Status Operasional</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      PIC / Penanggung Jawab Unit <span className="font-normal text-slate-400">(Dari Direktori PIC)</span>
                    </label>
                    <select
                      value={form.picId}
                      onChange={(e) => setForm({ ...form, picId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="">— Tanpa PIC (Umum / Belum Ditentukan) —</option>
                      {pics.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.department ? `• Divisi ${p.department}` : ""} {p.phone ? `(${p.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Calendar size={14} /> Pembelian & Garansi
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Perolehan</label>
                      <input
                        type="date"
                        value={form.purchaseDate}
                        onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Garansi Berakhir Pada</label>
                      <input
                        type="date"
                        value={form.warrantyUntil}
                        onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="IP Address, Rak Server, Port Switch..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2.5">
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border text-slate-700 text-xs font-bold hover:bg-slate-50">
                  Batal
                </button>
                <button
                  onClick={submitForm}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : null}
                  <span>{editing ? "Simpan Perubahan" : "Simpan Aset"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
