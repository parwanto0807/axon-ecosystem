"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Printer, Download, X, Loader2, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    generateSalesMonitoringPDF,
    RecapRowPDF,
    QuotationOnlyPDF,
    SummaryPDF
} from "./SalesMonitoringPDF"

interface SalesMonitoringPDFModalProps {
    isOpen: boolean
    onClose: () => void
    rows: RecapRowPDF[]
    summary: SummaryPDF
    quotationsWithoutSO?: QuotationOnlyPDF[]
    selectedCustomer?: { id: string; code: string; name: string; company?: string | null } | null
    selectedStatus: string
    statusLabel: string
    company?: any
    userName?: string
}

export default function SalesMonitoringPDFModal({
    isOpen,
    onClose,
    rows,
    summary,
    quotationsWithoutSO = [],
    selectedCustomer,
    selectedStatus,
    statusLabel,
    company,
    userName = "Admin"
}: SalesMonitoringPDFModalProps) {
    const [loading, setLoading] = useState(true)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isPrinting, setIsPrinting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

    useEffect(() => {
        let active = true
        if (isOpen) {
            setLoading(true)
            generateSalesMonitoringPDF({
                rows,
                summary,
                quotationsWithoutSO,
                selectedCustomer,
                selectedStatus,
                statusLabel,
                company,
                userName,
                mode: 'blob'
            }).then((res) => {
                if (active && res.blobUrl) {
                    setPdfUrl(res.blobUrl)
                }
                if (active) setLoading(false)
            }).catch((err) => {
                console.error("Failed to generate PDF preview:", err)
                if (active) setLoading(false)
            })
        }

        return () => {
            active = false
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl)
            }
        }
    }, [isOpen, rows, summary, quotationsWithoutSO, selectedCustomer, selectedStatus, statusLabel, company, userName])

    const handlePrint = async () => {
        setIsPrinting(true)
        try {
            await generateSalesMonitoringPDF({
                rows,
                summary,
                quotationsWithoutSO,
                selectedCustomer,
                selectedStatus,
                statusLabel,
                company,
                userName,
                mode: 'print'
            })
        } catch (err) {
            console.error("Print error:", err)
        } finally {
            setIsPrinting(false)
        }
    }

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            await generateSalesMonitoringPDF({
                rows,
                summary,
                quotationsWithoutSO,
                selectedCustomer,
                selectedStatus,
                statusLabel,
                company,
                userName,
                mode: 'download'
            })
        } catch (err) {
            console.error("Download error:", err)
        } finally {
            setIsDownloading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    Pratinjau Cetak PDF Monitoring Penjualan
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                        Pure jsPDF
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Format A4 Landscape · {rows.length} Dokumen Pesanan · Siap Cetak & Simpan
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={loading || isDownloading}
                                className="h-9 px-3.5 text-xs font-bold gap-1.5"
                            >
                                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Unduh File
                            </Button>
                            <Button
                                size="sm"
                                onClick={handlePrint}
                                disabled={loading || isPrinting}
                                className="h-9 px-4 text-xs font-black gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak Sekarang (Print)
                            </Button>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ml-1"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content Preview Frame */}
                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                <Loader2 size={36} className="animate-spin text-indigo-600" />
                                <p className="text-xs font-semibold tracking-wide">Menyusun dokumen PDF murni (jsPDF)...</p>
                            </div>
                        ) : pdfUrl ? (
                            <iframe
                                src={`${pdfUrl}#toolbar=0`}
                                className="w-full h-full border-0"
                                title="Sales Monitoring PDF Preview"
                            />
                        ) : (
                            <div className="text-center p-6 text-slate-500 text-sm">
                                Gagal memuat pratinjau PDF. Anda tetap dapat mengunduh atau mencetak langsung.
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-500" /> Dokumen di-render menggunakan vector engine jsPDF resolusi tinggi
                        </span>
                        <span>
                            {selectedCustomer ? `Customer: ${selectedCustomer.name}` : "Menampilkan Semua Pelanggan"}
                        </span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
