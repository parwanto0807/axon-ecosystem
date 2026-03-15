"use client"

import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface Clause {
    title: string;
    content: string;
}

interface ContractData {
    number: string;
    date: string | Date;
    firstPartyName: string;
    firstPartyTitle: string;
    firstPartyAddress?: string;
    secondPartyName: string;
    secondPartyTitle: string;
    secondPartyAddress?: string;
    subject: string;
    description?: string;
    clauses: Clause[];
    amount: number;
    startDate: string | Date;
    endDate: string | Date;
}

export const generateContractPDF = (data: ContractData) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - (margin * 2)

    // Helper: Add centered text
    const addCenteredText = (text: string, y: number, size = 12, style = 'normal') => {
        doc.setFontSize(size)
        doc.setFont('helvetica', style)
        const textWidth = doc.getTextWidth(text)
        doc.text(text, (pageWidth - textWidth) / 2, y)
    }

    // Helper: Add label-value pair
    const addPair = (label: string, value: string, y: number) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, y)
        doc.setFont('helvetica', 'normal')
        const splitValue = doc.splitTextToSize(value, contentWidth - 40)
        doc.text(": " + splitValue[0], margin + 35, y)
        return y + (splitValue.length * 6)
    }

    // 1. Header
    addCenteredText("SURAT PERJANJIAN KERJA", 20, 16, 'bold')
    addCenteredText(`Nomor: ${data.number}`, 28, 10, 'normal')
    
    let y = 45
    const today = format(new Date(data.date), "EEEE 'tanggal' d MMMM yyyy", { locale: id })
    const intro = `Pada hari ini ${today}, masing-masing yang bertanda tangan di bawah ini:`
    const splitIntro = doc.splitTextToSize(intro, contentWidth)
    doc.setFontSize(10)
    doc.text(splitIntro, margin, y)
    y += 15

    // 2. Parties
    doc.setFont('helvetica', 'bold')
    doc.text("I. PIHAK PERTAMA", margin, y)
    y += 8
    y = addPair("Nama", data.firstPartyName, y)
    y = addPair("Jabatan", data.firstPartyTitle, y)
    if (data.firstPartyAddress) y = addPair("Alamat", data.firstPartyAddress, y)
    
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.text("II. PIHAK KEDUA", margin, y)
    y += 8
    y = addPair("Nama", data.secondPartyName, y)
    y = addPair("Jabatan", data.secondPartyTitle, y)
    if (data.secondPartyAddress) y = addPair("Alamat", data.secondPartyAddress, y)

    y += 12
    const midText = "Secara bersama-sama disebut \"PARA PIHAK\". Terlebih dahulu menerangkan:"
    doc.setFont('helvetica', 'italic')
    doc.text(doc.splitTextToSize(midText, contentWidth), margin, y)
    y += 15

    // 3. Clauses / Pasal
    data.clauses.forEach((clause, index) => {
        if (y > 260) {
            doc.addPage()
            y = 20
        }
        
        doc.setFont('helvetica', 'bold')
        addCenteredText(`PASAL ${index + 1}`, y, 10, 'bold')
        y += 6
        addCenteredText(clause.title.toUpperCase(), y, 10, 'bold')
        y += 10
        
        doc.setFont('helvetica', 'normal')
        const content = doc.splitTextToSize(clause.content, contentWidth)
        doc.text(content, margin, y)
        y += (content.length * 6) + 8
    })

    // 4. Signatures
    if (y > 230) {
        doc.addPage()
        y = 30
    } else {
        y += 20
    }

    doc.setFont('helvetica', 'normal')
    doc.text("Demikian perjanjian ini dibuat untuk dipatuhi oleh PARA PIHAK.", margin, y)
    y += 20

    const sigWidth = contentWidth / 2
    addCenteredText("PIHAK PERTAMA", y, 10, 'bold')
    doc.text("PIHAK PERTAMA", margin + (sigWidth / 2) - 15, y)
    doc.text("PIHAK KEDUA", margin + sigWidth + (sigWidth / 2) - 15, y)
    
    y += 30
    doc.setFont('helvetica', 'bold', 'underline')
    doc.text(data.firstPartyName, margin + (sigWidth / 2) - (doc.getTextWidth(data.firstPartyName) / 2), y)
    doc.text(data.secondPartyName, margin + sigWidth + (sigWidth / 2) - (doc.getTextWidth(data.secondPartyName) / 2), y)

    // Save
    doc.save(`KONTRAK-${data.number}.pdf`)
}
