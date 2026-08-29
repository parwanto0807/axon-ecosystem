"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    Download,
    Printer,
    FileText,
    ShieldCheck,
    UserCheck,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    Briefcase,
    User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { useSession } from "next-auth/react"

interface Loan {
    id: string
    number: string
    investorName: string
    investorContact?: string
    principalAmount: number
    profitSharingPercent: number
    interestRate: number
    repaymentType: string
    tenorMonths?: number
    dueDate?: string
    status: string
    notes?: string
    disbursements?: {
        date: string
        amount: number
        method?: string
        bankAccount?: { bankName: string; accountName: string; accountNumber: string }
        notes?: string
    }[]
    project?: { number: string; name: string; salesOrders?: any[] }
    salesOrders?: any[]
    createdAt: string
}

interface Company {
    name?: string
    legalName?: string
    logo?: string
    address?: string
    city?: string
    province?: string
    postalCode?: string
    phone?: string
    email?: string
    taxId?: string
}

const fd = (d: string | Date) => {
    try {
        return format(new Date(d), "dd MMMM yyyy", { locale: localeId })
    } catch {
        return '-'
    }
}

const fl = (d: string | Date) => {
    try {
        return format(new Date(d), "EEEE 'tanggal' d MMMM yyyy", { locale: localeId })
    } catch {
        return '-'
    }
}

