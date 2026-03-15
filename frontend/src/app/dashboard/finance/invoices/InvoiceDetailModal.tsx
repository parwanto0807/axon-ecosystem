import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Receipt, Printer, Calendar, User, Briefcase, FileText, Send, DollarSign, Clock, Ban, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InvoiceItem { 
    no: number; description: string; qty: number; unit: string; 
    unitPrice: number; discount: number; amount: number 
}

interface Invoice {
    id: string; number: string; date: string; dueDate?: string; status: string;
    customerId: string; customer: { name: string; code: string; address?: string };
    projectId?: string; project?: { number: string; name: string };
    contract?: { number: string; subject: string };
    salesOrder?: { number: string };
    deliveryOrder?: { number: string };
    bankAccount?: { bankName: string; accountNumber: string; accountHolder: string };
    signerName?: string; signerPosition?: string;
    currency: string; subtotal: number; tax: number; discount: number;
    discountAmt: number; taxAmt: number; grandTotal: number;
    notes?: string; paymentTerms?: string;
    items: InvoiceItem[];
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
    POSTED: { label: 'Posted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Send },
    SENT: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
    PAID: { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    OVERDUE: { label: 'Overdue', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through', icon: Ban },
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

import { CheckCircle2 } from "lucide-react"

export default function InvoiceDetailModal({ invoice, onClose, onPrint }: { invoice: Invoice; onClose: () => void; onPrint?: () => void }) {
    const s = STATUS_CFG[invoice.status] || STATUS_CFG.DRAFT
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`bg-white w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col ${isMobile ? 'rounded-t-[2.5rem] mt-auto' : 'rounded-[2.5rem] max-w-4xl border border-white/20'}`}
            >
                {isMobile && <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />}
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
                            <Receipt className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">
                                    Detail Invoice
                                </h2>
                                <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${s.color}`}>
                                    <s.icon size={12} />
                                    {s.label}
                                </div>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground mt-0.5 tracking-tight">{invoice.number} — {fmtDate(invoice.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onPrint && (
                            <Button variant="outline" size="sm" onClick={onPrint} className="h-10 rounded-xl font-bold gap-2">
                                <Printer size={16} /> PRINT PDF
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 hover:bg-white hover:shadow-md transition-all">
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    {/* Top Row: Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <User size={12} /> Customer
                            </p>
                            <div>
                                <p className="font-black text-slate-900">{invoice.customer.name}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">{invoice.customer.address || 'Alamat tidak tersedia'}</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Calendar size={12} /> Timeline
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Tanggal Invoice</span>
                                    <span className="text-xs font-black text-slate-900">{fmtDate(invoice.date)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Jatuh Tempo</span>
                                    <span className={`text-xs font-black ${new Date(invoice.dueDate || '') < new Date() && invoice.status !== 'PAID' ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {fmtDate(invoice.dueDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Briefcase size={12} /> Referensi
                            </p>
                            <div className="space-y-2">
                                {invoice.contract && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">Contract</span>
                                        <span className="text-xs font-black text-indigo-600 truncate">{invoice.contract.number}</span>
                                    </div>
                                )}
                                {invoice.project && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">Project</span>
                                        <span className="text-xs font-black text-emerald-600 truncate">{invoice.project.number}</span>
                                    </div>
                                )}
                                {invoice.salesOrder && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">SO</span>
                                        <span className="text-xs font-black text-blue-600 truncate">{invoice.salesOrder.number}</span>
                                    </div>
                                )}
                                {invoice.deliveryOrder && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">DO/BAST</span>
                                        <span className="text-xs font-black text-indigo-600 truncate">{invoice.deliveryOrder.number}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                            <FileText size={14} /> Baris Tagihan
                        </h3>
                        <div className="rounded-[2rem] border border-slate-100 overflow-hidden bg-slate-50/30">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16 text-center">No</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Item / Layanan</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Harga Satuan</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.items.map((it, idx) => (
                                        <tr key={idx} className="bg-white/50 group hover:bg-white transition-colors">
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{it.no}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900 leading-relaxed">{it.description}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <p className="text-sm font-bold text-slate-700">{it.qty} <span className="text-[10px] text-slate-400 uppercase tracking-widest">{it.unit}</span></p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-bold text-slate-700">{fmt(it.unitPrice)}</p>
                                                {it.discount > 0 && <p className="text-[10px] font-black text-rose-500 uppercase">Disc {it.discount}%</p>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-emerald-600">{fmt(it.amount)}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Row: Notes & Payment Info + Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                        <div className="space-y-6">
                            {/* Payment Info */}
                            {invoice.bankAccount ? (
                                <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-600/10 space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                        <DollarSign size={12} /> Informasi Pembayaran
                                    </p>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{invoice.bankAccount.bankName}</p>
                                        <p className="text-lg font-black text-slate-900 mt-1 tracking-tight">{invoice.bankAccount.accountNumber}</p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">A/N: {invoice.bankAccount.accountHolder}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 italic text-center">Informasi rekening pembayaran tidak dicantumkan.</p>
                                </div>
                            )}

                            {/* Notes */}
                            {invoice.paymentTerms && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Syarat & Ketentuan Pembayaran</p>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed italic whitespace-pre-wrap shadow-inner">
                                        {invoice.paymentTerms}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Totals Box */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col justify-center space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium text-slate-400 uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>{fmt(invoice.subtotal)}</span>
                            </div>
                            {invoice.discountAmt > 0 && (
                                <div className="flex justify-between items-center text-sm font-medium text-rose-400 uppercase tracking-widest">
                                    <span>Discount ({invoice.discount}%)</span>
                                    <span>- {fmt(invoice.discountAmt)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm font-medium text-indigo-400 uppercase tracking-widest border-b border-white/10 pb-4">
                                <span>PPN ({invoice.tax}%)</span>
                                <span>+ {fmt(invoice.taxAmt)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 leading-none">Grand Total</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Tagihan Terhutang</p>
                                </div>
                                <p className="text-3xl font-black tracking-tighter text-white">{fmt(invoice.grandTotal)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        {invoice.signerName && (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Signed by <span className="text-slate-900 font-extrabold">{invoice.signerName}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="h-12 rounded-2xl px-8 font-bold text-slate-500 hover:bg-white hover:shadow-md transition-all">
                            Tutup Detail
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
