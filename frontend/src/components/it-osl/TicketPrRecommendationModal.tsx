"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Printer, FileText, CheckCircle2, AlertTriangle, Plus, 
  Trash2, Copy, Check, X, Building2, User, Wrench, 
  Sparkles, ShieldCheck, ArrowRight, RefreshCw, Edit3, Eye
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
  currentUserName
}: TicketPrRecommendationModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview")
  const [copied, setCopied] = useState(false)

  // Master Company
  const [companyName, setCompanyName] = useState("PT. INTECH MITRA ABADI")

  // Load master company name if available from API
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003"
    fetch(`${API}/api/company`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && (data.legalName || data.name)) {
          setCompanyName(data.legalName || data.name)
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

  // Initialize or re-populate when ticket changes
  useEffect(() => {
    if (!ticket) return

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, "0")
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const yyyy = now.getFullYear()
    const todayFormatted = `${dd}/${mm}/${yyyy}`

    // Clean ticket code for doc number: PR-REC/IT/202611/0002
    const cleanNum = ticket.ticketNumber?.replace(/[^0-9]/g, "") || "0001"
    const recNumber = `REC-PR/IT/${yyyy}${mm}/${cleanNum.slice(-4) || "0001"}`
    
    setDocNumber(recNumber)
    setDocDate(todayFormatted)

    // Set Urgency based on ticket severity
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
    setTechnicianName(ticket.assignedUser?.name || currentUserName || "Teknisi IT")

    setProblemSummary(ticket.summary || "")

    // Derive Analysis & Root Cause
    let derivedAnalysis = ticket.rootCause || ""
    if (!derivedAnalysis && ticket.workItems) {
      const analisaItems = ticket.workItems.filter(w => w.phase === "ANALISA")
      if (analisaItems.length > 0) {
        derivedAnalysis = analisaItems.map(w => w.description).join("; ")
      }
    }
    if (!derivedAnalysis) {
      derivedAnalysis = `Hasil diagnosa fisik dan sistem pada ${ticket.asset?.name || "unit perangkat"} menunjukkan kendala operasional yang disebabkan oleh penurunan fungsi / kerusakan komponen pendukung.`
    }
    setAnalysisText(derivedAnalysis)

    // Derive Work Done
    let derivedWork = ticket.correctiveAction || ""
    if (!derivedWork && ticket.workItems) {
      const pengerjaanItems = ticket.workItems.filter(w => w.phase === "PENGERJAAN" || w.phase === "HASIL")
      if (pengerjaanItems.length > 0) {
        derivedWork = pengerjaanItems.map(w => w.description).join("; ")
      }
    }
    if (!derivedWork) {
      derivedWork = "Telah dilakukan pemeriksaan menyeluruh, pembersihan konektor, pengetesan voltase/tegangan, serta isolasi kerusakan pada unit."
    }
    setWorkDoneText(derivedWork)

    setJustificationText("Komponen lama mengalami kerusakan permanen / tidak layak pakai dan tidak dapat diservis. Penggantian part baru sangat diperlukan agar perangkat dapat segera beroperasi normal kembali tanpa menghambat alur kerja.")
    setNotesToPurchasing("Mohon diprioritaskan pengadaannya sesuai spesifikasi teknis terlampir guna meminimalkan downtime operasional.")

    // Initial Parts
    if (ticket.parts && ticket.parts.length > 0) {
      setParts(ticket.parts.map((p, idx) => ({
        id: String(idx + 1),
        name: p.partName,
        spec: "Sesuai standar pabrikan / kompatibel",
        qty: p.quantity || 1,
        unit: p.unit || "Pcs",
        estPrice: "",
        urgency: "Segera"
      })))
    } else {
      // Default 1 smart item based on category or summary
      const lowerSum = (ticket.summary || "").toLowerCase()
      let initialPartName = "Komponen / Sparepart Pengganti"
      let initialSpec = "Kompatibel dengan unit " + (ticket.asset?.name || "")

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
          unit: "Pcs",
          estPrice: "",
          urgency: "Segera"
        }
      ])
    }
  }, [ticket, currentUserName])

  // Add Part Row
  const handleAddPart = () => {
    setParts(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        spec: "",
        qty: 1,
        unit: "Pcs",
        estPrice: "",
        urgency: "Segera"
      }
    ])
  }

  // Update Part Row
  const handleUpdatePart = (id: string, field: keyof PrPartItem, value: any) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  // Remove Part Row
  const handleRemovePart = (id: string) => {
    if (parts.length <= 1) {
      alert("Minimal 1 part yang direkomendasikan.")
      return
    }
    setParts(prev => prev.filter(p => p.id !== id))
  }

  // Copy Plaintext for WhatsApp / Telegram Purchasing
  const handleCopyText = () => {
    const lines = [
      `*SURAT REKOMENDASI PEMBELIAN (PR) - ${companyName}*`,
      `No. Dokumen: ${docNumber}`,
      `Ref. Tiket : ${ticket?.ticketNumber || "-"}`,
      `Tanggal    : ${docDate}`,
      `Sifat      : ${urgency}`,
      `---------------------------------------`,
      `*I. DATA UNIT & PEMOHON*`,
      `• Unit/Customer: ${customerName}`,
      `• Lokasi       : ${locationName}`,
      `• Pemohon/PIC  : ${requesterName}`,
      `• Perangkat    : ${assetInfo} (${assetCode})`,
      `• Teknisi IT   : ${technicianName}`,
      `---------------------------------------`,
      `*II. ANALISA & TINDAKAN*`,
      `• Uraian/Gejala: ${problemSummary}`,
      `• Hasil Analisa: ${analysisText}`,
      `• Tindakan Sdh : ${workDoneText}`,
      `• Justifikasi  : ${justificationText}`,
      `---------------------------------------`,
      `*III. DAFTAR PART DIREKOMENDASIKAN*`,
      ...parts.map((p, i) => `${i + 1}. ${p.name} [${p.spec || "-"}] - ${p.qty} ${p.unit} ${p.estPrice ? `(Est: ${p.estPrice})` : ""}`),
      `---------------------------------------`,
      `Catatan: ${notesToPurchasing || "-"}`,
      `Dibuat: ${technicianName} | Menyetujui: ${supervisorName}`
    ]

    navigator.clipboard.writeText(lines.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  if (!isOpen || !ticket) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 bg-black/60 overflow-y-auto" onClick={onClose}>
        
        {/* MODAL WRAPPER (Hidden on print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[94vh] overflow-hidden no-print"
        >
          {/* Top Bar Navigation */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Printer size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-white tracking-tight truncate">Surat Rekomendasi Pembelian (PR)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    1/2 A4 Dot Matrix
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Dokumen rekomendasi teknis & pengadaan part untuk bagian Purchasing
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Tab Switcher */}
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

            {/* TAB 1: PREVIEW MODE (Ready to print on dotmatrix 1/2 A4) */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {/* Print Control Strip */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Format: <strong>1/2 A4 Landscape (210 × 148 mm)</strong></span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[11px] text-slate-500">Font: Monospace murni (Tinta tajam, anti-smudge)</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition active:scale-95 shadow-xs"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? "Tersalin ke Clipboard" : "Salin Format WA"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition active:scale-95 shadow-md shadow-indigo-600/30"
                    >
                      <Printer size={15} />
                      <span>Cetak Dot Matrix / PDF</span>
                    </button>
                  </div>
                </div>

                {/* VISUAL PAPER PREVIEW CONTAINER */}
                <div className="overflow-x-auto flex justify-center py-2">
                  <div className="bg-white border-2 border-slate-400 p-4 sm:p-5 shadow-xl w-[210mm] min-h-[148mm] max-w-[210mm] text-black font-mono text-[10px] leading-tight select-text">
                    
                    {/* Header Dot Matrix */}
                    <div className="border-b-2 border-black pb-1.5 mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black text-xs tracking-wider">{companyName}</div>
                          <div className="text-[9px] font-bold">DIVISI IT-OSL & TECHNICAL SUPPORT SERVICES</div>
                          <div className="text-[8px] text-slate-600">Ecosystem Maintenance • IT Assets • Network Infrastructure</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xs">SURAT REKOMENDASI PENGADAAN (PR)</div>
                          <div className="text-[9px]">No. Dok: <strong>{docNumber}</strong></div>
                          <div className="text-[9px]">Ref. Tiket: <strong>{ticket.ticketNumber}</strong> | Tgl: <strong>{docDate}</strong></div>
                          <div className="text-[9px]">Sifat: <strong className="border border-black px-1 uppercase">{urgency}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] font-bold mb-2 pb-1 border-b border-black flex justify-between">
                      <div>KEPADA YTH: BAGIAN PURCHASING / PENGADAAN BARANG</div>
                      <div>PERIHAL: PERMOHONAN PENGADAAN PART / UNIT PERANGKAT IT</div>
                    </div>

                    {/* Section I: Unit & Pemohon */}
                    <div className="mb-2 pb-1 border-b border-dashed border-black">
                      <div className="font-bold underline text-[9px] mb-1">I. DATA PERANGKAT & PEMOHON</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
                        <div>• Customer / Divisi : <strong>{customerName}</strong></div>
                        <div>• Perangkat / Aset  : <strong>{assetInfo}</strong></div>
                        <div>• Lokasi / Ruangan  : {locationName}</div>
                        <div>• Kode Aset / SN    : <strong>{assetCode}</strong></div>
                        <div>• Pemohon / PIC     : {requesterName}</div>
                        <div>• Teknisi Pemeriksa : <strong>{technicianName}</strong></div>
                      </div>
                    </div>

                    {/* Section II: Analisa & Tindakan */}
                    <div className="mb-2 pb-1 border-b border-dashed border-black">
                      <div className="font-bold underline text-[9px] mb-1">II. HASIL ANALISA KERUSAKAN & TINDAKAN PEKERJAAN</div>
                      <div className="space-y-0.5 text-[9px]">
                        <div>• <strong>Gejala / Uraian Masalah :</strong> {problemSummary}</div>
                        <div>• <strong>Hasil Analisa Teknis    :</strong> {analysisText}</div>
                        <div>• <strong>Tindakan yang Dilakukan :</strong> {workDoneText}</div>
                        <div>• <strong>Justifikasi Pengadaan   :</strong> {justificationText}</div>
                      </div>
                    </div>

                    {/* Section III: Tabel Part */}
                    <div className="mb-2 pb-1 border-b border-black">
                      <div className="font-bold underline text-[9px] mb-1">III. DAFTAR PART / BARANG YANG DIREKOMENDASIKAN (PR)</div>
                      
                      <table className="w-full text-left border-collapse border border-black text-[9px]">
                        <thead>
                          <tr className="border-b border-black bg-slate-50">
                            <th className="border-r border-black p-1 text-center w-6 font-bold">NO</th>
                            <th className="border-r border-black p-1 font-bold">NAMA PART & SPESIFIKASI TEKNIS</th>
                            <th className="border-r border-black p-1 text-center w-12 font-bold">QTY</th>
                            <th className="border-r border-black p-1 text-center w-14 font-bold">SATUAN</th>
                            <th className="border-r border-black p-1 text-right w-24 font-bold">EST. HARGA</th>
                            <th className="p-1 text-center w-20 font-bold">URGENSI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parts.map((p, idx) => (
                            <tr key={p.id} className="border-b border-black">
                              <td className="border-r border-black p-1 text-center font-bold">{idx + 1}</td>
                              <td className="border-r border-black p-1">
                                <div className="font-bold">{p.name || "-"}</div>
                                {p.spec && <div className="text-[8px] text-slate-700 italic">{p.spec}</div>}
                              </td>
                              <td className="border-r border-black p-1 text-center font-bold">{p.qty}</td>
                              <td className="border-r border-black p-1 text-center">{p.unit}</td>
                              <td className="border-r border-black p-1 text-right">{p.estPrice || "-"}</td>
                              <td className="p-1 text-center font-bold">{p.urgency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {notesToPurchasing && (
                        <div className="text-[8px] mt-1 italic">
                          * Catatan Khusus Purchasing: {notesToPurchasing}
                        </div>
                      )}
                    </div>

                    {/* Section IV: Tanda Tangan */}
                    <div>
                      <div className="font-bold text-[9px] mb-1">IV. LEMBAR PERSETUJUAN & OTORISASI DOKUMEN</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
                        <div className="border border-black p-1 flex flex-col justify-between h-18">
                          <div>Dibuat Oleh (IT Support)</div>
                          <div>
                            <div className="font-bold underline">({technicianName})</div>
                            <div className="text-[8px]">Tgl: {docDate}</div>
                          </div>
                        </div>

                        <div className="border border-black p-1 flex flex-col justify-between h-18">
                          <div>Menyetujui (IT Supervisor)</div>
                          <div>
                            <div className="font-bold underline">({supervisorName})</div>
                            <div className="text-[8px]">Tgl: ...../...../2026</div>
                          </div>
                        </div>

                        <div className="border border-black p-1 flex flex-col justify-between h-18">
                          <div>Diterima (Purchasing)</div>
                          <div>
                            <div className="font-bold underline">({purchasingName})</div>
                            <div className="text-[8px]">Tgl: ...../...../2026</div>
                          </div>
                        </div>
                      </div>
                    </div>

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
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Nomor Rekomendasi (PR)</label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={e => setDocNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Tanggal Dokumen</label>
                      <input
                        type="text"
                        value={docDate}
                        onChange={e => setDocDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Tingkat Urgensi</label>
                      <select
                        value={urgency}
                        onChange={e => setUrgency(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="SEGERA (URGENT)">SEGERA (URGENT)</option>
                        <option value="KRITIS (CRITICAL)">KRITIS (CRITICAL)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Entity & Location Data */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 size={15} className="text-indigo-600" />
                    <span>2. Unit, Aset & Personil Terkait</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer / Klien</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Lokasi / Ruangan</label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={e => setLocationName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Pemohon / PIC Unit</label>
                      <input
                        type="text"
                        value={requesterName}
                        onChange={e => setRequesterName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Perangkat / Aset</label>
                      <input
                        type="text"
                        value={assetInfo}
                        onChange={e => setAssetInfo(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Kode Aset / Serial Number</label>
                      <input
                        type="text"
                        value={assetCode}
                        onChange={e => setAssetCode(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Teknisi Pemeriksa</label>
                      <input
                        type="text"
                        value={technicianName}
                        onChange={e => setTechnicianName(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Analysis & Work Done */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Wrench size={15} className="text-indigo-600" />
                    <span>3. Hasil Analisa, Tindakan & Justifikasi Pengadaan</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Gejala / Uraian Masalah Awal</label>
                      <input
                        type="text"
                        value={problemSummary}
                        onChange={e => setProblemSummary(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Hasil Diagnosa & Analisa Teknis</label>
                      <textarea
                        rows={2}
                        value={analysisText}
                        onChange={e => setAnalysisText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Tindakan Troubleshooting yang Telah Dilakukan</label>
                      <textarea
                        rows={2}
                        value={workDoneText}
                        onChange={e => setWorkDoneText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Alasan / Justifikasi Kebutuhan Pembelian Part Baru</label>
                      <textarea
                        rows={2}
                        value={justificationText}
                        onChange={e => setJustificationText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Parts Table Editing */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={15} className="text-indigo-600" />
                      <span>4. Daftar Part / Komponen yang Dibutuhkan</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Tambah Part</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {parts.map((p, idx) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 text-center font-bold text-xs text-slate-500">
                          #{idx + 1}
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Nama Part (misal: SSD NVMe 512GB)"
                            value={p.name}
                            onChange={e => handleUpdatePart(p.id, "name", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Spesifikasi teknis / merk"
                            value={p.spec}
                            onChange={e => handleUpdatePart(p.id, "spec", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="1"
                            value={p.qty}
                            onChange={e => handleUpdatePart(p.id, "qty", parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 text-xs font-bold text-center rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1">
                          <select
                            value={p.unit}
                            onChange={e => handleUpdatePart(p.id, "unit", e.target.value)}
                            className="w-full px-1.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="Pcs">Pcs</option>
                            <option value="Unit">Unit</option>
                            <option value="Set">Set</option>
                            <option value="Roll">Roll</option>
                            <option value="Pack">Pack</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Est. Rp"
                            value={p.estPrice}
                            onChange={e => handleUpdatePart(p.id, "estPrice", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(p.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                            title="Hapus Baris"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Tambahan untuk Purchasing</label>
                    <input
                      type="text"
                      placeholder="Contoh: Mohon merk original garansi resmi min 1 tahun"
                      value={notesToPurchasing}
                      onChange={e => setNotesToPurchasing(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Bottom Trigger to Preview */}
                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30"
                  >
                    <span>Selesai & Lihat Preview Cetak</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 font-mono text-[11px]">
              Tip: Tekan tombol <strong>Cetak Dot Matrix</strong> lalu pilih printer Epson atau "Save as PDF" ukuran 1/2 A4.
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
                <span>Cetak 1/2 A4</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* PRINTABLE ELEMENT (Only visible when printing via @media print) */}
        <div id="printable-pr-recommendation" className="hidden print:block font-mono text-[10px] leading-tight text-black bg-white">
          <style jsx global>{`
            @page {
              size: 210mm 148.5mm;
              margin: 4mm 6mm;
            }
          `}</style>

          {/* Kop Dokumen */}
          <div className="border-b-2 border-black pb-1 mb-1.5">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-black text-[12px] tracking-wider">{companyName}</div>
                <div className="text-[9px] font-bold">DIVISI IT-OSL & TECHNICAL SUPPORT SERVICES</div>
                <div className="text-[8px]">Ecosystem Maintenance • IT Assets • Infrastructure</div>
              </div>
              <div className="text-right">
                <div className="font-black text-[12px]">SURAT REKOMENDASI PENGADAAN (PR)</div>
                <div className="text-[9px]">No. Dok: <strong>{docNumber}</strong></div>
                <div className="text-[9px]">Ref. Tiket: <strong>{ticket.ticketNumber}</strong> | Tgl: <strong>{docDate}</strong></div>
                <div className="text-[9px]">Sifat: <strong className="border border-black px-1 uppercase">{urgency}</strong></div>
              </div>
            </div>
          </div>

          <div className="text-[9px] font-bold mb-1.5 pb-0.5 border-b border-black flex justify-between">
            <div>KEPADA YTH: BAGIAN PURCHASING / PENGADAAN BARANG</div>
            <div>PERIHAL: PERMOHONAN PENGADAAN PART / UNIT PERANGKAT IT</div>
          </div>

          {/* I. Data Unit */}
          <div className="mb-1.5 pb-1 border-b border-dashed border-black">
            <div className="font-bold underline text-[9px] mb-0.5">I. DATA PERANGKAT & PEMOHON</div>
            <div className="grid grid-cols-2 gap-x-4 text-[9px]">
              <div>• Customer / Divisi : <strong>{customerName}</strong></div>
              <div>• Perangkat / Aset  : <strong>{assetInfo}</strong></div>
              <div>• Lokasi / Ruangan  : {locationName}</div>
              <div>• Kode Aset / SN    : <strong>{assetCode}</strong></div>
              <div>• Pemohon / PIC     : {requesterName}</div>
              <div>• Teknisi Pemeriksa : <strong>{technicianName}</strong></div>
            </div>
          </div>

          {/* II. Analisa & Tindakan */}
          <div className="mb-1.5 pb-1 border-b border-dashed border-black">
            <div className="font-bold underline text-[9px] mb-0.5">II. HASIL ANALISA KERUSAKAN & TINDAKAN PEKERJAAN</div>
            <div className="space-y-0.5 text-[9px]">
              <div>• <strong>Gejala / Uraian Masalah :</strong> {problemSummary}</div>
              <div>• <strong>Hasil Analisa Teknis    :</strong> {analysisText}</div>
              <div>• <strong>Tindakan yang Dilakukan :</strong> {workDoneText}</div>
              <div>• <strong>Justifikasi Pengadaan   :</strong> {justificationText}</div>
            </div>
          </div>

          {/* III. Part List */}
          <div className="mb-1.5 pb-1 border-b border-black">
            <div className="font-bold underline text-[9px] mb-0.5">III. DAFTAR PART / BARANG YANG DIREKOMENDASIKAN (PR)</div>
            
            <table className="w-full text-left border-collapse border border-black text-[9px]">
              <thead>
                <tr className="border-b border-black bg-slate-50">
                  <th className="border-r border-black p-0.5 text-center w-6 font-bold">NO</th>
                  <th className="border-r border-black p-0.5 font-bold">NAMA PART & SPESIFIKASI TEKNIS</th>
                  <th className="border-r border-black p-0.5 text-center w-10 font-bold">QTY</th>
                  <th className="border-r border-black p-0.5 text-center w-14 font-bold">SATUAN</th>
                  <th className="border-r border-black p-0.5 text-right w-24 font-bold">EST. HARGA</th>
                  <th className="p-0.5 text-center w-20 font-bold">URGENSI</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p, idx) => (
                  <tr key={p.id} className="border-b border-black">
                    <td className="border-r border-black p-0.5 text-center font-bold">{idx + 1}</td>
                    <td className="border-r border-black p-0.5">
                      <div className="font-bold">{p.name || "-"}</div>
                      {p.spec && <div className="text-[8px] italic">{p.spec}</div>}
                    </td>
                    <td className="border-r border-black p-0.5 text-center font-bold">{p.qty}</td>
                    <td className="border-r border-black p-0.5 text-center">{p.unit}</td>
                    <td className="border-r border-black p-0.5 text-right">{p.estPrice || "-"}</td>
                    <td className="p-0.5 text-center font-bold">{p.urgency}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {notesToPurchasing && (
              <div className="text-[8px] mt-0.5 italic">
                * Catatan Purchasing: {notesToPurchasing}
              </div>
            )}
          </div>

          {/* IV. Lembar Pengesahan */}
          <div>
            <div className="font-bold text-[9px] mb-0.5">IV. LEMBAR PERSETUJUAN & OTORISASI DOKUMEN</div>
            <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
              <div className="border border-black p-1 flex flex-col justify-between h-16">
                <div>Dibuat Oleh (IT Support)</div>
                <div>
                  <div className="font-bold underline">({technicianName})</div>
                  <div className="text-[8px]">Tgl: {docDate}</div>
                </div>
              </div>

              <div className="border border-black p-1 flex flex-col justify-between h-16">
                <div>Menyetujui (IT Supervisor)</div>
                <div>
                  <div className="font-bold underline">({supervisorName})</div>
                  <div className="text-[8px]">Tgl: ...../...../2026</div>
                </div>
              </div>

              <div className="border border-black p-1 flex flex-col justify-between h-16">
                <div>Diterima (Purchasing)</div>
                <div>
                  <div className="font-bold underline">({purchasingName})</div>
                  <div className="text-[8px]">Tgl: ...../...../2026</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AnimatePresence>
  )
}

