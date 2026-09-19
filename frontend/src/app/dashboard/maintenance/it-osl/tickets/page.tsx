"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Clock3, AlertTriangle, Wrench, History, X, Loader2, ImagePlus, Trash2, Check, Package, User, MessageSquare, Phone, Users } from "lucide-react"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type PicOpt = {
  id: string
  name: string
  position: string | null
  department: string | null
  phone: string | null
  email: string | null
  locationId: string | null
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

type Location = { id: string; code: string; name: string }
type Category = { id: string; name: string; groupName: string }
type AssetOpt = { id: string; assetCode: string; name: string; location?: { name:string }|null; picUser?: { name:string|null }|null }
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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<AssetOpt[]>([])
  const [pics, setPics] = useState<PicOpt[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("")
  const [severity, setSeverity] = useState<string>("")
  const [picFilter, setPicFilter] = useState<string>("")
  const [showQuick, setShowQuick] = useState(false)
  const [quick, setQuick] = useState({ summary: "", locationId: "", categoryId: "", severity: "MEDIUM" as string, ticketType: "INCIDENT" as string, assetId: "", picId: "", assignedTo: "", reporterName: "", reportChannel: "" })
  const [saving, setSaving] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activePhase, setActivePhase] = useState<"ANALISA"|"PENGERJAAN"|"HASIL">("ANALISA")
  const [newDesc, setNewDesc] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newFiles, setNewFiles] = useState<FileList | null>(null)
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [assetQuery, setAssetQuery] = useState("")
  const [showAssetPicker, setShowAssetPicker] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, lRes, cRes, aRes, pRes, uRes] = await Promise.all([
        fetch(`${API}/api/it-osl/tickets?${new URLSearchParams({ ...(q ? { search: q } : {}), ...(status ? { status } : {}), ...(severity ? { severity } : {}), ...(picFilter ? { picId: picFilter } : {}) }).toString()}`),
        fetch(`${API}/api/it-osl/locations`),
        fetch(`${API}/api/it-osl/categories`),
        fetch(`${API}/api/it-osl/assets`),
        fetch(`${API}/api/it-osl/pics`),
        fetch(`${API}/api/users`, { headers: { "x-user-role":"SUPER_ADMIN" } }).then(r=> r.ok? r.json().then((j: unknown)=> Array.isArray(j)? j : (j as { users?: UserOpt[] })?.users || []): []).catch(()=>[]),
      ])
      if (tRes.ok) setTickets(await tRes.json())
      if (lRes.ok) setLocations(await lRes.json())
      if (cRes.ok) setCategories(await cRes.json())
      if (aRes.ok) setAssets(await aRes.json())
      if (pRes.ok) setPics(await pRes.json())
      if (Array.isArray(uRes) && uRes.length) setUsers(uRes as UserOpt[])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [q, status, severity, picFilter])
  
  // prefill reporter & assignee from session
  useEffect(()=>{
    if(showQuick && currentUserName && !quick.reporterName) setQuick(q=> ({...q, reporterName: currentUserName || "", assignedTo: currentUserId || q.assignedTo }))
  },[showQuick, currentUserName, currentUserId])

  const loadDetail = async (id:string) => {
    setLoadingDetail(true)
    try{
      const res = await fetch(`${API}/api/it-osl/tickets/${id}`)
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
    const q = assetQuery.trim().toLowerCase()
    if(!q) return assets.slice(0,20)
    return assets.filter(a=> `${a.assetCode} ${a.name} ${a.location?.name||""}`.toLowerCase().includes(q)).slice(0,20)
  },[assets, assetQuery])

  const quickAsset = useMemo(()=> assets.find(a=> a.id===quick.assetId) || null,[assets, quick.assetId])

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
        severity: quick.severity,
        ticketType: quick.ticketType,
        reportChannel: quick.reportChannel || "Tatap Muka",
        reporterName: quick.reporterName || undefined,
        assetId: quick.assetId || undefined,
        assignedTo: quick.assignedTo || undefined,
        createdBy: currentUserId || undefined,
      }
      const res = await fetch(`${API}/api/it-osl/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": currentUserId || "system" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Gagal")
      if (data.duplicateHint) alert(`Duplikat terdeteksi: ${data.duplicateHint.ticketNumber} (lokasi+kategori sama 2 jam terakhir)`)
      setShowQuick(false)
      setQuick({ summary: "", locationId: "", categoryId: "", severity: "MEDIUM", ticketType: "INCIDENT", assetId:"", picId:"", assignedTo:"", reporterName:"", reportChannel:"" })
      setAssetQuery("")
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal"
      alert(msg)
    } finally { setSaving(false) }
  }

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
    const res = await fetch(`${API}/api/it-osl/tickets/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-user-role": "SUPER_ADMIN", "x-user-id": currentUserId || "" }, body: JSON.stringify(body) })
    const d = await res.json()
    if (!res.ok) alert(d.message)
    else { load(); if(detailId===id) loadDetail(id) }
  }

  const connectAsset = async (ticketId:string, assetId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ assetId: assetId || null, actorUserId: currentUserId }) })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }
  const reassign = async (ticketId:string, userId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}/reassign`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ toUserId: userId || null, actorUserId: currentUserId }) })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }

  const connectPic = async (ticketId:string, picId:string) => {
    const res = await fetch(`${API}/api/it-osl/tickets/${ticketId}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ picId: picId || null, actorUserId: currentUserId }) })
    const d = await res.json()
    if(!res.ok) alert(d.message)
    else { load(); if(detailId===ticketId) loadDetail(ticketId) }
  }

  const addWorkItem = async () => {
    if(!detailId) return
    if(!newDesc.trim() || newDesc.trim().length<5) return alert("Uraian item minimal 5 karakter — jelaskan pekerjaan yang dilakukan")
    setAdding(true)
    try{
      const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ phase: activePhase, title: newTitle || null, description: newDesc, createdBy: currentUserId || undefined })
      })
      const item = await res.json()
      if(!res.ok) throw new Error(item.message)
      // upload photos if any
      if(newFiles && newFiles.length>0){
        const fd = new FormData()
        Array.from(newFiles).forEach(f=> fd.append("photos", f))
        const up = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${item.id}/photos`, { method:"POST", body: fd })
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
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}`, { method:"DELETE", headers:{ "x-user-role": currentRole || "", "x-user-id": currentUserId || "" } })
    const d = await res.json()
    if(!res.ok) return alert(d.message || "Gagal hapus — hanya Admin")
    if(detailId) loadDetail(detailId)
  }

  const delAttachment = async (wid:string, aid:string)=>{
    if(!isAdmin) return alert("Hanya Admin/SuperAdmin boleh hapus foto")
    if(!detailId || !confirm("Hapus foto ini?")) return
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}/attachments/${aid}`, { method:"DELETE", headers:{ "x-user-role": currentRole || "", "x-user-id": currentUserId || "" } })
    const d = await res.json()
    if(!res.ok) return alert(d.message || "Gagal hapus — hanya Admin")
    if(detailId) loadDetail(detailId)
  }

  const attachMore = async (wid:string, files: FileList | null)=>{
    if(!files || files.length===0 || !detailId) return
    const fd = new FormData()
    Array.from(files).forEach(f=> fd.append("photos", f))
    const res = await fetch(`${API}/api/it-osl/tickets/${detailId}/work-items/${wid}/photos`, { method:"POST", body: fd })
    if(!res.ok){ const d=await res.json(); alert(d.message) } else loadDetail(detailId)
  }

  const tabs: { id: string; label: string }[] = [
    { id: "", label: "Semua" },
    { id: "NEW", label: "NEW" },
    { id: "IN_PROGRESS", label: "Aktif" },
    { id: "PENDING", label: "Tertahan" },
    { id: "RESOLVED", label: "Selesai" },
  ]

  const phaseCounts = useMemo(()=>{
    if(!detail) return { ANALISA:0, PENGERJAAN:0, HASIL:0 }
    const c = { ANALISA:0, PENGERJAAN:0, HASIL:0 } as Record<string,number>
    detail.workItems?.forEach(w=>{ if(c[w.phase]!==undefined) c[w.phase]++ })
    return c
  },[detail])

  return (
    <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 sm:py-6 space-y-3.5 sm:space-y-4 pb-28 md:pb-6 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
            <Wrench size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-black text-slate-900 truncate tracking-tight">Tiket & Quick-Log</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">Target ≤20 detik • scan QR isi lokasi+aset</p>
          </div>
        </div>
        <button 
          onClick={() => setShowQuick(true)} 
          className="px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/25 transition"
        >
          <Plus size={15} strokeWidth={2.5} /> 
          <span>Quick-Log</span>
        </button>
      </header>

      {/* Filter & Search Toolbar - 100% Mobile Friendly */}
      <div className="w-full bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
        {/* Search */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={q} 
            onChange={(e)=>setQ(e.target.value)} 
            placeholder="Cari uraian / nomor tiket…" 
            className="w-full pl-10 pr-9 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
          />
          {q && (
            <button 
              onClick={()=>setQ("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          {/* Status Tabs with horizontal scrolling */}
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-max">
              {tabs.map((t)=>(
                <button 
                  key={t.id} 
                  onClick={()=>setStatus(t.id)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    status===t.id ? "bg-white shadow-sm text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity, PIC + Reload */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select 
              value={picFilter} 
              onChange={(e)=>setPicFilter(e.target.value)} 
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Semua PIC Unit</option>
              {pics.map(p=> <option key={p.id} value={p.id}>{p.name} {p.department ? `(${p.department})` : ''}</option>)}
            </select>

            <select 
              value={severity} 
              onChange={(e)=>setSeverity(e.target.value)} 
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Semua severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            
            <button 
              onClick={load} 
              title="Muat ulang" 
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 active:scale-95 transition shrink-0 flex items-center justify-center"
            >
              <History size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="animate-spin text-indigo-600" size={24}/> 
          <span className="font-medium">Memuat tiket…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
          {tickets.map((t)=> (
            <motion.div 
              key={t.id} 
              initial={{opacity:0, y:6}} 
              animate={{opacity:1, y:0}} 
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between w-full"
            >
              <div className="w-full">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wider shrink-0">{t.ticketNumber}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                    t.severity==="CRITICAL" ? "bg-rose-100 text-rose-700 font-extrabold" : 
                    t.severity==="LOW" ? "bg-emerald-100 text-emerald-700" : 
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {t.severity}
                  </span>
                </div>

                {/* Summary */}
                <h2 className="font-black text-slate-900 text-base mt-2 line-clamp-2 leading-snug break-words">{t.summary}</h2>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {t.location?.name || "-"} • {t.category?.groupName} › {t.category?.name} • {t.ticketType}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                  {/* PIC Badge */}
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
                          title={`Chat WhatsApp ${t.pic.name}`}
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

                  {/* Technician Assignee */}
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-700">
                    <Wrench size={11} className="text-slate-400 shrink-0"/>
                    <span className="truncate max-w-[120px] font-medium">{t.assignedUser?.name || t.assignedUser?.email || <span className="text-slate-400">Tanpa Teknisi</span>}</span>
                  </span>

                  {/* Asset Badge */}
                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-700 font-mono text-[10px]">
                    <Package size={11} className="text-slate-400 shrink-0"/>
                    <span className="truncate max-w-[110px] font-bold">{t.asset ? t.asset.assetCode : <span className="text-slate-400 font-sans font-normal">Tanpa aset</span>}</span>
                  </span>
                </div>

                {/* Status & Timing */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      t.status==="NEW" ? "bg-slate-100 text-slate-700" : 
                      t.status==="IN_PROGRESS" ? "bg-sky-100 text-sky-700 font-black" : 
                      t.status==="PENDING" ? "bg-amber-100 text-amber-700 font-black" : 
                      t.status==="RESOLVED" ? "bg-indigo-100 text-indigo-700 font-black" : 
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                      {t.status}
                    </span>
                    {t.slaStatus==="BREACH" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center gap-0.5">
                        <AlertTriangle size={9}/> BREACH
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 flex items-center gap-1 font-medium text-[10px]">
                    <Clock3 size={11} className="text-slate-400"/>
                    {t.frtMinutes!=null ? `${t.frtMinutes}m FRT` : `${Math.round((Date.now()-new Date(t.createdAt).getTime())/60000)}m`}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Clean 2-Row / Grid Layout */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 w-full flex flex-col gap-2">
                {t.status==="NEW" && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                      onClick={()=>changeStatus(t.id,"IN_PROGRESS")} 
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm text-center"
                    >
                      Kerjakan
                    </button>
                    <button 
                      onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                      disabled={loadingDetail && detailId===t.id} 
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                    >
                      {loadingDetail && detailId===t.id ? <Loader2 size={13} className="animate-spin text-indigo-600"/> : "Detail"}
                    </button>
                  </div>
                )}
                
                {t.status==="IN_PROGRESS" && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button 
                        onClick={()=>changeStatus(t.id,"PENDING")} 
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm text-center"
                      >
                        Tunda
                      </button>
                      <button 
                        onClick={()=>changeStatus(t.id,"RESOLVED")} 
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm text-center"
                      >
                        Selesai
                      </button>
                    </div>
                    <button 
                      onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                      disabled={loadingDetail && detailId===t.id} 
                      className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                    >
                      {loadingDetail && detailId===t.id ? <Loader2 size={13} className="animate-spin text-indigo-600"/> : "Detail"}
                    </button>
                  </div>
                )}
                
                {t.status==="PENDING" && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                      onClick={()=>changeStatus(t.id,"IN_PROGRESS")} 
                      className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm text-center"
                    >
                      Lanjutkan
                    </button>
                    <button 
                      onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                      disabled={loadingDetail && detailId===t.id} 
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                    >
                      {loadingDetail && detailId===t.id ? <Loader2 size={13} className="animate-spin text-indigo-600"/> : "Detail"}
                    </button>
                  </div>
                )}
                
                {t.status==="RESOLVED" && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                      onClick={()=>changeStatus(t.id,"CLOSED")} 
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm text-center"
                    >
                      Tutup
                    </button>
                    <button 
                      onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                      disabled={loadingDetail && detailId===t.id} 
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                    >
                      {loadingDetail && detailId===t.id ? <Loader2 size={13} className="animate-spin text-indigo-600"/> : "Detail"}
                    </button>
                  </div>
                )}

                {t.status==="CLOSED" && (
                  <button 
                    onClick={()=> { setDetail(null); setDetailId(t.id); }} 
                    disabled={loadingDetail && detailId===t.id} 
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                  >
                    {loadingDetail && detailId===t.id ? <Loader2 size={13} className="animate-spin text-indigo-600"/> : "Detail Tiket"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {tickets.length===0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              Belum ada tiket yang cocok. Tekan tombol <b className="text-indigo-600">Quick-Log</b> untuk membuat tiket baru.
            </div>
          )}
        </div>
      )}

      {/* Quick-Log Bottom-Sheet / Modal */}
      <AnimatePresence>
        {showQuick && (
          <motion.div 
            initial={{opacity:0}} 
            animate={{opacity:1}} 
            exit={{opacity:0}} 
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" 
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
                      {locations.map((l)=>(<option key={l.id} value={l.id}>{l.name}</option>))}
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
                      const selPic = pics.find(p=> p.id === pId);
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
                    {pics.map(p=> (
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

      {/* Detail Slide Drawer */}
      <AnimatePresence>
        {(detailId) && (
          <motion.div 
            initial={{opacity:0}} 
            animate={{opacity:1}} 
            exit={{opacity:0}} 
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-end" 
            onClick={()=>{setDetailId(null); setDetail(null)}}
          >
            <motion.div 
              initial={{x:"100%"}} 
              animate={{x:0}} 
              exit={{x:"100%"}} 
              transition={{type:"spring", damping:28, stiffness:300}}
              onClick={(e)=>e.stopPropagation()} 
              className="bg-white w-full sm:max-w-[620px] lg:max-w-[720px] h-[100dvh] flex flex-col shadow-2xl"
            >
              {loadingDetail && !detail ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <Loader2 size={36} className="animate-spin text-indigo-600"/>
                  <p className="text-sm font-bold text-slate-700">Memuat detail tiket…</p>
                  <p className="text-xs text-slate-400">Mohon tunggu sebentar</p>
                </div>
              ) : detail ? (
                <>
                {/* Drawer Header */}
                <div className="p-4 sm:p-5 border-b shrink-0 bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">{detail.ticketNumber}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          detail.severity==="CRITICAL"?"bg-rose-100 text-rose-600":detail.severity==="LOW"?"bg-emerald-100 text-emerald-600":"bg-amber-100 text-amber-600"
                        }`}>
                          {detail.severity}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          detail.status==="NEW"?"bg-slate-200 text-slate-800":detail.status==="IN_PROGRESS"?"bg-sky-100 text-sky-700":detail.status==="PENDING"?"bg-amber-100 text-amber-700":detail.status==="RESOLVED"?"bg-indigo-100 text-indigo-700":"bg-emerald-100 text-emerald-700"
                        }`}>
                          {detail.status}
                        </span>
                        {detail.slaStatus==="BREACH" && <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">BREACH</span>}
                      </div>
                      <h3 className="font-black text-slate-900 text-sm sm:text-base mt-2 break-words">{detail.summary}</h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 break-words">
                        {detail.location?.name} • {detail.category?.groupName} › {detail.category?.name} • {detail.ticketType} 
                        {detail.asset?.name ? ` • ${detail.asset.name} (${detail.asset.assetCode})`: ""}
                      </p>
                    </div>
                    <button 
                      onClick={()=>{setDetailId(null); setDetail(null)}} 
                      className="p-2 rounded-xl hover:bg-slate-200 active:scale-95 shrink-0 border border-slate-200 bg-white text-slate-600"
                    >
                      <X size={18}/>
                    </button>
                  </div>

                  {/* Summary Metas */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 text-[11px]">
                    <div className="bg-white rounded-xl p-2 border border-slate-100"><p className="text-slate-400 font-bold uppercase text-[9px]">Dibuat</p><p className="font-bold truncate text-slate-800">{new Date(detail.createdAt).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' })}</p></div>
                    <div className="bg-white rounded-xl p-2 border border-slate-100"><p className="text-slate-400 font-bold uppercase text-[9px]">Direspon</p><p className="font-bold truncate text-slate-800">{detail.acknowledgedAt? `${detail.frtMinutes}m` : "-"}</p></div>
                    <div className="bg-white rounded-xl p-2 border border-slate-100"><p className="text-slate-400 font-bold uppercase text-[9px]">Pelapor</p><p className="font-bold truncate text-slate-800">{detail.reporterName || "-"}</p></div>
                  </div>

                  {/* Asset, PIC & Technician Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    {/* PIC Unit Card */}
                    <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                          <span className="flex items-center gap-1"><Users size={11} className="text-indigo-600"/> PIC Unit (Klien)</span>
                          {detail.pic?.phone && (
                            <a 
                              href={`https://wa.me/${detail.pic.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 text-[10px]"
                              title="Chat WhatsApp"
                            >
                              <MessageSquare size={11} /> WA
                            </a>
                          )}
                        </p>
                        <div className="mt-1 space-y-1">
                          {detail.pic ? (
                            <div className="text-xs">
                              <p className="font-bold text-slate-800 truncate">{detail.pic.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{detail.pic.department || "-"} • {detail.pic.phone || "-"}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">Belum ditautkan PIC</p>
                          )}
                        </div>
                      </div>
                      <select 
                        value={detail.pic?.id || detail.picId || ""} 
                        onChange={(e)=> connectPic(detail.id, e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">— Ganti/Set PIC —</option>
                        {pics.map(p=> <option key={p.id} value={p.id}>{p.name} {p.department ? `(${p.department})` : ''}</option>)}
                      </select>
                    </div>

                    {/* Asset Card */}
                    <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1"><Package size={11} className="text-indigo-600"/> Aset Terhubung</p>
                        <div className="mt-1 space-y-1">
                          {detail.asset ? (
                            <div className="flex items-center justify-between text-xs bg-slate-50 p-1 rounded-lg border">
                              <span className="font-bold text-slate-800 truncate">{detail.asset.name} <span className="font-mono text-[10px] text-slate-400 font-normal">({detail.asset.assetCode})</span></span>
                              <button onClick={()=>connectAsset(detail.id,"")} className="text-[9px] px-1.5 py-0.5 rounded border text-rose-600 hover:bg-rose-50 font-medium shrink-0 ml-1">Lepas</button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">Tanpa aset</p>
                          )}
                        </div>
                      </div>
                      <select 
                        value={detail.asset?.id || detail.assetId || ""} 
                        onChange={(e)=> connectAsset(detail.id, e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">— Hubungkan aset —</option>
                        {assets.map(a=> <option key={a.id} value={a.id}>{a.name} ({a.assetCode})</option>)}
                      </select>
                    </div>
                    
                    {/* Technician Assignee */}
                    <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1"><Wrench size={11} className="text-indigo-600"/> Teknisi IT</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-slate-800 truncate font-semibold">{detail.assignedUser?.name || detail.assignedUser?.email || <span className="text-slate-400 font-normal">— belum ditugaskan</span>}</p>
                        </div>
                      </div>
                      <select 
                        value={detail.assignedTo || ""} 
                        onChange={(e)=> reassign(detail.id, e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg border text-xs bg-white mt-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">— Alihkan Teknisi —</option>
                        {users.map(u=> <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Status Action Buttons in Drawer */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {detail.status==="NEW" && <button onClick={()=>changeStatus(detail.id,"IN_PROGRESS")} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95 transition">Kerjakan</button>}
                    {detail.status==="IN_PROGRESS" && (
                      <>
                        <button onClick={()=>changeStatus(detail.id,"PENDING")} className="px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold active:scale-95 transition">Tunda</button>
                        <button onClick={()=>changeStatus(detail.id,"RESOLVED")} className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold active:scale-95 transition">Selesai</button>
                      </>
                    )}
                    {detail.status==="PENDING" && <button onClick={()=>changeStatus(detail.id,"IN_PROGRESS")} className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold active:scale-95 transition">Lanjutkan</button>}
                    {detail.status==="RESOLVED" && <button onClick={()=>changeStatus(detail.id,"CLOSED")} className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold active:scale-95 transition">Tutup</button>}
                  </div>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto">
                  {/* Phase Tabs */}
                  <div className="sticky top-0 z-10 bg-white border-b flex gap-1.5 p-2 sm:p-2.5 shadow-sm">
                    {PHASES.map(p=>{
                      const cnt = phaseCounts[p.id]
                      const isActive = activePhase===p.id
                      return (
                        <button 
                          key={p.id} 
                          onClick={()=>setActivePhase(p.id as typeof activePhase)} 
                          className={`flex-1 py-2 sm:py-2 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                            isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <span className="flex items-center gap-1">
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

                  <div className="p-3.5 sm:p-5 space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                      {activePhase==="ANALISA" && "Analisa: cek gejala, log, ukur, foto kondisi awal. Minimal 5 karakter tiap item, bisa lampirkan banyak foto."}
                      {activePhase==="PENGERJAAN" && "Pengerjaan: langkah eksekusi — bongkar, ganti, crimping, konfigurasi. Foto tiap langkah."}
                      {activePhase==="HASIL" && "Hasil: verifikasi normal, uji operasional, foto after, serah terima."}
                    </div>

                    {/* Work Items Feed */}
                    <div className="space-y-3">
                      {(detail.workItems||[]).filter(w=> w.phase===activePhase).length===0 && (
                        <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          Belum ada item {activePhase} — tambah di bawah
                        </div>
                      )}
                      {(detail.workItems||[]).filter(w=> w.phase===activePhase).map(w=>(
                        <div key={w.id} className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {w.title && <p className="font-black text-slate-900 text-sm truncate">{w.title}</p>}
                              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5 leading-relaxed">{w.description}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(w.createdAt).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' })} 
                                {w.creator?.name ? ` • ${w.creator.name}` : ""} • {w.status}
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

                          {w.attachments.length>0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                              {w.attachments.map(a=>(
                                <div key={a.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${a.url}`} alt={a.fileName||"foto"} className="w-full h-24 object-cover"/>
                                  {isAdmin && (
                                    <button onClick={()=>delAttachment(w.id, a.id)} className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-600" title="Hapus foto">
                                      <X size={12}/>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100">
                            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
                              <ImagePlus size={13}/> Tambah foto ke item ini
                            </label>
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={(e)=> { if(e.target.files) attachMore(w.id, e.target.files); e.target.value="" }} 
                              className="mt-1 block w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white file:font-bold hover:file:bg-indigo-700"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Work Item Form */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Tambah Item {activePhase}</h4>
                      <input 
                        value={newTitle} 
                        onChange={(e)=>setNewTitle(e.target.value)} 
                        placeholder="Judul singkat opsional — cth: Cek kabel LAN" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                      <textarea 
                        value={newDesc} 
                        onChange={(e)=>setNewDesc(e.target.value)} 
                        placeholder={activePhase==="ANALISA"? "Analisa: gejala, dugaan penyebab, pengukuran…" : activePhase==="PENGERJAAN"? "Pengerjaan: langkah yang dilakukan, alat dipakai…" : "Hasil: verifikasi, uji, status akhir…"} 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[80px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Foto (&gt;1 boleh)</label>
                        <input 
                          ref={fileRef} 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          onChange={(e)=> setNewFiles(e.target.files)} 
                          className="block w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-bold"
                        />
                        {newFiles && <p className="text-[10px] text-slate-500 mt-1">{newFiles.length} foto dipilih</p>}
                      </div>
                      <button 
                        onClick={addWorkItem} 
                        disabled={adding} 
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition disabled:opacity-60"
                      >
                        {adding ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>} 
                        Simpan Item {activePhase}
                      </button>
                    </div>

                    {(detail.rootCause || detail.correctiveAction) && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs text-slate-700">
                        <h4 className="font-black uppercase tracking-wider text-slate-900">Ringkasan Penyelesaian</h4>
                        {detail.rootCause && <p><b>Akar Masalah:</b> {detail.rootCause}</p>}
                        {detail.correctiveAction && <p><b>Tindakan:</b> {detail.correctiveAction}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 border-t bg-slate-50 text-[10px] text-slate-500 text-center">
                  Audit: status change & work-item tercatat otomatis
                </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-[11px] text-slate-400 px-1">
        Offline: draft Quick-Log tersimpan lokal bila sinyal hilang — sinkron saat online kembali.
      </div>

      {/* Mobile Floating Action Button (FAB) - Elevated above bottom nav */}
      <button 
        onClick={()=>setShowQuick(true)} 
        className="fixed bottom-24 right-4 sm:hidden w-13 h-13 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Quick-Log Tiket Baru"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  )
}
