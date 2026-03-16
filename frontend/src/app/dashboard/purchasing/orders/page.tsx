"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, FileText, Search, Edit2, Trash2, Calendar, Loader2, Printer, CheckCircle2, AlertCircle, X, Receipt } from "lucide-react"
import Link from "next/link"
import PurchaseOrderPDFModal from "./PurchaseOrderPDFModal"

interface PurchaseOrder {
    id: string;
    number: string;
    date: string;
    status: string;
    paymentType?: string;
    grandTotal: number;
    vendor: {
        code: string;
        name: string;
    };
    items: any[];
    receives: any[];
    surveyExpenses: any[];
    invoices: any[];
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [companyInfo, setCompanyInfo] = useState<any>({})
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [showPdf, setShowPdf] = useState(false)
    const [warehouses, setWarehouses] = useState<any[]>([])

    // Modal state for Stock-In confirmation
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; poId: string; newStatus: string; warehouseId: string } | null>(null)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const [poRes, wRes] = await Promise.all([
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders'),
                fetch('${process.env.NEXT_PUBLIC_API_URL}/api/warehouses')
            ])
            const poData = await poRes.json()
            const wData = await wRes.json()
            setOrders(Array.isArray(poData) ? poData : [])
            setWarehouses(Array.isArray(wData) ? wData.filter((w: any) => w.isActive) : [])
        } catch (e) { console.error('Failed to fetch data') } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
        // Fetch company info for PDF
        fetch('${process.env.NEXT_PUBLIC_API_URL}/api/settings/company')
            .then(res => res.json())
            .then(data => setCompanyInfo(data))
            .catch(e => console.error(e))
    }, [])

    const handlePrint = async (id: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`)
            const data = await res.json()
            setSelectedOrder(data)
            setShowPdf(true)
        } catch (e) {
            console.error('Failed to load order for PDF', e)
        }
    }

    const handleStatusUpdate = async (id: string, newStatus: string, createGRN: boolean = false, warehouseId?: string) => {
        if (newStatus === 'SENT' && !createGRN) {
            setConfirmModal({ isOpen: true, poId: id, newStatus, warehouseId: '' })
            return
        }

        if (newStatus === 'SENT' && createGRN && !warehouseId) {
            alert('Silakan pilih gudang tujuan terlebih dahulu')
            return
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, createGRN, warehouseId })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Failed to update status')
            }

            fetchOrders()
            setConfirmModal(null)
        } catch (e: any) {
            console.error(e)
            alert(e.message)
            // Re-fetch to ensure UI is in sync with backend status
            fetchOrders()
            setConfirmModal(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Purchase Order?')) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`, { method: 'DELETE' })
            fetchOrders()
        } catch (e) {
            console.error(e)
        }
    }

    const filteredOrders = orders.filter(o =>
        o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700'
            case 'APPROVED': return 'bg-blue-100 text-blue-700'
            case 'SENT': return 'bg-indigo-100 text-indigo-700'
            case 'PARTIALLY_RECEIVED': return 'bg-amber-100 text-amber-700'
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'
            case 'CANCELLED': return 'bg-rose-100 text-rose-700'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 md:max-w-screen space-y-5 md:space-y-6 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                        <FileText size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">Purchase Orders</h1>
                        <p className="text-[10px] md:text-sm text-slate-400 font-medium mt-0.5 md:mt-1">Procurement orders to vendors</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari PO atau Vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <Link
                        href="/dashboard/purchasing/orders/new"
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 md:px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap text-sm"
                    >
                        <Plus size={16} /> New PO
                    </Link>
                </div>
            </header>

            {/* Desktop Table */}
            <main className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">PO Number</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Vendor</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-bold text-slate-700 w-64">Items</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right">Grand Total</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right">Expenses</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-center">Receive Bills</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Status PO</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                        <p className="text-slate-500 mt-4 font-medium">Loading orders...</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="text-slate-400" size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">No Purchase Orders found</h3>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((po) => {
                                    const totalExpense = po.surveyExpenses?.reduce((acc, exp) => acc + exp.amount, 0) || 0;
                                    return (
                                        <tr key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold font-mono text-indigo-600">{po.number}</span>
                                                    <span className={`w-fit mt-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${po.paymentType === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {po.paymentType === 'CASH' ? 'Cash' : 'Tempo'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{po.vendor?.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{po.vendor?.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-slate-900 bg-slate-100 w-fit px-2 py-0.5 rounded-md">{po.items?.length || 0} Items</span>
                                                    {po.items && po.items.length > 0 && (
                                                        <span className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-tight">{po.items.map((i: any) => i.productName || i.description).join(', ')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold font-mono text-slate-900">Rp {po.grandTotal?.toLocaleString('id-ID')}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold font-mono ${totalExpense > 0 ? 'text-amber-600' : 'text-slate-300'}`}>Rp {totalExpense.toLocaleString('id-ID')}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {po.invoices && po.invoices.length > 0 ? (
                                                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${po.invoices[0].status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : po.invoices[0].status === 'POSTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{po.invoices[0].status}</span>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">UNBILLED</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <select value={po.status} onChange={(e) => handleStatusUpdate(po.id, e.target.value)} className={`px-3 py-1 rounded-full text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all ${getStatusStyle(po.status)}`}>
                                                    <option value="DRAFT">DRAFT</option>
                                                    <option value="APPROVED">APPROVED</option>
                                                    <option value="SENT">SENT</option>
                                                    <option value="PARTIALLY_RECEIVED">PART_RECEIVED</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="relative group/btn">
                                                        <Link href={`/dashboard/purchasing/bills/new?poId=${po.id}`} className="flex p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Receipt size={16} /></Link>
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-10">Create Bill</span>
                                                    </div>
                                                    <div className="relative group/btn">
                                                        <button onClick={() => handlePrint(po.id)} className="flex p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Printer size={16} /></button>
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-10">Print PDF</span>
                                                    </div>
                                                    <div className="relative group/btn">
                                                        <Link href={`/dashboard/purchasing/orders/${po.id}/edit`} className="flex p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit2 size={16} /></Link>
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-10">Edit PO</span>
                                                    </div>
                                                    <div className="relative group/btn flex">
                                                        <button onClick={() => handleDelete(po.id)} className="flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                        <span className="absolute -top-8 right-0 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-10">Delete PO</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-36 border border-slate-100" />)
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <FileText size={48} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Purchase Orders found</p>
                    </div>
                ) : filteredOrders.map(po => {
                    const totalExpense = po.surveyExpenses?.reduce((acc, exp) => acc + exp.amount, 0) || 0
                    const billStatus = po.invoices?.length > 0 ? po.invoices[0].status : 'UNBILLED'
                    return (
                        <motion.div key={po.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                            {/* Top row: PO number + status */}
                            <div className="flex items-start justify-between pl-2">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{po.number}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-600">
                                            {po.paymentType === 'CASH' ? 'Cash' : 'Tempo'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <select value={po.status} onChange={(e) => handleStatusUpdate(po.id, e.target.value)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black border-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all ${getStatusStyle(po.status)}`}>
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="SENT">SENT</option>
                                    <option value="PARTIALLY_RECEIVED">PART_RECEIVED</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>
                            {/* Vendor + items */}
                            <div className="pl-2 flex flex-col gap-1.5">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vendor</p>
                                    <p className="text-[13px] font-black text-slate-900">{po.vendor?.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{po.items?.length || 0} items</span>
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-widest ${billStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : billStatus === 'POSTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : billStatus === 'UNBILLED' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{billStatus}</span>
                                </div>
                            </div>
                            {/* Totals + actions */}
                            <div className="pl-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
                                    <p className="text-sm font-black text-slate-900 font-mono">Rp {po.grandTotal?.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/dashboard/purchasing/bills/new?poId=${po.id}`} className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 active:scale-95 transition-all"><Receipt size={15} /></Link>
                                    <button onClick={() => handlePrint(po.id)} className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 active:scale-95 transition-all"><Printer size={15} /></button>
                                    <Link href={`/dashboard/purchasing/orders/${po.id}/edit`} className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 active:scale-95 transition-all"><Edit2 size={15} /></Link>
                                    <button onClick={() => handleDelete(po.id)} className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 active:scale-95 transition-all"><Trash2 size={15} /></button>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <AnimatePresence>
                {confirmModal?.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                            <button
                                onClick={() => { setConfirmModal(null); fetchOrders(); }}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Otomatisasi Stock In</h3>
                                <div className="text-slate-500 font-medium">
                                    Status diubah menjadi <span className="font-bold text-indigo-600">SENT</span>. Apakah Anda ingin sistem membuatkan dokumen **Stock In** secara otomatis?
                                </div>

                                <div className="w-full text-left space-y-2 pt-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Gudang Tujuan <span className="text-rose-500">*</span></label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700"
                                        value={confirmModal.warehouseId}
                                        onChange={(e) => setConfirmModal({ ...confirmModal, warehouseId: e.target.value })}
                                    >
                                        <option value="">-- Pilih Gudang --</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button
                                    onClick={() => handleStatusUpdate(confirmModal.poId, confirmModal.newStatus, false)}
                                    className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Hanya Ubah Status
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(confirmModal.poId, confirmModal.newStatus, true, confirmModal.warehouseId)}
                                    disabled={!confirmModal.warehouseId}
                                    className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    Ya, Buat Otomatis
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-400 text-center mt-4 uppercase font-bold tracking-widest">
                                Axon Ecosystem v1.0
                            </p>
                        </motion.div>
                    </div>
                )}

                {showPdf && selectedOrder && (
                    <PurchaseOrderPDFModal
                        order={selectedOrder}
                        company={companyInfo}
                        onClose={() => setShowPdf(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
