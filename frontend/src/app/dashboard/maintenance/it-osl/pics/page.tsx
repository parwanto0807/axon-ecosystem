"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, UserPlus, Phone, Mail, MapPin, Search, 
  Upload, Download, X, Loader2, Edit2, Eye, Trash2, 
  LayoutGrid, LayoutList, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, MessageCircle, Package, 
  Wrench, Building2, Briefcase, Plus, FileSpreadsheet, 
  RotateCcw, CheckCircle2, AlertCircle, Copy, Check,
  Filter, Sparkles, PhoneCall, ChevronDown, ChevronUp,
  FolderKanban, Layers
} from "lucide-react"

import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type CustomerOpt = {
  id: string
  code: string
  name: string
  companyName?: string | null
}

type Pic = {
  id: string
  code: string
  name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  locationId: string | null
  location: { id: string; name: string; code?: string } | null
  customerId?: string | null
  customer?: { id: string; code: string; name: string; companyName?: string | null } | null
  notes: string | null
  isActive: boolean
  assetCount?: number
  ticketCount?: number
  createdAt?: string
}

type PicDetail = Pic & {
  assets?: {
    id: string
    name: string
    assetCode: string
    brandModel: string | null
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

type Location = { id: string; code: string; name: string; customerId?: string | null }

export default function ItOslPicsPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?:string })?.id || null
  const currentRole = (session?.user as { role?:string })?.role || null
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'

  const getAuthHeaders = (): Record<string, string> => ({
    "x-user-id": currentUserId || "",
    "x-user-role": currentRole || "",
    "x-user-email": session?.user?.email || "",
  })

  const [pics, setPics] = useState<Pic[]>([])
  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  // Grouping State
  const [groupByCustomer, setGroupByCustomer] = useState<boolean>(true)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Filters & Search
  const [q, setQ] = useState("")
  const [filterCustomer, setFilterCustomer] = useState("")
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
    customerId: "",
    name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: "", isActive: true
  })
  const [saving, setSaving] = useState(false)

  // Quick Add Location Modal State
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationForm, setLocationForm] = useState({ code: "", name: "", address: "" })
  const [savingLocation, setSavingLocation] = useState(false)

  const submitQuickLocation = async () => {
    if (!locationForm.name.trim()) return alert("Nama lokasi wajib diisi")
    setSavingLocation(true)
    try {
      let code = locationForm.code.trim().toUpperCase()
      if (!code) {
        code = locationForm.name.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() || "LOC"
      }

      const payload = {
        code,
        name: locationForm.name.trim(),
        address: locationForm.address.trim() || null,
      }
      const res = await fetch(`${API}/api/it-osl/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal membuat lokasi baru")

      // Update locations list
      setLocations(prev => [...prev, d])
      // Auto-select in pic form
      setForm(prev => ({ ...prev, locationId: d.id }))
      setShowAddLocationModal(false)
      setLocationForm({ code: "", name: "", address: "" })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menyimpan lokasi")
    } finally {
      setSavingLocation(false)
    }
  }

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PicDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  // Fetch initial data
  const load = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [pRes, lRes, cRes] = await Promise.all([
        fetch(`${API}/api/it-osl/pics`, { headers }),
        fetch(`${API}/api/it-osl/locations`, { headers }),
        fetch(`${API}/api/it-osl/customers`, { headers }),
      ])
      if (pRes.ok) setPics(await pRes.json())
      if (lRes.ok) setLocations(await lRes.json())
      if (cRes.ok) {
        const custList = await cRes.json()
        const cArr = Array.isArray(custList) ? custList : []
        setCustomers(cArr)
        if (!isAdmin && cArr.length === 1) {
          setFilterCustomer(cArr[0].id)
          setForm(f => ({ ...f, customerId: f.customerId || cArr[0].id }))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session !== undefined) {
      load()
    }
  }, [session?.user?.email, currentUserId, currentRole])

  // Load detail
  const loadDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API}/api/it-osl/pics/${id}`, { headers: getAuthHeaders() })
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
        const matchCust = (p.customer?.name || p.customer?.companyName || "").toLowerCase().includes(query)
        if (!matchName && !matchPhone && !matchDept && !matchPos && !matchEmail && !matchLoc && !matchCust) {
          return false
        }
      }
      if (filterCustomer && p.customerId !== filterCustomer && p.customer?.id !== filterCustomer) return false
      if (filterDept && (p.department || "").trim().toLowerCase() !== filterDept.toLowerCase()) return false
      if (filterLocation && p.locationId !== filterLocation) return false
      if (filterActive === "active" && !p.isActive) return false
      if (filterActive === "inactive" && p.isActive) return false
      return true
    })
  }, [pics, q, filterCustomer, filterDept, filterLocation, filterActive])

  useEffect(() => {
    setCurrentPage(1)
  }, [q, filterCustomer, filterDept, filterLocation, filterActive, pageSize])

  const totalItems = filteredPics.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedPics = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPics.slice(start, start + pageSize)
  }, [filteredPics, currentPage, pageSize])

  // Grouped by Customer Calculation
  const groupedPics = useMemo(() => {
    const groupsMap = new Map<string, {
      customerId: string
      customerName: string
      customerCode: string
      customerCompany: string | null
      pics: Pic[]
      activeCount: number
      assetCount: number
      ticketCount: number
    }>()

    // Initialize with customers list
    customers.forEach(c => {
      groupsMap.set(c.id, {
        customerId: c.id,
        customerName: c.name,
        customerCode: c.code,
        customerCompany: c.companyName || null,
        pics: [],
        activeCount: 0,
        assetCount: 0,
        ticketCount: 0,
      })
    })

    const unassignedId = "unassigned"

    filteredPics.forEach(p => {
      const cid = p.customerId || p.customer?.id || unassignedId
      if (!groupsMap.has(cid)) {
        groupsMap.set(cid, {
          customerId: cid,
          customerName: cid === unassignedId ? "Tanpa Customer / Internal" : (p.customer?.name || "Customer"),
          customerCode: cid === unassignedId ? "INTERNAL" : (p.customer?.code || ""),
          customerCompany: p.customer?.companyName || null,
          pics: [],
          activeCount: 0,
          assetCount: 0,
          ticketCount: 0,
        })
      }
      const grp = groupsMap.get(cid)!
      grp.pics.push(p)
      if (p.isActive) grp.activeCount++
      grp.assetCount += (p.assetCount || 0)
      grp.ticketCount += (p.ticketCount || 0)
    })

    return Array.from(groupsMap.values())
      .filter(g => g.pics.length > 0 || (filterCustomer && g.customerId === filterCustomer))
      .sort((a, b) => {
        if (a.customerId === unassignedId) return 1
        if (b.customerId === unassignedId) return -1
        return a.customerName.localeCompare(b.customerName)
      })
  }, [filteredPics, customers, filterCustomer])

  const toggleCollapse = (custId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [custId]: !prev[custId] }))
  }

  const expandAll = () => setCollapsedGroups({})
  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    groupedPics.forEach(g => { next[g.customerId] = true })
    setCollapsedGroups(next)
  }

  const clearAllFilters = () => {
    setQ("")
    setFilterCustomer("")
    setFilterDept("")
    setFilterLocation("")
    setFilterActive("")
  }

  // Form handlers
  const openCreate = (prefillCustomerId?: string | unknown) => {
    const custId = typeof prefillCustomerId === "string" ? prefillCustomerId : undefined
    setEditing(null)
    setForm({
      customerId: (custId && custId !== "unassigned") ? custId : filterCustomer || (customers[0]?.id || ""),
      name: "", position: "", department: "", phone: "", email: "",
      locationId: locations[0]?.id || "", notes: "", isActive: true
    })
    setShowForm(true)
  }

  const openEdit = (p: Pic) => {
    setEditing(p)
    setForm({
      customerId: p.customerId || p.customer?.id || "",
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
        customerId: form.customerId || null,
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
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-4 pb-28 md:pb-8 overflow-x-hidden font-sans relative">
      {/* ── 1. HEADER ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20 text-white">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                Direktori PIC Unit
              </h1>
              <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {pics.length} PIC
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              Kontak Penanggung Jawab Unit, Pelapor Tiket & Pemegang Aset
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
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
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-slate-700 transition shadow-sm hidden sm:flex"
            title="Unduh Template CSV PIC"
          >
            <FileSpreadsheet size={16} />
          </button>

          <button
            onClick={openCreate}
            className="hidden sm:flex px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
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
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-left hover:border-slate-300 transition active:scale-95"
        >
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total PIC Terdaftar</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{metrics.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.deptCount} Unit / Departemen</p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterActive("active"); }}
          className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-left hover:border-emerald-300 transition active:scale-95"
        >
          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">PIC Aktif</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{metrics.active}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Siap dihubungi</p>
        </button>

        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
          <p className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Pegang Aset</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{metrics.withAssets}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Memegang &ge;1 perangkat</p>
        </div>

        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Non-Aktif</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{metrics.inactive}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Riwayat PIC lama</p>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTERS TOOLBAR ───────────────────────────────────────── */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari PIC, no. telepon/WA, departemen, jabatan, lokasi..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {customers.length > 0 && (
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="px-3 py-2 rounded-xl border border-indigo-200 text-xs font-bold bg-indigo-50/50 text-indigo-900 max-w-[190px]"
              >
                <option value="">Semua Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setGroupByCustomer(!groupByCustomer)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  groupByCustomer
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
                title="Kelompokkan PIC berdasarkan Customer"
              >
                <FolderKanban size={14} />
                <span className="hidden sm:inline">Group Customer</span>
                <span className="sm:hidden">Group</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                title="Tampilan Tabel"
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Customer Quick Pills Tabs Bar */}
        {customers.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pilih Customer:</span>
              {groupByCustomer && groupedPics.length > 1 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button onClick={expandAll} className="text-indigo-600 hover:underline font-bold">Buka Semua</button>
                  <span className="text-slate-300">•</span>
                  <button onClick={collapseAll} className="text-slate-500 hover:underline font-medium">Tutup Semua</button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <button
                onClick={() => setFilterCustomer("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                  !filterCustomer
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <Building2 size={13} />
                <span>Semua Customer</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
                  {pics.length}
                </span>
              </button>

              {customers.map((c) => {
                const count = pics.filter(p => p.customerId === c.id || p.customer?.id === c.id).length
                const isSelected = filterCustomer === c.id

                return (
                  <button
                    key={c.id}
                    onClick={() => setFilterCustomer(isSelected ? "" : c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {(q || filterCustomer || filterDept || filterLocation || filterActive) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
            <span>Filter Aktif:</span>
            {filterCustomer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 text-[11px] font-semibold">
                Customer: {customers.find(c => c.id === filterCustomer)?.name}
                <button onClick={() => setFilterCustomer("")}><X size={11} /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px]">
              <RotateCcw size={11} /> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── 4. DATA VIEW (GROUPED BY CUSTOMER OR FLAT LIST) ───────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-xs sm:text-sm font-bold text-slate-600">Memuat Direktori PIC...</p>
        </div>
      ) : filteredPics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500 space-y-2.5">
          <Users size={36} className="mx-auto text-slate-300" />
          <h3 className="font-black text-sm sm:text-base text-slate-800">Tidak ada PIC yang sesuai</h3>
          <p className="text-xs text-slate-400">Tekan tombol Tambah PIC untuk mendaftarkan kontak baru.</p>
        </div>
      ) : groupByCustomer ? (
        /* ══════════ GROUPED BY CUSTOMER VIEW ══════════ */
        <div className="space-y-4">
          {groupedPics.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.customerId])

            return (
              <div
                key={group.customerId}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden transition hover:border-slate-300"
              >
                {/* Customer Group Header */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div 
                    onClick={() => toggleCollapse(group.customerId)}
                    className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                          {group.customerName}
                        </h2>
                        {group.customerCode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700">
                            {group.customerCode}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {group.pics.length} PIC Terdaftar
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{group.activeCount} PIC Aktif</span>
                        <span>•</span>
                        <span>{group.assetCount} Aset Dipegang</span>
                        <span>•</span>
                        <span>{group.ticketCount} Tiket Dilaporkan</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => openCreate(group.customerId)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition active:scale-95 border border-indigo-200"
                    >
                      <Plus size={14} />
                      <span>Tambah PIC</span>
                    </button>

                    <button
                      onClick={() => toggleCollapse(group.customerId)}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                      title={isCollapsed ? "Buka Daftar PIC" : "Tutup Daftar PIC"}
                    >
                      {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                </div>

                {/* Customer Group Body */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4">
                    {group.pics.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs italic">
                        Belum ada PIC terdaftar untuk customer ini.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card List per Group */}
                        <div className="block md:hidden space-y-2.5">
                          {group.pics.map((p) => {
                            const waUrl = getWhatsAppUrl(p.phone)

                            return (
                              <div
                                key={p.id}
                                className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                                      {p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 
                                        onClick={() => setDetailId(p.id)}
                                        className="font-bold text-slate-900 text-xs truncate hover:text-indigo-600 cursor-pointer"
                                      >
                                        {p.name}
                                      </h3>
                                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                        {p.position ? `${p.position} • ` : ""}{p.department || "Umum"}
                                      </p>
                                    </div>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                    p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                                  }`}>
                                    {p.isActive ? "Aktif" : "Non-aktif"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <MapPin size={11} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{p.location?.name || "-"}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 font-medium">
                                    <span className="text-indigo-600 font-bold">{p.assetCount || 0} Aset</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{p.ticketCount || 0} Tiket</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                                  {p.phone && waUrl ? (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                                    >
                                      <MessageCircle size={12} />
                                      <span>WhatsApp</span>
                                    </a>
                                  ) : (
                                    <span className="flex-1 py-1 px-2 bg-white rounded-lg text-slate-400 text-[10px] text-center italic">
                                      Tanpa WA
                                    </span>
                                  )}

                                  <button
                                    onClick={() => setDetailId(p.id)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 transition"
                                  >
                                    <Eye size={12} /> Detail
                                  </button>
                                  <button
                                    onClick={() => openEdit(p)}
                                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Desktop View per Group */}
                        <div className="hidden md:block">
                          {viewMode === "table" ? (
                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="p-3">Nama PIC</th>
                                    <th className="p-3">Jabatan & Departemen</th>
                                    <th className="p-3">Kontak (WA / Telp)</th>
                                    <th className="p-3">Lokasi Kerja</th>
                                    <th className="p-3 text-center">Aset</th>
                                    <th className="p-3 text-center">Tiket</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right w-24">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {group.pics.map((p) => {
                                    const waUrl = getWhatsAppUrl(p.phone)

                                    return (
                                      <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors">
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

                                        <td className="p-3">
                                          <div>
                                            <p className="font-semibold text-slate-800">{p.position || "-"}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{p.department || "Umum"}</p>
                                          </div>
                                        </td>

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
                                                  title="Kirim WhatsApp"
                                                >
                                                  <MessageCircle size={13} />
                                                </a>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 text-xs italic">Tanpa No. HP</span>
                                          )}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-xs font-medium">
                                            <MapPin size={11} className="text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[120px]">{p.location?.name || "-"}</span>
                                          </span>
                                        </td>

                                        <td className="p-3 text-center whitespace-nowrap">
                                          <button
                                            onClick={() => setDetailId(p.id)}
                                            className="font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                                          >
                                            {p.assetCount || 0} Aset
                                          </button>
                                        </td>

                                        <td className="p-3 text-center whitespace-nowrap">
                                          <span className="font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            {p.ticketCount || 0} Tiket
                                          </span>
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                                          }`}>
                                            {p.isActive ? "Aktif" : "Non-aktif"}
                                          </span>
                                        </td>

                                        <td className="p-3 text-right whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              onClick={() => setDetailId(p.id)}
                                              className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                                              title="Detail PIC"
                                            >
                                              <Eye size={12} />
                                            </button>
                                            <button
                                              onClick={() => openEdit(p)}
                                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                              title="Edit PIC"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {group.pics.map((p) => {
                                const waUrl = getWhatsAppUrl(p.phone)

                                return (
                                  <div key={p.id} className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-3.5 flex flex-col justify-between hover:bg-white hover:shadow-sm transition">
                                    <div>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-200">
                                          {p.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                          p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                                        }`}>
                                          {p.isActive ? "Aktif" : "Nonaktif"}
                                        </span>
                                      </div>

                                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm mt-2.5 hover:text-indigo-600 cursor-pointer truncate" onClick={() => setDetailId(p.id)}>
                                        {p.name}
                                      </h3>
                                      <p className="text-[11px] text-slate-500 font-medium truncate">
                                        {p.position ? `${p.position} • ` : ""}{p.department || "Umum"}
                                      </p>

                                      <div className="space-y-1 mt-2.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                                        <p className="flex items-center gap-1.5">
                                          <MapPin size={12} className="text-slate-400 shrink-0" />
                                          <span className="truncate">{p.location?.name || "-"}</span>
                                        </p>
                                        {p.phone && (
                                          <p className="flex items-center justify-between gap-1 font-mono text-[11px]">
                                            <span className="flex items-center gap-1 text-slate-700">
                                              <Phone size={11} className="text-slate-400 shrink-0" />
                                              <span>{p.phone}</span>
                                            </span>
                                            {waUrl && (
                                              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-[10px] font-bold font-sans">
                                                WA
                                              </a>
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                                      <button
                                        onClick={() => setDetailId(p.id)}
                                        className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 transition"
                                      >
                                        <Eye size={12} /> Detail
                                      </button>
                                      <button
                                        onClick={() => openEdit(p)}
                                        className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                                        title="Edit PIC"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ══════════ FLAT LIST VIEW WITH PAGINATION ══════════ */
        <>
          {/* MOBILE VIEW (CARD LIST) */}
          <div className="block md:hidden space-y-2.5">
            {paginatedPics.map((p) => {
              const waUrl = getWhatsAppUrl(p.phone)

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-100 p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 
                            onClick={() => setDetailId(p.id)}
                            className="font-black text-slate-900 text-xs sm:text-sm truncate hover:text-indigo-600 cursor-pointer"
                          >
                            {p.name}
                          </h3>
                          {p.customer && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              {p.customer.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {p.position ? `${p.position} • ` : ""}{p.department || "Umum"}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                      p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {p.isActive ? "Aktif" : "Non-aktif"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{p.location?.name || "-"}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-indigo-600 font-bold">{p.assetCount || 0} Aset</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-semibold">{p.ticketCount || 0} Tiket</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
                    {p.phone && waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <MessageCircle size={13} />
                        <span>Chat WhatsApp</span>
                      </a>
                    ) : (
                      <span className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 text-slate-400 text-[11px] text-center italic">
                        Tanpa Nomor WA
                      </span>
                    )}

                    <button
                      onClick={() => setDetailId(p.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                    >
                      <Eye size={12} /> Detail
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 active:scale-95"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE / GRID VIEW */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3.5">Nama PIC</th>
                        <th className="p-3.5">Customer</th>
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

                            <td className="p-3">
                              {p.customer ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <Building2 size={11} /> {p.customer.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">-</span>
                              )}
                            </td>

                            <td className="p-3">
                              <div>
                                <p className="font-semibold text-slate-800">{p.position || "-"}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{p.department || "Umum"}</p>
                              </div>
                            </td>

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

                            <td className="p-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-medium">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{p.location?.name || "-"}</span>
                              </span>
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => setDetailId(p.id)}
                                className="font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                              >
                                {p.assetCount || 0} Aset
                              </button>
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {p.ticketCount || 0} Tiket
                              </span>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                              }`}>
                                {p.isActive ? "Aktif" : "Non-aktif"}
                              </span>
                            </td>

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
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
                {paginatedPics.map((p) => {
                  const waUrl = getWhatsAppUrl(p.phone)

                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-between hover:shadow-md transition">
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
                        {p.customer && (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
                            {p.customer.name}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 font-medium mt-1">
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
          </div>

          {/* Pagination for Flat List */}
          {totalItems > 0 && (
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-bold"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span className="text-[11px] text-slate-500">
                  <b>{(currentPage - 1) * pageSize + 1}</b>–<b>{Math.min(currentPage * pageSize, totalItems)}</b> dari <b>{totalItems}</b>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border disabled:opacity-30"><ChevronsLeft size={14} /></button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border disabled:opacity-30"><ChevronLeft size={14} /></button>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border disabled:opacity-30"><ChevronRight size={14} /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border disabled:opacity-30"><ChevronsRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={openCreate} 
        className="fixed bottom-20 right-4 sm:hidden w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Tambah PIC Baru"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* ── 7. PIC DETAIL DRAWER (Shows Assets Held & Ticket History) ──────────── */}
      <AnimatePresence>
        {detailId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-end items-end sm:items-stretch"
            onClick={() => setDetailId(null)}
          >
            <motion.div
              initial={{ y: "100%", x: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={{ y: "100%", x: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-xl lg:max-w-2xl h-[92dvh] sm:h-[100dvh] rounded-t-3xl sm:rounded-none flex flex-col shadow-2xl overflow-hidden pb-safe"
            >
              {loadingDetail && !detail ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                  <p className="text-xs sm:text-sm font-bold text-slate-700">Memuat profil PIC...</p>
                </div>
              ) : detail ? (
                <>
                  <div className="p-4 sm:p-5 border-b shrink-0 bg-slate-50 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                        {detail.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-lg font-black text-slate-900 truncate">{detail.name}</h2>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            detail.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}>
                            {detail.isActive ? "Aktif" : "Non-aktif"}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                          {detail.position ? `${detail.position} • ` : ""}{detail.department || "Unit Umum"}
                        </p>
                        {detail.customer && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg mt-1.5">
                            <Building2 size={12} className="text-indigo-600" />
                            <span>Customer: {detail.customer.name} {detail.customer.companyName ? `(${detail.customer.companyName})` : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setDetailId(null); openEdit(detail); }} className="p-2 rounded-xl border bg-white text-slate-700 shadow-sm" title="Edit PIC">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Contact Card */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 sm:p-4 space-y-2 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Informasi Kontak</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400 shrink-0" />
                          <span className="font-mono">{detail.phone || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{detail.email || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span>{detail.location?.name || "-"}</span>
                        </div>
                      </div>

                      {detail.phone && getWhatsAppUrl(detail.phone) && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <a
                            href={getWhatsAppUrl(detail.phone)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                          >
                            <MessageCircle size={15} /> Hubungi via WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Assets Held */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Package size={13} /> Aset Dipegang ({detail.assets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.assets || detail.assets.length === 0) ? (
                        <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                          PIC ini belum memegang perangkat aset terdaftar.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {detail.assets.map(a => (
                            <div key={a.id} className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-slate-900 text-white rounded">
                                  {a.assetCode}
                                </span>
                                <p className="font-bold text-slate-900 text-xs truncate mt-0.5">{a.name}</p>
                              </div>
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ticket History */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Wrench size={13} /> Riwayat Tiket Dilaporkan ({detail.tickets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.tickets || detail.tickets.length === 0) ? (
                        <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                          Belum ada riwayat tiket gangguan dari PIC ini.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {detail.tickets.map(t => (
                            <div key={t.id} className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-slate-900 text-white rounded">
                                  {t.ticketNumber}
                                </span>
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700">
                                  {t.status}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-xs truncate">{t.summary}</p>
                              <p className="text-[9px] text-slate-400">
                                {new Date(t.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 border-t bg-slate-50 flex items-center justify-between gap-2.5 shrink-0 pb-6 sm:pb-4">
                    <button
                      onClick={() => deletePic(detail.id, detail.name)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                    <button
                      onClick={() => { setDetailId(null); openEdit(detail); }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5"
                    >
                      <Edit2 size={13} /> Edit Data PIC
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. CREATE / EDIT PIC MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-safe"
            >
              {/* Sticky Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    {editing ? "Edit Data PIC" : "Tambah PIC Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    PIC / Contact Person penanggung jawab unit perangkat & pelapor tiket.
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* Customer (If Available) */}
                {customers.length > 0 && (
                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                    <label className="font-bold text-indigo-950 block mb-1 flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-600" />
                      <span>Customer / Klien</span>
                    </label>
                    <select
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-950 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">— Customer Umum / Internal (Global) —</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `• ${c.companyName}` : ""} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama PIC *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: Budi Santoso, Siti Rahmawati..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Jabatan / Posisi</label>
                      <input
                        value={form.position}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                        placeholder="Contoh: Kasir, Staff HR, Kepala Lab"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Departemen / Divisi</label>
                      <input
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        placeholder="Contoh: Finance, Warehouse, Poli Gigi"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">No. WhatsApp / HP</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Contoh: 08123456789"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Email (opsional)</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="pic@domain.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>

                  {/* Lokasi Fisik */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1 h-5">
                      <label className="font-bold text-slate-700">Lokasi Kerja Fisik</label>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationForm({ code: "", name: "", address: "" });
                          setShowAddLocationModal(true);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 active:scale-95 transition"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Tambah Lokasi</span>
                      </button>
                    </div>
                    <select
                      value={form.locationId}
                      onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
                    >
                      <option value="">— Pilih Lokasi Kerja —</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                    {locations.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> Belum ada lokasi. Klik <b>Tambah Lokasi</b> untuk membuat baru.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Contoh: Jam kerja shift pagi, kontak cadangan..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[50px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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

              {/* Sticky Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10 pb-6 sm:pb-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-1.5 disabled:opacity-60 transition"
                >
                  {saving ? <Loader2 className="animate-spin" size={13} /> : null}
                  <span>{editing ? "Simpan Perubahan" : "Simpan PIC"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 9. QUICK ADD LOCATION MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showAddLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowAddLocationModal(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-safe border border-slate-100"
            >
              {/* Sticky Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Tambah Lokasi Fisik Baru
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Lokasi baru akan langsung terpilih.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowAddLocationModal(false)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lokasi / Ruangan *</label>
                  <input
                    value={locationForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoCode = locationForm.code ? locationForm.code : val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
                      setLocationForm({ ...locationForm, name: val, code: autoCode });
                    }}
                    placeholder="Contoh: Server Room Lantai 2, Kasir Utama, Poli Gigi..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Lokasi (Singkatan)</label>
                  <input
                    value={locationForm.code}
                    onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: SRV-L2, KASIR-1, LT2..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Digunakan sebagai prefix identifikasi singkat lokasi.</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alamat / Keterangan Tambahan (opsional)</label>
                  <textarea
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                    placeholder="Contoh: Gedung A Lantai 2 Sayap Barat, Dekat Ruang IT..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10 pb-6 sm:pb-4">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitQuickLocation}
                  disabled={savingLocation}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-1.5 disabled:opacity-60 transition"
                >
                  {savingLocation ? <Loader2 className="animate-spin" size={13} /> : null}
                  <span>Simpan & Pilih Lokasi</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
