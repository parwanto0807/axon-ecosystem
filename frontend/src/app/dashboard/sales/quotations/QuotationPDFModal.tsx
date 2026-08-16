"use client"
import { useState, Fragment } from "react"
import { motion } from "framer-motion"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuotationItem { id?: string; no: number; description: string; qty: number; unit: string; unitPrice: number; discount: number; amount: number; costPrice?: number }
interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null }
interface Quotation {
    id: string; number: string; date: string; validUntil: string; status: string
    customer: Customer; attn: string | null; subject: string; notes: string | null
    paymentTerms: string | null; deliveryTerms: string | null; currency: string
    discount: number; tax: number; subtotal: number; discountAmt: number; taxAmt: number; grandTotal: number
    items: QuotationItem[]
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    EXPIRED: { label: 'Expired', color: 'bg-amber-50 text-amber-700 border-amber-200' },
}
const fd = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function QuotationPDFModal({ quotation, company, products, onClose }:
    { quotation: Quotation; company: Record<string, string>; products: any[]; onClose: () => void }) {

    const [busy, setBusy] = useState(false)
    const [showProductImages, setShowProductImages] = useState(false)
    const [showTotals, setShowTotals] = useState(true)
    const [showBreakdown, setShowBreakdown] = useState(false)
    const c = quotation.customer
    const sc = STATUS_CFG[quotation.status] || STATUS_CFG.DRAFT

    const getProductImage = (it: QuotationItem) => {
        if (!products) return null
        // 1. Match by SKU code inside parentheses at the end of the description
        const codeMatch = it.description.match(/\(([^)]+)\)$/)
        if (codeMatch) {
            const code = codeMatch[1]
            for (const p of products) {
                const hasSku = p.skus?.some((s: any) => s.code === code)
                if (hasSku && p.image) return p.image
            }
        }
        // 2. Match by exact or partial product/SKU name inside description
        const lowerDesc = it.description.toLowerCase()
        for (const p of products) {
            if (lowerDesc.includes(p.name.toLowerCase()) && p.image) {
                return p.image
            }
            const skuMatch = p.skus?.find((s: any) => s.name && lowerDesc.includes(s.name.toLowerCase()))
            if (skuMatch && p.image) {
                return p.image
            }
        }
        return null
    }

    const generatePDF = async () => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')
            const doc = new jsPDF({ orientation: showBreakdown ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
            const W = showBreakdown ? 297 : 210; const M = 15
            const indigo = [79, 70, 229] as [number, number, number]
            const dark = [15, 23, 42] as [number, number, number]
            const gray = [100, 116, 139] as [number, number, number]
            const white = [255, 255, 255] as [number, number, number]
            const light = [241, 245, 249] as [number, number, number]
            let y = M

            // Pre-load product images if requested
            const loadedImages: Record<string, HTMLImageElement> = {}
            if (showProductImages && products) {
                await Promise.all(
                    quotation.items.map(async (it) => {
                        const imgPath = getProductImage(it)
                        if (imgPath) {
                            try {
                                const img = new Image(); img.crossOrigin = 'anonymous'
                                await new Promise<void>(r => {
                                    img.onload = () => r()
                                    img.onerror = () => r()
                                    img.src = `${process.env.NEXT_PUBLIC_API_URL}${imgPath}`
                                })
                                if (img.complete && img.naturalWidth > 0) {
                                    loadedImages[it.id || it.no] = img
                                }
                            } catch { /* skip */ }
                        }
                    })
                )
            }

            // Logo
            let logoWidth = 0
            if (company.logo) {
                try {
                    const img = new Image(); img.crossOrigin = 'anonymous'
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `${process.env.NEXT_PUBLIC_API_URL}${company.logo}` })
                    if (img.complete && img.naturalWidth > 0) {
                        const cv = document.createElement('canvas')
                        cv.width = img.naturalWidth; cv.height = img.naturalHeight
                        cv.getContext('2d')!.drawImage(img, 0, 0)
                        const h = 12
                        logoWidth = (img.naturalWidth / img.naturalHeight) * h
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, logoWidth, h)
                    }
                } catch { /* skip */ }
            }

            // Company info
            const ix = logoWidth > 0 ? M + logoWidth + 5 : M
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
            doc.text(company.name || 'PT. Axon Ecosystem', ix, y + 5)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let cy = y + 11
            // Only show legalName if it differs from name
            if (company.legalName && company.legalName !== company.name) { doc.text(company.legalName, ix, cy); cy += 4 }
            if (company.address) {
                const addrParts = [company.address, [company.city, company.province].filter(Boolean).join(', '), company.postalCode].filter(Boolean).join(' — ')
                const addrLines = doc.splitTextToSize(addrParts, 88)
                doc.text(addrLines, ix, cy); cy += addrLines.length * 4
            }
            if (company.phone) { doc.text(`Tel: ${company.phone}`, ix, cy); cy += 4 }
            if (company.email) { doc.text(`Email: ${company.email}`, ix, cy); cy += 4 }
            if (company.taxId) { doc.text(`NPWP: ${company.taxId}`, ix, cy) }

            // Quotation number/date block (right side of header)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const hdr = [['No.', quotation.number], ['Tanggal', fd(quotation.date)], ['Berlaku s/d', fd(quotation.validUntil)], ['Mata Uang', quotation.currency]]
            let hy = y + 4
            hdr.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold'); doc.text(`${k} :`, W - M - 28, hy, { align: 'right' })
                doc.setFont('helvetica', 'normal').setTextColor(...dark); doc.text(v, W - M, hy, { align: 'right' })
                doc.setTextColor(...gray); hy += 4.5
            })

            // Separator line
            y = Math.max(cy, hy) + 5
            doc.setDrawColor(...indigo).setLineWidth(0.8).line(M, y, W - M, y)
            y += 7

            // Title — centered below separator, smaller
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...indigo)
            doc.text(showBreakdown ? 'BREAKDOWN PROJECT' : 'PENAWARAN HARGA', W / 2, y, { align: 'center' })
            y += 8

            // Recipient section
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('KEPADA YTH.', M, y)
            y += 4
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark).text(c?.name || '', M, y)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let ry = y + 4
            if (quotation.attn) { doc.text(`U/p: ${quotation.attn}`, M, ry); ry += 4 }
            if (c?.address) { const ls = doc.splitTextToSize(c.address, 100); doc.text(ls, M, ry); ry += ls.length * 4 }
            if (c?.phone) { doc.text(`Tel: ${c.phone}`, M, ry); ry += 4 }

            y = ry + 4
            // Detail Penawaran section - Full Width Rows
            doc.setDrawColor(...light).setLineWidth(0.3).line(M, y, W - M, y); y += 6
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('DETAIL PENAWARAN', M, y); y += 5

            const detaLines = [
                ['Perihal', quotation.subject],
                ['Termin Bayar', quotation.paymentTerms],
                ['Syarat Kirim', quotation.deliveryTerms]
            ].filter(([, v]) => v !== null && v !== undefined) as [string, string][]

            detaLines.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray).text(k, M, y)
                doc.setFont('helvetica', 'normal').setTextColor(...dark)
                const ls = doc.splitTextToSize(`: ${v}`, W - M * 2 - 30) // v is now guaranteed string
                doc.text(ls, M + 30, y)
                y += Math.max(ls.length * 4, 5)
            })
            y += 4

            // Items table
            const sortedItems = [...(quotation.items || [])].sort((a, b) => a.no - b.no)

            const fn = (n: number) => n.toLocaleString('id-ID');
            const headRows = showBreakdown
                ? [['No', 'Detail Item', 'Qty', 'Unit', 'Harga(Rp)', 'HPP(Rp)', 'Disc', 'Total(Rp)', 'Tot.HPP(Rp)', 'Profit(Rp)', '%']]
                : [['No', 'Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Disc%', 'Jumlah']]

            const bodyRows: any[] = showBreakdown
                ? sortedItems.flatMap(it => {
                    const totalJual = it.amount;
                    const totalHPP = (it.costPrice || 0) * it.qty;
                    const profit = totalJual - totalHPP;
                    const profitPct = totalJual > 0 ? ((profit / totalJual) * 100).toFixed(1) : '0';
                    return [
                        [
                            { content: it.no, styles: { halign: 'center', fontStyle: 'bold' } },
                            { content: it.description, colSpan: 10, styles: { fontStyle: 'bold', textColor: indigo } }
                        ],
                        [
                            '',
                            '',
                            { content: it.qty, styles: { halign: 'center' } },
                            { content: it.unit, styles: { halign: 'center' } },
                            { content: fn(it.unitPrice), styles: { halign: 'right' } },
                            { content: fn(it.costPrice || 0), styles: { halign: 'right', textColor: [180, 83, 9] } },
                            { content: it.discount > 0 ? `${it.discount}%` : '-', styles: { halign: 'center' } },
                            { content: fn(totalJual), styles: { halign: 'right', fontStyle: 'bold' } },
                            { content: fn(totalHPP), styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] } },
                            { content: fn(profit), styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } },
                            { content: profitPct, styles: { halign: 'center', fontStyle: 'bold', textColor: [22, 163, 74] } }
                        ]
                    ]
                })
                : sortedItems.map(it => {
                    return [it.no, it.description, it.qty, it.unit, fr(it.unitPrice), it.discount > 0 ? `${it.discount}%` : '-', fr(it.amount)]
                })

            const colStyles: any = showBreakdown ? {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'left' },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'center', cellWidth: 15 },
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', cellWidth: 24 },
                6: { halign: 'center', cellWidth: 12 },
                7: { halign: 'right', cellWidth: 24 },
                8: { halign: 'right', cellWidth: 24 },
                9: { halign: 'right', cellWidth: 24 },
                10: { halign: 'center', cellWidth: 12 }
            } : {
                0: { halign: 'center', cellWidth: 10 }, 
                1: { halign: 'left', cellPadding: showProductImages ? { left: 15, top: 3, right: 4, bottom: 3 } : 4 }, 
                2: { halign: 'center', cellWidth: 14 }, 
                3: { halign: 'center', cellWidth: 16 }, 
                4: { halign: 'right', cellWidth: 32 }, 
                5: { halign: 'center', cellWidth: 14 }, 
                6: { halign: 'right', cellWidth: 32 }
            }

            autoTable(doc, {
                startY: y, margin: { left: M, right: M },
                head: headRows,
                body: bodyRows,
                headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: dark, minCellHeight: showProductImages && !showBreakdown ? 13 : 0 },
                columnStyles: colStyles,
                didParseCell: (data: any) => {
                    if (data.section === 'body') {
                        const itemIdx = showBreakdown ? Math.floor(data.row.index / 2) : data.row.index;
                        data.cell.styles.fillColor = itemIdx % 2 === 0 ? light : white;
                    }
                },
                styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
                didDrawCell: (data) => {
                    if (data.column.index === 1 && data.cell.section === 'body') {
                        const itemIdx = data.row.index
                        const item = sortedItems[itemIdx]
                        const img = item ? loadedImages[item.id || item.no] : undefined
                        if (img) {
                            try {
                                const cv = document.createElement('canvas')
                                cv.width = img.naturalWidth; cv.height = img.naturalHeight
                                cv.getContext('2d')!.drawImage(img, 0, 0)
                                // Draw a 9x9mm thumbnail in the cell
                                const x = data.cell.x + 2
                                const y = data.cell.y + (data.cell.height - 9) / 2
                                doc.addImage(cv.toDataURL('image/png'), 'PNG', x, y, 9, 9)
                            } catch { /* skip */ }
                        }
                    }
                }
            })

            y = (doc as any).lastAutoTable.finalY + 8

            // Check page break for Totals
            if (showTotals) {
                if (y > 250) { doc.addPage(); y = 20 }

                // Totals
                const bx = W - M - 80
                const tots: [string, string][] = [['Subtotal', fr(quotation.subtotal)]]
                if (quotation.discount > 0) tots.push([`Diskon (${quotation.discount}%)`, `- ${fr(quotation.discountAmt)}`])
                tots.push([`PPN (${quotation.tax}%)`, `+ ${fr(quotation.taxAmt)}`])

                if (showBreakdown) {
                    const totalHPP = quotation.items.reduce((s, it) => s + (it.costPrice || 0) * it.qty, 0)
                    const totalJual = quotation.subtotal
                    const profitTotal = totalJual - totalHPP
                    const profitTotalPct = totalJual > 0 ? ((profitTotal / totalJual) * 100).toFixed(1) + '%' : '0%'
                    
                    tots.push(['Total HPP', fr(totalHPP)])
                    tots.push(['Total Profit', fr(profitTotal)])
                    tots.push(['% Profit', profitTotalPct])
                }
                doc.setFontSize(8)
                tots.forEach(([k, v]) => {
                    doc.setFont('helvetica', 'normal').setTextColor(...gray).text(k, bx, y)
                    doc.setFont('helvetica', 'bold').setTextColor(...dark).text(v, W - M, y, { align: 'right' })
                    y += 5
                })
                doc.setDrawColor(...indigo).setLineWidth(0.5).line(bx, y, W - M, y); y += 5
                doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...indigo)
                doc.text('TOTAL', bx, y).text(fr(quotation.grandTotal), W - M, y, { align: 'right' })
                y += 10
            }

            // Notes & Terms - Bottom Fixed
            if (quotation.notes) {
                doc.setFont('helvetica', 'normal').setFontSize(8)
                const nl = doc.splitTextToSize(quotation.notes, W - M * 2)
                const nh = (nl.length * 4) + 15
                if (y + nh > 275) { doc.addPage(); y = 20 }

                doc.setDrawColor(...light).setLineWidth(0.5).line(M, y, W - M, y)
                y += 6
                doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray).text('CATATAN & SYARAT KETENTUAN', M, y)
                y += 5
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(71, 85, 105)
                doc.text(nl, M, y)
                y += (nl.length * 4) + 10
            }

            // Signatures
            if (y > 230) { doc.addPage(); y = 20 }
            const sw = (W - M * 2 - 10) / 2
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text('Disetujui oleh,', M, y)
            doc.text('Hormat kami,', M + sw + 10, y)
            doc.text(`${company.city || 'Jakarta'}, ${fd(quotation.date)}`, M + sw + 10, y + 4)

            // TTD Image
            try {
                const ttdImg = new Image(); ttdImg.crossOrigin = 'anonymous'
                await new Promise<void>(r => { ttdImg.onload = () => r(); ttdImg.onerror = () => r(); ttdImg.src = '/TTD Fix.png' })
                if (ttdImg.complete && ttdImg.naturalWidth > 0) {
                    const tcv = document.createElement('canvas')
                    tcv.width = ttdImg.naturalWidth; tcv.height = ttdImg.naturalHeight
                    tcv.getContext('2d')!.drawImage(ttdImg, 0, 0)
                    const ratio = ttdImg.naturalHeight / ttdImg.naturalWidth
                    const dw = 45; const dh = dw * ratio
                    doc.addImage(tcv.toDataURL('image/png'), 'PNG', M + sw + 10, y + 2, dw, dh)
                    y += Math.max(25, dh + 5)
                } else {
                    y += 26
                }
            } catch {
                y += 26
            }

            doc.setDrawColor(203, 213, 225).setLineWidth(0.4).line(M, y, M + sw, y).line(M + sw + 10, y, M + sw * 2 + 10, y)
            y += 4
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text('Nama / Jabatan', M, y); doc.text('Nama / Jabatan', M + sw + 10, y); y += 4
            doc.setFont('helvetica', 'bold').setTextColor(...dark)
            doc.text(c?.name || '', M, y); doc.text(company.name || '', M + sw + 10, y)

            // Footer
            const pc = doc.getNumberOfPages()
            for (let i = 1; i <= pc; i++) {
                doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7).setTextColor(...gray)
                doc.text(`Dokumen resmi dari ${company.name || 'PT. Axon Ecosystem'}`, M, 290)
                doc.text(`Hal ${i} / ${pc}`, W - M, 290, { align: 'right' })
            }
            doc.save(`${quotation.number}.pdf`)
        } catch (e) { console.error(e); alert('Gagal generate PDF') }
        finally { setBusy(false) }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4">

                {/* Toolbar */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>{quotation.number}</span>
                        <span className="text-slate-500 text-sm font-medium">{c?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Totals</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="w-px h-4 bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Gambar Produk</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={showProductImages} onChange={(e) => setShowProductImages(e.target.checked)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="w-px h-4 bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Breakdown HPP</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-emerald-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                        <Button onClick={generatePDF} disabled={busy}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                            <Download size={13} className="mr-2" />
                            {busy ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
                    </div>
                </div>

                {/* A4 Preview */}
                <div style={{ padding: '24px', background: '#f1f5f9' }}>
                    <div id="quo-a4-preview" style={{ background: '#fff', maxWidth: showBreakdown ? 1122 : 794, margin: '0 auto', padding: '40px 48px', fontFamily: 'Arial,sans-serif', fontSize: 11, color: '#0f172a', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,.1)' }}>

                        {/* Header — company left | quotation details right */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #4f46e5', paddingBottom: 18, marginBottom: 0 }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                {company.logo && <img src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo}`} alt="logo" style={{ height: 60, width: 'auto', objectFit: 'contain' }} />}
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 17, color: '#0f172a', marginBottom: 3, letterSpacing: 0.3 }}>{company.name || 'PT. Axon Ecosystem'}</div>
                                    {company.legalName && company.legalName !== company.name && (
                                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2, fontStyle: 'italic' }}>{company.legalName}</div>
                                    )}
                                    {company.address && (
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>
                                            {company.address}
                                            {(company.city || company.province) && (
                                                <span>, {[company.city, company.province].filter(Boolean).join(', ')}{company.postalCode ? ` ${company.postalCode}` : ''}</span>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {company.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {company.phone}</div>}
                                        {company.email && <div style={{ fontSize: 9, color: '#64748b' }}>Email: {company.email}</div>}
                                        {company.taxId && <div style={{ fontSize: 9, color: '#64748b' }}>NPWP: {company.taxId}</div>}
                                    </div>
                                </div>
                            </div>
                            {/* Quotation meta — right aligned */}
                            <div style={{ textAlign: 'right', minWidth: 180 }}>
                                <table style={{ marginLeft: 'auto', fontSize: 9, borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {[['No.', quotation.number], ['Tanggal', fd(quotation.date)], ['Berlaku s/d', fd(quotation.validUntil)], ['Mata Uang', quotation.currency]].map(([k, v]) => (
                                            <tr key={k}>
                                                <td style={{ textAlign: 'right', color: '#64748b', paddingRight: 8, fontWeight: 700, whiteSpace: 'nowrap', paddingBottom: 3 }}>{k}</td>
                                                <td style={{ textAlign: 'right', color: '#0f172a', paddingBottom: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Title — centered below the separator line */}
                        <div style={{ textAlign: 'center', padding: '10px 0 18px', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                            <span style={{ fontWeight: 900, fontSize: 14, color: '#4f46e5', letterSpacing: 3, textTransform: 'uppercase' }}>{showBreakdown ? 'Breakdown Project' : 'Penawaran Harga'}</span>
                        </div>

                        {/* Recipient & Detail Info - Layout Full Width Rows */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9', marginBottom: 16 }}>
                                <div style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 6 }}>Kepada Yth.</div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{c?.name}</div>
                                {quotation.attn && <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>U/p: {quotation.attn}</div>}
                                {c?.address && <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, lineHeight: 1.6 }}>{c.address}</div>}
                                {c?.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {c.phone}</div>}
                            </div>

                            <div>
                                <div style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 10 }}>Detail Penawaran</div>
                                <table style={{ fontSize: 10, width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {[
                                            ['Perihal', quotation.subject],
                                            ['Termin Bayar', quotation.paymentTerms],
                                            ['Syarat Kirim', quotation.deliveryTerms]
                                        ].filter(([, v]) => v).map(([k, v]) => (
                                            <tr key={k}>
                                                <td style={{ fontWeight: 700, color: '#475569', paddingRight: 8, paddingBottom: 6, verticalAlign: 'top', whiteSpace: 'nowrap', width: 120 }}>{k}</td>
                                                <td style={{ color: '#0f172a', paddingBottom: 6 }}>: {v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Items */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 10 }}>
                            <thead>
                                <tr style={{ background: '#4f46e5', color: '#fff' }}>
                                    {(showBreakdown ? ['No', 'Detail Item', 'Qty', 'Unit', 'Harga(Rp)', 'HPP(Rp)', 'Disc', 'Total(Rp)', 'Tot.HPP(Rp)', 'Profit(Rp)', '%'] : ['No', 'Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Disc%', 'Jumlah']).map((h, i) => (
                                        <th key={h} style={{ padding: '8px 10px', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, textAlign: i === 1 ? 'left' : (showBreakdown ? (i >= 4 && i !== 6 && i !== 10 ? 'right' : 'center') : (i >= 4 ? 'right' : 'center')), whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...(quotation.items || [])].sort((a, b) => a.no - b.no).map((it, i) => {
                                    if (showBreakdown) {
                                        return (
                                            <Fragment key={i}>
                                                <tr style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, borderBottom: 'none' }}>{it.no}</td>
                                                    <td colSpan={10} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#4f46e5', borderBottom: 'none' }}>
                                                        {it.description}
                                                    </td>
                                                </tr>
                                                <tr style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                    <td style={{ borderTop: 'none' }}></td>
                                                    <td style={{ borderTop: 'none' }}></td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>{it.qty}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{it.unit}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{(it.unitPrice || 0).toLocaleString('id-ID')}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#b45309' }}>{(it.costPrice || 0).toLocaleString('id-ID')}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{it.discount > 0 ? `${it.discount}%` : '-'}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{(it.amount || 0).toLocaleString('id-ID')}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{((it.costPrice || 0) * it.qty).toLocaleString('id-ID')}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{(it.amount - ((it.costPrice || 0) * it.qty)).toLocaleString('id-ID')}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{it.amount > 0 ? ((it.amount - ((it.costPrice || 0) * it.qty)) / it.amount * 100).toFixed(1) : '0'}</td>
                                                </tr>
                                            </Fragment>
                                        )
                                    }
                                    return (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600 }}>{it.no}</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'left' }}>
                                                {showProductImages && getProductImage(it) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${getProductImage(it)}`} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid #e2e8f0' }} />
                                                        <span>{it.description}</span>
                                                    </div>
                                                )}
                                                {!(showProductImages && getProductImage(it)) && <span>{it.description}</span>}
                                            </td>
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>{it.qty}</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{it.unit}</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>Rp {it.unitPrice?.toLocaleString('id-ID')}</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{it.discount > 0 ? `${it.discount}%` : '-'}</td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>Rp {it.amount?.toLocaleString('id-ID')}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Totals */}
                        {showTotals && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                                <div style={{ width: 300, fontSize: 10 }}>
                                    {[['Subtotal', `Rp ${quotation.subtotal?.toLocaleString('id-ID')}`],
                                    ...(quotation.discount > 0 ? [[`Diskon (${quotation.discount}%)`, `- Rp ${quotation.discountAmt?.toLocaleString('id-ID')}`]] : []),
                                    [`PPN (${quotation.tax}%)`, `+ Rp ${quotation.taxAmt?.toLocaleString('id-ID')}`],
                                    ...(showBreakdown ? [
                                        ['Total HPP', `Rp ${quotation.items.reduce((s, it) => s + (it.costPrice || 0) * it.qty, 0).toLocaleString('id-ID')}`],
                                        ['Total Profit', `Rp ${(quotation.subtotal - quotation.items.reduce((s, it) => s + (it.costPrice || 0) * it.qty, 0)).toLocaleString('id-ID')}`],
                                        ['% Profit', quotation.subtotal > 0 ? (((quotation.subtotal - quotation.items.reduce((s, it) => s + (it.costPrice || 0) * it.qty, 0)) / quotation.subtotal) * 100).toFixed(1) + '%' : '0%']
                                    ] : [])
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 5, marginBottom: 5 }}>
                                            <span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: 600, color: '#1e293b' }}>{v}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #4f46e5' }}>
                                        <span style={{ fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>TOTAL</span>
                                        <span style={{ fontWeight: 900, color: '#4f46e5', fontSize: 15 }}>Rp {quotation.grandTotal?.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes - Bottom */}
                        {quotation.notes && (
                            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 16, marginBottom: 24 }}>
                                <div style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 8 }}>Catatan & Syarat Ketentuan</div>
                                <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{quotation.notes}</div>
                            </div>
                        )}

                        {/* Signatures */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 16 }}>
                            {[
                                { label: 'Disetujui oleh,', sub: '', name: c?.name || '' },
                                { label: 'Hormat kami,', sub: `${company.city || 'Jakarta'}, ${fd(quotation.date)}`, name: company.name || 'PT. Axon Ecosystem' },
                            ].map((s, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>{s.label}</div>
                                    {s.sub && <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>{s.sub}</div>}
                                    
                                    {i === 1 ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                                            <img src="/TTD Fix.png" alt="Signature" style={{ height: 50, width: 'auto', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{ height: 58 }} />
                                    )}

                                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
                                        <div style={{ fontSize: 9, color: '#64748b' }}>( __________________________ )</div>
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Nama / Jabatan</div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{s.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </motion.div>
        </div>
    )
}
