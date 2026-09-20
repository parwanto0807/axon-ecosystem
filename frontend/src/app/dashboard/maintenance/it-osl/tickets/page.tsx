"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, Search, Clock3, AlertTriangle, Wrench, History, X, Loader2, 
  ImagePlus, Trash2, Check, Package, User, MessageSquare, Users, 
  LayoutGrid, LayoutList, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ArrowUpDown, RotateCcw, Copy, Download, MapPin, CheckSquare, Square, Filter, Tag,
  SlidersHorizontal, ChevronDown, Sparkles, Building2
} from "lucide-react"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type CustomerOpt = {
  id: string
  code: string
  name: string
  companyType?: string | null
}

type PicOpt = {
  id: string
  name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  locationId: string | null
  customerId?: string | null
  location?: { name: string } | null
  isActive: boolean
}

type Ticket = {
  id: string
  ticketNumber: string
  summary: string
  severity: string
  status: string
  ticketType: string
  slaStatus: string
  frtMinutes: number | null
  location: { id: string; name: string } | null
  category: { id: string; name: string; groupName: string } | null
  customerId?: string | null
  customer?: { id: string; name: string; code: string } | null
  asset: { id: string; name: string; assetCode: string } | null
  assetId: string | null
  picId: string | null
  pic: { id: string; name: string; position: string | null; department: string | null; phone: string | null; email: string | null } | null
  assignedTo: string | null
  assignedUser: { id: string; name: string | null; email: string | null } | null
  creator: { id: string; name: string | null } | null
  reporterName: string | null
  reportChannel: string | null
  createdAt: string
  updatedAt: string
  acknowledgedAt: string | null
}

type WorkItem = {
  id: string
  phase: string
  title: string | null
  description: string
  status: string
  createdAt: string
  creator?: { name: string | null } | null
  attachments: { id: string; url: string; fileName: string | null }[]
}

type TicketDetail = Ticket & {
  rootCause: string | null
  correctiveAction: string | null
  solutionCategory: string | null
  assetCondition: string | null
  reportedAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  reporterName: string | null
  reportChannel: string | null
  workItems: WorkItem[]
  pendings: { id:string; reason:string; externalParty:string|null; expectedResumeAt:string|null; startedAt:string; endedAt:string|null }[]
  parts: { id:string; partName:string; quantity:number; unit:string }[]
  notes: { id:string; content:string }[]
}

type Location = { id: string; code: string; name: string; customerId?: string | null }
type Category = { id: string; name: string; groupName: string }
type AssetOpt = { id: string; assetCode: string; name: string; customerId?: string | null; location?: { name:string }|null; picUser?: { name:string|null }|null }
type UserOpt = { id: string; name: string | null; email: string | null }

const PHASES = [
  { id:"ANALISA", label:"Analisa", desc:"Diagnosis & cek awal", icon: Search },
  { id:"PENGERJAAN", label:"Pengerjaan", desc:"Eksekusi lapangan", icon: Wrench },
  { id:"HASIL", label:"Hasil", desc:"Verifikasi & serah terima", icon: Check },
] as const

