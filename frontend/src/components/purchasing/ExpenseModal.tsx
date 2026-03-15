"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number, description: string, category: string) => Promise<void>;
    title?: string;
    initialAmount?: string;
    initialDescription?: string;
}

export default function ExpenseModal({
    isOpen,
    onClose,
    onSubmit,
    title = "Request Biaya",
    initialAmount = "",
    initialDescription = ""
}: ExpenseModalProps) {
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("Operational")
    const [submitting, setSubmitting] = useState(false)

    // Reset or set initial values when modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount(initialAmount)
            setDescription(initialDescription)
        }
    }, [isOpen, initialAmount, initialDescription])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await onSubmit(Number(amount), description, category)
            setAmount("")
            setDescription("")
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"
    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm text-slate-900"

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm text-slate-900">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50/50">
                            <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">{title}</h2>
                            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-700" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={lc}>Kategori</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className={ic}>
                                    <option value="Operational">Operasional</option>
                                    <option value="Logistics">Logistik / Delivery</option>
                                    <option value="Cash Purchase">Pembelian Cash</option>
                                    <option value="Tools">Peralatan</option>
                                    <option value="Others">Lain-lain</option>
                                </select>
                            </div>
                            <div>
                                <label className={lc}>Nominal (Rp)</label>
                                <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className={ic} placeholder="0" />
                            </div>
                            <div>
                                <label className={lc}>Keperluan / Deskripsi</label>
                                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className={ic} placeholder="Jelaskan keperluan biaya ini..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11 font-bold">Batal</Button>
                                <Button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 shadow-lg shadow-indigo-600/20">
                                    {submitting ? 'Mengirim...' : 'Kirim Request'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
