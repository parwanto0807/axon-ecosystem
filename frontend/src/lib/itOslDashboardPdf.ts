/**
 * Generator laporan PDF analisa IT Maintenance (IT-OSL).
 * Dibuat murni dengan jsPDF + AutoTable agar bisa dicetak / diunduh
 * tanpa render browser dan tetap rapi untuk lampiran laporan ke atasan.
 */

export interface ItOslPdfNamedCount {
  name: string
  count: number
}

export interface ItOslPdfCategory {
  name: string
  count: number
  breach: number
  resolved: number
}

export interface ItOslPdfTechnician {
  id: string
  name: string
  total: number
  resolved: number
  open: number
  breach: number
  avgMttrMin: number
  completionRate: number
}

export interface ItOslPdfAsset {
  id: string
  name: string
  assetCode: string
  count: number
  breach: number
  location: string | null
}

export interface ItOslPdfPart {
  partName: string
  unit: string
  quantity: number
  tickets: number
}

export interface ItOslPdfBreach {
  id: string
  ticketNumber: string
  summary: string
  severity: string
  status: string
  location: string | null
  assignedTo: string | null
  ageMinutes: number
  thresholdMinutes: number
  createdAt: string
}

export interface ItOslPdfData {
  range: { from: string; to: string; days: number }
  previousRange: { from: string; to: string }
  total: number
  active: number
  openInRange: number
  pending: number
  resolved: number
  closed: number
  cancelled: number
  newTickets: number
  inProgress: number
  reopened: number
  preventable: number
  avgFrtMin: number
  avgMttrMin: number
  medianMttrMin: number
  avgBacklogAgeDays: number
  slaCompliance: number
  slaEligible: number
  breachCount: number
  completionRate: number
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  byTicketType: Record<string, number>
  byChannel: Record<string, number>
  byCategory: ItOslPdfCategory[]
  byLocation: ItOslPdfNamedCount[]
  byCustomer: ItOslPdfNamedCount[]
  technicians: ItOslPdfTechnician[]
  topAssets: ItOslPdfAsset[]
  partsUsed: ItOslPdfPart[]
  bySolutionCategory: ItOslPdfNamedCount[]
  pendingReasons: ItOslPdfNamedCount[]
  backlogAging: { d0_1: number; d1_3: number; d3_7: number; gt7: number }
  breachList: ItOslPdfBreach[]
  recent: {
    id: string
    ticketNumber: string
    summary: string
    severity: string
    status: string
    createdAt: string
    location: { name: string } | null
    category: { name: string } | null
    customer: { name: string } | null
    assignedTo: string | null
    slaBreach: boolean
  }[]
  trend: { mode: string; labels: string[]; created: number[]; resolved: number[] }
  pm: { activeSchedules: number; executions: number; issueFound: number; completionRate: number }
  assets: { total: number; byStatus: Record<string, number>; warrantyExpiring30d: number }
  comparison: {
    total: number
    prevTotal: number
    totalDelta: number | null
    resolved: number
    prevResolved: number
    resolvedDelta: number | null
    slaCompliance: number
    prevSlaCompliance: number
    completionRate: number
    prevCompletionRate: number
    avgFrtMin: number
    prevAvgFrtMin: number
    avgMttrMin: number
    prevAvgMttrMin: number
  }
}

export interface CompanyProfile {
  name?: string | null
  legalName?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  phone?: string | null
  email?: string | null
  logo?: string | null
  taxId?: string | null
}

interface GenerateOptions {
  data: ItOslPdfData
  insights?: string[]
  company?: CompanyProfile | null
  userName?: string
  userRole?: string
  customerLabel?: string
  mode?: 'print' | 'download' | 'blob'
}

const fmtDate = (value: string) => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

const fmtDateTime = (value: string) => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

const fmtNumber = (value: number) => new Intl.NumberFormat('id-ID').format(Number(value) || 0)

