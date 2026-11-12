"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  Tag,
  User,
  Wrench,
  X,
} from "lucide-react"
import type { CompanyProfile } from "@/lib/itOslDashboardPdf"
import {
  downloadTicketReportPdf,
  printTicketReportPdf,
  type TicketReportTicket,
} from "@/lib/itOslTicketReportPdf"

const STATUS_LABEL: Record<string, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Dikerjakan",
  PENDING: "Ditunda",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
  CANCELLED: "Dibatalkan",
  DUPLICATE: "Duplikat",
  REOPENED: "Dibuka Lagi",
}

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-sky-100 text-sky-700 border-sky-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  RESOLVED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  CLOSED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REOPENED: "bg-rose-100 text-rose-700 border-rose-200",
}

const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const REPORT_SECTIONS = [
  { icon: FileText, label: "Ringkasan eksekutif otomatis" },
  { icon: Tag, label: "Identitas tiket, aset & PIC" },
  { icon: Clock3, label: "Linimasa respon & SLA" },
  { icon: Wrench, label: "Analisa, tindakan & hasil" },
  { icon: ShieldCheck, label: "Sparepart, kendala & kronologi" },
  { icon: BookOpen, label: "Pembelajaran teknisi & pencegahan" },
  { icon: ImageIcon, label: "Lampiran foto besar di halaman terakhir" },
]

interface TicketReportModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: TicketReportTicket | null
  apiBaseUrl: string
  fallbackApiBaseUrl?: string
  authHeaders: Record<string, string>
  currentUserName?: string | null
  initialDetail?: TicketReportTicket | null
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
  }
}

export function TicketReportModal({
  isOpen,
  onClose,
  ticket,
  apiBaseUrl,
  fallbackApiBaseUrl,
  authHeaders,
  currentUserName,
  initialDetail,
}: TicketReportModalProps) {
  const [detail, setDetail] = useState<TicketReportTicket | null>(null)
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<"download" | "print" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [includePhotos, setIncludePhotos] = useState(true)

  useEffect(() => {
    if (!isOpen || !ticket?.id) return

    let cancelled = false
    const preloaded =
      initialDetail && initialDetail.id === ticket.id ? (initialDetail as TicketReportTicket) : null

    setDetail(preloaded)
    setLoading(!preloaded)
    setError(null)
    setGenerating(null)

    const load = async () => {
      try {
        const [ticketResponse, companyResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/it-osl/tickets/${ticket.id}`, { headers: authHeaders }),
          fetch(`${apiBaseUrl}/api/company`, { headers: authHeaders }),
        ])

        if (cancelled) return

        if (ticketResponse.ok) {
          setDetail(await ticketResponse.json())
        } else if (!preloaded) {
          setError(
            "Detail tiket tidak dapat dimuat, sehingga foto dan kronologi belum tersedia. Tutup lalu buka kembali laporan untuk mencoba lagi."
          )
        }

        if (companyResponse.ok) {
          setCompany(await companyResponse.json())
        }
      } catch {
        if (!cancelled && !preloaded) {
          setError(
            "Tidak dapat terhubung ke server backend, sehingga foto dan kronologi belum tersedia. Tutup lalu buka kembali laporan untuk mencoba lagi."
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ticket?.id])

  const reportTicket = detail || ticket

  const photoCount = useMemo(() => {
    if (!reportTicket) return 0
    const urls = new Set<string>()
    ;(reportTicket.attachments || []).forEach((item) => item.url && urls.add(item.url))
    ;(reportTicket.workItems || []).forEach((item) => {
      ;(item.attachments || []).forEach((attachment) => attachment.url && urls.add(attachment.url))
    })
    return urls.size
  }, [reportTicket])

  const handleDownload = async () => {
    if (!reportTicket) return
    setGenerating("download")
    setError(null)
    try {
      await downloadTicketReportPdf(reportTicket, {
        company,
        apiBaseUrl,
        fallbackApiBaseUrl,
        userName: currentUserName,
        includePhotos,
      })
    } catch (err) {
      console.error(err)
      setError("Gagal membuat PDF. Silakan coba lagi atau kurangi jumlah foto dokumentasi.")
    } finally {
      setGenerating(null)
    }
  }

  const handlePrint = async () => {
    if (!reportTicket) return
    setGenerating("print")
    setError(null)
    try {
      await printTicketReportPdf(reportTicket, {
        company,
        apiBaseUrl,
        fallbackApiBaseUrl,
        userName: currentUserName,
        includePhotos,
      })
    } catch (err) {
      console.error(err)
      setError("Gagal menyiapkan cetak. Silakan coba unduh PDF terlebih dahulu.")
    } finally {
      setGenerating(null)
    }
  }

  const busy = loading || generating !== null || (!detail && Boolean(error))

  return (
    <AnimatePresence>
      {isOpen && ticket && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92dvh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <FileText size={19} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm tracking-tight">Laporan Ringkasan Tiket</h3>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[9px] font-mono font-bold">
                      PDF · A4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Laporan profesional per tiket sekaligus materi pembelajaran teknisi lain
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50">
              {/* Ticket summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[11px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                    {ticket.ticketNumber}
                  </span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      STATUS_TONE[ticket.status || ""] || STATUS_TONE.NEW
                    }`}
                  >
                    {STATUS_LABEL[ticket.status || ""] || ticket.status || "-"}
                  </span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      SEVERITY_TONE[ticket.severity || ""] || SEVERITY_TONE.MEDIUM
                    }`}
                  >
                    {ticket.severity || "-"}
                  </span>
                </div>

                <p className="mt-2.5 text-sm font-bold text-slate-900 leading-snug break-words">
                  {ticket.summary}
                </p>

                <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[11px] text-slate-500">
                  <p className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{ticket.location?.name || "-"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate">
                      {ticket.category?.groupName ? `${ticket.category.groupName} › ` : ""}
                      {ticket.category?.name || "Umum"}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 min-w-0">
                    <Clock3 size={12} className="text-slate-400 shrink-0" />
                    <span>{formatDate(ticket.createdAt)}</span>
                  </p>
                  <p className="flex items-center gap-1.5 min-w-0">
                    <User size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {ticket.assignedUser?.name || ticket.assignedUser?.email || "Belum ditugaskan"}
                    </span>
                  </p>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 text-[11px] font-bold text-indigo-700">
                  <Loader2 size={15} className="animate-spin shrink-0" />
                  Memuat detail tiket, kronologi, dan dokumentasi…
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] text-rose-700">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Included sections */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Isi Laporan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {REPORT_SECTIONS.map((section) => (
                    <div
                      key={section.label}
                      className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-700"
                    >
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <section.icon size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos toggle */}
              <button
                type="button"
                onClick={() => setIncludePhotos((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-indigo-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <ImageIcon size={16} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">Sertakan dokumentasi foto</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {photoCount > 0
                        ? `${Math.min(photoCount, 8)} dari ${photoCount} foto akan dilampirkan`
                        : "Tidak ada foto pada tiket ini"}
                    </p>
                  </div>
                </div>
                <span
                  className={`relative w-10 h-5 rounded-full transition shrink-0 ${
                    includePhotos ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      includePhotos ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-[10px] leading-relaxed text-amber-800">
                <strong>Tips:</strong> gunakan bagian <em>Pembelajaran Teknisi</em> pada PDF sebagai bahan
                briefing atau knowledge sharing. Kolom verifikasi dapat ditandatangani setelah dokumen dicetak.
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition active:scale-95"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={busy}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === "print" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                  <span className="hidden sm:inline">Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/25 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {generating === "download" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>{generating === "download" ? "Menyiapkan…" : "Download PDF"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
