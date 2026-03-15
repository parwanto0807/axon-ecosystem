"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WorkOrderItem { no: number; description: string; qty: number; unit: string; unitCost: number; totalCost: number; isReleased: boolean; type: string }
interface WorkOrderTask { id?: string; title: string; isDone: boolean; isOptional: boolean }
interface Customer { id: string; name: string; code: string; address: string | null; taxId: string | null; phone: string | null; email: string | null }
interface Project { id: string; number: string; name: string }
interface SalesOrder { id: string; number: string }

interface WorkOrder {
    id: string; number: string; title: string; type: string; status: string; priority: string
    description: string | null; notes: string | null; completionNotes: string | null
    assignedTo: string | null; location: string | null
    scheduledStart: string | null; scheduledEnd: string | null
    actualStart: string | null; actualEnd: string | null
    estimatedHours: number | null; actualHours: number | null
    customer: Customer | null; project: Project | null; salesOrder: SalesOrder | null
    items: WorkOrderItem[]; tasks: WorkOrderTask[]
}

const WO_TYPE: Record<string, string> = {
    SERVICE: 'Service', INSTALLATION: 'Installation', REPAIR: 'Repair', DEVELOPMENT: 'Development', PROCUREMENT: 'Procurement'
}
const WO_PRIORITY: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    NORMAL: { label: 'Normal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    HIGH: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    URGENT: { label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' }
}

const fd = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const fth = (d: string | null) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
const fdt = (d: string | null) => d ? `${fd(d)} ${fth(d)}` : '-'

