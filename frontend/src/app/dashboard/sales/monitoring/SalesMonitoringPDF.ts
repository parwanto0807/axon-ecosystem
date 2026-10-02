/**
 * Pure jsPDF + AutoTable Generator for Sales Order, Invoicing & Receivables Monitoring
 * Axon Ecosystem ERP
 */

export interface RecapRowPDF {
    id: string
    customerId: string
    customer: { id: string; code: string; name: string; company?: string | null } | null
    quotationNumber: string | null
    quotationId: string | null
    quotationSubject?: string | null
    soSubject?: string | null
    soNumber: string
    poNumber: string | null
    soDate: string
    soStatus: string
    poTotal: number
    invoices: { id: string; number: string; date: string; dueDate?: string | null; status: string; grandTotal: number; paid: number }[]
    invoicedTotal: number
    paidTotal: number
    unbilledTotal: number
    unpaidTotal: number
    billingStatus: string
}

export interface QuotationOnlyPDF {
    id: string
    number: string
    date: string
    status: string
    subject?: string | null
    grandTotal: number
    customer: { id: string; code: string; name: string } | null
}

export interface SummaryPDF {
    poTotal: number
    invoicedTotal: number
    paidTotal: number
    unbilledTotal: number
    unpaidTotal: number
    count: number
}

interface GeneratePDFOptions {
    rows: RecapRowPDF[]
    summary: SummaryPDF
    quotationsWithoutSO?: QuotationOnlyPDF[]
    selectedCustomer?: { id: string; code: string; name: string; company?: string | null } | null
    selectedStatus?: string
    statusLabel?: string
    company?: any
    userName?: string
    mode?: 'print' | 'download' | 'blob'
}

