"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Receipt, Search, FileText, Calendar, Loader2, PlayCircle, Edit } from "lucide-react"
import Link from "next/link"
import EditVendorBillModal from "@/components/purchasing/EditVendorBillModal"
import VendorBillDetailModal from "@/components/purchasing/VendorBillDetailModal"
import { Eye } from "lucide-react"

interface PurchaseInvoice {
    id: string;
    number: string;
    date: string;
    status: string;
    grandTotal: number;
    vendor: { name: string; };
    purchaseOrder?: { number: string; };
}

export default function VendorBillsPage() {
    const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [postingId, setPostingId] = useState<string | null>(null)
    const [editingInvoice, setEditingInvoice] = useState<any>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [viewingInvoice, setViewingInvoice] = useState<any>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices')
            const data = await res.json()
            setInvoices(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const handlePost = async (id: string) => {
        if (!confirm('Are you sure you want to POST this Vendor Bill? This will officially create an Accounts Payable record in the General Ledger and CANNOT be undone.')) return

        setPostingId(id)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices/${id}/post`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Failed to post invoice')
            fetchInvoices()
        } catch (e) {
            alert('Failed to post invoice. Ensure System Accounts (ACCOUNTS_PAYABLE, PURCHASE_EXPENSE) are configured.')
            console.error(e)
        } finally {
            setPostingId(null)
        }
    }

    const filteredInvoices = invoices.filter(i =>
        i.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200'
            case 'POSTED': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
            case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200'
            default: return 'bg-slate-50 text-slate-700 border-slate-200'
        }
    }

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
                        <Receipt size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Vendor Bills</h1>
                        <p className="text-[10px] md:text-sm text-slate-400 font-medium mt-0.5 md:mt-1">Supplier invoices & Accounts Payable</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari Bills atau Vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                        />
                    </div>
                    <Link
                        href="/dashboard/purchasing/bills/new"
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 md:px-5 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95 whitespace-nowrap text-sm"
                    >
                        <Plus size={16} /> New Bill
                    </Link>
                </div>
            </header>

            {/* Desktop Table */}
            <main className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">Bill Number</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Vendor</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Ref PO</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right">Amount Due</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 className="animate-spin text-rose-600 mx-auto" size={32} />
                                        <p className="text-slate-500 mt-4 font-medium">Loading Bills...</p>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Receipt className="text-slate-400" size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">No Bills found</h3>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => { setViewingInvoice(inv); setIsDetailModalOpen(true) }}
                                                    className="p-1 px-2 bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <span className="font-bold font-mono text-rose-600">{inv.number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(inv.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900">{inv.vendor?.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {inv.purchaseOrder ? (
                                                <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded inline-flex">
                                                    <FileText size={12} />{inv.purchaseOrder.number}
                                                </div>
                                            ) : <span className="text-slate-400 italic text-xs">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold font-mono ${inv.status === 'PAID' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                Rp {inv.grandTotal?.toLocaleString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(inv.status)}`}>{inv.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inv.status === 'DRAFT' && (
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => { setEditingInvoice(inv); setIsEditModalOpen(true) }}
                                                        className="flex items-center gap-2 justify-center w-full px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white rounded-lg font-bold transition-all text-xs border border-slate-200">
                                                        <Edit size={14} /> Edit Bill
                                                    </button>
                                                    <button onClick={() => handlePost(inv.id)} disabled={postingId === inv.id}
                                                        className="flex items-center gap-2 justify-center w-full px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg font-bold transition-all text-xs border border-emerald-200 disabled:opacity-50">
                                                        {postingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Post GL
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-32 border border-slate-100" />)
                ) : filteredInvoices.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <Receipt size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Bills found</p>
                    </div>
                ) : filteredInvoices.map(inv => (
                    <motion.div key={inv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                        {/* Header row */}
                        <div className="flex items-start justify-between pl-2">
                            <div>
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">{inv.number}</span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar size={10} />{new Date(inv.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black border ${getStatusStyle(inv.status)}`}>{inv.status}</span>
                        </div>
                        {/* Vendor + PO ref */}
                        <div className="pl-2 flex flex-col gap-1">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vendor</p>
                                <p className="text-[13px] font-black text-slate-900">{inv.vendor?.name}</p>
                            </div>
                            {inv.purchaseOrder && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 w-fit">
                                    <FileText size={11} />{inv.purchaseOrder.number}
                                </div>
                            )}
                        </div>
                        {/* Amount + actions */}
                        <div className="pl-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount Due</p>
                                <p className={`text-sm font-black font-mono ${inv.status === 'PAID' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    Rp {inv.grandTotal?.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setViewingInvoice(inv); setIsDetailModalOpen(true) }}
                                    className="h-9 px-3 rounded-xl bg-slate-50 text-slate-600 flex items-center gap-1.5 border border-slate-200 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                    <Eye size={13} /> Detail
                                </button>
                                {inv.status === 'DRAFT' && (<>
                                    <button onClick={() => { setEditingInvoice(inv); setIsEditModalOpen(true) }}
                                        className="h-9 w-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200 active:scale-95 transition-all">
                                        <Edit size={15} />
                                    </button>
                                    <button onClick={() => handlePost(inv.id)} disabled={postingId === inv.id}
                                        className="h-9 px-3 rounded-xl bg-emerald-50 text-emerald-600 flex items-center gap-1.5 border border-emerald-200 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50">
                                        {postingId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />} Post GL
                                    </button>
                                </>)}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <EditVendorBillModal
                invoice={editingInvoice}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingInvoice(null)
                }}
                onSuccess={() => {
                    fetchInvoices()
                }}
            />

            <VendorBillDetailModal
                invoice={viewingInvoice}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setViewingInvoice(null)
                }}
            />
        </div>
    )
}
