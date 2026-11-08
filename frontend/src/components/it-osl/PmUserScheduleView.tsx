"use client"

import React, { useMemo, useState } from "react"
import {
  Printer,
  CalendarDays,
  CalendarCheck2,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  Play,
  History,
  MessageCircle,
  Copy,
  Check,
  Search,
  Building2,
  MapPin,
  User,
  Wrench,
  Phone,
  ExternalLink,
  Sparkles,
  Share2,
} from "lucide-react"

export type UserScheduleItem = {
  id: string
  title: string
  description?: string | null
  intervalUnit: string
  intervalValue: number
  intervalLabel?: string
  priority: string
  isActive: boolean
  startDate: string
  nextDueAt: string | null
  lastExecutedAt: string | null
  status: "OVERDUE" | "DUE_SOON" | "SCHEDULED" | "PAUSED"
  checkItems: { id: string; name: string }[]
  asset?: {
    id: string
    assetCode: string
    name: string
    assetType?: string | null
    brandModel?: string | null
    location?: { id: string; name: string } | null
    customer?: { id: string; name: string } | null
    pic?: { id: string; name: string; phone?: string | null; department?: string | null; position?: string | null } | null
  } | null
  location?: { id: string; name: string } | null
  customer?: { id: string; name: string } | null
}

interface PmUserScheduleViewProps {
  schedules: UserScheduleItem[]
  loading: boolean
  canExecute: boolean
  onExecute: (schedule: any) => void
  onHistory: (schedule: any) => void
  onPrintPlan?: (schedule: any) => void
  companyName?: string
  onToast: (type: "success" | "error" | "info", msg: string) => void
}

