"use client"

import { useEffect, useState } from "react"
import { Handshake, LogIn, LogOut, Clock3, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

type Handover = { id: string; date: string; user: { name: string } | null; openingAt: string | null; closingAt: string | null; openingNotes: string | null; closingNotes: string | null; handoverNotes: string | null }

export default function ItOslHandoversPage() {
  const [list, setList] = useState<Handover[]>([])
  const [userId, setUserId] = useState("")
  const [notes, setNotes] = useState("")
  const [handoverNotes, setHandoverNotes] = useState("")

  const load = async () => {
    const res = await fetch(`${API}/api/it-osl/handovers`)
    if (res.ok) setList(await res.json())
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    // naive: take current user from localStorage? fallback to prompt
    const saved = typeof window !== "undefined" ? localStorage.getItem("it-osl-userId") || "" : ""
    if (saved) setUserId(saved)
    // fetch users list minimal: we don't have, so allow manual input
  }, [])

  const opening = async () => {
    if (!userId) return alert("Isi User ID (email atau ID user)")
    const res = await fetch(`${API}/api/it-osl/handovers/opening`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, notes }) })
    const d = await res.json()
    if (!res.ok) return alert(d.message)
    localStorage.setItem("it-osl-userId", userId)
    setNotes("")
    load()
  }
  const closing = async () => {
    if (!userId) return alert("Isi User ID")
    const res = await fetch(`${API}/api/it-osl/handovers/closing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, notes, handoverNotes }) })
    const d = await res.json()
    if (!res.ok) return alert(d.message)
    setNotes(""); setHandoverNotes("")
    load()
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 pb-24 md:pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><Handshake size={18} className="text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">Serah Terima Shift</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Opening 08:00 • Closing 16:00 checklist • catatan untuk shift berikutnya</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="User ID / Email (sementara)" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
          <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Catatan opening/closing" className="w-full px-3 py-2.5 rounded-xl border text-sm" />
        </div>
        <textarea value={handoverNotes} onChange={(e)=>setHandoverNotes(e.target.value)} placeholder="Ringkasan untuk shift berikutnya / diri sendiri esok pagi" className="w-full px-3 py-2.5 rounded-xl border text-sm min-h-[80px]" />
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={opening} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2"><LogIn size={14}/> Mulai Bertugas (Opening)</button>
          <button onClick={closing} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2"><LogOut size={14}/> Closing & Serah Terima</button>
        </div>
        <p className="text-[11px] text-slate-400">Menekan Opening tercatat sebagai jejak kehadiran berbasis aktivitas — tanpa absensi terpisah. Pukul 16:00 cek tiket mengambang: Selesaikan / Pending / Lanjut besok.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {list.map((h)=>(
          <div key={h.id} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="font-bold text-sm truncate">{new Date(h.date).toLocaleDateString('id-ID')} — {h.user?.name || "User"}</p>
            <p className="text-xs text-slate-500 flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
              <span className="flex items-center gap-1"><Clock3 size={12}/> Opening: {h.openingAt ? new Date(h.openingAt).toLocaleTimeString('id-ID') : "-"}</span>
              <span className="flex items-center gap-1"><Clock3 size={12}/> Closing: {h.closingAt ? new Date(h.closingAt).toLocaleTimeString('id-ID') : "-"}</span>
            </p>
            {(h.openingNotes || h.closingNotes || h.handoverNotes) && (
              <div className="mt-2 text-xs bg-slate-50 rounded-xl p-3 space-y-1 break-words">
                {h.openingNotes && <p><b>Opening:</b> {h.openingNotes}</p>}
                {h.closingNotes && <p><b>Closing:</b> {h.closingNotes}</p>}
                {h.handoverNotes && <p><b>Serah Terima:</b> {h.handoverNotes}</p>}
              </div>
            )}
          </div>
        ))}
        {list.length===0 && <div className="col-span-full py-10 text-center text-slate-400 text-sm">Belum ada handover</div>}
      </div>
    </div>
  )
}
