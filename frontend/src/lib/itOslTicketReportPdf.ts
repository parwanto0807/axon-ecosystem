/**
 * Generator Laporan Ringkasan Tiket IT-OSL (PDF A4 Portrait).
 *
 * Dokumen ini dirancang untuk dua kebutuhan sekaligus:
 *  1. Laporan resmi per tiket (serah terima / lampiran laporan).
 *  2. Materi pembelajaran teknisi lain (analisa, tindakan, kronologi,
 *     sparepart, kendala, dan rekomendasi pencegahan).
 *
 * Layout dibuat modern dengan jsPDF + AutoTable tanpa render browser,
 * sehingga hasil unduhan & cetak konsisten di semua perangkat.
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { CompanyProfile } from "./itOslDashboardPdf"

type RGB = [number, number, number]

export interface TicketReportAttachment {
  id?: string
  url: string
  fileName?: string | null
  mimeType?: string | null
  type?: string | null
}

export interface TicketReportWorkItem {
  id?: string
  phase: string
  title?: string | null
  description: string
  status?: string | null
  createdAt?: string | null
  creator?: { name?: string | null } | null
  attachments?: TicketReportAttachment[]
}

export interface TicketReportPending {
  id?: string
  reason: string
  externalParty?: string | null
  notes?: string | null
  startedAt?: string | null
  endedAt?: string | null
  expectedResumeAt?: string | null
}

export interface TicketReportPart {
  id?: string
  partName: string
  quantity: number
  unit: string
  notes?: string | null
}

export interface TicketReportTicket {
  id: string
  ticketNumber: string
  summary: string
  status?: string | null
  severity?: string | null
  ticketType?: string | null
  slaStatus?: string | null
  frtMinutes?: number | null
  reporterName?: string | null
  reportChannel?: string | null
  createdAt?: string | null
  reportedAt?: string | null
  acknowledgedAt?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  updatedAt?: string | null
  rootCause?: string | null
  correctiveAction?: string | null
  solutionCategory?: string | null
  assetCondition?: string | null
  isPreventable?: boolean | null
  reopenedCount?: number | null
  customer?: { name?: string | null; code?: string | null } | null
  location?: { name?: string | null; address?: string | null } | null
  category?: { name?: string | null; groupName?: string | null } | null
  asset?: {
    name?: string | null
    assetCode?: string | null
    brandModel?: string | null
    serialNumber?: string | null
    assetType?: string | null
    status?: string | null
    warrantyUntil?: string | null
    location?: { name?: string | null } | null
  } | null
  pic?: {
    name?: string | null
    position?: string | null
    department?: string | null
    phone?: string | null
    email?: string | null
  } | null
  assignedUser?: { name?: string | null; email?: string | null } | null
  creator?: { name?: string | null } | null
  workItems?: TicketReportWorkItem[]
  pendings?: TicketReportPending[]
  parts?: TicketReportPart[]
  attachments?: TicketReportAttachment[]
}

export interface TicketReportPdfOptions {
  company?: CompanyProfile | null
  apiBaseUrl?: string
  /** Origin cadangan untuk memuat foto (mis. production) saat file tidak ada di backend lokal. */
  fallbackApiBaseUrl?: string
  userName?: string | null
  includePhotos?: boolean
}

// ── Palet warna (selaras dengan UI dashboard) ────────────────────────────────
const C = {
  ink: [15, 23, 42] as RGB,
  inkSoft: [51, 65, 85] as RGB,
  muted: [100, 116, 139] as RGB,
  faint: [148, 163, 184] as RGB,
  border: [226, 232, 240] as RGB,
  card: [248, 250, 252] as RGB,
  indigo: [79, 70, 229] as RGB,
  indigoSoft: [238, 242, 255] as RGB,
  emerald: [5, 150, 105] as RGB,
  emeraldSoft: [236, 253, 245] as RGB,
  amber: [217, 119, 6] as RGB,
  amberSoft: [255, 251, 235] as RGB,
  rose: [225, 29, 72] as RGB,
  roseSoft: [255, 241, 242] as RGB,
  sky: [2, 132, 199] as RGB,
  white: [255, 255, 255] as RGB,
}

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

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "Kritis",
  HIGH: "Tinggi",
  MEDIUM: "Sedang",
  LOW: "Rendah",
}

const TICKET_TYPE_LABEL: Record<string, string> = {
  INCIDENT: "Insiden",
  REQUEST: "Permintaan Layanan",
  PM: "Preventive Maintenance",
}

const ASSET_CONDITION_LABEL: Record<string, string> = {
  NORMAL: "Normal / Laik Pakai",
  TEMPORARY: "Perbaikan Sementara",
  BROKEN: "Rusak / Tidak Laik",
}

function statusTone(status?: string | null): { fg: RGB; soft: RGB } {
  switch (status) {
    case "IN_PROGRESS":
      return { fg: C.sky, soft: [224, 242, 254] }
    case "PENDING":
      return { fg: C.amber, soft: C.amberSoft }
    case "RESOLVED":
      return { fg: C.indigo, soft: C.indigoSoft }
    case "CLOSED":
      return { fg: C.emerald, soft: C.emeraldSoft }
    case "REOPENED":
      return { fg: C.rose, soft: C.roseSoft }
    default:
      return { fg: [71, 85, 105], soft: [241, 245, 249] }
  }
}

function severityTone(severity?: string | null): RGB {
  if (severity === "CRITICAL") return C.rose
  if (severity === "HIGH") return C.amber
  if (severity === "LOW") return C.emerald
  return C.amber
}

// ── Helper format ───────────────────────────────────────────────────────────
const fmtDateTime = (value?: string | null) => {
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

const fmtDateShort = (value?: string | null) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "-"
  }
}

const fmtTime = (value?: string | null) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
  }
}

const fmtDuration = (value?: number | null) => {
  if (value == null || !Number.isFinite(value)) return "-"
  const minutes = Math.max(0, Math.round(value))
  if (minutes < 1) return "<1 mnt"
  if (minutes < 60) return `${minutes} mnt`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `${hours}j ${rest}m` : `${hours} jam`
  const days = Math.floor(hours / 24)
  return `${days}h ${hours % 24}j`
}

const minutesBetween = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(diff) || diff < 0) return null
  return diff / 60000
}

