"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DOItem { no: number; description: string; qty: number; unit: string; }
interface DO {
    id: string; number: string; date: string; status: string;
    customer: { name: string; code: string; address?: string };
    project?: { number: string; name: string };
    salesOrder?: { number: string; poNumber?: string };
    workOrder?: { number: string; title: string };
    notes?: string; receiverName?: string; deliveryAddress?: string;
    items: DOItem[];
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    SHIPPED: { label: 'Shipped', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through' },
}

const fd = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function DeliveryOrderPDFModal({ doData, company, onClose }:
    { doData: DO; company: Record<string, string>; onClose: () => void }) {

    const [busy, setBusy] = useState(false)
    const [isPrintMode, setIsPrintMode] = useState(false)
    const c = doData.customer
    const sc = STATUS_CFG[doData.status] || STATUS_CFG.DRAFT

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
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `${process.env.NEXT_PUBLIC_API_URL}${company.logo}` })
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
            if (company.email) { doc.text(`Email: ${company.email}`, ix, cy); cy += 4 }

            // DO meta
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const hdr = [
                ['No. Surat Jalan', doData.number],
                ['Tanggal', fd(doData.date)],
                ['Ref SO', doData.salesOrder?.number || '-'],
                ['Ref PO', doData.salesOrder?.poNumber || '-'],
                ['Ref WO', doData.workOrder?.number || '-']
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
            doc.text('SURAT JALAN / DELIVERY ORDER', W / 2, y, { align: 'center' })
            y += 8

            // Recipient & Delivery Details
            const col2 = W / 2 + 5
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray)
            doc.text('DITUJUKAN KEPADA', M, y); doc.text('ALAMAT PENGIRIMAN', col2, y)
            y += 4
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
            doc.text(c?.name || '', M, y)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)

            let ry = y + 4
            if (c?.address) { const ls = doc.splitTextToSize(c.address, 80); doc.text(ls, M, ry); ry += ls.length * 4 }

            let dy = y
            if (doData.deliveryAddress) {
                const ls = doc.splitTextToSize(doData.deliveryAddress, 85);
                doc.setFont('helvetica', 'normal').setTextColor(...dark).text(ls, col2, dy)
                dy += ls.length * 4 + 2
            }
            if (doData.receiverName) {
                doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('PENERIMA PIC:', col2, dy)
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...dark).text(doData.receiverName, col2 + 22, dy)
                dy += 5
            }

            y = Math.max(ry, dy) + 6

            // Items table with Project Row
            const tableBody = [
                [{ content: `PROJECT: ${doData.project?.name || '-'}`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: isPrintMode ? [255, 255, 255] : [248, 250, 252], halign: 'center' } }],
                ...(doData.items?.map(it => [it.no, it.description, it.qty, it.unit]) || [])
            ]

            autoTable(doc, {
                startY: y, margin: { left: M, right: M },
                head: [['No', 'Deskripsi Barang / Jasa', 'Qty', 'Satuan']],
                body: tableBody as any,
                headStyles: { fillColor: isPrintMode ? [255, 255, 255] : indigo, textColor: isPrintMode ? [0, 0, 0] : white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: dark },
                alternateRowStyles: { fillColor: light },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'center', cellWidth: 20 } },
                styles: { lineColor: [0, 0, 0], lineWidth: isPrintMode ? 0.3 : 0.2 },
            })

            y = (doc as any).lastAutoTable.finalY + 8

            // Notes
            if (doData.notes) {
                const nl = doc.splitTextToSize(doData.notes, W - M * 2 - 8)
                const nh = nl.length * 4 + 10
                if (!isPrintMode) doc.setFillColor(...light).roundedRect(M, y, W - M * 2, nh, 2, 2, 'F')
                else doc.setDrawColor(0).setLineWidth(0.2).rect(M, y, W - M * 2, nh)
                doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('CATATAN', M + 4, y + 5)
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...(isPrintMode ? [0, 0, 0] as [number, number, number] : [71, 85, 105] as [number, number, number])).text(nl, M + 4, y + 10)
                y += nh + 8
            }

            // Signatures
            if (y > 230) { doc.addPage(); y = 20 }
            const CW = W - M * 2 // Content Width (180)
            const colW = CW / 3  // Column Width (60)
            const col1X = M + colW / 2
            const col2X = M + colW + colW / 2
            const col3X = M + colW * 2 + colW / 2

            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...gray)
            doc.text('Diterima Oleh,', col1X, y, { align: 'center' })
            doc.text('Pengirim / Logistik,', col2X, y, { align: 'center' })
            doc.text('Hormat Kami,', col3X, y, { align: 'center' })
            doc.text(`${company.city || 'BEKASI'}, ${fd(doData.date)}`, col3X, y + 4.5, { align: 'center' })

            y += 28
            doc.setDrawColor(...(isPrintMode ? [0, 0, 0] as [number, number, number] : [203, 213, 225] as [number, number, number])).setLineWidth(isPrintMode ? 0.6 : 0.4)
            // Lines centered below the labels
            const lineHalf = 22
            doc.line(col1X - lineHalf, y, col1X + lineHalf, y)
            doc.line(col2X - lineHalf, y, col2X + lineHalf, y)
            doc.line(col3X - lineHalf, y, col3X + lineHalf, y)

            y += 5
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
            doc.text('', col1X, y, { align: 'center' })
            doc.text('', col2X, y, { align: 'center' })
            doc.text('', col3X, y, { align: 'center' })

            // Footer
            const pc = doc.getNumberOfPages()
            for (let i = 1; i <= pc; i++) {
                doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7).setTextColor(...gray)
                doc.text(`Dokumen pengiriman resmi dari ${company.name || 'PT. Axon Ecosystem'}`, M, 290)
                doc.text(`Hal ${i} / ${pc}`, W - M, 290, { align: 'right' })
            }
            if (mode === 'print') {
                doc.autoPrint()
                window.open(doc.output('bloburl'), '_blank')
            } else {
                doc.save(`DO-${doData.number}.pdf`)
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
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>{doData.number}</span>
                        <span className="text-slate-500 text-sm font-medium">{c?.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Mode Print</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isPrintMode} onChange={(e) => setIsPrintMode(e.target.checked)} className="sr-only peer" />
                                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
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

                <div className="p-6 bg-slate-100 min-h-[600px]">
                    <div className="bg-white max-w-[794px] mx-auto p-12 shadow-xl rounded-sm font-sans text-slate-900 leading-relaxed overflow-hidden">

                        {/* Print Header */}
                        <div className={`flex justify-between items-start border-b-4 ${isPrintMode ? 'border-black' : 'border-indigo-600'} pb-6 mb-6`}>
                            <div className="flex gap-4 items-start">
                                {company.logo && <img src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo}`} alt="logo" className="h-9 w-auto object-contain" />}
                                <div>
                                    <div className="font-extrabold text-xl">{company.name || 'PT. Axon Ecosystem'}</div>
                                    <div className={`text-[10px] ${isPrintMode ? 'text-black font-medium' : 'text-slate-500'} mt-1 max-w-xs leading-relaxed`}>
                                        {company.address}<br />
                                        {[company.city, company.province].filter(Boolean).join(', ')} {company.postalCode}
                                    </div>
                                    <div className={`text-[10px] ${isPrintMode ? 'text-black' : 'text-slate-500'} mt-1 font-medium`}>
                                        {company.phone && `Tel: ${company.phone}`} {company.email && ` | Email: ${company.email}`}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <table className="text-[10px] ml-auto">
                                    <tbody>
                                        {[
                                            ['No. Surat Jalan', doData.number],
                                            ['Tanggal', fd(doData.date)],
                                            ['Ref SO', doData.salesOrder?.number || '-'],
                                            ['Ref PO', doData.salesOrder?.poNumber || '-'],
                                            ['Ref WO', doData.workOrder?.number || '-']
                                        ].map(([k, v]) => (
                                            <tr key={k}>
                                                <td className={`text-right ${isPrintMode ? 'text-black font-black' : 'text-slate-400 font-bold'} pr-3 py-0.5`}>{k}</td>
                                                <td className={`text-right font-bold ${isPrintMode ? 'text-black' : 'text-slate-900'}`}>{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="text-center py-4 mb-6 border-b border-slate-100">
                            <h1 className={`text-lg font-black ${isPrintMode ? 'text-black' : 'text-indigo-600'} tracking-[0.2em] uppercase`}>Surat Jalan / Delivery Order</h1>
                        </div>

                        <div className="grid grid-cols-2 gap-10 mb-8">
                            <div>
                                <div className={`text-[8px] font-black uppercase tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-400'} mb-2`}>Ditujukan Kepada</div>
                                <div className="font-bold text-sm">{c?.name}</div>
                                <div className={`text-[10px] ${isPrintMode ? 'text-black' : 'text-slate-500'} mt-2 leading-relaxed`}>{c?.address || '-'}</div>
                            </div>
                            <div>
                                <div className={`text-[8px] font-black uppercase tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-400'} mb-2`}>Alamat Pengiriman</div>
                                <div className={`text-[10px] ${isPrintMode ? 'text-black' : 'text-slate-700'} leading-relaxed font-medium whitespace-pre-wrap`}>{doData.deliveryAddress || '-'}</div>
                                {doData.receiverName && (
                                    <div className="mt-3 flex gap-2 items-baseline">
                                        <span className={`text-[8px] font-bold ${isPrintMode ? 'text-black' : 'text-slate-400'} uppercase tracking-wider`}>Penerima/PIC:</span>
                                        <span className="text-[10px] font-bold">{doData.receiverName}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <table className="w-full text-[10px] mb-8 border-collapse">
                            <thead>
                                <tr className={`${isPrintMode ? 'border-y-2 border-black text-black font-bold' : 'bg-indigo-600 text-white font-black'} uppercase text-[8px] tracking-widest text-center`}>
                                    <th className={`p-2 border-r ${isPrintMode ? 'border-black' : 'border-indigo-500/30'} w-10`}>No</th>
                                    <th className={`p-2 border-r ${isPrintMode ? 'border-black' : 'border-indigo-500/30'} text-left`}>Deskripsi Barang / Jasa</th>
                                    <th className={`p-2 border-r ${isPrintMode ? 'border-black' : 'border-indigo-500/30'} w-20`}>Qty</th>
                                    <th className="p-2 w-20">Satuan</th>
                                </tr>
                            </thead>
                            <tbody className="border border-slate-100 divide-y divide-slate-100">
                                <tr className={`${isPrintMode ? 'bg-white' : 'bg-slate-50'}`}>
                                    <td colSpan={4} className={`p-3 text-center font-black ${isPrintMode ? 'text-black' : 'text-indigo-700'} tracking-wider uppercase text-[11px] border-b ${isPrintMode ? 'border-black' : 'border-indigo-100'}`}>
                                        PROJECT: {doData.project?.name || '-'}
                                    </td>
                                </tr>
                                {doData.items?.map((it, idx) => (
                                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : (isPrintMode ? 'bg-white' : 'bg-indigo-50/10')}`}>
                                        <td className={`p-2 text-center ${isPrintMode ? 'text-black font-black' : 'text-slate-400 font-bold'}`}>{it.no}</td>
                                        <td className={`p-2 font-medium ${isPrintMode ? 'text-black' : 'text-slate-900'}`}>{it.description}</td>
                                        <td className="p-2 text-center">{it.qty}</td>
                                        <td className={`p-2 text-center ${isPrintMode ? 'text-black font-bold' : 'text-slate-500'}`}>{it.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {doData.notes && (
                            <div className={`${isPrintMode ? 'bg-white border-2 border-black' : 'bg-slate-50 border border-slate-100'} rounded-lg p-4 mb-10`}>
                                <div className={`text-[8px] font-black tracking-widest ${isPrintMode ? 'text-black' : 'text-slate-400'} uppercase mb-1`}>Catatan</div>
                                <div className={`text-[10px] ${isPrintMode ? 'text-black' : 'text-slate-600'} leading-relaxed italic`}>{doData.notes}</div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 mt-20 pb-12">
                            {[
                                { label: 'Diterima Oleh,', name: '' },
                                { label: 'Pengirim / Logistik,', name: '' },
                                { label: 'Hormat Kami,', name: '', date: `${company.city || 'BEKASI'}, ${fd(doData.date)}` },
                            ].map((s, i) => (
                                <div key={i} className="text-center">
                                    <div className={`text-[9px] ${isPrintMode ? 'text-black font-black' : 'text-slate-400'} font-medium mb-1`}>{s.label}</div>
                                    {s.date && <div className={`text-[8px] ${isPrintMode ? 'text-black font-black' : 'text-slate-500'} font-bold mb-4`}>{s.date}</div>}
                                    <div className={`${s.date ? 'mt-8' : 'mt-14'} border-t ${isPrintMode ? 'border-black' : 'border-slate-200'} pt-3 text-[10px] font-bold text-slate-900 mx-4`}>
                                        {s.name}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={`text-[8px] ${isPrintMode ? 'text-black' : 'text-slate-300'} text-center mt-12 italic`}>
                            Barang yang sudah diterima sesuai dengan pesanan di atas.
                        </div>

                    </div>
                </div>
            </motion.div>
        </div>
    )
}
