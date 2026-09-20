"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, AlertTriangle, CheckCircle2, Clock3, Layers, TrendingUp, Wrench, Search, MapPin } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type Dashboard = {
  total: number
  active: number
  pendingOver: number
  avgMttrMin: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  breachCritical: number
  breachList: { id: string; ticketNumber: string; summary: string }[]
  recent: { id: string; ticketNumber: string; summary: string; severity: string; status: string; location: { name: string } | null; category: { name: string } | null }[]
  slaCompliance: number
}

export default function ItOslDashboardPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || ""
  const currentRole = (session?.user as { role?: string })?.role || ""
  const currentEmail = session?.user?.email || ""

  const getAuthHeaders = (): Record<string, string> => ({
    "x-user-id": currentUserId,
    "x-user-role": currentRole,
    "x-user-email": currentEmail,
  })

  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/it-osl/dashboard`, { headers: getAuthHeaders() })
        if (res.ok) setData(await res.json())
      } catch {}
      setLoading(false)
    }
    if (session !== undefined) {
      load()
    }
  }, [session?.user?.email, currentUserId, currentRole])

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Memuat dashboard…</div>
  if (!data) return <div className="p-8 text-center text-rose-500">Gagal memuat</div>

  const cards = [
    { label: "Tiket Hari Ini", value: data.total, sub: `${data.active} aktif`, icon: Layers, color: "bg-indigo-600" },
    { label: "Sedang Dikerjakan", value: data.byStatus["IN_PROGRESS"] || 0, sub: "In Progress", icon: Activity, color: "bg-sky-600" },
    { label: "Tertahan", value: data.pendingOver, sub: "Pending", icon: Clock3, color: "bg-amber-500" },
    { label: "Rata-rata MTTR", value: `${data.avgMttrMin}m`, sub: "tanpa waiting", icon: TrendingUp, color: "bg-emerald-600" },
    { label: "Melewati SLA", value: data.breachCritical, sub: `${data.slaCompliance}% patuh`, icon: AlertTriangle, color: data.breachCritical ? "bg-rose-600" : "bg-slate-700" },
  ]

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><Wrench size={18} className="text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">IT-OSL Dashboard</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2">Worklog Internal IT, Manajemen Insiden & Ticketing Engine — PRD v2</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <Link href="/dashboard/maintenance/it-osl/tickets" className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest text-center">Buka Tiket</Link>
          <Link href="/dashboard/maintenance/it-osl/reports" className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border bg-white text-xs font-bold text-center">Laporan</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((c) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${c.color} flex items-center justify-center`}><c.icon size={14} className="text-white" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">{c.label}</p>
            <p className="text-xl font-black">{c.value}</p>
            <p className="text-[11px] text-slate-400">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Kanban Ringkas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["NEW","IN_PROGRESS","PENDING","RESOLVED"].map((s) => (
              <div key={s} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.replace("_"," ")}</p>
                <p className="text-2xl font-black mt-1">{data.byStatus[s] || 0}</p>
                <p className="text-[11px] text-slate-400">{s==="NEW"?"Antre":s==="IN_PROGRESS"?"Dikerjakan":s==="PENDING"?"Tertahan":"Selesai verif"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            Tip: gunakan <b>Quick-Log</b> ≤20 detik dari tombol + di halaman Tiket. Mencatat harus lebih cepat daripada menjelaskan.
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Live Activity Feed</h3>
          <div className="space-y-2">
            {data.recent.length === 0 && <p className="text-xs text-slate-400">Belum ada aktivitas</p>}
            {data.recent.map((r) => (
              <div key={r.id} className="flex gap-2 p-2 rounded-xl hover:bg-slate-50">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${r.severity==="CRITICAL"?"bg-rose-500":r.severity==="LOW"?"bg-emerald-500":"bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{r.ticketNumber} — {r.summary}</p>
                  <p className="text-[11px] text-slate-400">{r.status} • {r.location?.name || "-"} • {r.category?.name || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Distribusi Severity</h3>
          <div className="space-y-2">
            {Object.entries(data.bySeverity).length === 0 && <p className="text-xs text-slate-400">Belum ada data</p>}
            {Object.entries(data.bySeverity).map(([k,v])=> (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${k==="CRITICAL"?"bg-rose-100 text-rose-600":k==="LOW"?"bg-emerald-100 text-emerald-600":"bg-amber-100 text-amber-600"}`}>{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Papan Perhatian</h3>
          {data.breachCritical ? (
            <div className="space-y-2">
              {data.breachList.map((b)=>(
                <div key={b.id} className="p-2 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-500" />
                  <span className="text-xs font-bold">{b.ticketNumber}</span>
                  <span className="text-xs truncate">{b.summary}</span>
                </div>
              ))}
              <p className="text-[11px] text-rose-600">Critical melewati SLA {'>'}15 menit tanpa respon — segera eskalasi ke Lead.</p>
            </div>
          ) : (
            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Tidak ada breach Critical.</p>
          )}
          <div className="mt-3 flex gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><MapPin size={12}/> Heatmap lokasi: lihat di Tiket filter lokasi</span>
            <span className="flex items-center gap-1"><Search size={12}/> Pencarian: Ctrl+K → ketik “tiket”</span>
          </div>
        </div>
      </div>
    </div>
  )
}
