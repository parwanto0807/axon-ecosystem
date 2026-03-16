"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Download, Printer, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BASTItem { no: number; description: string; qty: number; unit: string; }
interface BAST {
    id: string; number: string; date: string; status: string; type: string;
    customer: { name: string; code: string; address?: string };
    project?: { number: string; name: string };
    salesOrder?: { number: string };
    workOrder?: { number: string; title: string };
    notes?: string; receiverName?: string; technicianName?: string;
    items: BASTItem[];
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    SIGNED: { label: 'Signed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through' },
}

const fd = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const getDayName = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long' })

export default function BASTPDFModal({ bastData, company, onClose }:
    { bastData: BAST; company: Record<string, string>; onClose: () => void }) {

    const [busy, setBusy] = useState(false)
    const c = bastData.customer
    const sc = STATUS_CFG[bastData.status] || STATUS_CFG.DRAFT

    const generatePDF = async () => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const W = 210; const M = 15
            const indigo = [79, 70, 229] as [number, number, number]
            const dark = [15, 23, 42] as [number, number, number]
            const gray = [100, 116, 139] as [number, number, number]
            const white = [255, 255, 255] as [number, number, number]
            const light = [241, 245, 249] as [number, number, number]
            let y = M

            // Company Header (Logo + Info)
            if (company.logo) {
                try {
                    const img = new Image(); img.crossOrigin = 'anonymous'
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `${process.env.NEXT_PUBLIC_API_URL}${company.logo}` })
                    if (img.complete && img.naturalWidth > 0) {
                        const cv = document.createElement('canvas')
                        cv.width = img.naturalWidth; cv.height = img.naturalHeight
                        cv.getContext('2d')!.drawImage(img, 0, 0)
                        const h = 12
                        const w = (img.naturalWidth / img.naturalHeight) * h
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, w, h)
                    }
                } catch { /* skip */ }
            }

            const ix = company.logo ? M + 18 : M
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
            doc.text(company.name || 'PT. Axon Ecosystem', ix, y + 5)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let cy = y + 11
            if (company.address) {
                const addrParts = [company.address, [company.city, company.province].filter(Boolean).join(', '), company.postalCode].filter(Boolean).join(' — ')
                const addrLines = doc.splitTextToSize(addrParts, 88)
                doc.text(addrLines, ix, cy); cy += addrLines.length * 4
            }
            if (company.phone) { doc.text(`Tel: ${company.phone}`, ix, cy); cy += 4 }

            y = Math.max(cy, y + 15) + 10

            // Stylized BAST Header
            doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(...indigo)
            doc.text('BERITA ACARA', M, y + 5)
            doc.setFont('helvetica', 'normal').setFontSize(14).setTextColor(...gray)
            doc.text('S E R A H   T E R I M A', M, y + 14)

            // BAST meta (Right Top)
            doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray)
            doc.text('DOCUMENT NO.', W - M, y + 5, { align: 'right' })
            doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...dark)
            doc.text(bastData.number, W - M, y + 14, { align: 'right' })
            doc.setDrawColor(...dark).setLineWidth(0.5).line(W - M - 60, y + 16, W - M, y + 16)

            y += 28

            // Opening Statement
            const dayName = getDayName(bastData.date)
            const dateStr = fd(bastData.date)
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...dark)

            const p1 = `Pada hari ini `
            const p2 = `${dayName}`
            const p3 = `, tanggal `
            const p4 = `${dateStr}`
            const p5 = `, bertempat di `
            const p6 = `${c?.address || 'Lokasi Pekerjaan'}`
            const p7 = `, kami yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa telah dilakukan penyerahan `
            const p8 = `${bastData.type === 'SERVICE' ? 'Hasil Pekerjaan' : 'Barang'}`
            const p9 = ` dari Pihak Pertama kepada Pihak Kedua dengan rincian sebagai berikut:`

            // Split into lines manually or use a helper to bold specific parts? 
            // Simplified: split by size and render. Bolding inside text is hard in jsPDF without plugins.
            // But we can bold the key parts by rendering them separately in the same line.

            const fullText = `Pada hari ini ${dayName}, tanggal ${dateStr}, bertempat di ${c?.address || 'Lokasi Pekerjaan'}, kami yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa telah dilakukan penyerahan ${bastData.type === 'SERVICE' ? 'Hasil Pekerjaan' : 'Barang'} dari Pihak Pertama kepada Pihak Kedua dengan rincian sebagai berikut:`
            const lines = doc.splitTextToSize(fullText, W - M * 2)
            doc.text(lines, M, y)
            y += lines.length * 5 + 10

            // Parties Section
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray)
            doc.text('PIHAK PERTAMA (PEMBERI)', M, y)
            doc.text('PIHAK KEDUA (PENERIMA)', W / 2 + 10, y)
            y += 5

            doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...indigo)
            doc.text(company.name || 'PT. Axon Ecosystem', M, y)
            doc.setTextColor(...dark)
            doc.text(c?.name || '-', W / 2 + 10, y)
            y += 5

            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const addr1 = doc.splitTextToSize(company.address || '-', (W / 2) - M - 10)
            const addr2 = doc.splitTextToSize(c?.address || '-', (W / 2) - M - 10)
            doc.text(addr1, M, y)
            doc.text(addr2, W / 2 + 10, y)

            y += Math.max(addr1.length, addr2.length) * 4 + 10

            // Project Title Box
            if (bastData.project?.name) {
                const boxH = 12
                doc.setFillColor(248, 250, 252).roundedRect(M, y, W - M * 2, boxH, 2, 2, 'F')
                doc.setDrawColor(241, 245, 249).setLineWidth(0.2).roundedRect(M, y, W - M * 2, boxH, 2, 2, 'D')

                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...indigo)
                doc.text('NAMA PROJECT:', M + 5, y + 7.5)
                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark)
                doc.text(bastData.project.name, M + 35, y + 7.5)
                y += boxH + 8
            }

            // Items table
            const navy = [15, 23, 42] as [number, number, number]
            autoTable(doc, {
                startY: y, margin: { left: M, right: M },
                head: [['NO', 'DESKRIPSI PEKERJAAN / TABEL BARANG', 'QTY', 'UNIT']],
                body: bastData.items?.map(it => [it.no, it.description.toUpperCase(), it.qty, it.unit.toUpperCase()]) || [],
                headStyles: { fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: dark },
                alternateRowStyles: { fillColor: white },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 12, textColor: gray },
                    1: { halign: 'left' },
                    2: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
                    3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
                },
                styles: { lineColor: [226, 232, 240], lineWidth: 0.1, cellPadding: 3 },
            })

            y = (doc as any).lastAutoTable.finalY + 10

            // Closing Statement
            doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...gray)
            const closing = `Demikian Berita Acara Serah Terima ini dibuat untuk dapat dipergunakan sebagaimana mestinya. Pihak Kedua menyatakan telah memeriksa dan menerima objek serah terima dalam keadaan baik dan sesuai spesifikasi.`
            const clines = doc.splitTextToSize(closing, W - M * 2)
            doc.text(clines, M, y)
            y += clines.length * 5 + 20

            // Signatures
            if (y > 240) { doc.addPage(); y = 20 }
            const sw = (W - M * 2 - 40) / 2
            doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray)
            doc.text('PIHAK PERTAMA', M + sw / 2, y, { align: 'center' })
            doc.text('PIHAK KEDUA', W - M - sw / 2, y, { align: 'center' })

            y += 35
            doc.setDrawColor(...gray).setLineWidth(0.5)
                .line(M, y, M + sw, y)
                .line(W - M - sw, y, W - M, y)

            y += 5
            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark)
            doc.text(bastData.technicianName || company.name || '-', M + sw / 2, y - 6, { align: 'center' })
            doc.text(bastData.receiverName || '...........................................', W - M - sw / 2, y - 6, { align: 'center' })

            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray)
            doc.text('NAMA & JABATAN', M + sw / 2, y, { align: 'center' })
            doc.text('NAMA & JABATAN', W - M - sw / 2, y, { align: 'center' })

            doc.save(`BAST-${bastData.number}.pdf`)
        } catch (e) { console.error(e); alert('Gagal generate PDF') }
        finally { setBusy(false) }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4">

                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>{bastData.number}</span>
                        <span className="text-slate-500 text-sm font-medium">{bastData.project?.name || bastData.workOrder?.title || 'BAST'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={generatePDF} disabled={busy}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                            <Download size={13} className="mr-2" />
                            {busy ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-10 bg-slate-100 min-h-[700px]">
                    <div className="bg-white max-w-[794px] mx-auto p-16 shadow-2xl rounded-sm font-sans text-slate-900 leading-relaxed overflow-hidden">

                        {/* Company Header (Preview) */}
                        <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                            {company.logo && (
                                <img src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo}`} alt="Logo" className="h-10 w-auto" />
                            )}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{company.name}</h3>
                                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-1 max-w-sm">
                                    {company.address}
                                </div>
                                {company.phone && <div className="text-[10px] text-slate-400 font-medium mt-0.5">Tel: {company.phone}</div>}
                            </div>
                        </div>

                        {/* BAST Header */}
                        <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-slate-50">
                            <div>
                                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tighter leading-none">Berita Acara</h1>
                                <h2 className="text-xl font-medium text-slate-400 uppercase tracking-[0.3em] mt-1">Serah Terima</h2>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Document No.</div>
                                <div className="text-2xl font-black text-slate-900 underline decoration-indigo-200 underline-offset-8 decoration-4">{bastData.number}</div>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-600 leading-relaxed text-justify mb-12">
                            <p>
                                Pada hari ini <span className="font-bold text-slate-900">{getDayName(bastData.date)}</span>,
                                tanggal <span className="font-bold text-slate-900">{fd(bastData.date)}</span>,
                                bertempat di <span className="font-bold text-slate-900">{c?.address || 'Lokasi Pekerjaan'}</span>,
                                kami yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa telah dilakukan penyerahan
                                <span className="font-bold text-slate-900 mx-1">{bastData.type === 'SERVICE' ? 'Hasil Pekerjaan' : 'Barang'}</span>
                                dari Pihak Pertama kepada Pihak Kedua dengan rincian sebagai berikut:
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-16 mb-12">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Pihak Pertama (Pemberi)</div>
                                    <div className="font-black text-base text-indigo-600 leading-tight mb-1">{company.name || 'PT. Axon Ecosystem'}</div>
                                    <div className="text-[10px] text-slate-400 leading-relaxed font-medium">{company.address}</div>
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-slate-50 pl-12">
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Pihak Kedua (Penerima)</div>
                                    <div className="font-black text-base text-slate-900 leading-tight mb-1">{c?.name}</div>
                                    <div className="text-[10px] text-slate-400 leading-relaxed font-medium">{c?.address}</div>
                                </div>
                            </div>
                        </div>

                        {bastData.project?.name && (
                            <div className="mb-8 py-3 px-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] whitespace-nowrap">Nama Project:</span>
                                <span className="text-[12px] font-black text-slate-800 tracking-tight">{bastData.project.name}</span>
                            </div>
                        )}

                        <table className="w-full text-[11px] mb-12 border-collapse overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                            <thead>
                                <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                                    <th className="p-4 w-12 text-center border-r border-white/5">No</th>
                                    <th className="p-4 text-left border-r border-white/5">Deskripsi Pekerjaan / Tabel Barang</th>
                                    <th className="p-4 w-24 text-center border-r border-white/5 whitespace-nowrap">Qty</th>
                                    <th className="p-4 w-24 text-center">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {bastData.items?.map((it, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-center text-slate-400 font-bold">{it.no}</td>
                                        <td className="p-4 font-bold text-slate-700 uppercase leading-snug">{it.description}</td>
                                        <td className="p-4 text-center font-black text-slate-900 text-sm">{it.qty}</td>
                                        <td className="p-4 text-center text-slate-500 uppercase font-black text-[10px] tracking-wider">{it.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <p className="text-[11px] text-slate-500 italic mb-16 leading-relaxed text-center px-8">
                            Demikian Berita Acara Serah Terima ini dibuat untuk dapat dipergunakan sebagaimana mestinya. Pihak Kedua menyatakan telah memeriksa dan menerima objek serah terima dalam keadaan baik dan sesuai spesifikasi.
                        </p>

                        <div className="grid grid-cols-2 gap-12">
                            <div className="text-center space-y-20 relative px-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pihak Pertama</div>
                                <div className="space-y-3">
                                    <div className="h-0.5 bg-slate-100 w-full rounded-full"></div>
                                    <div className="font-bold text-sm text-slate-900 tracking-tight">
                                        {bastData.technicianName || company.name || '................................'}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Nama & Jabatan</div>
                                </div>
                            </div>
                            <div className="text-center space-y-20 relative px-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pihak Kedua</div>
                                <div className="space-y-3">
                                    <div className="h-0.5 bg-slate-100 w-full rounded-full"></div>
                                    <div className="font-bold text-sm text-slate-900 tracking-tight">
                                        {bastData.receiverName || '................................'}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Nama & Jabatan</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 opacity-50">
                            <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="text-white w-2.5 h-2.5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 font-mono">Verified Handover Document</span>
                        </div>

                    </div>
                </div>
            </motion.div>
        </div>
    )
}