const fmtMinutes = (value: number) => {
  const minutes = Number(value) || 0
  if (minutes < 60) return `${Math.round(minutes)} mnt`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours < 24) return `${hours}j ${rest}m`
  const days = Math.floor(hours / 24)
  return `${days}h ${hours % 24}j`
}

const deltaLabel = (current: number, previous: number) => {
  if (!previous) return '-'
  const delta = Math.round(((current - previous) / previous) * 100)
  return `${delta > 0 ? '+' : ''}${delta}%`
}

const severityRank: Record<string, number> = { CRITICAL: 0, MEDIUM: 1, LOW: 2 }

export async function generateItOslAnalyticsPDF({
  data,
  insights = [],
  company,
  userName = 'Administrator',
  userRole = 'IT Support',
  customerLabel = 'Semua Customer',
  mode = 'print',
}: GenerateOptions): Promise<{ blobUrl?: string }> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const W = 297
  const H = 210
  const M = 12
  const printableW = W - M * 2

  const cPrimary: [number, number, number] = [15, 23, 42]
  const cIndigo: [number, number, number] = [67, 56, 202]
  const cEmerald: [number, number, number] = [5, 150, 105]
  const cAmber: [number, number, number] = [217, 119, 6]
  const cRose: [number, number, number] = [225, 29, 72]
  const cMuted: [number, number, number] = [100, 116, 139]
  const cBorder: [number, number, number] = [203, 213, 225]
  const cBgCard: [number, number, number] = [248, 250, 252]

  let y = M

  // ── KOP PERUSAHAAN ────────────────────────────────────────────────────
  let logoWidth = 0
  const logoHeight = 13
  if (company?.logo) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = `${process.env.NEXT_PUBLIC_API_URL}${company.logo}`
      })
      if (img.complete && img.naturalWidth > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')?.drawImage(img, 0, 0)
        logoWidth = (img.naturalWidth / img.naturalHeight) * logoHeight
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', M, y, logoWidth, logoHeight)
      }
    } catch {
      logoWidth = 0
    }
  }

  const companyX = logoWidth > 0 ? M + logoWidth + 4 : M
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...cPrimary)
  doc.text(company?.name || 'PT AXON ECOSYSTEM', companyX, y + 4)

  doc.setFont('helvetica', 'normal').setFontSize(7.2).setTextColor(...cMuted)
  let companyY = y + 8
  if (company?.legalName && company.legalName !== company.name) {
    doc.text(String(company.legalName), companyX, companyY)
    companyY += 3
  }
  const address = [company?.address, company?.city, company?.province].filter(Boolean).join(', ')
  if (address) {
    doc.text(address.length > 85 ? `${address.slice(0, 85)}...` : address, companyX, companyY)
    companyY += 3
  }
  const contact = [
    company?.phone ? `Tel: ${company.phone}` : null,
    company?.email ? `Email: ${company.email}` : null,
  ].filter(Boolean).join(' | ')
  if (contact) doc.text(contact, companyX, companyY)

  const rightX = W - M
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...cIndigo)
  doc.text('LAPORAN ANALISA IT MAINTENANCE', rightX, y + 4, { align: 'right' })
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...cPrimary)
  doc.text('Incident, SLA, Kinerja Teknisi, Aset & Preventive Maintenance', rightX, y + 8, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...cMuted)
  doc.text(`Periode: ${fmtDate(data.range.from)} — ${fmtDate(data.range.to)} (${data.range.days} hari)`, rightX, y + 11.5, { align: 'right' })
  doc.text(`Filter: ${customerLabel} | Dicetak: ${fmtDateTime(new Date().toISOString())} WIB`, rightX, y + 14.8, { align: 'right' })
  doc.text(`Disiapkan oleh: ${userName} (${userRole})`, rightX, y + 18.1, { align: 'right' })

  y = Math.max(y + logoHeight, companyY) + 3
  doc.setDrawColor(...cIndigo).setLineWidth(0.6).line(M, y, W - M, y)
  doc.setDrawColor(...cBorder).setLineWidth(0.2).line(M, y + 0.8, W - M, y + 0.8)
  y += 4

  // ── KPI CARDS ─────────────────────────────────────────────────────────
  const cardGap = 2.6
  const cards = [
    { title: 'TOTAL TIKET', value: fmtNumber(data.total), sub: `${data.openInRange} masih terbuka`, accent: cIndigo },
    { title: 'SELESAI', value: fmtNumber(data.resolved + data.closed), sub: `${data.completionRate}% completion`, accent: cEmerald },
    { title: 'SLA COMPLIANCE', value: `${data.slaCompliance}%`, sub: `${data.breachCount} breach / ${data.slaEligible} tiket`, accent: data.slaCompliance >= 90 ? cEmerald : data.slaCompliance >= 75 ? cAmber : cRose },
    { title: 'AVG RESPONSE (FRT)', value: fmtMinutes(data.avgFrtMin), sub: `Median MTTR ${fmtMinutes(data.medianMttrMin)}`, accent: cIndigo },
    { title: 'AVG MTTR', value: fmtMinutes(data.avgMttrMin), sub: 'Tanpa waktu tunggu', accent: cEmerald },
    { title: 'BACKLOG AKTIF', value: fmtNumber(data.active), sub: `Rata-rata umur ${data.avgBacklogAgeDays} hari`, accent: data.active ? cAmber : cEmerald },
  ]
  const cardW = (printableW - cardGap * (cards.length - 1)) / cards.length
  const cardH = 14.5
  cards.forEach((card, index) => {
    const x = M + index * (cardW + cardGap)
    doc.setFillColor(...cBgCard)
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, cardW, cardH, 1.6, 1.6, 'FD')
    doc.setFillColor(...card.accent)
    doc.roundedRect(x, y, 1.8, cardH, 0.8, 0.8, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(5.6).setTextColor(...cMuted)
    doc.text(card.title, x + 3.2, y + 3.6)
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...card.accent)
    doc.text(card.value, x + 3.2, y + 8.4)
    doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(...cMuted)
    doc.text(card.sub, x + 3.2, y + 12)
  })
  y += cardH + 4

  // ── RINGKASAN EKSEKUTIF ───────────────────────────────────────────────
  const generatedInsights = insights.length
    ? insights
    : [
        `Total ${data.total} tiket pada periode ini dengan ${data.openInRange} tiket masih terbuka dan tingkat penyelesaian ${data.completionRate}%.`,
        `SLA compliance ${data.slaCompliance}% (${data.breachCount} dari ${data.slaEligible} tiket melewati batas respons).`,
        `Rata-rata first response ${fmtMinutes(data.avgFrtMin)} dan MTTR ${fmtMinutes(data.avgMttrMin)}.`,
        `Preventive maintenance: ${data.pm.executions} eksekusi, ${data.pm.issueFound} temuan masalah, tingkat keberhasilan ${data.pm.completionRate}%.`,
      ]

  doc.setFillColor(238, 242, 255)
  doc.setDrawColor(199, 210, 254)
  doc.setLineWidth(0.2)
  const insightHeight = 6 + generatedInsights.length * 4.4
  doc.roundedRect(M, y, printableW, insightHeight, 1.6, 1.6, 'FD')
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...cIndigo)
  doc.text('RINGKASAN EKSEKUTIF & REKOMENDASI', M + 3, y + 4.6)
  doc.setFont('helvetica', 'normal').setFontSize(6.8).setTextColor(51, 65, 85)
  generatedInsights.forEach((line, index) => {
    const text = doc.splitTextToSize(`• ${line}`, printableW - 8)
    doc.text(text[0], M + 3, y + 8.8 + index * 4.4)
  })
  y += insightHeight + 4

  // ── TABEL 1: KATEGORI ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('1. ANALISA BEBAN PER KATEGORI PEKERJAAN', M, y)
  y += 1.6
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [['NO', 'KATEGORI', 'TOTAL TIKET', 'SELESAI', 'SLA BREACH', '% DARI TOTAL']],
    body: data.byCategory.length
      ? data.byCategory.map((row, index) => [
          String(index + 1),
          row.name,
          fmtNumber(row.count),
          fmtNumber(row.resolved),
          fmtNumber(row.breach),
          `${data.total ? Math.round((row.count / data.total) * 100) : 0}%`,
        ])
      : [['-', 'Belum ada data pada periode ini', '-', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59] },
    headStyles: { fillColor: cPrimary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.6, halign: 'center', cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 118 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 47, halign: 'center' },
    },
  })
  y = (doc as any).lastAutoTable?.finalY || y + 20

  // ── TABEL 2: KINERJA TEKNISI ──────────────────────────────────────────
  if (y + 34 > H - 18) {
    doc.addPage()
    y = M
  } else {
    y += 6
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('2. KINERJA TEKNISI / PIC INTERNAL', M, y)
  y += 1.6
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [['NO', 'TEKNISI', 'TOTAL TIKET', 'SELESAI', 'AKTIF', 'SLA BREACH', 'AVG MTTR', 'COMPLETION']],
    body: data.technicians.length
      ? data.technicians.map((row, index) => [
          String(index + 1),
          row.name,
          fmtNumber(row.total),
          fmtNumber(row.resolved),
          fmtNumber(row.open),
          fmtNumber(row.breach),
          fmtMinutes(row.avgMttrMin),
          `${row.completionRate}%`,
        ])
      : [['-', 'Belum ada penugasan pada periode ini', '-', '-', '-', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59] },
    headStyles: { fillColor: cPrimary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.6, halign: 'center', cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
      6: { cellWidth: 32, halign: 'center' },
      7: { cellWidth: 31, halign: 'center' },
    },
  })
  y = (doc as any).lastAutoTable?.finalY || y + 20

  // ── TABEL 3: TIKET KRITIS / BREACH ────────────────────────────────────
  if (y + 40 > H - 18) {
    doc.addPage()
    y = M
  } else {
    y += 6
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('3. TIKET MELEWATI SLA / PERLU PERHATIAN', M, y)
  y += 1.6
  const sortedBreach = [...data.breachList].sort(
    (a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || b.ageMinutes - a.ageMinutes,
  )
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [['NO', 'NO. TIKET', 'RINGKASAN', 'SEVERITY', 'STATUS', 'LOKASI', 'TEKNISI', 'UMUR', 'BATAS SLA']],
    body: sortedBreach.length
      ? sortedBreach.map((row, index) => [
          String(index + 1),
          row.ticketNumber,
          row.summary,
          row.severity,
          row.status,
          row.location || '-',
          row.assignedTo || 'Belum ditugaskan',
          fmtMinutes(row.ageMinutes),
          fmtMinutes(row.thresholdMinutes),
        ])
      : [['-', '-', 'Tidak ada tiket yang melewati SLA pada periode ini', '-', '-', '-', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.4, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: [127, 29, 29], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.3, halign: 'center', cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [255, 247, 247] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 80 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 38 },
      6: { cellWidth: 36 },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 25, halign: 'center' },
    },
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 3) {
        const value = String(hook.cell.raw)
        if (value === 'CRITICAL') hook.cell.styles.textColor = cRose
        else if (value === 'MEDIUM') hook.cell.styles.textColor = cAmber
        else hook.cell.styles.textColor = cEmerald
      }
    },
  })
  y = (doc as any).lastAutoTable?.finalY || y + 20

  // ── TABEL 4 & 5: ASET & SPAREPART ─────────────────────────────────────
  if (y + 45 > H - 18) {
    doc.addPage()
    y = M
  } else {
    y += 6
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('4. ASET PALING SERING BERMASALAH', M, y)
  doc.text('5. SPAREPART TERPAKAI', M + 165, y)
  y += 1.6
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: W - M - 160 },
    head: [['KODE ASET', 'NAMA ASET', 'LOKASI', 'TIKET', 'BREACH']],
    body: data.topAssets.length
      ? data.topAssets.map((row) => [row.assetCode, row.name, row.location || '-', fmtNumber(row.count), fmtNumber(row.breach)])
      : [['-', 'Tidak ada aset bermasalah', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.4, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.3, halign: 'center', cellPadding: 1.7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 52 },
      2: { cellWidth: 44 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
    },
  })
  const assetFinalY = (doc as any).lastAutoTable?.finalY || y

  autoTable(doc, {
    startY: y,
    margin: { left: M + 165, right: M },
    head: [['NAMA SPAREPART', 'QTY', 'UNIT', 'TIKET']],
    body: data.partsUsed.length
      ? data.partsUsed.map((row) => [row.partName, fmtNumber(row.quantity), row.unit, fmtNumber(row.tickets)])
      : [['Tidak ada sparepart tercatat', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.4, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: [6, 95, 70], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.3, halign: 'center', cellPadding: 1.7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
    },
  })
  const partsFinalY = (doc as any).lastAutoTable?.finalY || y
  y = Math.max(assetFinalY, partsFinalY)

  // ── RINGKASAN OPERASIONAL (STATUS, SEVERITY, BACKLOG, PM, ASET) ───────
  if (y + 40 > H - 18) {
    doc.addPage()
    y = M
  } else {
    y += 6
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('6. RINGKASAN KONDISI OPERASIONAL', M, y)
  y += 1.6

  const statusLines = Object.entries(data.byStatus)
    .map(([key, value]) => `${key}: ${value}`)
    .join('  •  ') || '-'
  const severityLines = Object.entries(data.bySeverity)
    .map(([key, value]) => `${key}: ${value}`)
    .join('  •  ') || '-'
  const typeLines = Object.entries(data.byTicketType)
    .map(([key, value]) => `${key}: ${value}`)
    .join('  •  ') || '-'
  const aging = data.backlogAging

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [['INDIKATOR', 'NILAI', 'KETERANGAN']],
    body: [
      ['Distribusi Status', statusLines, `Tiket aktif saat ini: ${data.active}`],
      ['Distribusi Severity', severityLines, `Critical breach: ${data.bySeverity.CRITICAL ? data.breachList.filter((b) => b.severity === 'CRITICAL').length : 0}`],
      ['Jenis Tiket', typeLines, `Reopened: ${data.reopened} • Preventable: ${data.preventable}`],
      ['Backlog Aging', `0-1 hari: ${aging.d0_1} • 1-3 hari: ${aging.d1_3} • 3-7 hari: ${aging.d3_7} • >7 hari: ${aging.gt7}`, `Rata-rata umur backlog: ${data.avgBacklogAgeDays} hari`],
      ['Kategori Penyelesaian', data.bySolutionCategory.map((row) => `${row.name}: ${row.count}`).join(' • ') || '-', 'Distribusi tindakan perbaikan yang tercatat'],
      ['Alasan Tertahan', data.pendingReasons.map((row) => `${row.name}: ${row.count}`).join(' • ') || '-', `Backlog aktif saat ini: ${data.active} tiket`],
      ['Preventive Maintenance', `${data.pm.executions} eksekusi • ${data.pm.issueFound} temuan masalah`, `Jadwal aktif: ${data.pm.activeSchedules} • Keberhasilan: ${data.pm.completionRate}%`],
      ['Kesehatan Aset', `Total aset: ${fmtNumber(data.assets.total)} • Garansi habis ≤30 hari: ${data.assets.warrantyExpiring30d}`, Object.entries(data.assets.byStatus).map(([k, v]) => `${k}: ${v}`).join(' • ') || '-'],
      ['Perbandingan Periode', `Tiket: ${data.total} vs ${data.comparison.prevTotal} (${deltaLabel(data.total, data.comparison.prevTotal)})`, `SLA: ${data.comparison.slaCompliance}% vs ${data.comparison.prevSlaCompliance}% • MTTR: ${fmtMinutes(data.comparison.avgMttrMin)} vs ${fmtMinutes(data.comparison.prevAvgMttrMin)}`],
    ],
    styles: { font: 'helvetica', fontSize: 6.7, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: cPrimary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'center', cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 120 },
      2: { cellWidth: 108 },
    },
  })
  y = (doc as any).lastAutoTable?.finalY || y + 20

  // ── TABEL 7: DAFTAR TIKET TERBARU ─────────────────────────────────────
  if (y + 45 > H - 18) {
    doc.addPage()
    y = M
  } else {
    y += 6
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...cPrimary)
  doc.text('7. AKTIVITAS TIKET TERBARU', M, y)
  y += 1.6
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [['NO', 'NO. TIKET', 'TANGGAL', 'RINGKASAN', 'KATEGORI', 'LOKASI', 'SEVERITY', 'STATUS', 'SLA']],
    body: data.recent.length
      ? data.recent.map((row, index) => [
          String(index + 1),
          row.ticketNumber,
          fmtDate(row.createdAt),
          row.summary,
          row.category?.name || '-',
          row.location?.name || '-',
          row.severity,
          row.status,
          row.slaBreach ? 'BREACH' : 'OK',
        ])
      : [['-', '-', '-', 'Belum ada aktivitas pada periode ini', '-', '-', '-', '-', '-']],
    styles: { font: 'helvetica', fontSize: 6.4, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.15, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: cPrimary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.3, halign: 'center', cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 21, halign: 'center' },
      3: { cellWidth: 80 },
      4: { cellWidth: 36 },
      5: { cellWidth: 34 },
      6: { cellWidth: 19, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 21, halign: 'center' },
    },
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 8) {
        hook.cell.styles.fontStyle = 'bold'
        hook.cell.styles.textColor = String(hook.cell.raw) === 'BREACH' ? cRose : cEmerald
      }
    },
  })
  y = (doc as any).lastAutoTable?.finalY || y + 20

  // ── TANDA TANGAN ──────────────────────────────────────────────────────
  if (y + 36 > H - 16) {
    doc.addPage()
    y = M + 6
  } else {
    y += 10
  }
  const signW = 60
  const colGap = (printableW - signW * 3) / 2
  const signBlocks = [
    { role: 'Dibuat Oleh (IT Support)', name: userName },
    { role: 'Diverifikasi (IT Lead / Supervisor)', name: '................................' },
    { role: 'Disetujui (Atasan / Manager)', name: '................................' },
  ]
  signBlocks.forEach((block, index) => {
    const x = M + index * (signW + colGap)
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...cMuted)
    doc.text(block.role, x + signW / 2, y, { align: 'center' })
    doc.setDrawColor(...cBorder).setLineWidth(0.2)
    doc.line(x, y + 20, x + signW, y + 20)
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...cPrimary)
    doc.text(block.name, x + signW / 2, y + 24, { align: 'center' })
  })

  // ── FOOTER ────────────────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...cBorder).setLineWidth(0.2)
    doc.line(M, H - 10, W - M, H - 10)
    doc.setFont('helvetica', 'normal').setFontSize(6.3).setTextColor(...cMuted)
    doc.text(
      `Dokumen internal — dihasilkan otomatis oleh Axon Ecosystem ERP · Modul IT Maintenance · ${company?.name || 'PT Axon Ecosystem'}`,
      M,
      H - 6.5,
    )
    doc.setFont('helvetica', 'bold').setFontSize(6.8).setTextColor(...cPrimary)
    doc.text(`Halaman ${page} dari ${pageCount}`, W - M, H - 6.5, { align: 'right' })
  }

  const fileName = `Laporan_IT_Maintenance_${data.range.from}_sd_${data.range.to}.pdf`

  if (mode === 'download') {
    doc.save(fileName)
    return {}
  }

  if (mode === 'print') {
    doc.autoPrint()
    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = blobUrl
    document.body.appendChild(iframe)
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.focus()
          iframe.contentWindow?.print()
        } catch {
          window.open(blobUrl, '_blank')
        }
      }, 300)
    }
    return { blobUrl }
  }

  const blob = doc.output('blob')
  return { blobUrl: URL.createObjectURL(blob) }
}