const fmtCurrency = (n: number) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`
const fmtDate = (d: string) => {
    try {
        if (!d) return '-'
        return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
        return "-"
    }
}

export async function generateSalesMonitoringPDF({
    rows,
    summary,
    quotationsWithoutSO = [],
    selectedCustomer,
    selectedStatus = 'ALL',
    statusLabel = 'Semua Status',
    company,
    userName = 'Administrator',
    mode = 'print'
}: GeneratePDFOptions): Promise<{ blobUrl?: string }> {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    // A4 Landscape: 297mm width x 210mm height
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
    })

    const W = 297
    const H = 210
    const M = 12 // Margin in mm
    const printableW = W - (M * 2) // 273 mm

    // Corporate Color Palette
    const cPrimary: [number, number, number] = [15, 23, 42]     // #0f172a Slate 900
    const cIndigo: [number, number, number] = [67, 56, 202]     // #4338ca Indigo 700
    const cEmerald: [number, number, number] = [5, 150, 105]    // #059669 Emerald 600
    const cAmber: [number, number, number] = [217, 119, 6]      // #d97706 Amber 600
    const cRose: [number, number, number] = [225, 29, 72]       // #e11d48 Rose 600
    const cSlateMuted: [number, number, number] = [100, 116, 139] // Slate 500
    const cBorder: [number, number, number] = [203, 213, 225]   // Slate 300
    const cBgCard: [number, number, number] = [248, 250, 252]   // Slate 50

    let currentY = M

    // ─── 1. KOP SURAT / HEADER PERUSAHAAN ────────────────────────────
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
                const cv = document.createElement('canvas')
                cv.width = img.naturalWidth
                cv.height = img.naturalHeight
                cv.getContext('2d')?.drawImage(img, 0, 0)
                logoWidth = (img.naturalWidth / img.naturalHeight) * logoHeight
                doc.addImage(cv.toDataURL('image/png'), 'PNG', M, currentY, logoWidth, logoHeight)
            }
        } catch {
            // skip logo if error
        }
    }

    const companyInfoX = logoWidth > 0 ? M + logoWidth + 4 : M
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...cPrimary)
    doc.text(company?.name || 'PT. AXON ECOSYSTEM', companyInfoX, currentY + 4)

    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...cSlateMuted)
    let compY = currentY + 8
    if (company?.legalName && company.legalName !== company.name) {
        doc.text(company.legalName, companyInfoX, compY)
        compY += 3.2
    }
    const addressLine = [company?.address, company?.city, company?.province].filter(Boolean).join(', ')
    if (addressLine) {
        doc.text(addressLine.length > 70 ? addressLine.slice(0, 70) + '...' : addressLine, companyInfoX, compY)
        compY += 3.2
    }
    const contactLine = [
        company?.phone ? `Tel: ${company.phone}` : null,
        company?.email ? `Email: ${company.email}` : null,
        company?.taxId ? `NPWP: ${company.taxId}` : null
    ].filter(Boolean).join(' | ')
    if (contactLine) {
        doc.text(contactLine, companyInfoX, compY)
    }

    // Header Right Side (Document Title & Metadata Box)
    const rightColX = W - M
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...cIndigo)
    doc.text('MONITORING & REKAPITULASI PENJUALAN', rightColX, currentY + 4, { align: 'right' })

    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...cPrimary)
    doc.text('Sales Order, Penagihan (Invoicing) & Piutang', rightColX, currentY + 8, { align: 'right' })

    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...cSlateMuted)
    const nowStr = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
    doc.text(`Dicetak: ${nowStr} WIB | User: ${userName}`, rightColX, currentY + 11.5, { align: 'right' })
    const filterInfo = selectedCustomer
        ? `Customer: ${selectedCustomer.code} - ${selectedCustomer.company || selectedCustomer.name} | Status: ${statusLabel}`
        : `Filter: Semua Customer | Status: ${statusLabel}`
    doc.text(filterInfo, rightColX, currentY + 14.8, { align: 'right' })

    // Divider bar
    currentY = Math.max(currentY + logoHeight, compY) + 3
    doc.setDrawColor(...cIndigo).setLineWidth(0.6).line(M, currentY, W - M, currentY)
    doc.setDrawColor(...cBorder).setLineWidth(0.2).line(M, currentY + 0.8, W - M, currentY + 0.8)
    currentY += 4

    // ─── 2. EXECUTIVE METRICS SUMMARY BOX (5 CARDS) ──────────────────
    const cardGap = 3
    const numCards = 5
    const cardW = (printableW - (cardGap * (numCards - 1))) / numCards
    const cardH = 13.5

    const cardsData = [
        {
            title: 'TOTAL NILAI PO / SO',
            val: fmtCurrency(summary.poTotal),
            sub: `${summary.count} Pesanan Penjualan`,
            accent: cIndigo
        },
        {
            title: 'SUDAH DITAGIH (INVOICED)',
            val: fmtCurrency(summary.invoicedTotal),
            sub: summary.poTotal > 0 ? `${((summary.invoicedTotal / summary.poTotal) * 100).toFixed(1)}% Realisasi` : '0%',
            accent: cIndigo
        },
        {
            title: 'SUDAH DIBAYAR (CASH IN)',
            val: fmtCurrency(summary.paidTotal),
            sub: summary.invoicedTotal > 0 ? `${((summary.paidTotal / summary.invoicedTotal) * 100).toFixed(1)}% dari Tagihan` : '0%',
            accent: cEmerald
        },
        {
            title: 'PO BELUM DITAGIH',
            val: fmtCurrency(summary.unbilledTotal),
            sub: summary.poTotal > 0 ? `${((summary.unbilledTotal / summary.poTotal) * 100).toFixed(1)}% dari PO` : '0%',
            accent: cAmber
        },
        {
            title: 'PIUTANG BELUM TERBAYAR',
            val: fmtCurrency(summary.unpaidTotal),
            sub: summary.unpaidTotal > 0 ? 'Perlu Follow-up Tagihan' : 'Semua Tagihan Tertagih',
            accent: summary.unpaidTotal > 0 ? cRose : cEmerald
        },
    ]

    cardsData.forEach((c, idx) => {
        const x = M + (idx * (cardW + cardGap))
        // Card background
        doc.setFillColor(...cBgCard)
        doc.setDrawColor(...cBorder)
        doc.setLineWidth(0.2)
        doc.roundedRect(x, currentY, cardW, cardH, 1.5, 1.5, 'FD')

        // Left accent strip
        doc.setFillColor(...c.accent)
        doc.roundedRect(x, currentY, 1.8, cardH, 0.8, 0.8, 'F')

        // Title
        doc.setFont('helvetica', 'bold').setFontSize(5.8).setTextColor(...cSlateMuted)
        doc.text(c.title, x + 3.2, currentY + 3.5)

        // Value
        doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...c.accent)
        doc.text(c.val, x + 3.2, currentY + 7.8)

        // Subtitle
        doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(...cSlateMuted)
        doc.text(c.sub, x + 3.2, currentY + 11.2)
    })

    currentY += cardH + 4

    // ─── 3. AUTOTABLE: MAIN SALES ORDER & BILLING RECAP ──────────────
    const tableHeaders = [
        [
            'NO',
            'Customer & Kode',
            'No. Penawaran & Perihal',
            'No. SO & Ref PO',
            'Tgl SO',
            'Nilai PO (IDR)',
            'Daftar No. Invoice',
            'Ditagih (IDR)',
            'Dibayar (IDR)',
            'Belum Tagih (IDR)',
            'Piutang (IDR)',
            'Status'
        ]
    ]

    const statusTranslations: Record<string, string> = {
        PO_BELUM_TAGIH: 'PO Blm Ditagih',
        SEBAGIAN_DITAGIH: 'Sebagian Ditagih',
        SUDAH_TAGIH_BELUM_BAYAR: 'Ditagih (Blm Bayar)',
        SEBAGIAN_DIBAYAR: 'Sebagian Dibayar',
        LUNAS: 'LUNAS',
        CANCELLED: 'Batal'
    }

    const tableData = rows.map((r, index) => {
        const customerText = `${r.customer?.name || '-'}\n[${r.customer?.code || '-'}]`
        const quoText = r.quotationNumber
            ? `${r.quotationNumber}${r.quotationSubject ? `\nPerihal: ${r.quotationSubject}` : ''}`
            : (r.quotationSubject || r.soSubject ? `Perihal: ${r.quotationSubject || r.soSubject}` : '-')
        const soPoText = `${r.soNumber}${r.poNumber ? `\nPO: ${r.poNumber}` : ''}`
        const invListText = r.invoices.length === 0
            ? '-'
            : r.invoices.map(i => `${i.number} (${fmtCurrency(i.grandTotal)})`).join('\n')
        const statusText = statusTranslations[r.billingStatus] || r.billingStatus

        return [
            String(index + 1),
            customerText,
            quoText,
            soPoText,
            fmtDate(r.soDate),
            fmtCurrency(r.poTotal),
            invListText,
            fmtCurrency(r.invoicedTotal),
            fmtCurrency(r.paidTotal),
            fmtCurrency(r.unbilledTotal),
            fmtCurrency(r.unpaidTotal),
            statusText
        ]
    })

    // Footer grand totals with colSpan to span columns 0-4 neatly
    const grandTotals: any[] = [
        {
            content: `TOTAL KESELURUHAN (${rows.length} DOKUMEN SO)`,
            colSpan: 5,
            styles: { halign: 'right', fontStyle: 'bold', fontSize: 7 }
        },
        {
            content: fmtCurrency(rows.reduce((s, r) => s + r.poTotal, 0)),
            styles: { halign: 'right', fontStyle: 'bold' }
        },
        {
            content: '',
            styles: { halign: 'center' }
        },
        {
            content: fmtCurrency(rows.reduce((s, r) => s + r.invoicedTotal, 0)),
            styles: { halign: 'right', fontStyle: 'bold' }
        },
        {
            content: fmtCurrency(rows.reduce((s, r) => s + r.paidTotal, 0)),
            styles: { halign: 'right', fontStyle: 'bold', textColor: [52, 211, 153] }
        },
        {
            content: fmtCurrency(rows.reduce((s, r) => s + r.unbilledTotal, 0)),
            styles: { halign: 'right', fontStyle: 'bold', textColor: [251, 191, 36] }
        },
        {
            content: fmtCurrency(rows.reduce((s, r) => s + r.unpaidTotal, 0)),
            styles: { halign: 'right', fontStyle: 'bold', textColor: [248, 113, 113] }
        },
        {
            content: '',
            styles: { halign: 'center' }
        }
    ]

    // Adjusted to exactly 273mm printable width:
    const adjustedColWidths = {
        0: 7,   // NO
        1: 34,  // Customer
        2: 36,  // Quo & Perihal
        3: 27,  // SO & PO
        4: 16,  // Tgl SO
        5: 23,  // Nilai PO
        6: 25,  // Invoices
        7: 21,  // Ditagih
        8: 21,  // Dibayar
        9: 22,  // Belum Tagih
        10: 22, // Piutang
        11: 19  // Status
    } // sum: 7+34+36+27+16+23+25+21+21+22+22+19 = 273 mm exactly!

    autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        foot: [grandTotals],
        startY: currentY,
        margin: { left: M, right: M, bottom: 22, top: M },
        styles: {
            fontSize: 6.8,
            cellPadding: 1.6,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.15,
            overflow: 'linebreak',
            font: 'helvetica'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6.8,
            cellPadding: 2
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        footStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.2,
            cellPadding: 2
        },
        columnStyles: {
            0: { cellWidth: adjustedColWidths[0], halign: 'center' },
            1: { cellWidth: adjustedColWidths[1], halign: 'left', fontStyle: 'bold' },
            2: { cellWidth: adjustedColWidths[2], halign: 'center' },
            3: { cellWidth: adjustedColWidths[3], halign: 'left' },
            4: { cellWidth: adjustedColWidths[4], halign: 'center' },
            5: { cellWidth: adjustedColWidths[5], halign: 'right', fontStyle: 'bold' },
            6: { cellWidth: adjustedColWidths[6], halign: 'left' },
            7: { cellWidth: adjustedColWidths[7], halign: 'right' },
            8: { cellWidth: adjustedColWidths[8], halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
            9: { cellWidth: adjustedColWidths[9], halign: 'right', textColor: [180, 83, 9] },
            10: { cellWidth: adjustedColWidths[10], halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
            11: { cellWidth: adjustedColWidths[11], halign: 'center' },
        },
        didParseCell: (data) => {
            // Custom styling for specific values
            if (data.section === 'body') {
                if (data.column.index === 11) {
                    const val = String(data.cell.raw)
                    if (val === 'LUNAS') {
                        data.cell.styles.textColor = [5, 150, 105]
                        data.cell.styles.fontStyle = 'bold'
                    } else if (val.includes('Blm') || val.includes('Ditagih')) {
                        data.cell.styles.textColor = [180, 83, 9]
                    }
                }
            }
        }
    })

    let finalY = (doc as any).lastAutoTable?.finalY || currentY + 40

    // ─── 4. SECONDARY TABLE: PENAWARAN TANPA SO (JIKA ADA) ───────────
    if (quotationsWithoutSO && quotationsWithoutSO.length > 0 && selectedCustomer) {
        if (finalY + 45 > H - 25) {
            doc.addPage()
            finalY = M
        } else {
            finalY += 6
        }

        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...cIndigo)
        doc.text(`PENAWARAN HARGA YANG BELUM MENJADI SO / PO (${quotationsWithoutSO.length} DOKUMEN)`, M, finalY)
        finalY += 2

        const quoHeaders = [['NO', 'No. Penawaran & Perihal', 'Tanggal', 'Status', 'Customer', 'Nilai Penawaran (IDR)']]
        const quoData = quotationsWithoutSO.map((q, idx) => [
            String(idx + 1),
            `${q.number}${q.subject ? `\nPerihal: ${q.subject}` : ''}`,
            fmtDate(q.date),
            q.status,
            q.customer?.name || '-',
            fmtCurrency(q.grandTotal)
        ])

        autoTable(doc, {
            head: quoHeaders,
            body: quoData,
            startY: finalY,
            margin: { left: M, right: M, bottom: 22 },
            styles: { fontSize: 6.8, cellPadding: 1.5, lineColor: [226, 232, 240], lineWidth: 0.15 },
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 85, halign: 'left' },
                5: { cellWidth: 63, halign: 'right', fontStyle: 'bold' }
            }
        })

        finalY = (doc as any).lastAutoTable?.finalY || finalY + 20
    }

    // ─── 5. TANDA TANGAN / OTORISASI PERUSAHAAN ───────────────────────
    if (finalY + 32 > H - 18) {
        doc.addPage()
        finalY = M + 5
    } else {
        finalY += 8
    }

    const signW = 55
    const signH = 20
    const colSpacing = (printableW - (signW * 3)) / 2

    const signs = [
        { role: 'Dibuat Oleh (Sales Dept)', name: userName || 'Sales Executive' },
        { role: 'Diverifikasi (Finance & AR)', name: 'Finance Accounting' },
        { role: 'Mengetahui & Menyetujui', name: company?.directorName || 'Management / Direksi' }
    ]

    signs.forEach((s, i) => {
        const sx = M + (i * (signW + colSpacing))
        doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...cSlateMuted)
        doc.text(s.role, sx + (signW / 2), finalY, { align: 'center' })

        // Box tanda tangan halus
        doc.setDrawColor(...cBorder).setLineWidth(0.2)
        doc.line(sx, finalY + signH, sx + signW, finalY + signH)

        doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...cPrimary)
        doc.text(s.name, sx + (signW / 2), finalY + signH + 3.5, { align: 'center' })
    })

    // ─── 6. FOOTER & NOMOR HALAMAN PADA SEMUA HALAMAN ─────────────────
    const pageCount = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        // Bottom border line
        doc.setDrawColor(...cBorder).setLineWidth(0.2).line(M, H - 10, W - M, H - 10)

        // Left note
        doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...cSlateMuted)
        doc.text(
            `Dokumen ini sah dihasilkan secara elektronik oleh Axon Ecosystem ERP Platform · ${company?.name || 'PT. Axon Ecosystem'}`,
            M,
            H - 6.5
        )

        // Right page number
        doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...cPrimary)
        doc.text(`Halaman ${i} dari ${pageCount}`, W - M, H - 6.5, { align: 'right' })
    }

    // ─── 7. OUTPUT HANDLING (PRINT / DOWNLOAD / BLOB) ────────────────
    const safeCustName = (selectedCustomer?.code || 'SEMUA_CUSTOMER').replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `Rekap_Monitoring_Sales_${safeCustName}_${new Date().toISOString().slice(0, 10)}.pdf`

    if (mode === 'download') {
        doc.save(fileName)
        return {}
    }

    if (mode === 'print') {
        // Direct Print purely using jsPDF
        doc.autoPrint()
        const blob = doc.output('blob')
        const blobUrl = URL.createObjectURL(blob)

        // Try direct printing via hidden iframe
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

    // Default: Blob output for modal preview
    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)
    return { blobUrl }
}
