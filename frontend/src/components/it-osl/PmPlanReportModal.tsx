"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer,
  X,
  Copy,
  Check,
  FileText,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Wrench,
} from "lucide-react"

export type SchedulePlanItem = {
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
  status: "OVERDUE" | "DUE_SOON" | "SCHEDULED" | "PAUSED" | string
  checkItems: { id?: string; name: string }[]
  asset?: {
    id?: string
    assetCode?: string
    name?: string
    brandModel?: string | null
    location?: { id?: string; name: string } | null
    customer?: { id?: string; name: string } | null
    pic?: { id?: string; name: string; phone?: string | null; department?: string | null } | null
  } | null
  location?: { id?: string; name: string } | null
  customer?: { id?: string; name: string } | null
}

interface PmPlanReportModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: "single" | "master"
  schedule?: SchedulePlanItem | null
  schedules?: SchedulePlanItem[]
  companyName?: string
  currentUserName?: string
}

export function PmPlanReportModal({
  isOpen,
  onClose,
  mode = "single",
  schedule,
  schedules = [],
  companyName = "PT. INTECH MITRA ABADI",
  currentUserName,
}: PmPlanReportModalProps) {
  const [copied, setCopied] = useState(false)
  const [activeCompany, setActiveCompany] = useState(companyName)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyAddress, setCompanyAddress] = useState<string | null>(null)
  const [companyContact, setCompanyContact] = useState<string | null>(null)

  // Fetch company legal name & logo dynamically from backend
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

  if (!isOpen) return null

  const today = new Date()
  const dd = String(today.getDate()).padStart(2, "0")
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const yyyy = today.getFullYear()
  const todayFormatted = `${dd}/${mm}/${yyyy}`

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]
  const currentMonthName = monthNames[today.getMonth()]

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const isSingle = mode === "single" && schedule
  const cleanId = schedule?.id ? schedule.id.replace(/[^0-9]/g, "").slice(-4) || "0001" : "0001"
  const docNumber = isSingle ? `WO-PM/IT/${yyyy}${mm}/${cleanId}` : `REKAP-PM/IT/${yyyy}${mm}/001`

  const assetName = schedule?.asset?.name || schedule?.title || "Perangkat IT"
  const assetCode = schedule?.asset?.assetCode || "-"
  const locationName = schedule?.location?.name || schedule?.asset?.location?.name || "-"
  const customerName = schedule?.customer?.name || schedule?.asset?.customer?.name || "-"
  const picName = schedule?.asset?.pic?.name || "-"
  const technicianName = currentUserName || "Administrator IT"

  const statusLabel = (st: string) => {
    const s = String(st || "").toUpperCase()
    if (s === "OVERDUE" || s === "TERLAMBAT") return "TERLAMBAT"
    if (s === "DUE_SOON" || s === "JATUH_TEMPO") return "JATUH TEMPO"
    if (s === "SCHEDULED" || s === "TERJADWAL") return "TERJADWAL"
    if (s === "PAUSED") return "DITUNDA"
    return s || "TERJADWAL"
  }

  const handleCopyText = () => {
    if (isSingle && schedule) {
      const lines = [
        `*SURAT TUGAS & RENCANA KERJA PREVENTIVE MAINTENANCE IT*`,
        `${activeCompany} — Divisi IT-OSL`,
        `No. Dokumen: ${docNumber}`,
        `Tanggal    : ${todayFormatted}`,
        `Prioritas  : ${schedule.priority}`,
        `--------------------------------------------------`,
        `*I. SASARAN PEMELIHARAAN:*`,
        `• Perangkat : ${assetName} (${assetCode})`,
        `• Customer  : ${customerName}`,
        `• Lokasi    : ${locationName}`,
        `• PIC Unit  : ${picName}`,
        `• Target PM : ${formatDate(schedule.nextDueAt)}`,
        `• Frekuensi : ${schedule.intervalLabel || `${schedule.intervalValue} ${schedule.intervalUnit}`}`,
        `--------------------------------------------------`,
        `*II. CHECKLIST PEMERIKSAAN:*`,
        ...schedule.checkItems.map((ci, idx) => `${idx + 1}. [ ] ${ci.name}`),
        `--------------------------------------------------`,
        `Diajukan: ${technicianName} | Menyetujui: IT Supervisor`,
      ]
      navigator.clipboard.writeText(lines.join("\n"))
    } else {
      const lines = [
        `*REKAPITULASI RENCANA PREVENTIVE MAINTENANCE IT*`,
        `${activeCompany} — Divisi IT-OSL`,
        `No. Dokumen : ${docNumber}`,
        `Periode     : ${currentMonthName} ${yyyy} | Total: ${schedules.length} Jadwal`,
        `--------------------------------------------------`,
        ...schedules.map(
          (s, idx) =>
            `${idx + 1}. [${s.asset?.assetCode || "-"}] ${s.asset?.name || s.title} — ${s.customer?.name || "-"} | Target: ${formatDate(s.nextDueAt)} (${statusLabel(s.status)})`
        ),
        `--------------------------------------------------`,
        `Menyetujui: IT Supervisor / Head of IT`,
      ]
      navigator.clipboard.writeText(lines.join("\n"))
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const countTotal = schedules.length
  const countScheduled = schedules.filter((s) => String(s.status).toUpperCase() === "SCHEDULED").length
  const countDueSoon = schedules.filter((s) => String(s.status).toUpperCase() === "DUE_SOON").length
  const countOverdue = schedules.filter((s) => String(s.status).toUpperCase() === "OVERDUE").length

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[240] flex items-center justify-center p-2 sm:p-4 bg-black/70 overflow-y-auto"
      >
        {/* MODAL WRAPPER (Hidden on print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden no-print"
        >
          {/* 1. Modal Top Toolbar */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    {isSingle
                      ? "Surat Tugas & Rencana Kerja PM (Untuk Atasan)"
                      : "Laporan Rekapitulasi Rencana PM (Untuk Atasan)"}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 whitespace-nowrap">
                    Standar A4 Eksekutif
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Dokumen resmi pengajuan rencana pemeliharaan berkala untuk persetujuan atasan sebelum eksekusi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Tersalin" : "Salin Memo WA"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition active:scale-95 shadow-md shadow-indigo-600/30"
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

          {/* 2. Modal Body / Paper Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
            {/* PAPER SHEET (A4 Standard: 210mm wide) */}
            <div className="bg-white border border-slate-300 shadow-xl rounded-xl p-6 sm:p-8 w-full max-w-[210mm] text-slate-900 text-xs leading-relaxed flex flex-col justify-between select-text overflow-hidden">
              <div>
                {/* Kop Surat Resmi PT. INTECH MITRA ABADI */}
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
                          <Building2 size={22} className="text-indigo-400" />
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
                          <p className="text-[11px] font-extrabold tracking-wider text-indigo-950 uppercase">
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
                        {isSingle ? "SURAT TUGAS PM IT" : "REKAPITULASI RENCANA PM"}
                      </div>
                      <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 pt-0.5">
                        <span className="text-slate-500">No. Dokumen:</span>
                        <strong className="text-slate-950 text-right truncate font-bold">{docNumber}</strong>
                        <span className="text-slate-500">Tanggal Terbit:</span>
                        <span className="text-slate-900 text-right font-medium">{todayFormatted}</span>
                        <span className="text-slate-500">Sifat:</span>
                        <span className="text-slate-900 text-right">Rencana Kerja</span>
                        <span className="text-slate-500">Status Dokumen:</span>
                        <strong className="text-indigo-900 text-right font-black">Menunggu ACC</strong>
                      </div>
                    </div>
                  </div>

                  {/* Standard Indonesian Corporate Double Divider Line */}
                  <div className="mt-3 border-b-2 border-slate-950"></div>
                  <div className="mt-0.5 border-b border-slate-400"></div>
                </div>

                {/* Document Title Header */}
                <div className="text-center my-4">
                  <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-950 underline decoration-2 underline-offset-4">
                    {isSingle
                      ? "Surat Tugas & Rencana Kerja Preventive Maintenance IT"
                      : "Laporan Rekapitulasi Rencana Preventive Maintenance IT"}
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium">
                    {isSingle
                      ? "Lembar Pengajuan & Persetujuan Rencana Pemeliharaan Berkala ke Atasan"
                      : `Dokumen Pengajuan Agenda Pemeliharaan Aset IT Kepada Manajemen • Periode: ${currentMonthName} ${yyyy}`}
                  </p>
                </div>

                {/* --- MODE 1: SINGLE WORK ORDER PLAN --- */}
                {isSingle && schedule && (
                  <>
                    {/* Schedule Metadata Grid */}
                    <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 mb-4 text-xs">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2.5">
                        I. Data Perangkat & Sasaran Pemeliharaan
                      </div>
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
                        <div className="flex">
                          <span className="text-slate-500 w-32 shrink-0">Target Tanggal PM</span>
                          <span className="mr-1.5">:</span>
                          <strong className="text-indigo-950 font-bold">{formatDate(schedule.nextDueAt)}</strong>
                        </div>
                        <div className="flex">
                          <span className="text-slate-500 w-32 shrink-0">Frekuensi PM</span>
                          <span className="mr-1.5">:</span>
                          <span className="text-slate-900 font-semibold">{schedule.intervalLabel || `${schedule.intervalValue} ${schedule.intervalUnit}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* II. Checklist Rencana Kerja */}
                    <div className="mb-4">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5">
                        II. Rencana Item Checklist Pemeriksaan Lapangan
                      </div>
                      <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                            <th className="border-r border-slate-300 p-2 text-center w-10">NO</th>
                            <th className="border-r border-slate-300 p-2">ITEM PEMERIKSAAN</th>
                            <th className="border-r border-slate-300 p-2 text-center w-44">HASIL PEMERIKSAAN</th>
                            <th className="p-2">CATATAN TEMUAN LAPANGAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {schedule.checkItems.map((ci, idx) => (
                            <tr key={ci.id || idx} className="hover:bg-slate-50/50">
                              <td className="border-r border-slate-300 p-2 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="border-r border-slate-300 p-2 font-medium text-slate-900">
                                {ci.name}
                              </td>
                              <td className="border-r border-slate-300 p-2 text-center text-[10px] font-mono text-slate-700">
                                [ &nbsp; ] Normal &nbsp;&nbsp;&nbsp; [ &nbsp; ] Issue
                              </td>
                              <td className="p-2 text-slate-400 text-[10px]">
                                ................................................................
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* III. Instruksi & Standar Kerja */}
                    <div className="mb-4 border border-slate-300 rounded-lg p-3 bg-slate-50/50 text-xs">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1">
                        III. Catatan & Instruksi Kerja Teknisi
                      </div>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        {schedule.description ||
                          "Teknisi wajib melakukan backup data penting sebelum tindakan pada storage/OS, memastikan grounding kelistrikan aman, membersihkan ventilasi pendingin hardware, serta mendokumentasikan foto sebelum dan sesudah pekerjaan."}
                      </p>
                    </div>
                  </>
                )}

                {/* --- MODE 2: MASTER REKAPITULASI RENCANA PM --- */}
                {!isSingle && (
                  <>
                    {/* Executive Audit Summary Table (Formal Indonesian Corporate Standard) */}
                    <div className="mb-4">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5">
                        I. Ringkasan Eksekutif Jadwal Pemeliharaan
                      </div>
                      <table className="w-full text-center border-collapse border border-slate-400 text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-400 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                            <th className="border-r border-slate-400 p-2 w-1/4">TOTAL JADWAL PM</th>
                            <th className="border-r border-slate-400 p-2 w-1/4">TERJADWAL NORMAL</th>
                            <th className="border-r border-slate-400 p-2 w-1/4">JATUH TEMPO (≤ 7 HARI)</th>
                            <th className="p-2 w-1/4">TERLAMBAT (OVERDUE)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white font-bold text-sm text-slate-900">
                            <td className="border-r border-slate-400 p-2.5">
                              {countTotal} <span className="text-xs font-normal text-slate-500">Perangkat</span>
                            </td>
                            <td className="border-r border-slate-400 p-2.5 text-slate-800">
                              {countScheduled} <span className="text-xs font-normal text-slate-500">Perangkat</span>
                            </td>
                            <td className="border-r border-slate-400 p-2.5 text-amber-900">
                              {countDueSoon} <span className="text-xs font-normal text-slate-500">Perangkat</span>
                            </td>
                            <td className="p-2.5 text-rose-900">
                              {countOverdue} <span className="text-xs font-normal text-slate-500">Perangkat</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Master Schedule Table Strictly Contained within A4 Sheet */}
                    <div className="mb-4">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-slate-800 mb-1.5">
                        II. Matriks & Daftar Rincian Rencana Kerja Pemeliharaan
                      </div>
                      <div className="border border-slate-400 overflow-hidden">
                        <table className="w-full table-fixed border-collapse text-[9.5px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800 uppercase tracking-wider text-[8.5px]">
                              <th className="border-r border-slate-400 p-1.5 text-center w-[4%]">NO</th>
                              <th className="border-r border-slate-400 p-1.5 text-left w-[17%]">KODE ASET</th>
                              <th className="border-r border-slate-400 p-1.5 text-left w-[17%]">NAMA PERANGKAT</th>
                              <th className="border-r border-slate-400 p-1.5 text-left w-[22%]">CUSTOMER / LOKASI</th>
                              <th className="border-r border-slate-400 p-1.5 text-left w-[9%]">PIC</th>
                              <th className="border-r border-slate-400 p-1.5 text-center w-[7%]">FREK</th>
                              <th className="border-r border-slate-400 p-1.5 text-center w-[10%]">TARGET</th>
                              <th className="p-1.5 text-center w-[14%]">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {schedules.map((s, idx) => {
                              const st = statusLabel(s.status)
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/60">
                                  <td className="border-r border-slate-300 p-1.5 text-center font-bold text-slate-600">{idx + 1}</td>
                                  <td className="border-r border-slate-300 p-1.5 font-mono font-bold whitespace-nowrap text-slate-950 overflow-hidden text-ellipsis">
                                    {s.asset?.assetCode || "-"}
                                  </td>
                                  <td className="border-r border-slate-300 p-1.5 font-semibold text-slate-900 overflow-hidden text-ellipsis">
                                    {s.asset?.name || s.title}
                                  </td>
                                  <td className="border-r border-slate-300 p-1.5 text-slate-800 leading-tight overflow-hidden">
                                    <div className="font-bold text-slate-950 truncate">
                                      {s.customer?.name || s.asset?.customer?.name || "-"}
                                    </div>
                                    <div className="text-[8.5px] text-slate-500 truncate">
                                      {s.location?.name || s.asset?.location?.name || "-"}
                                    </div>
                                  </td>
                                  <td className="border-r border-slate-300 p-1.5 text-slate-800 truncate">
                                    {s.asset?.pic?.name || "-"}
                                  </td>
                                  <td className="border-r border-slate-300 p-1.5 text-center text-slate-700 whitespace-nowrap font-medium text-[8.5px]">
                                    {s.intervalLabel || `${s.intervalValue} ${s.intervalUnit}`}
                                  </td>
                                  <td className="border-r border-slate-300 p-1.5 text-center font-bold text-slate-950 whitespace-nowrap text-[8.5px]">
                                    {formatDate(s.nextDueAt)}
                                  </td>
                                  <td className="p-1.5 text-center whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase inline-block border ${
                                        st === "TERLAMBAT"
                                          ? "bg-rose-50 text-rose-800 border-rose-300"
                                          : st === "JATUH TEMPO"
                                          ? "bg-amber-50 text-amber-800 border-amber-300"
                                          : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      }`}
                                    >
                                      {st}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Lembar Tanda Tangan & Pengesahan Resmi (Spacious & Clean Standard) */}
              <div className="pt-4 border-t-2 border-slate-950 mt-6">
                <div className="font-bold text-[10.5px] text-slate-700 uppercase tracking-wider mb-2.5">
                  III. Lembar Pengajuan & Pengesahan Atasan
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  {/* Kolom 1: Teknisi IT */}
                  <div className="border border-slate-400 rounded-lg p-3 flex flex-col justify-between h-36 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700">Diajukan Oleh (Teknisi IT):</span>
                    <div className="space-y-0.5">
                      <div className="w-40 mx-auto border-b border-slate-950 mb-1"></div>
                      <strong className="text-slate-950 block font-black text-xs uppercase tracking-wide truncate">
                        ( {technicianName} )
                      </strong>
                      <span className="text-[10px] text-slate-500 font-medium">Tanggal: {todayFormatted}</span>
                    </div>
                  </div>

                  {/* Kolom 2: IT Supervisor */}
                  <div className="border border-slate-400 rounded-lg p-3 flex flex-col justify-between h-36 bg-white shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-700">Disetujui Oleh (IT Supervisor):</span>
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
                        ( {isSingle ? picName : "PERWAKILAN CUSTOMER"} )
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
              Dokumen pengajuan resmi dapat dicetak atau disimpan sebagai <strong>PDF A4</strong> untuk arsip dan persetujuan atasan.
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

        {/* PRINTABLE ELEMENT (Only visible when printing via @media print) */}
        <div id="printable-pm-plan-report" className="hidden print:block text-slate-950 text-xs leading-relaxed bg-white">
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

              {/* Official Box on Print */}
              <div className="border border-slate-900 p-1 text-[9px] font-mono leading-tight bg-slate-50 shrink-0 w-48 text-left">
                <div className="font-bold border-b border-slate-400 pb-0.5 mb-1 text-center bg-slate-900 text-white -mx-1 -mt-1 p-0.5 text-[8.5px] uppercase">
                  {isSingle ? "SURAT TUGAS PM IT" : "REKAPITULASI RENCANA PM"}
                </div>
                <div className="grid grid-cols-2 gap-x-1">
                  <span className="text-slate-600">No. Dok:</span>
                  <strong className="text-slate-950 text-right truncate font-bold">{docNumber}</strong>
                  <span className="text-slate-600">Tanggal:</span>
                  <span className="text-slate-950 text-right">{todayFormatted}</span>
                  <span className="text-slate-600">Status:</span>
                  <strong className="text-slate-950 text-right">Menunggu ACC</strong>
                </div>
              </div>
            </div>

            <div className="mt-2.5 border-b-2 border-slate-950"></div>
            <div className="mt-0.5 border-b border-slate-400"></div>
          </div>

          {/* Title on Print */}
          <div className="text-center my-2.5">
            <h1 className="text-sm font-black uppercase text-slate-950 underline decoration-2">
              {isSingle
                ? "Surat Tugas & Rencana Kerja Preventive Maintenance IT"
                : "Laporan Rekapitulasi Rencana Preventive Maintenance IT"}
            </h1>
            <p className="text-[9.5px] text-slate-600 mt-0.5 font-medium">
              {isSingle
                ? "Lembar Pengajuan & Persetujuan Rencana Pemeliharaan Berkala ke Atasan"
                : `Agenda Pemeliharaan Rutin Seluruh Aset IT • Periode: ${currentMonthName} ${yyyy}`}
            </p>
          </div>

          {/* Mode 1: Single Print */}
          {isSingle && schedule && (
            <>
              <div className="mb-2.5 border border-slate-400 p-2.5 rounded text-[10px] bg-slate-50/50">
                <div className="font-bold uppercase text-[9.5px] mb-1.5 border-b border-slate-300 pb-0.5 text-slate-800">
                  I. Data Perangkat & Penempatan
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9.5px]">
                  <div>• Perangkat: <strong>{assetName}</strong></div>
                  <div>• Customer / Divisi: <strong>{customerName}</strong></div>
                  <div>• Kode Aset: <strong className="font-mono">{assetCode}</strong></div>
                  <div>• Lokasi / Ruangan: {locationName}</div>
                  <div>• Brand / Model: {schedule.asset?.brandModel || "-"}</div>
                  <div>• PIC Unit: <strong>{picName}</strong></div>
                  <div>• Frekuensi: {schedule.intervalLabel || `${schedule.intervalValue} ${schedule.intervalUnit}`}</div>
                  <div>• Target Tanggal PM: <strong>{formatDate(schedule.nextDueAt)}</strong></div>
                </div>
              </div>

              <div className="mb-2.5">
                <div className="font-bold uppercase text-[9.5px] mb-1 text-slate-800">
                  II. Rencana Item Checklist Pemeriksaan Lapangan
                </div>
                <table className="w-full text-left border-collapse border border-slate-400 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                      <th className="border-r border-slate-400 p-1 text-center w-7">NO</th>
                      <th className="border-r border-slate-400 p-1">ITEM PEMERIKSAAN</th>
                      <th className="border-r border-slate-400 p-1 text-center w-36">VERIFIKASI HASIL</th>
                      <th className="p-1">CATATAN TEMUAN LAPANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.checkItems.map((ci, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border-r border-slate-400 p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border-r border-slate-400 p-1 font-medium">{ci.name}</td>
                        <td className="border-r border-slate-400 p-1 text-center text-[9px] font-mono">[ &nbsp; ] Normal &nbsp;&nbsp;&nbsp; [ &nbsp; ] Issue</td>
                        <td className="p-1 text-slate-300">................................................</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Mode 2: Master Print */}
          {!isSingle && (
            <>
              {/* Executive summary table on print */}
              <div className="mb-2.5">
                <table className="w-full text-center border-collapse border border-slate-400 text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800 uppercase">
                      <th className="border-r border-slate-400 p-1 w-1/4">TOTAL JADWAL PM</th>
                      <th className="border-r border-slate-400 p-1 w-1/4">TERJADWAL NORMAL</th>
                      <th className="border-r border-slate-400 p-1 w-1/4">JATUH TEMPO (≤ 7 HARI)</th>
                      <th className="p-1 w-1/4">TERLAMBAT (OVERDUE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold text-[10px]">
                      <td className="border-r border-slate-400 p-1">{countTotal} Perangkat</td>
                      <td className="border-r border-slate-400 p-1">{countScheduled} Perangkat</td>
                      <td className="border-r border-slate-400 p-1">{countDueSoon} Perangkat</td>
                      <td className="p-1">{countOverdue} Perangkat</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Master table on print with explicit fixed widths */}
              <div className="mb-2.5 border border-slate-400 overflow-hidden">
                <table className="w-full table-fixed border-collapse text-[8.5px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase text-[8px]">
                      <th className="border-r border-slate-400 p-1 text-center w-[4%]">NO</th>
                      <th className="border-r border-slate-400 p-1 text-left w-[17%]">KODE ASET</th>
                      <th className="border-r border-slate-400 p-1 text-left w-[17%]">NAMA PERANGKAT</th>
                      <th className="border-r border-slate-400 p-1 text-left w-[22%]">CUSTOMER / LOKASI</th>
                      <th className="border-r border-slate-400 p-1 text-left w-[9%]">PIC</th>
                      <th className="border-r border-slate-400 p-1 text-center w-[7%]">FREK</th>
                      <th className="border-r border-slate-400 p-1 text-center w-[10%]">TARGET</th>
                      <th className="p-1 text-center w-[14%]">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-300">
                        <td className="border-r border-slate-400 p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border-r border-slate-400 p-1 font-mono font-bold whitespace-nowrap overflow-hidden text-ellipsis">{s.asset?.assetCode || "-"}</td>
                        <td className="border-r border-slate-400 p-1 font-medium overflow-hidden text-ellipsis">{s.asset?.name || s.title}</td>
                        <td className="border-r border-slate-400 p-1 leading-tight overflow-hidden">
                          <div className="font-bold truncate">{s.customer?.name || s.asset?.customer?.name || "-"}</div>
                          <div className="text-[7.5px] text-slate-600 truncate">{s.location?.name || s.asset?.location?.name || "-"}</div>
                        </td>
                        <td className="border-r border-slate-400 p-1 truncate">{s.asset?.pic?.name || "-"}</td>
                        <td className="border-r border-slate-400 p-1 text-center whitespace-nowrap">{s.intervalLabel || `${s.intervalValue} ${s.intervalUnit}`}</td>
                        <td className="border-r border-slate-400 p-1 text-center font-bold whitespace-nowrap">{formatDate(s.nextDueAt)}</td>
                        <td className="p-1 text-center font-bold uppercase text-[7.5px] whitespace-nowrap">{statusLabel(s.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Signatures on Print */}
          <div className="pt-2 border-t-2 border-slate-950 mt-4">
            <div className="grid grid-cols-3 gap-3 text-center text-[9.5px]">
              <div className="border border-slate-400 p-2 flex flex-col justify-between h-32">
                <span className="font-bold text-slate-800">Diajukan Oleh (Teknisi IT):</span>
                <div>
                  <div className="w-28 mx-auto border-b border-slate-900 mb-0.5"></div>
                  <strong className="block font-bold uppercase truncate">( {technicianName} )</strong>
                  <span className="text-[8.5px] text-slate-600">Tgl: {todayFormatted}</span>
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
                  <strong className="block font-bold uppercase truncate">( {isSingle ? picName : "PERWAKILAN CUSTOMER"} )</strong>
                  <span className="text-[8.5px] text-slate-600">Tgl: ...../...../2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  )
}