export default function WorkOrderPDFModal({ workOrder, company, onClose }:
    { workOrder: WorkOrder; company: Record<string, string>; onClose: () => void }) {

    const [busy, setBusy] = useState(false)

    const generatePDF = async () => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const W = 210; const M = 15
            const indigo = [79, 70, 229] as [number, number, number]
            const amber = [217, 119, 6] as [number, number, number]
            const dark = [15, 23, 42] as [number, number, number]
            const gray = [100, 116, 139] as [number, number, number]
            const white = [255, 255, 255] as [number, number, number]
            const light = [241, 245, 249] as [number, number, number]
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
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, 22, 22)
                    }
                } catch { /* skip */ }
            }

            // Company info
            const ix = company.logo ? M + 26 : M
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

            // Document meta
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const hdr = [['WO No.', workOrder.number], ['Prioritas', workOrder.priority], ['Tipe', WO_TYPE[workOrder.type] || workOrder.type], ['Dibuat', fd(new Date().toISOString())]]
            let hy = y + 4
            hdr.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold'); doc.text(`${k} :`, W - M - 32, hy, { align: 'right' })
                doc.setFont('helvetica', 'normal').setTextColor(...dark); doc.text(v, W - M, hy, { align: 'right' })
                doc.setTextColor(...gray); hy += 4.5
            })

            // Separator line
            y = Math.max(cy, hy) + 5
            doc.setDrawColor(...amber).setLineWidth(0.8).line(M, y, W - M, y)
            y += 7

            // Header title
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...amber)
            doc.text('WORK ORDER', W / 2, y, { align: 'center' })
            y += 8

            // WO Information Grid
            const col2 = W / 2 + 5
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray)
            doc.text('INFORMASI PEKERJAAN', M, y); doc.text('DETAIL JADWAL & LOKASI', col2, y)
            y += 4

            let dy1 = y
            const infoLeft = [
                ['Judul', workOrder.title],
                ['Pelanggan', workOrder.customer?.name || '-'],
                ['Project', workOrder.project ? `${workOrder.project.number} - ${workOrder.project.name}` : '-'],
                ['Sales Order', workOrder.salesOrder?.number || '-']
            ];
            infoLeft.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray); doc.text(k, M, dy1)
                doc.setFont('helvetica', 'normal').setTextColor(...dark);
                const valLines = doc.splitTextToSize(`: ${v}`, 60)
                doc.text(valLines, M + 22, dy1)
                dy1 += valLines.length > 1 ? valLines.length * 4 : 5
            })

            let dy2 = y
            const infoRight = [
                ['Teknisi / PIC', workOrder.assignedTo || '-'],
                ['Lokasi', workOrder.location || '-'],
                ['Jadwal Mulai', fdt(workOrder.scheduledStart)],
                ['Jadwal Selesai', fdt(workOrder.scheduledEnd)]
            ];
            infoRight.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray); doc.text(k, col2, dy2)
                doc.setFont('helvetica', 'normal').setTextColor(...dark);
                const valLines = doc.splitTextToSize(`: ${v}`, 60)
                doc.text(valLines, col2 + 22, dy2)
                dy2 += valLines.length > 1 ? valLines.length * 4 : 5
            })

            y = Math.max(dy1, dy2) + 2

            // Description Box
            if (workOrder.description) {
                const descLines = doc.splitTextToSize(workOrder.description, W - M * 2 - 8)
                const descHeight = descLines.length * 4 + 10
                doc.setFillColor(...light).roundedRect(M, y, W - M * 2, descHeight, 2, 2, 'F')
                doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('DESKRIPSI PEKERJAAN', M + 4, y + 5)
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(71, 85, 105).text(descLines, M + 4, y + 10)
                y += descHeight + 6
            }

            // Tasks Table (if any)
            if (workOrder.tasks && workOrder.tasks.length > 0) {
                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark).text('CHECKLIST PEKERJAAN', M, y + 4)
                autoTable(doc, {
                    startY: y + 6, margin: { left: M, right: M },
                    head: [['[ ]', 'Deskripsi Tugas', 'Status']],
                    body: workOrder.tasks.map(t => [t.isDone ? '[X]' : '[ ]', t.title, t.isDone ? 'Selesai' : 'Pending']),
                    headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 8 },
                    bodyStyles: { fontSize: 8, textColor: dark },
                    alternateRowStyles: { fillColor: light },
                    columnStyles: { 0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }, 1: { halign: 'left' }, 2: { halign: 'center', cellWidth: 20 } },
                    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
                })
                y = (doc as any).lastAutoTable.finalY + 6
            }

            // Items / Materials Table (if any)
            if (workOrder.items && workOrder.items.length > 0) {
                if (y > 230) { doc.addPage(); y = 20 }
                doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark).text('KEBUTUHAN BARANG / MATERIAL', M, y + 4)
                autoTable(doc, {
                    startY: y + 6, margin: { left: M, right: M },
                    head: [['No', 'Tipe', 'Deskripsi', 'Qty', 'Satuan', 'Status']],
                    body: workOrder.items.map((it, idx) => [idx + 1, it.type, it.description, it.qty, it.unit, it.isReleased ? 'Rilis' : '-']),
                    headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                    bodyStyles: { fontSize: 8, textColor: dark },
                    alternateRowStyles: { fillColor: light },
                    columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 25 }, 2: { halign: 'left' }, 3: { halign: 'center', cellWidth: 15 }, 4: { halign: 'center', cellWidth: 15 }, 5: { halign: 'center', cellWidth: 20 } },
                    styles: { lineColor: [226, 232, 240], lineWidth: 0.2 },
                })
                y = (doc as any).lastAutoTable.finalY + 8
            }

            // Notes / Terms
            if (workOrder.notes) {
                if (y > 240) { doc.addPage(); y = 20 }
                const nl = doc.splitTextToSize(workOrder.notes, W - M * 2 - 8)
                const nh = nl.length * 4 + 10
                doc.setFillColor(...light).roundedRect(M, y, W - M * 2, nh, 2, 2, 'F')
                doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('CATATAN TAMBAHAN', M + 4, y + 5)
                doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(71, 85, 105).text(nl, M + 4, y + 10)
                y += nh + 8
            }

            // Signatures
            if (y > 238) { doc.addPage(); y = 20 }
            y += 4
            const sw = (W - M * 2 - 10) / 3
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text('Disetujui / Pelanggan,', M, y, { align: 'center', maxWidth: sw })
            doc.text('Dikerjakan Oleh,', M + sw + 5, y, { align: 'center', maxWidth: sw })
            doc.text('Diperiksa Oleh,', M + sw * 2 + 10, y, { align: 'center', maxWidth: sw })

            y += 24
            doc.setDrawColor(203, 213, 225).setLineWidth(0.4)
            doc.line(M + 5, y, M + sw - 5, y)
            doc.line(M + sw + 10, y, M + sw * 2, y)
            doc.line(M + sw * 2 + 15, y, W - M - 5, y)
            y += 4

            doc.setFont('helvetica', 'bold').setTextColor(...dark)
            doc.text(workOrder.customer?.name || '(..................................)', M + sw / 2, y, { align: 'center' })
            doc.text(workOrder.assignedTo || '(..................................)', M + sw + 5 + sw / 2, y, { align: 'center' })
            doc.text('(..................................)', M + sw * 2 + 10 + sw / 2, y, { align: 'center' })

            // Footer
            const pc = doc.getNumberOfPages()
            for (let i = 1; i <= pc; i++) {
                doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7).setTextColor(...gray)
                doc.text(`Work Order resmi diterbitkan oleh ${company.name || 'PT. Axon Ecosystem'}`, M, 290)
                doc.text(`Hal ${i} / ${pc}`, W - M, 290, { align: 'right' })
            }
            doc.save(`${workOrder.number}.pdf`)
        } catch (e) { console.error(e); alert('Gagal generate PDF') }
        finally { setBusy(false) }
    }

    const pr = WO_PRIORITY[workOrder.priority] || WO_PRIORITY.NORMAL

    return (
        <div className="fixed inset-0 z-[250] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4">

                <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl sticky top-0 z-10">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white`}>{workOrder.number}</span>
                            <span className={`inline-flex items-center px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${pr.color}`}>{workOrder.priority}</span>
                            <span className="text-slate-700 text-sm font-bold">{workOrder.title}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={generatePDF} disabled={busy}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 px-5 text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20">
                            <Download size={13} className="mr-2" />
                            {busy ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-8 bg-slate-100/50">
                    {/* Visual Preview Container */}
                    <div className="bg-white mx-auto shadow-sm border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif' }}>

                        {/* Header */}
                        <div className="flex justify-between items-start border-b-[3px] border-amber-600 pb-4 mb-5">
                            <div className="flex gap-4 items-start">
                                {company.logo && <img src={`http://localhost:5000${company.logo}`} alt="logo" className="h-16 w-auto object-contain" />}
                                <div>
                                    <p className="font-extrabold text-slate-900 text-lg tracking-wide">{company.name || 'PT. Axon Ecosystem'}</p>
                                    <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                        <p>{company.address}</p>
                                        <p>{[company.city, company.province].filter(Boolean).join(', ')} {company.postalCode}</p>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        {company.phone && <p>Tel: {company.phone}</p>}
                                        {company.email && <p>Email: {company.email}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right text-[10px]">
                                <table className="ml-auto">
                                    <tbody>
                                        <tr><td className="font-bold text-slate-500 pr-3 pb-1">WO No.</td><td className="font-bold text-slate-900 pb-1">{workOrder.number}</td></tr>
                                        <tr><td className="font-bold text-slate-500 pr-3 pb-1">Prioritas</td><td className="font-bold text-slate-900 pb-1">{workOrder.priority}</td></tr>
                                        <tr><td className="font-bold text-slate-500 pr-3 pb-1">Tipe</td><td className="font-bold text-slate-900 pb-1">{WO_TYPE[workOrder.type] || workOrder.type}</td></tr>
                                        <tr><td className="font-bold text-slate-500 pr-3 pb-1">Dibuat</td><td className="font-bold text-slate-900 pb-1">{fd(new Date().toISOString())}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-6">
                            <h1 className="font-black text-amber-600 tracking-[0.2em] uppercase text-xl">Work Order</h1>
                        </div>

                        {/* Information Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-6 text-[11px]">
                            <div>
                                <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Informasi Pekerjaan</p>
                                <table className="w-full">
                                    <tbody>
                                        <tr><td className="font-bold text-slate-500 py-1 w-24 align-top">Judul</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.title}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Pelanggan</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.customer?.name || '-'}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Project</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.project ? `${workOrder.project.number} - ${workOrder.project.name}` : '-'}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Sales Order</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.salesOrder?.number || '-'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Detail Jadwal & Lokasi</p>
                                <table className="w-full">
                                    <tbody>
                                        <tr><td className="font-bold text-slate-500 py-1 w-24 align-top">Teknisi / PIC</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.assignedTo || '-'}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Lokasi</td><td className="font-medium text-slate-900 py-1 align-top">: {workOrder.location || '-'}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Jadwal Mulai</td><td className="font-medium text-slate-900 py-1 align-top">: {fdt(workOrder.scheduledStart)}</td></tr>
                                        <tr><td className="font-bold text-slate-500 py-1 align-top">Jadwal Selesai</td><td className="font-medium text-slate-900 py-1 align-top">: {fdt(workOrder.scheduledEnd)}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Description Box */}
                        {workOrder.description && (
                            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-[10px]">
                                <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Deskripsi Pekerjaan</p>
                                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{workOrder.description}</p>
                            </div>
                        )}

                        {/* Tasks Table */}
                        {workOrder.tasks && workOrder.tasks.length > 0 && (
                            <div className="mb-6">
                                <p className="font-bold text-[11px] text-slate-900 mb-2">CHECKLIST PEKERJAAN</p>
                                <table className="w-full text-[10px] border border-slate-200">
                                    <thead className="bg-indigo-600 text-white">
                                        <tr>
                                            <th className="py-2 px-3 text-center border-r font-bold w-12">[ ]</th>
                                            <th className="py-2 px-3 text-left border-r font-bold">Deskripsi Tugas</th>
                                            <th className="py-2 px-3 text-center font-bold w-24">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {workOrder.tasks.map((t, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="py-2 px-3 text-center border-r font-bold text-slate-500">{t.isDone ? '[X]' : '[ ]'}</td>
                                                <td className="py-2 px-3 text-slate-800 border-r">{t.title}</td>
                                                <td className="py-2 px-3 text-center font-medium text-slate-600">{t.isDone ? 'Selesai' : 'Pending'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Items Table */}
                        {workOrder.items && workOrder.items.length > 0 && (
                            <div className="mb-6">
                                <p className="font-bold text-[11px] text-slate-900 mb-2">KEBUTUHAN BARANG / MATERIAL</p>
                                <table className="w-full text-[10px] border border-slate-200">
                                    <thead className="bg-indigo-600 text-white">
                                        <tr>
                                            <th className="py-2 px-3 text-center border-r font-bold w-10">No</th>
                                            <th className="py-2 px-3 text-center border-r font-bold w-28">Tipe</th>
                                            <th className="py-2 px-3 text-left border-r font-bold">Deskripsi</th>
                                            <th className="py-2 px-3 text-center border-r font-bold w-16">Qty</th>
                                            <th className="py-2 px-3 text-center border-r font-bold w-20">Satuan</th>
                                            <th className="py-2 px-3 text-center font-bold w-20">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {workOrder.items.map((it, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="py-2 px-3 text-center border-r text-slate-500">{idx + 1}</td>
                                                <td className="py-2 px-3 text-center border-r font-medium text-slate-600">{it.type}</td>
                                                <td className="py-2 px-3 text-slate-800 border-r">{it.description}</td>
                                                <td className="py-2 px-3 text-center border-r">{it.qty}</td>
                                                <td className="py-2 px-3 text-center border-r text-slate-500">{it.unit}</td>
                                                <td className="py-2 px-3 text-center font-medium text-slate-600">{it.isReleased ? 'Rilis' : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Notes */}
                        {workOrder.notes && (
                            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-[10px]">
                                <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Catatan Tambahan</p>
                                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{workOrder.notes}</p>
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-6 mt-12 text-center text-[10px]">
                            <div>
                                <p className="text-slate-500 mb-16">Disetujui / Pelanggan,</p>
                                <div className="border-t border-slate-400 pt-2 mx-4">
                                    <p className="font-bold text-slate-800">{workOrder.customer?.name || '(..................................)'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-16">Dikerjakan Oleh,</p>
                                <div className="border-t border-slate-400 pt-2 mx-4">
                                    <p className="font-bold text-slate-800">{workOrder.assignedTo || '(..................................)'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-16">Diperiksa Oleh,</p>
                                <div className="border-t border-slate-400 pt-2 mx-4">
                                    <p className="font-bold text-slate-800">(..................................)</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </motion.div>
        </div>
    )
}
