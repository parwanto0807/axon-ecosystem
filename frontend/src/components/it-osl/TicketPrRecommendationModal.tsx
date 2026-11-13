"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Building2,
  User,
  Wrench,
  ShieldCheck,
  Edit3,
  Eye,
} from "lucide-react"

export type PrPartItem = {
  id: string
  name: string
  spec: string
  qty: number
  unit: string
  estPrice: string
  urgency: string
}

export type TicketForPr = {
  id: string
  ticketNumber: string
  summary: string
  severity?: string
  status?: string
  ticketType?: string
  createdAt?: string
  location?: { name: string } | null
  category?: { name: string; groupName?: string } | null
  customer?: { name: string; code?: string } | null
  asset?: { name: string; assetCode: string; serialNumber?: string | null } | null
  pic?: { name: string; position?: string | null; department?: string | null; phone?: string | null } | null
  reporterName?: string | null
  assignedUser?: { name: string | null } | null
  rootCause?: string | null
  correctiveAction?: string | null
  workItems?: { phase: string; title: string | null; description: string }[]
  parts?: { id?: string; partName: string; quantity: number; unit: string }[]
}

interface TicketPrRecommendationModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: TicketForPr | null
  currentUserName?: string | null
}

export function TicketPrRecommendationModal({
  isOpen,
  onClose,
  ticket,
  currentUserName,
}: TicketPrRecommendationModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview")
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Master Company
  const [companyName, setCompanyName] = useState("PT. INTECH MITRA ABADI")
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyAddress, setCompanyAddress] = useState<string | null>(null)
  const [companyContact, setCompanyContact] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load master company profile & logo
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"
    fetch(`${API}/api/company`, {
      headers: {
        "x-user-role": "SUPER_ADMIN",
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (data.legalName || data.name) {
            setCompanyName(data.legalName || data.name)
          }
          if (data.logo) {
            const fullLogo =
              data.logo.startsWith("http") || data.logo.startsWith("data:")
                ? data.logo
                : `${API}${data.logo}`
            setCompanyLogo(fullLogo)
          }
          if (data.address) {
            const city = data.city ? `, ${data.city}` : ""
            setCompanyAddress(`${data.address}${city}`)
          }
          if (data.phone || data.email || data.website) {
            const parts = [
              data.phone ? `Telp: ${data.phone}` : null,
              data.email ? `Email: ${data.email}` : null,
              data.website ? data.website : null,
            ].filter(Boolean)
            setCompanyContact(parts.join(" • "))
          }
        }
      })
      .catch(() => {})
  }, [])

  // Form Fields
  const [docNumber, setDocNumber] = useState("")
  const [docDate, setDocDate] = useState("")
  const [urgency, setUrgency] = useState<"NORMAL" | "SEGERA (URGENT)" | "KRITIS (CRITICAL)">("SEGERA (URGENT)")

  // Entity info
  const [customerName, setCustomerName] = useState("")
  const [locationName, setLocationName] = useState("")
  const [requesterName, setRequesterName] = useState("")
  const [assetInfo, setAssetInfo] = useState("")
  const [assetCode, setAssetCode] = useState("")
  const [technicianName, setTechnicianName] = useState("")
  const [supervisorName, setSupervisorName] = useState("IT Supervisor / Head")
  const [purchasingName, setPurchasingName] = useState("Purchasing Team")

  // Technical Analysis & Work Performed
  const [problemSummary, setProblemSummary] = useState("")
  const [analysisText, setAnalysisText] = useState("")
  const [workDoneText, setWorkDoneText] = useState("")
  const [justificationText, setJustificationText] = useState("")
  const [notesToPurchasing, setNotesToPurchasing] = useState("")

  // Recommended Parts
  const [parts, setParts] = useState<PrPartItem[]>([])

  // Draft persistence state
  const [hasDraft, setHasDraft] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Reset to default ticket values
  const resetToTicketDefaults = () => {
    if (!ticket) return

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, "0")
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const yyyy = now.getFullYear()
    const todayFormatted = `${dd}/${mm}/${yyyy}`

    const cleanNum = ticket.ticketNumber?.replace(/[^0-9]/g, "") || "0001"
    const recNumber = `REC-PR/IT/${yyyy}${mm}/${cleanNum.slice(-4) || "0001"}`

    setDocNumber(recNumber)
    setDocDate(todayFormatted)

    if (ticket.severity === "CRITICAL") {
      setUrgency("KRITIS (CRITICAL)")
    } else if (ticket.severity === "MEDIUM" || ticket.severity === "HIGH") {
      setUrgency("SEGERA (URGENT)")
    } else {
      setUrgency("NORMAL")
    }

    setCustomerName(ticket.customer?.name || "Divisi Operasional & Umum")
    setLocationName(ticket.location?.name || "Head Office / Site")
    setRequesterName(ticket.reporterName || ticket.pic?.name || "User Pemohon")
    setAssetInfo(ticket.asset?.name || "Perangkat IT")
    setAssetCode(ticket.asset?.assetCode || "-")
    setTechnicianName(ticket.assignedUser?.name || currentUserName || "Administrator IT")

    setProblemSummary(ticket.summary || "")

    let derivedAnalysis = ticket.rootCause || ""
    if (!derivedAnalysis && ticket.workItems) {
      const analisaItems = ticket.workItems.filter((w) => w.phase === "ANALISA")
      if (analisaItems.length > 0) {
        derivedAnalysis = analisaItems.map((w) => w.description).join("; ")
      }
    }
    if (!derivedAnalysis) {
      derivedAnalysis = `Hasil diagnosa fisik dan sistem pada ${ticket.asset?.name || "unit perangkat"} menunjukkan kendala operasional yang disebabkan oleh penurunan fungsi / kerusakan komponen pendukung.`
    }
    setAnalysisText(derivedAnalysis)

    let derivedWork = ticket.correctiveAction || ""
    if (!derivedWork && ticket.workItems) {
      const pengerjaanItems = ticket.workItems.filter(
        (w) => w.phase === "PENGERJAAN" || w.phase === "HASIL"
      )
      if (pengerjaanItems.length > 0) {
        derivedWork = pengerjaanItems.map((w) => w.description).join("; ")
      }
    }
    if (!derivedWork) {
      derivedWork =
        "Telah dilakukan pemeriksaan menyeluruh, pengecekan voltase, dan isolasi kerusakan pada unit."
    }
    setWorkDoneText(derivedWork)

    setJustificationText(
      "Komponen lama mengalami kerusakan permanen / tidak layak pakai. Penggantian part baru sangat diperlukan agar perangkat segera beroperasi normal tanpa menghambat proses kerja."
    )
    setNotesToPurchasing(
      "Mohon diprioritaskan pengadaannya sesuai spesifikasi teknis terlampir guna meminimalkan downtime operasional."
    )

    if (ticket.parts && ticket.parts.length > 0) {
      setParts(
        ticket.parts.map((p, idx) => ({
          id: String(idx + 1),
          name: p.partName,
          spec: "Sesuai standar pabrikan / kompatibel",
          qty: p.quantity || 1,
          unit: p.unit || "Pcs",
          estPrice: "",
          urgency: "Segera",
        }))
      )
    } else {
      const lowerSum = (ticket.summary || "").toLowerCase()
      let initialPartName = "Kabel LAN Cat 6"
      let initialSpec = "Kabel LAN Belden/Ugreen/AMP High Speed"

      if (lowerSum.includes("ssd") || lowerSum.includes("harddisk") || lowerSum.includes("hdd")) {
        initialPartName = "SSD Internal 512GB NVMe / SATA"
        initialSpec = "Form factor 2.5\" / M.2 PCIe Gen3x4, Read/Write 2000MBps+"
      } else if (lowerSum.includes("ram") || lowerSum.includes("memori")) {
        initialPartName = "RAM DDR4 8GB / 16GB"
        initialSpec = "Speed 3200MHz SODIMM / UDIMM standar"
      } else if (lowerSum.includes("printer") || lowerSum.includes("cartridge") || lowerSum.includes("pita")) {
        initialPartName = "Pita Ribbon / Print Head Printer"
        initialSpec = "Original compatible untuk printer dotmatrix / thermal"
      } else if (lowerSum.includes("power") || lowerSum.includes("adaptor") || lowerSum.includes("psu")) {
        initialPartName = "Power Supply Unit / Adaptor DC"
        initialSpec = "Standar 80+ Bronze / Output voltase sesuai spek aset"
      }

      setParts([
        {
          id: "1",
          name: initialPartName,
          spec: initialSpec,
          qty: 1,
          unit: "Roll",
          estPrice: "",
          urgency: "Segera",
        },
      ])
    }
  }

  // Initialize or restore draft when ticket changes
  useEffect(() => {
    if (!ticket) return

    const draftKey = `it_osl_pr_draft_${ticket.id}`
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          if (parsed.docNumber) setDocNumber(parsed.docNumber)
          if (parsed.docDate) setDocDate(parsed.docDate)
          if (parsed.urgency) setUrgency(parsed.urgency)
          if (parsed.customerName) setCustomerName(parsed.customerName)
          if (parsed.locationName) setLocationName(parsed.locationName)
          if (parsed.requesterName) setRequesterName(parsed.requesterName)
          if (parsed.assetInfo) setAssetInfo(parsed.assetInfo)
          if (parsed.assetCode) setAssetCode(parsed.assetCode)
          if (parsed.technicianName) setTechnicianName(parsed.technicianName)
          if (parsed.supervisorName) setSupervisorName(parsed.supervisorName)
          if (parsed.purchasingName) setPurchasingName(parsed.purchasingName)
          if (parsed.problemSummary !== undefined) setProblemSummary(parsed.problemSummary)
          if (parsed.analysisText !== undefined) setAnalysisText(parsed.analysisText)
          if (parsed.workDoneText !== undefined) setWorkDoneText(parsed.workDoneText)
          if (parsed.justificationText !== undefined) setJustificationText(parsed.justificationText)
          if (parsed.notesToPurchasing !== undefined) setNotesToPurchasing(parsed.notesToPurchasing)
          if (Array.isArray(parsed.parts) && parsed.parts.length > 0) setParts(parsed.parts)
          setHasDraft(true)
          setIsInitialized(true)
          return
        }
      }
    } catch (_) {}

    resetToTicketDefaults()
    setIsInitialized(true)
  }, [ticket, currentUserName])

  // Auto-save typed draft to localStorage so user work is NEVER lost
  useEffect(() => {
    if (!ticket || !isInitialized) return
    const draftKey = `it_osl_pr_draft_${ticket.id}`
    const payload = {
      docNumber,
      docDate,
      urgency,
      customerName,
      locationName,
      requesterName,
      assetInfo,
      assetCode,
      technicianName,
      supervisorName,
      purchasingName,
      problemSummary,
      analysisText,
      workDoneText,
      justificationText,
      notesToPurchasing,
      parts,
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload))
      setHasDraft(true)
    } catch (_) {}
  }, [
    ticket,
    isInitialized,
    docNumber,
    docDate,
    urgency,
    customerName,
    locationName,
    requesterName,
    assetInfo,
    assetCode,
    technicianName,
    supervisorName,
    purchasingName,
    problemSummary,
    analysisText,
    workDoneText,
    justificationText,
    notesToPurchasing,
    parts,
  ])

  // Reset draft to ticket defaults
  const handleResetDraft = () => {
    if (confirm("Reset seluruh data rekomendasi PR ke data awal tiket? Ketikan draft Anda pada tiket ini akan dihapus.")) {
      if (ticket) {
        try {
          localStorage.removeItem(`it_osl_pr_draft_${ticket.id}`)
        } catch (_) {}
      }
      setHasDraft(false)
      resetToTicketDefaults()
    }
  }

  const handleAddPart = () => {
    setParts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        spec: "",
        qty: 1,
        unit: "Pcs",
        estPrice: "",
        urgency: "Segera",
      },
    ])
  }

  const handleUpdatePart = (id: string, field: keyof PrPartItem, value: any) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleRemovePart = (id: string) => {
    if (parts.length <= 1) {
      alert("Minimal 1 part yang direkomendasikan.")
      return
    }
    setParts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleCopyText = () => {
    const lines = [
      `*SURAT REKOMENDASI PENGADAAN (PR) - ${companyName}*`,
      `No. Dokumen: ${docNumber}`,
      `Ref. Tiket : ${ticket?.ticketNumber || "-"}`,
      `Tanggal    : ${docDate}`,
      `Sifat      : ${urgency}`,
      `---------------------------------------`,
      `*I. DATA PERANGKAT & PEMOHON*`,
      `• Unit/Customer : ${customerName}`,
      `• Lokasi        : ${locationName}`,
      `• Pemohon/PIC   : ${requesterName}`,
      `• Perangkat/Aset: ${assetInfo} (${assetCode})`,
      `• Teknisi IT    : ${technicianName}`,
      `---------------------------------------`,
      `*II. ANALISA & TINDAKAN*`,
      `• Uraian Masalah: ${problemSummary}`,
      `• Hasil Analisa : ${analysisText}`,
      `• Tindakan Sdh  : ${workDoneText}`,
      `• Justifikasi   : ${justificationText}`,
      `---------------------------------------`,
      `*III. DAFTAR PART DIREKOMENDASIKAN*`,
      ...parts.map(
        (p, i) =>
          `${i + 1}. ${p.name} [${p.spec || "-"}] - ${p.qty} ${p.unit} ${p.estPrice ? `(Est: ${p.estPrice})` : ""}`
      ),
      `---------------------------------------`,
      `Catatan: ${notesToPurchasing || "-"}`,
      `Dibuat: ${technicianName} | Menyetujui: ${supervisorName}`,
    ]

    navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handlePrint = () => {
    const printArea = document.getElementById("printable-pr-recommendation")
    if (!printArea) {
      window.print()
      return
    }

    // Collect all stylesheets and style tags to preserve identical styles
    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((node) => node.outerHTML)
      .join("\n")

    const existingIframe = document.getElementById("pr-print-iframe")
    if (existingIframe) {
      existingIframe.remove()
    }

    const iframe = document.createElement("iframe")
    iframe.id = "pr-print-iframe"
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "-9999px"
    iframe.style.width = "210mm"
    iframe.style.height = "148.5mm"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      window.print()
      return
    }

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Rekomendasi PR - ${companyName}</title>
          ${styles}
          <style>
            @page {
              size: 210mm 148.5mm !important;
              margin: 3mm 4mm !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              max-width: 210mm !important;
              box-sizing: border-box !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            body, body * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-950 p-1">
          ${printArea.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error("Print iframe fallback:", e)
        window.print()
      } finally {
        setTimeout(() => {
          iframe.remove()
        }, 120000)
      }
    }, 350)
  }

  if (!isOpen || !ticket) return null

  // Reusable Modern 1/2 A4 Document Content
  const renderDocumentContent = (isPrintVersion: boolean = false) => {
    return (
      <div className="w-full text-slate-950 font-sans text-[9px] leading-tight select-text">
        {/* Kop Dokumen Resmi PT. INTECH MITRA ABADI */}
        <div className="pb-1.5 mb-1.5 border-b-2 border-slate-900">
          <div className="flex items-center justify-between gap-3">
            {/* Logo + Identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              {companyLogo ? (
                <div className="h-11 w-11 shrink-0 flex items-center justify-center p-0.5 border border-slate-300 rounded-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={companyLogo}
                    alt={companyName}
                    className="h-full w-full object-contain"
                    onError={() => setCompanyLogo(null)}
                  />
                </div>
              ) : (
                <div className="h-11 w-11 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 border border-slate-800">
                  <Building2 size={16} className="text-indigo-400" />
                  <span className="text-[7.5px] font-black tracking-widest uppercase text-slate-200">
                    IMA
                  </span>
                </div>
              )}

              <div className="space-y-0.5 min-w-0">
                <h2
                  className="font-black text-[13px] sm:text-[14px] uppercase tracking-wider text-slate-950 leading-none"
                  style={{
                    fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                  }}
                >
                  {companyName}
                </h2>
                <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-800 uppercase tracking-tight">
                  <span>DIVISI IT-OSL & TECHNICAL SUPPORT SERVICES</span>
                </div>
                <p className="text-[7.5px] text-slate-500 leading-none truncate">
                  {companyAddress || "IT Infrastructure, Asset Maintenance & Technical Operations Support"}
                </p>
                {companyContact && (
                  <p className="text-[7.5px] text-slate-500 font-mono leading-none truncate">
                    {companyContact}
                  </p>
                )}
              </div>
            </div>

            {/* Official Document Control Box */}
            <div className="border border-slate-900 rounded p-1.5 text-[8px] font-mono leading-tight bg-slate-50 shrink-0 w-72 text-left">
              <div className="font-bold border-b border-slate-400 pb-0.5 mb-1 text-center bg-slate-900 text-white -mx-1.5 -mt-1.5 p-0.5 text-[8.5px] uppercase tracking-wider">
                SURAT REKOMENDASI PENGADAAN (PR)
              </div>
              <div className="grid grid-cols-[85px_1fr] gap-x-2 gap-y-0.5 items-center">
                <span className="text-slate-500">No. Dokumen:</span>
                <strong className="text-slate-950 text-right whitespace-nowrap font-bold">{docNumber}</strong>
                <span className="text-slate-500">Ref. Tiket:</span>
                <strong className="text-indigo-950 text-right whitespace-nowrap font-bold">{ticket.ticketNumber}</strong>
                <span className="text-slate-500">Tanggal:</span>
                <span className="text-slate-900 text-right font-medium whitespace-nowrap">{docDate}</span>
                <span className="text-slate-500">Sifat Urgensi:</span>
                <span className="text-right">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase inline-block border ${
                      urgency.includes("KRITIS")
                        ? "bg-rose-50 text-rose-900 border-rose-400"
                        : urgency.includes("SEGERA")
                        ? "bg-amber-50 text-amber-900 border-amber-400"
                        : "bg-slate-50 text-slate-900 border-slate-300"
                    }`}
                  >
                    {urgency.split(" ")[0]}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-1 border-b border-slate-400"></div>
        </div>

        {/* Kepada & Perihal Strip */}
        <div className="bg-slate-100 border border-slate-300 rounded px-2 py-1 mb-1.5 flex items-center justify-between font-bold text-[8.5px] uppercase tracking-tight text-slate-800">
          <div>KEPADA YTH: BAGIAN PURCHASING / PENGADAAN BARANG</div>
          <div className="text-indigo-950">PERIHAL: PERMOHONAN PENGADAAN PART / UNIT PERANGKAT IT</div>
        </div>

        {/* Section I: Data Perangkat & Pemohon */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5 bg-slate-50/50">
          <div className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800 border-b border-slate-200 pb-0.5 mb-1">
            I. DATA PERANGKAT & PEMOHON
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[8.5px]">
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Customer / Divisi</span>
              <span className="mr-1">:</span>
              <strong className="text-slate-950 truncate">{customerName}</strong>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Perangkat / Aset</span>
              <span className="mr-1">:</span>
              <strong className="text-slate-950 truncate">{assetInfo}</strong>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Lokasi / Ruangan</span>
              <span className="mr-1">:</span>
              <span className="text-slate-800 truncate">{locationName}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Kode Aset / SN</span>
              <span className="mr-1">:</span>
              <strong className="font-mono text-slate-950">{assetCode}</strong>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Pemohon / PIC</span>
              <span className="mr-1">:</span>
              <strong className="text-slate-950 truncate">{requesterName}</strong>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28 shrink-0">• Teknisi Pemeriksa</span>
              <span className="mr-1">:</span>
              <strong className="text-slate-950 truncate">{technicianName}</strong>
            </div>
          </div>
        </div>

        {/* Section II: Hasil Analisa & Tindakan */}
        <div className="mb-1.5 border border-slate-300 rounded p-1.5 bg-slate-50/50">
          <div className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800 border-b border-slate-200 pb-0.5 mb-1">
            II. HASIL ANALISA KERUSAKAN & TINDAKAN PEKERJAAN
          </div>
          <div className="space-y-0.5 text-[8.5px]">
            <div className="flex items-start">
              <span className="text-slate-600 font-bold w-36 shrink-0">• Gejala / Uraian Masalah</span>
              <span className="mr-1">:</span>
              <span className="text-slate-900 font-medium leading-tight">{problemSummary || "-"}</span>
            </div>
            <div className="flex items-start">
              <span className="text-slate-600 font-bold w-36 shrink-0">• Hasil Analisa Kerusakan</span>
              <span className="mr-1">:</span>
              <span className="text-slate-900 leading-tight">{analysisText || "-"}</span>
            </div>
            <div className="flex items-start">
              <span className="text-slate-600 font-bold w-36 shrink-0">• Tindakan yang Dilakukan</span>
              <span className="mr-1">:</span>
              <span className="text-slate-900 leading-tight">{workDoneText || "-"}</span>
            </div>
            <div className="flex items-start">
              <span className="text-slate-600 font-bold w-36 shrink-0">• Justifikasi Pengadaan</span>
              <span className="mr-1">:</span>
              <span className="text-slate-900 leading-tight">{justificationText || "-"}</span>
            </div>
          </div>
        </div>

        {/* Section III: Daftar Part Direkomendasikan */}
        <div className="mb-1.5">
          <div className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800 mb-0.5">
            III. DAFTAR PART / BARANG YANG DIREKOMENDASIKAN (PR)
          </div>
          <div className="border border-slate-400 overflow-hidden rounded-xs">
            <table className="w-full table-fixed border-collapse text-[8.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800 uppercase text-[8px]">
                  <th className="border-r border-slate-400 p-1 text-center w-[5%]">NO</th>
                  <th className="border-r border-slate-400 p-1 text-left w-[44%]">NAMA PART & SPESIFIKASI TEKNIS</th>
                  <th className="border-r border-slate-400 p-1 text-center w-[8%]">QTY</th>
                  <th className="border-r border-slate-400 p-1 text-center w-[10%]">SATUAN</th>
                  <th className="border-r border-slate-400 p-1 text-right w-[18%]">EST. HARGA</th>
                  <th className="p-1 text-center w-[15%]">URGENSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {parts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="border-r border-slate-300 p-1 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="border-r border-slate-300 p-1 leading-tight overflow-hidden">
                      <div className="font-bold text-slate-950 truncate">{p.name || "-"}</div>
                      {p.spec && <div className="text-[7.5px] text-slate-500 italic truncate">{p.spec}</div>}
                    </td>
                    <td className="border-r border-slate-300 p-1 text-center font-bold text-slate-950">{p.qty}</td>
                    <td className="border-r border-slate-300 p-1 text-center text-slate-700">{p.unit}</td>
                    <td className="border-r border-slate-300 p-1 text-right font-mono text-slate-900">{p.estPrice || "-"}</td>
                    <td className="p-1 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.2 rounded text-[7.5px] font-bold uppercase inline-block border bg-amber-50 text-amber-900 border-amber-300">
                        {p.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {notesToPurchasing && (
            <div className="text-[7.5px] text-slate-500 italic mt-0.5">
              * Catatan Purchasing: {notesToPurchasing}
            </div>
          )}
        </div>

        {/* Section IV: Lembar Otorisasi & Tanda Tangan */}
        <div className="pt-1">
          <div className="font-bold uppercase tracking-wider text-[8.5px] text-slate-800 mb-1">
            IV. LEMBAR PERSETUJUAN & OTORISASI DOKUMEN
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-[8.5px]">
            {/* Kolom 1: IT Support */}
            <div className="border border-slate-400 rounded p-2 flex flex-col justify-between h-28 bg-white">
              <span className="font-bold text-slate-800">Dibuat Oleh (IT Support):</span>
              <div className="flex-1 min-h-[44px] flex items-center justify-center">
                {/* Ruang tanda tangan / stempel basah */}
              </div>
              <div className="space-y-0.5">
                <div className="w-36 mx-auto border-b border-slate-900 mb-1"></div>
                <strong className="text-slate-950 block font-bold text-[8.5px] uppercase truncate">
                  ( {technicianName} )
                </strong>
                <span className="text-[7.5px] text-slate-500">Tgl: {docDate}</span>
              </div>
            </div>

            {/* Kolom 2: IT Supervisor */}
            <div className="border border-slate-400 rounded p-2 flex flex-col justify-between h-28 bg-white">
              <span className="font-bold text-slate-800">Menyetujui (IT Supervisor):</span>
              <div className="flex-1 min-h-[44px] flex items-center justify-center">
                {/* Ruang tanda tangan / stempel basah */}
              </div>
              <div className="space-y-0.5">
                <div className="w-36 mx-auto border-b border-slate-900 mb-1"></div>
                <strong className="text-slate-950 block font-bold text-[8.5px] uppercase">
                  ( {supervisorName} )
                </strong>
                <span className="text-[7.5px] text-slate-500">Tgl: ..... / ..... / 2026</span>
              </div>
            </div>

            {/* Kolom 3: Purchasing */}
            <div className="border border-slate-400 rounded p-2 flex flex-col justify-between h-28 bg-white">
              <span className="font-bold text-slate-800">Diterima (Purchasing):</span>
              <div className="flex-1 min-h-[44px] flex items-center justify-center">
                {/* Ruang tanda tangan / stempel basah */}
              </div>
              <div className="space-y-0.5">
                <div className="w-36 mx-auto border-b border-slate-900 mb-1"></div>
                <strong className="text-slate-950 block font-bold text-[8.5px] uppercase truncate">
                  ( {purchasingName} )
                </strong>
                <span className="text-[7.5px] text-slate-500">Tgl: ..... / ..... / 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div
        key="pr-recommendation-modal-root"
        className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 bg-black/70 overflow-y-auto no-print print:hidden"
      >
        {/* MODAL WRAPPER (Hidden on print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden no-print"
        >
          {/* Top Bar Navigation */}
          <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Printer size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    Surat Rekomendasi Pengadaan Part (PR)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 whitespace-nowrap">
                    Standar 1/2 A4 (A5 Landscape)
                  </span>
                  {hasDraft && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Draft Tersimpan</span>
                      <button
                        type="button"
                        onClick={handleResetDraft}
                        className="ml-1 text-slate-400 hover:text-white underline cursor-pointer"
                        title="Kembalikan data ke awal tiket"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Dokumen rekomendasi teknis & pengajuan Purchase Request untuk tim Purchasing
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                    activeTab === "preview"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye size={13} />
                  <span>Preview 1/2 A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                    activeTab === "edit"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Edit Data & Part</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
            {/* TAB 1: PREVIEW MODE (1/2 A4 Landscape: 210 x 148.5 mm) */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {/* Print Control Strip */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>
                      Format Cetak: <strong>1/2 A4 (A5 Landscape: 210 × 148.5 mm)</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Tepat 1 Halaman (Zero Overflow)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition active:scale-95 shadow-xs"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? "Tersalin ke Clipboard" : "Salin Format WA"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition active:scale-95 shadow-md shadow-indigo-600/30"
                    >
                      <Printer size={15} />
                      <span>Cetak 1/2 A4 / PDF</span>
                    </button>
                  </div>
                </div>

                {/* VISUAL PAPER PREVIEW CONTAINER (210mm x 148.5mm aspect) */}
                <div className="overflow-x-auto flex justify-center py-2">
                  <div className="bg-white border border-slate-300 shadow-xl rounded-xl p-5 sm:p-6 w-[210mm] max-w-[210mm] min-h-[148.5mm] overflow-hidden flex flex-col justify-between">
                    {renderDocumentContent(false)}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDIT MODE */}
            {activeTab === "edit" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
                {/* Meta Header Inputs */}
                <div>
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={15} className="text-indigo-600" />
                    <span>1. Informasi Dokumen & Sifat Urgensi</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nomor Rekomendasi (PR)
                      </label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tanggal Dokumen
                      </label>
                      <input
                        type="text"
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tingkat Urgensi
                      </label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="SEGERA (URGENT)">SEGERA (URGENT)</option>
                        <option value="KRITIS (CRITICAL)">KRITIS (CRITICAL)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Technical Analysis Inputs */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Wrench size={15} className="text-indigo-600" />
                    <span>2. Hasil Analisa Teknis & Tindakan</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Uraian Masalah / Gejala
                      </label>
                      <input
                        type="text"
                        value={problemSummary}
                        onChange={(e) => setProblemSummary(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Hasil Analisa Teknis (Root Cause)
                      </label>
                      <textarea
                        rows={2}
                        value={analysisText}
                        onChange={(e) => setAnalysisText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tindakan yang Telah Dilakukan
                      </label>
                      <textarea
                        rows={2}
                        value={workDoneText}
                        onChange={(e) => setWorkDoneText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Justifikasi Kebutuhan Pengadaan
                      </label>
                      <textarea
                        rows={2}
                        value={justificationText}
                        onChange={(e) => setJustificationText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Recommended Parts Table */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={15} className="text-indigo-600" />
                      <span>3. Daftar Part / Barang yang Direkomendasikan</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                    >
                      <Plus size={13} />
                      <span>Tambah Baris Part</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {parts.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-1 text-center font-bold text-xs text-slate-500">
                          #{idx + 1}
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Nama Part..."
                            value={p.name}
                            onChange={(e) => handleUpdatePart(p.id, "name", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Spek Teknis..."
                            value={p.spec}
                            onChange={(e) => handleUpdatePart(p.id, "spec", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            min={1}
                            value={p.qty}
                            onChange={(e) =>
                              handleUpdatePart(p.id, "qty", parseInt(e.target.value) || 1)
                            }
                            className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Pcs"
                            value={p.unit}
                            onChange={(e) => handleUpdatePart(p.id, "unit", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Est. Harga"
                            value={p.estPrice}
                            onChange={(e) => handleUpdatePart(p.id, "estPrice", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Baris"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Catatan Tambahan untuk Tim Purchasing
                    </label>
                    <input
                      type="text"
                      value={notesToPurchasing}
                      onChange={(e) => setNotesToPurchasing(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Signer Names */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={15} className="text-indigo-600" />
                    <span>4. Personil Otorisasi & Tanda Tangan</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Dibuat Oleh (Teknisi IT)
                      </label>
                      <input
                        type="text"
                        value={technicianName}
                        onChange={(e) => setTechnicianName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Menyetujui (IT Supervisor / Head)
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Diterima Oleh (Purchasing)
                      </label>
                      <input
                        type="text"
                        value={purchasingName}
                        onChange={(e) => setPurchasingName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 text-[11px]">
              Format cetak resmi: <strong>1/2 A4 (A5 Landscape)</strong> untuk efisiensi kertas & printer dotmatrix.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black transition active:scale-95 shadow-xs"
              >
                <Printer size={15} />
                <span>Cetak 1/2 A4 / PDF</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* PRINTABLE ELEMENT (Used by iframe print and print media) */}
        <div
          id="printable-pr-recommendation"
          className="hidden print:block text-slate-950 font-sans bg-white"
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @page {
                  size: 210mm 148.5mm !important;
                  margin: 3mm 4mm !important;
                }
              `,
            }}
          />
          <div className="w-full bg-white text-black p-0 m-0">
            {renderDocumentContent(true)}
          </div>
        </div>
      </div>
    </AnimatePresence>
  )
}
