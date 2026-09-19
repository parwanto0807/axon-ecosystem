"use client"

import { useEffect, useState } from "react"
import { CalendarCheck, Plus, CheckCircle2, AlertTriangle, X, Loader2, Settings2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type Schedule = { id: string; title: string; frequency: string; isActive: boolean; checkItems: { id: string; name: string }[]; _count?: { executions: number } }

export default function ItOslPmPage() {
  const [list, setList] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: "", frequency: "WEEKLY", itemsText: "" })
  const [exec, setExec] = useState<{ id: string; items: Record<string, string>; notes: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`${API}/api/it-osl/pm/schedules`)
    if (res.ok) setList(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.title) return alert("Judul wajib")
    const items = form.itemsText.split("\n").map((s)=>s.trim()).filter(Boolean).map((name)=>({ name }))
    setSaving(true)
    const res = await fetch(`${API}/api/it-osl/pm/schedules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, frequency: form.frequency, checkItems: items }) })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) return alert(d.message)
    setForm({ title: "", frequency: "WEEKLY", itemsText: "" })
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
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><CalendarCheck size={18} className="text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">PM Checklist</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Jadwal berulang • temuan “Bermasalah” auto buat tiket</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest">Buat Jadwal Baru</h3>
        <input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} placeholder="Judul — cth: Cek suhu ruang server & rekaman CCTV pagi" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={form.frequency} onChange={(e)=>setForm({...form, frequency:e.target.value})} className="w-full sm:w-auto px-3 py-2.5 rounded-xl border text-sm">
            <option value="DAILY">Harian</option><option value="WEEKLY">Mingguan</option><option value="MONTHLY">Bulanan</option>
          </select>
          <button onClick={create} disabled={saving} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center gap-2">{saving&&<Loader2 className="animate-spin" size={12}/>} Tambah Jadwal</button>
        </div>
        <textarea value={form.itemsText} onChange={(e)=>setForm({...form, itemsText:e.target.value})} placeholder={"Daftar item per baris\nSuhu ruang server\nRekaman CCTV\nFilter UPS"} className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[90px]" />
      </div>

      {loading ? <div className="py-10 text-center text-slate-400">Memuat…</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {list.map((s)=>(
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base break-words">{s.title} <span className="text-xs font-normal text-slate-400">• {s.frequency} • {s._count?.executions || 0} eksekusi</span></p>
                  <ul className="mt-2 space-y-1 text-sm list-disc pl-4">
                    {s.checkItems.map((c)=>(<li key={c.id} className="break-words">{c.name}</li>))}
                  </ul>
                </div>
                <button onClick={()=>execute(s)} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0">Eksekusi</button>
              </div>
            </div>
          ))}
          {list.length===0 && <div className="col-span-full py-10 text-center text-slate-400 text-sm">Belum ada jadwal PM</div>}
        </div>
      )}

      {exec && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={()=>setExec(null)}>
          <div onClick={(e)=>e.stopPropagation()} className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-black">Eksekusi Checklist</h3><button onClick={()=>setExec(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={16}/></button></div>
            {list.find((l)=>l.id===exec.id)?.checkItems.map((c)=>(
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border">
                <span className="text-sm font-medium">{c.name}</span>
                <div className="flex gap-1">
                  {(["NORMAL","ATTENTION","ISSUE"] as const).map((r)=>(
                    <button key={r} onClick={()=>setExec({...exec, items:{...exec.items, [c.id]:r}})} className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${exec.items[c.id]===r ? (r==="ISSUE"?"bg-rose-600 text-white":r==="ATTENTION"?"bg-amber-500 text-white":"bg-emerald-600 text-white") : "bg-white"}`}>{r}</button>
                  ))}
                </div>
              </div>
            ))}
            <textarea value={exec.notes} onChange={(e)=>setExec({...exec, notes:e.target.value})} placeholder="Catatan" className="w-full px-3 py-2 rounded-xl border text-sm" />
            <button onClick={submitExec} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-black text-sm">Simpan Eksekusi</button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400">Checklist tuntas dihitung aktivitas produktif terpisah dari volume insiden.</p>
    </div>
  )
}
