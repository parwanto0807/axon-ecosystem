"use client"

import { useEffect, useState } from "react"
import { Settings2, MapPin, Tag, Plus, Trash2, Loader2, Save, Pencil, X, Check } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type Loc = { id: string; code: string; name: string; address: string | null; isActive: boolean }
type Cat = { id: string; name: string; groupName: string; parentId: string | null; order: number; isActive: boolean }

export default function ItOslSettingsPage() {
  const [locs, setLocs] = useState<Loc[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [newLoc, setNewLoc] = useState({ code: "", name: "", address: "" })
  const [newCat, setNewCat] = useState({ groupName: "Hardware & PC", name: "" })
  const [loading, setLoading] = useState(true)
  const [editingLocId, setEditingLocId] = useState<string | null>(null)
  const [editLoc, setEditLoc] = useState({ code: "", name: "", address: "" })
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCat, setEditCat] = useState({ groupName: "Hardware & PC", name: "" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [lRes, cRes] = await Promise.all([fetch(`${API}/api/it-osl/locations`), fetch(`${API}/api/it-osl/categories`)])
    if (lRes.ok) setLocs(await lRes.json())
    if (cRes.ok) setCats(await cRes.json())
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const addLoc = async () => {
    if (!newLoc.code || !newLoc.name) return alert("code & name wajib")
    const res = await fetch(`${API}/api/it-osl/locations`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(newLoc) })
    const d=await res.json()
    if(!res.ok) return alert(d.message)
    setNewLoc({ code:"", name:"", address:"" })
    load()
  }
  const delLoc = async (id:string) => {
    if(!confirm("Hapus lokasi? Tiket terpakai lokasi ini akan gagal dibuat — pastikan tidak dipakai")) return
    const res = await fetch(`${API}/api/it-osl/locations/${id}`, { method:"DELETE" })
    if(!res.ok){ const d=await res.json(); return alert(d.message)}
    load()
  }
  const startEditLoc = (l: Loc) => {
    setEditingLocId(l.id)
    setEditLoc({ code: l.code, name: l.name, address: l.address || "" })
  }
  const saveLoc = async () => {
    if(!editingLocId) return
    if(!editLoc.code || !editLoc.name) return alert("code & name wajib")
    setSaving(true)
    const res = await fetch(`${API}/api/it-osl/locations/${editingLocId}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ code: editLoc.code, name: editLoc.name, address: editLoc.address }) })
    const d=await res.json()
    setSaving(false)
    if(!res.ok) return alert(d.message)
    setEditingLocId(null)
    load()
  }
  const addCat = async () => {
    if(!newCat.name) return alert("nama wajib")
    const res = await fetch(`${API}/api/it-osl/categories`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(newCat) })
    const d=await res.json()
    if(!res.ok) return alert(d.message)
    setNewCat({ groupName: newCat.groupName, name:"" })
    load()
  }
  const toggleCat = async (c: Cat) => {
    await fetch(`${API}/api/it-osl/categories/${c.id}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ isActive: !c.isActive }) })
    load()
  }
  const delCat = async (id:string) => {
    if(!confirm("Hapus kategori? Tiket pakai kategori ini akan error")) return
    const res = await fetch(`${API}/api/it-osl/categories/${id}`, { method:"DELETE" })
    if(!res.ok){ const d=await res.json(); return alert(d.message)}
    load()
  }
  const startEditCat = (c: Cat) => {
    setEditingCatId(c.id)
    setEditCat({ groupName: c.groupName, name: c.name })
  }
  const saveCat = async () => {
    if(!editingCatId) return
    if(!editCat.name || !editCat.groupName) return alert("group & nama wajib")
    setSaving(true)
    const res = await fetch(`${API}/api/it-osl/categories/${editingCatId}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ groupName: editCat.groupName, name: editCat.name }) })
    const d=await res.json()
    setSaving(false)
    if(!res.ok) return alert(d.message)
    setEditingCatId(null)
    load()
  }

  const groups = ["Hardware & PC","Jaringan & Internet","Security & Akses","Software & Aplikasi","Infrastruktur & Listrik","Permintaan Layanan"]

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Settings2 size={18} className="text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">Master OSL</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Lokasi • Kategori • SLA (15m/60m/240m) • hanya Lead/Admin</p>
          </div>
        </div>
      </header>

      {loading ? <div className="py-10 text-center text-slate-400">Memuat…</div> : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Lokasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newLoc.code} onChange={(e)=>setNewLoc({...newLoc, code:e.target.value.toUpperCase()})} placeholder="Kode — LOC-LT4" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
              <input value={newLoc.name} onChange={(e)=>setNewLoc({...newLoc, name:e.target.value})} placeholder="Nama — Lantai 4" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
              <input value={newLoc.address} onChange={(e)=>setNewLoc({...newLoc, address:e.target.value})} placeholder="Alamat opsional" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
            </div>
            <button onClick={addLoc} className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black">Tambah Lokasi</button>
            <div className="divide-y border rounded-xl overflow-hidden">
              {locs.map((l)=>(
                <div key={l.id} className="p-3">
                  {editingLocId === l.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={editLoc.code} onChange={(e)=>setEditLoc({...editLoc, code:e.target.value.toUpperCase()})} placeholder="Kode" className="w-full px-3 py-2 rounded-xl border text-sm font-mono" />
                        <input value={editLoc.name} onChange={(e)=>setEditLoc({...editLoc, name:e.target.value})} placeholder="Nama" className="w-full px-3 py-2 rounded-xl border text-sm sm:col-span-2" />
                      </div>
                      <input value={editLoc.address} onChange={(e)=>setEditLoc({...editLoc, address:e.target.value})} placeholder="Alamat" className="w-full px-3 py-2 rounded-xl border text-sm" />
                      <div className="flex gap-2">
                        <button onClick={saveLoc} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1">{saving? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Simpan</button>
                        <button onClick={()=>setEditingLocId(null)} className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1"><X size={12}/> Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0"><p className="font-mono text-xs font-bold">{l.code}</p><p className="break-words">{l.name} <span className="text-xs text-slate-400">— {l.address || "-"}</span></p></div>
                      <div className="flex gap-1 self-end sm:self-auto shrink-0">
                        <button onClick={()=>startEditLoc(l)} className="p-2 hover:bg-indigo-50 rounded-xl text-indigo-600" title="Edit"><Pencil size={14}/></button>
                        <button onClick={()=>delLoc(l.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500" title="Hapus"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {locs.length===0 && <div className="p-6 text-center text-sm text-slate-400">Belum ada lokasi</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Kategori</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select value={newCat.groupName} onChange={(e)=>setNewCat({...newCat, groupName:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border text-sm">
                {groups.map((g)=><option key={g} value={g}>{g}</option>)}
              </select>
              <input value={newCat.name} onChange={(e)=>setNewCat({...newCat, name:e.target.value})} placeholder="Sub-kategori — CCTV" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
              <button onClick={addCat} className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black">Tambah</button>
            </div>
            <div className="border rounded-xl divide-y max-h-[60vh] md:max-h-[500px] overflow-auto">
              {cats.map((c)=>(
                <div key={c.id} className={`p-3 ${!c.isActive ? "opacity-50 bg-slate-50" : ""}`}>
                  {editingCatId === c.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select value={editCat.groupName} onChange={(e)=>setEditCat({...editCat, groupName:e.target.value})} className="w-full px-3 py-2 rounded-xl border text-sm">
                          {groups.map((g)=><option key={g} value={g}>{g}</option>)}
                        </select>
                        <input value={editCat.name} onChange={(e)=>setEditCat({...editCat, name:e.target.value})} placeholder="Nama sub-kategori" className="w-full px-3 py-2 rounded-xl border text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveCat} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1">{saving? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Simpan</button>
                        <button onClick={()=>setEditingCatId(null)} className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1"><X size={12}/> Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0"><p className="font-bold break-words text-sm">{c.groupName} › {c.name}</p><p className="text-xs text-slate-400">order {c.order} • {c.isActive ? "Aktif" : "Hidden"}</p></div>
                      <div className="flex gap-1 shrink-0 self-end sm:self-auto items-center">
                        <button onClick={()=>toggleCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${c.isActive?"bg-amber-50 text-amber-700 border-amber-200":"bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{c.isActive?"Hide":"Show"}</button>
                        <button onClick={()=>startEditCat(c)} className="p-2 hover:bg-indigo-50 rounded-xl text-indigo-600" title="Edit"><Pencil size={14}/></button>
                        <button onClick={()=>delCat(c.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500" title="Hapus"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {cats.length===0 && <div className="p-6 text-center text-sm text-slate-400">Belum ada kategori</div>}
            </div>
            <p className="text-[11px] text-slate-400">Kategori hierarki 2 tingkat — groupName = kelompok PRD §4.2. Tiket kelompok “Permintaan Layanan” type REQUEST dikecualikan dari MTTR.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
            <h3 className="text-xs font-black uppercase tracking-widest">SLA per Severity</h3>
            <p className="text-sm text-slate-600 mt-2 break-words">Critical ≤15m respon / ≤4 jam selesai • Medium ≤60m / ≤1 hari • Low ≤4 jam / ≤3 hari. Breach notifikasi seketika. Jam kerja Senin-Jumat 08:00-17:00, Sabtu 08:00-12:00 WIB.</p>
            <p className="text-[11px] text-slate-400 mt-2">FRT = acknowledged_at − created_at (server immutable). reported_at terpisah — selisih &gt;2 jam ditandai Logging Lag.</p>
          </div>
        </>
      )}
    </div>
  )
}
