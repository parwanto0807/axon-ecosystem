"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Printer,
  Download,
  X,
  Plus,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  Wrench,
  Search,
} from "lucide-react"
import {
  buildTicketRecommendationData,
  downloadTicketRecommendationPdf,
  printTicketRecommendationPdf,
  RecommendationLetterData,
  RecommendationPartItem,
} from "@/lib/ticket-recommendation-pdf"

interface TicketRecommendationModalProps {
  ticket: any
  isOpen: boolean
  onClose: () => void
}

export default function TicketRecommendationModal({
  ticket,
  isOpen,
  onClose,
}: TicketRecommendationModalProps) {
  const [formData, setFormData] = useState<RecommendationLetterData | null>(null)
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview")
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize or re-initialize data when modal opens with a ticket
  useEffect(() => {
    if (ticket && isOpen) {
      setFormData(buildTicketRecommendationData(ticket))
      setActiveTab("preview")
    }
  }, [ticket, isOpen])

  if (!isOpen || !formData) return null

  // Helper to add a new empty part row
  const handleAddPart = () => {
    setFormData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        parts: [
          ...prev.parts,
          {
            partName: "",
            quantity: 1,
            unit: "pcs",
            notes: "Kebutuhan perbaikan",
          },
        ],
      }
    })
  }

  // Helper to update a part row
  const handleUpdatePart = (index: number, field: keyof RecommendationPartItem, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev
      const newParts = [...prev.parts]
      newParts[index] = {
        ...newParts[index],
        [field]: field === "quantity" ? Math.max(0.1, Number(value) || 1) : value,
      }
      return {
        ...prev,
        parts: newParts,
      }
    })
  }

  // Helper to remove a part row
  const handleRemovePart = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev
      const newParts = prev.parts.filter((_, i) => i !== index)
      return {
        ...prev,
        parts: newParts.length > 0 ? newParts : [{ partName: "", quantity: 1, unit: "pcs", notes: "" }],
      }
    })
  }

  // Reset to original ticket data
  const handleReset = () => {
    if (confirm("Reset seluruh perubahan form ke data asli tiket?")) {
      setFormData(buildTicketRecommendationData(ticket))
    }
  }

  // Action: Print Dot Matrix
  const handlePrint = () => {
    setIsProcessing(true)
    try {
      printTicketRecommendationPdf(formData)
    } catch (e) {
      console.error(e)
      alert("Gagal memproses cetak dot matrix")
    } finally {
      setTimeout(() => setIsProcessing(false), 800)
    }
  }

  // Action: Download PDF
  const handleDownload = () => {
    setIsProcessing(true)
    try {
      downloadTicketRecommendationPdf(formData)
    } catch (e) {
      console.error(e)
      alert("Gagal mengunduh file PDF")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200"
        >
          {/* 1. Modal Top Bar */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                <Printer size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    Surat Rekomendasi Pembelian Part / Barang
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Dot Matrix 1/2 A4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Dokumen pendukung Purchase Request (PR) ke Purchasing • No. Tiket:{" "}
                  <span className="font-mono text-white font-bold">{formData.ticketNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                title="Tutup Modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 2. Sub-Header Toolbar & Tab Switcher */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Tab switch */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg font-medium text-slate-700">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeTab === "preview"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye size={13} />
                <span>Preview Dot Matrix (1/2 A4)</span>
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeTab === "edit"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 size={13} />
                <span>Sesuaikan Form & Part ({formData.parts.length})</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200/70 text-slate-700 font-semibold text-xs transition"
                title="Kembalikan isi form ke data asli tiket"
              >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Reset Tiket</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Download size={13} />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Printer size={13} />
                <span>Cetak Dot Matrix</span>
              </button>
            </div>
          </div>

          {/* 3. Modal Body: Interactive Editor OR Pixel-Accurate Dot Matrix Preview */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
            {activeTab === "preview" ? (
              /* LIVE DOT-MATRIX CONTINUOUS FORM PREVIEW (1/2 A4 Landscape) */
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 px-3 text-[11px] text-amber-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span>
                      <b>Standar Dot Matrix Continuous Form:</b> Ukuran 1/2 A4 landscape (210 × 148.5 mm). Format monokrom (hitam murni) tanpa blok warna abu-abu agar hemat pita ribbon dan tidak luntur.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("edit")}
                    className="underline font-bold text-amber-900 shrink-0 hover:text-amber-700"
                  >
                    Edit Isi / Tambah Part
                  </button>
                </div>

                {/* Continuous Form Simulated Paper with Perforation side styling */}
                <div className="relative bg-white shadow-xl rounded-md border border-slate-300 p-6 font-mono text-black text-[11px] leading-tight select-text overflow-x-auto">
                  {/* Perforation holes left and right */}
                  <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none opacity-40">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    ))}
                  </div>
                  <div className="absolute right-1.5 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none opacity-40">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    ))}
                  </div>

                  <div className="px-4">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-2 border-b-2 border-black border-double">
                      <div>
                        <div className="font-black text-[13px] tracking-wide">PT. GRAFINDO MITRASEMESTA</div>
                        <div className="font-bold text-[10.5px]">DIVISI TEKNOLOGI INFORMASI & INFRASTRUKTUR (IT-OSL)</div>
                        <div className="text-[9.5px]">Dokumen Rekomendasi Teknis Pengadaan Barang / Suku Cadang</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-[12px]">SURAT REKOMENDASI PEMBELIAN (PR)</div>
                        <div className="text-[10px] font-bold">NO. REK: {formData.recoNumber}</div>
                        <div className="text-[9.5px]">
                          Tgl Cetak: {formData.date} | Sifat: <span className="font-bold">{formData.urgency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 my-2 border border-black p-2 text-[10px]">
                      <div className="space-y-1">
                        <div className="grid grid-cols-[100px_10px_1fr]">
                          <span className="font-bold">No. Tiket IT</span>
                          <span>:</span>
                          <span className="font-bold">{formData.ticketNumber} ({formData.categoryName})</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                          <span className="font-bold">Pemohon / PIC</span>
                          <span>:</span>
                          <span>{formData.picName} [Dept: {formData.department}]</span>
                        </div>
                        <div className="grid grid-cols-[100px_10px_1fr]">
                          <span className="font-bold">Lokasi / Unit</span>
                          <span>:</span>
                          <span>{formData.locationName} {formData.customerName ? `(${formData.customerName})` : ""}</span>
                        </div>
                      </div>
                      <div className="space-y-1 border-l border-black pl-3">
                        <div className="grid grid-cols-[105px_10px_1fr]">
                          <span className="font-bold">Perangkat/Aset</span>
                          <span>:</span>
                          <span className="font-bold">{formData.assetName}</span>
                        </div>
                        <div className="grid grid-cols-[105px_10px_1fr]">
                          <span className="font-bold">Kode Aset</span>
                          <span>:</span>
                          <span>{formData.assetCode}</span>
                        </div>
                        <div className="grid grid-cols-[105px_10px_1fr]">
                          <span className="font-bold">Tingkat Urgensi</span>
                          <span>:</span>
                          <span className="font-black uppercase">{formData.urgency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Investigation & Recommendation */}
                    <div className="border border-black p-2 my-2 text-[9.5px] space-y-1.5">
                      <div className="font-bold border-b border-black pb-0.5 text-[10px]">
                        HASIL INVESTIGASI, ANALISA TEKNIS & REKOMENDASI PENYELESAIAN:
                      </div>
                      <div>
                        <span className="font-bold">A. GEJALA & MASALAH AWAL:</span>
                        <p className="pl-3 mt-0.5">{formData.problemSummary || "-"}</p>
                      </div>
                      <div>
                        <span className="font-bold">B. HASIL ANALISA & DIAGNOSA TEKNIS (ROOT CAUSE):</span>
                        <p className="pl-3 mt-0.5">{formData.analysisRootCause || "-"}</p>
                      </div>
                      <div>
                        <span className="font-bold">C. TINDAKAN / PEKERJAAN YANG TELAH DILAKUKAN:</span>
                        <p className="pl-3 mt-0.5">{formData.workDone || "-"}</p>
                      </div>
                      <div>
                        <span className="font-bold">D. KESIMPULAN & JUSTIFIKASI PEMBELIAN BARU:</span>
                        <p className="pl-3 mt-0.5">{formData.conclusionRecommendation || "-"}</p>
                      </div>
                    </div>

                    {/* Table of Required Parts */}
                    <div className="my-2">
                      <div className="font-bold text-[10px] mb-1">
                        DAFTAR KEBUTUHAN BARANG / SUKU CADANG (PURCHASE REQUEST):
                      </div>
                      <table className="w-full border-collapse border border-black text-[9.5px]">
                        <thead>
                          <tr className="border-b border-black text-center font-bold">
                            <th className="border-r border-black p-1 w-10">NO</th>
                            <th className="border-r border-black p-1 text-left">NAMA BARANG / PART & SPESIFIKASI</th>
                            <th className="border-r border-black p-1 w-16">QTY</th>
                            <th className="border-r border-black p-1 w-16">SATUAN</th>
                            <th className="p-1 text-left">KETERANGAN / ALASAN PENGGANTIAN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.parts.map((p, idx) => (
                            <tr key={idx} className="border-b border-black">
                              <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                              <td className="border-r border-black p-1 font-bold">{p.partName || "-"}</td>
                              <td className="border-r border-black p-1 text-center font-bold">{p.quantity}</td>
                              <td className="border-r border-black p-1 text-center">{p.unit}</td>
                              <td className="p-1">{p.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures 3 Columns */}
                    <div className="border border-black my-2 grid grid-cols-3 text-center text-[9.5px]">
                      <div className="border-r border-black p-1.5 flex flex-col justify-between h-20">
                        <div className="font-bold border-b border-black pb-1">DIUSULKAN OLEH (TEKNISI IT)</div>
                        <div className="text-left text-[9px] space-y-0.5">
                          <div>Nama : {formData.proposedBy}</div>
                          <div>Tgl  : _____ / _____ / 202_</div>
                        </div>
                      </div>

                      <div className="border-r border-black p-1.5 flex flex-col justify-between h-20">
                        <div className="font-bold border-b border-black pb-1">DISETUJUI (SPV / HEAD OF IT)</div>
                        <div className="text-left text-[9px] space-y-0.5">
                          <div>Nama : {formData.approvedBy}</div>
                          <div>Tgl  : _____ / _____ / 202_</div>
                        </div>
                      </div>

                      <div className="p-1.5 flex flex-col justify-between h-20">
                        <div className="font-bold border-b border-black pb-1">DITERIMA (BAGIAN PURCHASING)</div>
                        <div className="text-left text-[9px] space-y-0.5">
                          <div>Nama : ______________________</div>
                          <div>Tgl  : _____ / _____ / 202_</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer footnote */}
                    <div className="flex justify-between items-center text-[8px] pt-1 text-slate-700">
                      <span>* Lembar 1: Bagian Purchasing | Lembar 2: Arsip Divisi IT Maintenance</span>
                      <span>Sistem IT-OSL Grafindo • Form 1/2 A4 Continuous</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* FORM EDITOR TAB */
              <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-5 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-1">Pengaturan & Verifikasi Data Rekomendasi</h3>
                  <p className="text-slate-500 text-xs">
                    Anda dapat memodifikasi narasi analisa, tindakan, justifikasi, dan daftar part sebelum mencetak atau mengunduh PDF.
                  </p>
                </div>

                {/* Section A: Nomor & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">No. Rekomendasi</label>
                    <input
                      type="text"
                      value={formData.recoNumber}
                      onChange={(e) => setFormData({ ...formData, recoNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Cetak</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tingkat Urgensi</label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden font-bold"
                    >
                      <option value="URGENT (KRITIS)">URGENT (KRITIS)</option>
                      <option value="TINGGI">TINGGI</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="RENDAH">RENDAH</option>
                    </select>
                  </div>
                </div>

                {/* Section B: Narasi Investigasi Teknis */}
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">1. Keluhan / Gejala Masalah Awal</label>
                    <textarea
                      rows={2}
                      value={formData.problemSummary}
                      onChange={(e) => setFormData({ ...formData, problemSummary: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">2. Hasil Analisa Teknis & Diagnosa (Root Cause)</label>
                    <textarea
                      rows={2}
                      value={formData.analysisRootCause}
                      onChange={(e) => setFormData({ ...formData, analysisRootCause: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden"
                      placeholder="Jelaskan temuan kerusakan komponen, hasil ukur tegangan/arus, kegagalan mekanik..."
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">3. Tindakan / Pekerjaan Yang Telah Dilakukan</label>
                    <textarea
                      rows={2}
                      value={formData.workDone}
                      onChange={(e) => setFormData({ ...formData, workDone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden"
                      placeholder="Uraikan pemeriksaan, pembersihan, running test, isolasi kerusakan..."
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">4. Kesimpulan & Justifikasi Pembelian (Rekomendasi PR)</label>
                    <textarea
                      rows={2}
                      value={formData.conclusionRecommendation}
                      onChange={(e) => setFormData({ ...formData, conclusionRecommendation: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden"
                      placeholder="Alasan mengapa part harus diganti baru, efek jika tidak segera diadakan..."
                    />
                  </div>
                </div>

                {/* Section C: Editable Parts Table */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900">Daftar Part / Komponen yang Dibutuhkan</h4>
                      <p className="text-[11px] text-slate-500">
                        Disarankan maksimal 4-5 part agar muat optimal dalam 1 lembar dot matrix 1/2 A4.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition"
                    >
                      <Plus size={13} />
                      <span>Tambah Part</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.parts.map((p, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <div className="col-span-1 text-center font-bold text-slate-400">#{idx + 1}</div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Nama part, model & spesifikasi..."
                            value={p.partName}
                            onChange={(e) => handleUpdatePart(idx, "partName", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 outline-hidden font-medium"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={p.quantity}
                            onChange={(e) => handleUpdatePart(idx, "quantity", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 outline-hidden text-center font-bold"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Satuan"
                            value={p.unit}
                            onChange={(e) => handleUpdatePart(idx, "unit", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 outline-hidden text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Alasan / Ket..."
                            value={p.notes || ""}
                            onChange={(e) => handleUpdatePart(idx, "notes", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 outline-hidden"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            disabled={formData.parts.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                            title="Hapus Baris"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section D: Signers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Diusulkan Oleh (Teknisi IT)</label>
                    <input
                      type="text"
                      value={formData.proposedBy}
                      onChange={(e) => setFormData({ ...formData, proposedBy: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Disetujui Oleh (Spv IT)</label>
                    <input
                      type="text"
                      value={formData.approvedBy}
                      onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition"
                  >
                    <CheckCircle2 size={14} />
                    <span>Terapkan & Lihat Preview PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Modal Footer */}
          <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Siap dicetak ke printer dot-matrix continuous form Epson LX/LQ series</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Printer size={14} />
                <span>Cetak Dot Matrix</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

