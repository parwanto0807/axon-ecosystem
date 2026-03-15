"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InvoiceItem { no: number; description: string; qty: number; unit: string; unitPrice: number; discount: number; amount: number }
interface Invoice {
    id: string; number: string; date: string; dueDate?: string; status: string;
    customerId: string; customer: { name: string; code: string; address?: string };
    projectId?: string; project?: { number: string; name: string };
    contract?: { number: string; subject: string };
    salesOrder?: { number: string };
    deliveryOrder?: { number: string };
    bankAccount?: { bankName: string; accountNumber: string; accountHolder: string; branch?: string };
    signerName?: string; signerPosition?: string;
    currency: string; subtotal: number; tax: number; discount: number;
    discountAmt: number; taxAmt: number; grandTotal: number;
    notes?: string; paymentTerms?: string;
    items: InvoiceItem[];
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    PAID: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    OVERDUE: { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through' },
}

const fd = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function InvoicePDFModal({ invoice, company, onClose }:
    { invoice: Invoice; company: Record<string, string>; onClose: () => void }) {

    const [busy, setBusy] = useState(false)
    const [showSignature, setShowSignature] = useState(true)
    const [isPrintMode, setIsPrintMode] = useState(false)
    const c = invoice.customer
    const sc = STATUS_CFG[invoice.status] || STATUS_CFG.DRAFT

    const generatePDF = async (mode: 'download' | 'print' = 'download') => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const W = 210; const M = 15
            const indigo = isPrintMode ? ([0, 0, 0] as [number, number, number]) : ([79, 70, 229] as [number, number, number])
            const dark = isPrintMode ? ([0, 0, 0] as [number, number, number]) : ([15, 23, 42] as [number, number, number])
            const gray = isPrintMode ? ([0, 0, 0] as [number, number, number]) : ([100, 116, 139] as [number, number, number])
            const white = [255, 255, 255] as [number, number, number]
            const light = isPrintMode ? ([255, 255, 255] as [number, number, number]) : ([241, 245, 249] as [number, number, number])
            let y = M

            // Logo
            if (company.logo) {
                try {
                    const img = new Image(); img.crossOrigin = 'anonymous'
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `http://localhost:5000${company.logo}` })
                    if (img.complete && img.naturalWidth > 0) {
                        const cv = document.createElement('canvas')
                        cv.width = img.naturalWidth; cv.height = img.naturalHeight
                        cv.getContext('2d')!.drawImage(img, 0, 0)
                        // Scaling: 12mm height, proportional width
                        const h = 12
                        const w = (img.naturalWidth / img.naturalHeight) * h
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, w, h)
                    }
                } catch { /* skip */ }
            }

            // Company info
            const ix = company.logo ? M + 18 : M
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
            doc.text(company.name || 'PT. Axon Ecosystem', ix, y + 5)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let cy = y + 11
            if (company.legalName && company.legalName !== company.name) { doc.text(company.legalName, ix, cy); cy += 4 }
            if (company.address) {
                const addrParts = [company.address, [company.city, company.province].filter(Boolean).join(', '), company.postalCode].filter(Boolean).join(' — ')
                const addrLines = doc.splitTextToSize(addrParts, 88)
                doc.text(addrLines, ix, cy); cy += addrLines.length * 4
            }
            if (company.phone) { doc.text(`Tel: ${company.phone}`, ix, cy); cy += 4 }

            // Invoice meta
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const hdr = [
                ['Invoice No.', invoice.number],
                ['Tanggal', fd(invoice.date)],
                ['Jatuh Tempo', invoice.dueDate ? fd(invoice.dueDate) : '-'],
                ['Mata Uang', invoice.currency]
            ]
            let hy = y + 4
            hdr.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold'); doc.text(`${k} :`, W - M - 32, hy, { align: 'right' })
                doc.setFont('helvetica', 'normal').setTextColor(...dark); doc.text(v, W - M, hy, { align: 'right' })
                doc.setTextColor(...gray); hy += 4.5
            })

            // Separator line
            y = Math.max(cy, hy) + 5
            doc.setDrawColor(...indigo).setLineWidth(0.8).line(M, y, W - M, y)
            y += 7

            // Header title
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...indigo)
            doc.text('FAKTUR / INVOICE', W / 2, y, { align: 'center' })
            y += 8

            // Recipient & Details
            const col2 = W / 2 + 5
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray)
            doc.text('TAGIHAN KEPADA', M, y); doc.text('INFORMASI TAGIHAN', col2, y)
            y += 4
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
            doc.text(c?.name || '', M, y)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let ry = y + 4
            if (c?.address) { const ls = doc.splitTextToSize(c.address, 80); doc.text(ls, M, ry); ry += ls.length * 4 }

            let dy = y
                ;[['Ref Kontrak', invoice.contract?.number], ['Ref SO', invoice.salesOrder?.number], ['Ref DO', invoice.deliveryOrder?.number || '-'], ['Payment Terms', invoice.paymentTerms]].filter(([, v]) => v).forEach(([k, v]) => {
                    doc.setFont('helvetica', 'bold').setTextColor(...gray); doc.text(`${k}`, col2, dy)
                    doc.setFont('helvetica', 'normal').setTextColor(...dark)
                    const ls = doc.splitTextToSize(`: ${v}`, 70); doc.text(ls, col2 + 22, dy)
                    dy += ls.length > 1 ? ls.length * 4 : 5
                })

            y = Math.max(ry, dy) + 6

            // Items table with Project Row
            const tableBody = [
                [{ content: `PROJECT: ${invoice.project?.name || '-'}`, colSpan: 7, styles: { fontStyle: 'bold', fillColor: isPrintMode ? [255, 255, 255] : [248, 250, 252], halign: 'center' } }],
                ...(invoice.items?.map(it => [it.no, it.description, it.qty, it.unit, fr(it.unitPrice), `${it.discount}%`, fr(it.amount)]) || [])
            ]

            autoTable(doc, {
                startY: y, margin: { left: M, right: M },
                head: [['No', 'Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Disc%', 'Jumlah']],
                body: tableBody as any,
                headStyles: { fillColor: isPrintMode ? [255, 255, 255] : indigo, textColor: isPrintMode ? [0, 0, 0] : white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: dark },
                alternateRowStyles: { fillColor: light },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { halign: 'left' },
                    2: { halign: 'center', cellWidth: 12 },
                    3: { halign: 'center', cellWidth: 14 },
                    4: { halign: 'right', cellWidth: 28 },
                    5: { halign: 'center', cellWidth: 14 },
                    6: { halign: 'right', cellWidth: 28 }
                },
                styles: { lineColor: isPrintMode ? [0, 0, 0] : [226, 232, 240], lineWidth: isPrintMode ? 0.3 : 0.2 },
            })

            y = (doc as any).lastAutoTable.finalY + 8

            // Totals
            const bx = W - M - 80
            const tots: [string, string][] = [['Subtotal', fr(invoice.subtotal)]]
            if (invoice.discount > 0) tots.push([`Diskon (${invoice.discount}%)`, `- ${fr(invoice.discountAmt)}`])
            tots.push([`PPN (${invoice.tax}%)`, `+ ${fr(invoice.taxAmt)}`])
            doc.setFontSize(8)
            tots.forEach(([k, v]) => {
                doc.setFont('helvetica', 'normal').setTextColor(...gray).text(k, bx, y)
                doc.setFont('helvetica', 'bold').setTextColor(...dark).text(v, W - M, y, { align: 'right' })
                y += 5
            })
            doc.setDrawColor(...indigo).setLineWidth(isPrintMode ? 0.8 : 0.5).line(bx, y, W - M, y); y += 5
            doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...indigo)
            doc.text('TOTAL TAGIHAN', bx, y).text(fr(invoice.grandTotal), W - M, y, { align: 'right' })
            y += 10

            // Bank Account for Payment
            if (y > 240) { doc.addPage(); y = M }
            const footerY = Math.max(y, 200)
            if (invoice.bankAccount) {
                const b = invoice.bankAccount
                doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('PEMBAYARAN DITRANSFER KE:', M, footerY)
                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...indigo).text(b.bankName, M, footerY + 5)
                doc.setFont('helvetica', 'black').setFontSize(10).setTextColor(...dark).text(b.accountNumber, M, footerY + 10)
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray).text(`A/N: ${b.accountHolder}`, M, footerY + 14)
                if (b.branch) doc.setFontSize(7).setTextColor(...gray).text(`Cabang: ${b.branch}`, M, footerY + 18)
            } else {
                doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(...gray).text('Silahkan hubungi kami for info rekening pembayaran.', M, footerY)
            }
            y = footerY + 25

            // Signatures
            if (y > 240) { doc.addPage(); y = M }
            const sigY = Math.max(y, 230)
            const sigX = W - M - 40
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...gray)
            doc.text('Hormat Kami,', sigX, sigY, { align: 'center' })
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...indigo)
            doc.text(company.name || 'PT. Axon Ecosystem', sigX, sigY + 4, { align: 'center' })

            if (showSignature) {
                try {
                    const ttdImg = new Image(); ttdImg.crossOrigin = 'anonymous'
                    await new Promise<void>(r => { ttdImg.onload = () => r(); ttdImg.onerror = () => r(); ttdImg.src = '/TTD Fix.png' })
                    if (ttdImg.complete && ttdImg.naturalWidth > 0) {
                        const tcv = document.createElement('canvas')
                        tcv.width = ttdImg.naturalWidth; tcv.height = ttdImg.naturalHeight
                        tcv.getContext('2d')!.drawImage(ttdImg, 0, 0)
                        const ratio = ttdImg.naturalHeight / ttdImg.naturalWidth
                        const dw = 40; const dh = dw * ratio
                        doc.addImage(tcv.toDataURL('image/png'), 'PNG', sigX - 20, sigY + 6, dw, dh)
                    }
                } catch { /* skip */ }
            }

            const lineY = sigY + 28
            doc.setDrawColor(...(isPrintMode ? [0, 0, 0] as [number, number, number] : [203, 213, 225] as [number, number, number])).setLineWidth(isPrintMode ? 0.6 : 0.4).line(sigX - 25, lineY, sigX + 25, lineY)

            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
            doc.text(invoice.signerName || '( ____________________ )', sigX, lineY + 5, { align: 'center' })
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text(invoice.signerPosition || 'Finance Department', sigX, lineY + 9, { align: 'center' })

            if (mode === 'print') {
                doc.autoPrint()
                window.open(doc.output('bloburl'), '_blank')
            } else {
                doc.save(`INV-${invoice.number}.pdf`)
            }
        } catch (e) { console.error(e); alert('Gagal generate PDF') }
        finally { setBusy(false) }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4">

                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>{invoice.number}</span>
                        <span className="text-slate-500 text-sm font-medium">{c?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Tanda Tangan</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Mode Print</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isPrintMode} onChange={(e) => setIsPrintMode(e.target.checked)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-900"></div>
                                </label>
                            </div>
                        </div>
                        <Button onClick={() => generatePDF('download')} disabled={busy}
                            className={`rounded-xl ${isPrintMode ? 'bg-slate-900 hover:bg-black' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold h-9 px-4 text-xs uppercase tracking-wider shadow-lg ${isPrintMode ? 'shadow-slate-900/20' : 'shadow-indigo-600/20'}`}>
                            <Download size={13} className="mr-2" />
                            {busy ? '...' : 'Download'}
                        </Button>
                        <Button onClick={() => generatePDF('print')} disabled={busy} variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 font-bold h-9 px-4 text-xs uppercase tracking-wider hover:bg-slate-50">
                            <Printer size={13} className="mr-2" />
                            Print
                        </Button>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-8 bg-slate-100 min-h-[600px]">
                    <div className="bg-white max-w-[794px] mx-auto p-12 shadow-xl rounded-sm font-sans text-slate-900 leading-relaxed overflow-hidden">

                        <div className={`flex justify-between items-start border-b-4 ${isPrintMode ? 'border-black' : 'border-indigo-600'} pb-6 mb-8`}>
                            <div className="flex gap-4 items-start">
                                {company.logo && <img src={`http://localhost:5000${company.logo}`} alt="logo" className="h-9 w-auto object-contain" />}
                                <div>
                                    <div className="font-extrabold text-lg">{company.name || 'PT. Axon Ecosystem'}</div>
                                    <div className={`text-[9px] ${isPrintMode ? 'text-black' : 'text-slate-500'} mt-1 max-w-xs`}>{company.address}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className={`text-2xl font-black ${isPrintMode ? 'text-black' : 'text-indigo-600'} uppercase tracking-tighter mb-2`}>Invoice</h1>
                                <table className="text-[10px] ml-auto">
                                    <tbody>
                                        {[
                                            ['No. Faktur', invoice.number],
                                            ['Tanggal', fd(invoice.date)],
                                            ['Jatuh Tempo', invoice.dueDate ? fd(invoice.dueDate) : '-']
                                        ].map(([k, v]) => (
                                            <tr key={k}>
                                                <td className={`text-right ${isPrintMode ? 'text-black' : 'text-slate-400'} font-bold pr-3`}>{k}</td>
                                                <td className={`text-right font-bold ${isPrintMode ? 'text-black' : 'text-slate-900'}`}>{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-10">
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Tagihan Kepada</div>
                                <div className="font-bold text-sm">{c?.name}</div>
                                <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">{c?.address || '-'}</div>
                            </div>
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Metadata Tagihan</div>
                                <table className="text-[10px] w-full">
                                    <tbody>
                                        {[
                                            ['No. Kontrak', invoice.contract?.number],
                                            ['Proyek', invoice.project?.name],
                                            ['Ref SO', invoice.salesOrder?.number],
                                            ['Ref DO', invoice.deliveryOrder?.number || '-'],
                                            ['Termin', invoice.paymentTerms]
                                        ].filter(([, v]) => v).map(([k, v]) => (
                                            <tr key={k}>
                                                <td className={`${isPrintMode ? 'text-black' : 'text-slate-400'} font-bold py-1 w-20`}>{k}</td>
                                                <td className={`font-bold ${isPrintMode ? 'text-black' : 'text-slate-800'} py-1`}>: {v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <table className="w-full text-[10px] mb-8 border-collapse">
                            <thead>
                                <tr className={`${isPrintMode ? 'border-y-2 border-black text-black font-bold' : 'bg-indigo-600 text-white font-black'} uppercase text-[8px] tracking-widest`}>
                                    <th className="p-3 w-10 text-center">No</th>
                                    <th className="p-3 text-left">Deskripsi Item / Layanan</th>
                                    <th className="p-3 w-16 text-center">Qty</th>
                                    <th className="p-3 w-24 text-right">Harga Unit</th>
                                    <th className="p-3 w-16 text-center">Disc%</th>
                                    <th className="p-3 w-24 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="border-x border-b border-slate-100 divide-y divide-slate-100 font-medium">
                                <tr className={`${isPrintMode ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td colSpan={6} className={`p-3 text-center text-[9px] font-black uppercase tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-500'}`}>
                                        Project: <span className={`${isPrintMode ? 'text-black' : 'text-indigo-600'} ml-1`}>{invoice.project?.name || '-'}</span>
                                    </td>
                                </tr>
                                {invoice.items?.map((it, idx) => (
                                    <tr key={idx}>
                                        <td className={`p-3 text-center ${isPrintMode ? 'text-black font-black' : 'text-slate-400 font-bold'}`}>{it.no}</td>
                                        <td className={`p-3 ${isPrintMode ? 'text-black' : 'text-slate-800'}`}>{it.description}</td>
                                        <td className="p-3 text-center">{it.qty} {it.unit}</td>
                                        <td className="p-3 text-right">{fr(it.unitPrice)}</td>
                                        <td className={`p-3 text-center font-semibold ${isPrintMode ? 'text-black' : 'text-rose-600'}`}>{it.discount}%</td>
                                        <td className={`p-3 text-right font-bold ${isPrintMode ? 'text-black' : 'text-indigo-700'}`}>{fr(it.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end mb-12">
                            <div className="w-64 space-y-2 text-[10px]">
                                <div className={`flex justify-between ${isPrintMode ? 'text-black' : 'text-slate-500'}`}>
                                    <span>Subtotal</span>
                                    <span className={`font-bold ${isPrintMode ? 'text-black' : 'text-slate-900'}`}>{fr(invoice.subtotal)}</span>
                                </div>
                                {invoice.discount > 0 && (
                                    <div className={`flex justify-between ${isPrintMode ? 'text-black font-bold' : 'text-rose-600'}`}>
                                        <span>Diskon ({invoice.discount}%)</span>
                                        <span className="font-bold">- {fr(invoice.discountAmt)}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between ${isPrintMode ? 'text-black' : 'text-slate-500'} border-b ${isPrintMode ? 'border-black' : 'border-slate-100'} pb-2`}>
                                    <span>Pajak (PPN {invoice.tax}%)</span>
                                    <span className="font-bold">+ {fr(invoice.taxAmt)}</span>
                                </div>
                                <div className={`flex justify-between ${isPrintMode ? 'text-black' : 'text-indigo-700'} text-sm font-black pt-1`}>
                                    <span>TOTAL TAGIHAN</span>
                                    <span>{fr(invoice.grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {invoice.bankAccount && (
                            <div className="flex justify-between items-end mb-12">
                                <div className={`p-5 ${isPrintMode ? 'bg-white border-2 border-black' : 'bg-slate-50 border border-slate-100'} rounded-2xl w-72`}>
                                    <div className={`text-[8px] font-black tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-400'} uppercase mb-3`}>Informasi Pembayaran (Transfer)</div>
                                    <div className={`font-extrabold ${isPrintMode ? 'text-black font-black' : 'text-indigo-600'} text-[11px] mb-1`}>{invoice.bankAccount.bankName}</div>
                                    <div className="font-black text-slate-900 text-sm mb-1">{invoice.bankAccount.accountNumber}</div>
                                    <div className={`text-[10px] font-bold ${isPrintMode ? 'text-black' : 'text-slate-500'} uppercase tracking-tighter`}>A/N: {invoice.bankAccount.accountHolder}</div>
                                </div>
                                <div className="text-center w-56 space-y-12">
                                    <div className="space-y-1">
                                        <div className={`text-[9px] font-black uppercase tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-400'}`}>Hormat Kami,</div>
                                        <div className={`text-[8px] font-bold ${isPrintMode ? 'text-black font-black' : 'text-indigo-600'} uppercase tracking-tighter`}>{company.name || 'PT. Axon Ecosystem'}</div>
                                    </div>
                                    
                                    <div className="relative h-16 flex items-center justify-center">
                                        {showSignature && (
                                            <img src="/TTD Fix.png" alt="Stamp" className="h-16 w-auto object-contain z-10" />
                                        )}
                                    </div>
 
                                    <div className="space-y-1">
                                        <div className={`font-bold border-b ${isPrintMode ? 'border-black' : 'border-slate-900'} pb-1 text-slate-900 mx-auto w-40`}>{invoice.signerName || '____________________'}</div>
                                        <div className={`text-[8px] ${isPrintMode ? 'text-black font-black' : 'text-slate-400 font-bold'} uppercase tracking-tighter`}>{invoice.signerPosition || 'Finance Department'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!invoice.bankAccount && (
                            <div className="flex justify-end mt-20">
                                <div className="text-center w-56 space-y-2">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Hormat Kami,</div>
                                    <div className="relative h-16 flex items-center justify-center">
                                        {showSignature && (
                                            <img src="/TTD Fix.png" alt="Stamp" className="h-16 w-auto object-contain z-10" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold border-b border-slate-900 pb-1 text-slate-900">{invoice.signerName || '____________________'}</div>
                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{invoice.signerPosition || 'Finance Department'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </motion.div>
        </div>
    )
}
