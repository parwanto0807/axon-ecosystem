"use client"

import { useEffect, useState } from "react"
import { FileText, Copy, Share2, Calendar, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL

export default function ItOslReportsPage() {
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10))
  const [ym, setYm] = useState(()=> new Date().toISOString().slice(0,7))
  const [daily, setDaily] = useState<{ text: string; done: number; pending: number; avgFrt: number } | null>(null)
  const [monthly, setMonthly] = useState<{ total: number; byCategory: Record<string,number>; bySeverity: Record<string,number>; byStatus: Record<string,number>; breach:number } | null>(null)
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  const loadDaily = async () => {
    setLoadingDaily(true)
    const res = await fetch(`${API}/api/it-osl/reports/daily?date=${date}`)
    if (res.ok) setDaily(await res.json())
    setLoadingDaily(false)
  }
  const loadMonthly = async () => {
    setLoadingMonthly(true)
    const res = await fetch(`${API}/api/it-osl/reports/monthly?ym=${ym}`)
    if (res.ok) setMonthly(await res.json())
    setLoadingMonthly(false)
  }
  useEffect(()=>{ loadDaily() },[date])
  useEffect(()=>{ loadMonthly() },[ym])

  const copyDaily = async () => {
    if (!daily?.text) return
    await navigator.clipboard.writeText(daily.text)
    alert("Teks laporan disalin — siap tempel ke grup WA")
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><FileText size={18} className="text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black truncate">Laporan Harian & Bulanan</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Satu ketukan → siap tempel • PDF/Excel bulanan lampiran kontrak</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <h3 className="text-xs font-black uppercase tracking-widest">Harian Otomatis</h3>
            </div>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full sm:w-auto sm:ml-auto px-3 py-2 rounded-xl border text-sm" />
          </div>
        {loadingDaily ? <div className="py-10 text-center text-slate-400 flex justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Memuat…</div> : daily && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Selesai</p><p className="text-xl font-black">{daily.done}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Pending</p><p className="text-xl font-black">{daily.pending}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Avg FRT</p><p className="text-xl font-black">{daily.avgFrt}m</p></div>
            </div>
            <pre className="whitespace-pre-wrap text-[11px] sm:text-xs bg-slate-900 text-slate-100 rounded-2xl p-3 sm:p-4 max-h-[320px] overflow-auto break-words">{daily.text}</pre>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={copyDaily} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center gap-2"><Copy size={14}/> Salin</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(daily.text)}`} target="_blank" className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2"><Share2 size={14}/> WA</a>
            </div>
            <p className="text-[11px] text-slate-400">Jadwal otomatis 16:30 — tombol salin satu ketukan. Suku cadang & perhatian otomatis terisi.</p>
          </>
        )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-widest">Bulanan (PDF/Excel Ready)</h3>
            <input type="month" value={ym} onChange={(e)=>setYm(e.target.value)} className="w-full sm:w-auto sm:ml-auto px-3 py-2 rounded-xl border text-sm" />
          </div>
          {loadingMonthly ? <div className="py-10 text-center text-slate-400">Memuat…</div> : monthly && (
            <>
              <p className="text-sm"><b>Total</b> {monthly.total} tiket • <b>Breach SLA</b> {monthly.breach}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-black mb-1">Per Kategori</p>
                  {Object.entries(monthly.byCategory).map(([k,v])=><p key={k} className="flex justify-between gap-2"><span className="truncate">{k}</span><b>{v}</b></p>)}
                  {Object.keys(monthly.byCategory).length===0 && <p className="text-slate-400">-</p>}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-black mb-1">Per Severity</p>
                  {Object.entries(monthly.bySeverity).map(([k,v])=><p key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></p>)}
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-black mb-1">Per Status</p>
                  {Object.entries(monthly.byStatus).map(([k,v])=><p key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></p>)}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 break-all">Ekspor Excel: gunakan /api/it-osl/reports/monthly?ym={ym} (data mentah per baris siap pivot). PDF bulan depan via jsPDF.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