const truncate = (value: string, max = 260) => {
  const clean = (value || "").replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

const thresholdMinutes = (severity?: string | null) => {
  if (severity === "CRITICAL") return 15
  if (severity === "MEDIUM") return 60
  return 240
}

const getFrtMinutes = (ticket: TicketReportTicket) => {
  if (ticket.frtMinutes != null) return ticket.frtMinutes
  return minutesBetween(ticket.createdAt, ticket.acknowledgedAt)
}

const getSlaStatus = (ticket: TicketReportTicket) => {
  const threshold = thresholdMinutes(ticket.severity)
  const frt = getFrtMinutes(ticket)
  if (frt != null) return frt > threshold ? "BREACH" : "OK"
  if (["CLOSED", "CANCELLED", "DUPLICATE"].includes(ticket.status || "")) return "OK"
  const age = minutesBetween(ticket.createdAt, new Date().toISOString())
  return age != null && age > threshold ? "BREACH" : "OK"
}

const getTotalMinutes = (ticket: TicketReportTicket) => {
  const end =
    ticket.resolvedAt ||
    ticket.closedAt ||
    (["RESOLVED", "CLOSED"].includes(ticket.status || "") ? ticket.updatedAt : null)
  return minutesBetween(ticket.createdAt, end || new Date().toISOString())
}

const phaseTone = (phase: string): { label: string; color: RGB } => {
  if (phase === "PENGERJAAN") return { label: "Pengerjaan", color: C.amber }
  if (phase === "HASIL") return { label: "Hasil", color: C.emerald }
  return { label: "Analisa", color: C.indigo }
}

const resolveUrl = (url: string, apiBase: string) => {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  const base = (apiBase || "").replace(/\/$/, "")
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`
}

function fitText(doc: jsPDF, text: string, maxWidth: number, size: number, style: "normal" | "bold" = "normal") {
  const value = (text || "-").replace(/\s+/g, " ").trim()
  doc.setFont("helvetica", style)
  doc.setFontSize(size)
  if (doc.getTextWidth(value) <= maxWidth) return value
  let result = value
  while (result.length > 1 && doc.getTextWidth(`${result}…`) > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result.trimEnd()}…`
}

// ── Ringkasan otomatis ──────────────────────────────────────────────────────
function buildExecutiveSummary(ticket: TicketReportTicket) {
  const statusLabel = STATUS_LABEL[ticket.status || ""] || ticket.status || "Baru"
  const category = [ticket.category?.groupName, ticket.category?.name].filter(Boolean).join(" › ") || "umum"
  const technician = ticket.assignedUser?.name || ticket.assignedUser?.email || ticket.creator?.name
  const threshold = thresholdMinutes(ticket.severity)
  const frt = getFrtMinutes(ticket)
  const sla = getSlaStatus(ticket)
  const total = getTotalMinutes(ticket)

  const sentences: string[] = []
  sentences.push(
    `Tiket ${ticket.ticketNumber} dilaporkan pada ${fmtDateTime(ticket.createdAt)}${
      ticket.reporterName ? ` oleh ${ticket.reporterName}` : ""
    }${ticket.reportChannel ? ` melalui ${ticket.reportChannel}` : ""}.`
  )
  sentences.push(
    `Gangguan tercatat pada kategori ${category} di ${ticket.location?.name || "lokasi terkait"}${
      ticket.asset?.name
        ? ` dengan objek aset ${ticket.asset.name}${ticket.asset.assetCode ? ` (${ticket.asset.assetCode})` : ""}`
        : ""
    }.`
  )
  sentences.push(
    `Penanganan dilakukan oleh ${technician || "tim IT-OSL"} dan berstatus ${statusLabel.toLowerCase()}.`
  )
  if (frt != null) {
    sentences.push(
      `Respon pertama tercatat dalam ${fmtDuration(frt)} dari target SLA ${threshold} menit sehingga tiket ${
        sla === "BREACH" ? "melewati batas SLA" : "memenuhi batas SLA"
      }.`
    )
  } else if (sla === "BREACH") {
    sentences.push(`Tiket belum direspons dan telah melewati target SLA ${threshold} menit.`)
  }
  if (["RESOLVED", "CLOSED"].includes(ticket.status || "") && total != null) {
    sentences.push(`Total waktu penanganan hingga selesai adalah ${fmtDuration(total)}.`)
  }
  if (ticket.rootCause) {
    sentences.push(`Akar masalah yang tercatat: ${truncate(ticket.rootCause, 220)}`)
  }

  return sentences.join(" ")
}

const RECOMMENDATION_RULES: { keys: string[]; text: string }[] = [
  {
    keys: ["printer", "cetak", "cartridge", "toner", "tinta", "pita", "ribbon", "print head", "scanner"],
    text: "Lakukan pembersihan berkala pada print head/roller dan cek kualitas hasil cetak. Sediakan stok consumable minimum (toner/pita) serta jadwalkan penggantian sebelum habis.",
  },
  {
    keys: ["jaringan", "network", "wifi", "lan", "internet", "router", "switch", "access point", "kabel", "ip", "dns"],
    text: "Periksa kestabilan kabel dan konektor, dokumentasikan topologi/IP, serta lakukan monitoring perangkat jaringan. Siapkan prosedur isolasi gangguan dari perangkat, kabel, hingga uplink.",
  },
  {
    keys: ["server", "nas", "storage", "database", "backup", "virtual"],
    text: "Pantau resource server (CPU, RAM, disk, suhu), review log secara berkala, dan pastikan backup berjalan. Dokumentasikan konfigurasi kritis dan prosedur pemulihan.",
  },
  {
    keys: ["komputer", "pc", "laptop", "ram", "ssd", "hdd", "harddisk", "prosesor", "cpu", "lambat", "lemot", "hang"],
    text: "Terapkan checklist kesehatan perangkat (kapasitas storage, memori, suhu, update OS). Jadwalkan housekeeping dan pertimbangkan upgrade bila performa terus menurun.",
  },
  {
    keys: ["listrik", "daya", "power", "ups", "psu", "adaptor", "tegangan", "arus", "korsleting", "stop kontak"],
    text: "Periksa kestabilan daya, kondisi UPS/PSU, dan grounding instalasi. Hindari beban berlebih pada satu titik listrik serta lakukan pengukuran tegangan secara berkala.",
  },
  {
    keys: ["aplikasi", "software", "erp", "sistem", "login", "password", "akun", "lisensi", "update"],
    text: "Dokumentasikan konfigurasi aplikasi dan prosedur standar pengguna. Terapkan jadwal update, pengelolaan akun, serta uji fungsi setelah perubahan konfigurasi.",
  },
  {
    keys: ["monitor", "display", "layar", "proyektor", "lcd", "hdmi", "vga"],
    text: "Cek kabel/sinyal dan kondisi konektor sebelum mengganti unit. Bersihkan perangkat secara berkala dan catat riwayat gangguan untuk deteksi dini.",
  },
  {
    keys: ["cctv", "kamera", "nvr", "dvr"],
    text: "Lakukan pemeriksaan berkala pada kamera, kabel, dan media penyimpanan NVR/DVR. Pastikan kapasitas rekaman dan kualitas gambar sesuai kebutuhan.",
  },
]

function buildPrevention(ticket: TicketReportTicket) {
  const haystack = [
    ticket.summary,
    ticket.category?.name,
    ticket.category?.groupName,
    ticket.asset?.name,
    ticket.asset?.assetType,
    ticket.rootCause,
    ticket.correctiveAction,
    ...(ticket.workItems || []).map((item) => `${item.title || ""} ${item.description}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const matched = RECOMMENDATION_RULES.filter((rule) => rule.keys.some((key) => haystack.includes(key))).slice(0, 2)
  const base =
    matched.length > 0
      ? matched.map((rule) => rule.text).join(" ")
      : "Lakukan inspeksi preventif berkala pada aset terkait, catat riwayat gangguan, dan gunakan temuan pada laporan ini sebagai checklist pemeriksaan berikutnya."

  const extras: string[] = []
  if (ticket.isPreventable) {
    extras.push("Tiket ditandai dapat dicegah (preventable) — prioritaskan inspeksi preventif dan checklist berkala.")
  }
  if ((ticket.reopenedCount || 0) > 0) {
    extras.push(
      `Tiket pernah dibuka kembali ${ticket.reopenedCount} kali — pastikan verifikasi akar masalah tuntas sebelum menutup tiket.`
    )
  }

  return [base, ...extras].join(" ")
}

function buildLearningRows(ticket: TicketReportTicket): (string | number)[][] {
  const threshold = thresholdMinutes(ticket.severity)
  const frt = getFrtMinutes(ticket)
  const sla = getSlaStatus(ticket)
  const total = getTotalMinutes(ticket)
  const category = [ticket.category?.groupName, ticket.category?.name].filter(Boolean).join(" › ") || "Umum"
  const analisa = (ticket.workItems || [])
    .filter((item) => item.phase === "ANALISA" && item.description)
    .map((item) => item.description)
  const pengerjaan = (ticket.workItems || [])
    .filter((item) => item.phase === "PENGERJAAN" && item.description)
    .map((item) => item.description)
  const hasil = (ticket.workItems || [])
    .filter((item) => item.phase === "HASIL" && item.description)
    .map((item) => item.description)

  const rootCause =
    ticket.rootCause ||
    (analisa.length ? analisa.join(" ") : "Belum ada catatan akar masalah yang terstruktur pada tiket ini.")
  const solution =
    [ticket.solutionCategory, ticket.correctiveAction].filter(Boolean).join(" — ") ||
    (pengerjaan.length ? pengerjaan.join(" ") : "Belum ada catatan tindakan perbaikan.")
  const result = hasil.length
    ? hasil.join(" ")
    : ticket.assetCondition
      ? `Kondisi aset setelah penanganan: ${ASSET_CONDITION_LABEL[ticket.assetCondition] || ticket.assetCondition}`
      : "Belum ada catatan hasil verifikasi."

  const hints: string[] = []
  if (analisa.length) hints.push(`Langkah diagnosis: ${truncate(analisa[0], 180)}`)
  if (pengerjaan.length) hints.push(`Tindakan kunci: ${truncate(pengerjaan[0], 180)}`)
  if (ticket.parts && ticket.parts.length > 0) {
    hints.push(
      `Sparepart terpasang: ${ticket.parts
        .slice(0, 4)
        .map((part) => `${part.partName} (${part.quantity} ${part.unit})`)
        .join(", ")}`
    )
  }
  hints.push("Gunakan tabel kronologi pekerjaan pada laporan ini sebagai referensi urutan penanganan.")

  return [
    ["Pola Masalah", `${category} · ${TICKET_TYPE_LABEL[ticket.ticketType || ""] || ticket.ticketType || "Insiden"} · Severity ${SEVERITY_LABEL[ticket.severity || ""] || ticket.severity || "-"}`],
    ["Akar Masalah", rootCause],
    ["Solusi Efektif", solution],
    ["Hasil Verifikasi", result],
    [
      "Benchmark Waktu",
      `Respon pertama ${fmtDuration(frt)} (target ${threshold} menit · ${sla === "BREACH" ? "melewati SLA" : "dalam SLA"}) · Total penanganan ${fmtDuration(total)}.`,
    ],
    ["Rekomendasi Pencegahan", buildPrevention(ticket)],
    ["Catatan untuk Teknisi Lain", hints.join(" ")],
  ]
}

// ── Writer: pengatur tata letak & pergantian halaman ────────────────────────
class ReportWriter {
  doc: jsPDF
  y = 14
  readonly W = 210
  readonly H = 297
  readonly M = 14
  readonly contentW = 182
  readonly bottom = 279
  readonly newPageTop = 21

  constructor(doc: jsPDF) {
    this.doc = doc
  }

  setFont(size: number, style: "normal" | "bold" | "italic" = "normal", color: RGB = C.ink) {
    this.doc.setFont("helvetica", style)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color[0], color[1], color[2])
  }

  ensure(height: number) {
    if (this.y + height > this.bottom) {
      this.doc.addPage()
      this.y = this.newPageTop
      return true
    }
    return false
  }

  section(number: string, title: string, subtitle?: string) {
    this.ensure(subtitle ? 16 : 12)
    const d = this.doc
    d.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
    d.roundedRect(this.M, this.y, 6.4, 6.4, 1.6, 1.6, "F")
    this.setFont(7, "bold", C.white)
    d.text(number, this.M + 3.2, this.y + 4.3, { align: "center" })
    this.setFont(9.4, "bold", C.ink)
    d.text(title, this.M + 9.8, this.y + 4.6)
    if (subtitle) {
      this.setFont(6.8, "normal", C.muted)
      d.text(subtitle, this.M + 9.8, this.y + 8.5)
    }
    this.y += subtitle ? 12.5 : 9.5
  }

  paragraph(
    text: string,
    options: {
      size?: number
      color?: RGB
      lineHeight?: number
      x?: number
      width?: number
      style?: "normal" | "bold" | "italic"
    } = {}
  ) {
    const size = options.size ?? 7.7
    const lineHeight = options.lineHeight ?? 3.8
    const x = options.x ?? this.M
    const width = options.width ?? this.contentW
    const color = options.color ?? C.inkSoft
    const style = options.style ?? "normal"
    // Atur font SEBELUM wrapping agar lebar baris dihitung dengan ukuran huruf
    // yang benar. Jika tidak, teks bisa melewati margin kanan (offside).
    this.setFont(size, style, color)
    const lines = this.doc.splitTextToSize(text || "-", width) as string[]

    lines.forEach((line) => {
      if (this.y + lineHeight > this.bottom) {
        this.doc.addPage()
        this.y = this.newPageTop
      }
      this.setFont(size, style, color)
      this.doc.text(line, x, this.y + 2.6)
      this.y += lineHeight
    })
  }

  labelledParagraph(label: string, text: string) {
    this.ensure(9)
    this.setFont(6.4, "bold", C.muted)
    this.doc.text(label.toUpperCase(), this.M, this.y + 2.4)
    this.y += 4.4
    this.paragraph(text, { size: 7.7, lineHeight: 3.9 })
    this.y += 1.8
  }

  bullets(items: { prefix?: string; text: string }[]) {
    items.forEach((item) => {
      this.ensure(5.2)
      this.doc.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
      this.doc.circle(this.M + 1.2, this.y + 1.5, 0.65, "F")
      const content = item.prefix ? `${item.prefix} — ${item.text}` : item.text
      this.paragraph(content, { size: 7.2, lineHeight: 3.5, x: this.M + 4.4, width: this.contentW - 4.4 })
      this.y += 0.9
    })
    this.y += 1.2
  }

  kvCard(items: { label: string; value: string }[]) {
    const rows = Math.ceil(items.length / 2)
    const rowHeight = 9.2
    const cardHeight = rows * rowHeight + 1.2
    this.ensure(cardHeight + 3)
    const top = this.y
    const d = this.doc
    d.setFillColor(C.card[0], C.card[1], C.card[2])
    d.setDrawColor(C.border[0], C.border[1], C.border[2])
    d.setLineWidth(0.15)
    d.roundedRect(this.M, top, this.contentW, cardHeight, 2, 2, "FD")

    const innerPadding = 4
    const innerWidth = this.contentW - innerPadding * 2
    const colGap = 6
    const colWidth = (innerWidth - colGap) / 2

    items.forEach((item, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = this.M + innerPadding + col * (colWidth + colGap)
      const y = top + 3.9 + row * rowHeight
      this.setFont(5.7, "bold", C.muted)
      d.text(item.label.toUpperCase(), x, y)
      this.setFont(7.2, "bold", C.ink)
      d.text(fitText(d, item.value, colWidth, 7.2, "bold"), x, y + 3.6)
    })

    this.y = top + cardHeight + 4.5
  }

  kpiCards(cards: { label: string; value: string; sub?: string; accent: RGB }[]) {
    const gap = 2.5
    const width = (this.contentW - gap * (cards.length - 1)) / cards.length
    const height = 17
    this.ensure(height + 4)
    const top = this.y
    const d = this.doc

    cards.forEach((card, index) => {
      const x = this.M + index * (width + gap)
      d.setFillColor(C.card[0], C.card[1], C.card[2])
      d.setDrawColor(C.border[0], C.border[1], C.border[2])
      d.setLineWidth(0.15)
      d.roundedRect(x, top, width, height, 1.8, 1.8, "FD")
      d.setFillColor(card.accent[0], card.accent[1], card.accent[2])
      d.roundedRect(x, top, 1.7, height, 0.85, 0.85, "F")

      this.setFont(5.4, "bold", C.muted)
      d.text(card.label.toUpperCase(), x + 3.5, top + 4.2)
      this.setFont(9, "bold", card.accent)
      d.text(fitText(d, card.value, width - 5, 9, "bold"), x + 3.5, top + 9.6)
      if (card.sub) {
        this.setFont(5.2, "normal", C.muted)
        d.text(fitText(d, card.sub, width - 5, 5.2), x + 3.5, top + 14)
      }
    })

    this.y = top + height + 5
  }

  callout(text: string, tone: RGB, soft: RGB) {
    const padding = 4
    const lineHeight = 3.8
    this.setFont(7.5, "normal", C.inkSoft)
    const lines = this.doc.splitTextToSize(text, this.contentW - padding * 2 - 2) as string[]
    const height = padding * 2 + lines.length * lineHeight
    this.ensure(height + 3)
    const top = this.y
    const d = this.doc
    d.setFillColor(soft[0], soft[1], soft[2])
    d.setDrawColor(tone[0], tone[1], tone[2])
    d.setLineWidth(0.15)
    d.roundedRect(this.M, top, this.contentW, height, 2, 2, "FD")
    d.setFillColor(tone[0], tone[1], tone[2])
    d.roundedRect(this.M, top, 1.8, height, 0.9, 0.9, "F")

    this.setFont(7.5, "normal", C.inkSoft)
    lines.forEach((line, index) => {
      d.text(line, this.M + padding + 1.5, top + padding + 2.6 + index * lineHeight)
    })

    this.y = top + height + 4.5
  }

  table(options: {
    head: string[]
    body: (string | number)[][]
    headColor?: RGB
    columns?: Record<number, { cellWidth?: number; halign?: "left" | "center" | "right"; fontStyle?: "normal" | "bold" | "italic" }>
    fontSize?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell?: (hook: any) => void
  }) {
    this.ensure(30)
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: this.M, right: this.M, bottom: 20 },
      head: [options.head],
      body: options.body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: options.fontSize ?? 6.7,
        cellPadding: 1.8,
        lineColor: C.border,
        lineWidth: 0.1,
        textColor: C.inkSoft,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: options.headColor ?? C.ink,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 6.2,
        cellPadding: 1.9,
        halign: "left",
      },
      alternateRowStyles: { fillColor: C.card },
      columnStyles: options.columns,
      didParseCell: options.didParseCell,
    })
    this.y = ((this.doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? this.y) + 5
  }
}

// ── Loader gambar (logo & dokumentasi) ──────────────────────────────────────
interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

function loadImageData(url: string, timeoutMs = 6000): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !url) {
      resolve(null)
      return
    }
    const image = new Image()
    image.crossOrigin = "anonymous"
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(null)
      }
    }, timeoutMs)

    image.onload = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        const maxSide = 1800
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale))
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        if (!context) {
          resolve(null)
          return
        }
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.9), width, height })
      } catch {
        resolve(null)
      }
    }

    image.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(null)
    }

    image.src = url
  })
}

/**
 * Saat development lokal, file foto bisa saja hanya tersimpan di server
 * production (database dipakai bersama). Karena itu sediakan origin cadangan
 * agar lampiran foto tetap bisa dimuat dan masuk ke PDF.
 */
const DEFAULT_ASSET_FALLBACK_ORIGIN = "https://axon-ecosystem.id"

function buildImageCandidates(path: string, apiBase: string, fallbackBase?: string): string[] {
  if (!path) return []
  if (/^https?:\/\//i.test(path)) return [path]

  const bases = [apiBase]
  if (fallbackBase) bases.push(fallbackBase)
  else if (/localhost|127\.0\.0\.1/i.test(apiBase)) bases.push(DEFAULT_ASSET_FALLBACK_ORIGIN)

  const urls = bases.filter(Boolean).map((base) => resolveUrl(path, base))
  return Array.from(new Set(urls))
}

async function loadImageWithFallback(candidates: string[], timeoutMs = 4500): Promise<LoadedImage | null> {
  for (const candidate of candidates) {
    const image = await loadImageData(candidate, timeoutMs)
    if (image) return image
  }
  return null
}

function collectPhotoSources(ticket: TicketReportTicket) {
  const result: { path: string; caption: string }[] = []
  const push = (attachment: TicketReportAttachment | undefined, caption: string) => {
    if (!attachment?.url) return
    const path = attachment.url
    if (result.some((item) => item.path === path)) return
    result.push({ path, caption })
  }

  ;(ticket.attachments || []).forEach((attachment) => {
    push(
      attachment,
      attachment.type === "INITIAL"
        ? "Foto awal / kondisi sebelum penanganan"
        : "Foto hasil / kondisi setelah penanganan"
    )
  })

  ;(ticket.workItems || []).forEach((item) => {
    const phase = phaseTone(item.phase).label
    const caption = `${phase} — ${item.title || truncate(item.description, 70)}`
    ;(item.attachments || []).forEach((attachment) => push(attachment, caption))
  })

  return result
}

// ── Bagian-bagian dokumen ───────────────────────────────────────────────────
function drawHeader(
  writer: ReportWriter,
  ticket: TicketReportTicket,
  company: CompanyProfile | null | undefined,
  logo: LoadedImage | null
) {
  const d = writer.doc
  d.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
  d.rect(0, 0, writer.W, 3, "F")

  const baseY = 16
  let textX = writer.M
  if (logo) {
    const logoHeight = 12
    const logoWidth = Math.min(28, (logo.width / logo.height) * logoHeight)
    d.addImage(logo.dataUrl, "JPEG", writer.M, baseY - 3.5, logoWidth, logoHeight)
    textX = writer.M + logoWidth + 3.5
  }

  writer.setFont(12.5, "bold", C.ink)
  d.text(company?.name || "PT AXON ECOSYSTEM", textX, baseY + 1.6)
  writer.setFont(7, "normal", C.muted)
  const subtitle =
    company?.legalName && company.legalName !== company.name
      ? truncate(String(company.legalName), 78)
      : "Divisi Teknologi Informasi & Infrastruktur (IT-OSL)"
  d.text(subtitle, textX, baseY + 5.9)

  const address = [company?.address, company?.city, company?.province].filter(Boolean).join(", ")
  if (address) {
    writer.setFont(6.4, "normal", C.faint)
    d.text(truncate(address, 90), textX, baseY + 9.4)
  }
  const contact = [
    company?.phone ? `Tel: ${company.phone}` : null,
    company?.email ? `Email: ${company.email}` : null,
  ]
    .filter(Boolean)
    .join("  |  ")
  if (contact) {
    writer.setFont(6.4, "normal", C.faint)
    d.text(truncate(contact, 90), textX, baseY + 12.8)
  }

  const rightX = writer.W - writer.M
  writer.setFont(12.5, "bold", C.indigo)
  d.text("LAPORAN RINGKASAN TIKET", rightX, baseY + 1.6, { align: "right" })
  writer.setFont(7, "bold", C.ink)
  d.text("Dokumen Serah Terima & Pembelajaran Teknisi", rightX, baseY + 5.9, { align: "right" })
  writer.setFont(6.7, "normal", C.muted)
  d.text(`No. Tiket: ${ticket.ticketNumber}`, rightX, baseY + 9.4, { align: "right" })
  d.text(`Dicetak: ${fmtDateTime(new Date().toISOString())}`, rightX, baseY + 12.8, { align: "right" })

  writer.y = baseY + 16
  d.setDrawColor(C.indigo[0], C.indigo[1], C.indigo[2])
  d.setLineWidth(0.5)
  d.line(writer.M, writer.y, writer.W - writer.M, writer.y)
  d.setDrawColor(C.border[0], C.border[1], C.border[2])
  d.setLineWidth(0.2)
  d.line(writer.M, writer.y + 0.9, writer.W - writer.M, writer.y + 0.9)
  writer.y += 6
}

function drawHero(writer: ReportWriter, ticket: TicketReportTicket) {
  const d = writer.doc
  writer.setFont(8.1, "normal", [226, 232, 240])
  const summaryLines = d.splitTextToSize(ticket.summary || "-", writer.contentW - 11) as string[]
  const shown = summaryLines.slice(0, 2)
  const height = 20.5 + (shown.length - 1) * 3.8
  writer.ensure(height + 5)
  const top = writer.y
  const tone = statusTone(ticket.status)

  d.setFillColor(C.ink[0], C.ink[1], C.ink[2])
  d.roundedRect(writer.M, top, writer.contentW, height, 2.6, 2.6, "F")
  d.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
  d.roundedRect(writer.M, top, 2.4, height, 2.6, 2.6, "F")

  const statusLabel = (STATUS_LABEL[ticket.status || ""] || ticket.status || "-").toUpperCase()
  const pillWidth = d.getTextWidth(statusLabel) + 8
  const pillX = writer.W - writer.M - 5 - pillWidth
  d.setFillColor(tone.fg[0], tone.fg[1], tone.fg[2])
  d.roundedRect(pillX, top + 4, pillWidth, 5.6, 2.8, 2.8, "F")
  writer.setFont(6, "bold", C.white)
  d.text(statusLabel, pillX + pillWidth / 2, top + 7.9, { align: "center" })

  writer.setFont(5.8, "bold", C.faint)
  d.text("NOMOR TIKET", writer.M + 8, top + 5.4)
  writer.setFont(13, "bold", C.white)
  d.text(ticket.ticketNumber, writer.M + 8, top + 10.6)

  writer.setFont(8.1, "normal", [226, 232, 240])
  shown.forEach((line, index) => {
    d.text(line, writer.M + 8, top + 15.3 + index * 3.8)
  })

  const meta = [
    ticket.location?.name,
    [ticket.category?.groupName, ticket.category?.name].filter(Boolean).join(" › "),
    TICKET_TYPE_LABEL[ticket.ticketType || ""] || ticket.ticketType,
  ]
    .filter(Boolean)
    .join("  •  ")
  writer.setFont(6.2, "normal", C.faint)
  d.text(truncate(meta, 110), writer.M + 8, top + height - 2.4)

  writer.y = top + height + 5.5
}

function drawKpiCards(writer: ReportWriter, ticket: TicketReportTicket) {
  const frt = getFrtMinutes(ticket)
  const sla = getSlaStatus(ticket)
  const total = getTotalMinutes(ticket)
  const threshold = thresholdMinutes(ticket.severity)
  const isDone = ["RESOLVED", "CLOSED"].includes(ticket.status || "")

  writer.kpiCards([
    {
      label: "Status Tiket",
      value: STATUS_LABEL[ticket.status || ""] || ticket.status || "-",
      sub: ticket.reopenedCount ? `Dibuka ulang ${ticket.reopenedCount}x` : "Status terakhir",
      accent: statusTone(ticket.status).fg,
    },
    {
      label: "Severity",
      value: SEVERITY_LABEL[ticket.severity || ""] || ticket.severity || "-",
      sub: `Target SLA ${threshold} menit`,
      accent: severityTone(ticket.severity),
    },
    {
      label: "Respon Pertama (FRT)",
      value: fmtDuration(frt),
      sub: sla === "BREACH" ? "Melewati SLA" : "Dalam SLA",
      accent: sla === "BREACH" ? C.rose : C.emerald,
    },
    {
      label: "Total Penanganan",
      value: fmtDuration(total),
      sub: isDone ? "Sampai tiket selesai" : "Masih berjalan",
      accent: isDone ? C.emerald : C.indigo,
    },
  ])
}

function drawTimeline(writer: ReportWriter, ticket: TicketReportTicket) {
  const d = writer.doc
  const height = 27
  writer.ensure(height + 4)
  const top = writer.y
  d.setFillColor(C.card[0], C.card[1], C.card[2])
  d.setDrawColor(C.border[0], C.border[1], C.border[2])
  d.setLineWidth(0.15)
  d.roundedRect(writer.M, top, writer.contentW, height, 2.2, 2.2, "FD")

  const threshold = thresholdMinutes(ticket.severity)
  const sla = getSlaStatus(ticket)
  writer.setFont(5.9, "bold", sla === "BREACH" ? C.rose : C.emerald)
  d.text(
    `TARGET RESPON SLA: ${threshold} MENIT  •  ${sla === "BREACH" ? "MELEWATI SLA" : "DALAM SLA"}`,
    writer.W - writer.M - 4,
    top + 4.6,
    { align: "right" }
  )

  const steps = [
    { label: "Dilaporkan", at: ticket.createdAt || null },
    { label: "Direspon", at: ticket.acknowledgedAt || null },
    { label: "Diselesaikan", at: ticket.resolvedAt || null },
    { label: "Ditutup", at: ticket.closedAt || null },
  ]

  const startX = writer.M + 13
  const endX = writer.W - writer.M - 13
  const gap = (endX - startX) / (steps.length - 1)
  const lineY = top + 12
  const lastDone = steps.reduce((acc, step, index) => (step.at ? index : acc), -1)

  d.setDrawColor(C.border[0], C.border[1], C.border[2])
  d.setLineWidth(0.9)
  d.line(startX, lineY, endX, lineY)
  if (lastDone > 0) {
    d.setDrawColor(C.indigo[0], C.indigo[1], C.indigo[2])
    d.setLineWidth(0.9)
    d.line(startX, lineY, startX + gap * lastDone, lineY)
  }

  steps.forEach((step, index) => {
    const x = startX + gap * index
    const done = Boolean(step.at)
    if (done) {
      const color = index === steps.length - 1 ? C.emerald : C.indigo
      d.setFillColor(color[0], color[1], color[2])
      d.circle(x, lineY, 2.3, "F")
      d.setFillColor(C.white[0], C.white[1], C.white[2])
      d.circle(x, lineY, 0.85, "F")
    } else {
      d.setFillColor(C.white[0], C.white[1], C.white[2])
      d.setDrawColor(C.faint[0], C.faint[1], C.faint[2])
      d.setLineWidth(0.3)
      d.circle(x, lineY, 2.3, "FD")
    }

    writer.setFont(6.2, "bold", C.ink)
    d.text(step.label, x, lineY + 6.4, { align: "center" })
    writer.setFont(5.6, "normal", C.muted)
    if (step.at) {
      d.text(fmtDateShort(step.at), x, lineY + 9.5, { align: "center" })
      d.text(fmtTime(step.at), x, lineY + 12, { align: "center" })
    } else {
      d.text("-", x, lineY + 9.5, { align: "center" })
    }

    if (index > 0 && steps[index - 1].at && step.at) {
      const duration = minutesBetween(steps[index - 1].at, step.at)
      if (duration != null) {
        writer.setFont(5.4, "bold", C.indigo)
        d.text(`Δ ${fmtDuration(duration)}`, x - gap / 2, lineY - 3.4, { align: "center" })
      }
    }
  })

  writer.y = top + height + 5
}

function drawPhotoAppendix(
  writer: ReportWriter,
  ticket: TicketReportTicket,
  photos: { image: LoadedImage; caption: string }[]
) {
  const d = writer.doc
  const contentW = writer.contentW

  const drawAppendixHeader = (continued: boolean) => {
    const top = writer.y
    if (!continued) {
      d.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
      d.roundedRect(writer.M, top, 8.5, 8.5, 2, 2, "F")
      writer.setFont(6.4, "bold", C.white)
      d.text("A", writer.M + 4.25, top + 5.5, { align: "center" })

      writer.setFont(13, "bold", C.ink)
      d.text("LAMPIRAN DOKUMENTASI FOTO", writer.M + 11.5, top + 5.9)
      writer.setFont(7, "normal", C.muted)
      d.text(
        `Tiket ${ticket.ticketNumber} · ${photos.length} foto pendukung · ${truncate(ticket.summary, 70)}`,
        writer.M + 11.5,
        top + 10.5
      )
      d.setDrawColor(C.border[0], C.border[1], C.border[2])
      d.setLineWidth(0.2)
      d.line(writer.M, top + 13.5, writer.M + contentW, top + 13.5)
      writer.setFont(6.5, "italic", C.muted)
      d.text(
        "Referensi visual kondisi awal, proses pengerjaan, dan hasil akhir. Gunakan sebagai pembelajaran teknisi lain.",
        writer.M,
        top + 17.5
      )
      writer.y = top + 22
    } else {
      writer.setFont(8.8, "bold", C.ink)
      d.text("LAMPIRAN — Lanjutan dokumentasi foto", writer.M, top + 4.8)
      d.setDrawColor(C.border[0], C.border[1], C.border[2])
      d.setLineWidth(0.2)
      d.line(writer.M, top + 7.5, writer.M + contentW, top + 7.5)
      writer.y = top + 11.5
    }
  }

  d.addPage()
  writer.y = writer.newPageTop
  drawAppendixHeader(false)

  const maxImageHeight = photos.length <= 2 ? 155 : photos.length <= 4 ? 96 : 88
  const maxImageWidth = contentW - 12

  photos.forEach((photo, index) => {
    const ratio = photo.image.width / photo.image.height
    let drawWidth = maxImageWidth
    let drawHeight = drawWidth / ratio
    if (drawHeight > maxImageHeight) {
      drawHeight = maxImageHeight
      drawWidth = drawHeight * ratio
    }

    const caption = `Foto ${index + 1} dari ${photos.length} — ${photo.caption}`
    writer.setFont(6.8, "normal", C.inkSoft)
    const captionLines = d.splitTextToSize(caption, contentW - 12) as string[]
    const cardHeight = 6 + drawHeight + 5 + captionLines.length * 3.4 + 4

    if (writer.y + cardHeight > writer.bottom) {
      d.addPage()
      writer.y = writer.newPageTop
      drawAppendixHeader(true)
    }

    const top = writer.y
    d.setFillColor(C.white[0], C.white[1], C.white[2])
    d.setDrawColor(C.border[0], C.border[1], C.border[2])
    d.setLineWidth(0.2)
    d.roundedRect(writer.M, top, contentW, cardHeight, 2.2, 2.2, "FD")
    d.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
    d.roundedRect(writer.M, top, contentW, 1.2, 0.6, 0.6, "F")

    const imageX = writer.M + (contentW - drawWidth) / 2
    const imageY = top + 4
    d.setFillColor(C.card[0], C.card[1], C.card[2])
    d.rect(imageX, imageY, drawWidth, drawHeight, "F")
    d.addImage(photo.image.dataUrl, "JPEG", imageX, imageY, drawWidth, drawHeight)

    writer.setFont(6.8, "normal", C.inkSoft)
    const captionY = imageY + drawHeight + 5
    captionLines.forEach((line, lineIndex) => {
      d.text(line, writer.M + 6, captionY + lineIndex * 3.4)
    })

    writer.y = top + cardHeight + 5
  })
}

function drawSignature(writer: ReportWriter, ticket: TicketReportTicket, userName?: string | null) {
  const d = writer.doc
  const boxGap = 6
  const boxWidth = (writer.contentW - boxGap) / 2
  const boxHeight = 30
  writer.ensure(boxHeight + 16)
  const top = writer.y

  const today = fmtDateShort(new Date().toISOString())
  const technician = ticket.assignedUser?.name || ticket.assignedUser?.email || userName || ticket.creator?.name || "Teknisi IT"
  const blocks = [
    { role: "DISUSUN OLEH (TEKNISI IT)", name: technician, date: today, filled: true },
    { role: "DIVERIFIKASI (LEAD / SUPERVISOR)", name: "................................", date: "..... / ..... / ..........", filled: false },
  ]

  blocks.forEach((block, index) => {
    const x = writer.M + index * (boxWidth + boxGap)
    d.setFillColor(C.white[0], C.white[1], C.white[2])
    d.setDrawColor(C.border[0], C.border[1], C.border[2])
    d.setLineWidth(0.2)
    d.roundedRect(x, top, boxWidth, boxHeight, 1.8, 1.8, "FD")

    writer.setFont(5.9, "bold", C.muted)
    d.text(block.role, x + 4, top + 5)
    writer.setFont(7, "normal", C.faint)
    d.text("Tanda tangan:", x + 4, top + 10.5)

    d.setDrawColor(C.faint[0], C.faint[1], C.faint[2])
    d.setLineWidth(0.2)
    d.line(x + 4, top + 21, x + boxWidth - 4, top + 21)

    writer.setFont(7, "bold", C.ink)
    d.text(fitText(d, block.name, boxWidth - 8, 7, "bold"), x + 4, top + 25)
    writer.setFont(5.8, "normal", C.muted)
    d.text(`Tanggal: ${block.date}`, x + 4, top + 28.4)
  })

  writer.y = top + boxHeight + 5
  writer.setFont(5.8, "normal", C.faint)
  d.text(
    "Dokumen ini dihasilkan otomatis dari data tiket IT-OSL. Kolom verifikasi diisi manual saat serah terima atau audit.",
    writer.M,
    writer.y + 2.5
  )
  writer.y += 6
}

function finalizePages(doc: jsPDF, ticket: TicketReportTicket, company?: CompanyProfile | null) {
  const total = doc.getNumberOfPages()
  const companyName = company?.name || "PT AXON ECOSYSTEM"

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)

    if (page > 1) {
      doc.setFillColor(C.indigo[0], C.indigo[1], C.indigo[2])
      doc.rect(0, 0, 210, 1.6, "F")
      doc.setFont("helvetica", "bold").setFontSize(7.2).setTextColor(C.ink[0], C.ink[1], C.ink[2])
      doc.text(companyName, 14, 9)
      doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(C.muted[0], C.muted[1], C.muted[2])
      doc.text("Laporan Ringkasan Tiket · IT-OSL", 14, 12.4)
      doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(C.indigo[0], C.indigo[1], C.indigo[2])
      doc.text(ticket.ticketNumber, 196, 9, { align: "right" })
      doc.setDrawColor(C.border[0], C.border[1], C.border[2])
      doc.setLineWidth(0.2)
      doc.line(14, 15, 196, 15)
    }

    doc.setDrawColor(C.border[0], C.border[1], C.border[2])
    doc.setLineWidth(0.2)
    doc.line(14, 283, 196, 283)
    doc.setFont("helvetica", "normal").setFontSize(6.1).setTextColor(C.muted[0], C.muted[1], C.muted[2])
    doc.text(
      "Dokumen internal · dihasilkan otomatis oleh Axon Ecosystem ERP · Modul IT Maintenance (IT-OSL)",
      14,
      287.5
    )
    doc.setFont("helvetica", "bold").setFontSize(6.5).setTextColor(C.ink[0], C.ink[1], C.ink[2])
    doc.text(`Halaman ${page} dari ${total}`, 196, 287.5, { align: "right" })
  }
}

// ── Generator utama ─────────────────────────────────────────────────────────
export async function generateTicketReportPdf(
  ticket: TicketReportTicket,
  options: TicketReportPdfOptions = {}
): Promise<jsPDF> {
  const apiBase = options.apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
  const writer = new ReportWriter(doc)

  const photoSources = options.includePhotos === false ? [] : collectPhotoSources(ticket).slice(0, 8)

  const [logo, ...loadedPhotos] = await Promise.all([
    options.company?.logo
      ? loadImageWithFallback(
          buildImageCandidates(String(options.company.logo), apiBase, options.fallbackApiBaseUrl)
        )
      : Promise.resolve(null),
    ...photoSources.map((photo) =>
      loadImageWithFallback(buildImageCandidates(photo.path, apiBase, options.fallbackApiBaseUrl))
    ),
  ])

  const photos = photoSources
    .map((source, index) => {
      const image = loadedPhotos[index] as LoadedImage | null | undefined
      return image ? { image, caption: source.caption } : null
    })
    .filter((item): item is { image: LoadedImage; caption: string } => Boolean(item))

  drawHeader(writer, ticket, options.company, logo as LoadedImage | null)
  drawHero(writer, ticket)
  drawKpiCards(writer, ticket)

  let sectionNumber = 1
  const nextSection = () => String(sectionNumber++).padStart(2, "0")

  // 01 — Ringkasan eksekutif
  writer.section(nextSection(), "RINGKASAN EKSEKUTIF", "Intisari kondisi tiket, respon SLA, dan penanganan")
  writer.callout(buildExecutiveSummary(ticket), C.indigo, C.indigoSoft)

  // 02 — Informasi tiket & aset
  writer.section(
    nextSection(),
    "INFORMASI TIKET & ASET",
    "Identitas pelaporan, unit terdampak, dan personel terkait"
  )
  const asset = ticket.asset
  writer.kvCard([
    { label: "Pelapor", value: ticket.reporterName || "-" },
    { label: "Kanal Laporan", value: ticket.reportChannel || "-" },
    { label: "Customer", value: ticket.customer?.name || "-" },
    { label: "Lokasi / Unit", value: ticket.location?.name || "-" },
    {
      label: "Kategori",
      value: [ticket.category?.groupName, ticket.category?.name].filter(Boolean).join(" › ") || "-",
    },
    { label: "Jenis Tiket", value: TICKET_TYPE_LABEL[ticket.ticketType || ""] || ticket.ticketType || "-" },
    { label: "Aset Terkait", value: asset?.name || "Tanpa aset" },
    { label: "Kode Aset", value: asset?.assetCode || "-" },
    { label: "No. Serial", value: asset?.serialNumber || "-" },
    { label: "Model / Tipe", value: asset?.brandModel || asset?.assetType || "-" },
    {
      label: "PIC Unit",
      value: ticket.pic
        ? `${ticket.pic.name || "-"}${ticket.pic.department ? ` · ${ticket.pic.department}` : ""}`
        : "-",
    },
    { label: "Kontak PIC", value: ticket.pic?.phone || ticket.pic?.email || "-" },
    { label: "Teknisi Penanganan", value: ticket.assignedUser?.name || ticket.assignedUser?.email || "Belum ditugaskan" },
    { label: "Dibuat Oleh", value: ticket.creator?.name || "-" },
    { label: "Waktu Laporan", value: fmtDateTime(ticket.reportedAt || ticket.createdAt) },
    { label: "Waktu Respon", value: fmtDateTime(ticket.acknowledgedAt) },
    { label: "Waktu Selesai", value: fmtDateTime(ticket.resolvedAt) },
    { label: "Waktu Ditutup", value: fmtDateTime(ticket.closedAt) },
  ])

  // 03 — Linimasa
  writer.section(nextSection(), "LINIMASA PENANGANAN", "Rekam jejak waktu laporan, respon, penyelesaian, dan penutupan")
  drawTimeline(writer, ticket)

  // 04 — Analisa & akar masalah
  const workItems = ticket.workItems || []
  const analisaItems = workItems.filter((item) => item.phase === "ANALISA")
  const pengerjaanItems = workItems.filter((item) => item.phase === "PENGERJAAN")
  const hasilItems = workItems.filter((item) => item.phase === "HASIL")

  writer.section(nextSection(), "ANALISA & AKAR MASALAH", "Diagnosis awal dan penyebab utama gangguan")
  if (ticket.rootCause) {
    writer.labelledParagraph("Akar masalah (root cause)", ticket.rootCause)
  } else if (analisaItems.length) {
    writer.labelledParagraph("Temuan analisa", analisaItems.map((item) => item.description).join(" "))
  } else {
    writer.paragraph("Belum ada catatan analisa teknis pada tiket ini.", { style: "italic", color: C.muted })
    writer.y += 2
  }
  if (analisaItems.length) {
    writer.ensure(8)
    writer.setFont(6.4, "bold", C.muted)
    writer.doc.text("CATATAN ANALISA TEKNISI", writer.M, writer.y + 2.4)
    writer.y += 4.6
    writer.bullets(
      analisaItems.map((item) => ({
        prefix: fmtDateTime(item.createdAt),
        text: `${item.title ? `${item.title}: ` : ""}${item.description}`,
      }))
    )
  }

  // 05 — Tindakan perbaikan
  writer.section(nextSection(), "TINDAKAN PERBAIKAN", "Langkah eksekusi yang dilakukan teknisi")
  if (ticket.correctiveAction) {
    writer.labelledParagraph("Tindakan perbaikan (corrective action)", ticket.correctiveAction)
  } else if (!pengerjaanItems.length) {
    writer.paragraph("Belum ada catatan tindakan perbaikan pada tiket ini.", { style: "italic", color: C.muted })
    writer.y += 2
  }
  if (pengerjaanItems.length) {
    writer.ensure(8)
    writer.setFont(6.4, "bold", C.muted)
    writer.doc.text("CATATAN PENGERJAAN LAPANGAN", writer.M, writer.y + 2.4)
    writer.y += 4.6
    writer.bullets(
      pengerjaanItems.map((item) => ({
        prefix: fmtDateTime(item.createdAt),
        text: `${item.title ? `${item.title}: ` : ""}${item.description}`,
      }))
    )
  }

  // 06 — Hasil & verifikasi
  writer.section(nextSection(), "HASIL & VERIFIKASI", "Kondisi akhir aset dan kesimpulan penanganan")
  writer.kvCard([
    { label: "Kategori Solusi", value: ticket.solutionCategory || "-" },
    {
      label: "Kondisi Aset",
      value: ASSET_CONDITION_LABEL[ticket.assetCondition || ""] || ticket.assetCondition || "Belum dicatat",
    },
  ])
  if (hasilItems.length) {
    writer.bullets(
      hasilItems.map((item) => ({
        prefix: fmtDateTime(item.createdAt),
        text: `${item.title ? `${item.title}: ` : ""}${item.description}`,
      }))
    )
  } else {
    writer.paragraph("Belum ada catatan verifikasi hasil pada tiket ini.", { style: "italic", color: C.muted })
    writer.y += 2
  }

  // 07 — Sparepart
  if ((ticket.parts || []).length > 0) {
    writer.section(nextSection(), "PENGGUNAAN SPAREPART", "Komponen yang diganti atau ditambahkan selama penanganan")
    writer.table({
      head: ["NO", "NAMA PART / KOMPONEN", "QTY", "SATUAN", "CATATAN"],
      body: (ticket.parts || []).map((part, index) => [
        String(index + 1),
        part.partName,
        String(part.quantity),
        part.unit || "pcs",
        part.notes || "-",
      ]),
      columns: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 100 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 36 },
      },
    })
  }

  // 08 — Kendala / waktu tertahan
  if ((ticket.pendings || []).length > 0) {
    writer.section(nextSection(), "KENDALA & WAKTU TERTAHAN", "Hambatan yang memperpanjang durasi penyelesaian")
    writer.table({
      head: ["NO", "ALASAN TERTAHAN", "PIHAK EKSTERNAL", "MULAI", "EST. LANJUT", "DURASI"],
      body: (ticket.pendings || []).map((pending, index) => {
        const duration =
          minutesBetween(pending.startedAt, pending.endedAt || new Date().toISOString()) ?? null
        return [
          String(index + 1),
          pending.reason || "-",
          pending.externalParty || "-",
          fmtDateTime(pending.startedAt),
          fmtDateTime(pending.expectedResumeAt),
          fmtDuration(duration),
        ]
      }),
      columns: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 52 },
        2: { cellWidth: 30 },
        3: { cellWidth: 32, halign: "center" },
        4: { cellWidth: 32, halign: "center" },
        5: { cellWidth: 26, halign: "center" },
      },
    })
  }

  // 09 — Kronologi pekerjaan
  if (workItems.length > 0) {
    writer.section(
      nextSection(),
      "KRONOLOGI PEKERJAAN TEKNISI",
      "Urutan catatan lapangan — referensi langkah kerja untuk teknisi lain"
    )
    writer.table({
      head: ["WAKTU", "FASE", "CATATAN PEKERJAAN"],
      body: [...workItems]
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
        .map((item) => [
          fmtDateTime(item.createdAt),
          phaseTone(item.phase).label,
          `${item.title ? `${item.title}\n` : ""}${item.description}`,
        ]),
      columns: {
        0: { cellWidth: 27, halign: "center" },
        1: { cellWidth: 23, halign: "center" },
        2: { cellWidth: 132 },
      },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 1) {
          const value = String(hook.cell.raw)
          const tone = phaseTone(value === "Pengerjaan" ? "PENGERJAAN" : value === "Hasil" ? "HASIL" : "ANALISA")
          hook.cell.styles.fontStyle = "bold"
          hook.cell.styles.textColor = tone.color
        }
      },
    })
  }

  // 10 — Pembelajaran teknisi
  writer.section(
    nextSection(),
    "PEMBELAJARAN TEKNISI & REKOMENDASI",
    "Ringkasan pengetahuan yang bisa dipelajari ulang oleh teknisi lain"
  )
  writer.table({
    head: ["ASPEK PEMBELAJARAN", "RINGKASAN, BENCHMARK & REKOMENDASI"],
    body: buildLearningRows(ticket),
    headColor: C.indigo,
    fontSize: 6.8,
    columns: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 140 },
    },
  })

  // 11 — Pengesahan
  writer.ensure(48)
  writer.section(nextSection(), "PENGESAHAN DOKUMEN", "Lembar verifikasi laporan penanganan tiket")
  drawSignature(writer, ticket, options.userName)

  // Lampiran foto selalu di halaman paling akhir agar jelas dan nyaman dilihat.
  if (photos.length > 0) {
    drawPhotoAppendix(writer, ticket, photos)
  }

  finalizePages(doc, ticket, options.company)
  return doc
}

function buildFileName(ticketNumber: string) {
  const safe = (ticketNumber || "TIKET").replace(/[^a-zA-Z0-9_-]/g, "_")
  return `Laporan_Ringkasan_Tiket_${safe}.pdf`
}

export async function downloadTicketReportPdf(
  ticket: TicketReportTicket,
  options: TicketReportPdfOptions = {}
): Promise<void> {
  const doc = await generateTicketReportPdf(ticket, options)
  doc.save(buildFileName(ticket.ticketNumber))
}

export async function printTicketReportPdf(
  ticket: TicketReportTicket,
  options: TicketReportPdfOptions = {}
): Promise<void> {
  const doc = await generateTicketReportPdf(ticket, options)
  doc.autoPrint()
  const blob = doc.output("blob")
  const blobUrl = URL.createObjectURL(blob)

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "none"
  iframe.src = blobUrl

  document.body.appendChild(iframe)
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch {
        window.open(blobUrl, "_blank")
      }
    }, 250)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
      iframe.remove()
    }, 120000)
  }
}