const fr = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`

export default function InvestorLoanPDFModal({
    loan,
    company,
    onClose
}: {
    loan: Loan
    company: Company
    onClose: () => void
}) {
    const { data: session } = useSession()
    const currentUserName = (session?.user as any)?.name || 'Parwanto'

    // Signer Config State (Default: Parwanto - Direktur)
    const [directorName, setDirectorName] = useState('Parwanto')
    const [directorTitle, setDirectorTitle] = useState('Direktur')
    const [investorSignerName, setInvestorSignerName] = useState(loan.investorName || '')
    const [investorSignerTitle, setInvestorSignerTitle] = useState('Investor / Pemodal')
    const [showSignerConfig, setShowSignerConfig] = useState(true)
    const [akadType, setAkadType] = useState<'MUDHARABAH' | 'MURABAHAH' | 'MUSYARAKAH' | 'NONE'>('MUDHARABAH')

    useEffect(() => {
        if (loan.investorName && !investorSignerName) {
            setInvestorSignerName(loan.investorName)
        }
    }, [loan.investorName])

    const effectiveInvestorName = investorSignerName.trim() || loan.investorName || ''
    const effectiveInvestorTitle = investorSignerTitle.trim() || 'Investor / Pemodal'
    const effectiveDirectorName = directorName.trim() || 'Parwanto'
    const effectiveDirectorTitle = directorTitle.trim() || 'Direktur'

    const projectRevenue = (loan.salesOrders && loan.salesOrders.length > 0) 
        ? loan.salesOrders.reduce((sum: number, so: any) => sum + (so.grandTotal || 0), 0) 
        : (loan.project?.salesOrders?.reduce((sum: number, so: any) => sum + (so.grandTotal || 0), 0) || 0);

    const [busy, setBusy] = useState(false)
    const monthlyPayment = loan.tenorMonths && loan.tenorMonths > 0
        ? Math.round(loan.principalAmount / loan.tenorMonths)
        : loan.principalAmount

    const generatePDF = async (action: 'download' | 'print' = 'download') => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const pageWidth = 210
            const pageHeight = 297
            const margin = 16
            const contentWidth = pageWidth - (margin * 2)

            // Color Palette
            const primaryColor: [number, number, number] = [30, 41, 59]    // Slate 800
            const accentColor: [number, number, number] = [37, 99, 235]    // Blue 600
            const darkText: [number, number, number] = [15, 23, 42]        // Slate 900
            const bodyText: [number, number, number] = [51, 65, 85]        // Slate 700
            const mutedText: [number, number, number] = [100, 116, 139]    // Slate 500
            const lineBorder: [number, number, number] = [226, 232, 240]   // Slate 200
            const lightBg: [number, number, number] = [248, 250, 252]      // Slate 50

            let y = margin

            // ═══════════════════════════════════════════════════════════
            // 1. LETTERHEAD / KOP SURAT
            // ═══════════════════════════════════════════════════════════
            let logoLoaded = false
            let actualLogoW = 0
            if (company.logo) {
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

                        const maxH = 14
                        const maxW = 38
                        const ratio = img.naturalWidth / img.naturalHeight
                        let logoW = maxH * ratio
                        let logoH = maxH
                        if (logoW > maxW) {
                            logoW = maxW
                            logoH = logoW / ratio
                        }
                        actualLogoW = logoW
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', margin, y, logoW, logoH)
                        logoLoaded = true
                    }
                } catch {
                    // Fallback without logo
                }
            }

            const headerTextX = logoLoaded ? margin + actualLogoW + 5 : margin
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(13)
            doc.setTextColor(...primaryColor)
            doc.text(company.name || 'PT. AXON ECOSYSTEM INDONESIA', headerTextX, y + 4)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(...mutedText)
            let compY = y + 8

            if (company.legalName && company.legalName !== company.name) {
                doc.text(company.legalName, headerTextX, compY)
                compY += 3.5
            }

            if (company.address) {
                const addrParts = [
                    company.address,
                    [company.city, company.province].filter(Boolean).join(', '),
                    company.postalCode
                ].filter(Boolean).join(' - ')
                const addrLines = doc.splitTextToSize(addrParts, 80)
                doc.text(addrLines, headerTextX, compY)
                compY += addrLines.length * 3.5
            }

            const contacts = [
                company.phone ? `Tel: ${company.phone}` : null,
                company.email ? `Email: ${company.email}` : null
            ].filter(Boolean).join('  |  ')
            if (contacts) {
                doc.text(contacts, headerTextX, compY)
                compY += 3.5
            }

            // Document Meta Badge on Right Header
            const metaBoxW = 62
            const metaBoxH = 18
            const metaBoxX = pageWidth - margin - metaBoxW
            doc.setFillColor(...lightBg)
            doc.setDrawColor(...lineBorder)
            doc.setLineWidth(0.3)
            doc.roundedRect(metaBoxX, y, metaBoxW, metaBoxH, 2, 2, 'FD')

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(...accentColor)
            doc.text('SURAT PERJANJIAN INVESTASI', metaBoxX + 4, y + 4.5)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...mutedText)
            doc.text('No. Dokumen', metaBoxX + 4, y + 8.5)
            doc.text('Tanggal', metaBoxX + 4, y + 12.5)
            doc.text('Status', metaBoxX + 4, y + 16)

            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...darkText)
            doc.text(`: ${loan.number}`, metaBoxX + 20, y + 8.5)
            doc.text(`: ${fd(loan.createdAt || new Date())}`, metaBoxX + 20, y + 12.5)

            const statusStr = loan.status === 'ACTIVE' ? 'AKTIF / BERJALAN' : (loan.status === 'PAID' ? 'LUNAS' : 'DRAFT / RESMI')
            doc.text(`: ${statusStr}`, metaBoxX + 20, y + 16)

            y = Math.max(compY, y + metaBoxH) + 3

            // Double Accent Rule
            doc.setDrawColor(...accentColor)
            doc.setLineWidth(0.8)
            doc.line(margin, y, pageWidth - margin, y)
            y += 1
            doc.setDrawColor(...lineBorder)
            doc.setLineWidth(0.3)
            doc.line(margin, y, pageWidth - margin, y)
            y += 7

            // ═══════════════════════════════════════════════════════════
            // 2. DOCUMENT TITLE
            // ═══════════════════════════════════════════════════════════
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(12)
            doc.setTextColor(...darkText)
            doc.text('SURAT PERJANJIAN PINJAMAN MODAL INVESTOR', pageWidth / 2, y, { align: 'center' })
            y += 4.5
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(7.5)
            doc.setTextColor(...mutedText)
            const akadLabel = akadType === 'MUDHARABAH' ? 'Akad Mudharabah (Bagi Hasil)' :
                              akadType === 'MURABAHAH' ? 'Akad Murabahah (Jual Beli Bertambah)' :
                              akadType === 'MUSYARAKAH' ? 'Akad Musyarakah (Kerja Sama)' :
                              'Perjanjian Pembiayaan'
            doc.text(akadLabel, pageWidth / 2, y, { align: 'center' })
            y += 4
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.setTextColor(...mutedText)
            doc.text(`Nomor Registrasi: ${loan.number}`, pageWidth / 2, y, { align: 'center' })
            y += 7

            // ═══════════════════════════════════════════════════════════
            // 3. INTRO STATEMENT
            // ═══════════════════════════════════════════════════════════
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.setTextColor(...bodyText)
            const intro = `Pada hari ini ${fl(loan.createdAt || new Date())}, bertempat di kantor ${company.name || 'PT. Axon Ecosystem'}, telah dibuat dan disepakati perjanjian pembiayaan modal usaha oleh dan antara para pihak:`
            const splitIntro = doc.splitTextToSize(intro, contentWidth)
            doc.text(splitIntro, margin, y)
            y += (splitIntro.length * 4.2) + 3
            const effectiveInvestorName = investorSignerName.trim() || loan.investorName
            const effectiveInvestorTitle = investorSignerTitle.trim() || 'Investor / Pemodal'
            const effectiveDirectorName = directorName.trim() || 'Parwanto'
            const effectiveDirectorTitle = directorTitle.trim() || 'Direktur'

            // Draw a subtle background for the parties section
            doc.setFillColor(...lightBg)
            doc.setDrawColor(...lineBorder)
            doc.setLineWidth(0.25)

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                theme: 'grid',
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    textColor: darkText,
                    cellPadding: 2.5,
                    lineColor: lineBorder,
                    lineWidth: 0.25,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 30, fontStyle: 'bold', fillColor: lightBg },
                    1: { cellWidth: (contentWidth / 2) - 30, fillColor: [255, 255, 255] },
                    2: { cellWidth: 30, fontStyle: 'bold', fillColor: lightBg },
                    3: { cellWidth: (contentWidth / 2) - 30, fillColor: [255, 255, 255] }
                },
                body: [
                    [
                        { content: 'PIHAK PERTAMA (Investor)', colSpan: 2, styles: { fontStyle: 'bold', textColor: accentColor, fillColor: [241, 245, 249], fontSize: 7, halign: 'center' } },
                        { content: 'PIHAK KEDUA (Pengelola)', colSpan: 2, styles: { fontStyle: 'bold', textColor: accentColor, fillColor: [241, 245, 249], fontSize: 7, halign: 'center' } }
                    ],
                    [ 'Nama Lengkap', `: ${effectiveInvestorName}`, 'Perusahaan', `: ${company.legalName || company.name || 'PT. Axon Ecosystem'}` ],
                    [ 'Jabatan / Peran', `: ${effectiveInvestorTitle}`, 'Penanggung Jwb', `: ${effectiveDirectorName}` ],
                    [ 'Kontak / No HP', `: ${loan.investorContact || '-'}`, 'Jabatan', `: ${effectiveDirectorTitle}` ],
                    [ 'Kapasitas', `: Pemilik Modal Pribadi`, 'Alamat Usaha', `: ${company.address || '-'}` ],
                    [ '', '', 'Email / Kontak', `: ${company.email || company.phone || '-'}` ]
                ]
            })

            y = (doc as any).lastAutoTable.finalY + 8

            doc.setFont('helvetica', 'italic')
            doc.setFontSize(8)
            doc.setTextColor(...mutedText)
            const partiesNote = `PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama selanjutnya disebut sebagai "PARA PIHAK". PARA PIHAK menerangkan terlebih dahulu bahwa telah bersepakat mengadakan perjanjian pembiayaan modal usaha dengan syarat dan ketentuan sebagai berikut:`
            const splitNote = doc.splitTextToSize(partiesNote, contentWidth)
            doc.text(splitNote, margin, y)
            y += (splitNote.length * 4) + 4

            // ═══════════════════════════════════════════════════════════
            // 5. EXECUTIVE SUMMARY TABLE OF LOAN TERMS
            // ═══════════════════════════════════════════════════════════
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(...darkText)
            doc.text('RINGKASAN KETENTUAN FASILITAS INVESTASI', margin, y)
            y += 2.5

            const summaryBody = [
                [
                    { content: 'Pokok Pinjaman (Principal)', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: `${fr(loan.principalAmount)} (${terbilang(loan.principalAmount)} Rupiah)`, styles: { fontStyle: 'bold' as const, textColor: accentColor } },
                    { content: 'Skema Pembayaran', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: loan.repaymentType === 'FULL' ? 'Pelunasan Sekaligus di Akhir' : `Cicilan Bulanan (${loan.tenorMonths || 12} Bulan)` }
                ],
                [
                    { content: 'Bagi Hasil (Profit Share)', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: `${loan.profitSharingPercent}% dari Laba Bersih Project` },
                    { content: 'Bunga Tambahan (Bila ada)', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: loan.interestRate > 0 ? `${loan.interestRate}% per tahun` : '0% (Murni Bagi Hasil)' }
                ],
                [
                    { content: 'Estimasi Cicilan / Bln', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: loan.repaymentType === 'FULL' ? '-' : fr(monthlyPayment) },
                    { content: 'Batas Jatuh Tempo', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: loan.dueDate ? fd(loan.dueDate) : 'Sesuai Masa Tenor Berakhir' }
                ],
                [
                    { content: 'Alokasi Project', styles: { fontStyle: 'bold' as const, fillColor: lightBg } },
                    { content: loan.project ? `${loan.project.number} - ${loan.project.name}` : 'Modal Operasional Perusahaan (Umum)', colSpan: 3 }
                ]
            ]

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                theme: 'grid',
                styles: {
                    font: 'helvetica',
                    fontSize: 7.5,
                    textColor: darkText,
                    cellPadding: 2.8,
                    lineColor: lineBorder,
                    lineWidth: 0.25
                },
                columnStyles: {
                    0: { cellWidth: 42 },
                    1: { cellWidth: 47 },
                    2: { cellWidth: 42 },
                    3: { cellWidth: 47 }
                },
                body: summaryBody
            })

            y = (doc as any).lastAutoTable.finalY + 6

            // ═══════════════════════════════════════════════════════════
            // 6. ARTICLES (PASAL-PASAL)
            // ═══════════════════════════════════════════════════════════
            const akadDesc = akadType === 'MUDHARABAH'
                ? 'Dengan rukun dan ketentuan akad Mudharabah, di mana PIHAK PERTAMA (Shahibul Maal) menyerahkan modal dan PIHAK KEDUA (Mudharib) mengelola dana tersebut dengan bagi hasil sesuai nisbah yang disepakati.'
                : akadType === 'MURABAHAH'
                ? 'Dengan ketentuan akad Murabahah (Jual Beli Bertambah), di mana PIHAK KEDUA membeli kebutuhan proyek dari PIHAK PERTAMA dengan harga jual yang mencakup margin keuntungan, dan pembayaran dilakukan secara cicilan.'
                : akadType === 'MUSYARAKAH'
                ? 'Dengan rukun dan ketentuan akad Musyarakah, di mana PARA PIHAK menyepakati kerja sama pembiayaan dengan kontribusi modal dan pembagian keuntungan serta kerugian sesuai porsi yang disepakati.'
                : 'Dengan ketentuan pembiayaan yang disepakati oleh PARA PIHAK secara sadar dan tanpa paksaan.'
            const splitAkad = doc.splitTextToSize(akadDesc, contentWidth)
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(8)
            doc.setTextColor(...mutedText)
            doc.text(splitAkad, margin, y)
            y += (splitAkad.length * 3.8) + 4

            const clauses = [
                {
                    pasal: 'PASAL 1',
                    title: akadType === 'MURABAHAH' ? 'OBJEK JUAL BELI & TUJUAN' : 'POKOK PINJAMAN & TUJUAN PENGGUNAAN',
                    items: [
                        akadType === 'MURABAHAH'
                            ? `PIHAK KEDUA menyetujui pembelian kebutuhan ${loan.project ? `proyek ${loan.project.name}` : 'operasional perusahaan'} dari PIHAK PERTAMA dengan total harga jual sebesar ${fr(loan.principalAmount)} (${terbilang(loan.principalAmount)} Rupiah), yang mencakup harga pokok barang ditambah margin keuntungan bagi PIHAK PERTAMA.`
                            : `PIHAK PERTAMA setuju untuk menempatkan dana pinjaman modal kepada PIHAK KEDUA sebesar ${fr(loan.principalAmount)} (${terbilang(loan.principalAmount)} Rupiah).`,
                        `PIHAK KEDUA wajib mempergunakan seluruh dana pinjaman semata-mata untuk keperluan permodalan usaha, pelaksanaan proyek ${loan.project ? `(${loan.project.name})${loan.salesOrders && loan.salesOrders.length > 0 ? ` khususnya mendanai Purchase Order (PO): ${loan.salesOrders.map((so: any) => so.poNumber || so.number).join(', ')}` : ''} dengan estimasi Nilai Project sebesar ${fr(projectRevenue)}` : 'operasional perusahaan'}, dan pengembangan bisnis yang sah.`,
                        `Pencairan modal dilakukan secara transfer bank ke rekening operasional resmi PIHAK KEDUA. Apabila disepakati, pencairan dana investasi dapat dilakukan secara bertahap (termin/cicil) sesuai dengan progres dan kebutuhan aktual di lapangan.`
                    ]
                },
                {
                    pasal: 'PASAL 2',
                    title: akadType === 'MURABAHAH' ? 'HARGA JUAL & MARGIN KEUNTUNGAN' : 'BAGI HASIL KEUNTUNGAN & BUNGA',
                    items: akadType === 'MURABAHAH'
                        ? [
                            `Harga jual total sebesar ${fr(loan.principalAmount)} terdiri dari harga pokok barang dan margin keuntungan sebesar ${loan.profitSharingPercent}% dari nilai transaksi.`,
                            `Pembayaran harga jual dilakukan secara ${loan.repaymentType === 'FULL' ? 'sekaligus pada saat jatuh tempo' : `cicilan sebanyak ${loan.tenorMonths || 12} kali`} sebesar ${fr(monthlyPayment)} per bulan.`,
                            `Apabila terdapat keterlambatan pembayaran, dikenakan denda keterlambatan sesuai ketentuan yang berlaku.`
                        ]
                        : [
                            `Atas penempatan dana tersebut, PIHAK PERTAMA berhak memperoleh Bagi Hasil sebesar ${loan.profitSharingPercent}% (persen) dari total keuntungan bersih (net profit) proyek terkait.`,
                            `Perhitungan keuntungan bersih dihitung dari pendapatan proyek setelah dikurangi seluruh biaya operasional langsung, material, pajak, dan pengeluaran proyek yang dapat dipertanggungjawabkan.`,
                            `Pembagian bagi hasil dilakukan secara transparan, disertai penyampaian rekapitulasi keuangan proyek secara berkala oleh PIHAK KEDUA.` +
                            (loan.interestRate > 0 ? `\nTambahan bunga tetap disepakati sebesar ${loan.interestRate}% per tahun dihitung proporsional terhadap sisa pokok pinjaman.` : '')
                        ]
                },
                {
                    pasal: 'PASAL 3',
                    title: 'TATA CARA & JADWAL PENGEMBALIAN PINJAMAN',
                    items: loan.repaymentType === 'FULL'
                        ? [
                            `PIHAK KEDUA berkewajiban mengembalikan pokok pinjaman sebesar ${fr(loan.principalAmount)} secara sekaligus (lunas) pada saat tanggal jatuh tempo yaitu ${loan.dueDate ? fd(loan.dueDate) : 'akhir masa kontrak'}.`,
                            `Pengembalian dilakukan melalui transfer antar rekening bank yang ditunjuk secara resmi oleh PIHAK PERTAMA.`
                        ]
                        : [
                            `Pengembalian pokok pinjaman dilakukan secara cicilan berkala sebanyak ${loan.tenorMonths || 12} (dua belas) kali angsuran bulanan.`,
                            `Besaran cicilan pokok per bulan adalah sebesar ${fr(monthlyPayment)}, dibayarkan selambat-lambatnya tanggal ${loan.dueDate ? new Date(loan.dueDate).getDate() : 10} setiap bulannya.`,
                            `Cicilan pertama dimulai 1 (satu) bulan setelah dana pokok pinjaman efektif diterima di rekening PIHAK KEDUA.`
                        ]
                },
                {
                    pasal: 'PASAL 4',
                    title: 'HAK & KEWAJIBAN PARA PIHAK',
                    items: [
                        `Hak PIHAK PERTAMA: Menerima pengembalian pokok pinjaman serta bagian bagi hasil sesuai jadwal dan besaran yang telah disepakati, serta menerima laporan perkembangan proyek.`,
                        `Kewajiban PIHAK PERTAMA: Tidak melakukan intervensi operasional langsung atas jalannya manajemen proyek yang dikelola oleh PIHAK KEDUA.`,
                        `Hak PIHAK KEDUA: Memiliki hak mutlak dan wewenang penuh dalam mengelola alokasi kerja, strategi teknis, dan eksekusi proyek demi tercapainya target usaha.`,
                        `Kewajiban PIHAK KEDUA: Mengelola dana dengan penuh tanggung jawab, jujur, serta melakukan pembayaran cicilan dan bagi hasil tepat pada waktunya.`
                    ]
                },
                {
                    pasal: 'PASAL 5',
                    title: 'KETERLAMBATAN & KELALAIAN (WANPRESTASI)',
                    items: [
                        `Apabila PIHAK KEDUA mengalami keterlambatan pembayaran cicilan lebih dari 14 (empat belas) hari kalender tanpa pemberitahuan tertulis, PIHAK PERTAMA berhak memberikan Surat Peringatan.`,
                        `Apabila kelalaian berlanjut hingga 60 hari kalender, PARA PIHAK sepakat untuk melakukan musyawarah restrukturisasi jadwal pembayaran.`
                    ]
                },
                {
                    pasal: 'PASAL 6',
                    title: 'KERAHASIAAN & PENYELESAIAN PERSELISIHAN',
                    items: [
                        `PARA PIHAK wajib menjaga kerahasiaan seluruh informasi finansial dan teknis yang tercantum dalam perjanjian ini terhadap pihak ketiga manapun.`,
                        `Segala perselisihan yang timbul akan diselesaikan secara musyawarah untuk mufakat. Apabila tidak tercapai mufakat, maka akan diselesaikan melalui Badan Arbitrase Nasional Indonesia (BANI) atau Pengadilan Negeri yang berwenang di wilayah hukum domisili PIHAK KEDUA.`,
                        `Perjanjian ini tunduk sepenuhnya pada peraturan perundang-undangan Negara Republik Indonesia.`
                    ]
                }
            ]

            // Render Articles
            clauses.forEach((cl) => {
                if (y > pageHeight - 50) {
                    doc.addPage()
                    y = margin + 12
                }

                const bannerH = 6.5
                doc.setFillColor(241, 245, 249)
                doc.setDrawColor(...accentColor)
                doc.setLineWidth(0.4)
                doc.rect(margin, y, contentWidth, bannerH, 'FD')

                doc.setFont('helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.setTextColor(...primaryColor)
                doc.text(`${cl.pasal} : ${cl.title}`, margin + 3.5, y + 4.5)

                y += bannerH + 4.5

                cl.items.forEach((item, itemIdx) => {
                    const itemNum = `(${itemIdx + 1})`
                    const itemLines = doc.splitTextToSize(item, contentWidth - 11)
                    const itemBlockHeight = (itemLines.length * 3.8) + 2.2

                    if (y + itemBlockHeight > pageHeight - 25) {
                        doc.addPage()
                        y = margin + 12
                    }

                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(7.8)
                    doc.setTextColor(...bodyText)
                    doc.text(itemNum, margin + 2.5, y)

                    doc.setFont('helvetica', 'normal')
                    doc.text(itemLines, margin + 9.5, y)
                    y += itemBlockHeight
                })

                y += 3.5
            })

            // ═══════════════════════════════════════════════════════════
            // RIWAYAT PENCAIRAN DANA
            // ═══════════════════════════════════════════════════════════
            if (loan.disbursements && loan.disbursements.length > 0) {
                if (y + 30 > pageHeight - margin) {
                    doc.addPage()
                    y = margin
                }

                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(...primaryColor)
                doc.text('RIWAYAT PENCAIRAN DANA', margin, y)
                y += 6

                const disbBody = loan.disbursements.map(d => [
                    fd(d.date),
                    fr(d.amount),
                    d.method || '-',
                    d.bankAccount ? `${d.bankAccount.bankName} - ${d.bankAccount.accountNumber}` : '-',
                    d.notes || '-'
                ])

                autoTable(doc, {
                    startY: y,
                    head: [['Tanggal', 'Jumlah', 'Metode', 'Rekening Bank', 'Catatan']],
                    body: disbBody,
                    theme: 'grid',
                    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8, textColor: darkText },
                    alternateRowStyles: { fillColor: lightBg },
                    columnStyles: {
                        0: { cellWidth: 25 },
                        1: { cellWidth: 30, halign: 'right' },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 40 },
                        4: { cellWidth: 'auto' }
                    }
                })
                
                y = (doc as any).lastAutoTable.finalY + 8
            }

            // ═══════════════════════════════════════════════════════════
            // 7. SIGNATURE BLOCK (PENGESAHAN)
            // ═══════════════════════════════════════════════════════════
            if (y > pageHeight - 55) {
                doc.addPage()
                y = margin + 10
            } else {
                y += 4
            }

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(...bodyText)
            doc.text(`Demikian Surat Perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan memiliki kekuatan hukum yang sama bagi PARA PIHAK setelah ditandatangani bersama.`, margin, y, { maxWidth: contentWidth })
            y += 8

            doc.setFont('helvetica', 'italic')
            doc.setFontSize(8)
            doc.setTextColor(...mutedText)
            doc.text(`Ditandatangani di ${company.city || 'Indonesia'}, pada tanggal ${fd(loan.createdAt || new Date())}`, margin, y)
            y += 7

            // Signature Columns
            const colWidth = (contentWidth - 20) / 2
            const col1X = margin + 5
            const col2X = margin + colWidth + 15

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8.5)
            doc.setTextColor(...primaryColor)
            doc.text('PIHAK PERTAMA', col1X + (colWidth / 2), y, { align: 'center' })
            doc.text('PIHAK KEDUA', col2X + (colWidth / 2), y, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(...mutedText)
            doc.text('( Pemberi Pinjaman / Investor )', col1X + (colWidth / 2), y + 3.5, { align: 'center' })
            doc.text(`( ${company.name || 'PT. Axon Ecosystem'} )`, col2X + (colWidth / 2), y + 3.5, { align: 'center' })

            // Signature space for physical signing & stamping
            y += 26

            // Signature Lines
            doc.setDrawColor(...primaryColor)
            doc.setLineWidth(0.4)
            doc.line(col1X + 10, y, col1X + colWidth - 10, y)
            doc.line(col2X + 10, y, col2X + colWidth - 10, y)
            y += 4

            // Signer Names
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8.5)
            doc.setTextColor(...darkText)
            doc.text(effectiveInvestorName, col1X + (colWidth / 2), y, { align: 'center' })
            doc.text(effectiveDirectorName, col2X + (colWidth / 2), y, { align: 'center' })

            y += 3.5
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...mutedText)
            doc.text(effectiveInvestorTitle, col1X + (colWidth / 2), y, { align: 'center' })
            doc.text(`${effectiveDirectorTitle} - ${company.name || 'Pengelola Usaha'}`, col2X + (colWidth / 2), y, { align: 'center' })

            // ═══════════════════════════════════════════════════════════
            // 8. RUNNING HEADER & FOOTER PASS
            // ═══════════════════════════════════════════════════════════
            const totalPages = doc.getNumberOfPages()
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i)

                // Running top header for pages after page 1
                if (i > 1) {
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(6.5)
                    doc.setTextColor(...mutedText)
                    doc.text(`SURAT PERJANJIAN INVESTASI — NO: ${loan.number}`, margin, 10)
                    doc.text(company.name || 'PT. Axon Ecosystem', pageWidth - margin, 10, { align: 'right' })
                    doc.setDrawColor(...lineBorder)
                    doc.setLineWidth(0.2)
                    doc.line(margin, 12, pageWidth - margin, 12)
                }

                // Running bottom footer on every page
                const footerY = pageHeight - 10
                doc.setDrawColor(...lineBorder)
                doc.setLineWidth(0.2)
                doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2)

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(6.5)
                doc.setTextColor(...mutedText)
                doc.text(`${company.name || 'PT. Axon Ecosystem'} | Dokumen Perjanjian Investasi Rahasia & Mengikat`, margin, footerY + 2)
                doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, footerY + 2, { align: 'right' })
            }

            // Output
            if (action === 'print') {
                doc.autoPrint()
                const blobUrl = doc.output('bloburl')
                window.open(blobUrl, '_blank')
            } else {
                doc.save(`Perjanjian-Investasi-${loan.number || 'Loan'}.pdf`)
            }
        } catch (e) {
            console.error('Failed to generate PDF:', e)
            alert('Gagal menghasilkan dokumen PDF. Silakan coba beberapa saat lagi.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4 overflow-hidden border border-slate-200"
            >
                {/* Header Toolbar */}
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-slate-50/90 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <FileText size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{loan.number}</h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase tracking-wider">
                                        Legal Contract
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-500">Perjanjian Pinjaman Modal Investor</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button
                                variant="outline"
                                onClick={() => setShowSignerConfig(!showSignerConfig)}
                                className={`rounded-xl border font-bold text-xs h-10 px-3.5 gap-2 transition ${
                                    showSignerConfig
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <SlidersHorizontal size={14} />
                                Penandatangan
                                {showSignerConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => generatePDF('print')}
                                disabled={busy}
                                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs h-10 px-4 gap-2"
                            >
                                <Printer size={15} />
                                Cetak
                            </Button>
                            <Button
                                onClick={() => generatePDF('download')}
                                disabled={busy}
                                className="bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-xs h-10 px-5 shadow-lg shadow-slate-900/15 transition gap-2"
                            >
                                <Download size={15} className={busy ? 'animate-bounce' : ''} />
                                {busy ? 'Menyusun PDF...' : 'Download PDF'}
                            </Button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl hover:bg-slate-200 transition flex items-center justify-center text-slate-400 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Dedicated Signer Configuration Fields */}
                    <AnimatePresence>
                        {showSignerConfig && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pt-2"
                            >
                                <div className="bg-white border border-blue-100/80 rounded-2xl p-4 shadow-sm">
                                    {/* Akad Type Selection */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                            <ShieldCheck size={13} />
                                            <span>Jenis Akad Pembiayaan</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {[
                                                { value: 'MUDHARABAH', label: 'Mudharabah', desc: 'Bagi Hasil' },
                                                { value: 'MURABAHAH', label: 'Murabahah', desc: 'Jual Beli + Margin' },
                                                { value: 'MUSYARAKAH', label: 'Musyarakah', desc: 'Kerja Sama Modal' },
                                                { value: 'NONE', label: 'Lainnya', desc: 'Perjanjian Umum' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setAkadType(opt.value as any)}
                                                    className={`p-2.5 rounded-xl border-2 text-left transition ${
                                                        akadType === opt.value
                                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className={`text-xs font-bold ${akadType === opt.value ? 'text-blue-700' : 'text-slate-800'}`}>
                                                        {opt.label}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pihak Pertama (Investor) */}
                                    <div className="space-y-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                                            <User size={13} />
                                            <span>Penandatangan Pihak Pertama (Investor)</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                    Nama Lengkap
                                                </label>
                                                <input
                                                    type="text"
                                                    value={investorSignerName}
                                                    onChange={(e) => setInvestorSignerName(e.target.value)}
                                                    placeholder="Nama Investor..."
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                    Jabatan / Kapasitas
                                                </label>
                                                <input
                                                    type="text"
                                                    value={investorSignerTitle}
                                                    onChange={(e) => setInvestorSignerTitle(e.target.value)}
                                                    placeholder="e.g. Investor / Pemodal"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pihak Kedua (Direktur / Pengelola) */}
                                    <div className="space-y-2.5 p-3 rounded-xl bg-blue-50/40 border border-blue-200/60">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 uppercase tracking-wider">
                                            <Briefcase size={13} />
                                            <span>Penandatangan Pihak Kedua (Pengelola)</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                    Nama Penandatangan
                                                </label>
                                                <input
                                                    type="text"
                                                    value={directorName}
                                                    onChange={(e) => setDirectorName(e.target.value)}
                                                    placeholder="Nama Penandatangan..."
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                    Jabatan Resmi
                                                </label>
                                                <input
                                                    type="text"
                                                    value={directorTitle}
                                                    onChange={(e) => setDirectorTitle(e.target.value)}
                                                    placeholder="e.g. DIREKTUR / Direktur Utama"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* A4 Preview Container */}
                <div className="p-4 sm:p-8 bg-slate-100/70 overflow-x-auto flex justify-center">
                    <div
                        className="bg-white mx-auto shadow-xl p-8 sm:p-14 font-sans text-slate-900 text-[13px] leading-relaxed border border-slate-200 rounded-sm"
                        style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}
                    >
                        {/* Letterhead */}
                        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-5 mb-6">
                            <div className="flex items-start gap-4">
                                {company.logo ? (
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL}${company.logo}`}
                                        className="h-14 w-auto object-contain"
                                        alt="Logo"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                                        AX
                                    </div>
                                )}
                                <div>
                                    <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">
                                        {company.name || "PT. AXON ECOSYSTEM INDONESIA"}
                                    </h2>
                                    {company.legalName && company.legalName !== company.name && (
                                        <p className="text-[11px] font-semibold text-slate-500">{company.legalName}</p>
                                    )}
                                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                                        {[company.address, [company.city, company.province].filter(Boolean).join(', '), company.postalCode].filter(Boolean).join(' - ')}
                                    </p>
                                    <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                                        {company.phone && <span>Tel: {company.phone}</span>}
                                        {company.email && <span>Email: {company.email}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right text-[11px]">
                                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">Dokumen Resmi</span>
                                <div className="font-extrabold text-slate-900 mt-0.5">{loan.number}</div>
                                <div className="text-slate-500 text-[10px]">{fd(loan.createdAt || new Date())}</div>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center my-6">
                            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                                SURAT PERJANJIAN PINJAMAN MODAL INVESTOR
                            </h1>
                            <p className="text-xs font-semibold text-slate-500 mt-1 italic">
                                {akadType === 'MUDHARABAH' ? 'Akad Mudharabah (Bagi Hasil)' :
                                 akadType === 'MURABAHAH' ? 'Akad Murabahah (Jual Beli Bertambah)' :
                                 akadType === 'MUSYARAKAH' ? 'Akad Musyarakah (Kerja Sama)' :
                                 'Perjanjian Pembiayaan'}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Nomor Dokumen: {loan.number}
                            </p>
                        </div>

                        {/* Intro */}
                        <p className="text-slate-700 mb-5">
                            Pada hari ini <strong>{fl(loan.createdAt || new Date())}</strong>, bertempat di kantor {company.name || 'PT. Axon Ecosystem'}, telah dibuat dan disepakati perjanjian pembiayaan modal usaha oleh dan antara para pihak:
                        </p>

                        {/* Parties Card */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mb-2">
                                    PIHAK PERTAMA (Investor)
                                </span>
                                <div className="space-y-1 text-xs">
                                    <div className="font-bold text-slate-900 text-sm">{effectiveInvestorName}</div>
                                    <div className="text-slate-600 font-medium">Jabatan / Kapasitas: {effectiveInvestorTitle}</div>
                                    <div className="text-slate-600">Kontak: {loan.investorContact || '-'}</div>
                                    <div className="text-slate-500 text-[11px]">Peran: Pemilik Modal Pribadi / Entitas</div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mb-2">
                                    PIHAK KEDUA (Pengelola)
                                </span>
                                <div className="space-y-1 text-xs">
                                    <div className="font-bold text-slate-900 text-sm">{company.legalName || company.name || 'PT. Axon Ecosystem'}</div>
                                    <div className="text-blue-700 font-semibold">Penanggung Jawab: {effectiveDirectorName} ({effectiveDirectorTitle})</div>
                                    <div className="text-slate-600">Alamat: {company.address || '-'}</div>
                                    <div className="text-slate-500 text-[11px]">Email: {company.email || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Key Terms Summary Matrix */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                            <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck size={14} className="text-blue-600" />
                                Ringkasan Ketentuan Investasi
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 text-xs">
                                <div className="bg-white p-3.5">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pokok Pinjaman</div>
                                    <div className="text-sm font-extrabold text-blue-600 mt-1">{fr(loan.principalAmount)}</div>
                                </div>
                                <div className="bg-white p-3.5">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Bagi Hasil Profit</div>
                                    <div className="text-sm font-extrabold text-slate-900 mt-1">{loan.profitSharingPercent}% Net Laba</div>
                                </div>
                                <div className="bg-white p-3.5">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Skema & Tenor</div>
                                    <div className="text-sm font-extrabold text-slate-900 mt-1">
                                        {loan.repaymentType === 'FULL' ? 'Lunas Akhir' : `${loan.tenorMonths || 12} Bln (Cicilan)`}
                                    </div>
                                </div>
                                <div className="bg-white p-3.5">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Jatuh Tempo</div>
                                    <div className="text-sm font-extrabold text-slate-900 mt-1">
                                        {loan.dueDate ? fd(loan.dueDate) : 'Akhir Periode'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Clauses Section */}
                        <div className="space-y-4 mb-8 text-xs text-slate-700">
                            {akadType !== 'NONE' && (
                                <p className="italic text-slate-500 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    {akadType === 'MUDHARABAH' && 'Dengan rukun dan ketentuan akad Mudharabah, di mana PIHAK PERTAMA (Shahibul Maal) menyerahkan modal dan PIHAK KEDUA (Mudharib) mengelola dana tersebut dengan bagi hasil sesuai nisbah yang disepakati.'}
                                    {akadType === 'MURABAHAH' && 'Dengan ketentuan akad Murabahah (Jual Beli Bertambah), di mana PIHAK KEDUA membeli kebutuhan proyek dari PIHAK PERTAMA dengan harga jual yang mencakup margin keuntungan, dan pembayaran dilakukan secara cicilan.'}
                                    {akadType === 'MUSYARAKAH' && 'Dengan rukun dan ketentuan akad Musyarakah, di mana PARA PIHAK menyepakati kerja sama pembiayaan dengan kontribusi modal dan pembagian keuntungan serta kerugian sesuai porsi yang disepakati.'}
                                </p>
                            )}

                            <div>
                                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                                    PASAL 1 : {akadType === 'MURABAHAH' ? 'Objek Jual Beli & Tujuan' : 'Pokok Pinjaman & Penggunaan'}
                                </h4>
                                <p className="mt-2 pl-3">
                                    (1) {akadType === 'MURABAHAH'
                                        ? `PIHAK KEDUA menyetujui pembelian kebutuhan ${loan.project ? `proyek ${loan.project.name}` : 'operasional perusahaan'} dari PIHAK PERTAMA dengan total harga jual sebesar ${fr(loan.principalAmount)}.`
                                        : `PIHAK PERTAMA setuju menyalurkan dana investasi sebesar ${fr(loan.principalAmount)} (${terbilang(loan.principalAmount)} Rupiah) kepada PIHAK KEDUA.`
                                    }<br />
                                    (2) PIHAK KEDUA wajib mengalokasikan dana tersebut secara penuh untuk kebutuhan modal usaha {loan.project ? `pada proyek ${loan.project.name}${loan.salesOrders && loan.salesOrders.length > 0 ? ` (PO: ${loan.salesOrders.map((so: any) => so.poNumber || so.number).join(', ')})` : ''} dengan estimasi Nilai Project sebesar ${fr(projectRevenue)}` : 'operasional perusahaan'}.<br />
                                    (3) Pencairan dana dapat dilakukan secara bertahap (termin) sesuai kesepakatan dan kebutuhan aktual proyek.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                                    PASAL 2 : {akadType === 'MURABAHAH' ? 'Harga Jual & Margin Keuntungan' : 'Bagi Hasil & Bunga'}
                                </h4>
                                <p className="mt-2 pl-3">
                                    {akadType === 'MURABAHAH' ? (
                                        <>
                                            (1) Harga jual total sebesar {fr(loan.principalAmount)} terdiri dari harga pokok barang dan margin keuntungan.<br />
                                            (2) Pembayaran dilakukan secara {loan.repaymentType === 'FULL' ? 'sekaligus' : `cicilan ${loan.tenorMonths || 12} kali`} sebesar {fr(monthlyPayment)}/bulan.
                                        </>
                                    ) : (
                                        <>
                                            (1) PIHAK PERTAMA berhak mendapatkan Bagi Hasil sebesar <strong>{loan.profitSharingPercent}%</strong> dari laba bersih proyek.<br />
                                            (2) Perhitungan laba bersih didasarkan pada selisih pendapatan riil setelah dikurangi beban operasional yang sah.<br />
                                            {loan.interestRate > 0 && <span>(3) Tambahan bunga disepakati sebesar {loan.interestRate}% per tahun dari sisa pokok pinjaman.</span>}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                                    PASAL 3 : Skema & Jadwal Pengembalian
                                </h4>
                                <p className="mt-2 pl-3">
                                    {loan.repaymentType === 'FULL' ? (
                                        <span>(1) Pokok pinjaman dikembalikan secara penuh (lunas) pada tanggal {loan.dueDate ? fd(loan.dueDate) : 'jatuh tempo yang disepakati'}.</span>
                                    ) : (
                                        <span>(1) Pengembalian dilakukan secara bertahap sebanyak {loan.tenorMonths || 12} kali cicilan bulanan sebesar {fr(monthlyPayment)} per bulan.<br />(2) Pembayaran cicilan dilakukan selambat-lambatnya tanggal {loan.dueDate ? new Date(loan.dueDate).getDate() : 10} tiap bulan.</span>
                                    )}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 uppercase bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-blue-600">
                                    PASAL 4 : Kerahasiaan & Penyelesaian Sengketa
                                </h4>
                                <p className="mt-2 pl-3">
                                    (1) PARA PIHAK wajib menjaga kerahasiaan isi perjanjian ini.<br />
                                    (2) Segala perselisihan akan diselesaikan melalui musyawarah kekeluargaan, atau melalui Pengadilan Negeri yang berwenang di Republik Indonesia.
                                </p>
                            </div>
                        </div>

                        {/* Disbursements History Table */}
                        {loan.disbursements && loan.disbursements.length > 0 && (
                            <div className="mb-8 border-t border-dashed border-slate-300 pt-6">
                                <h4 className="font-bold text-slate-900 uppercase mb-4 text-sm">Riwayat Pencairan Dana</h4>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="py-2 px-3 font-semibold">Tanggal</th>
                                                <th className="py-2 px-3 font-semibold text-right">Jumlah</th>
                                                <th className="py-2 px-3 font-semibold">Metode</th>
                                                <th className="py-2 px-3 font-semibold">Rekening Bank</th>
                                                <th className="py-2 px-3 font-semibold">Catatan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loan.disbursements.map((d, i) => (
                                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <td className="py-2 px-3 whitespace-nowrap">{fd(d.date)}</td>
                                                    <td className="py-2 px-3 text-right font-medium whitespace-nowrap">{fr(d.amount)}</td>
                                                    <td className="py-2 px-3 whitespace-nowrap">{d.method || '-'}</td>
                                                    <td className="py-2 px-3">
                                                        {d.bankAccount ? `${d.bankAccount.bankName} - ${d.bankAccount.accountNumber}` : '-'}
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate" title={d.notes || ''}>
                                                        {d.notes || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="pt-6 border-t border-slate-200">
                            <p className="italic text-slate-500 text-[11px] mb-6">
                                Demikian Surat Perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai cukup dan memiliki kekuatan hukum yang sah.
                            </p>

                            <div className="grid grid-cols-2 gap-10 text-center">
                                <div>
                                    <div className="font-extrabold text-slate-900 text-xs uppercase">PIHAK PERTAMA</div>
                                    <div className="text-[10px] text-slate-400 mb-14">( Pemberi Pinjaman / Investor )</div>

                                    <div className="mt-4 pt-2 border-t border-slate-900 inline-block px-6">
                                        <div className="font-bold text-xs text-slate-900">{effectiveInvestorName}</div>
                                        <div className="text-[10px] text-slate-500 font-semibold">{effectiveInvestorTitle}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="font-extrabold text-slate-900 text-xs uppercase">PIHAK KEDUA</div>
                                    <div className="text-[10px] text-slate-400 mb-14">( {company.name || 'Pengelola Usaha'} )</div>

                                    <div className="mt-4 pt-2 border-t border-slate-900 inline-block px-6">
                                        <div className="font-bold text-xs text-slate-900 uppercase">{effectiveDirectorName}</div>
                                        <div className="text-[10px] text-slate-500 font-semibold">{effectiveDirectorTitle}</div>
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

// Indonesian Terbilang Helper Function
function terbilang(n: number): string {
    const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
    const belasan = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas']
    const puluhan = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh']

    if (n === 0) return 'nol'
    if (n < 0) return 'minus ' + terbilang(-n)

    let result = ''
    if (n >= 1000000000000) {
        result += terbilang(Math.floor(n / 1000000000000)) + ' triliun '
        n %= 1000000000000
    }
    if (n >= 1000000000) {
        result += terbilang(Math.floor(n / 1000000000)) + ' miliar '
        n %= 1000000000
    }
    if (n >= 1000000) {
        result += terbilang(Math.floor(n / 1000000)) + ' juta '
        n %= 1000000
    }
    if (n >= 1000) {
        if (Math.floor(n / 1000) === 1) {
            result += 'seribu '
        } else {
            result += terbilang(Math.floor(n / 1000)) + ' ribu '
        }
        n %= 1000
    }
    if (n >= 100) {
        if (Math.floor(n / 100) === 1) {
            result += 'seratus '
        } else {
            result += satuan[Math.floor(n / 100)] + ' ratus '
        }
        n %= 100
    }
    if (n >= 10) {
        if (n < 20) {
            result += belasan[n - 10] + ' '
        } else {
            result += puluhan[Math.floor(n / 10)] + ' ' + satuan[n % 10] + ' '
        }
        return result.trim()
    }
    if (n > 0) {
        result += satuan[n] + ' '
    }
    return result.trim()
}