export function PmUserScheduleView({
  schedules,
  loading,
  canExecute,
  onExecute,
  onHistory,
  onPrintPlan,
  companyName = "PT. INTECH MITRA ABADI",
  onToast,
}: PmUserScheduleViewProps) {
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OVERDUE" | "DUE_SOON" | "SCHEDULED">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...schedules]

    if (filterStatus === "OVERDUE") {
      list = list.filter((s) => s.status === "OVERDUE")
    } else if (filterStatus === "DUE_SOON") {
      list = list.filter((s) => s.status === "DUE_SOON")
    } else if (filterStatus === "SCHEDULED") {
      list = list.filter((s) => s.status === "SCHEDULED")
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((s) => {
        const text = [
          s.title,
          s.asset?.name,
          s.asset?.assetCode,
          s.customer?.name,
          s.location?.name,
          s.asset?.pic?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return text.includes(q)
      })
    }

    // Sort: OVERDUE first, then DUE_SOON, then earliest nextDueAt
    return list.sort((a, b) => {
      const weight = (st: string) => (st === "OVERDUE" ? 1 : st === "DUE_SOON" ? 2 : st === "SCHEDULED" ? 3 : 4)
      const diff = weight(a.status) - weight(b.status)
      if (diff !== 0) return diff
      const timeA = a.nextDueAt ? new Date(a.nextDueAt).getTime() : Infinity
      const timeB = b.nextDueAt ? new Date(b.nextDueAt).getTime() : Infinity
      return timeA - timeB
    })
  }, [schedules, filterStatus, searchTerm])

  const counts = useMemo(() => {
    return {
      all: schedules.length,
      overdue: schedules.filter((s) => s.status === "OVERDUE").length,
      dueSoon: schedules.filter((s) => s.status === "DUE_SOON").length,
      scheduled: schedules.filter((s) => s.status === "SCHEDULED").length,
    }
  }, [schedules])

  const formatDate = (iso: string | null) => {
    if (!iso) return "Belum dijadwalkan"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getDueBadge = (status: string, nextDue: string | null) => {
    if (status === "OVERDUE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle size={11} /> Terlambat
        </span>
      )
    }
    if (status === "DUE_SOON") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
          <Clock3 size={11} /> Jatuh Tempo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
        <CalendarDays size={11} /> Terjadwal
      </span>
    )
  }

  // Generate WhatsApp formatted message
  const generateWaMessage = (s: UserScheduleItem) => {
    const picName = s.asset?.pic?.name || "Bapak / Ibu"
    const customer = s.customer?.name || s.asset?.customer?.name || "Unit Terkait"
    const asset = s.asset?.name || s.title
    const assetCode = s.asset?.assetCode ? ` (${s.asset.assetCode})` : ""
    const location = s.location?.name || s.asset?.location?.name || "-"
    const dueDate = formatDate(s.nextDueAt)
    const items = s.checkItems.map((c) => c.name).slice(0, 4).join(", ")

    return (
      `*PEMBERITAHUAN JADWAL PREVENTIVE MAINTENANCE (PM) IT*\n` +
      `${companyName} — Divisi IT-OSL\n\n` +
      `Yth. *${picName}* (${customer}),\n\n` +
      `Sehubungan dengan agenda pemeliharaan berkala infrastruktur & perangkat IT, kami informasikan jadwal kunjungan Preventive Maintenance untuk perangkat di unit Anda:\n\n` +
      `📌 *Nama Perangkat:* ${asset}${assetCode}\n` +
      `📍 *Lokasi:* ${location}\n` +
      `🗓️ *Jadwal Kunjungan:* ${dueDate}\n` +
      `🔧 *Fokus Pemeriksaan:* ${items || "Pembersihan fisik hardware, pengecekan kelistrikan & stabilitas sistem"}\n\n` +
      `Mohon konfirmasi kesiapan dan bantuan akses perangkat pada jadwal tersebut. Jika memerlukan penyesuaian jadwal, silakan hubungi tim IT kami.\n\n` +
      `Terima kasih atas kerja samanya.\n` +
      `_Salam hangat, Tim IT Support ${companyName}_`
    )
  }

  const handleSendWa = (s: UserScheduleItem) => {
    const message = generateWaMessage(s)
    const rawPhone = s.asset?.pic?.phone || ""
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "")

    if (cleanPhone) {
      // Normalize Indonesian phone numbers: 08xx -> 628xx
      const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      window.open(url, "_blank")
      onToast("success", `Membuka WhatsApp untuk PIC: ${s.asset?.pic?.name || "User"}`)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(message)
      onToast(
        "info",
        "Nomor WhatsApp PIC belum terisi. Draft pesan jadwal telah disalin ke clipboard untuk dikirim manual."
      )
    }
  }

  const handleCopyMemo = (s: UserScheduleItem) => {
    const message = generateWaMessage(s)
    navigator.clipboard.writeText(message)
    setCopiedId(s.id)
    setTimeout(() => setCopiedId(null), 2500)
    onToast("success", "Draft jadwal berhasil disalin ke clipboard")
  }

  return (
    <div className="space-y-4">
      {/* Banner / Info */}
      <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-black text-xs text-indigo-950 uppercase tracking-wider">
            <CalendarCheck2 size={16} className="text-indigo-600" />
            <span>Jadwal Kunjungan Preventive Maintenance ke User & Unit</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-100 text-indigo-800 border border-indigo-200">
              {filtered.length} Perangkat
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kirimkan pemberitahuan jadwal pemeriksaan berkala langsung ke nomor WhatsApp PIC/User sebelum kunjungan teknisi untuk memastikan kesiapan unit.
          </p>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("OVERDUE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              filterStatus === "OVERDUE"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <AlertTriangle size={12} />
            <span>Terlambat ({counts.overdue})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("DUE_SOON")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              filterStatus === "DUE_SOON"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Clock3 size={12} />
            <span>Jatuh Tempo ({counts.dueSoon})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("SCHEDULED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              filterStatus === "SCHEDULED"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100"
            }`}
          >
            <CalendarDays size={12} />
            <span>Mendatang ({counts.scheduled})</span>
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari perangkat / PIC / lokasi…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs font-semibold">
          Memuat jadwal kunjungan PM ke user…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <CalendarDays size={32} className="mx-auto text-slate-400 mb-2" />
          <p className="font-bold text-sm text-slate-700">Tidak ada jadwal kunjungan ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">
            Cobalah ubah kata kunci pencarian atau ganti filter status di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filtered.map((s) => {
            const assetName = s.asset?.name || s.title
            const assetCode = s.asset?.assetCode || "-"
            const locationName = s.location?.name || s.asset?.location?.name || "Site / Lokasi"
            const customerName = s.customer?.name || s.asset?.customer?.name || "Customer / Divisi"
            const pic = s.asset?.pic
            const picName = pic?.name || "Belum ada PIC"
            const picPhone = pic?.phone || ""
            const intervalText = s.intervalLabel || `${s.intervalValue} ${s.intervalUnit}`

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
              >
                {/* Header Row */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getDueBadge(s.status, s.nextDueAt)}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {intervalText}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      Prioritas: <strong>{s.priority}</strong>
                    </span>
                  </div>

                  {/* Asset Details */}
                  <div className="space-y-1">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-snug">
                      {assetName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {assetCode}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={12} className="text-slate-400" />
                        <strong>{customerName}</strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{locationName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Meta Grid */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Left: PIC Info */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      PIC Unit / Kontak User
                    </span>
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-indigo-600 shrink-0" />
                      <strong className="text-slate-800 truncate">{picName}</strong>
                    </div>
                    {pic?.department && (
                      <span className="text-[11px] text-slate-500 block ml-5">
                        {pic.department}
                      </span>
                    )}
                    {picPhone && (
                      <span className="text-[11px] font-mono text-emerald-700 block ml-5 font-semibold">
                        📞 {picPhone}
                      </span>
                    )}
                  </div>

                  {/* Right: Target Date */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      Target Jadwal Kunjungan
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-indigo-600 shrink-0" />
                      <strong className="text-slate-800">{formatDate(s.nextDueAt)}</strong>
                    </div>
                    <span className="text-[10px] text-slate-400 block ml-5">
                      Terakhir: {formatDate(s.lastExecutedAt)}
                    </span>
                  </div>
                </div>

                {/* Check Items Preview */}
                {s.checkItems.length > 0 && (
                  <div className="text-[11px] text-slate-600">
                    <span className="font-bold text-slate-400 text-[10px] uppercase block mb-1">
                      Checklist Pengecekan ({s.checkItems.length} Item):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {s.checkItems.slice(0, 3).map((ci) => (
                        <span
                          key={ci.id}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] truncate max-w-[180px]"
                        >
                          ✓ {ci.name}
                        </span>
                      ))}
                      {s.checkItems.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                          +{s.checkItems.length - 3} lagi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Send WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => handleSendWa(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                      title="Kirim pemberitahuan jadwal ke WhatsApp PIC"
                    >
                      <MessageCircle size={14} />
                      <span>Kirim Jadwal (WA)</span>
                    </button>

                    {/* Copy Text Memo Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyMemo(s)}
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition active:scale-95"
                      title="Salin memo teks untuk email/pesan"
                    >
                      {copiedId === s.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Print Plan for Atasan */}
                    {onPrintPlan && (
                      <button
                        type="button"
                        onClick={() => onPrintPlan(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-2xs active:scale-95"
                        title="Cetak Surat Tugas & Rencana PM untuk Atasan (PDF A4)"
                      >
                        <Printer size={13} />
                        <span className="hidden sm:inline">Cetak Rencana (Atasan)</span>
                        <span className="sm:hidden">Rencana</span>
                      </button>
                    )}

                    {/* View History */}
                    <button
                      type="button"
                      onClick={() => onHistory(s)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                      title="Lihat riwayat pemeriksaan sebelumnya"
                    >
                      Riwayat
                    </button>

                    {/* Execute Inspection */}
                    {canExecute && (
                      <button
                        type="button"
                        onClick={() => onExecute(s)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black shadow-xs active:scale-95 transition"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Eksekusi</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

