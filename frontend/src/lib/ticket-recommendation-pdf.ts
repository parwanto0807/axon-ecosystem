import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export interface RecommendationPartItem {
  id?: string
  partName: string
  quantity: number
  unit: string
  notes?: string
}

export interface RecommendationLetterData {
  recoNumber: string
  ticketNumber: string
  date: string
  urgency: string
  customerName?: string
  locationName: string
  picName: string
  department: string
  assetName: string
  assetCode: string
  categoryName: string
  statusLabel: string

  // Content sections
  problemSummary: string
  analysisRootCause: string
  workDone: string
  conclusionRecommendation: string

  // Parts list
  parts: RecommendationPartItem[]

  // Signatures
  proposedBy: string
  proposedRole?: string
  approvedBy: string
  approvedRole?: string
  receivedBy?: string
  receivedRole?: string
}

/**
 * Builds standard RecommendationLetterData from an IT-OSL Ticket Detail object
 */
export function buildTicketRecommendationData(ticket: any): RecommendationLetterData {
  const today = new Date()
  const dateFormatted = today.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`
  const recoNumber = `REC-PR/${yearMonth}/${ticket.ticketNumber || "TICKET"}`

  // Urgency mapping
  let urgency = "NORMAL"
  if (ticket.severity === "CRITICAL") urgency = "URGENT (KRITIS)"
  else if (ticket.severity === "HIGH") urgency = "TINGGI"
  else if (ticket.severity === "LOW") urgency = "RENDAH"

  // Analisa: use rootCause or collect from ANALISA work items
  const analisaItems = (ticket.workItems || [])
    .filter((w: any) => w.phase === "ANALISA" && w.description)
    .map((w: any) => w.description)
  const analysisRootCause = ticket.rootCause || analisaItems.join("; ") || "Pemeriksaan teknis menunjukkan indikasi keausan / kerusakan komponen operasional."

  // Work done: collect from PENGERJAAN work items
  const workItems = (ticket.workItems || [])
    .filter((w: any) => w.phase === "PENGERJAAN" && w.description)
    .map((w: any) => w.description)
  const workDone = workItems.join("; ") || "Inspeksi visual, pengujian fungsi perangkat, dan isolasi titik kerusakan di lapangan."

  // Conclusion / Recommendation
  const conclusionRecommendation =
    ticket.correctiveAction ||
    "Komponen mengalami kegagalan teknis permanen dan tidak dapat direparasi. Direkomendasikan pengadaan / pembelian part baru untuk kelangsungan operasional unit."

  // Parts
  const parts: RecommendationPartItem[] =
    ticket.parts && ticket.parts.length > 0
      ? ticket.parts.map((p: any) => ({
          id: p.id,
          partName: p.partName,
          quantity: p.quantity || 1,
          unit: p.unit || "pcs",
          notes: p.notes || "Penggantian unit rusak",
        }))
      : [
          {
            partName: "",
            quantity: 1,
            unit: "pcs",
            notes: "Kebutuhan perbaikan",
          },
        ]

  return {
    recoNumber,
    ticketNumber: ticket.ticketNumber || "-",
    date: dateFormatted,
    urgency,
    customerName: ticket.customer?.name,
    locationName: ticket.location?.name || "-",
    picName: ticket.pic?.name || ticket.reporterName || "User Operasional",
    department: ticket.pic?.department || "Operasional",
    assetName: ticket.asset?.name || "Perangkat Terkait",
    assetCode: ticket.asset?.assetCode || "-",
    categoryName: ticket.category?.name || "Umum",
    statusLabel: ticket.status || "IN_PROGRESS",
    problemSummary: ticket.summary || "Kendala teknis pada perangkat operasional.",
    analysisRootCause,
    workDone,
    conclusionRecommendation,
    parts,
    proposedBy: ticket.assignedUser?.name || ticket.creator?.name || "Teknisi IT",
    proposedRole: "Staff / Teknisi IT",
    approvedBy: "Spv / Head of IT",
    approvedRole: "Spv. Infrastruktur & IT",
    receivedBy: "Bagian Purchasing / Pengadaan",
    receivedRole: "Purchasing Officer",
  }
}

/**
 * Generates 1/2 A4 Landscape Dot Matrix PDF Document
 * Page size: 210mm x 148.5mm (landscape continuous form)
 * Styling: Pure Monochrome (Black & White, no fills, thin crisp lines)
 */
export function generateTicketRecommendationDoc(data: RecommendationLetterData): jsPDF {
  // 1/2 A4 Landscape: width = 210mm, height = 148.5mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [148.5, 210],
  })

  // Ensure dimensions
  const pageW = doc.internal.pageSize.getWidth() // 210
  const pageH = doc.internal.pageSize.getHeight() // 148.5

  const marginL = 8
  const marginR = 8
  const contentW = pageW - marginL - marginR // 194mm

  // Base font: Courier for authentic, crisp Dot Matrix needle output
  doc.setFont("courier", "normal")
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)

  // 1. KOP PERUSAHAAN (HEADER)
  let y = 6.5

  // Left side: Company & Department
  doc.setFont("courier", "bold")
  doc.setFontSize(10)
  doc.text("PT. GRAFINDO MITRASEMESTA", marginL, y)

  y += 3.8
  doc.setFontSize(7.5)
  doc.text("DIVISI TEKNOLOGI INFORMASI & INFRASTRUKTUR (IT-OSL)", marginL, y)

  y += 3.2
  doc.setFont("courier", "normal")
  doc.setFontSize(6.5)
  doc.text("Dokumen Resmi Rekomendasi Teknis Pengadaan Barang / Suku Cadang", marginL, y)

  // Right side: Document Title & Meta
  const rightX = pageW - marginR
  doc.setFont("courier", "bold")
  doc.setFontSize(10)
  doc.text("SURAT REKOMENDASI PEMBELIAN (PR)", rightX, 6.5, { align: "right" })

  doc.setFontSize(7.5)
  doc.text(`NO. REK: ${data.recoNumber}`, rightX, 10.3, { align: "right" })

  doc.setFont("courier", "normal")
  doc.setFontSize(6.5)
  doc.text(`Tanggal Cetak: ${data.date} | Urgensi: ${data.urgency}`, rightX, 13.5, { align: "right" })

  // Double Divider Rule
  y = 15.5
  doc.setLineWidth(0.25)
  doc.line(marginL, y, rightX, y)
  doc.setLineWidth(0.1)
  doc.line(marginL, y + 0.6, rightX, y + 0.6)

  // 2. IDENTITAS TIKET & UNIT (GRID 2 KOLOM)
  y = 17.5
  const infoH = 13
  doc.setLineWidth(0.15)
  doc.rect(marginL, y, contentW, infoH) // outer box
  const midX = marginL + contentW / 2
  doc.line(midX, y, midX, y + infoH) // middle vertical divider

  // Left Column Content
  const col1X = marginL + 2
  const col1ValX = col1X + 27
  let iy = y + 3.2
  doc.setFont("courier", "bold").setFontSize(6.5)
  doc.text("No. Tiket IT", col1X, iy)
  doc.setFont("courier", "normal")
  doc.text(`: ${data.ticketNumber} (${data.categoryName})`, col1ValX, iy)

  iy += 3.2
  doc.setFont("courier", "bold")
  doc.text("Pemohon / PIC", col1X, iy)
  doc.setFont("courier", "normal")
  const picDept = data.department ? `${data.picName} [Dept: ${data.department}]` : data.picName
  doc.text(`: ${picDept.slice(0, 38)}`, col1ValX, iy)

  iy += 3.2
  doc.setFont("courier", "bold")
  doc.text("Unit / Lokasi", col1X, iy)
  doc.setFont("courier", "normal")
  const locCust = data.customerName ? `${data.locationName} (${data.customerName})` : data.locationName
  doc.text(`: ${locCust.slice(0, 38)}`, col1ValX, iy)

  // Right Column Content
  const col2X = midX + 2
  const col2ValX = col2X + 27
  iy = y + 3.2
  doc.setFont("courier", "bold")
  doc.text("Perangkat / Aset", col2X, iy)
  doc.setFont("courier", "normal")
  doc.text(`: ${data.assetName.slice(0, 35)}`, col2ValX, iy)

  iy += 3.2
  doc.setFont("courier", "bold")
  doc.text("Kode Aset", col2X, iy)
  doc.setFont("courier", "normal")
  doc.text(`: ${data.assetCode || "-"}`, col2ValX, iy)

  iy += 3.2
  doc.setFont("courier", "bold")
  doc.text("Tingkat Urgensi", col2X, iy)
  doc.setFont("courier", "bold")
  doc.text(`: ${data.urgency}`, col2ValX, iy)

  // 3. INVESTIGASI & HASIL TEKNIS (KOTAK 4 POIN)
  y += infoH + 1.2
  const invH = 34
  doc.setLineWidth(0.15)
  doc.rect(marginL, y, contentW, invH)

  // Section Header
  doc.setFont("courier", "bold").setFontSize(6.8)
  doc.text("HASIL INVESTIGASI, ANALISA TEKNIS & REKOMENDASI PENYELESAIAN:", marginL + 2, y + 3)
  doc.setLineWidth(0.1)
  doc.line(marginL, y + 4.2, rightX, y + 4.2)

  let cy = y + 7.2
  const wrapW = contentW - 6

  // 1. Keluhan / Gejala
  doc.setFont("courier", "bold").setFontSize(6.2)
  doc.text("A. GEJALA & MASALAH AWAL:", marginL + 2, cy)
  cy += 2.8
  doc.setFont("courier", "normal")
  const probLines = doc.splitTextToSize(data.problemSummary || "-", wrapW).slice(0, 2)
  doc.text(probLines, marginL + 4, cy)
  cy += probLines.length * 2.8 + 1

  // 2. Analisa & Diagnosa
  doc.setFont("courier", "bold")
  doc.text("B. HASIL ANALISA & DIAGNOSA TEKNIS (ROOT CAUSE):", marginL + 2, cy)
  cy += 2.8
  doc.setFont("courier", "normal")
  const rootLines = doc.splitTextToSize(data.analysisRootCause || "-", wrapW).slice(0, 2)
  doc.text(rootLines, marginL + 4, cy)
  cy += rootLines.length * 2.8 + 1

  // 3. Tindakan Dilakukan
  doc.setFont("courier", "bold")
  doc.text("C. TINDAKAN / PEKERJAAN YANG TELAH DILAKUKAN:", marginL + 2, cy)
  cy += 2.8
  doc.setFont("courier", "normal")
  const workLines = doc.splitTextToSize(data.workDone || "-", wrapW).slice(0, 2)
  doc.text(workLines, marginL + 4, cy)
  cy += workLines.length * 2.8 + 1

  // 4. Kesimpulan & Rekomendasi
  doc.setFont("courier", "bold")
  doc.text("D. KESIMPULAN & JUSTIFIKASI PEMBELIAN BARU:", marginL + 2, cy)
  cy += 2.8
  doc.setFont("courier", "normal")
  const concLines = doc.splitTextToSize(data.conclusionRecommendation || "-", wrapW).slice(0, 2)
  doc.text(concLines, marginL + 4, cy)

  // 4. TABEL PART / KOMPONEN YANG DIBUTUHKAN
  y += invH + 1.2
  doc.setFont("courier", "bold").setFontSize(6.8)
  doc.text("DAFTAR KEBUTUHAN BARANG / SUKU CADANG (PURCHASE REQUEST):", marginL, y + 2)

  const partsRows =
    data.parts && data.parts.length > 0
      ? data.parts.map((p, idx) => [
          String(idx + 1),
          p.partName || "-",
          String(p.quantity || 1),
          p.unit || "pcs",
          p.notes || "-",
        ])
      : [["1", "Pengajuan Part Sesuai Analisa Teknis di Atas", "1", "unit", "Kebutuhan Perbaikan"]]

  // Limit table to maximum 4 rows to prevent any page overflow
  const displayRows = partsRows.slice(0, 4)

  autoTable(doc, {
    startY: y + 3,
    margin: { left: marginL, right: marginR },
    head: [["NO", "NAMA BARANG / PART & SPESIFIKASI", "QTY", "SATUAN", "KETERANGAN / ALASAN PENGGANTIAN"]],
    body: displayRows,
    theme: "plain",
    tableWidth: contentW,
    styles: {
      font: "courier",
      fontSize: 6.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      cellPadding: 1,
    },
    headStyles: {
      font: "courier",
      fontStyle: "bold",
      fontSize: 6.5,
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 94, halign: "left" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 16, halign: "center" },
      4: { cellWidth: 58, halign: "left" },
    },
  })

  // 5. SIGNATURE BLOCK (3 PIHAK)
  const afterTableY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 1.5 : 108
  const signY = Math.max(afterTableY, 114)
  const signH = 26
  const colW = contentW / 3

  doc.setLineWidth(0.15)
  doc.rect(marginL, signY, contentW, signH)
  doc.line(marginL + colW, signY, marginL + colW, signY + signH)
  doc.line(marginL + colW * 2, signY, marginL + colW * 2, signY + signH)

  // Header row divider
  doc.line(marginL, signY + 4.5, rightX, signY + 4.5)

  // Col 1: Diusulkan (Teknisi IT)
  doc.setFont("courier", "bold").setFontSize(6.2)
  doc.text("DIUSULKAN OLEH (TEKNISI IT)", marginL + colW * 0.5, signY + 3.2, { align: "center" })
  doc.setFont("courier", "normal").setFontSize(6)
  doc.text(`Nama : ${data.proposedBy.slice(0, 22)}`, marginL + 2, signY + 20)
  doc.text("Tgl  : _____ / _____ / 202_", marginL + 2, signY + 23.5)

  // Col 2: Diperiksa & Disetujui (Spv IT)
  doc.setFont("courier", "bold").setFontSize(6.2)
  doc.text("DISETUJUI (SPV / HEAD OF IT)", marginL + colW * 1.5, signY + 3.2, { align: "center" })
  doc.setFont("courier", "normal").setFontSize(6)
  doc.text(`Nama : ${data.approvedBy.slice(0, 22)}`, marginL + colW + 2, signY + 20)
  doc.text("Tgl  : _____ / _____ / 202_", marginL + colW + 2, signY + 23.5)

  // Col 3: Diterima Purchasing
  doc.setFont("courier", "bold").setFontSize(6.2)
  doc.text("DITERIMA (BAGIAN PURCHASING)", marginL + colW * 2.5, signY + 3.2, { align: "center" })
  doc.setFont("courier", "normal").setFontSize(6)
  doc.text("Nama : ______________________", marginL + colW * 2 + 2, signY + 20)
  doc.text("Tgl  : _____ / _____ / 202_", marginL + colW * 2 + 2, signY + 23.5)

  // Footer Note
  doc.setFont("courier", "normal").setFontSize(5.5)
  doc.text(
    "* Dokumen ini dicetak untuk continuous form dot-matrix 1/2 A4 sebagai lampiran resmi pengajuan Purchase Request (PR).",
    marginL,
    pageH - 2.5
  )
  doc.text("IT-OSL Grafindo System", rightX, pageH - 2.5, { align: "right" })

  return doc
}

/**
 * Direct file download helper
 */
export function downloadTicketRecommendationPdf(data: RecommendationLetterData) {
  const doc = generateTicketRecommendationDoc(data)
  const cleanTicketNo = data.ticketNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
  doc.save(`Rekomendasi_PR_${cleanTicketNo}.pdf`)
}

/**
 * Print helper via hidden iframe (reliable browser print for dot matrix)
 */
export function printTicketRecommendationPdf(data: RecommendationLetterData) {
  const doc = generateTicketRecommendationDoc(data)
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
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error("Failed to print iframe:", e)
      // Fallback: open in new tab
      window.open(blobUrl, "_blank")
    }
    // Clean up after 2 minutes
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
      iframe.remove()
    }, 120000)
  }
}

