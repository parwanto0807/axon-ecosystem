"use client"

import { useEffect, useState } from "react"
import { CalendarCheck, Plus, CheckCircle2, AlertTriangle, X, Loader2, Settings2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"

const API = process.env.NEXT_PUBLIC_API_URL

type Schedule = { id: string; title: string; frequency: string; isActive: boolean; checkItems: { id: string; name: string }[]; _count?: { executions: number } }

export default function ItOslPmPage() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string })?.id || ""
  const currentRole = (session?.user as { role?: string })?.role || ""
  const currentEmail = session?.user?.email || ""

  const getAuthHeaders = (): Record<string, string> => ({
    "x-user-id": currentUserId,
    "x-user-role": currentRole,
    "x-user-email": currentEmail,
  })

  const [list, setList] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: "", frequency: "WEEKLY", itemsText: "" })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exec, setExec] = useState<{ id: string; items: Record<string, string>; notes: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`${API}/api/it-osl/pm/schedules`, { headers: getAuthHeaders() })
    if (res.ok) setList(await res.json())
    setLoading(false)
  }
  useEffect(() => {
    if (session !== undefined) {
      load()
    }
  }, [session?.user?.email, currentUserId, currentRole])

  const create = async () => {
    if (!form.title) return alert("Judul wajib diisi")
    const items = form.itemsText.split("\n").map((s)=>s.trim()).filter(Boolean).map((name)=>({ name }))
    setSaving(true)
    const res = await fetch(`${API}/api/it-osl/pm/schedules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, frequency: form.frequency, checkItems: items }) })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) return alert(d.message)
    setForm({ title: "", frequency: "WEEKLY", itemsText: "" })
    setShowCreateModal(false)
    load()
  }

  const execute = async (s: Schedule) => {
    setExec({ id: s.id, items: Object.fromEntries(s.checkItems.map((c)=>[c.id, "NORMAL"])), notes: "" })
  }
  const submitExec = async () => {
    if (!exec) return
    const items = Object.entries(exec.items).map(([checkItemId, result]) => {
      const name = list.find((l)=>l.id===exec.id)?.checkItems.find((c)=>c.id===checkItemId)?.name || checkItemId
      return { checkItemId, name, result }
    })
    const res = await fetch(`${API}/api/it-osl/pm/schedules/${exec.id}/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, notes: exec.notes }) })
    const d = await res.json()
    if (!res.ok) return alert(d.message)
    alert(items.some((i)=>i.result==="ISSUE") ? "Eksekusi selesai — tiket PM auto dibuat untuk temuan" : "Checklist tuntas — aktivitas produktif tercatat")
    setExec(null)
    load()
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-28 md:pb-6 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 text-white">
            <CalendarCheck size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black truncate">PM Checklist Rutin</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">Jadwal berkala • temuan “Bermasalah” auto-generate tiket</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="hidden sm:flex px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black items-center gap-1.5 shadow-md shadow-indigo-600/25 transition"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Buat Jadwal Baru</span>
        </button>
      </header>

      {/* Desktop / Inline Create Card */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Buat Jadwal PM Baru</h3>
        <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} placeholder="Judul — cth: Cek suhu ruang server & rekaman CCTV pagi" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={form.frequency} onChange={(e)=>setForm({...form, frequency:e.target.value})} className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
            <option value="DAILY">Harian</option><option value="WEEKLY">Mingguan</option><option value="MONTHLY">Bulanan</option>
          </select>
          <button onClick={create} disabled={saving} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center gap-2">{saving&&<Loader2 className="animate-spin" size={12}/>} Tambah Jadwal</button>
        </div>
        <textarea value={form.itemsText} onChange={(e)=>setForm({...form, itemsText:e.target.value})} placeholder={"Daftar item per baris\nSuhu ruang server\nRekaman CCTV\nFilter UPS"} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm min-h-[90px]" />
      </div>

      {loading ? <div className="py-12 text-center text-slate-400 text-sm">Memuat jadwal PM...</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {list.map((s)=>(
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {s.frequency}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {s._count?.executions || 0} kali dieksekusi
                    </span>
                  </div>
                  <p className="font-bold text-sm sm:text-base text-slate-900 mt-1 break-words">{s.title}</p>
                  <ul className="mt-2 space-y-1 text-xs sm:text-sm list-disc pl-4 text-slate-600">
                    {s.checkItems.map((c)=>(<li key={c.id} className="break-words">{c.name}</li>))}
                  </ul>
                </div>
                <button onClick={()=>execute(s)} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-600/20 shrink-0">Eksekusi Checklist</button>
              </div>
            </div>
          ))}
          {list.length===0 && <div className="col-span-full py-12 text-center text-slate-400 text-sm">Belum ada jadwal PM</div>}
        </div>
      )}

      {/* Execution Modal */}
      {exec && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setExec(null)}>
          <div onClick={(e)=>e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-3.5 max-h-[90vh] overflow-y-auto pb-safe shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b"><h3 className="font-black text-slate-900 text-sm sm:text-base">Eksekusi Checklist PM</h3><button onClick={()=>setExec(null)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X size={17}/></button></div>
            <div className="space-y-2">
              {list.find((l)=>l.id===exec.id)?.checkItems.map((c)=>(
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">{c.name}</span>
                  <div className="flex gap-1">
                    {(["NORMAL","ATTENTION","ISSUE"] as const).map((r)=>(
                      <button key={r} onClick={()=>setExec({...exec, items:{...exec.items, [c.id]:r}})} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${exec.items[c.id]===r ? (r==="ISSUE"?"bg-rose-600 text-white border-rose-600 shadow-sm":r==="ATTENTION"?"bg-amber-500 text-white border-amber-500 shadow-sm":"bg-emerald-600 text-white border-emerald-600 shadow-sm") : "bg-white text-slate-600 border-slate-200"}`}>{r}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <textarea value={exec.notes} onChange={(e)=>setExec({...exec, notes:e.target.value})} placeholder="Catatan hasil pemeriksaan..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[60px]" />
            <button onClick={submitExec} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25">Simpan Hasil Eksekusi</button>
          </div>
        </div>
      )}

      {/* Mobile Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowCreateModal(false)}>
          <div onClick={(e)=>e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-3.5 max-h-[90vh] overflow-y-auto pb-safe shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Buat Jadwal PM Baru</h3>
              <button onClick={()=>setShowCreateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl"><X size={17}/></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Jadwal PM *</label>
                <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} placeholder="Contoh: Cek suhu ruang server & UPS pagi" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Frekuensi Pengecekan</label>
                <select value={form.frequency} onChange={(e)=>setForm({...form, frequency:e.target.value})} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white">
                  <option value="DAILY">Harian (Daily)</option>
                  <option value="WEEKLY">Mingguan (Weekly)</option>
                  <option value="MONTHLY">Bulanan (Monthly)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Daftar Item Periksa (1 baris 1 item)</label>
                <textarea value={form.itemsText} onChange={(e)=>setForm({...form, itemsText:e.target.value})} placeholder={"Suhu ruang server\nLampu indikator UPS\nRekaman CCTV\nKonektivitas ISP"} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm min-h-[90px]" />
              </div>
            </div>
            <button onClick={create} disabled={saving} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2">
              {saving&&<Loader2 className="animate-spin" size={13}/>} Simpan Jadwal PM
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        onClick={()=>setShowCreateModal(true)} 
        className="fixed bottom-20 right-4 sm:hidden w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Buat Jadwal PM Baru"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
