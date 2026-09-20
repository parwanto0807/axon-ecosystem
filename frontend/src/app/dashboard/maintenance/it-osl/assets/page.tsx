"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Package, QrCode, MapPin, Search, AlertTriangle, CheckCircle2, 
  Upload, Download, X, Loader2, User, 
  Edit2, Eye, Trash2, LayoutGrid, LayoutList, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Printer, ArrowUpDown, RotateCcw, Plus, Wrench,
  CheckSquare, Square, Info, FileSpreadsheet, Copy, Check, Calendar,
  MessageCircle, Users, Camera, Filter, MoreVertical, SlidersHorizontal,
  ExternalLink, Sparkles, UserPlus, Image as ImageIcon, Maximize2, Building2
} from "lucide-react"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type PicOpt = {
  id: string
  name: string
  position?: string | null
  department?: string | null
  phone?: string | null
}

type CustomerOpt = {
  id: string
  code: string
  name: string
  companyName?: string | null
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
  customerId?: string | null
  customer?: { id: string; code: string; name: string; companyName?: string | null } | null
  ticketCount: number
  recurring: boolean
  warrantyUntil: string | null
  purchaseDate: string | null
  notes: string | null
  photos?: string | string[] | null
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

type Location = { id: string; code: string; name: string; customerId?: string | null }

const ASSET_TYPES = [
  "Switch", "Router", "Access Point", "PC/Desktop", "Laptop", 
  "Printer", "CCTV", "NVR/DVR", "UPS", "Server", "Barrier Gate", "Lainnya"
]

const STATUS_OPTS = [
  { v: "ACTIVE", l: "Aktif", c: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { v: "IN_REPAIR", l: "Perbaikan", c: "bg-amber-100 text-amber-700 border-amber-200" },
  { v: "RETIRED", l: "Afkir", c: "bg-slate-200 text-slate-700 border-slate-300" },
]

const getAssetPhotos = (photosRaw?: string | string[] | null): string[] => {
  if (!photosRaw) return []
  if (Array.isArray(photosRaw)) return photosRaw
  try {
    const parsed = JSON.parse(photosRaw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return photosRaw.split(',').map(s => s.trim()).filter(Boolean)
  }
}

export default function ItOslAssetsPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?:string })?.id || null
  const currentRole = (session?.user as { role?:string })?.role || null
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'

  const getAuthHeaders = (): Record<string, string> => ({
    "x-user-id": currentUserId || "",
    "x-user-role": currentRole || "",
    "x-user-email": session?.user?.email || "",
  })

  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [customers, setCustomers] = useState<CustomerOpt[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [pics, setPics] = useState<PicOpt[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [q, setQ] = useState("")
  const [filterCustomer, setFilterCustomer] = useState<string>("")
  const [filterLocation, setFilterLocation] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterPic, setFilterPic] = useState<string>("")
  const [filterWarranty, setFilterWarranty] = useState<string>("") // "all" | "active" | "expired" | "none"
  const [filterRecurringOnly, setFilterRecurringOnly] = useState(false)
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false)

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
    customerId: "",
    name: "", assetCode: "", assetType: "", brandModel: "", serialNumber: "",
    locationId: "", status: "ACTIVE", picId: "", purchaseDate: "", warrantyUntil: "", notes: "",
    photos: [] as string[]
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = form.photos.length;
    if (currentCount >= 5) {
      alert("Maksimal 5 foto per aset.");
      return;
    }

    const allowedToAdd = 5 - currentCount;
    const filesToUpload = Array.from(files).slice(0, allowedToAdd);

    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      filesToUpload.forEach(f => fd.append("files", f));

      const res = await fetch(`${API}/api/it-osl/upload`, {
        method: "POST",
        body: fd
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Gagal mengunggah foto");

      const newUrls = d.urls || (d.url ? [d.url] : []);
      setForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...newUrls].slice(0, 5)
      }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  }

  const removePhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  }

  // Quick Add PIC Modal State
  const [showAddPicModal, setShowAddPicModal] = useState(false)
  const [picForm, setPicForm] = useState({
    name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: ""
  })
  const [savingPic, setSavingPic] = useState(false)

  const submitQuickPic = async () => {
    if (!picForm.name.trim()) return alert("Nama PIC wajib diisi")
    setSavingPic(true)
    try {
      const payload = {
        name: picForm.name.trim(),
        position: picForm.position.trim() || null,
        department: picForm.department.trim() || null,
        phone: picForm.phone.trim() || null,
        email: picForm.email.trim() || null,
        locationId: picForm.locationId || form.locationId || null,
        notes: picForm.notes.trim() || null,
        isActive: true,
      }
      const res = await fetch(`${API}/api/it-osl/pics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal mendaftarkan PIC baru")

      // Update pics list
      setPics(prev => [d, ...prev])
      // Auto-select newly created PIC in the asset form
      setForm(prev => ({ ...prev, picId: d.id }))
      setShowAddPicModal(false)
      setPicForm({ name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: "" })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menyimpan PIC")
    } finally {
      setSavingPic(false)
    }
  }

  // Quick Add Location Modal State
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationForm, setLocationForm] = useState({
    code: "", name: "", address: ""
  })
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
      // Auto-select newly created location in the asset form
      setForm(prev => ({ ...prev, locationId: d.id }))
      // Also update in picForm if PIC modal is open
      setPicForm(prev => ({ ...prev, locationId: d.id }))
      setShowAddLocationModal(false)
      setLocationForm({ code: "", name: "", address: "" })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menyimpan lokasi")
    } finally {
      setSavingLocation(false)
    }
  }

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [singlePrintAsset, setSinglePrintAsset] = useState<Asset | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // QR Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [manualCodeInput, setManualCodeInput] = useState("")
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scanningActive, setScanningActive] = useState(false)

  // Fetch initial data
  const load = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [aRes, lRes, pRes, cRes] = await Promise.all([
        fetch(`${API}/api/it-osl/assets`, { headers }),
        fetch(`${API}/api/it-osl/locations`, { headers }),
        fetch(`${API}/api/it-osl/pics`, { headers }),
        fetch(`${API}/api/it-osl/customers`, { headers }),
      ])

      if (aRes.ok) {
        const data = await aRes.json()
        setAllAssets(Array.isArray(data) ? data : [])
      }
      if (lRes.ok) setLocations(await lRes.json())
      if (pRes.ok) setPics(await pRes.json())
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

  // Fetch detail with ticket history
  const loadDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API}/api/it-osl/assets/${id}`, { headers: getAuthHeaders() })
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

  // Camera QR Scanner setup
  useEffect(() => {
    let stream: MediaStream | null = null
    let animFrame: number

    if (showScannerModal && navigator?.mediaDevices?.getUserMedia) {
      setScanningActive(true)
      setScannerError(null)

      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s
          if (videoRef.current) {
            videoRef.current.srcObject = s
            videoRef.current.play().catch(console.error)
          }

          // Check if BarcodeDetector API is supported
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] })
            const detectCode = async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const codes = await barcodeDetector.detect(videoRef.current)
                  if (codes.length > 0) {
                    const foundVal = codes[0].rawValue.trim()
                    handleScannedCode(foundVal)
                    return
                  }
                } catch (err) {
                  // ignore frame error
                }
              }
              if (scanningActive) {
                animFrame = requestAnimationFrame(detectCode)
              }
            }
            animFrame = requestAnimationFrame(detectCode)
          }
        })
        .catch(err => {
          console.error("Camera access error:", err)
          setScannerError("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.")
        })
    }

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
      if (animFrame) cancelAnimationFrame(animFrame)
    }
  }, [showScannerModal, scanningActive])

  const handleScannedCode = (code: string) => {
    setShowScannerModal(false)
    const clean = code.trim()
    const found = allAssets.find(a => a.assetCode.toLowerCase() === clean.toLowerCase())
    if (found) {
      setDetailId(found.id)
    } else {
      setQ(clean)
    }
  }

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
        const matchCustomer = (a.customer?.name || a.customer?.companyName || "").toLowerCase().includes(query)
        if (!matchCode && !matchName && !matchSerial && !matchBrand && !matchLocation && !matchPic && !matchCustomer) {
          return false
        }
      }

      // Customer Filter
      if (filterCustomer && a.customerId !== filterCustomer && a.customer?.id !== filterCustomer) return false

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
  }, [allAssets, q, filterCustomer, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly, sortBy, sortDir])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [q, filterCustomer, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly, pageSize])

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
    if (filterCustomer) count++
    if (filterLocation) count++
    if (filterType) count++
    if (filterStatus) count++
    if (filterPic) count++
    if (filterWarranty) count++
    if (filterRecurringOnly) count++
    return count
  }, [q, filterCustomer, filterLocation, filterType, filterStatus, filterPic, filterWarranty, filterRecurringOnly])

  const clearAllFilters = () => {
    setQ("")
    setFilterCustomer("")
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
      customerId: filterCustomer || (customers[0]?.id || ""),
      name: "",
      assetCode: "",
      assetType: "",
      brandModel: "",
      serialNumber: "",
      locationId: locations[0]?.id || "",
      status: "ACTIVE",
      picId: "",
      purchaseDate: "",
      warrantyUntil: "",
      notes: "",
      photos: []
    })
    setShowForm(true)
  }

  const openEdit = (a: Asset) => {
    setEditing(a)
    setForm({
      customerId: a.customerId || a.customer?.id || "",
      name: a.name,
      assetCode: a.assetCode,
      assetType: a.assetType || "",
      brandModel: a.brandModel || "",
      serialNumber: a.serialNumber || "",
      locationId: a.locationId || a.location?.id || "",
      status: a.status || "ACTIVE",
      picId: a.picId || a.pic?.id || "",
      purchaseDate: a.purchaseDate ? a.purchaseDate.split("T")[0] : "",
      warrantyUntil: a.warrantyUntil ? a.warrantyUntil.split("T")[0] : "",
      notes: a.notes || "",
      photos: getAssetPhotos(a.photos)
    })
    setShowForm(true)
  }

  const submitForm = async () => {
    if (!form.name.trim()) return alert("Nama perangkat wajib diisi")
    if (!form.locationId) return alert("Pilih lokasi penempatan aset")

    setSaving(true)
    try {
      const url = editing ? `${API}/api/it-osl/assets/${editing.id}` : `${API}/api/it-osl/assets`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId || null,
          name: form.name.trim(),
          assetCode: form.assetCode.trim() || undefined,
          assetType: form.assetType || null,
          brandModel: form.brandModel || null,
          serialNumber: form.serialNumber || null,
          locationId: form.locationId || null,
          status: form.status,
          picId: form.picId || null,
          purchaseDate: form.purchaseDate || null,
          warrantyUntil: form.warrantyUntil || null,
          notes: form.notes || null,
          photos: form.photos
        })
      })

      if (res.ok) {
        setShowForm(false)
        load()
      } else {
        const err = await res.json()
        alert(err.message || "Gagal menyimpan aset")
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const deleteAsset = async (id: string, name: string) => {
    if (!confirm(`Hapus data aset "${name}"? Riwayat perbaikan yang terhubung akan dipertahankan.`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/assets/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDetailId(null)
        load()
      }
    } catch {}
  }

  // Copy helper
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Helper for WhatsApp URL
  const getWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return null
    let clean = phone.replace(/[^0-9]/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    if (!clean.startsWith("62")) clean = "62" + clean
    return `https://wa.me/${clean}?text=${encodeURIComponent("Halo PIC Unit, perihal aset IT...")}`
  }

  // Export CSV Helper
  const exportCsv = (assetsToExport: Asset[]) => {
    const headers = ["Kode Aset", "Nama Perangkat", "Jenis", "Merek/Model", "Serial Number", "Lokasi", "PIC", "Status", "Garansi", "Tiket", "Catatan"]
    const rows = assetsToExport.map(a => [
      a.assetCode,
      `"${a.name.replace(/"/g, '""')}"`,
      a.assetType || "-",
      `"${(a.brandModel || "-").replace(/"/g, '""')}"`,
      a.serialNumber || "-",
      `"${(a.location?.name || "-").replace(/"/g, '""')}"`,
      `"${(a.pic?.name || a.picUser?.name || "-").replace(/"/g, '""')}"`,
      a.status,
      a.warrantyUntil ? a.warrantyUntil.split("T")[0] : "-",
      a.ticketCount || 0,
      `"${(a.notes || "").replace(/"/g, '""')}"`
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Aset_IT_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Download template CSV
  const downloadCsvTemplate = () => {
    const headers = ["name", "assetCode", "assetType", "brandModel", "serialNumber", "notes"]
    const sample = ["Switch Cisco 24 Port Lantai 1", "AST-SW-001", "Switch", "Cisco SG350-28", "FOC21390A1", "IP: 192.168.1.2"]
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sample.join(",")].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Template_Import_Aset_IT.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Import CSV handler
  const importCsv = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0)
      if (lines.length < 2) return alert("File CSV kosong atau tidak memiliki baris data")

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
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-6 space-y-3.5 sm:space-y-4 pb-28 md:pb-8 overflow-x-hidden font-sans">
      {/* ── 1. HEADER & GLOBAL ACTIONS ────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20 text-white">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                Registri Aset IT & QR
              </h1>
              <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {allAssets.length} Unit
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              Inventaris Perangkat • Label QR Cetak • Terhubung PIC Unit
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          {/* Scan QR Button */}
          <button
            onClick={() => setShowScannerModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
            title="Scan QR Code Aset"
          >
            <Camera size={15} />
            <span>Scan QR</span>
          </button>

          {/* Add Asset Button */}
          <button
            onClick={openCreate}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Aset Baru</span>
          </button>

          {/* Export / Import Dropdown on Desktop / Toolbar */}
          <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <button
              onClick={() => exportCsv(filteredAssets)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs font-bold transition"
              title="Ekspor data CSV"
            >
              <Download size={15} />
            </button>

            <label className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs font-bold cursor-pointer transition" title="Impor CSV">
              <Upload size={15} />
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
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-slate-700 transition"
              title="Unduh Template CSV"
            >
              <FileSpreadsheet size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. KPI METRIC CARDS (Scrollable strip on Mobile, Grid on Tablet/Desktop) ─────────────────────────── */}
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar snap-x">
        {/* Total Assets */}
        <button
          onClick={clearAllFilters}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            activeFilterCount === 0 
              ? "bg-slate-900 text-white border-slate-900 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider ${activeFilterCount === 0 ? "text-slate-300" : "text-slate-400"}`}>
            Total Aset
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.total}</p>
          <p className={`text-[9px] mt-0.5 truncate ${activeFilterCount === 0 ? "text-slate-300" : "text-slate-400"}`}>
            Semua kategori
          </p>
        </button>

        {/* Active */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("ACTIVE"); }}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "ACTIVE" 
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-emerald-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-emerald-600"}`}>
            Aktif / Normal
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.active}</p>
          <p className={`text-[9px] mt-0.5 truncate ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-slate-400"}`}>
            Siap operasional
          </p>
        </button>

        {/* In Repair */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("IN_REPAIR"); }}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "IN_REPAIR" 
              ? "bg-amber-500 text-white border-amber-500 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-amber-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-amber-600"}`}>
            Perbaikan
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.inRepair}</p>
          <p className={`text-[9px] mt-0.5 truncate ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-slate-400"}`}>
            Sedang diservis
          </p>
        </button>

        {/* Retired */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("RETIRED"); }}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "RETIRED" 
              ? "bg-slate-700 text-white border-slate-700 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-400"}`}>
            Afkir / Rusak
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.retired}</p>
          <p className={`text-[9px] mt-0.5 truncate ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-400"}`}>
            Non-operasional
          </p>
        </button>

        {/* Warranty */}
        <button
          onClick={() => { clearAllFilters(); setFilterWarranty("active"); }}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterWarranty === "active" 
              ? "bg-sky-600 text-white border-sky-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-sky-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider ${filterWarranty === "active" ? "text-sky-100" : "text-sky-600"}`}>
            Garansi Aktif
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.inWarranty}</p>
          <p className={`text-[9px] mt-0.5 truncate ${filterWarranty === "active" ? "text-sky-100" : "text-slate-400"}`}>
            Klaim pabrik
          </p>
        </button>

        {/* Recurring */}
        <button
          onClick={() => { clearAllFilters(); setFilterRecurringOnly(true); }}
          className={`shrink-0 w-32 sm:w-auto snap-start p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterRecurringOnly 
              ? "bg-rose-600 text-white border-rose-600 shadow-md" 
              : "bg-white text-slate-800 border-slate-100 hover:border-rose-300 shadow-sm"
          }`}
        >
          <p className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${filterRecurringOnly ? "text-rose-100" : "text-rose-600"}`}>
            <AlertTriangle size={11} /> Sering Rusak
          </p>
          <p className="text-lg sm:text-2xl font-black mt-0.5 tabular-nums">{metrics.recurring}</p>
          <p className={`text-[9px] mt-0.5 truncate ${filterRecurringOnly ? "text-rose-100" : "text-slate-400"}`}>
            ≥3 tiket insiden
          </p>
        </button>
      </div>

      {/* ── 3. SEARCH & ADVANCED FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kode aset, nama, SN, merek, lokasi, PIC..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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

          {/* Desktop Filter Dropdowns */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
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
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700"
            >
              <option value="">Semua Jenis</option>
              {ASSET_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-700 max-w-[170px]"
            >
              <option value="">Semua PIC</option>
              <option value="UNASSIGNED">Tanpa PIC</option>
              {pics.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.department ? `(${p.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Filter Button & View Switcher */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setShowMobileFilterSheet(true)}
              className="lg:hidden flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Filter size={14} />
              <span>Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
            </button>

            {/* View Switcher (Desktop & Mobile) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Tampilan Tabel"
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500 text-[10px] uppercase">Filter:</span>

            {q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium">
                "{q}"
                <button onClick={() => setQ("")}><X size={11} /></button>
              </span>
            )}
            {filterCustomer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 text-[11px] font-semibold">
                Customer: {customers.find(c => c.id === filterCustomer)?.name}
                <button onClick={() => setFilterCustomer("")}><X size={11} /></button>
              </span>
            )}
            {filterLocation && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                {locations.find(l => l.id === filterLocation)?.name}
                <button onClick={() => setFilterLocation("")}><X size={11} /></button>
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                {filterType}
                <button onClick={() => setFilterType("")}><X size={11} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                Status: {STATUS_OPTS.find(s => s.v === filterStatus)?.l}
                <button onClick={() => setFilterStatus("")}><X size={11} /></button>
              </span>
            )}
            {filterPic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                PIC: {filterPic === "UNASSIGNED" ? "Tanpa PIC" : (pics.find(p => p.id === filterPic)?.name || filterPic)}
                <button onClick={() => setFilterPic("")}><X size={11} /></button>
              </span>
            )}
            {filterWarranty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-medium">
                Garansi: {filterWarranty === "active" ? "Aktif" : filterWarranty === "expired" ? "Habis" : "Tanpa"}
                <button onClick={() => setFilterWarranty("")}><X size={11} /></button>
              </span>
            )}
            {filterRecurringOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
                Sering Rusak
                <button onClick={() => setFilterRecurringOnly(false)}><X size={11} /></button>
              </span>
            )}

            <button onClick={clearAllFilters} className="text-indigo-600 hover:text-indigo-800 font-bold ml-1 text-[11px] flex items-center gap-0.5">
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        )}
      </div>

      {/* ── 4. BATCH ACTIONS BAR ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-2.5 flex-wrap z-30"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="text-xs font-bold">Aset terpilih</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setShowBatchPrint(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95 text-xs font-black flex items-center gap-1.5 transition shadow-sm"
              >
                <Printer size={13} />
                <span>Cetak {selectedIds.size} QR</span>
              </button>

              <button
                onClick={() => exportCsv(selectedAssetsList)}
                className="px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button onClick={handleDeselectAll} className="px-2.5 py-1.5 rounded-xl hover:bg-indigo-800 text-indigo-200 text-xs font-bold transition">
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. DATA VIEW (MOBILE ADAPTIVE) ───────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-xs sm:text-sm font-bold text-slate-600">Memuat Registri Aset...</p>
        </div>
      ) : paginatedAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500 space-y-2.5">
          <Package size={36} className="mx-auto text-slate-300" />
          <h3 className="font-black text-sm sm:text-base text-slate-800">Tidak ada aset yang sesuai</h3>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold">
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (CARD LIST - ALWAYS CLEAN ON SMALL SCREENS) */}
          <div className="block md:hidden space-y-2.5">
            {paginatedAssets.map((a) => {
              const isSelected = selectedIds.has(a.id)
              const isWarrantyActive = a.warrantyUntil && new Date(a.warrantyUntil) > new Date()
              const picName = a.pic?.name || a.picUser?.name || null
              const picPhone = a.pic?.phone || null
              const waUrl = getWhatsAppUrl(picPhone)
              const assetPhotos = getAssetPhotos(a.photos)

              return (
                <div
                  key={a.id}
                  className={`bg-white rounded-2xl border p-3.5 space-y-2.5 transition-all shadow-sm ${
                    isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-100"
                  }`}
                >
                  {/* Top Bar: Code + Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button onClick={() => handleToggleSelect(a.id)} className="text-slate-400 shrink-0">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                      <button
                        onClick={() => setDetailId(a.id)}
                        className="font-mono text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded truncate"
                      >
                        {a.assetCode}
                      </button>
                      <button onClick={() => copyCode(a.assetCode)} className="text-slate-400 p-0.5">
                        {copiedCode === a.assetCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {a.customer && (
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200 truncate max-w-[100px]">
                          {a.customer.name}
                        </span>
                      )}
                      {assetPhotos.length > 0 && (
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-slate-200">
                          <Camera size={9} className="text-indigo-600" /> {assetPhotos.length}
                        </span>
                      )}
                      {(a.recurring || (a.ticketCount || 0) >= 3) && (
                        <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <AlertTriangle size={9} /> Rusak
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                        STATUS_OPTS.find(s => s.v === a.status)?.c || "bg-slate-100 text-slate-700"
                      }`}>
                        {STATUS_OPTS.find(s => s.v === a.status)?.l || a.status}
                      </span>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div onClick={() => setDetailId(a.id)} className="cursor-pointer flex items-start gap-2.5">
                    {assetPhotos.length > 0 && (
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-xs">
                        <img
                          src={assetPhotos[0].startsWith("http") ? assetPhotos[0] : `${API}${assetPhotos[0]}`}
                          alt={a.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-900 text-xs sm:text-sm line-clamp-1 hover:text-indigo-600">
                        {a.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {a.assetType || "Perangkat"} • {a.brandModel || "Tanpa Merek"} {a.serialNumber ? `• SN: ${a.serialNumber}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Metadata: Location & PIC */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{a.location?.name || "-"}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <User size={12} className="text-indigo-500 shrink-0" />
                      <span className="font-medium truncate max-w-[110px]">
                        {picName || <span className="text-slate-400 italic">Tanpa PIC</span>}
                      </span>
                      {waUrl && (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 p-0.5">
                          <MessageCircle size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Strip */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
                    <button
                      onClick={() => setDetailId(a.id)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                    >
                      <Eye size={12} /> Detail
                    </button>
                    <button
                      onClick={() => setSinglePrintAsset(a)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 active:scale-95"
                    >
                      <QrCode size={13} /> Cetak QR
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 active:scale-95"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE / GRID VIEW (md and up) */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              /* ── TABLE VIEW ──────────────────────────────────────────────────── */
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
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
                            <span>Tiket</span>
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
                        const assetPhotos = getAssetPhotos(a.photos)

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
                              <div className="flex items-center gap-2.5">
                                {assetPhotos.length > 0 && (
                                  <div 
                                    onClick={() => setPreviewPhotoModal(assetPhotos[0].startsWith("http") ? assetPhotos[0] : `${API}${assetPhotos[0]}`)}
                                    className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-xs cursor-pointer group"
                                    title="Klik untuk melihat foto"
                                  >
                                    <img
                                      src={assetPhotos[0].startsWith("http") ? assetPhotos[0] : `${API}${assetPhotos[0]}`}
                                      alt={a.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition"
                                    />
                                    {assetPhotos.length > 1 && (
                                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/75 text-white rounded text-[7px] font-bold">
                                        +{assetPhotos.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900 truncate hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(a.id)}>
                                      {a.name}
                                    </p>
                                    {a.customer && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                        {a.customer.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {a.assetType ? <span className="font-semibold text-slate-700">{a.assetType}</span> : "Lainnya"}
                                    {a.brandModel ? ` • ${a.brandModel}` : ""}
                                    {a.serialNumber ? ` • SN: ${a.serialNumber}` : ""}
                                  </p>
                                </div>
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
              /* ── DESKTOP GRID VIEW ───────────────────────────────────────────── */
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
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
          </div>
        </>
      )}

      {/* ── 6. PAGINATION ──────────────────────────────────────────────────────── */}
      {!loading && totalItems > 0 && (
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

      {/* ── 7. CAMERA SCANNER MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScannerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowScannerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 text-white rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl border border-slate-800 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Scan Label QR Aset</h3>
                    <p className="text-[10px] text-slate-400">Arahkan kamera ke stiker QR perangkat</p>
                  </div>
                </div>
                <button onClick={() => setShowScannerModal(false)} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {/* Video Viewfinder */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-700">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Scanning Target Box */}
                <div className="absolute inset-8 sm:inset-12 border-2 border-indigo-500 rounded-2xl pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <div className="w-full h-0.5 bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
                </div>

                {scannerError && (
                  <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <AlertTriangle size={28} className="text-amber-400" />
                    <p className="text-xs text-slate-300 font-medium">{scannerError}</p>
                  </div>
                )}
              </div>

              {/* Manual Code Input Fallback */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atau masukkan kode secara manual</p>
                <div className="flex gap-2">
                  <input
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: AST-SW-001"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                  <button
                    onClick={() => handleScannedCode(manualCodeInput)}
                    disabled={!manualCodeInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold"
                  >
                    Buka
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. MOBILE FILTER BOTTOM SHEET ───────────────────────────────────────── */}
      <AnimatePresence>
        {showMobileFilterSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end lg:hidden"
            onClick={() => setShowMobileFilterSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col p-5 space-y-4 pb-safe shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-indigo-600" />
                  <h3 className="font-black text-sm text-slate-900">Filter Aset IT</h3>
                </div>
                <button onClick={() => setShowMobileFilterSheet(false)} className="p-1 rounded-full text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                {/* Customer */}
                {customers.length > 0 && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Customer / Klien</label>
                    <select
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 font-semibold text-indigo-950"
                    >
                      <option value="">Semua Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.companyName ? `(${c.companyName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lokasi */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi Penempatan</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Semua Lokasi</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>

                {/* Jenis Perangkat */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Perangkat</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Semua Jenis</option>
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Operasional</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Semua Status</option>
                    {STATUS_OPTS.map(s => (
                      <option key={s.v} value={s.v}>{s.l}</option>
                    ))}
                  </select>
                </div>

                {/* PIC */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">PIC Penanggung Jawab</label>
                  <select
                    value={filterPic}
                    onChange={(e) => setFilterPic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Semua PIC</option>
                    <option value="UNASSIGNED">Tanpa PIC</option>
                    {pics.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.department ? `(${p.department})` : ""}</option>
                    ))}
                  </select>
                </div>

                {/* Garansi */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Garansi</label>
                  <select
                    value={filterWarranty}
                    onChange={(e) => setFilterWarranty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">Semua Status Garansi</option>
                    <option value="active">Garansi Masih Aktif</option>
                    <option value="expired">Garansi Sudah Habis</option>
                    <option value="none">Tanpa Informasi Garansi</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowMobileFilterSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md"
                >
                  Terapkan Filter ({filteredAssets.length} Aset)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 9. ASSET DETAIL DRAWER (MOBILE BOTTOM SHEET & DESKTOP SIDE PANEL) ────────────────────────────────────────────── */}
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
                  <p className="text-xs sm:text-sm font-bold text-slate-700">Memuat detail aset...</p>
                </div>
              ) : detail ? (
                <>
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b shrink-0 bg-slate-50 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded">
                          {detail.assetCode}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          STATUS_OPTS.find(s => s.v === detail.status)?.c || "bg-slate-100"
                        }`}>
                          {STATUS_OPTS.find(s => s.v === detail.status)?.l || detail.status}
                        </span>
                      </div>
                      <h2 className="text-sm sm:text-lg font-black text-slate-900 mt-1.5 break-words leading-tight">
                        {detail.name}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                        {detail.assetType || "Lainnya"} • {detail.brandModel || "-"} • Lokasi: {detail.location?.name || "-"}
                      </p>
                      {detail.customer && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg mt-1.5">
                          <Building2 size={12} className="text-indigo-600" />
                          <span>Customer: {detail.customer.name} {detail.customer.companyName ? `(${detail.customer.companyName})` : ""}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setSinglePrintAsset(detail)} className="p-2 rounded-xl border bg-white text-slate-700 shadow-sm" title="Cetak Label QR">
                        <Printer size={15} />
                      </button>
                      <button onClick={() => { setDetailId(null); openEdit(detail); }} className="p-2 rounded-xl border bg-white text-slate-700 shadow-sm" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* QR Code Sticker Card Preview */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3.5">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(detail.assetCode)}`}
                          alt="qr label"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Label QR Asset Ready</p>
                        <p className="font-mono text-xs sm:text-sm font-black text-slate-900">{detail.assetCode}</p>
                        <button
                          onClick={() => setSinglePrintAsset(detail)}
                          className="mt-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                        >
                          <Printer size={12} /> Cetak Label Stiker
                        </button>
                      </div>
                    </div>

                    {/* PIC Contact Card in Asset Detail */}
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <Users size={13} /> PIC Penanggung Jawab Perangkat
                      </p>
                      {detail.pic ? (
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-black text-slate-900 text-xs sm:text-sm">{detail.pic.name}</p>
                            <p className="text-[11px] text-slate-600">
                              {detail.pic.position ? `${detail.pic.position} • ` : ""}{detail.pic.department || "Unit"}
                            </p>
                            {detail.pic.phone && <p className="font-mono text-[11px] text-indigo-700 mt-0.5">{detail.pic.phone}</p>}
                          </div>
                          {detail.pic.phone && getWhatsAppUrl(detail.pic.phone) && (
                            <a
                              href={getWhatsAppUrl(detail.pic.phone)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                            >
                              <MessageCircle size={13} /> Chat WhatsApp
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada PIC penanggung jawab untuk perangkat ini.</p>
                      )}
                    </div>

                    {/* Photos Gallery in Detail */}
                    {detail.photos && getAssetPhotos(detail.photos).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ImageIcon size={13} /> Foto Dokumentasi Perangkat ({getAssetPhotos(detail.photos).length})
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {getAssetPhotos(detail.photos).map((url, idx) => {
                            const fullUrl = url.startsWith("http") ? url : `${API}${url}`;
                            return (
                              <div
                                key={idx}
                                onClick={() => setPreviewPhotoModal(fullUrl)}
                                className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm cursor-pointer"
                              >
                                <img
                                  src={fullUrl}
                                  alt={`Foto ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="p-1 rounded-lg bg-black/60 text-white"><Maximize2 size={13} /></span>
                                </div>
                                <span className="absolute bottom-1 left-1.5 px-1.5 py-0.2 bg-black/60 text-white rounded text-[8px] font-bold">
                                  #{idx + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Technical Specs */}
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Info size={13} /> Spesifikasi Perangkat
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-bold uppercase">Jenis Aset</p>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{detail.assetType || "-"}</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-bold uppercase">Merek / Model</p>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{detail.brandModel || "-"}</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-bold uppercase">Serial Number (SN)</p>
                          <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">{detail.serialNumber || "-"}</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-400 text-[9px] font-bold uppercase">Lokasi</p>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">{detail.location?.name || "-"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Service History */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Wrench size={13} /> Riwayat Tiket ({detail.tickets?.length || 0})
                        </h3>
                      </div>

                      {(!detail.tickets || detail.tickets.length === 0) ? (
                        <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                          Belum ada riwayat perbaikan untuk perangkat ini.
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

                  {/* Sticky Footer */}
                  <div className="p-3.5 sm:p-4 border-t bg-slate-50 flex items-center justify-between gap-2.5 shrink-0 pb-6 sm:pb-4">
                    <button onClick={() => deleteAsset(detail.id, detail.name)} className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1">
                      <Trash2 size={13} /> Hapus
                    </button>
                    <button onClick={() => { setDetailId(null); openEdit(detail); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5">
                      <Edit2 size={13} /> Edit Data
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 10. BATCH / SINGLE QR LABEL PRINT MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {(showBatchPrint || singlePrintAsset) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-3xl p-4 sm:p-6 space-y-3.5 max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2.5 border-b">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Printer size={16} className="text-indigo-600" />
                    <span>Cetak Label Stiker QR Perangkat</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {singlePrintAsset
                      ? `1 label untuk ${singlePrintAsset.name} (${singlePrintAsset.assetCode})`
                      : `${selectedAssetsList.length} label stiker terpilih`}
                  </p>
                </div>
                <button onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-1">
                <div id="printable-labels-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-1">
                  {(singlePrintAsset ? [singlePrintAsset] : selectedAssetsList).map(a => (
                    <div key={a.id} className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-white flex flex-col justify-between space-y-1.5 text-center">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="font-black text-[9px] tracking-widest text-slate-900 uppercase">AXON ASSET</span>
                        <span className="text-[8px] font-bold text-slate-400">{a.location?.name || "IT"}</span>
                      </div>
                      <div className="flex justify-center py-0.5">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(a.assetCode)}`}
                          alt={a.assetCode}
                          className="w-20 h-20 object-contain bg-white p-1 rounded-lg border border-slate-100"
                        />
                      </div>
                      <div>
                        <p className="font-mono text-[11px] font-black text-indigo-700 bg-slate-50 py-0.5 rounded border border-slate-200">{a.assetCode}</p>
                        <p className="font-bold text-slate-900 text-xs mt-0.5 truncate">{a.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">{a.assetType || "IT Device"} • SN: {a.serialNumber || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400 hidden sm:block">Gunakan ukuran stiker label saat mencetak dari browser.</p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} className="px-3.5 py-2 rounded-xl border text-slate-700 text-xs font-bold hover:bg-slate-50">
                    Tutup
                  </button>
                  <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
                    <Printer size={14} /> Cetak Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 11. CREATE / EDIT ASSET MODAL ───────────────────────────────────────── */}
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
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-safe"
            >
              {/* Sticky Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    {editing ? "Edit Informasi Aset" : "Tambah Aset Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Isi data identitas perangkat, lokasi, dan PIC unit.
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* 1. Customer (If Available) */}
                {customers.length > 0 && (
                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                    <label className="font-bold text-indigo-950 block mb-1 flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-600" />
                      <span>Customer / Klien Pemilik Perangkat</span>
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

                {/* 2. Device Identity */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Aset / Perangkat *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: Switch Core Lantai 2, PC Kasir 01..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Kode Aset (QR)</label>
                      <input
                        value={form.assetCode}
                        onChange={(e) => setForm({ ...form, assetCode: e.target.value.toUpperCase() })}
                        placeholder="Auto: AST-..."
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Jenis Aset</label>
                      <select
                        value={form.assetType}
                        onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      >
                        <option value="">— Pilih Jenis Aset —</option>
                        {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Merek / Model</label>
                      <input
                        value={form.brandModel}
                        onChange={(e) => setForm({ ...form, brandModel: e.target.value })}
                        placeholder="Contoh: Cisco SG350 / Dell 7080"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="font-bold text-slate-700 block mb-1">Serial Number (SN)</label>
                      <input
                        value={form.serialNumber}
                        onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                        placeholder="Contoh: FOC21390A1"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Placement & PIC Section */}
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lokasi Fisik */}
                    <div className="min-w-0">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <label className="font-bold text-slate-700">Lokasi Fisik *</label>
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
                        <option value="">— Pilih Lokasi —</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                        ))}
                      </select>
                      {locations.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} /> Belum ada lokasi. Klik <b>Tambah Lokasi</b>.
                        </p>
                      )}
                    </div>

                    {/* Status Operasional */}
                    <div className="min-w-0">
                      <div className="flex items-center mb-1 h-5">
                        <label className="font-bold text-slate-700">Status Operasional</label>
                      </div>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* PIC Penanggung Jawab */}
                  <div className="min-w-0 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between mb-1 h-5">
                      <label className="font-bold text-slate-700">
                        PIC Penanggung Jawab Perangkat
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPicForm({
                            name: "",
                            position: "",
                            department: "",
                            phone: "",
                            email: "",
                            locationId: form.locationId || "",
                            notes: ""
                          });
                          setShowAddPicModal(true);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 active:scale-95 transition"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Tambah PIC Baru</span>
                      </button>
                    </div>

                    <select
                      value={form.picId}
                      onChange={(e) => setForm({ ...form, picId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
                    >
                      <option value="">— Tanpa PIC (Umum) —</option>
                      {pics.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.department ? `• ${p.department}` : ""} {p.phone ? `(${p.phone})` : ""}
                        </option>
                      ))}
                    </select>

                    {pics.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Belum ada data PIC. Klik <b>Tambah PIC Baru</b> jika diperlukan.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Dates / Warranty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Perolehan</label>
                    <input
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="font-bold text-slate-700 block mb-1">Garansi Berakhir</label>
                    <input
                      type="date"
                      value={form.warrantyUntil}
                      onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* ── FOTO DOKUMENTASI FISIK ASET (3 - 5 FOTO) ── */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                          <Camera size={15} className="text-indigo-600" />
                          Foto Dokumentasi Fisik Aset
                        </label>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                          form.photos.length >= 3 && form.photos.length <= 5
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : form.photos.length > 0
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-200/70 text-slate-600 border-slate-300"
                        }`}>
                          {form.photos.length}/5 Foto
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Disarankan <b>3–5 foto</b> dari berbagai sudut (Tampak Depan, Belakang, Stiker SN, Port/Kabel).
                      </p>
                    </div>
                  </div>

                  {/* Photo Thumbnails Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {form.photos.map((url, idx) => {
                      const fullUrl = url.startsWith("http") ? url : `${API}${url}`;
                      return (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-100 bg-white shadow-sm group"
                        >
                          <img
                            src={fullUrl}
                            alt={`Foto Aset ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition cursor-pointer"
                            onClick={() => setPreviewPhotoModal(fullUrl)}
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 bg-black/60 text-white rounded text-[9px] font-bold">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md active:scale-90 transition"
                            title="Hapus foto"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Upload Tile if less than 5 */}
                    {form.photos.length < 5 && (
                      <label className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center cursor-pointer transition ${
                        uploadingPhotos
                          ? "border-indigo-400 bg-indigo-50/50 cursor-wait"
                          : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30 bg-white"
                      }`}>
                        {uploadingPhotos ? (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 size={20} className="animate-spin text-indigo-600" />
                            <span className="text-[10px] font-bold text-indigo-600">Mengunggah...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                              <Camera size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 leading-tight">
                              + Foto
                            </span>
                            <span className="text-[9px] text-slate-400">
                              (Maks 5)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={uploadingPhotos}
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  {/* Status Indicator / Recommendation */}
                  {form.photos.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200/60">
                      <Info size={13} className="text-slate-400 shrink-0" />
                      <span>Belum ada foto yang diunggah. Ambil/pilih 3–5 foto fisik perangkat.</span>
                    </div>
                  ) : form.photos.length < 3 ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                      <span>Tambahkan {3 - form.photos.length} foto lagi untuk memenuhi rekomendasi standar (min. 3 foto).</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Dokumentasi lengkap ({form.photos.length} foto aset terpasang).</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="IP Address, Rak Server, Port Switch..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[50px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
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
                  <span>{editing ? "Simpan Perubahan" : "Simpan Aset"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 12. QUICK ADD PIC MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddPicModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowAddPicModal(false)}
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
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      Tambah PIC Baru Cepat
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      PIC akan langsung otomatis terpilih untuk aset ini.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowAddPicModal(false)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama PIC *</label>
                  <input
                    value={picForm.name}
                    onChange={(e) => setPicForm({ ...picForm, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso, Siti Rahmawati..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jabatan / Posisi</label>
                    <input
                      value={picForm.position}
                      onChange={(e) => setPicForm({ ...picForm, position: e.target.value })}
                      placeholder="Contoh: Kasir, Staff HR"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Departemen / Divisi</label>
                    <input
                      value={picForm.department}
                      onChange={(e) => setPicForm({ ...picForm, department: e.target.value })}
                      placeholder="Contoh: Finance, Logistik"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">No. WhatsApp / HP</label>
                    <input
                      value={picForm.phone}
                      onChange={(e) => setPicForm({ ...picForm, phone: e.target.value })}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email (opsional)</label>
                    <input
                      value={picForm.email}
                      onChange={(e) => setPicForm({ ...picForm, email: e.target.value })}
                      placeholder="pic@domain.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Lokasi Fisik */}
                <div>
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
                    value={picForm.locationId}
                    onChange={(e) => setPicForm({ ...picForm, locationId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
                  >
                    <option value="">— Pilih Lokasi Kerja —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10 pb-6 sm:pb-4">
                <button
                  type="button"
                  onClick={() => setShowAddPicModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitQuickPic}
                  disabled={savingPic}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-1.5 disabled:opacity-60 transition"
                >
                  {savingPic ? <Loader2 className="animate-spin" size={13} /> : null}
                  <span>Simpan & Pilih PIC</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 13. QUICK ADD LOCATION MODAL ──────────────────────────────────────── */}
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

      {/* ── 14. LIGHTBOX PHOTO PREVIEW MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {previewPhotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setPreviewPhotoModal(null)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10">
                <ImageIcon size={14} className="text-indigo-400" />
                <span>Foto Dokumentasi Aset</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhotoModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition active:scale-95"
                  title="Buka Ukuran Penuh"
                >
                  <ExternalLink size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhotoModal(null)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition active:scale-95"
                  title="Tutup Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Image Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2"
            >
              <img
                src={previewPhotoModal}
                alt="Pratinjau Foto Aset"
                className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={openCreate} 
        className="fixed bottom-20 right-4 sm:hidden w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Tambah Aset Baru"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
