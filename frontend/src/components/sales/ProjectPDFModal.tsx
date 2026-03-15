"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Printer, Loader2 } from "lucide-react"

interface ProjectPDFModalProps {
    isOpen: boolean
    onClose: () => void
    project: any
    stats: any
    companyProfile?: any
}

export default function ProjectPDFModal({ isOpen, onClose, project, companyProfile, stats }: ProjectPDFModalProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isOpen || !project || !stats) return

        let url: string | null = null

        const generatePDF = async () => {
            setLoading(true)
            try {
                // Dynamically import to avoid SSR issues with jsPDF
                const { generateProjectPDF } = await import("./ProjectPDFReport")
                
                // Modify the generator to return Blob instead of saving directly
                // We'll pass a flag 'preview' to tell the utility to output a blob
                const blob = await generateProjectPDF(project, stats, companyProfile, true) as Blob
                
                if (blob) {
                    url = URL.createObjectURL(blob)
                    setPdfUrl(url)
                }
            } catch (error) {
                console.error("Failed to generate PDF preview:", error)
            } finally {
                setLoading(false)
            }
        }

        generatePDF()

        return () => {
            if (url) URL.revokeObjectURL(url)
        }
    }, [isOpen, project, stats])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                >
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200">
                                {project?.number}
                            </span>
                            <span className="text-slate-500 text-sm font-medium">{project?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    const { generateProjectPDF } = await import("./ProjectPDFReport")
                                    generateProjectPDF(project, stats, companyProfile, false) // false = download
                                }}
                                disabled={loading}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 flex items-center text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                <Download size={13} className="mr-2" />
                                {loading ? 'Generating...' : 'Download PDF'}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-500"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-100/50 p-0 overflow-hidden relative">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                                <p className="text-sm font-bold text-slate-500 animate-pulse">Generating Report Preview...</p>
                            </div>
                        ) : pdfUrl ? (
                            <iframe
                                src={`${pdfUrl}#toolbar=0&view=FitH`}
                                className="w-full h-full border-0"
                                title="Project Financial Report Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                                Failed to generate PDF preview.
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