export default function ItOslTicketsPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?:string })?.id || null
  const currentUserName = session?.user?.name || null
  const currentRole = (session?.user as { role?:string })?.role || null
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'

  const getAuthHeaders = (): Record<string, string> => ({
    "x-user-id": currentUserId || "",
    "x-user-role": currentRole || "",
    "x-user-email": session?.user?.email || "",
  })
  
  // Data Sources
  const [allTickets, setAllTickets] = useState<Ticket[]>([])
  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<AssetOpt[]>([])
  const [pics, setPics] = useState<PicOpt[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [q, setQ] = useState("")
  const [filterCustomer, setFilterCustomer] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterSeverity, setFilterSeverity] = useState<string>("")
  const [filterLocation, setFilterLocation] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("")
  const [filterPic, setFilterPic] = useState<string>("")
  const [filterAssignee, setFilterAssignee] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterBreachOnly, setFilterBreachOnly] = useState<boolean>(false)
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false)

  // View & Pagination
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Sorting
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Multi-Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Quick-Log Modal
  const [showQuick, setShowQuick] = useState(false)
  const [quick, setQuick] = useState({ 
    summary: "", locationId: "", categoryId: "", severity: "MEDIUM" as string, 
    ticketType: "INCIDENT" as string, assetId: "", picId: "", assignedTo: "", 
    reporterName: "", reportChannel: "", customerId: ""
  })
  const [saving, setSaving] = useState(false)
  const [assetQuery, setAssetQuery] = useState("")
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  // Detail Drawer & Work-Items
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activePhase, setActivePhase] = useState<"ANALISA"|"PENGERJAAN"|"HASIL">("ANALISA")
  const [newDesc, setNewDesc] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newFiles, setNewFiles] = useState<FileList | null>(null)
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load all initial datasets
  const load = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [tRes, lRes, cRes, aRes, pRes, uRes, custRes] = await Promise.all([
        fetch(`${API}/api/it-osl/tickets?limit=1500`, { headers }),
        fetch(`${API}/api/it-osl/locations`, { headers }),
        fetch(`${API}/api/it-osl/categories`, { headers }),
        fetch(`${API}/api/it-osl/assets`, { headers }),
        fetch(`${API}/api/it-osl/pics`, { headers }),
        fetch(`${API}/api/users`, { headers: { "x-user-role":"SUPER_ADMIN" } }).then(r=> r.ok? r.json().then((j: unknown)=> Array.isArray(j)? j : (j as { users?: UserOpt[] })?.users || []): []).catch(()=>[]),
        fetch(`${API}/api/it-osl/customers`, { headers }),
      ])
      if (tRes.ok) {
        const data = await tRes.json()
        setAllTickets(Array.isArray(data) ? data : [])
      }
      if (lRes.ok) setLocations(await lRes.json())
      if (cRes.ok) setCategories(await cRes.json())
      if (aRes.ok) setAssets(await aRes.json())
      if (pRes.ok) setPics(await pRes.json())
      if (Array.isArray(uRes) && uRes.length) setUsers(uRes as UserOpt[])
      if (custRes.ok) {
        const custList = await custRes.json()
        const cArr = Array.isArray(custList) ? custList : []
        setCustomers(cArr)
        // If non-admin user is only assigned to 1 customer, auto-assign
        if (!isAdmin && cArr.length === 1) {
          setFilterCustomer(cArr[0].id)
          setQuick(q => ({ ...q, customerId: q.customerId || cArr[0].id }))
        }
      }
    } catch (e) {
      console.error("Failed to load tickets data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session !== undefined) {
      load()
    }
  }, [session?.user?.email, currentUserId, currentRole])
  
  // prefill reporter & assignee in Quick-Log from session
  useEffect(()=>{
    if(showQuick && currentUserName && !quick.reporterName) {
      setQuick(q=> ({...q, reporterName: currentUserName || "", assignedTo: currentUserId || q.assignedTo }))
    }
  },[showQuick, currentUserName, currentUserId])

  const loadDetail = async (id:string) => {
    setLoadingDetail(true)
    try{
      const res = await fetch(`${API}/api/it-osl/tickets/${id}`, { headers: getAuthHeaders() })
      if(res.ok) setDetail(await res.json())
    }catch{}
    setLoadingDetail(false)
  }
  useEffect(()=>{ if(detailId) loadDetail(detailId) },[detailId])

  const catsGrouped = useMemo(() => {
    const m = new Map<string, Category[]>()
    categories.forEach((c) => {
      if (!m.has(c.groupName)) m.set(c.groupName, [])
      m.get(c.groupName)!.push(c)
    })
    return Array.from(m.entries())
  }, [categories])

  const filteredAssets = useMemo(()=>{
    let list = assets
    if (quick.customerId) {
      list = list.filter(a => !a.customerId || a.customerId === quick.customerId)
    }
    const q = assetQuery.trim().toLowerCase()
    if(!q) return list.slice(0,20)
    return list.filter(a=> `${a.assetCode} ${a.name} ${a.location?.name||""}`.toLowerCase().includes(q)).slice(0,20)
  },[assets, assetQuery, quick.customerId])

  const quickAsset = useMemo(()=> assets.find(a=> a.id===quick.assetId) || null,[assets, quick.assetId])

  const quickLocations = useMemo(() => {
    if (!quick.customerId) return locations
    return locations.filter(l => !l.customerId || l.customerId === quick.customerId)
  }, [locations, quick.customerId])

  const quickPics = useMemo(() => {
    if (!quick.customerId) return pics
    return pics.filter(p => !p.customerId || p.customerId === quick.customerId)
  }, [pics, quick.customerId])

  // --- Filtering & Sorting on large dataset ---
  const filteredTickets = useMemo(() => {
    let result = [...allTickets]

    // Customer filter
    if (filterCustomer) {
      result = result.filter(t => t.customerId === filterCustomer)
    }

    // Search query across fields
    if (q.trim()) {
      const term = q.trim().toLowerCase()
      result = result.filter(t => 
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(term)) ||
        (t.summary && t.summary.toLowerCase().includes(term)) ||
        (t.reporterName && t.reporterName.toLowerCase().includes(term)) ||
        (t.location?.name && t.location.name.toLowerCase().includes(term)) ||
        (t.category?.name && t.category.name.toLowerCase().includes(term)) ||
        (t.category?.groupName && t.category.groupName.toLowerCase().includes(term)) ||
        (t.asset?.name && t.asset.name.toLowerCase().includes(term)) ||
        (t.asset?.assetCode && t.asset.assetCode.toLowerCase().includes(term)) ||
        (t.pic?.name && t.pic.name.toLowerCase().includes(term)) ||
        (t.assignedUser?.name && t.assignedUser.name.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (filterStatus) {
      if (filterStatus === "RESOLVED_ALL") {
        result = result.filter(t => t.status === "RESOLVED" || t.status === "CLOSED")
      } else {
        result = result.filter(t => t.status === filterStatus)
      }
    }

    // Severity filter
    if (filterSeverity) {
      result = result.filter(t => t.severity === filterSeverity)
    }

    // Location filter
    if (filterLocation) {
      result = result.filter(t => t.location?.id === filterLocation)
    }

    // Category filter
    if (filterCategory) {
      result = result.filter(t => t.category?.id === filterCategory || t.category?.groupName === filterCategory)
    }

    // PIC Unit filter
    if (filterPic) {
      result = result.filter(t => t.picId === filterPic)
    }

    // Assignee filter
    if (filterAssignee) {
      result = result.filter(t => t.assignedTo === filterAssignee)
    }

    // Type filter
    if (filterType) {
      result = result.filter(t => t.ticketType === filterType)
    }

    // Breach only filter
    if (filterBreachOnly) {
      result = result.filter(t => t.slaStatus === "BREACH")
    }

    // Sorting
    result.sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime()
        valB = new Date(b.createdAt).getTime()
      } else if (sortBy === "ticketNumber") {
        valA = a.ticketNumber || ""
        valB = b.ticketNumber || ""
      } else if (sortBy === "severity") {
        const order: Record<string, number> = { CRITICAL: 3, MEDIUM: 2, LOW: 1 }
        valA = order[a.severity] || 0
        valB = order[b.severity] || 0
      } else if (sortBy === "status") {
        valA = a.status || ""
        valB = b.status || ""
      } else if (sortBy === "location") {
        valA = a.location?.name || ""
        valB = b.location?.name || ""
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1
      if (valA > valB) return sortDir === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [allTickets, q, filterStatus, filterSeverity, filterLocation, filterCategory, filterPic, filterAssignee, filterType, filterBreachOnly, sortBy, sortDir])

  // KPI Metrics calculation
  const metrics = useMemo(() => {
    const total = allTickets.length
    const countNew = allTickets.filter(t => t.status === "NEW").length
    const countProgress = allTickets.filter(t => t.status === "IN_PROGRESS").length
    const countPending = allTickets.filter(t => t.status === "PENDING").length
    const countResolved = allTickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length
    const countBreach = allTickets.filter(t => t.slaStatus === "BREACH").length
    return { total, countNew, countProgress, countPending, countResolved, countBreach }
  }, [allTickets])

  // Pagination calculation
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [q, filterStatus, filterSeverity, filterLocation, filterCategory, filterPic, filterAssignee, filterType, filterBreachOnly, pageSize])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDir("desc")
    }
  }

  // Multi-selection handlers
  const handleSelectAllOnPage = () => {
    const allOnPageIds = paginatedTickets.map(t => t.id)
    const isAllSelected = allOnPageIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (isAllSelected) {
      allOnPageIds.forEach(id => next.delete(id))
    } else {
      allOnPageIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(null), 1800)
  }

  // Export CSV of filtered tickets
  const handleExportCSV = (dataToExport: Ticket[] = filteredTickets) => {
    if (dataToExport.length === 0) return alert("Tidak ada data tiket untuk diunduh.")
    
    const headers = [
      "Nomor Tiket", "Uraian Masalah", "Tipe Tiket", "Tingkat Severity", 
      "Status", "SLA Status", "FRT (Menit)", "Unit Lokasi", "Kategori Masalah", 
      "Grup Kategori", "Kode Aset", "Nama Aset", "PIC Unit", "Telepon PIC", 
      "Pelapor", "Teknisi IT", "Waktu Dibuat", "Waktu Direspon"
    ]

    const rows = dataToExport.map(t => [
      `"${t.ticketNumber || ""}"`,
      `"${(t.summary || "").replace(/"/g, '""')}"`,
      `"${t.ticketType || ""}"`,
      `"${t.severity || ""}"`,
      `"${t.status || ""}"`,
      `"${t.slaStatus || ""}"`,
      `"${t.frtMinutes != null ? t.frtMinutes : ""}"`,
      `"${t.location?.name || ""}"`,
      `"${t.category?.name || ""}"`,
      `"${t.category?.groupName || ""}"`,
      `"${t.asset?.assetCode || ""}"`,
      `"${(t.asset?.name || "").replace(/"/g, '""')}"`,
      `"${t.pic?.name || ""}"`,
      `"${t.pic?.phone || ""}"`,
      `"${t.reporterName || ""}"`,
      `"${t.assignedUser?.name || t.assignedUser?.email || ""}"`,
      `"${t.createdAt ? new Date(t.createdAt).toLocaleString('id-ID') : ""}"`,
      `"${t.acknowledgedAt ? new Date(t.acknowledgedAt).toLocaleString('id-ID') : ""}"`,
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Data_Tiket_IT_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Batch Status Transition
  const handleBatchStatus = async (toStatus: string) => {
    if (selectedIds.size === 0) return
    if (!confirm(`Ubah ${selectedIds.size} tiket terpilih menjadi status ${toStatus}?`)) return
    
    setLoading(true)
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(`${API}/api/it-osl/tickets/${id}/status`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            ...getAuthHeaders()
          },
          body: JSON.stringify({ to: toStatus, actorUserId: currentUserId || "system" })
        })
      }
      setSelectedIds(new Set())
      await load()
    } catch (e) {
      alert("Sebagian status gagal diperbarui.")
    } finally {
      setLoading(false)
    }
  }

  // Single Ticket Actions
  const changeStatus = async (id: string, to: string) => {
    const body: Record<string, unknown> = { to, actorUserId: currentUserId || "system" }
    if (to === "PENDING") {
      const reason = prompt("Alasan Tertahan: Menunggu sparepart / approval / vendor / jendela maintenance / konfirmasi user / Lainnya")
      if (!reason) return
      const exp = prompt("Estimasi tindak lanjut (YYYY-MM-DD HH:mm) — harus > sekarang, contoh 2026-09-20 09:00")
      if (!exp) return
      body.reason = reason
      body.expectedResumeAt = exp.replace(" ", "T")
    }
    if (to === "RESOLVED") {
      const rc = prompt("Akar Masalah (min 15 karakter)")
      const ca = prompt("Tindakan Perbaikan (min 15 karakter)")
      if (!rc || !ca) return
      body.rootCause = rc
      body.correctiveAction = ca
      body.solutionCategory = "Perbaikan"
      body.assetCondition = "NORMAL"
    }
    const res = await fetch(`${API}/api/it-osl/tickets/${id}/status`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json", ...getAuthHeaders() }, 
      body: JSON.stringify(body) 
    })
    const d = await res.json()
    if (!res.ok) alert(d.message)
    else { load(); if(detailId===id) loadDetail(id) }
  }

  const connectAsset = async (ticketId:string, assetId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}`, { 
      method:"PUT", 
      headers:{ "Content-Type":"application/json", ...getAuthHeaders() }, 
      body: JSON.stringify({ assetId: assetId || null, actorUserId: currentUserId }) 
    })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }

  const reassign = async (ticketId:string, userId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}/reassign`, { 
      method:"POST", 
      headers:{ "Content-Type":"application/json", ...getAuthHeaders() }, 
      body: JSON.stringify({ toUserId: userId || null, actorUserId: currentUserId }) 
    })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }

  const connectPic = async (ticketId:string, picId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}`, { 
      method:"PUT", 
      headers:{ "Content-Type":"application/json", ...getAuthHeaders() }, 
      body: JSON.stringify({ picId: picId || null, actorUserId: currentUserId }) 
    })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }

  const submitQuick = async () => {
    if (quick.summary.trim().length < 5) return alert("Uraian minimal 5 karakter")
    if (!quick.locationId) return alert("Lokasi wajib")
    if (!quick.categoryId) return alert("Kategori wajib")
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        summary: quick.summary.trim(),
        locationId: quick.locationId,
        categoryId: quick.categoryId,
        customerId: quick.customerId || undefined,
        severity: quick.severity,
        ticketType: quick.ticketType,
        assetId: quick.assetId || undefined,
        picId: quick.picId || undefined,
        reporterName: quick.reporterName || undefined,
        reportChannel: quick.reportChannel || "Sistem IT",
        assignedTo: quick.assignedTo || undefined,
        createdBy: currentUserId || undefined,
      }
      const res = await fetch(`${API}/api/it-osl/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Gagal")
      if (data.duplicateHint) alert(`Duplikat terdeteksi: ${data.duplicateHint.ticketNumber} (lokasi+kategori sama 2 jam terakhir)`)
      setShowQuick(false)
      setQuick({ summary: "", locationId: "", categoryId: "", severity: "MEDIUM", ticketType: "INCIDENT", assetId:"", picId:"", assignedTo:"", reporterName:"", reportChannel:"", customerId: (!isAdmin && customers.length === 1 ? customers[0].id : "") })
      setAssetQuery("")
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal"
      alert(msg)
    } finally { setSaving(false) }
  }

  // Work items functions
  const addWorkItem = async () => {
    if(!detailId) return
    if(!newDesc.trim() || newDesc.trim().length<5) return alert("Uraian item minimal 5 karakter — jelaskan pekerjaan yang dilakukan")
    setAdding(true)
    try{
      const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items`, {
        method:"POST", headers:{ "Content-Type":"application/json", ...getAuthHeaders() },
        body: JSON.stringify({ phase: activePhase, title: newTitle || null, description: newDesc, createdBy: currentUserId || undefined })
      })
      const item = await res.json()
      if(!res.ok) throw new Error(item.message)
      if(newFiles && newFiles.length>0){
        const fd = new FormData()
        Array.from(newFiles).forEach(f=> fd.append("photos", f))
        const up = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${item.id}/photos`, { method:"POST", headers: { "x-user-id": currentUserId || "", "x-user-role": currentRole || "" }, body: fd })
        const upData = await up.json()
        if(!up.ok) alert("Item tersimpan, tapi foto gagal: "+(upData.message||""))
      }
      setNewDesc(""); setNewTitle(""); setNewFiles(null); if(fileRef.current) fileRef.current.value=""
      loadDetail(detailId); load()
    }catch(e:unknown){ alert(e instanceof Error? e.message:"Gagal") }
    finally{ setAdding(false)}
  }

  const delWorkItem = async (wid:string) => {
    if(!isAdmin) return alert("Hanya Admin/SuperAdmin boleh hapus")
    if(!detailId || !confirm("Hapus item pekerjaan ini? Foto ikut terhapus")) return
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}`, { method:"DELETE", headers: getAuthHeaders() })
    const d = await res.json()
    if(!res.ok) return alert(d.message || "Gagal hapus — hanya Admin")
    if(detailId) loadDetail(detailId)
  }

  const delAttachment = async (wid:string, aid:string)=>{
    if(!isAdmin) return alert("Hanya Admin/SuperAdmin boleh hapus foto")
    if(!detailId || !confirm("Hapus foto ini?")) return
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}/attachments/${aid}`, { method:"DELETE", headers: getAuthHeaders() })
    const d = await res.json()
    if(!res.ok) return alert(d.message || "Gagal hapus — hanya Admin")
    if(detailId) loadDetail(detailId)
  }

  const attachMore = async (wid:string, files: FileList | null)=>{
    if(!files || files.length===0 || !detailId) return
    const fd = new FormData()
    Array.from(files).forEach(f=> fd.append("photos", f))
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}/photos`, { method:"POST", headers: { "x-user-id": currentUserId || "", "x-user-role": currentRole || "" }, body: fd })
    if(!res.ok){ const d=await res.json(); alert(d.message) } else loadDetail(detailId)
  }

  const phaseCounts = useMemo(()=>{
    if(!detail) return { ANALISA:0, PENGERJAAN:0, HASIL:0 }
    const c = { ANALISA:0, PENGERJAAN:0, HASIL:0 } as Record<string,number>
    detail.workItems?.forEach(w=>{ if(c[w.phase]!==undefined) c[w.phase]++ })
    return c
  },[detail])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let cnt = 0
    if (q) cnt++
    if (filterStatus) cnt++
    if (filterSeverity) cnt++
    if (filterLocation) cnt++
    if (filterCategory) cnt++
    if (filterPic) cnt++
    if (filterAssignee) cnt++
    if (filterType) cnt++
    if (filterBreachOnly) cnt++
    return cnt
  }, [q, filterStatus, filterSeverity, filterLocation, filterCategory, filterPic, filterAssignee, filterType, filterBreachOnly])

  const resetFilters = () => {
    setQ("")
    setFilterStatus("")
    setFilterSeverity("")
    setFilterLocation("")
    setFilterCategory("")
    setFilterPic("")
    setFilterAssignee("")
    setFilterType("")
    setFilterBreachOnly(false)
  }

  return (
    <div className="w-full max-w-full px-2.5 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 space-y-3 sm:space-y-4 pb-28 md:pb-8 overflow-x-hidden">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 text-white">
            <Wrench size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight truncate">Tiket & Quick-Log</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-mono font-black shrink-0">
                {filteredTickets.length} Tiket
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">SLA response time & logging terstruktur</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => handleExportCSV()}
            title="Download CSV"
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 bg-white shadow-sm"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={load}
            title="Muat Ulang"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition active:scale-95 bg-white shadow-sm"
          >
            <History size={15} />
          </button>

          <button 
            onClick={() => setShowQuick(true)} 
            className="flex-1 sm:flex-none px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
          >
            <Plus size={16} strokeWidth={2.5} /> 
            <span>Quick-Log</span>
          </button>
        </div>
      </header>

      {/* ── KPI METRIC CARDS (INTERACTIVE 1-CLICK FILTERS) ────────────────── */}
      {/* Scrollable on mobile with snap, grid on desktop */}
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 w-full overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 snap-x">
        {/* Total */}
        <button
          onClick={() => { setFilterStatus(""); setFilterBreachOnly(false); }}
          className={`min-w-[105px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between shrink-0 snap-start ${
            !filterStatus && !filterBreachOnly 
              ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20" 
              : "bg-white border-slate-100 hover:border-slate-200 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold opacity-70">Total</span>
            <Tag size={12} className="opacity-50" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 tracking-tight">{metrics.total}</p>
        </button>

        {/* NEW */}
        <button
          onClick={() => { setFilterStatus("NEW"); setFilterBreachOnly(false); }}
          className={`min-w-[105px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between shrink-0 snap-start ${
            filterStatus === "NEW" 
              ? "bg-slate-800 border-slate-800 text-white shadow-md" 
              : "bg-white border-slate-100 hover:border-slate-200 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Baru</span>
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400"></span>
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 text-slate-900 tracking-tight">{metrics.countNew}</p>
        </button>

        {/* IN_PROGRESS */}
        <button
          onClick={() => { setFilterStatus("IN_PROGRESS"); setFilterBreachOnly(false); }}
          className={`min-w-[115px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between shrink-0 snap-start ${
            filterStatus === "IN_PROGRESS" 
              ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/20" 
              : "bg-white border-slate-100 hover:border-sky-200 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-sky-600">Dikerjakan</span>
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 animate-pulse"></span>
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 text-sky-700 tracking-tight">{metrics.countProgress}</p>
        </button>

        {/* PENDING */}
        <button
          onClick={() => { setFilterStatus("PENDING"); setFilterBreachOnly(false); }}
          className={`min-w-[105px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between shrink-0 snap-start ${
            filterStatus === "PENDING" 
              ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20" 
              : "bg-white border-slate-100 hover:border-amber-200 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Tertahan</span>
            <Clock3 size={12} className="text-amber-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 text-amber-700 tracking-tight">{metrics.countPending}</p>
        </button>

        {/* RESOLVED / CLOSED */}
        <button
          onClick={() => { setFilterStatus("RESOLVED_ALL"); setFilterBreachOnly(false); }}
          className={`min-w-[105px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between shrink-0 snap-start ${
            filterStatus === "RESOLVED_ALL" 
              ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" 
              : "bg-white border-slate-100 hover:border-emerald-200 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-emerald-600">Selesai</span>
            <Check size={12} className="text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 text-emerald-700 tracking-tight">{metrics.countResolved}</p>
        </button>

        {/* SLA BREACH ALERT */}
        <button
          onClick={() => { setFilterBreachOnly(prev => !prev); setFilterStatus(""); }}
          className={`min-w-[115px] sm:min-w-0 p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between shrink-0 snap-start ${
            filterBreachOnly 
              ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/30" 
              : metrics.countBreach > 0 
                ? "bg-rose-50/60 border-rose-200 text-rose-800 hover:bg-rose-50 shadow-sm" 
                : "bg-white border-slate-100 text-slate-800 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold text-rose-600">SLA Breach</span>
            <AlertTriangle size={12} className="text-rose-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black mt-1.5 sm:mt-2 text-rose-600 tracking-tight">{metrics.countBreach}</p>
        </button>
      </div>

      {/* ── ADVANCED SEARCH & FILTER CONTROLS ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm space-y-2.5">
        {/* Search Bar + Mobile Filter Toggle + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor tiket, uraian, pelapor, lokasi, PIC..."
              className="w-full pl-10 pr-9 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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

          {/* Controls Group */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setShowMobileFilters(prev => !prev)}
              className={`sm:hidden px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                showMobileFilters || activeFilterCount > 0
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              {/* Page Size */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span className="hidden sm:inline">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* View Switcher (Desktop only) */}
              <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Tabel"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Kartu"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns Grid: Hidden on mobile unless toggled, always visible on sm+ */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 ${
          showMobileFilters ? "block" : "hidden sm:grid"
        }`}>
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="NEW">Baru (NEW)</option>
            <option value="IN_PROGRESS">Sedang Dikerjakan</option>
            <option value="PENDING">Tertahan (PENDING)</option>
            <option value="RESOLVED">Selesai (RESOLVED)</option>
            <option value="CLOSED">Ditutup (CLOSED)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Location Filter */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Lokasi</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Kategori</option>
            {catsGrouped.map(([g, items]) => (
              <optgroup key={g} label={g}>
                {items.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* PIC Unit Filter */}
          <select
            value={filterPic}
            onChange={(e) => setFilterPic(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua PIC Unit</option>
            {pics.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.department ? `(${p.department})` : ''}</option>
            ))}
          </select>

          {/* Technician Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Teknisi</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
              <Filter size={12} /> Filter Aktif:
            </span>

            {q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium text-[11px]">
                Cari: &ldquo;{q}&rdquo;
                <button onClick={() => setQ("")} className="hover:text-indigo-900"><X size={12} /></button>
              </span>
            )}

            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px]">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus("")} className="hover:text-slate-900"><X size={12} /></button>
              </span>
            )}

            {filterSeverity && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]">
                Severity: {filterSeverity}
                <button onClick={() => setFilterSeverity("")} className="hover:text-amber-900"><X size={12} /></button>
              </span>
            )}

            {filterLocation && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px]">
                Lokasi: {locations.find(l => l.id === filterLocation)?.name}
                <button onClick={() => setFilterLocation("")} className="hover:text-slate-900"><X size={12} /></button>
              </span>
            )}

            {filterPic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-[11px]">
                PIC: {pics.find(p => p.id === filterPic)?.name}
                <button onClick={() => setFilterPic("")} className="hover:text-indigo-900"><X size={12} /></button>
              </span>
            )}

            {filterBreachOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                Hanya SLA Breach
                <button onClick={() => setFilterBreachOnly(false)} className="hover:text-rose-900"><X size={12} /></button>
              </span>
            )}

            <button
              onClick={resetFilters}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold ml-1 flex items-center gap-0.5 underline underline-offset-2"
            >
              <RotateCcw size={11} /> Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* ── FLOATING BATCH ACTION BAR ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs w-[92%] sm:w-auto max-w-xl justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="font-bold text-slate-200 hidden sm:inline">tiket dipilih</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBatchStatus("IN_PROGRESS")}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-white transition active:scale-95 text-[11px]"
              >
                Kerjakan
              </button>

              <button
                onClick={() => {
                  const sel = allTickets.filter(t => selectedIds.has(t.id))
                  handleExportCSV(sel)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 transition active:scale-95 text-[11px] flex items-center gap-1"
              >
                <Download size={12} /> CSV
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Batal Pilih"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTENT (RESPONSIVE HYBRID: MOBILE CARD LIST & DESKTOP TABLE/GRID) ── */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm flex flex-col items-center justify-center gap-2.5 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="animate-spin text-indigo-600" size={28}/> 
          <span className="font-bold text-slate-700">Memuat basis data tiket…</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Search size={22} />
          </div>
          <h3 className="font-black text-slate-800 text-sm sm:text-base">Tidak ada tiket yang cocok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Silakan periksa kata kunci pencarian atau ubah kombinasi filter status dan lokasi.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100 transition"
          >
            Reset Filter Pencarian
          </button>
        </div>
      ) : (
        <>
          {/* 📱 1. NATIVE MOBILE CARDS (Visible on mobile screens < md) */}
          <div className="md:hidden space-y-3 w-full">
            {paginatedTickets.map((t) => {
              const isSelected = selectedIds.has(t.id)
              const isBreached = t.slaStatus === "BREACH"
              return (
                <div 
                  key={t.id}
                  onClick={() => { setDetail(null); setDetailId(t.id); }}
                  className={`bg-white rounded-2xl border p-3.5 shadow-sm transition-all active:scale-[0.99] space-y-2.5 ${
                    isSelected ? "border-indigo-400 bg-indigo-50/30" : "border-slate-100"
                  }`}
                >
                  {/* Top Bar: Number + Copy + Severity + Status */}
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md shrink-0">
                        {t.ticketNumber}
                      </span>
                      {isBreached && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white shrink-0">
                          BREACH
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        t.severity === "CRITICAL" ? "bg-rose-100 text-rose-700 font-extrabold" : 
                        t.severity === "LOW" ? "bg-emerald-100 text-emerald-700" : 
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {t.severity}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider ${
                        t.status === "NEW" ? "bg-slate-100 text-slate-700" : 
                        t.status === "IN_PROGRESS" ? "bg-sky-100 text-sky-700 font-black" : 
                        t.status === "PENDING" ? "bg-amber-100 text-amber-700 font-black" : 
                        t.status === "RESOLVED" ? "bg-indigo-100 text-indigo-700 font-black" : 
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h2 className="font-black text-slate-900 text-sm leading-snug break-words">{t.summary}</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {t.category?.groupName ? `${t.category.groupName} › ` : ""}{t.category?.name || "Umum"} • {t.ticketType}
                    </p>
                  </div>

                  {/* Badges Row: Location, Asset, PIC, Assignee */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-700 font-medium">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{t.location?.name || "-"}</span>
                    </span>

                    {t.asset && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-indigo-700 font-mono font-bold">
                        <Package size={10} className="text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[100px]">{t.asset.assetCode}</span>
                      </span>
                    )}

                    {t.pic ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg text-indigo-900 font-semibold">
                        <User size={10} className="text-indigo-600 shrink-0" />
                        <span className="truncate max-w-[110px]">{t.pic.name}</span>
                        {t.pic.phone && (
                          <a 
                            href={`https://wa.me/${t.pic.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e)=>e.stopPropagation()} 
                            className="text-emerald-600 hover:text-emerald-700 ml-0.5"
                          >
                            <MessageSquare size={10} />
                          </a>
                        )}
                      </span>
                    ) : t.reporterName ? (
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-600 truncate max-w-[110px]">
                        <User size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">{t.reporterName}</span>
                      </span>
                    ) : null}

                    {t.assignedUser && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-700">
                        <Wrench size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[100px]">{t.assignedUser.name || t.assignedUser.email}</span>
                      </span>
                    )}
                  </div>

                  {/* Footer Timing & Quick Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]" onClick={(e)=>e.stopPropagation()}>
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Clock3 size={11} className="text-slate-400"/>
                      {t.frtMinutes!=null ? `${t.frtMinutes}m FRT` : `${Math.round((Date.now()-new Date(t.createdAt).getTime())/60000)}m lalu`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {t.status==="NEW" && (
                        <button
                          onClick={()=>changeStatus(t.id,"IN_PROGRESS")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] active:scale-95 transition"
                        >
                          Kerjakan
                        </button>
                      )}
                      {t.status==="IN_PROGRESS" && (
                        <button
                          onClick={()=>changeStatus(t.id,"RESOLVED")}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] active:scale-95 transition"
                        >
                          Selesai
                        </button>
                      )}
                      {t.status==="PENDING" && (
                        <button
                          onClick={()=>changeStatus(t.id,"IN_PROGRESS")}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[10px] active:scale-95 transition"
                        >
                          Lanjut
                        </button>
                      )}
                      <button
                        onClick={()=> { setDetail(null); setDetailId(t.id); }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold text-[10px] active:scale-95 transition"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 💻 2. DESKTOP VIEW (Visible on md+ screens) */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              /* DENSE ENTERPRISE DATA TABLE */
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 w-10 text-center">
                          <button onClick={handleSelectAllOnPage} className="text-slate-400 hover:text-slate-700">
                            {paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.has(t.id)) ? (
                              <CheckSquare size={16} className="text-indigo-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-2 cursor-pointer select-none" onClick={() => handleSort("ticketNumber")}>
                          <div className="flex items-center gap-1">
                            <span>No. Tiket</span>
                            <ArrowUpDown size={11} className={sortBy === "ticketNumber" ? "text-indigo-600" : "text-slate-300"} />
                          </div>
                        </th>
                        <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                          <div className="flex items-center gap-1">
                            <span>Waktu & FRT</span>
                            <ArrowUpDown size={11} className={sortBy === "createdAt" ? "text-indigo-600" : "text-slate-300"} />
                          </div>
                        </th>
                        <th className="py-3 px-3">Uraian Masalah & Kategori</th>
                        <th className="py-3 px-2.5">Lokasi & Aset</th>
                        <th className="py-3 px-2.5">PIC / Pelapor</th>
                        <th className="py-3 px-2.5">Teknisi IT</th>
                        <th className="py-3 px-2 cursor-pointer select-none" onClick={() => handleSort("severity")}>
                          <div className="flex items-center gap-1">
                            <span>Severity</span>
                            <ArrowUpDown size={11} className={sortBy === "severity" ? "text-indigo-600" : "text-slate-300"} />
                          </div>
                        </th>
                        <th className="py-3 px-2 cursor-pointer select-none" onClick={() => handleSort("status")}>
                          <div className="flex items-center gap-1">
                            <span>Status</span>
                            <ArrowUpDown size={11} className={sortBy === "status" ? "text-indigo-600" : "text-slate-300"} />
                          </div>
                        </th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTickets.map((t) => {
                        const isSelected = selectedIds.has(t.id)
                        const isBreached = t.slaStatus === "BREACH"
                        return (
                          <tr 
                            key={t.id}
                            onClick={() => { setDetail(null); setDetailId(t.id); }}
                            className={`hover:bg-indigo-50/40 transition-colors cursor-pointer group ${
                              isSelected ? "bg-indigo-50/60" : ""
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => { e.stopPropagation(); toggleSelect(t.id); }}>
                              <button className="text-slate-400 hover:text-slate-700">
                                {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                              </button>
                            </td>

                            <td className="py-3 px-2 font-mono">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-white border border-slate-200/60">
                                  {t.ticketNumber}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(t.ticketNumber); }}
                                  className="text-slate-300 hover:text-indigo-600 p-0.5 rounded"
                                  title="Salin nomor tiket"
                                >
                                  {copiedCode === t.ticketNumber ? <Check size={12} className="text-emerald-600"/> : <Copy size={12}/>}
                                </button>
                              </div>
                              {isBreached && (
                                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500 text-white">
                                  SLA BREACH
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              <p className="font-bold text-slate-800 text-[11px]">
                                {new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock3 size={10} />
                                {t.frtMinutes != null ? `${t.frtMinutes}m FRT` : `${Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000)}m lalu`}
                              </p>
                            </td>

                            <td className="py-3 px-3 max-w-[280px]">
                              <p className="font-extrabold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {t.summary}
                              </p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[150px]">
                                  {t.category?.groupName ? `${t.category.groupName} › ` : ""}{t.category?.name || "Umum"}
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                  {t.ticketType}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-2.5">
                              <p className="font-bold text-slate-800 flex items-center gap-1 truncate max-w-[160px]">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate">{t.location?.name || "-"}</span>
                              </p>
                              {t.asset ? (
                                <p className="text-[10px] text-indigo-700 font-mono font-bold flex items-center gap-1 mt-0.5 truncate max-w-[160px]">
                                  <Package size={10} className="text-indigo-500 shrink-0" />
                                  <span className="truncate">{t.asset.assetCode}</span>
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-normal">Tanpa aset</p>
                              )}
                            </td>

                            <td className="py-3 px-2.5">
                              {t.pic ? (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-900 truncate max-w-[130px]">{t.pic.name}</span>
                                    {t.pic.phone && (
                                      <a
                                        href={`https://wa.me/${t.pic.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                                        title={`WhatsApp ${t.pic.name}`}
                                      >
                                        <MessageSquare size={12} />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{t.pic.department || "Unit Klien"}</p>
                                </div>
                              ) : t.reporterName ? (
                                <div>
                                  <p className="font-bold text-slate-800 truncate max-w-[130px]">{t.reporterName}</p>
                                  <p className="text-[10px] text-slate-400">Pelapor</p>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            <td className="py-3 px-2.5">
                              {t.assignedUser ? (
                                <div className="flex items-center gap-1">
                                  <Wrench size={11} className="text-slate-400 shrink-0" />
                                  <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                                    {t.assignedUser.name || t.assignedUser.email}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-normal text-[10px]">Belum ditugaskan</span>
                              )}
                            </td>

                            <td className="py-3 px-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                t.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                                t.severity === "LOW" ? "bg-emerald-100 text-emerald-700" :
                                "bg-amber-100 text-amber-700"
                              }`}>
                                {t.severity}
                              </span>
                            </td>

                            <td className="py-3 px-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 ${
                                t.status === "NEW" ? "bg-slate-100 text-slate-700" :
                                t.status === "IN_PROGRESS" ? "bg-sky-100 text-sky-700 font-black" :
                                t.status === "PENDING" ? "bg-amber-100 text-amber-700 font-black" :
                                t.status === "RESOLVED" ? "bg-indigo-100 text-indigo-700 font-black" :
                                "bg-emerald-100 text-emerald-700"
                              }`}>
                                {t.status === "IN_PROGRESS" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />}
                                {t.status}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {t.status === "NEW" && (
                                  <button
                                    onClick={() => changeStatus(t.id, "IN_PROGRESS")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm active:scale-95 transition"
                                  >
                                    Kerjakan
                                  </button>
                                )}
                                {t.status === "IN_PROGRESS" && (
                                  <button
                                    onClick={() => changeStatus(t.id, "RESOLVED")}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-sm active:scale-95 transition"
                                  >
                                    Selesai
                                  </button>
                                )}
                                {t.status === "PENDING" && (
                                  <button
                                    onClick={() => changeStatus(t.id, "IN_PROGRESS")}
                                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] shadow-sm active:scale-95 transition"
                                  >
                                    Lanjut
                                  </button>
                                )}

                                <button
                                  onClick={() => { setDetail(null); setDetailId(t.id); }}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] shadow-sm active:scale-95 transition"
                                >
                                  Detail
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
              /* GRID VIEW */
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
                {paginatedTickets.map((t) => (
                  <motion.div 
                    key={t.id} 
                    initial={{opacity:0, y:6}} 
                    animate={{opacity:1, y:0}} 
                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between w-full"
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wider shrink-0">
                          {t.ticketNumber}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          t.severity==="CRITICAL" ? "bg-rose-100 text-rose-700 font-extrabold" : 
                          t.severity==="LOW" ? "bg-emerald-100 text-emerald-700" : 
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {t.severity}
                        </span>
                      </div>

                      <h2 className="font-black text-slate-900 text-base mt-2 line-clamp-2 leading-snug break-words">{t.summary}</h2>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {t.location?.name || "-"} • {t.category?.groupName} › {t.category?.name} • {t.ticketType}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                        {t.pic ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg text-indigo-900 font-semibold">
                            <User size={11} className="text-indigo-600 shrink-0"/>
                            <span className="truncate max-w-[130px]">{t.pic.name} {t.pic.department ? `(${t.pic.department})` : ''}</span>
                            {t.pic.phone && (
                              <a 
                                href={`https://wa.me/${t.pic.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e)=>e.stopPropagation()} 
                                className="text-emerald-600 hover:text-emerald-700 ml-0.5 inline-flex items-center" 
                              >
                                <MessageSquare size={11} className="shrink-0" />
                              </a>
                            )}
                          </span>
                        ) : t.reporterName ? (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-600 truncate max-w-[120px]">
                            <User size={11} className="text-slate-400 shrink-0"/>
                            <span className="truncate">{t.reporterName}</span>
                          </span>
                        ) : null}

                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-700 font-mono text-[10px]">
                          <Package size={11} className="text-slate-400 shrink-0"/>
                          <span className="truncate max-w-[110px] font-bold">{t.asset ? t.asset.assetCode : <span className="text-slate-400 font-sans font-normal">Tanpa aset</span>}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          t.status==="NEW" ? "bg-slate-100 text-slate-700" : 
                          t.status==="IN_PROGRESS" ? "bg-sky-100 text-sky-700 font-black" : 
                          t.status==="PENDING" ? "bg-amber-100 text-amber-700 font-black" : 
                          t.status==="RESOLVED" ? "bg-indigo-100 text-indigo-700 font-black" : 
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 font-medium text-[10px]">
                          <Clock3 size={11} className="text-slate-400"/>
                          {t.frtMinutes!=null ? `${t.frtMinutes}m FRT` : `${Math.round((Date.now()-new Date(t.createdAt).getTime())/60000)}m`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 w-full flex items-center gap-2">
                      <button 
                        onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                        className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                      >
                        Detail Tiket
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── PAGINATION BAR (COMPACT & 100% RESPONSIVE) ────────────────── */}
          <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
            <div className="font-medium text-center sm:text-left text-[11px] sm:text-xs">
              Menampilkan <b className="text-slate-800">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredTickets.length)}</b> dari <b className="text-slate-800">{filteredTickets.length}</b> tiket
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={13} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Sebelumnya"
              >
                <ChevronLeft size={13} />
              </button>

              <span className="px-2.5 py-1 font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Berikutnya"
              >
                <ChevronRight size={13} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── QUICK-LOG MODAL (≤20 DETIK) ──────────────────────────────────── */}
      <AnimatePresence>
        {showQuick && (
          <motion.div 
            initial={{opacity:0}} 
            animate={{opacity:1}} 
            exit={{opacity:0}} 
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" 
            onClick={()=>setShowQuick(false)}
          >
            <motion.div 
              initial={{y:40, opacity:0}} 
              animate={{y:0, opacity:1}} 
              exit={{y:40, opacity:0}} 
              onClick={(e)=>e.stopPropagation()} 
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto shadow-2xl pb-safe"
            >
              {/* Mobile handle indicator */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">Quick-Log — ≤20 detik</h3>
                  <p className="text-[11px] text-slate-400">Pencatatan insiden/permintaan cepat</p>
                </div>
                <button onClick={()=>setShowQuick(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <X size={18}/>
                </button>
              </div>

              <div className="space-y-3">
                {/* Customer Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1"><Building2 size={12} className="text-indigo-600" /> Customer / Klien</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                  </label>
                  <select
                    value={quick.customerId}
                    onChange={(e)=> setQuick({...quick, customerId: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">— Pilih Customer / Klien (Opsional) —</option>
                    {customers.map(c=> (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Uraian Masalah *</label>
                  <input 
                    autoFocus 
                    value={quick.summary} 
                    onChange={(e)=>setQuick({...quick, summary:e.target.value})} 
                    placeholder="Contoh: PC Kasir 2 blue screen saat restart" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                    maxLength={150} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Lokasi *</label>
                    <select 
                      value={quick.locationId} 
                      onChange={(e)=>setQuick({...quick, locationId:e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">— Pilih Lokasi —</option>
                      {quickLocations.map((l)=>(<option key={l.id} value={l.id}>{l.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipe Tiket</label>
                    <select 
                      value={quick.ticketType} 
                      onChange={(e)=>setQuick({...quick, ticketType:e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="INCIDENT">INCIDENT (Gangguan)</option>
                      <option value="REQUEST">REQUEST (Permintaan)</option>
                      <option value="PM">PM (Maintenance)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Kategori Masalah *</label>
                  <select 
                    value={quick.categoryId} 
                    onChange={(e)=>setQuick({...quick, categoryId:e.target.value})} 
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">— Pilih Kategori —</option>
                    {catsGrouped.map(([g, items])=>(
                      <optgroup key={g} label={g}>
                        {items.map((c)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Asset connect */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Package size={13}/> Aset terkait (opsional)
                  </label>
                  <div className="relative">
                    <input 
                      value={assetQuery} 
                      onChange={(e)=>{ setAssetQuery(e.target.value); setShowAssetPicker(true) }} 
                      onFocus={()=>setShowAssetPicker(true)} 
                      placeholder="Cari kode/nama aset atau scan QR…" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                    {quick.assetId && quickAsset && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                        {quickAsset.assetCode}
                      </span>
                    )}
                  </div>
                  {showAssetPicker && assetQuery && (
                    <div className="border border-slate-200 rounded-xl max-h-[160px] overflow-auto bg-white shadow-lg">
                      {filteredAssets.map(a=>(
                        <button 
                          key={a.id} 
                          onClick={()=>{ setQuick({...quick, assetId:a.id}); setAssetQuery(a.name); setShowAssetPicker(false) }} 
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 active:bg-indigo-100 text-xs flex justify-between items-center gap-2 border-b border-slate-50 last:border-0"
                        >
                          <span className="font-bold text-slate-800">{a.name} <span className="font-mono text-[10px] text-slate-400 font-normal">({a.assetCode})</span></span>
                          <span className="text-[11px] text-slate-400 truncate">{a.location?.name||""}</span>
                        </button>
                      ))}
                      {filteredAssets.length===0 && <div className="p-3 text-xs text-slate-400 text-center">Tidak ada aset cocok</div>}
                    </div>
                  )}
                  {quick.assetId && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg flex-1 truncate font-medium">
                        Terhubung: {quickAsset?.name} ({quickAsset?.assetCode})
                      </span>
                      <button 
                        onClick={()=>{setQuick({...quick, assetId:""}); setAssetQuery("")}} 
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {/* PIC Selector */}
                <div className="space-y-1 pt-0.5">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Users size={12} className="text-indigo-600"/> PIC Unit (Kontak Klien)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Auto-isi pelapor & lokasi</span>
                  </label>
                  <select 
                    value={quick.picId} 
                    onChange={(e)=>{
                      const pId = e.target.value;
                      const selPic = quickPics.find(p=> p.id === pId);
                      setQuick(prev=> ({
                        ...prev,
                        picId: pId,
                        reporterName: selPic ? selPic.name : prev.reporterName,
                        locationId: (selPic?.locationId && !prev.locationId) ? selPic.locationId : prev.locationId
                      }));
                    }} 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">— Pilih PIC Unit (Opsional) —</option>
                    {quickPics.map(p=> (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.department ? `(${p.department})` : ''} {p.phone ? `• ${p.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Petugas IT (Teknisi)</label>
                    <select 
                      value={quick.assignedTo} 
                      onChange={(e)=>setQuick({...quick, assignedTo:e.target.value})} 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">— Pilih Teknisi IT —</option>
                      {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Pelapor</label>
                    <input 
                      value={quick.reporterName} 
                      onChange={(e)=>setQuick({...quick, reporterName:e.target.value})} 
                      placeholder="Nama pelapor / unit" 
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Tingkat Severity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["LOW","MEDIUM","CRITICAL"] as const).map((s)=>(
                      <button 
                        key={s} 
                        type="button"
                        onClick={()=>setQuick({...quick, severity:s})} 
                        className={`py-2.5 rounded-xl font-black text-xs border transition active:scale-95 ${
                          quick.severity===s 
                            ? (s==="CRITICAL"?"bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-600/30":s==="LOW"?"bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/30":"bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/30") 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={()=>setShowQuick(false)} 
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 hover:bg-slate-50 active:scale-98 transition"
                >
                  Batal
                </button>
                <button 
                  onClick={submitQuick} 
                  disabled={saving} 
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={16}/> : null} 
                  <span>Simpan Tiket</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DETAIL SLIDE DRAWER (100% MOBILE RESPONSIVE & UNIFIED SCROLL) ── */}
      <AnimatePresence>
        {detailId && (
          <motion.div 
            initial={{opacity:0}} 
            animate={{opacity:1}} 
            exit={{opacity:0}} 
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-end" 
            onClick={()=>{setDetailId(null); setDetail(null)}}
          >
            <motion.div 
              initial={{x:"100%"}} 
              animate={{x:0}} 
              exit={{x:"100%"}} 
              transition={{type:"spring", damping:28, stiffness:300}}
              onClick={(e)=>e.stopPropagation()} 
              className="bg-slate-50 w-full sm:max-w-[620px] lg:max-w-[720px] h-[100dvh] flex flex-col shadow-2xl overflow-hidden"
            >
              {loadingDetail && !detail ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-white">
                  <Loader2 size={36} className="animate-spin text-indigo-600"/>
                  <p className="text-sm font-bold text-slate-700">Memuat detail tiket…</p>
                  <p className="text-xs text-slate-400">Mohon tunggu sebentar</p>
                </div>
              ) : detail ? (
                <>
                {/* 1. Compact Sticky Top Bar */}
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md shrink-0">
                      {detail.ticketNumber}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      detail.severity==="CRITICAL"?"bg-rose-100 text-rose-700":detail.severity==="LOW"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"
                    }`}>
                      {detail.severity}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      detail.status==="NEW"?"bg-slate-200 text-slate-800":detail.status==="IN_PROGRESS"?"bg-sky-100 text-sky-700 font-black":detail.status==="PENDING"?"bg-amber-100 text-amber-700 font-black":detail.status==="RESOLVED"?"bg-indigo-100 text-indigo-700 font-black":"bg-emerald-100 text-emerald-700 font-black"
                    }`}>
                      {detail.status}
                    </span>
                    {detail.slaStatus==="BREACH" && (
                      <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                        BREACH
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={()=>{setDetailId(null); setDetail(null)}} 
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 active:scale-95 shrink-0 text-slate-500 hover:text-slate-800 transition"
                    title="Tutup Sheet"
                  >
                    <X size={20}/>
                  </button>
                </div>

                {/* 2. Unified Scrollable Container (Smooth full-page scroll) */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  
                  {/* Summary & Meta Header */}
                  <div className="p-4 sm:p-5 bg-white border-b border-slate-200 space-y-3.5">
                    {/* Ticket Title */}
                    <div>
                      <h2 className="font-black text-slate-900 text-base sm:text-lg leading-snug break-words">{detail.summary}</h2>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-700">{detail.location?.name || "-"}</span>
                        <span>•</span>
                        <span>{detail.category?.groupName ? `${detail.category.groupName} › ` : ""}{detail.category?.name || "Umum"}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-600">{detail.ticketType}</span>
                      </p>
                    </div>

                    {/* Summary Metas Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <p className="text-slate-400 font-bold uppercase text-[9px]">Dibuat</p>
                        <p className="font-bold text-slate-800 truncate text-[11px] sm:text-xs mt-0.5">
                          {new Date(detail.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'short' })} • {new Date(detail.createdAt).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <p className="text-slate-400 font-bold uppercase text-[9px]">Respon (FRT)</p>
                        <p className="font-bold text-slate-800 truncate text-[11px] sm:text-xs mt-0.5">
                          {detail.acknowledgedAt ? `${detail.frtMinutes}m` : <span className="text-slate-400 font-normal">Belum</span>}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <p className="text-slate-400 font-bold uppercase text-[9px]">Pelapor</p>
                        <p className="font-bold text-slate-800 truncate text-[11px] sm:text-xs mt-0.5">
                          {detail.reporterName || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Quick Status Action Buttons */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {detail.status==="NEW" && (
                        <button 
                          onClick={()=>changeStatus(detail.id,"IN_PROGRESS")} 
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition shadow-sm text-center"
                        >
                          Mulai Kerjakan Tiket
                        </button>
                      )}
                      {detail.status==="IN_PROGRESS" && (
                        <>
                          <button 
                            onClick={()=>changeStatus(detail.id,"PENDING")} 
                            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold transition shadow-sm text-center"
                          >
                            Tunda (Pending)
                          </button>
                          <button 
                            onClick={()=>changeStatus(detail.id,"RESOLVED")} 
                            className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold transition shadow-sm text-center"
                          >
                            Selesaikan Tiket
                          </button>
                        </>
                      )}
                      {detail.status==="PENDING" && (
                        <button 
                          onClick={()=>changeStatus(detail.id,"IN_PROGRESS")} 
                          className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white text-xs font-bold transition shadow-sm text-center"
                        >
                          Lanjutkan Pengerjaan
                        </button>
                      )}
                      {detail.status==="RESOLVED" && (
                        <button 
                          onClick={()=>changeStatus(detail.id,"CLOSED")} 
                          className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold transition shadow-sm text-center"
                        >
                          Tutup Tiket (Closed)
                        </button>
                      )}
                    </div>

                    {/* Connected Entities: 3 Responsive Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {/* PIC Unit Card */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Users size={12} className="text-indigo-600"/> PIC Unit</span>
                            {detail.pic?.phone && (
                              <a 
                                href={`https://wa.me/${detail.pic.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200"
                                title="Chat WhatsApp"
                              >
                                <MessageSquare size={10} /> WA
                              </a>
                            )}
                          </div>
                          <div className="mt-1.5">
                            {detail.pic ? (
                              <div className="text-xs">
                                <p className="font-extrabold text-slate-800 truncate">{detail.pic.name}</p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{detail.pic.department || "Unit Klien"} • {detail.pic.phone || "-"}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">Belum ditautkan PIC</p>
                            )}
                          </div>
                        </div>
                        <select 
                          value={detail.pic?.id || detail.picId || ""} 
                          onChange={(e)=> connectPic(detail.id, e.target.value)} 
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white mt-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        >
                          <option value="">— Ganti/Set PIC —</option>
                          {pics.map(p=> <option key={p.id} value={p.id}>{p.name} {p.department ? `(${p.department})` : ''}</option>)}
                        </select>
                      </div>

                      {/* Asset Card */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <Package size={12} className="text-indigo-600"/> Aset Terhubung
                          </p>
                          <div className="mt-1.5">
                            {detail.asset ? (
                              <div className="flex items-center justify-between text-xs bg-white p-1.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-800 truncate text-[11px]">{detail.asset.name} <span className="font-mono text-[10px] text-slate-400 font-normal">({detail.asset.assetCode})</span></span>
                                <button onClick={()=>connectAsset(detail.id,"")} className="text-[9px] px-1.5 py-0.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold shrink-0 ml-1">Lepas</button>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">Tanpa aset terhubung</p>
                            )}
                          </div>
                        </div>
                        <select 
                          value={detail.asset?.id || detail.assetId || ""} 
                          onChange={(e)=> connectAsset(detail.id, e.target.value)} 
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white mt-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        >
                          <option value="">— Hubungkan aset —</option>
                          {assets.map(a=> <option key={a.id} value={a.id}>{a.name} ({a.assetCode})</option>)}
                        </select>
                      </div>
                      
                      {/* Technician Assignee */}
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <Wrench size={12} className="text-indigo-600"/> Teknisi IT
                          </p>
                          <div className="mt-1.5">
                            <p className="text-xs text-slate-800 truncate font-extrabold">{detail.assignedUser?.name || detail.assignedUser?.email || <span className="text-slate-400 font-normal">— Belum ada</span>}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">Penanggung jawab</p>
                          </div>
                        </div>
                        <select 
                          value={detail.assignedTo || ""} 
                          onChange={(e)=> reassign(detail.id, e.target.value)} 
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white mt-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        >
                          <option value="">— Alihkan Teknisi —</option>
                          {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Sticky 3-Phase Tabs Bar */}
                  <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 flex gap-1.5 p-2.5 shadow-xs">
                    {PHASES.map(p=>{
                      const cnt = phaseCounts[p.id]
                      const isActive = activePhase===p.id
                      return (
                        <button 
                          key={p.id} 
                          onClick={()=>setActivePhase(p.id as typeof activePhase)} 
                          className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                            isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                            <p.icon size={13} className="shrink-0"/> 
                            <span>{p.label}</span>
                            {cnt > 0 && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${isActive ? "bg-white text-indigo-600" : "bg-slate-900 text-white"}`}>
                                {cnt}
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] font-normal opacity-80 hidden sm:block">{p.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* 4. Phase Content & Work Items Feed (Spacious bottom layout) */}
                  <div className="p-4 sm:p-5 space-y-4 pb-36 sm:pb-24">
                    {/* Guidance Tip */}
                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 leading-relaxed">
                      {activePhase==="ANALISA" && "💡 Analisa: Diagnosis gejala, log error, pengukuran voltase/sinyal, dan foto kondisi awal perangkat."}
                      {activePhase==="PENGERJAAN" && "💡 Pengerjaan: Langkah eksekusi perbaikan — bongkar, crimping, replace part, dan foto langkah kerja."}
                      {activePhase==="HASIL" && "💡 Hasil: Uji verifikasi fungsional, serah terima unit, dan foto hasil akhir yang telah normal."}
                    </div>

                    {/* Existing Work Items Feed */}
                    <div className="space-y-3">
                      {(detail.workItems||[]).filter(w=> w.phase===activePhase).length===0 && (
                        <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                          Belum ada catatan {activePhase.toLowerCase()} — tambahkan pekerjaan di form bawah
                        </div>
                      )}
                      {(detail.workItems||[]).filter(w=> w.phase===activePhase).map(w=>(
                        <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {w.title && <p className="font-extrabold text-slate-900 text-sm">{w.title}</p>}
                              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5 leading-relaxed">{w.description}</p>
                              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                <span>{new Date(w.createdAt).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' })}</span>
                                {w.creator?.name && <span>• {w.creator.name}</span>}
                              </p>
                            </div>
                            {isAdmin ? (
                              <button onClick={()=>delWorkItem(w.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 shrink-0" title="Hapus (Admin)">
                                <Trash2 size={14}/>
                              </button>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-bold">Terkunci</span>
                            )}
                          </div>

                          {/* Photos Gallery */}
                          {w.attachments.length>0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                              {w.attachments.map(a=>(
                                <div key={a.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${a.url}`} alt={a.fileName||"foto"} className="w-full h-24 sm:h-28 object-cover"/>
                                  {isAdmin && (
                                    <button onClick={()=>delAttachment(w.id, a.id)} className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-600" title="Hapus foto">
                                      <X size={12}/>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Attach more photos */}
                          <div className="pt-2 border-t border-slate-100">
                            <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
                              <ImagePlus size={13}/> Tambah foto dokumentasi
                            </label>
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={(e)=> { if(e.target.files) attachMore(w.id, e.target.files); e.target.value="" }} 
                              className="mt-1 block w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-slate-100 file:text-slate-700 file:font-bold hover:file:bg-slate-200"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Work Item Form (Spacious, Clear & Touch-Friendly) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Plus size={14} className="text-indigo-600"/> Catat Pekerjaan {activePhase}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">Langkah per langkah</span>
                      </div>
                      
                      <input 
                        value={newTitle} 
                        onChange={(e)=>setNewTitle(e.target.value)} 
                        placeholder="Judul singkat (opsional) — cth: Pengecekan jalur adaptor" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                      />

                      <textarea 
                        value={newDesc} 
                        onChange={(e)=>setNewDesc(e.target.value)} 
                        placeholder={activePhase==="ANALISA"? "Jelaskan temuan analisa, gejala gangguan, pengukuran voltase…" : activePhase==="PENGERJAAN"? "Uraikan tindakan perbaikan yang dilakukan, penggantian part…" : "Jelaskan hasil akhir pengujian, verifikasi fungsi, serah terima…"} 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[90px] sm:min-h-[110px] bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-relaxed" 
                      />

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Upload Foto Dokumentasi</label>
                        <input 
                          ref={fileRef} 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          onChange={(e)=> setNewFiles(e.target.files)} 
                          className="block w-full text-xs text-slate-500 file:mr-2.5 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-bold hover:file:bg-slate-800 transition"
                        />
                        {newFiles && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ {newFiles.length} foto terpilih untuk diupload</p>}
                      </div>

                      <button 
                        onClick={addWorkItem} 
                        disabled={adding} 
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition disabled:opacity-60"
                      >
                        {adding ? <Loader2 className="animate-spin" size={15}/> : <Plus size={15}/>} 
                        Simpan Catatan {activePhase}
                      </button>
                    </div>

                    {/* Resolution Summary (If resolved/closed) */}
                    {(detail.rootCause || detail.correctiveAction) && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs text-slate-700 shadow-sm">
                        <h4 className="font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <Check size={14} className="text-emerald-600"/> Ringkasan Akar Masalah & Solusi
                        </h4>
                        {detail.rootCause && (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                            <span className="font-bold text-slate-800 block text-[11px]">Akar Masalah:</span>
                            <p className="mt-0.5 text-slate-600 leading-relaxed">{detail.rootCause}</p>
                          </div>
                        )}
                        {detail.correctiveAction && (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                            <span className="font-bold text-slate-800 block text-[11px]">Tindakan Perbaikan:</span>
                            <p className="mt-0.5 text-slate-600 leading-relaxed">{detail.correctiveAction}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Integrated Audit Note in Scrollable Body */}
                    <div className="pt-2 text-center text-[10px] text-slate-400">
                      Audit log: Setiap perubahan status & catatan pengerjaan tercatat otomatis dengan timestamp
                    </div>
                  </div>
                </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-[10px] sm:text-[11px] text-slate-400 px-1 text-center sm:text-left">
        Target FRT SLA otomatis dihitung berdasarkan tingkat severity tiket.
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={()=>setShowQuick(true)} 
        className="fixed bottom-20 right-4 sm:hidden w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Quick-Log Tiket Baru"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
