"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, FileText, Calendar, Receipt, Calculator, Building2, CreditCard, ExternalLink } from "lucide-react"

interface VendorBillDetailModalProps {
    invoice: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function VendorBillDetailModal({ invoice, isOpen, onClose }: VendorBillDetailModalProps) {
    if (!isOpen || !invoice) return null

    const subtotal = invoice.items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0
    const taxAmt = invoice.taxAmt || 0
    const grandTotal = invoice.grandTotal || 0

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <header className="p-8 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-rose-600 flex items-center justify-center text-white shadow-xl shadow-rose-600/20">
                                <Receipt size={32} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{invoice.number}</h2>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${invoice.status === 'POSTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                        {invoice.status}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Vendor Bill Detail</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
                        >
                            <X size={28} />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Left Column: Details & Items */}
                            <div className="lg:col-span-2 space-y-10">
                                {/* Info Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                                            <Building2 size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Vendor</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900">{invoice.vendor?.name || 'Unknown Vendor'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                                            <Calendar size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Date</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900">
                                            {new Date(invoice.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                                            <CreditCard size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Payment Type</span>
                                        </div>
                                        <p className="text-lg font-black text-rose-600">{invoice.paymentType || 'CREDIT'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3 mb-4 text-slate-400">
                                            <FileText size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Ref PO</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900">{invoice.purchaseOrder?.number || '-'}</p>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                            <FileText size={16} />
                                        </div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Billed Items</h3>
                                    </div>
                                    <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500">
                                                <tr>
                                                    <th className="px-6 py-4 font-black uppercase tracking-tighter text-[10px]">Description</th>
                                                    <th className="px-6 py-4 font-black uppercase tracking-tighter text-[10px] text-center">Qty</th>
                                                    <th className="px-6 py-4 font-black uppercase tracking-tighter text-[10px] text-right">Unit Price</th>
                                                    <th className="px-6 py-4 font-black uppercase tracking-tighter text-[10px] text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 bg-white">
                                                {invoice.items?.map((item: any, idx: number) => (
                                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-slate-900">{item.description}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="font-black text-slate-600">{item.qty} {item.unit}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-mono text-slate-500">Rp {item.unitPrice?.toLocaleString('id-ID')}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-black text-slate-900">Rp {item.amount?.toLocaleString('id-ID')}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Notes */}
                                {invoice.notes && (
                                    <div className="bg-amber-50/50 p-8 rounded-[2rem] border border-amber-100">
                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3">Notes & Observations</h4>
                                        <p className="text-slate-600 font-medium leading-relaxed">{invoice.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Receipt & Summary */}
                            <div className="space-y-8">
                                {/* Receipt Image Preview */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                                <Receipt size={14} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Bon Pembelian</span>
                                        </div>
                                        {invoice.receiptImage && (
                                            <button
                                                onClick={() => window.open(`http://localhost:5000${invoice.receiptImage}`, '_blank')}
                                                className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-rose-600"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="aspect-[3/4] rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden group/receipt">
                                        {invoice.receiptImage ? (
                                            <img
                                                src={`http://localhost:5000${invoice.receiptImage}`}
                                                alt="Receipt"
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/receipt:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
                                                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                                                    <Receipt size={32} />
                                                </div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Receipt Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20">
                                    <div className="flex items-center gap-3 mb-8 opacity-50">
                                        <Calculator size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Financial Summary</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center opacity-60">
                                            <span className="text-sm font-bold uppercase tracking-tighter">Subtotal</span>
                                            <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between items-center opacity-60">
                                            <span className="text-sm font-bold uppercase tracking-tighter">PPN ({invoice.tax || 11}%)</span>
                                            <span className="font-mono">Rp {taxAmt.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="h-px bg-white/10 my-6" />
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total Payable</p>
                                                <p className="text-sm font-bold opacity-60 uppercase tracking-tighter leading-none text-rose-400">Net Amount</p>
                                            </div>
                                            <p className="text-3xl font-black font-mono tracking-tighter text-rose-400">
                                                Rp {grandTotal.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
