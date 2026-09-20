"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { 
  Building2, Users, MapPin, Package, Wrench, Search, Plus, 
  Edit2, Trash2, Eye, X, Loader2, CheckCircle2, AlertTriangle, 
  Calendar, Phone, Mail, FileText, Check, Shield, UserCheck, 
  ExternalLink, Sparkles, Filter, ChevronRight, Briefcase, Lock
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type AssignedUserItem = {
  id: string
  userId: string
  customerId: string
  user: {
    id: string
    name: string | null
    email: string | null
    role: string
  }
}

type Customer = {
  id: string
  code: string
  name: string
  type?: string | null
  companyType?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  logo?: string | null
  contractStart?: string | null
  contractEnd?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  assignedUsers?: AssignedUserItem[]
  locations?: { id: string; name: string; code: string }[]
  pics?: { id: string; name: string; position?: string; phone?: string }[]
  assets?: { id: string; assetCode: string; name: string; status: string }[]
  _count?: {
    assets: number
    tickets: number
    pics: number
    locations: number
  }
}

type UserOpt = {
  id: string
  name: string | null
  email: string | null
  role: string
  department?: string | null
}

const COMPANY_TYPES = [
  "Retail / Toko", "Rumah Sakit / Klinik", "Kantor / Korporat", 
  "Pabrik / Manufaktur", "Hotel / Hospitality", "Pendidikan / Sekolah", "Lainnya"
]

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const userRole = (session?.user as { role?: string })?.role || ""
  const isSuperAdmin = userRole === "SUPER_ADMIN"

  const [customers, setCustomers] = useState<Customer[]>([])
  const [operasionalUsers, setOperasionalUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterContract, setFilterContract] = useState("") // "active" | "expiring" | "expired"

  // Modal Form State
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({
    code: "",
    name: "",
    companyType: "",
    phone: "",
    email: "",
    address: "",
    logo: "",
    contractStart: "",
    contractEnd: "",
    notes: "",
    isActive: true,
    assignedUserIds: [] as string[]
  })
  const [saving, setSaving] = useState(false)

  // Detail Modal State
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Customer | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // User search inside modal
  const [userSearch, setUserSearch] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [cRes, uRes] = await Promise.all([
        fetch(`${API}/api/it-osl/customers`),
        fetch(`${API}/api/it-osl/users-operasional`),
      ])
      if (cRes.ok) {
        const d = await cRes.json()
        setCustomers(Array.isArray(d) ? d : [])
      }
      if (uRes.ok) {
        const u = await uRes.json()
        setOperasionalUsers(Array.isArray(u) ? u : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`${API}/api/it-osl/customers/${id}`)
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

  // Form CRUD Handlers
  const openCreate = () => {
    setEditing(null)
    setForm({
      code: "",
      name: "",
      companyType: "",
      phone: "",
      email: "",
      address: "",
      logo: "",
      contractStart: "",
      contractEnd: "",
      notes: "",
      isActive: true,
      assignedUserIds: []
    })
    setUserSearch("")
    setShowForm(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      code: c.code,
      name: c.name,
      companyType: c.companyType || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      logo: c.logo || "",
      contractStart: c.contractStart ? c.contractStart.split("T")[0] : "",
      contractEnd: c.contractEnd ? c.contractEnd.split("T")[0] : "",
      notes: c.notes || "",
      isActive: c.isActive,
      assignedUserIds: c.assignedUsers ? c.assignedUsers.map(u => u.userId) : []
    })
    setUserSearch("")
    setShowForm(true)
  }

  const toggleUserAssignment = (userId: string) => {
    setForm(prev => {
      const exists = prev.assignedUserIds.includes(userId)
      if (exists) {
        return { ...prev, assignedUserIds: prev.assignedUserIds.filter(id => id !== userId) }
      } else {
        return { ...prev, assignedUserIds: [...prev.assignedUserIds, userId] }
      }
    })
  }

  const submitForm = async () => {
    if (!form.name.trim()) return alert("Nama customer wajib diisi")

    setSaving(true)
    try {
      const url = editing ? `${API}/api/it-osl/customers/${editing.id}` : `${API}/api/it-osl/customers`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          companyType: form.companyType || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          logo: form.logo.trim() || null,
          contractStart: form.contractStart || null,
          contractEnd: form.contractEnd || null,
          notes: form.notes.trim() || null,
          isActive: form.isActive,
          assignedUserIds: form.assignedUserIds
        })
      })

      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menyimpan customer")

      setShowForm(false)
      loadData()
      if (detailId && editing?.id === detailId) loadDetail(detailId)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSaving(false)
    }
  }

  const deleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Hapus customer "${name}"?`)) return
    try {
      const res = await fetch(`${API}/api/it-osl/customers/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message || "Gagal menghapus customer")
      loadData()
      if (detailId === id) setDetailId(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan")
    }
  }

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date().getTime()
    const thirtyDays = 30 * 24 * 3600 * 1000

    let total = customers.length
    let active = 0
    let expiringSoon = 0
    let totalAssets = 0
    let totalTickets = 0

    customers.forEach(c => {
      if (c.isActive) active++
      if (c._count?.assets) totalAssets += c._count.assets
      if (c._count?.tickets) totalTickets += c._count.tickets

      if (c.contractEnd) {
        const diff = new Date(c.contractEnd).getTime() - now
        if (diff > 0 && diff <= thirtyDays) {
          expiringSoon++
        }
      }
    })

    return { total, active, expiringSoon, totalAssets, totalTickets }
  }, [customers])

  // Filtered List
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date().getTime()
    const thirtyDays = 30 * 24 * 3600 * 1000

    return customers.filter(c => {
      if (q) {
        const matchName = c.name.toLowerCase().includes(q)
        const matchCode = c.code.toLowerCase().includes(q)
        const matchPhone = (c.phone || "").toLowerCase().includes(q)
        const matchEmail = (c.email || "").toLowerCase().includes(q)
        const matchType = (c.companyType || "").toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchPhone && !matchEmail && !matchType) return false
      }

      if (filterType && c.companyType !== filterType) return false

      if (filterContract === "active") {
        if (!c.contractEnd || new Date(c.contractEnd).getTime() < now) return false
      } else if (filterContract === "expiring") {
        if (!c.contractEnd) return false
        const diff = new Date(c.contractEnd).getTime() - now
        if (diff <= 0 || diff > thirtyDays) return false
      } else if (filterContract === "expired") {
        if (!c.contractEnd || new Date(c.contractEnd).getTime() >= now) return false
      }

      return true
    })
  }, [customers, search, filterType, filterContract])

  const filteredModalUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return operasionalUsers
    return operasionalUsers.filter(u => 
      (u.name || "").toLowerCase().includes(q) || 
      (u.email || "").toLowerCase().includes(q) || 
      (u.role || "").toLowerCase().includes(q)
    )
  }, [operasionalUsers, userSearch])

  if (status !== "loading" && session && !isSuperAdmin) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Terbatas</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Halaman Data Customer B2B & Penugasan Teknisi ini hanya dapat diakses oleh role <strong>SUPER ADMIN</strong>. 
          Anda dapat mengakses tiket, aset, dan PIC dari customer yang telah ditugaskan kepada Anda.
        </p>
        <div className="pt-2">
          <a
            href="/dashboard/maintenance/it-osl"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25"
          >
            Kembali ke Dashboard IT-OSL
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* ── 1. HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Master Customer B2B & Penugasan Teknisi
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                B2B Only · Super Admin
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Kelola daftar perusahaan klien B2B, masa kontrak SLA, dan penugasan teknisi operasional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard/management/customers"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Briefcase size={14} className="text-slate-500" />
            <span>Master Management Customer</span>
            <ExternalLink size={12} className="text-slate-400" />
          </a>

          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Customer B2B Baru</span>
          </button>
        </div>
      </header>

      {/* ── 2. METRICS STRIP ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Total Customer</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{metrics.active} status aktif</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Total Aset Terdaftar</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{metrics.totalAssets}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Perangkat seluruh klien</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Total Tiket Masuk</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{metrics.totalTickets}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Layanan incident & PM</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-sm">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Kontrak Berakhir &lt;30 Hari</p>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${metrics.expiringSoon > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {metrics.expiringSoon}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Perlu perpanjangan SLA</p>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTERS ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama customer, kode, nomor kontak, jenis..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-bold focus:outline-none"
          >
            <option value="">Semua Kategori</option>
            {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-bold focus:outline-none"
          >
            <option value="">Semua Masa Kontrak</option>
            <option value="active">Kontrak Aktif</option>
            <option value="expiring">Mendekati Habis (&lt;30 Hari)</option>
            <option value="expired">Kontrak Habis</option>
          </select>
        </div>
      </div>

      {/* ── 4. CUSTOMER CARDS GRID ───────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-slate-600">Memuat data customer...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-2">
          <Building2 size={36} className="mx-auto text-slate-300" />
          <h3 className="font-black text-slate-800 text-sm">Tidak ada customer ditemukan</h3>
          <p className="text-xs text-slate-400">Silakan tambahkan customer baru atau ubah kata kunci filter pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCustomers.map(c => {
            const isContractActive = c.contractEnd && new Date(c.contractEnd).getTime() > new Date().getTime()
            const isContractExpired = c.contractEnd && new Date(c.contractEnd).getTime() <= new Date().getTime()
            const assignedCount = c.assignedUsers?.length || 0

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-3.5 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                {/* Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {c.code.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black bg-slate-900 text-white px-2 py-0.2 rounded">
                            {c.code}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                            c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                          }`}>
                            {c.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <h2 className="font-black text-sm sm:text-base text-slate-900 truncate mt-0.5 hover:text-indigo-600 cursor-pointer" onClick={() => setDetailId(c.id)}>
                          {c.name}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {c.companyType && (
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Briefcase size={12} className="text-slate-400" /> {c.companyType}
                    </p>
                  )}

                  {c.address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400 shrink-0" /> {c.address}
                    </p>
                  )}

                  {/* Summary Badges: Assets, Tickets, PIC */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Aset</p>
                      <p className="font-black text-xs text-slate-800">{c._count?.assets || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Tiket</p>
                      <p className="font-black text-xs text-slate-800">{c._count?.tickets || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">PIC</p>
                      <p className="font-black text-xs text-slate-800">{c._count?.pics || 0}</p>
                    </div>
                  </div>

                  {/* Assigned Operational Technicians */}
                  <div className="p-2.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                      <Shield size={11} /> Teknisi Bertugas ({assignedCount})
                    </p>
                    {assignedCount > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.assignedUsers?.slice(0, 3).map(u => (
                          <span key={u.id} className="text-[10px] font-bold bg-white text-slate-800 px-2 py-0.5 rounded-lg border border-indigo-200/60 flex items-center gap-1">
                            <UserCheck size={10} className="text-indigo-600" />
                            {u.user?.name || u.user?.email || "Teknisi"}
                          </span>
                        ))}
                        {assignedCount > 3 && (
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-lg">
                            +{assignedCount - 3} lagi
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Belum ditugaskan ke teknisi manapun.</p>
                    )}
                  </div>
                </div>

                {/* Card Action Strip */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => setDetailId(c.id)}
                    className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                  >
                    <Eye size={13} /> Detail
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
                    title="Edit Data Customer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCustomer(c.id, c.name)}
                    className="p-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 active:scale-95 transition"
                    title="Hapus Customer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 5. FORM MODAL (TAMBAH / EDIT CUSTOMER & PENUGASAN TEKNISI) ──────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden pb-safe border border-slate-100"
            >
              {/* Sticky Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      {editing ? "Edit Profil Customer" : "Pendaftaran Customer Baru"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Lengkapi data perusahaan dan tentukan teknisi operasional yang bertugas.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400">
                  <X size={17} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* Basic Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Nama Customer / Perusahaan *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Contoh: PT Sumber Makmur, RS Bunda Kasih..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kode Customer</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="CUST-01 / RS-BK"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kategori / Sektor</label>
                    <select
                      value={form.companyType}
                      onChange={(e) => setForm({ ...form, companyType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none"
                    >
                      <option value="">Pilih Kategori</option>
                      {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Telepon / Hotline</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="021-xxxxxxx / 0812xxxx"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Resmi</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alamat Kantor / Lokasi Pusat</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Alamat lengkap gedung, jalan, kota..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[50px] focus:outline-none"
                  />
                </div>

                {/* Contract Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mulai Kontrak SLA</label>
                    <input
                      type="date"
                      value={form.contractStart}
                      onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Berakhir Kontrak SLA</label>
                    <input
                      type="date"
                      value={form.contractEnd}
                      onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* ── PENUGASAN TEKNISI OPERASIONAL (RBAC MULTI-ASSIGNMENT) ── */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-indigo-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <Shield size={15} className="text-indigo-600" />
                        Penugasan Teknisi Operasional (Multi-Assignment)
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Centang nama teknisi yang diberi hak akses menangani customer ini.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                      {form.assignedUserIds.length} Terpilih
                    </span>
                  </div>

                  {/* Filter User Search */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Cari nama staff / teknisi..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-indigo-200 text-xs bg-white focus:outline-none"
                    />
                  </div>

                  {/* Users Checklist */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 bg-white p-2 rounded-xl border border-indigo-100">
                    {filteredModalUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2 italic">Tidak ada user ditemukan.</p>
                    ) : (
                      filteredModalUsers.map(u => {
                        const isAssigned = form.assignedUserIds.includes(u.id)
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleUserAssignment(u.id)}
                            className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                              isAssigned ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isAssigned ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                              }`}>
                                {u.name ? u.name.slice(0, 1).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs truncate">{u.name || "Tanpa Nama"}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email || u.role}</p>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                              isAssigned ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                            }`}>
                              {isAssigned && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan / SOP Khusus Klien</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="SOP akses ruang server, kontak darurat, dsb..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[50px] focus:outline-none"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-1.5 disabled:opacity-60 transition"
                >
                  {saving && <Loader2 className="animate-spin" size={13} />}
                  <span>{editing ? "Simpan Perubahan" : "Daftarkan Customer"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. DETAIL DRAWER / MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {detailId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setDetailId(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-safe border border-slate-100"
            >
              {loadingDetail ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-bold text-slate-700">Memuat rincian customer...</p>
                </div>
              ) : detail ? (
                <>
                  {/* Header */}
                  <div className="p-4 sm:p-5 border-b bg-slate-50 flex items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded">
                          {detail.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          detail.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}>
                          {detail.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
                        {detail.name}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {detail.companyType || "Perusahaan"} • {detail.phone || "-"} • {detail.email || "-"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { setDetailId(null); openEdit(detail); }}
                        className="p-2 rounded-xl border bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                    {/* Assigned Technicians */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                        <Shield size={13} /> Teknisi Operasional yang Ditugaskan
                      </p>
                      {detail.assignedUsers && detail.assignedUsers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detail.assignedUsers.map(au => (
                            <div key={au.id} className="p-2.5 rounded-xl bg-white border border-indigo-100/80 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                {au.user?.name ? au.user.name.slice(0, 1).toUpperCase() : "T"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{au.user?.name || "Teknisi"}</p>
                                <p className="text-[10px] text-slate-400 truncate">{au.user?.email || au.user?.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada teknisi yang di-assign untuk customer ini.</p>
                      )}
                    </div>

                    {/* PIC Contacts */}
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Users size={13} /> Daftar PIC Klien ({detail.pics?.length || 0})
                      </h3>
                      {detail.pics && detail.pics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detail.pics.map(p => (
                            <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-500">{p.position || "Staff"} • {p.phone || "-"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">Belum ada PIC terdaftar.</p>
                      )}
                    </div>

                    {/* Locations */}
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <MapPin size={13} /> Lokasi Cabang & Ruangan ({detail.locations?.length || 0})
                      </h3>
                      {detail.locations && detail.locations.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {detail.locations.map(l => (
                            <div key={l.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="font-mono text-[9px] font-bold bg-slate-200 px-1.5 py-0.2 rounded text-slate-700">{l.code}</span>
                              <p className="font-bold text-slate-900 truncate mt-1">{l.name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">Belum ada lokasi cabang terdaftar.</p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3.5 sm:p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
                    <button
                      onClick={() => deleteCustomer(detail.id, detail.name)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                    <button
                      onClick={() => { setDetailId(null); openEdit(detail); }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5"
                    >
                      <Edit2 size={13} /> Edit Customer
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
