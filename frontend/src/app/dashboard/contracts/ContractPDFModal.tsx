"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Download, Printer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"

interface Clause {
    title: string;
    content: string;
}

interface Contract {
    id: string;
    number: string;
    date: string;
    subject: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    amount: number;
    firstPartyName: string;
    firstPartyTitle: string;
    firstPartyAddress?: string;
    secondPartyName: string;
    secondPartyTitle: string;
    secondPartyAddress?: string;
    clauses: Clause[];
    customer?: { name: string };
    vendor?: { name: string };
    project?: { number: string; title: string };
}

interface Company {
    name?: string;
    legalName?: string;
    logo?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    taxId?: string;
}

const fd = (d: string | Date) => format(new Date(d), "dd MMM yyyy", { locale: localeId })
const fl = (d: string | Date) => format(new Date(d), "EEEE 'tanggal' d MMMM yyyy", { locale: localeId })
const fr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function ContractPDFModal({ contract, company, onClose }: { contract: Contract; company: Company; onClose: () => void }) {
    const [busy, setBusy] = useState(false)

    const generatePDF = async () => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const W = 210; const M = 20
            const contentWidth = W - (M * 2)
            const indigo = [79, 70, 229] as [number, number, number]
            const dark = [15, 23, 42] as [number, number, number]
            const gray = [100, 116, 139] as [number, number, number]
            let y = M

            // 1. Header (Letterhead) - Matching Quotation
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

            y = Math.max(cy, y + 25) + 5
            doc.setDrawColor(...indigo).setLineWidth(0.8).line(M, y, W - M, y)
            y += 10

            // 2. Title
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
            const title = "SURAT PERJANJIAN KERJA"
            doc.text(title, W / 2, y, { align: 'center' })
            y += 6
            doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...gray)
            doc.text(`Nomor: ${contract.number}`, W / 2, y, { align: 'center' })
            y += 15

            // 3. Intro
            doc.setFontSize(10).setTextColor(...dark)
            const intro = `Pada hari ini ${fl(contract.date)}, masing-masing yang bertanda tangan di bawah ini:`
            const splitIntro = doc.splitTextToSize(intro, contentWidth)
            doc.text(splitIntro, M, y)
            y += (splitIntro.length * 6) + 5

            // 4. Parties
            const addPartyBlock = (label: string, name: string, title: string, address?: string) => {
                doc.setFont('helvetica', 'bold').text(label, M, y)
                y += 6
                doc.setFont('helvetica', 'normal')
                const partyData = [["Nama", name], ["Jabatan", title], ["Alamat", address || "-"]]
                partyData.forEach(([k, v]) => {
                    doc.setFont('helvetica', 'bold').text(k, M + 5, y)
                    const valLines = doc.splitTextToSize(`: ${v}`, contentWidth - 40)
                    doc.setFont('helvetica', 'normal').text(valLines, M + 30, y)
                    y += (valLines.length * 5)
                })
                y += 5
            }

            addPartyBlock("I. PIHAK PERTAMA (Pihak Kesatu)", contract.firstPartyName, contract.firstPartyTitle, contract.firstPartyAddress)
            addPartyBlock("II. PIHAK KEDUA (Pihak Kedua)", contract.secondPartyName, contract.secondPartyTitle, contract.secondPartyAddress)

            doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(...gray)
            const paraText = "Secara bersama-sama disebut \"PARA PIHAK\". Terlebih dahulu menerangkan:"
            doc.text(doc.splitTextToSize(paraText, contentWidth), M, y)
            y += 15

            // 5. Clauses
            contract.clauses.forEach((clause, index) => {
                if (y > 260) { doc.addPage(); y = 20 }
                doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark)
                doc.text(`PASAL ${index + 1}`, W / 2, y, { align: 'center' })
                y += 5
                doc.text(clause.title.toUpperCase(), W / 2, y, { align: 'center' })
                y += 7
                doc.setFont('helvetica', 'normal').setFontSize(10)
                const cLines = doc.splitTextToSize(clause.content, contentWidth)
                doc.text(cLines, M, y)
                y += (cLines.length * 5) + 8
            })

            // 6. Signature
            if (y > 240) { doc.addPage(); y = 20 }
            else { y += 15 }
            
            const sw = contentWidth / 2
            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark)
            doc.text("PIHAK PERTAMA", M + (sw / 2), y, { align: 'center' })
            doc.text("PIHAK KEDUA", M + sw + (sw / 2), y, { align: 'center' })
            
            y += 25
            doc.text(contract.firstPartyName, M + (sw / 2), y, { align: 'center' })
            doc.text(contract.secondPartyName, M + sw + (sw / 2), y, { align: 'center' })
            y += 4
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text(contract.firstPartyTitle, M + (sw / 2), y, { align: 'center' })
            doc.text(contract.secondPartyTitle, M + sw + (sw / 2), y, { align: 'center' })

            doc.save(`KONTRAK-${contract.number}.pdf`)
        } catch (e) { console.error(e); alert("Gagal generate PDF") }
        finally { setBusy(false) }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-4 overflow-hidden">
                
                {/* Header Toolbar */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{contract.number}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{contract.subject}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={generatePDF} disabled={busy} className="bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20">
                            {busy ? <Download size={14} className="animate-bounce" /> : <Printer size={14} className="mr-2" />}
                            {busy ? "Memproses..." : "Download PDF"}
                        </Button>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* A4 Preview Canvas */}
                <div className="p-10 bg-slate-100/50">
                    <div className="bg-white mx-auto shadow-2xl p-16 font-serif text-[#0f172a]" style={{ width: '210mm', minHeight: '297mm', color: '#1e293b' }}>
                        {/* Letterhead */}
                        <div className="flex justify-between items-start border-b-[3px] border-indigo-600 pb-6 mb-10">
                            <div className="flex gap-6 items-start">
                                {company.logo && <img src={`http://localhost:5000${company.logo}`} className="h-20 w-auto object-contain" alt="logo" />}
                                <div>
                                    <div className="font-black text-2xl text-slate-900 tracking-tight leading-none mb-2">{company.name || "PT. Axon Ecosystem"}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        {company.address}<br />
                                        {company.city}, {company.province} {company.postalCode}
                                    </div>
                                    <div className="flex gap-4 mt-2">
                                        {company.phone && <span className="text-[10px] font-bold text-slate-500">T: {company.phone}</span>}
                                        {company.email && <span className="text-[10px] font-bold text-slate-500">E: {company.email}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contract Content */}
                        <div className="space-y-10 text-justify leading-relaxed">
                            <div className="text-center">
                                <h1 className="text-xl font-black tracking-tight underline">SURAT PERJANJIAN KERJA</h1>
                                <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest uppercase">Nomor: {contract.number}</p>
                            </div>

                            <p className="text-[13px]">
                                Pada hari ini <strong>{fl(contract.date)}</strong>, masing-masing yang bertanda tangan di bawah ini:
                            </p>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-[13px] font-black underline uppercase">I. PIHAK PERTAMA (Pihak Kesatu)</h3>
                                    <div className="grid grid-cols-[100px_10px_1fr] gap-x-2 text-[13px] pl-4">
                                        <span>Nama</span><span>:</span><span className="font-bold">{contract.firstPartyName}</span>
                                        <span>Jabatan</span><span>:</span><span>{contract.firstPartyTitle}</span>
                                        <span>Alamat</span><span>:</span><span>{contract.firstPartyAddress}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-[13px] font-black underline uppercase">II. PIHAK KEDUA (Pihak Kedua)</h3>
                                    <div className="grid grid-cols-[100px_10px_1fr] gap-x-2 text-[13px] pl-4">
                                        <span>Nama</span><span>:</span><span className="font-bold">{contract.secondPartyName}</span>
                                        <span>Jabatan</span><span>:</span><span>{contract.secondPartyTitle}</span>
                                        <span>Alamat</span><span>:</span><span>{contract.secondPartyAddress}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[13px] italic text-slate-500">
                                Secara bersama-sama disebut <strong>"PARA PIHAK"</strong>. Terlebih dahulu menerangkan bahwa PARA PIHAK telah bermusyawarah dan sepakat mengadakan Perjanjian Kerja dengan ketentuan sebagai berikut:
                            </p>

                            {contract.clauses.map((clause, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="text-center">
                                        <h4 className="text-[14px] font-black">PASAL {i + 1}</h4>
                                        <h5 className="text-[13px] font-black uppercase">{clause.title}</h5>
                                    </div>
                                    <p className="text-[13px] whitespace-pre-wrap">{clause.content}</p>
                                </div>
                            ))}

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-20 pt-16">
                                <div className="text-center space-y-24">
                                    <p className="text-[13px] font-black underline">PIHAK PERTAMA</p>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-black uppercase text-slate-900 border-t border-slate-900 pt-2 inline-block px-4">{contract.firstPartyName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{contract.firstPartyTitle}</p>
                                    </div>
                                </div>
                                <div className="text-center space-y-24">
                                    <p className="text-[13px] font-black underline">PIHAK KEDUA</p>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-black uppercase text-slate-900 border-t border-slate-900 pt-2 inline-block px-4">{contract.secondPartyName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{contract.secondPartyTitle}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
