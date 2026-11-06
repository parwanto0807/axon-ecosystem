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
  ExternalLink, Sparkles, UserPlus, Image as ImageIcon, Maximize2, Building2,
  ShieldAlert, ShieldCheck, Clock, Shield, Tag, Phone
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ItOslAccessGuard } from "@/components/it-osl/ItOslAccessGuard"
import { ItOslNav } from "@/components/it-osl/ItOslNav"
import { canItOsl } from "@/lib/itOslPermissions"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"

// Batas ukuran file harus sama dengan batas di backend (backend/routes/it-osl.js).
const MAX_UPLOAD_MB = 25
const COMPRESS_MAX_DIMENSION = 1920

/**
 * Perkecil foto di browser sebelum diunggah agar hemat bandwidth dan stabil di jaringan seluler.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85))
    if (!blob || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto"
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
  } catch {
    return file
  }
}

type PicOpt = {
  id: string
  name: string
  position?: string | null
  department?: string | null
  phone?: string | null
  email?: string | null
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
  { v: "ACTIVE", l: "Aktif", dot: "bg-emerald-500", c: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  { v: "IN_REPAIR", l: "Perbaikan", dot: "bg-amber-500", c: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  { v: "RETIRED", l: "Afkir", dot: "bg-slate-400", c: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
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
  return (
    <ItOslAccessGuard>
      <ItOslAssetsContent />
    </ItOslAccessGuard>
  )
}

function ItOslAssetsContent() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || null
  const currentRole = (session?.user as { role?: string })?.role || null
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'
  const canWrite = canItOsl(currentRole, 'master.write')
  const canLocationWrite = canItOsl(currentRole, 'location.write')
  const canPicWrite = canItOsl(currentRole, 'pic.write')
  const canAssetWrite = canItOsl(currentRole, 'asset.write')

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
  const [printLayout, setPrintLayout] = useState<"single" | "grid">("single")

  // Modals & Detail
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState({
    customerId: "",
    name: "",
    assetCode: "",
    assetType: "",
    brandModel: "",
    serialNumber: "",
    locationId: "",
    status: "ACTIVE",
    picId: "",
    purchaseDate: "",
    warrantyUntil: "",
    notes: "",
    photos: [] as string[]
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  // Photo Lightbox Carousel State
  const [photoLightbox, setPhotoLightbox] = useState<{
    photos: string[]
    index: number
  } | null>(null)

  const openPhotoLightbox = (photos: string[], startIndex = 0) => {
    if (!photos || photos.length === 0) return
    const formatted = photos.map(url => (url.startsWith("http") ? url : `${API}${url}`))
    setPhotoLightbox({
      photos: formatted,
      index: Math.max(0, Math.min(startIndex, formatted.length - 1))
    })
  }

  const closePhotoLightbox = () => setPhotoLightbox(null)

  const nextPhoto = () => {
    if (!photoLightbox || photoLightbox.photos.length <= 1) return
    setPhotoLightbox(prev => prev ? {
      ...prev,
      index: (prev.index + 1) % prev.photos.length
    } : null)
  }

  const prevPhoto = () => {
    if (!photoLightbox || photoLightbox.photos.length <= 1) return
    setPhotoLightbox(prev => prev ? {
      ...prev,
      index: (prev.index - 1 + prev.photos.length) % prev.photos.length
    } : null)
  }

  // Keyboard navigation for Lightbox Carousel
  useEffect(() => {
    if (!photoLightbox) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePhotoLightbox()
      if (e.key === "ArrowRight") nextPhoto()
      if (e.key === "ArrowLeft") prevPhoto()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [photoLightbox])

  // Backward compatibility wrapper
  const setPreviewPhotoModal = (url: string | null) => {
    if (!url) closePhotoLightbox()
    else openPhotoLightbox([url], 0)
  }

  // Quick Add PIC Modal State
  const [showAddPicModal, setShowAddPicModal] = useState(false)
  const [picForm, setPicForm] = useState({
    name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: ""
  })
  const [savingPic, setSavingPic] = useState(false)

  // Quick Add Location Modal State
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationForm, setLocationForm] = useState({
    code: "", name: "", address: ""
  })
  const [savingLocation, setSavingLocation] = useState(false)

  // Detail Modal State
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [singlePrintAsset, setSinglePrintAsset] = useState<Asset | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<"specs" | "pic" | "tickets" | "media">("specs")

  // Add / Edit Wizard State
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1)

  // QR Scanner State
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [manualCodeInput, setManualCodeInput] = useState("")
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scanningActive, setScanningActive] = useState(false)

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const currentCount = form.photos.length
    if (currentCount >= 5) {
      alert("Maksimal 5 foto per aset.")
      return
    }

    const allowedToAdd = 5 - currentCount
    const filesToUpload = Array.from(files).slice(0, allowedToAdd)

    const oversize = filesToUpload.find(f => f.size > MAX_UPLOAD_MB * 1024 * 1024)
    if (oversize) {
      alert(`Foto "${oversize.name}" terlalu besar (${(oversize.size / 1024 / 1024).toFixed(1)} MB). Maksimal ${MAX_UPLOAD_MB} MB per foto.`)
      e.target.value = ""
      return
    }

    setUploadingPhotos(true)
    try {
      const prepared = await Promise.all(filesToUpload.map(compressImage))
      const fd = new FormData()
      prepared.forEach(f => fd.append("files", f))

      const res = await fetch(`${API}/api/it-osl/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd
      })

      const raw = await res.text()
      let d: { message?: string; urls?: string[]; url?: string } = {}
      try { d = raw ? JSON.parse(raw) : {} } catch { d = {} }

      if (!res.ok) {
        throw new Error(d.message || `Gagal mengunggah foto (HTTP ${res.status}). Silakan coba lagi.`)
      }

      const newUrls = d.urls || (d.url ? [d.url] : [])
      if (newUrls.length === 0) throw new Error("Server tidak mengembalikan URL foto.")

      setForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...newUrls].slice(0, 5)
      }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengunggah foto.")
    } finally {
      setUploadingPhotos(false)
      e.target.value = ""
    }
  }

  const removePhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const submitQuickPic = async () => {
    if (!canPicWrite) return alert("Role Anda tidak memiliki izin menambah PIC")
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal mendaftarkan PIC baru")

      setPics(prev => [d, ...prev])
      setForm(prev => ({ ...prev, picId: d.id }))
      setShowAddPicModal(false)
      setPicForm({ name: "", position: "", department: "", phone: "", email: "", locationId: "", notes: "" })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan saat menyimpan PIC")
    } finally {
      setSavingPic(false)
    }
  }

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
      setPicForm(prev => ({ ...prev, locationId: d.id }))
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
    setDetailTab("specs")
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
                } catch {
                  // frame error ignored
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
          setScannerError("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser.")
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

      if (filterCustomer && a.customerId !== filterCustomer && a.customer?.id !== filterCustomer) return false
      if (filterLocation && a.locationId !== filterLocation) return false
      if (filterType && a.assetType !== filterType) return false
      if (filterStatus && a.status !== filterStatus) return false

      if (filterPic) {
        if (filterPic === "UNASSIGNED") {
          if (a.picId || a.pic || a.picUserId) return false
        } else if (a.picId !== filterPic && a.pic?.id !== filterPic) {
          return false
        }
      }

      if (filterWarranty === "active") {
        if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() <= now) return false
      } else if (filterWarranty === "expired") {
        if (!a.warrantyUntil || new Date(a.warrantyUntil).getTime() > now) return false
      } else if (filterWarranty === "none") {
        if (a.warrantyUntil) return false
      }

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
      } else {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        res = dateA - dateB
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
    let c = 0
    if (q) c++
    if (filterCustomer) c++
    if (filterLocation) c++
    if (filterType) c++
    if (filterStatus) c++
    if (filterPic) c++
    if (filterWarranty) c++
    if (filterRecurringOnly) c++
    return c
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
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedAssets.map(a => a.id)
    const allSelected = pageIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach(id => next.delete(id))
      } else {
        pageIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleDeselectAll = () => setSelectedIds(new Set())

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
    if (!canAssetWrite) return alert("Role Anda tidak memiliki izin menambah aset")
    setEditing(null)
    setFormStep(1)
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
    if (!canAssetWrite) return alert("Role Anda tidak memiliki izin mengubah aset")
    setEditing(a)
    setFormStep(1)
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
    if (!canAssetWrite) return alert("Role Anda tidak memiliki izin menyimpan aset")
    if (!form.name.trim()) return alert("Nama perangkat wajib diisi")
    if (!form.locationId) return alert("Pilih lokasi penempatan aset")

    setSaving(true)
    try {
      const url = editing ? `${API}/api/it-osl/assets/${editing.id}` : `${API}/api/it-osl/assets`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    if (!canWrite) return alert("Hanya Admin/SuperAdmin yang dapat menghapus aset")
    if (!confirm(`Hapus data aset "${name}"? Riwayat perbaikan yang terhubung akan dipertahankan.`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/assets/${id}`, { method: "DELETE", headers: getAuthHeaders() })
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
  const getWhatsAppUrl = (phone?: string | null, assetName?: string) => {
    if (!phone) return null
    let clean = phone.replace(/[^0-9]/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    if (!clean.startsWith("62")) clean = "62" + clean
    const msg = assetName 
      ? `Halo PIC Unit, koordinasi perihal aset IT: ${assetName}...` 
      : "Halo PIC Unit, koordinasi perihal pemeliharaan aset IT Axon..."
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
  }

  // Export CSV Helper
  const exportCsv = (assetsToExport: Asset[]) => {
    const headers = ["Kode Aset", "Nama Perangkat", "Jenis", "Merek/Model", "Serial Number", "Customer", "Lokasi", "PIC", "Status", "Garansi", "Tiket", "Catatan"]
    const rows = assetsToExport.map(a => [
      a.assetCode,
      `"${a.name.replace(/"/g, '""')}"`,
      a.assetType || "-",
      `"${(a.brandModel || "-").replace(/"/g, '""')}"`,
      a.serialNumber || "-",
      `"${(a.customer?.name || "-").replace(/"/g, '""')}"`,
      `"${(a.location?.name || "-").replace(/"/g, '""')}"`,
      `"${(a.pic?.name || a.picUser?.name || "-").replace(/"/g, '""')}"`,
      a.status,
      a.warrantyUntil ? a.warrantyUntil.split("T")[0] : "-",
      a.ticketCount || 0,
      `"${(a.notes || "").replace(/"/g, '""')}"`
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Aset_IT_Axon_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Download template CSV
  const downloadCsvTemplate = () => {
    const headers = ["name", "assetCode", "assetType", "brandModel", "serialNumber", "notes"]
    const sample = ["Switch Cisco 24 Port Lantai 1", "AST-SW-001", "Switch", "Cisco SG350-28", "FOC21390A1", "IP: 192.168.1.2"]
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), sample.join(",")].join("\n")
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
    if (!canAssetWrite) return alert("Role Anda tidak memiliki izin mengimpor aset")
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 pb-28 md:pb-8 font-sans">
      
      {/* ── SUB-NAVIGATION TABS ──────────────────────────────────────────────── */}
      <ItOslNav badgeCounts={{ assets: allAssets.length }} />

      {/* ── 1. HEADER & GLOBAL ACTIONS ────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 text-white">
            <Package size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Registri Aset IT & Label QR
              </h1>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                {allAssets.length} Unit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Inventaris Perangkat Keras • Label Stiker QR • Monitoring Garansi & Insiden
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          {/* Scan QR Button */}
          <button
            onClick={() => setShowScannerModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
            title="Scan QR Code Aset"
          >
            <Camera size={15} />
            <span>Scan QR</span>
          </button>

          {/* Add Asset Button */}
          {canAssetWrite && (
            <button
              onClick={openCreate}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/25 transition"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Tambah Aset</span>
            </button>
          )}

          {/* Export / Import Dropdown on Desktop */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => exportCsv(filteredAssets)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-300 text-xs font-medium transition"
              title="Ekspor CSV Data Terfilter"
            >
              <Download size={15} />
            </button>

            {canAssetWrite && (
              <label 
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer transition" 
                title="Impor CSV"
              >
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
            )}

            <button
              onClick={downloadCsvTemplate}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition hidden sm:flex"
              title="Unduh Template CSV"
            >
              <FileSpreadsheet size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. KPI TELEMETRY METRIC TILES ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Assets */}
        <button
          onClick={clearAllFilters}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            activeFilterCount === 0 
              ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeFilterCount === 0 ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
              Total Aset
            </span>
            <Package size={14} className={activeFilterCount === 0 ? "text-slate-300" : "text-slate-400"} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.total}</p>
          <p className={`text-[11px] mt-0.5 truncate ${activeFilterCount === 0 ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
            Semua kategori
          </p>
        </button>

        {/* Active */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("ACTIVE"); }}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "ACTIVE" 
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400"}`}>
              Aktif / Normal
            </span>
            <div className={`w-2 h-2 rounded-full ${filterStatus === "ACTIVE" ? "bg-white" : "bg-emerald-500"}`} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.active}</p>
          <p className={`text-[11px] mt-0.5 truncate ${filterStatus === "ACTIVE" ? "text-emerald-100" : "text-slate-400"}`}>
            Siap operasional
          </p>
        </button>

        {/* In Repair */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("IN_REPAIR"); }}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "IN_REPAIR" 
              ? "bg-amber-500 text-white border-amber-500 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-amber-600 dark:text-amber-400"}`}>
              Perbaikan
            </span>
            <Wrench size={13} className={filterStatus === "IN_REPAIR" ? "text-white" : "text-amber-500"} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.inRepair}</p>
          <p className={`text-[11px] mt-0.5 truncate ${filterStatus === "IN_REPAIR" ? "text-amber-100" : "text-slate-400"}`}>
            Sedang diservis
          </p>
        </button>

        {/* Retired */}
        <button
          onClick={() => { clearAllFilters(); setFilterStatus("RETIRED"); }}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterStatus === "RETIRED" 
              ? "bg-slate-700 text-white border-slate-700 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-slate-400 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-500"}`}>
              Afkir / Rusak
            </span>
            <div className={`w-2 h-2 rounded-full ${filterStatus === "RETIRED" ? "bg-white" : "bg-slate-400"}`} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.retired}</p>
          <p className={`text-[11px] mt-0.5 truncate ${filterStatus === "RETIRED" ? "text-slate-300" : "text-slate-400"}`}>
            Non-operasional
          </p>
        </button>

        {/* Warranty */}
        <button
          onClick={() => { clearAllFilters(); setFilterWarranty("active"); }}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterWarranty === "active" 
              ? "bg-sky-600 text-white border-sky-600 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${filterWarranty === "active" ? "text-sky-100" : "text-sky-600 dark:text-sky-400"}`}>
              Garansi Aktif
            </span>
            <ShieldCheck size={14} className={filterWarranty === "active" ? "text-white" : "text-sky-500"} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.inWarranty}</p>
          <p className={`text-[11px] mt-0.5 truncate ${filterWarranty === "active" ? "text-sky-100" : "text-slate-400"}`}>
            Klaim pabrik
          </p>
        </button>

        {/* Recurring */}
        <button
          onClick={() => { clearAllFilters(); setFilterRecurringOnly(true); }}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
            filterRecurringOnly 
              ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-rose-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${filterRecurringOnly ? "text-rose-100" : "text-rose-600 dark:text-rose-400"}`}>
              <AlertTriangle size={11} /> Sering Rusak
            </span>
            <div className={`w-2 h-2 rounded-full ${filterRecurringOnly ? "bg-white" : "bg-rose-500 animate-pulse"}`} />
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{metrics.recurring}</p>
          <p className={`text-[11px] mt-0.5 truncate ${filterRecurringOnly ? "text-rose-100" : "text-slate-400"}`}>
            ≥3 tiket insiden
          </p>
        </button>
      </div>

      {/* ── 3. SMART SEARCH & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kode aset, nama perangkat, serial number, merek, lokasi, PIC..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
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
                className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-semibold bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 max-w-[190px]"
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
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Jenis</option>
              {ASSET_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 max-w-[170px]"
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
              className="lg:hidden flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Filter size={14} />
              <span>Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
            </button>

            {/* View Switcher (Desktop & Mobile) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === "table" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
                title="Tampilan Tabel"
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === "grid" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
                title="Tampilan Kartu"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-400 text-[10px] uppercase">Filter:</span>

            {q && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
                &quot;{q}&quot;
                <button onClick={() => setQ("")} className="hover:text-indigo-900"><X size={11} /></button>
              </span>
            )}
            {filterCustomer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 text-[11px] font-semibold">
                Customer: {customers.find(c => c.id === filterCustomer)?.name}
                <button onClick={() => setFilterCustomer("")}><X size={11} /></button>
              </span>
            )}
            {filterLocation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                {locations.find(l => l.id === filterLocation)?.name}
                <button onClick={() => setFilterLocation("")}><X size={11} /></button>
              </span>
            )}
            {filterType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                {filterType}
                <button onClick={() => setFilterType("")}><X size={11} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                Status: {STATUS_OPTS.find(s => s.v === filterStatus)?.l}
                <button onClick={() => setFilterStatus("")}><X size={11} /></button>
              </span>
            )}
            {filterPic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                PIC: {filterPic === "UNASSIGNED" ? "Tanpa PIC" : (pics.find(p => p.id === filterPic)?.name || filterPic)}
                <button onClick={() => setFilterPic("")}><X size={11} /></button>
              </span>
            )}
            {filterWarranty && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-medium">
                Garansi: {filterWarranty === "active" ? "Aktif" : filterWarranty === "expired" ? "Habis" : "Tanpa"}
                <button onClick={() => setFilterWarranty("")}><X size={11} /></button>
              </span>
            )}
            {filterRecurringOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-medium">
                Sering Rusak
                <button onClick={() => setFilterRecurringOnly(false)}><X size={11} /></button>
              </span>
            )}

            <button onClick={clearAllFilters} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1 text-[11px] flex items-center gap-1">
              <RotateCcw size={11} /> Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── 4. FLOATING BATCH ACTION DOCK ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 dark:border-slate-200 max-w-[90vw]"
          >
            <div className="flex items-center gap-2 border-r border-slate-700 dark:border-slate-300 pr-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="text-xs font-semibold hidden sm:inline">Aset Dipilih</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPrintLayout("grid"); setShowBatchPrint(true); }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
              >
                <Printer size={13} />
                <span>Cetak Label ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => exportCsv(selectedAssetsList)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button 
                onClick={handleDeselectAll} 
                className="p-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 text-slate-400 dark:text-slate-600 transition"
                title="Batalkan pilihan"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. DATA VIEW ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Memuat Registri Aset IT...</p>
        </div>
      ) : paginatedAssets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-500 space-y-3">
          <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">Tidak ada aset yang sesuai kriteria</h3>
          <p className="text-xs text-slate-400">Silakan ubah kata kunci pencarian atau sesuaikan filter Anda.</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold">
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ══════════ GRID VIEW ══════════ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {paginatedAssets.map((a) => {
            const isSelected = selectedIds.has(a.id)
            const statusObj = STATUS_OPTS.find(s => s.v === a.status) || STATUS_OPTS[0]
            const isWarrantyActive = a.warrantyUntil && new Date(a.warrantyUntil) > new Date()
            const picName = a.pic?.name || a.picUser?.name || null
            const picPhone = a.pic?.phone || null
            const waUrl = getWhatsAppUrl(picPhone, a.name)
            const assetPhotos = getAssetPhotos(a.photos)
            const mainPhoto = assetPhotos[0] ? (assetPhotos[0].startsWith("http") ? assetPhotos[0] : `${API}${assetPhotos[0]}`) : null

            return (
              <div
                key={a.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 space-y-3 transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-700 relative flex flex-col justify-between ${
                  isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div>
                  {/* Card Top Header: Checkbox + Asset Code + Status */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => handleToggleSelect(a.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
                        {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                      <button
                        onClick={() => setDetailId(a.id)}
                        className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 truncate bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                      >
                        {a.assetCode}
                      </button>
                      <button onClick={() => copyCode(a.assetCode)} className="text-slate-400 hover:text-slate-600 p-0.5" title="Salin kode">
                        {copiedCode === a.assetCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusObj.c}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                      {statusObj.l}
                    </span>
                  </div>

                  {/* Thumbnail & Identity */}
                  <div className="flex items-start gap-3 pt-2.5">
                    {mainPhoto ? (
                      <div 
                        onClick={() => openPhotoLightbox(assetPhotos, 0)}
                        className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer relative group"
                      >
                        <img src={mainPhoto} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                          <Maximize2 size={12} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/80 dark:border-slate-700">
                        <Package size={22} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 
                        onClick={() => setDetailId(a.id)}
                        className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:text-indigo-600 cursor-pointer"
                        title={a.name}
                      >
                        {a.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {a.brandModel || a.assetType || "Perangkat IT"}
                      </p>
                      {a.serialNumber && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          SN: {a.serialNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges & Meta */}
                  <div className="pt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{a.location?.name || "Belum ditentukan"}</span>
                      {a.customer?.name && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                          {a.customer.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate text-xs">{picName || "Tanpa PIC"}</span>
                      </div>
                      {picPhone && waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                          title="Chat WhatsApp PIC"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>

                    {(a.recurring || a.ticketCount >= 3) && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                          <AlertTriangle size={11} /> Sering Rusak ({a.ticketCount} Tiket)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailId(a.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => setSinglePrintAsset(a)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                      title="Cetak Label QR"
                    >
                      <QrCode size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {canAssetWrite && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        title="Edit Aset"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => deleteAsset(a.id, a.name)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition"
                        title="Hapus Aset"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ══════════ TABLE VIEW ══════════ */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-3 w-10 text-center">
                    <button onClick={handleSelectAllCurrentPage} className="text-slate-400 hover:text-slate-600">
                      {paginatedAssets.length > 0 && paginatedAssets.every(a => selectedIds.has(a.id)) ? (
                        <CheckSquare size={16} className="text-indigo-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      <span>Perangkat & Merek</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort("assetCode")}>
                    <div className="flex items-center gap-1">
                      <span>Kode & Serial Number</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3">Jenis</th>
                  <th className="p-3 cursor-pointer select-none" onClick={() => handleSort("location")}>
                    <div className="flex items-center gap-1">
                      <span>Lokasi & Customer</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3">PIC Unit</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center cursor-pointer select-none" onClick={() => handleSort("ticketCount")}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Tiket</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedAssets.map((a) => {
                  const isSelected = selectedIds.has(a.id)
                  const statusObj = STATUS_OPTS.find(s => s.v === a.status) || STATUS_OPTS[0]
                  const picName = a.pic?.name || a.picUser?.name || null
                  const picPhone = a.pic?.phone || null
                  const waUrl = getWhatsAppUrl(picPhone, a.name)
                  const assetPhotos = getAssetPhotos(a.photos)
                  const mainPhoto = assetPhotos[0] ? (assetPhotos[0].startsWith("http") ? assetPhotos[0] : `${API}${assetPhotos[0]}`) : null

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button onClick={() => handleToggleSelect(a.id)} className="text-slate-400 hover:text-slate-600">
                          {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                      </td>

                      {/* Name & Photo */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {mainPhoto ? (
                            <div 
                              onClick={() => openPhotoLightbox(assetPhotos, 0)}
                              className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 cursor-pointer relative group"
                            >
                              <img src={mainPhoto} alt={a.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <Package size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p 
                              onClick={() => setDetailId(a.id)}
                              className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm hover:text-indigo-600 cursor-pointer truncate max-w-[200px]"
                            >
                              {a.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {a.brandModel || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code & Serial */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={() => setDetailId(a.id)}
                            className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer hover:text-indigo-600"
                          >
                            {a.assetCode}
                          </span>
                          <button onClick={() => copyCode(a.assetCode)} className="text-slate-400 hover:text-slate-600 p-0.5" title="Salin kode">
                            {copiedCode === a.assetCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                        {a.serialNumber && (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[150px]">
                            SN: {a.serialNumber}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {a.assetType || "-"}
                        </span>
                      </td>

                      {/* Location & Customer */}
                      <td className="p-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                          {a.location?.name || "-"}
                        </p>
                        {a.customer?.name && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[150px]">
                            {a.customer.name}
                          </p>
                        )}
                      </td>

                      {/* PIC */}
                      <td className="p-3 whitespace-nowrap">
                        {picName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{picName}</span>
                            {picPhone && waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                title="Hubungi via WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Tanpa PIC</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusObj.c}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                          {statusObj.l}
                        </span>
                      </td>

                      {/* Tickets & Recurring */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {(a.recurring || a.ticketCount >= 3) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-800" title="Insiden berulang (>=3 tiket)">
                            <AlertTriangle size={11} /> {a.ticketCount} Tiket
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            {a.ticketCount || 0} Tiket
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailId(a.id)}
                            className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition"
                            title="Detail Aset"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setSinglePrintAsset(a)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="Cetak Label QR"
                          >
                            <QrCode size={13} />
                          </button>
                          {canAssetWrite && (
                            <button
                              onClick={() => openEdit(a)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              title="Edit Aset"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => deleteAsset(a.id, a.name)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-500 transition"
                              title="Hapus Aset"
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
          </div>
        </div>
      )}

      {/* ── 6. PAGINATION CONTROLS ───────────────────────────────────────────── */}
      {totalPages > 1 && (
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
            <span>Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} aset</span>
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

      {/* ── 7. CAMERA QR SCANNER MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showScannerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowScannerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Camera size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Scan Label QR Aset</h3>
                    <p className="text-[11px] text-slate-400">Arahkan kamera ke stiker label perangkat</p>
                  </div>
                </div>
                <button onClick={() => setShowScannerModal(false)} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {/* Camera Stream Box */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                
                {/* Visual Target Frame */}
                <div className="absolute inset-0 border-2 border-indigo-500/40 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-indigo-400 rounded-xl relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                  </div>
                </div>

                {scannerError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center gap-2 text-rose-400 text-xs">
                    <AlertTriangle size={24} />
                    <p>{scannerError}</p>
                  </div>
                )}
              </div>

              {/* Manual Input Fallback */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-slate-400 font-medium">Atau masukkan kode aset manual:</label>
                <div className="flex gap-2">
                  <input
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="Contoh: AST-2026-001"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualCodeInput.trim()) {
                        handleScannedCode(manualCodeInput)
                      }
                    }}
                  />
                  <button
                    onClick={() => manualCodeInput.trim() && handleScannedCode(manualCodeInput)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    Cari
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. MOBILE FILTER SHEET ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showMobileFilterSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden"
            onClick={() => setShowMobileFilterSheet(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Filter size={16} className="text-indigo-600" />
                  <span>Filter Registri Aset</span>
                </h3>
                <button onClick={() => setShowMobileFilterSheet(false)} className="p-1 rounded-full text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {customers.length > 0 && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer</label>
                    <select
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">Semua Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Lokasi</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Semua Lokasi</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jenis Perangkat</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Semua Jenis</option>
                    {ASSET_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Perangkat</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Semua Status</option>
                    {STATUS_OPTS.map(s => (
                      <option key={s.v} value={s.v}>{s.l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Garansi</label>
                  <select
                    value={filterWarranty}
                    onChange={(e) => setFilterWarranty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">Semua Status Garansi</option>
                    <option value="active">Garansi Masih Aktif</option>
                    <option value="expired">Garansi Sudah Habis</option>
                    <option value="none">Tanpa Garansi</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => { clearAllFilters(); setShowMobileFilterSheet(false); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-xs"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowMobileFilterSheet(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs"
                >
                  Terapkan ({activeFilterCount})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 9. ASSET DETAIL DRAWER / MODAL ───────────────────────────────────── */}
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
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800"
            >
              {loadingDetail || !detail ? (
                <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Memuat Spesifikasi & Riwayat Perangkat...</p>
                  <p className="text-[11px] text-slate-400">Sinkronisasi data aset dari server</p>
                </div>
              ) : (
                <>
                  {/* Executive Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                          <Package size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => copyCode(detail.assetCode)}
                              className="font-mono text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition"
                              title="Salin Kode Aset"
                            >
                              <span>{detail.assetCode}</span>
                              {copiedCode === detail.assetCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} className="text-slate-400" />}
                            </button>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              (STATUS_OPTS.find(s => s.v === detail.status) || STATUS_OPTS[0]).c
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${(STATUS_OPTS.find(s => s.v === detail.status) || STATUS_OPTS[0]).dot}`} />
                              {(STATUS_OPTS.find(s => s.v === detail.status) || STATUS_OPTS[0]).l}
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
                            {detail.name}
                          </h2>
                          <p className="text-xs text-slate-400 truncate">
                            {detail.brandModel || detail.assetType || "Hardware IT"} • {detail.location?.name || "Lokasi belum diatur"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/dashboard/maintenance/it-osl/tickets?assetId=${detail.id}&assetCode=${encodeURIComponent(detail.assetCode)}&assetName=${encodeURIComponent(detail.name)}`}
                          className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                          title="Buat Tiket Insiden untuk Perangkat ini"
                        >
                          <Plus size={14} />
                          <span className="hidden sm:inline">Buat Tiket</span>
                        </Link>
                        <button
                          onClick={() => setSinglePrintAsset(detail)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Cetak Label Stiker QR"
                        >
                          <Printer size={15} />
                        </button>
                        {canAssetWrite && (
                          <button
                            onClick={() => { openEdit(detail); setDetailId(null); }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            title="Edit Aset"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400">
                          <X size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Segmented Navigation Tabs */}
                    <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
                      <button
                        onClick={() => setDetailTab("specs")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          detailTab === "specs"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Tag size={13} />
                        <span>Spesifikasi</span>
                      </button>
                      <button
                        onClick={() => setDetailTab("pic")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          detailTab === "pic"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Users size={13} />
                        <span>PIC Unit</span>
                      </button>
                      <button
                        onClick={() => setDetailTab("tickets")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          detailTab === "tickets"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Wrench size={13} />
                        <span>Tiket ({detail.tickets?.length || 0})</span>
                      </button>
                      <button
                        onClick={() => setDetailTab("media")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          detailTab === "media"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <QrCode size={13} />
                        <span>Foto & Stiker</span>
                      </button>
                    </div>
                  </div>

                  {/* Body Content based on detailTab */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* TAB 1: SPESIFIKASI */}
                    {detailTab === "specs" && (
                      <div className="space-y-4">
                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Jenis Perangkat</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.assetType || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Merek / Model</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.brandModel || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Serial Number (SN)</p>
                            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.serialNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Lokasi Penempatan</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.location?.name || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Customer / Klien</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.customer?.name || "Internal Axon"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Tanggal Pengadaan</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                              {detail.purchaseDate ? new Date(detail.purchaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                            </p>
                          </div>
                        </div>

                        {/* Warranty Widget Card */}
                        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              detail.warrantyUntil && new Date(detail.warrantyUntil) > new Date()
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}>
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400">Status Garansi Resmi</p>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                {detail.warrantyUntil ? (
                                  new Date(detail.warrantyUntil) > new Date() ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                      Garansi Aktif s.d {new Date(detail.warrantyUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">
                                      Masa Garansi Berakhir ({new Date(detail.warrantyUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400">Tidak ada informasi garansi</span>
                                )}
                              </p>
                            </div>
                          </div>
                          {detail.warrantyUntil && new Date(detail.warrantyUntil) > new Date() && (
                            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg shrink-0">
                              Terproteksi
                            </span>
                          )}
                        </div>

                        {/* Notes Section */}
                        {detail.notes ? (
                          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Catatan Konfigurasi / Teknis</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{detail.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* TAB 2: PIC UNIT */}
                    {detailTab === "pic" && (
                      <div className="space-y-4">
                        {detail.pic || detail.picUser ? (
                          <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                                  {(detail.pic?.name || detail.picUser?.name || "U")[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase font-bold text-slate-400">Penanggung Jawab Perangkat</p>
                                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                    {detail.pic?.name || detail.picUser?.name}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {detail.pic?.position ? `${detail.pic.position} • ` : ""}{detail.pic?.department || "Unit Operasional"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Contact Badges */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-slate-400">Nomor Telepon / WA</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detail.pic?.phone || "-"}</p>
                                </div>
                                {detail.pic?.phone && (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={getWhatsAppUrl(detail.pic.phone, detail.name) || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 transition"
                                    >
                                      <MessageCircle size={12} />
                                      <span>WA</span>
                                    </a>
                                    <a
                                      href={`tel:${detail.pic.phone}`}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                                      title="Telepon Langsung"
                                    >
                                      <Phone size={12} />
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-slate-400">Alamat Email</p>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[170px]">{detail.pic?.email || detail.picUser?.email || "-"}</p>
                                </div>
                                {(detail.pic?.email || detail.picUser?.email) && (
                                  <a
                                    href={`mailto:${detail.pic?.email || detail.picUser?.email}`}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                                  >
                                    Email
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                              <Users size={22} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada PIC Terhubung</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Tautkan PIC penanggung jawab untuk kemudahan koordinasi insiden.</p>
                            </div>
                            {canAssetWrite && (
                              <button
                                onClick={() => { openEdit(detail); setDetailId(null); }}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                              >
                                <Edit2 size={12} />
                                <span>Hubungkan PIC Sekarang</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: RIWAYAT TIKET */}
                    {detailTab === "tickets" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Riwayat Insiden & Perbaikan ({detail.tickets?.length || 0})
                          </p>
                          <Link
                            href={`/dashboard/maintenance/it-osl/tickets?assetId=${detail.id}&assetCode=${encodeURIComponent(detail.assetCode)}&assetName=${encodeURIComponent(detail.name)}`}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>+ Buat Tiket Baru</span>
                          </Link>
                        </div>

                        {(!detail.tickets || detail.tickets.length === 0) ? (
                          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                            <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Perangkat Sehat & Bersih</p>
                            <p className="text-[11px] text-slate-400">Belum ada riwayat kendala atau tiket perbaikan yang tercatat.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                            {detail.tickets.map((t) => (
                              <Link
                                key={t.id}
                                href={`/dashboard/maintenance/it-osl/tickets`}
                                className="p-3.5 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 transition block"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                      {t.ticketNumber}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                                      {t.status}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
                                    {t.summary}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[11px] text-slate-400 block">
                                    {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5 mt-0.5">
                                    Detail <ChevronRight size={10} />
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: FOTO & LABEL QR */}
                    {detailTab === "media" && (
                      <div className="space-y-5">
                        {/* Photos Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto Fisik Perangkat</p>
                          {getAssetPhotos(detail.photos).length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                              {getAssetPhotos(detail.photos).map((url, idx) => {
                                const fullUrl = url.startsWith("http") ? url : `${API}${url}`
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => openPhotoLightbox(getAssetPhotos(detail.photos), idx)}
                                    className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer group relative shadow-xs"
                                  >
                                    <img src={fullUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                      <Maximize2 size={16} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                              Belum ada foto fisik yang diunggah.
                            </div>
                          )}
                        </div>

                        {/* Stiker QR Label Preview */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Preview Stiker Label Aset</p>
                            <button
                              onClick={() => setSinglePrintAsset(detail)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Printer size={13} />
                              <span>Cetak Stiker Label</span>
                            </button>
                          </div>

                          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-center">
                            <div className="w-[300px] p-3.5 bg-white text-slate-900 rounded-xl border-2 border-slate-900 shadow-md flex items-center gap-3">
                              <div className="w-20 h-20 bg-slate-100 rounded-lg p-1 border border-slate-300 flex items-center justify-center shrink-0">
                                <img
                                  src={`${API}/api/it-osl/assets/${detail.id}/qr`}
                                  alt="QR Code"
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Fallback to QR icon if endpoint error
                                    (e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black tracking-wider uppercase text-slate-400">AXON IT ASSET</p>
                                <p className="font-mono text-xs font-black text-slate-900 truncate mt-0.5">{detail.assetCode}</p>
                                <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">{detail.name}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">{detail.location?.name || "Unit Operasional"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 10. PRINT QR LABEL STICKER MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {(showBatchPrint || singlePrintAsset) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4"
            onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-3xl p-5 space-y-4 max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Printer size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Cetak Label Stiker QR Perangkat
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {singlePrintAsset
                        ? `1 label untuk ${singlePrintAsset.name} (${singlePrintAsset.assetCode})`
                        : `${selectedAssetsList.length} label stiker terpilih`}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {/* Printable Labels Area */}
              <div className="flex-1 overflow-y-auto p-2">
                <div 
                  id="printable-labels-area" 
                  className={`grid ${printLayout === "grid" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"} gap-3 p-1`}
                >
                  {(singlePrintAsset ? [singlePrintAsset] : selectedAssetsList).map(a => (
                    <div 
                      key={a.id} 
                      className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-white flex flex-col justify-between space-y-2 text-center break-inside-avoid shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[9px] font-bold">
                        <span className="tracking-widest text-slate-900 uppercase">AXON IT ASSET</span>
                        <span className="text-slate-500">{a.location?.name || "IT"}</span>
                      </div>

                      <div className="flex justify-center py-1">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(a.assetCode)}`}
                          alt={a.assetCode}
                          className="w-24 h-24 object-contain bg-white p-1 rounded-lg border border-slate-100"
                        />
                      </div>

                      <div>
                        <p className="font-mono text-xs font-bold text-indigo-700 bg-slate-50 py-0.5 rounded border border-slate-200">
                          {a.assetCode}
                        </p>
                        <p className="font-bold text-slate-900 text-xs mt-1 truncate">
                          {a.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {a.brandModel || a.assetType || "Hardware"} {a.serialNumber ? `• SN: ${a.serialNumber}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 hidden sm:block">
                  Tips: Sesuaikan ukuran kertas thermal atau stiker A4 pada dialog cetak browser.
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShowBatchPrint(false); setSinglePrintAsset(null); }} 
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => window.print()} 
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition"
                  >
                    <Printer size={15} /> Cetak Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 11. CREATE / EDIT ASSET MODAL (3-STEP WIZARD) ────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800"
            >
              {/* Form Header with 3-Step Wizard Navigation */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Package size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {editing ? "Perbarui Data Aset IT" : "Tambah Perangkat Aset Baru"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editing ? `Mengedit aset: ${editing.assetCode}` : "Pendaftaran inventaris unit hardware IT Axon"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                {/* Step Indicators */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className={`py-2 px-2.5 rounded-xl text-left border transition flex items-center gap-2 ${
                      formStep === 1
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : form.name.trim()
                        ? "bg-white dark:bg-slate-800 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      formStep === 1 ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      1
                    </span>
                    <span className="text-[11px] font-bold truncate">Identitas & Spek</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className={`py-2 px-2.5 rounded-xl text-left border transition flex items-center gap-2 ${
                      formStep === 2
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : form.locationId
                        ? "bg-white dark:bg-slate-800 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      formStep === 2 ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      2
                    </span>
                    <span className="text-[11px] font-bold truncate">Lokasi & PIC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className={`py-2 px-2.5 rounded-xl text-left border transition flex items-center gap-2 ${
                      formStep === 3
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      formStep === 3 ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      3
                    </span>
                    <span className="text-[11px] font-bold truncate">Status & Media</span>
                  </button>
                </div>
              </div>

              {/* Form Body - Step Conditional */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* STEP 1: IDENTITAS & SPESIFIKASI */}
                {formStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Tag size={13} className="text-indigo-600" />
                        <span>Informasi Pokok Perangkat</span>
                      </p>
                      <span className="text-[10px] text-slate-400">Langkah 1 dari 3</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Perangkat <span className="text-rose-500">*</span>
                        </label>
                        <input
                          autoFocus
                          value={form.name}
                          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Contoh: Switch Cisco Core Lt. 2, PC Kasir Utama, Printer Barcode"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jenis Perangkat</label>
                          <select
                            value={form.assetType}
                            onChange={(e) => setForm(f => ({ ...f, assetType: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">— Pilih Jenis Perangkat —</option>
                            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Kode Aset <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                          </label>
                          <div className="relative">
                            <input
                              value={form.assetCode}
                              onChange={(e) => setForm(f => ({ ...f, assetCode: e.target.value }))}
                              placeholder="Auto-generate sistem jika kosong"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
                            />
                            {!form.assetCode && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md pointer-events-none">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Merek & Model</label>
                          <input
                            value={form.brandModel}
                            onChange={(e) => setForm(f => ({ ...f, brandModel: e.target.value }))}
                            placeholder="Contoh: Cisco SG350-28, HP ProDesk 400 G6"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Serial Number (SN)</label>
                          <input
                            value={form.serialNumber}
                            onChange={(e) => setForm(f => ({ ...f, serialNumber: e.target.value }))}
                            placeholder="Contoh: FOC21390A1, S/N: 4CE0460XXX"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PENEMPATAN & PIC */}
                {formStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <MapPin size={13} className="text-indigo-600" />
                        <span>Penempatan & Penanggung Jawab</span>
                      </p>
                      <span className="text-[10px] text-slate-400">Langkah 2 dari 3</span>
                    </div>

                    <div className="space-y-3">
                      {customers.length > 0 && (
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer / Klien</label>
                          <select
                            value={form.customerId}
                            onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Internal Axon / Tanpa Klien Tertentu</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            Lokasi / Ruangan Penempatan <span className="text-rose-500">*</span>
                          </label>
                          {canLocationWrite && (
                            <button
                              type="button"
                              onClick={() => setShowAddLocationModal(true)}
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Plus size={11} /> Buat Lokasi Baru
                            </button>
                          )}
                        </div>
                        <select
                          value={form.locationId}
                          onChange={(e) => setForm(f => ({ ...f, locationId: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                        >
                          <option value="">— Pilih Lokasi Penempatan —</option>
                          {locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">PIC Penanggung Jawab Unit</label>
                          {canPicWrite && (
                            <button
                              type="button"
                              onClick={() => setShowAddPicModal(true)}
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <UserPlus size={11} /> Tambah PIC Baru
                            </button>
                          )}
                        </div>
                        <select
                          value={form.picId}
                          onChange={(e) => setForm(f => ({ ...f, picId: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">— Tanpa PIC Khusus —</option>
                          {pics.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.department ? `(${p.department})` : ""} {p.phone ? `• ${p.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected PIC Preview Card */}
                      {form.picId && (() => {
                        const selPic = pics.find(p => p.id === form.picId)
                        if (!selPic) return null
                        return (
                          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {selPic.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{selPic.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {selPic.position ? `${selPic.position} • ` : ""}{selPic.department || "-"} • {selPic.phone || "Tanpa telp"}
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* STEP 3: STATUS, GARANSI & DOKUMENTASI */}
                {formStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Shield size={13} className="text-indigo-600" />
                        <span>Status Operasional & Dokumentasi</span>
                      </p>
                      <span className="text-[10px] text-slate-400">Langkah 3 dari 3</span>
                    </div>

                    {/* Status Segmented Cards */}
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Status Operasional Unit</label>
                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_OPTS.map((s) => {
                          const isSel = form.status === s.v
                          return (
                            <button
                              key={s.v}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, status: s.v }))}
                              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                                isSel
                                  ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-xs"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                              <span className={`font-bold text-xs ${isSel ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                                {s.l}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Warranty Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Pembelian</label>
                        <input
                          type="date"
                          value={form.purchaseDate}
                          onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Garansi Sampai Dengan</label>
                        <input
                          type="date"
                          value={form.warrantyUntil}
                          onChange={(e) => setForm(f => ({ ...f, warrantyUntil: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Photos Upload */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Dokumentasi Foto Perangkat</label>
                        <span className="text-[10px] text-slate-400">{form.photos.length}/5 foto</span>
                      </div>

                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <label className="px-3.5 py-2 rounded-xl border border-dashed border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-indigo-100/50 transition">
                          <Upload size={14} />
                          <span>{uploadingPhotos ? "Mengunggah..." : "+ Unggah Foto"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingPhotos || form.photos.length >= 5}
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      </div>

                      {form.photos.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {form.photos.map((url, idx) => {
                            const fullUrl = url.startsWith("http") ? url : `${API}${url}`
                            return (
                              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group cursor-pointer" onClick={() => openPhotoLightbox(form.photos, idx)}>
                                <img src={fullUrl} alt="Thumbnail" className="w-full h-full object-cover hover:scale-105 transition" />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(idx)}
                                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-rose-600 transition"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Catatan Tambahan & Konfigurasi</label>
                      <textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="IP Address, port, konfigurasi khusus, atau keterangan kondisi..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormStep(s => (s - 1) as 1 | 2 | 3)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
                    >
                      ← Sebelumnya
                    </button>
                  )}

                  {formStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (formStep === 1 && !form.name.trim()) {
                          return alert("Nama perangkat wajib diisi sebelum lanjut")
                        }
                        setFormStep(s => (s + 1) as 1 | 2 | 3)
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>Lanjut</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={submitForm}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/25 transition disabled:opacity-50"
                    >
                      {saving && <Loader2 size={14} className="animate-spin" />}
                      <span>{editing ? "Perbarui Aset" : "Simpan Aset"}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 12. QUICK ADD PIC MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddPicModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowAddPicModal(false)}
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
                  <UserPlus size={16} className="text-indigo-600" />
                  <span>Daftarkan PIC Baru Cepat</span>
                </h3>
                <button onClick={() => setShowAddPicModal(false)} className="p-1 rounded-full text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Nama PIC <span className="text-rose-500">*</span></label>
                  <input
                    value={picForm.name}
                    onChange={(e) => setPicForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nama Lengkap Penanggung Jawab"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Jabatan</label>
                    <input
                      value={picForm.position}
                      onChange={(e) => setPicForm(f => ({ ...f, position: e.target.value }))}
                      placeholder="Contoh: Staff Kasir"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Departemen</label>
                    <input
                      value={picForm.department}
                      onChange={(e) => setPicForm(f => ({ ...f, department: e.target.value }))}
                      placeholder="Contoh: Operasional"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">No. WhatsApp / Telepon</label>
                  <input
                    value={picForm.phone}
                    onChange={(e) => setPicForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button onClick={() => setShowAddPicModal(false)} className="px-3 py-2 rounded-xl border text-xs font-semibold">
                  Batal
                </button>
                <button
                  disabled={savingPic}
                  onClick={submitQuickPic}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingPic ? "Menyimpan..." : "Simpan & Pilih"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 13. QUICK ADD LOCATION MODAL ────────────────────────────────────── */}
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
                    placeholder="Contoh: Server Room Lt. 2, Ruang Kasir A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Kode Lokasi (Singkatan)</label>
                  <input
                    value={locationForm.code}
                    onChange={(e) => setLocationForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="Contoh: SR-L2, KASIR-A (auto-generate jika kosong)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Alamat / Keterangan</label>
                  <input
                    value={locationForm.address}
                    onChange={(e) => setLocationForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Contoh: Gedung Timur, Area Bebas Akses"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
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

      {/* ── 14. PHOTO LIGHTBOX & CAROUSEL MODAL (ZERO FLICKER) ──────────────── */}
      <AnimatePresence>
        {photoLightbox && photoLightbox.photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[200] bg-black/85 flex flex-col items-center justify-between p-3 sm:p-6 select-none"
            onClick={closePhotoLightbox}
          >
            {/* Top Toolbar */}
            <div 
              className="w-full max-w-4xl flex items-center justify-between text-white shrink-0 py-2 px-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  Foto {photoLightbox.index + 1} dari {photoLightbox.photos.length}
                </span>
                {photoLightbox.photos.length > 1 && (
                  <span className="text-[11px] text-white/60 hidden sm:inline">
                    (Gunakan tombol panah ← → untuk navigasi)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={photoLightbox.photos[photoLightbox.index]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-semibold flex items-center gap-1.5"
                  title="Buka Foto Asli Tab Baru"
                >
                  <ExternalLink size={15} />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={closePhotoLightbox}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 hover:text-rose-400 text-white transition"
                  title="Tutup (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Stage (Image + Prev/Next Buttons) */}
            <div 
              className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-auto min-h-0 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prev Button (Only show if multiple photos) */}
              {photoLightbox.photos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition active:scale-95"
                  title="Foto Sebelumnya (Panah Kiri)"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Main Image with smooth transition */}
              <div className="relative max-w-full max-h-[75vh] sm:max-h-[80vh] flex items-center justify-center">
                <img
                  key={photoLightbox.photos[photoLightbox.index]}
                  src={photoLightbox.photos[photoLightbox.index]}
                  alt={`Foto ${photoLightbox.index + 1}`}
                  className="max-w-full max-h-[75vh] sm:max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                />
              </div>

              {/* Next Button (Only show if multiple photos) */}
              {photoLightbox.photos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition active:scale-95"
                  title="Foto Berikutnya (Panah Kanan)"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {/* Bottom Thumbnails Strip (Only if multiple photos) */}
            {photoLightbox.photos.length > 1 && (
              <div 
                className="w-full max-w-xl flex items-center justify-center gap-2 py-2 px-3 bg-black/50 rounded-2xl border border-white/10 shrink-0 overflow-x-auto z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {photoLightbox.photos.map((p, pIdx) => {
                  const isActive = pIdx === photoLightbox.index
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setPhotoLightbox(prev => prev ? { ...prev, index: pIdx } : null)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition active:scale-95 ${
                        isActive
                          ? "border-indigo-500 ring-2 ring-indigo-500/50 scale-105"
                          : "border-white/20 opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={p} alt={`Thumbnail ${pIdx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
