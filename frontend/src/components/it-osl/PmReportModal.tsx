"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Wrench,
  Calendar,
  Clock,
  Camera,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

export type PmExecutionItem = {
  id?: string
  name: string
  result: "NORMAL" | "ATTENTION" | "ISSUE" | string
  notes?: string | null
}

export type PmExecutionRecord = {
  id: string
  executedAt: string
  status: string
  notes?: string | null
  photos?: string[]
  executor?: { id: string; name: string } | null
  items: PmExecutionItem[]
}

export type PmScheduleForReport = {
  id: string
  title: string
  description?: string | null
  intervalLabel?: string
  priority?: string
  asset?: {
    id?: string
    assetCode?: string
    name?: string
    brandModel?: string | null
    location?: { name?: string } | null
    pic?: { name?: string; phone?: string | null; department?: string | null } | null
  } | null
  location?: { id?: string; name: string } | null
  customer?: { id?: string; name: string } | null
}

interface PmReportModalProps {
  isOpen: boolean
  onClose: () => void
  schedule: PmScheduleForReport | null
  record: PmExecutionRecord | null
  companyName?: string
  currentUserName?: string
}

export function PmReportModal({
  isOpen,
  onClose,
  schedule,
  record,
  companyName = "PT. INTECH MITRA ABADI",
  currentUserName,
}: PmReportModalProps) {
  const [copied, setCopied] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [activeCompany, setActiveCompany] = useState(companyName)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyAddress, setCompanyAddress] = useState<string | null>(null)
  const [companyContact, setCompanyContact] = useState<string | null>(null)

  // Load master company profile & logo dynamically
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"
    fetch(`${API}/api/company`, {
      headers: {
        "x-user-role": "SUPER_ADMIN",
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.legalName || data.name) {
            setActiveCompany(data.legalName || data.name)
          }
          if (data.logo) {
            const fullLogo = data.logo.startsWith("http") || data.logo.startsWith("data:")
              ? data.logo
              : `${API}${data.logo}`
            setCompanyLogo(fullLogo)
          }
          if (data.address) {
            const city = data.city ? `, ${data.city}` : ""
            setCompanyAddress(`${data.address}${city}`)
          }
          if (data.phone || data.email || data.website) {
            const parts = [
              data.phone ? `Telp: ${data.phone}` : null,
              data.email ? `Email: ${data.email}` : null,
              data.website ? data.website : null,
            ].filter(Boolean)
            setCompanyContact(parts.join(" • "))
          }
        }
      })
      .catch(() => {})
  }, [])

  if (!isOpen || !schedule || !record) return null

  const executedDate = new Date(record.executedAt || Date.now())
  const dd = String(executedDate.getDate()).padStart(2, "0")
  const mm = String(executedDate.getMonth() + 1).padStart(2, "0")
  const yyyy = executedDate.getFullYear()
  const hours = String(executedDate.getHours()).padStart(2, "0")
  const minutes = String(executedDate.getMinutes()).padStart(2, "0")
  const formattedDate = `${dd}/${mm}/${yyyy} ${hours}:${minutes} WIB`
  const dateOnly = `${dd}/${mm}/${yyyy}`

  const cleanNum = record.id.replace(/[^0-9]/g, "").slice(-4) || "0001"
  const docNumber = `BA-PM/IT/${yyyy}${mm}/${cleanNum}`

  const assetName = schedule.asset?.name || schedule.title || "Perangkat IT"
  const assetCode = schedule.asset?.assetCode || "-"
  const locationName = schedule.location?.name || schedule.asset?.location?.name || "Lokasi Unit"
  const customerName = schedule.customer?.name || "Customer / Divisi"
  const picName = schedule.asset?.pic?.name || "PIC Unit / User"
  const technicianName = record.executor?.name || currentUserName || "Administrator IT"

  const hasIssue = record.status === "ISSUE_FOUND" || record.items.some((i) => i.result === "ISSUE")
  const hasAttention = record.items.some((i) => i.result === "ATTENTION")

  const photos = Array.isArray(record.photos) ? record.photos : []

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = () => {
    const lines = [
      `*LAPORAN HASIL PREVENTIVE MAINTENANCE IT*`,
      `${activeCompany} — Divisi IT-OSL`,
      `No. Dokumen : ${docNumber}`,
      `Tanggal     : ${formattedDate}`,
      `Perangkat   : ${assetName} (${assetCode})`,
      `Lokasi      : ${locationName}`,
      `Customer    : ${customerName}`,
      `PIC Unit    : ${picName}`,
      `Teknisi     : ${technicianName}`,
      `Status Akhir: ${hasIssue ? "⚠️ DITEMUKAN MASALAH (ISSUE)" : "✅ NORMAL & BAIK"}`,
      `---------------------------------------`,
      `*RINGKASAN CHECKLIST:*`,
      ...record.items.map(
        (item, idx) =>
          `${idx + 1}. [${item.result === "NORMAL" ? "OK" : item.result === "ATTENTION" ? "PERHATIAN" : "RUSAK"}] ${item.name}${item.notes ? ` — ${item.notes}` : ""}`
      ),
      `---------------------------------------`,
      `Catatan: ${record.notes || "Pemeriksaan berkala selesai dilaksanakan sesuai SOP."}`,
      photos.length > 0 ? `Lampiran Foto: ${photos.length} foto dokumentasi tersimpan di sistem.` : "",
    ].filter(Boolean)

    navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[230] flex items-center justify-center p-2 sm:p-4 bg-black/70 overflow-y-auto"
      >
        {/* MODAL WRAPPER (Screen only, hidden on print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden no-print"
        >
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Printer size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    Laporan Hasil Preventive Maintenance
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
                    Berita Acara A4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Berita acara pemeriksaan fisik & pemeliharaan berkala untuk atasan / manajemen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Tersalin" : "Salin Format WA"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition active:scale-95 shadow-md shadow-emerald-600/30"
              >
                <Printer size={14} />
                <span>Cetak A4 / PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Paper Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
            {/* PAPER SHEET PREVIEW (A4 aspect) */}
            <div className="bg-white border border-slate-300 shadow-xl rounded-xl p-6 sm:p-8 w-full max-w-[210mm] text-slate-900 text-xs leading-relaxed flex flex-col justify-between select-text overflow-hidden">
              <div>
                {/* 1. Header / Kop Surat */}
                <div className="pb-3 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Logo & Corporate Identity */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {companyLogo ? (
                        <div className="h-16 w-16 sm:h-18 sm:w-18 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={companyLogo}
                            alt={activeCompany}
                            className="h-full w-full object-contain"
                            onError={() => setCompanyLogo(null)}
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-800">
                          <Building2 size={22} className="text-emerald-400" />
                          <span className="text-[8.5px] font-black tracking-widest uppercase mt-0.5 text-slate-200">
                            IMA
                          </span>
                        </div>
                      )}

                      <div className="space-y-0.5 min-w-0">
                        <h2
                          className="font-black text-xl sm:text-2xl uppercase tracking-wider text-slate-950 leading-tight"
                          style={{
                            fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                            fontWeight: 900,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {activeCompany}
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-extrabold tracking-wider text-emerald-950 uppercase">
                            DIVISI IT-OSL & TECHNICAL OPERATIONS
                          </p>
                          <span className="hidden sm:inline text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            Maintenance & Infrastructure
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">
                          {companyAddress || "Sistem Manajemen Pemeliharaan Aset & Infrastruktur Teknologi Informasi"}
                        </p>
                        {companyContact && (
                          <p className="text-[9.5px] text-slate-500 font-mono">
                            {companyContact}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Official Document Control Box */}
                    <div className="border border-slate-900 rounded p-1.5 text-[9.5px] font-mono leading-tight bg-slate-50 shrink-0 w-52 text-left">
                      <div className="font-bold border-b border-slate-400 pb-0.5 mb-1 text-center bg-slate-900 text-white -mx-1.5 -mt-1.5 p-1 text-[9px] uppercase tracking-wider">
                        BERITA ACARA PM IT
                      </div>
                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 pt-0.5">
                        <span className="text-slate-500">No. Dokumen:</span>
                        <strong className="text-slate-950 text-right truncate font-bold">{docNumber}</strong>
                        <span className="text-slate-500">Waktu Pelaksanaan:</span>
                        <span className="text-slate-900 text-right font-medium">{dateOnly}</span>
                        <span className="text-slate-500">Sifat:</span>
                        <span className="text-slate-900 text-right">Hasil Pemeliharaan</span>
                        <span className="text-slate-500">Hasil Akhir:</span>
                        <strong className={`text-right font-black ${hasIssue ? "text-rose-900" : "text-emerald-900"}`}>
                          {hasIssue ? "Ditemukan Issue" : "Normal & Baik"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Standard Double Line */}
                  <div className="mt-3 border-b-2 border-slate-950"></div>
                  <div className="mt-0.5 border-b border-slate-400"></div>
                </div>

                {/* 2. Document Title */}
                <div className="text-center my-4">
                  <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-950 underline decoration-2 underline-offset-4">
                    Berita Acara & Laporan Hasil Preventive Maintenance IT
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">
                    Periode / Frekuensi: <strong>{schedule.intervalLabel || "Berkala"}</strong> • Sifat: Routine Scheduled Maintenance
                  </p>
                </div>

                {/* 3. Formal Corporate Summary Banner */}
                <div className="mb-4">
                  <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5">
                    I. Kesimpulan Kondisi Hasil Pemeriksaan
                  </div>
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                      hasIssue
                        ? "bg-rose-50/70 border-rose-300 text-rose-950"
                        : hasAttention
                        ? "bg-amber-50/70 border-amber-300 text-amber-950"
                        : "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {hasIssue ? (
                        <AlertTriangle size={18} className="text-rose-700 shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                      )}
                      <div>
                        <span className="font-black uppercase tracking-wider text-[11px]">
                          {hasIssue
                            ? "Ditemukan Gangguan / Kerusakan Fisik (Issue Found)"
                            : hasAttention
                            ? "Perlu Perhatian / Pemantauan Khusus (Attention Needed)"
                            : "Normal, Bersih, dan Beroperasi Optimal (Completed Normal)"}
                        </span>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {hasIssue
                            ? "Temuan ketidaknormalan telah dicatat pada sistem untuk tindak lanjut perbaikan atau penggantian part."
                            : "Seluruh item checklist berhasil diverifikasi dan memenuhi standar operasional."}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[11px] px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-900 shrink-0">
                      STATUS: {record.status}
                    </span>
                  </div>
                </div>

                {/* 4. Data Perangkat & Penempatan */}
                <div className="mb-4 border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 text-xs">
                  <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
                    II. Data Objek & Penempatan Perangkat
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">Nama Perangkat</span>
                      <span className="mr-1.5">:</span>
                      <strong className="text-slate-950">{assetName}</strong>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">Customer / Klien</span>
                      <span className="mr-1.5">:</span>
                      <strong className="text-slate-950">{customerName}</strong>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">Kode Aset</span>
                      <span className="mr-1.5">:</span>
                      <strong className="font-mono text-slate-950 font-bold">{assetCode}</strong>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">Lokasi / Ruangan</span>
                      <span className="mr-1.5">:</span>
                      <span className="text-slate-900 font-medium">{locationName}</span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">Brand / Model</span>
                      <span className="mr-1.5">:</span>
                      <span className="text-slate-900">{schedule.asset?.brandModel || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-500 w-32 shrink-0">PIC Unit / User</span>
                      <span className="mr-1.5">:</span>
                      <strong className="text-slate-950">{picName}</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Checklist Table */}
                <div className="mb-4">
                  <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5">
                    III. Rincian Checklist & Hasil Pemeriksaan Lapangan
                  </h4>
                  <div className="border border-slate-300 overflow-hidden rounded-sm">
                    <table className="w-full table-fixed border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                          <th className="border-r border-slate-300 p-2 text-center w-[6%]">NO</th>
                          <th className="border-r border-slate-300 p-2 text-left w-[44%]">ITEM PEMERIKSAAN</th>
                          <th className="border-r border-slate-300 p-2 text-center w-[22%] whitespace-nowrap">HASIL</th>
                          <th className="p-2 text-left w-[28%]">CATATAN & TEMUAN LAPANGAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                      {record.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="border-r border-slate-300 p-2 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="border-r border-slate-300 p-2 font-medium text-slate-900">
                            {item.name}
                          </td>
                          <td className="border-r border-slate-300 p-2 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider inline-block border ${
                                item.result === "ISSUE"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : item.result === "ATTENTION"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {item.result === "ISSUE"
                                ? "Bermasalah"
                                : item.result === "ATTENTION"
                                ? "Perhatian"
                                : "Normal (Baik)"}
                            </span>
                          </td>
                          <td className="p-2 text-slate-700 text-[11px]">
                            {item.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* 6. General Notes / Findings */}
                <div className="mb-4 border border-slate-300 rounded-lg p-3 bg-slate-50/50 text-xs">
                  <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1">
                    IV. Catatan Umum Teknisi & Tindak Lanjut
                  </h4>
                  <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {record.notes ||
                      "Pemeriksaan berkala telah diselesaikan dengan baik sesuai standar operasional pemeliharaan aset IT. Perangkat dibersihkan dan fungsi telah diuji normal."}
                  </p>
                </div>

                {/* 7. Inspection Photos Gallery (If available) */}
                {photos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                      <Camera size={14} className="text-emerald-700" />
                      <span>V. Lampiran Foto Bukti Hasil Pemeriksaan ({photos.length} Foto)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {photos.map((src, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedPhoto(src)}
                          className="group relative rounded-lg border border-slate-300 overflow-hidden bg-slate-100 aspect-video cursor-pointer hover:border-indigo-500 transition shadow-2xs"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Bukti PM ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                            Lihat Foto
                          </div>
                          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            Foto #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 8. Lembar Tanda Tangan & Pengesahan Resmi (Spacious & Clean Standard) */}
              <div className="pt-4 border-t-2 border-slate-950 mt-6">
                <p className="font-bold text-[10.5px] text-slate-700 uppercase tracking-wider mb-2.5">
                  VI. Lembar Pengesahan & Verifikasi Pekerjaan
                </p>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  {/* Kolom 1: Teknisi IT */}
                  <div className="border border-slate-400 rounded-lg p-3 flex flex-col justify-between h-36 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700">Dikerjakan Oleh (Teknisi IT):</span>
                    <div className="space-y-0.5">
                      <div className="w-40 mx-auto border-b border-slate-950 mb-1"></div>
                      <strong className="text-slate-950 block font-black text-xs uppercase tracking-wide truncate">
                        ( {technicianName} )
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">Tanggal: {dateOnly}</span>
                    </div>
                  </div>

                  {/* Kolom 2: IT Supervisor */}
                  <div className="border border-slate-400 rounded-lg p-3 flex flex-col justify-between h-36 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700">Disetujui (IT Supervisor):</span>
                    <div className="space-y-0.5">
                      <div className="w-40 mx-auto border-b border-slate-950 mb-1"></div>
                      <strong className="text-slate-950 block font-black text-xs uppercase tracking-wide">
                        ( IT SUPERVISOR / HEAD )
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">Tanggal: ..... / ..... / 2026</span>
                    </div>
                  </div>

                  {/* Kolom 3: PIC Unit / User */}
                  <div className="border border-slate-400 rounded-lg p-3 flex flex-col justify-between h-36 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700">Mengetahui (PIC Unit / Klien):</span>
                    <div className="space-y-0.5">
                      <div className="w-40 mx-auto border-b border-slate-950 mb-1"></div>
                      <strong className="text-slate-950 block font-black text-xs uppercase tracking-wide truncate">
                        ( {picName} )
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">Tanggal: ..... / ..... / 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 text-[11px]">
              Laporan berita acara resmi dapat dicetak atau disimpan sebagai <strong>PDF A4</strong> untuk arsip pemeliharaan.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black transition active:scale-95 shadow-xs"
              >
                <Printer size={15} />
                <span>Cetak A4 / Simpan PDF</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* PRINTABLE ELEMENT (Only visible on print via @media print) */}
        <div id="printable-pm-report" className="hidden print:block text-slate-950 text-xs leading-relaxed bg-white">
          <style jsx global>{`
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
          `}</style>

          {/* Header on Print */}
          <div className="pb-2 mb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {companyLogo ? (
                  <div className="h-12 w-12 shrink-0 flex items-center justify-center p-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={companyLogo}
                      alt={activeCompany}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 border border-slate-900 flex flex-col items-center justify-center shrink-0">
                    <Building2 size={16} className="text-slate-900" />
                    <span className="text-[7.5px] font-black">IMA</span>
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <h2
                    className="font-black text-base uppercase tracking-wider text-slate-950 leading-tight"
                    style={{
                      fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {activeCompany}
                  </h2>
                  <p className="text-[9.5px] font-bold text-slate-900 uppercase">
                    DIVISI IT-OSL & TECHNICAL OPERATIONS
                  </p>
                  <p className="text-[8.5px] text-slate-600 leading-tight">
                    {companyAddress || "Sistem Manajemen Pemeliharaan Aset & Infrastruktur Teknologi Informasi"}
                  </p>
                  {companyContact && (
                    <p className="text-[8px] text-slate-500 font-mono">
                      {companyContact}
                    </p>
                  )}
                </div>
              </div>

              {/* Box on Print */}
              <div className="border border-slate-900 p-1 text-[9px] font-mono leading-tight bg-slate-50 shrink-0 w-48 text-left">
                <div className="font-bold border-b border-slate-400 pb-0.5 mb-1 text-center bg-slate-900 text-white -mx-1 -mt-1 p-0.5 text-[8.5px] uppercase">
                  BERITA ACARA PM IT
                </div>
                <div className="grid grid-cols-2 gap-x-1">
                  <span className="text-slate-600">No. Dok:</span>
                  <strong className="text-slate-950 text-right truncate font-bold">{docNumber}</strong>
                  <span className="text-slate-600">Waktu:</span>
                  <span className="text-slate-950 text-right">{dateOnly}</span>
                  <span className="text-slate-600">Hasil:</span>
                  <strong className="text-slate-950 text-right">{hasIssue ? "Issue" : "Normal"}</strong>
                </div>
              </div>
            </div>

            <div className="mt-2.5 border-b-2 border-slate-950"></div>
            <div className="mt-0.5 border-b border-slate-400"></div>
          </div>

          {/* Title on Print */}
          <div className="text-center my-2">
            <h1 className="text-sm font-black uppercase text-slate-950 underline decoration-2">
              Berita Acara & Laporan Hasil Preventive Maintenance IT
            </h1>
            <p className="text-[9.5px] text-slate-600 mt-0.5 font-medium">
              Periode / Frekuensi: <strong>{schedule.intervalLabel || "Berkala"}</strong>
            </p>
          </div>

          {/* Data Objek on Print */}
          <div className="mb-2.5 border border-slate-400 p-2.5 rounded text-[9.5px] bg-slate-50/50">
            <div className="font-bold uppercase text-[9.5px] mb-1.5 border-b border-slate-300 pb-0.5 text-slate-800">
              I. Data Perangkat & Penempatan
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div>• Perangkat: <strong>{assetName}</strong></div>
              <div>• Customer / Divisi: <strong>{customerName}</strong></div>
              <div>• Kode Aset: <strong className="font-mono">{assetCode}</strong></div>
              <div>• Lokasi / Ruangan: {locationName}</div>
              <div>• Brand / Model: {schedule.asset?.brandModel || "-"}</div>
              <div>• PIC Unit: <strong>{picName}</strong></div>
            </div>
          </div>

          {/* Checklist Table on Print */}
          <div className="mb-2.5">
            <div className="font-bold uppercase text-[9.5px] mb-1 text-slate-800">
              II. Hasil Checklist Pemeriksaan
            </div>
            <table className="w-full text-left border-collapse border border-slate-400 text-[9.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                  <th className="border-r border-slate-400 p-1 text-center w-7">NO</th>
                  <th className="border-r border-slate-400 p-1">ITEM PEMERIKSAAN</th>
                  <th className="border-r border-slate-400 p-1 text-center w-28 whitespace-nowrap">HASIL</th>
                  <th className="p-1">CATATAN TEMUAN LAPANGAN</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="border-r border-slate-400 p-1 text-center font-bold">{idx + 1}</td>
                    <td className="border-r border-slate-400 p-1 font-medium">{item.name}</td>
                    <td className="border-r border-slate-400 p-1 text-center font-bold whitespace-nowrap">
                      {item.result === "ISSUE" ? "BERMASALAH" : item.result === "ATTENTION" ? "PERHATIAN" : "NORMAL"}
                    </td>
                    <td className="p-1">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes on Print */}
          <div className="mb-2.5 border border-slate-400 p-2 rounded text-[9.5px]">
            <div className="font-bold uppercase mb-0.5 text-slate-800">III. Catatan & Rekomendasi Teknisi:</div>
            <p className="whitespace-pre-wrap text-slate-800">{record.notes || "Pemeriksaan selesai sesuai standar operasional."}</p>
          </div>

          {/* Photos on Print */}
          {photos.length > 0 && (
            <div className="mb-2.5">
              <div className="font-bold uppercase text-[9.5px] mb-1 text-slate-800">IV. Dokumentasi Foto ({photos.length} Foto)</div>
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(0, 6).map((src, i) => (
                  <div key={i} className="border border-slate-400 p-1 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Bukti" className="w-full h-24 object-cover mb-1" />
                    <span className="text-[8px] font-mono">Foto Bukti #{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures on Print */}
          <div className="pt-2 border-t-2 border-slate-950 mt-4">
            <div className="grid grid-cols-3 gap-3 text-center text-[9.5px]">
              <div className="border border-slate-400 p-2 flex flex-col justify-between h-32">
                <span className="font-bold text-slate-800">Dikerjakan (Teknisi):</span>
                <div>
                  <div className="w-28 mx-auto border-b border-slate-900 mb-0.5"></div>
                  <strong className="block font-bold uppercase truncate">( {technicianName} )</strong>
                  <span className="text-[8.5px] text-slate-600">Tgl: {dateOnly}</span>
                </div>
              </div>
              <div className="border border-slate-400 p-2 flex flex-col justify-between h-32">
                <span className="font-bold text-slate-800">Disetujui (IT Supervisor):</span>
                <div>
                  <div className="w-28 mx-auto border-b border-slate-900 mb-0.5"></div>
                  <strong className="block font-bold uppercase">( IT SUPERVISOR / HEAD )</strong>
                  <span className="text-[8.5px] text-slate-600">Tgl: ...../...../2026</span>
                </div>
              </div>
              <div className="border border-slate-400 p-2 flex flex-col justify-between h-32">
                <span className="font-bold text-slate-800">Mengetahui (PIC Unit):</span>
                <div>
                  <div className="w-28 mx-auto border-b border-slate-900 mb-0.5"></div>
                  <strong className="block font-bold uppercase truncate">( {picName} )</strong>
                  <span className="text-[8.5px] text-slate-600">Tgl: ...../...../2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHOTO LIGHTBOX PREVIEW */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="Enlarged"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  )
}
