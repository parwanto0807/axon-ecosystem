"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, UserPlus, Phone, Mail, MapPin, Search, 
  Upload, Download, X, Loader2, Edit2, Eye, Trash2, 
  LayoutGrid, LayoutList, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, MessageCircle, Package, 
  Wrench, Building2, Briefcase, Plus, FileSpreadsheet, 
  RotateCcw, CheckCircle2, AlertCircle, Copy, Check
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type Pic = {
  id: string
  name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  locationId: string | null
  location: { id: string; name: string; code?: string } | null
  notes: string | null
  isActive: boolean
  assetCount?: number
  ticketCount?: number
  createdAt?: string
}

type PicDetail = Pic & {
  assets?: {
    id: string
    assetCode: string
    name: string
    assetType: string | null
    status: string
    location?: { name: string } | null
  }[]
  tickets?: {
    id: string
    ticketNumber: string
    summary: string
    status: string
    severity: string
    createdAt: string
    category?: { name: string } | null
  }[]
}

type Location = { id: string; code: string; name: string }

export default function ItOslPicsPage() {
  const [pics, setPics] = useState<Pic[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [q, setQ] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterLocation, setFilterLocation] = useState("")
  const [filterActive, setFilterActive] = useState("")

  // View & Pagination
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Modals & Detail
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Pic | null>(null)
  const [form, setForm] = useState({
    name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: "", isActive: true
  })
  const [saving, setSaving] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PicDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  // Fetch initial data
  const load = async () => {
    setLoading(true)
    try {
      const [pRes, lRes] = await Promise.all([
        fetch(`${API}/api/it-osl/pics`),
        fetch(`${API}/api/it-osl/locations`),
      ])
      if (pRes.ok) setPics(await pRes.json())
      if (lRes.ok) setLocations(await lRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Load detail
  const loadDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API}/api/it-osl/pics/${id}`)
      if (res.ok) setDetail(await res.json())
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

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>()
    pics.forEach(p => { if (p.department) set.add(p.department.trim()) })
    return Array.from(set).sort()
  }, [pics])

  // KPI Metrics
  const metrics = useMemo(() => {
    let active = 0
    let withAssets = 0
    let withoutAssets = 0

    pics.forEach(p => {
      if (p.isActive) active++
      if ((p.assetCount || 0) > 0) withAssets++
      else withoutAssets++
    })

    return {
      total: pics.length,
      active,
      inactive: pics.length - active,
      withAssets,
      withoutAssets,
      deptCount: departments.length
    }
  }, [pics, departments])

  // Filtered & paginated
  const filteredPics = useMemo(() => {
    const query = q.trim().toLowerCase()
    return pics.filter(p => {
      if (query) {
        const matchName = p.name.toLowerCase().includes(query)
        const matchPhone = (p.phone || "").toLowerCase().includes(query)
        const matchDept = (p.department || "").toLowerCase().includes(query)
        const matchPos = (p.position || "").toLowerCase().includes(query)
        const matchEmail = (p.email || "").toLowerCase().includes(query)
        const matchLoc = (p.location?.name || "").toLowerCase().includes(query)
        if (!matchName && !matchPhone && !matchDept && !matchPos && !matchEmail && !matchLoc) {
          return false
        }
      }
      if (filterDept && (p.department || "").trim().toLowerCase() !== filterDept.toLowerCase()) return false
      if (filterLocation && p.locationId !== filterLocation) return false
      if (filterActive === "active" && !p.isActive) return false
      if (filterActive === "inactive" && p.isActive) return false
      return true
    })
  }, [pics, q, filterDept, filterLocation, filterActive])

  useEffect(() => {
    setCurrentPage(1)
  }, [q, filterDept, filterLocation, filterActive, pageSize])

  const totalItems = filteredPics.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedPics = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPics.slice(start, start + pageSize)
  }, [filteredPics, currentPage, pageSize])

  const clearAllFilters = () => {
    setQ("")
    setFilterDept("")
    setFilterLocation("")
    setFilterActive("")
  }

  // Form handlers
  const openCreate = () => {
    setEditing(null)
    setForm({
      name: "", position: "", department: "", phone: "", email: "",
      locationId: locations[0]?.id || "", notes: "", isActive: true
    })
    setShowForm(true)
  }

  const openEdit = (p: Pic) => {
    setEditing(p)
    setForm({
      name: p.name,
      position: p.position || "",
      department: p.department || "",
      phone: p.phone || "",
      email: p.email || "",
      locationId: p.locationId || "",
      notes: p.notes || "",
      isActive: p.isActive
    })
    setShowForm(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) return alert("Nama PIC wajib diisi")
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        locationId: form.locationId || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      }

      const url = editing ? `${API}/api/it-osl/pics/${editing.id}` : `${API}/api/it-osl/pics`
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menyimpan data PIC")

      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const deletePic = async (id: string, name: string) => {
    if (!confirm(`Hapus/Nonaktifkan PIC "${name}"? Jika PIC masih memiliki aset atau tiket terhubung, statusnya akan otomatis diubah menjadi Nonaktif.`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/pics/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menghapus PIC")
      if (d.message) alert(d.message)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal")
    }
  }

  // Copy helper
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone)
    setCopiedPhone(phone)
    setTimeout(() => setCopiedPhone(null), 2000)
  }

  // CSV
  const exportCsv = () => {
    if (filteredPics.length === 0) return alert("Tidak ada data PIC untuk diekspor")
    const headers = ["Nama PIC", "Jabatan", "Departemen / Unit", "No. Telepon / WA", "Email", "Lokasi", "Jumlah Aset", "Status", "Catatan"]
    const rows = filteredPics.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.position || "").replace(/"/g, '""')}"`,
      `"${(p.department || "").replace(/"/g, '""')}"`,
      `"${p.phone || ""}"`,
      `"${p.email || ""}"`,
      `"${p.location?.name || ""}"`,
      `"${p.assetCount || 0}"`,
      `"${p.isActive ? "Aktif" : "Non-aktif"}"`,
      `"${(p.notes || "").replace(/"/g, '""')}"`
    ])
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `axon_pics_directory_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadTemplate = () => {
    const headers = ["name", "position", "department", "phone", "email", "locationCode", "notes"]
    const sample = ["Budi Santoso", "Staff Kasir", "Finance & Cashier", "08123456789", "budi@axon.id", "LT1", "PIC Kasir Utama"]
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), sample.join(",")].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `template_import_pic.csv`)
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
      const idxName = header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("nama pic")
      const idxPos = header.indexOf("position") !== -1 ? header.indexOf("position") : header.indexOf("jabatan")
      const idxDept = header.indexOf("department") !== -1 ? header.indexOf("department") : header.indexOf("departemen")
      const idxPhone = header.indexOf("phone") !== -1 ? header.indexOf("phone") : header.indexOf("no. telepon")
      const idxEmail = header.indexOf("email") !== -1 ? header.indexOf("email") : header.indexOf("email")
      const idxNotes = header.indexOf("notes") !== -1 ? header.indexOf("notes") : header.indexOf("catatan")

      const picsArr = lines.slice(1).map(l => {
        const cols = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || l.split(",")
        const clean = cols.map(c => c.replace(/^"|"$/g, "").trim())
        return {
          name: clean[idxName >= 0 ? idxName : 0],
          position: idxPos >= 0 ? clean[idxPos] : undefined,
          department: idxDept >= 0 ? clean[idxDept] : undefined,
          phone: idxPhone >= 0 ? clean[idxPhone] : undefined,
          email: idxEmail >= 0 ? clean[idxEmail] : undefined,
          notes: idxNotes >= 0 ? clean[idxNotes] : undefined,
        }
      }).filter(p => p.name && p.name !== "name")

      if (picsArr.length === 0) return alert("Format CSV tidak sesuai atau kolom nama tidak ditemukan")

      const res = await fetch(`${API}/api/it-osl/pics/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pics: picsArr })
      })
      const d = await res.json()
      alert(`Berhasil mengimpor ${d.created || picsArr.length} PIC ke dalam database!`)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal mengimpor file CSV")
    }
  }

  // Format phone for WhatsApp direct URL
  const getWhatsAppUrl = (phoneStr: string | null) => {
    if (!phoneStr) return null
    let clean = phoneStr.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    else if (!clean.startsWith("62")) clean = "62" + clean
    return `https://wa.me/${clean}`
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 pb-28 md:pb-8 overflow-x-hidden">
      {/* ── 1. HEADER ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
            <Users size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
              <span>Direktori PIC & Penanggung Jawab Unit</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {pics.length} PIC
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Data kontak client / penanggung jawab perangkat & pelapor tiket (Terpisah dari User Login Axon)
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
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
            onClick={downloadTemplate}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-slate-700 transition shadow-sm"
            title="Unduh Template CSV PIC"
          >
            <FileSpreadsheet size={16} />
          </button>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Tambah PIC</span>
          </button>
        </div>
      </header>

      {/* ── 2. KPI METRICS CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
        <button
          onClick={clearAllFilters}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left hover:border-slate-300 transition"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total PIC Terdaftar</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.deptCount} Unit / Departemen</p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterActive("active"); }}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left hover:border-emerald-300 transition"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">PIC Aktif</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.active}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Siap dihubungi</p>
        </button>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Pegang Aset</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.withAssets}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Memegang &ge;1 perangkat</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Tanpa Aset</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.withoutAssets}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Kontak pelapor umum</p>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTERS TOOLBAR ────────────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama PIC, no HP/WhatsApp, jabatan, divisi, lokasi..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                title="Tampilan Tabel"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {(q || filterDept || filterLocation || filterActive) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Filter Aktif:</span>
            <button onClick={clearAllFilters} className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
              <RotateCcw size={12} /> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── 4. DATA VIEW (TABLE OR GRID) ───────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-sm font-bold text-slate-600">Memuat Direktori PIC...</p>
        </div>
      ) : paginatedPics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-500 space-y-3">
          <Users size={40} className="mx-auto text-slate-300" />
          <h3 className="font-black text-base text-slate-800">Tidak ada PIC yang sesuai</h3>
          <p className="text-xs text-slate-400">Tekan tombol Tambah PIC untuk mendaftarkan kontak baru.</p>
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ──────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Nama PIC</th>
                  <th className="p-3.5">Jabatan & Departemen</th>
                  <th className="p-3.5">Kontak (WhatsApp / Telp)</th>
                  <th className="p-3.5">Lokasi Kerja</th>
                  <th className="p-3.5 text-center">Aset Dipegang</th>
                  <th className="p-3.5 text-center">Tiket Dilaporkan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedPics.map((p) => {
                  const waUrl = getWhatsAppUrl(p.phone)

                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(p.id)}>
                              {p.name}
                            </p>
                            {p.email && <p className="text-[11px] text-slate-400 truncate">{p.email}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Position & Department */}
                      <td className="p-3">
                        <div>
                          <p className="font-semibold text-slate-800">{p.position || "-"}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{p.department || "Umum"}</p>
                        </div>
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="p-3 whitespace-nowrap">
                        {p.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-800">{p.phone}</span>
                            <button
                              onClick={() => copyPhone(p.phone!)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                              title="Salin nomor"
                            >
                              {copiedPhone === p.phone ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"
                                title="Kirim Pesan WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Tanpa No. HP</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-medium">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{p.location?.name || "-"}</span>
                        </span>
                      </td>

                      {/* Asset Count */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setDetailId(p.id)}
                          className="font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          {p.assetCount || 0} Aset
                        </button>
                      </td>

                      {/* Ticket Count */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {p.ticketCount || 0} Tiket
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {p.isActive ? "Aktif" : "Non-aktif"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailId(p.id)}
                            className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                            title="Detail Aset & Tiket PIC"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="Edit Data PIC"
                          >
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
          {paginatedPics.map((p) => {
            const waUrl = getWhatsAppUrl(p.phone)

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center border border-indigo-200">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {p.isActive ? "Aktif" : "Non-aktif"}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm mt-3 hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(p.id)}>
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {p.position ? `${p.position} • ` : ""}{p.department || "Umum"}
                  </p>

                  <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{p.location?.name || "-"}</span>
                    </p>
                    {p.phone && (
                      <p className="flex items-center justify-between gap-1.5 font-mono text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{p.phone}</span>
                        </span>
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-[11px] font-bold font-sans">
                            WhatsApp
                          </a>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">Aset: <b className="text-indigo-600">{p.assetCount || 0}</b></span>
                    <span className="text-slate-500">Tiket: <b className="text-slate-900">{p.ticketCount || 0}</b></span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailId(p.id)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition"
                  >
                    <Eye size={12} /> Detail
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                    title="Edit PIC"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 5. PAGINATION ──────────────────────────────────────────────────────── */}
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
            <span>Menampilkan <b>{(currentPage - 1) * pageSize + 1}</b>–<b>{Math.min(currentPage * pageSize, totalItems)}</b> dari <b>{totalItems}</b> PIC</span>
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

      {/* ── 6. PIC DETAIL DRAWER (Shows Assets Held & Ticket History) ──────────── */}
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
                  <p className="text-sm font-bold text-slate-700">Memuat profil PIC & daftar perangkat...</p>
                </div>
              ) : detail ? (
                <>
                  <div className="p-4 sm:p-5 border-b shrink-0 bg-slate-50 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                        {detail.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">{detail.name}</h2>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            detail.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}>
                            {detail.isActive ? "Aktif" : "Non-aktif"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {detail.position ? `${detail.position} • ` : ""}{detail.department || "Umum"} • Lokasi: {detail.location?.name || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setDetailId(null); openEdit(detail); }}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                        title="Edit PIC"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Contact Bar */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontak Langsung</p>
                        <p className="font-mono text-sm font-bold text-slate-800">{detail.phone || "Tidak ada nomor HP"}</p>
                        {detail.email && <p className="text-xs text-slate-500">{detail.email}</p>}
                      </div>
                      {detail.phone && getWhatsAppUrl(detail.phone) && (
                        <a
                          href={getWhatsAppUrl(detail.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition"
                        >
                          <MessageCircle size={15} /> Chat WhatsApp
                        </a>
                      )}
                    </div>

                    {/* Section 1: Assets Held */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Package size={14} /> Daftar Perangkat yang Dipegang ({detail.assets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.assets || detail.assets.length === 0) ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-400">
                          PIC ini belum memiliki perangkat yang terhubung. Hubungkan aset dari modul Registri Aset.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {detail.assets.map(a => (
                            <div key={a.id} className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                                  {a.assetCode}
                                </span>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  {a.status}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-xs truncate">{a.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{a.assetType || "Aset"} • {a.location?.name || "-"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Tickets Reported */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Wrench size={14} /> Riwayat Tiket Dilaporkan ({detail.tickets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.tickets || detail.tickets.length === 0) ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-400">
                          Belum ada riwayat tiket gangguan dari PIC ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detail.tickets.map(t => (
                            <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
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
                    <button
                      onClick={() => deletePic(detail.id, detail.name)}
                      className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Hapus / Nonaktifkan
                    </button>
                    <button
                      onClick={() => { setDetailId(null); openEdit(detail); }}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5"
                    >
                      <Edit2 size={14} /> Edit Data PIC
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 7. CREATE / EDIT PIC MODAL ─────────────────────────────────────────── */}
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
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl pb-safe"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    {editing ? "Edit Data PIC" : "Tambah PIC Baru"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    PIC / Contact Person penanggung jawab unit perangkat & pelapor tiket.
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama PIC *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso, Siti Rahmawati..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Jabatan / Posisi</label>
                    <input
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      placeholder="Contoh: Kasir, Staff HR, Kepala Lab"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Departemen / Divisi</label>
                    <input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Contoh: Finance, Warehouse, Poli Gigi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">No. WhatsApp / HP</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email (opsional)</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="pic@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lokasi Kerja Fisik</label>
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">— Pilih Lokasi Kerja —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Contoh: Jam kerja shift pagi, kontak cadangan..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                    PIC Status Aktif (Tersedia untuk dipilih di tiket & aset)
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={submitForm}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : null}
                  <span>{editing ? "Simpan Perubahan" : "Simpan PIC"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
