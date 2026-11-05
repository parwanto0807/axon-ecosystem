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
  FolderKanban, Layers, ExternalLink, ShieldCheck, Tag
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ItOslAccessGuard } from "@/components/it-osl/ItOslAccessGuard"
import { ItOslNav } from "@/components/it-osl/ItOslNav"
import { canItOsl } from "@/lib/itOslPermissions"

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
  return (
    <ItOslAccessGuard>
      <ItOslPicsContent />
    </ItOslAccessGuard>
  )
}

function ItOslPicsContent() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || null
  const currentRole = (session?.user as { role?: string })?.role || null
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'
  const canWrite = canItOsl(currentRole, 'master.write')
  const canLocationWrite = canItOsl(currentRole, 'location.write')
  const canPicWrite = canItOsl(currentRole, 'pic.write')

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
    name: "",
    position: "",
    department: "",
    phone: "",
    email: "",
    locationId: "",
    notes: "",
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  // Quick Add Location Modal State
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationForm, setLocationForm] = useState({ code: "", name: "", address: "" })
  const [savingLocation, setSavingLocation] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PicDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  const submitQuickLocation = async () => {
    if (!canLocationWrite) return alert("Role Anda tidak memiliki izin menambah lokasi")
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal membuat lokasi baru")

      setLocations(prev => [...prev, d])
      setForm(prev => ({ ...prev, locationId: d.id }))
      setShowAddLocationModal(false)
      setLocationForm({ code: "", name: "", address: "" })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menyimpan lokasi")
    } finally {
      setSavingLocation(false)
    }
  }

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
    if (!canPicWrite) return alert("Role Anda tidak memiliki izin menambah PIC")
    const custId = typeof prefillCustomerId === "string" ? prefillCustomerId : undefined
    setEditing(null)
    setForm({
      customerId: (custId && custId !== "unassigned") ? custId : filterCustomer || (customers[0]?.id || ""),
      name: "",
      position: "",
      department: "",
      phone: "",
      email: "",
      locationId: locations[0]?.id || "",
      notes: "",
      isActive: true
    })
    setShowForm(true)
  }

  const openEdit = (p: Pic) => {
    if (!canPicWrite) return alert("Role Anda tidak memiliki izin mengubah PIC")
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
    if (!canPicWrite) return alert("Role Anda tidak memiliki izin menyimpan PIC")
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    if (!canWrite) return alert("Hanya Admin/SuperAdmin yang dapat menghapus PIC")
    if (!confirm(`Hapus/Nonaktifkan PIC "${name}"? Jika PIC masih memiliki aset atau tiket terhubung, statusnya akan otomatis diubah menjadi Nonaktif.`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/pics/${id}`, { method: "DELETE", headers: getAuthHeaders() })
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

  // CSV Export
  const exportCsv = () => {
    if (filteredPics.length === 0) return alert("Tidak ada data PIC untuk diekspor")
    const headers = ["Nama PIC", "Jabatan", "Departemen / Unit", "Customer", "No. Telepon / WA", "Email", "Lokasi", "Jumlah Aset", "Status", "Catatan"]
    const rows = filteredPics.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.position || "").replace(/"/g, '""')}"`,
      `"${(p.department || "").replace(/"/g, '""')}"`,
      `"${(p.customer?.name || "-").replace(/"/g, '""')}"`,
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
    link.setAttribute("download", `Data_PIC_Axon_${new Date().toISOString().slice(0, 10)}.csv`)
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
    link.setAttribute("download", `Template_Import_PIC.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importCsv = async (file: File) => {
    if (!canPicWrite) return alert("Role Anda tidak memiliki izin mengimpor PIC")
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
  const getWhatsAppUrl = (phoneStr: string | null, picName?: string) => {
    if (!phoneStr) return null
    let clean = phoneStr.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    else if (!clean.startsWith("62")) clean = "62" + clean
    const msg = picName
      ? `Halo Bapak/Ibu ${picName}, dari IT Support Axon terkait koordinasi maintenance & tiket...`
      : "Halo dari IT Support Axon terkait koordinasi maintenance & operasional..."
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 pb-28 md:pb-8 font-sans">
      
      {/* ── SUB-NAVIGATION TABS ──────────────────────────────────────────────── */}
      <ItOslNav badgeCounts={{ pics: pics.length }} />

      {/* ── 1. HEADER & GLOBAL ACTIONS ────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 text-white">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Direktori PIC Unit
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                {pics.length} PIC
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Kontak Penanggung Jawab Unit Kerja • Pelapor Insiden • Pemegang Perangkat IT
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            onClick={exportCsv}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>

          {canPicWrite && (
            <label className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition">
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
          )}

          <button
            onClick={downloadTemplate}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-500 hover:text-slate-700 transition shadow-xs hidden sm:flex"
            title="Unduh Template CSV PIC"
          >
            <FileSpreadsheet size={15} />
          </button>

          {canPicWrite && (
            <button
              onClick={() => openCreate()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 transition"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Tambah PIC</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. KPI TELEMETRY METRIC TILES ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={clearAllFilters}
          className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-left hover:border-slate-300 dark:hover:border-slate-700 transition active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total PIC Terdaftar</span>
            <Users size={14} className="text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{metrics.total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{metrics.deptCount} Unit / Departemen</p>
        </button>

        <button
          onClick={() => { clearAllFilters(); setFilterActive("active"); }}
          className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border text-left transition active:scale-95 shadow-xs ${
            filterActive === "active" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80 dark:border-slate-800 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">PIC Aktif</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{metrics.active}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Siap dihubungi</p>
        </button>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Pegang Aset</span>
            <Package size={14} className="text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{metrics.withAssets}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Memegang &ge;1 perangkat</p>
        </div>

        <button
          onClick={() => { clearAllFilters(); setFilterActive("inactive"); }}
          className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border text-left transition active:scale-95 shadow-xs ${
            filterActive === "inactive" ? "border-slate-500 ring-2 ring-slate-500/20" : "border-slate-200/80 dark:border-slate-800 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Non-Aktif</span>
            <div className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{metrics.inactive}</p>
          <p className="text-xs text-slate-400 mt-0.5">Riwayat kontak lama</p>
        </button>
      </div>

      {/* ── 3. SEARCH & STREAMLINED FILTER TOOLBAR ────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari PIC, no. telepon/WA, departemen, jabatan, lokasi..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            {/* View Switchers */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setGroupByCustomer(!groupByCustomer)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  groupByCustomer
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Kelompokkan PIC berdasarkan Customer"
              >
                <FolderKanban size={14} />
                <span className="hidden sm:inline">Kelompokkan</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />

              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "table" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
                title="Tampilan Tabel"
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "grid" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Unified Customer Pills Strip */}
        {customers.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Customer:</span>
              {groupByCustomer && groupedPics.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={expandAll} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Buka Semua</button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button onClick={collapseAll} className="text-slate-500 dark:text-slate-400 hover:underline font-medium">Tutup Semua</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setFilterCustomer("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                  !filterCustomer
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Building2 size={13} />
                <span>Semua Customer</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 dark:bg-black/20">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Filter Summary */}
        {(q || filterCustomer || filterDept || filterLocation || filterActive) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span>Filter Aktif:</span>
            {filterCustomer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 text-[11px] font-semibold">
                Customer: {customers.find(c => c.id === filterCustomer)?.name}
                <button onClick={() => setFilterCustomer("")}><X size={11} /></button>
              </span>
            )}
            {filterDept && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                Dept: {filterDept}
                <button onClick={() => setFilterDept("")}><X size={11} /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 text-[11px]">
              <RotateCcw size={11} /> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── 4. DATA VIEW ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Memuat Direktori PIC...</p>
        </div>
      ) : filteredPics.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-500 space-y-3">
          <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">Tidak ada PIC yang sesuai</h3>
          <p className="text-xs text-slate-400">Tekan tombol Tambah PIC untuk mendaftarkan kontak penanggung jawab baru.</p>
        </div>
      ) : groupByCustomer ? (
        /* ══════════ GROUPED BY CUSTOMER ACCORDION VIEW ══════════ */
        <div className="space-y-4">
          {groupedPics.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.customerId])

            return (
              <div
                key={group.customerId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Customer Group Header */}
                <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div 
                    onClick={() => toggleCollapse(group.customerId)}
                    className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {group.customerName}
                        </h2>
                        {group.customerCode && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {group.customerCode}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {group.pics.length} PIC
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{group.activeCount} PIC Aktif</span>
                        <span>•</span>
                        <span>{group.assetCount} Aset Dipegang</span>
                        <span>•</span>
                        <span>{group.ticketCount} Tiket Dilaporkan</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canPicWrite && (
                      <button
                        onClick={() => openCreate(group.customerId)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition active:scale-95 border border-indigo-200 dark:border-indigo-800"
                      >
                        <Plus size={14} />
                        <span>Tambah PIC</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleCollapse(group.customerId)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300 transition"
                      title={isCollapsed ? "Buka Daftar PIC" : "Tutup Daftar PIC"}
                    >
                      {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                </div>

                {/* Customer Group Body */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4">
                    {viewMode === "grid" ? (
                      /* Grid per customer */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.pics.map((p) => renderPicCard(p))}
                      </div>
                    ) : (
                      /* Table per customer */
                      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                        {renderPicTable(group.pics)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ══════════ FLAT VIEW ══════════ */
        <div>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {paginatedPics.map((p) => renderPicCard(p))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                {renderPicTable(paginatedPics)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. PAGINATION (Flat Mode) ─────────────────────────────────────────── */}
      {!groupByCustomer && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} PIC</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
              Hal. {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── 6. PIC DETAIL MODAL / DRAWER ─────────────────────────────────────── */}
      <AnimatePresence>
        {detailId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setDetailId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800"
            >
              {loadingDetail || !detail ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-indigo-600" size={28} />
                  <p className="text-xs font-semibold">Memuat Profil PIC...</p>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                        {detail.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                            {detail.name}
                          </h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            detail.isActive 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {detail.isActive ? "Aktif" : "Non-aktif"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {detail.position ? `${detail.position} • ` : ""}{detail.department || "Unit Umum"}
                          {detail.customer?.name ? ` @ ${detail.customer.name}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canPicWrite && (
                        <button
                          onClick={() => { openEdit(detail); setDetailId(null); }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition"
                          title="Edit PIC"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* Fast Communication Action Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {detail.phone ? (
                        <>
                          <a
                            href={getWhatsAppUrl(detail.phone, detail.name) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-semibold hover:bg-emerald-100 transition"
                          >
                            <MessageCircle size={16} />
                            <span>Kirim WhatsApp</span>
                          </a>

                          <a
                            href={`tel:${detail.phone}`}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 font-semibold hover:bg-slate-100 transition"
                          >
                            <Phone size={16} />
                            <span>Panggil Telepon</span>
                          </a>
                        </>
                      ) : (
                        <div className="sm:col-span-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 text-center text-slate-400 italic">
                          Nomor telepon tidak tercatat
                        </div>
                      )}

                      {detail.email ? (
                        <a
                          href={`mailto:${detail.email}`}
                          className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2 font-semibold hover:bg-indigo-100 transition truncate"
                        >
                          <Mail size={16} />
                          <span className="truncate">Kirim Email</span>
                        </a>
                      ) : (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 text-center text-slate-400 italic">
                          Tanpa Email
                        </div>
                      )}
                    </div>

                    {/* Work Location & Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Lokasi Penempatan</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.location?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Customer</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.customer?.name || "Internal"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Nomor Telepon</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{detail.phone || "-"}</span>
                          {detail.phone && (
                            <button onClick={() => copyPhone(detail.phone!)} className="text-slate-400 hover:text-slate-600">
                              {copiedPhone === detail.phone ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                      {detail.notes && (
                        <div className="sm:col-span-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Catatan Khusus</p>
                          <p className="text-slate-700 dark:text-slate-300 mt-0.5">{detail.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Assigned Assets Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Package size={14} className="text-indigo-600" />
                          <span>Perangkat Aset yang Dipegang ({detail.assets?.length || 0})</span>
                        </p>
                        <Link
                          href={`/dashboard/maintenance/it-osl/assets?pic=${detail.id}`}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>Buka di Registri Aset</span>
                          <ExternalLink size={11} />
                        </Link>
                      </div>

                      {(!detail.assets || detail.assets.length === 0) ? (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400 text-xs">
                          PIC ini belum memegang perangkat aset apapun saat ini.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {detail.assets.map((a) => (
                            <div
                              key={a.id}
                              className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                                  {a.assetCode}
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                  {a.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {a.brandModel || "Hardware"} • {a.location?.name || "Lokasi"}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reported Tickets Section */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Wrench size={14} className="text-indigo-600" />
                        <span>Riwayat Tiket Insiden PIC ({detail.tickets?.length || 0})</span>
                      </p>

                      {(!detail.tickets || detail.tickets.length === 0) ? (
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400 text-xs">
                          Belum ada tiket atau laporan masalah dari PIC ini.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
                          {detail.tickets.slice(0, 10).map((t) => (
                            <div key={t.id} className="p-3 bg-white dark:bg-slate-800/50 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                                    {t.ticketNumber}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                                    {t.status}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                  {t.summary}
                                </p>
                              </div>
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 7. CREATE / EDIT PIC MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {editing ? "Perbarui Data PIC" : "Tambah PIC Unit Baru"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Kontak person penanggung jawab operasional & perangkat
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {customers.length > 0 && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer / Perusahaan</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Internal / Tanpa Customer Khusus</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Lengkap PIC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Contoh: Budi Santoso, Siti Rahma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jabatan</label>
                    <input
                      value={form.position}
                      onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
                      placeholder="Contoh: Staff Kasir, Supervisor IT"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Departemen / Unit</label>
                    <input
                      value={form.department}
                      onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                      placeholder="Contoh: Finance, Operasional, HRD"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. WhatsApp / Telepon</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="budi@axon.id"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Lokasi Kerja</label>
                      {canLocationWrite && (
                        <button
                          type="button"
                          onClick={() => setShowAddLocationModal(true)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          + Buat Lokasi
                        </button>
                      )}
                    </div>
                    <select
                      value={form.locationId}
                      onChange={(e) => setForm(f => ({ ...f, locationId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Pilih Lokasi</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Keaktifan</label>
                    <select
                      value={form.isActive ? "true" : "false"}
                      onChange={(e) => setForm(f => ({ ...f, isActive: e.target.value === "true" }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="true">Aktif (Dapat Dihubungi)</option>
                      <option value="false">Non-aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Catatan Tambahan</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Waktu shift kerja, preferensi kontak, atau catatan khusus..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitForm}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <span>{editing ? "Perbarui PIC" : "Simpan PIC"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. QUICK ADD LOCATION MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAddLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowAddLocationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin size={16} className="text-indigo-600" />
                  <span>Tambah Lokasi Baru Cepat</span>
                </h3>
                <button onClick={() => setShowAddLocationModal(false)} className="p-1 rounded-full text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Nama Lokasi <span className="text-rose-500">*</span></label>
                  <input
                    value={locationForm.name}
                    onChange={(e) => setLocationForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Contoh: Ruang Kasir A, Server Lt. 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Kode Lokasi</label>
                  <input
                    value={locationForm.code}
                    onChange={(e) => setLocationForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="Contoh: KASIR-A (auto jika kosong)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddLocationModal(false)} className="px-3 py-2 rounded-xl border text-xs font-semibold">
                  Batal
                </button>
                <button
                  disabled={savingLocation}
                  onClick={submitQuickLocation}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingLocation ? "Menyimpan..." : "Simpan & Pilih"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )

  // Sub-renderers for clean structure
  function renderPicCard(p: Pic) {
    const waUrl = getWhatsAppUrl(p.phone, p.name)

    return (
      <div
        key={p.id}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
      >
        <div>
          {/* Card Top: Avatar, Name, Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3
                  onClick={() => setDetailId(p.id)}
                  className="font-bold text-slate-900 dark:text-white text-sm truncate hover:text-indigo-600 cursor-pointer"
                  title={p.name}
                >
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {p.position ? `${p.position} • ` : ""}{p.department || "Unit Umum"}
                </p>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border ${
              p.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              {p.isActive ? "Aktif" : "Non-aktif"}
            </span>
          </div>

          {/* Location & Customer tags */}
          <div className="pt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{p.location?.name || "Belum ada lokasi"}</span>
            </div>

            {p.customer?.name && (
              <div className="flex items-center gap-1.5 truncate">
                <Building2 size={13} className="text-slate-400 shrink-0" />
                <span className="truncate font-semibold text-indigo-600 dark:text-indigo-400">{p.customer.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Bottom: Contact triggers + Counts + Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-1 text-xs">
            <button
              onClick={() => setDetailId(p.id)}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              {p.assetCount || 0} Unit Aset
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500">{p.ticketCount || 0} Tiket</span>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1 flex-1">
              {p.phone && waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  title="Chat WhatsApp"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <span className="flex-1 py-1 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs text-center italic">
                  Tanpa WA
                </span>
              )}

              {p.phone && (
                <a
                  href={`tel:${p.phone}`}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition"
                  title="Telepon Langsung"
                >
                  <Phone size={13} />
                </a>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setDetailId(p.id)}
                className="p-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition"
                title="Detail PIC"
              >
                <Eye size={13} />
              </button>
              {canPicWrite && (
                <button
                  onClick={() => openEdit(p)}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
                  title="Edit PIC"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderPicTable(list: Pic[]) {
    return (
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th className="p-3">Nama PIC</th>
            <th className="p-3">Jabatan & Departemen</th>
            <th className="p-3">Customer & Lokasi</th>
            <th className="p-3">Kontak Cepat</th>
            <th className="p-3 text-center">Aset</th>
            <th className="p-3 text-center">Tiket</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right w-24">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {list.map((p) => {
            const waUrl = getWhatsAppUrl(p.phone, p.name)

            return (
              <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p 
                        onClick={() => setDetailId(p.id)}
                        className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm hover:text-indigo-600 cursor-pointer"
                      >
                        {p.name}
                      </p>
                      {p.email && <p className="text-[11px] text-slate-400 truncate">{p.email}</p>}
                    </div>
                  </div>
                </td>

                <td className="p-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{p.position || "-"}</p>
                  <p className="text-[11px] text-slate-500">{p.department || "Unit Umum"}</p>
                </td>

                <td className="p-3">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{p.location?.name || "-"}</p>
                  {p.customer?.name && (
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{p.customer.name}</p>
                  )}
                </td>

                <td className="p-3 whitespace-nowrap">
                  {p.phone ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{p.phone}</span>
                      <button
                        onClick={() => copyPhone(p.phone!)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Salin nomor telepon"
                      >
                        {copiedPhone === p.phone ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 transition"
                          title="Chat WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </a>
                      )}
                      <a
                        href={`tel:${p.phone}`}
                        className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 transition"
                        title="Telepon"
                      >
                        <Phone size={13} />
                      </a>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Tanpa No. HP</span>
                  )}
                </td>

                <td className="p-3 text-center whitespace-nowrap">
                  <button
                    onClick={() => setDetailId(p.id)}
                    className="font-bold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                  >
                    {p.assetCount || 0} Aset
                  </button>
                </td>

                <td className="p-3 text-center whitespace-nowrap">
                  <span className="font-semibold text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    {p.ticketCount || 0} Tiket
                  </span>
                </td>

                <td className="p-3 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    p.isActive 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {p.isActive ? "Aktif" : "Non-aktif"}
                  </span>
                </td>

                <td className="p-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setDetailId(p.id)}
                      className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition"
                      title="Detail PIC"
                    >
                      <Eye size={13} />
                    </button>
                    {canPicWrite && (
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition"
                        title="Edit PIC"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => deletePic(p.id, p.name)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-500 transition"
                        title="Hapus PIC"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }
}
