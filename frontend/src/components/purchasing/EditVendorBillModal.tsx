"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Trash2, Save, FileText, Loader2, Calculator, Receipt } from "lucide-react"

interface EditVendorBillModalProps {
    invoice: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditVendorBillModal({ invoice, isOpen, onClose, onSuccess }: EditVendorBillModalProps) {
    const [vendors, setVendors] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [billData, setBillData] = useState({
        vendorId: '',
        purchaseOrderId: '',
        number: '',
        date: '',
        notes: '',
        tax: 11,
        paymentType: 'CREDIT',
        receiptImage: ''
    })

    const [items, setItems] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && invoice) {
            setBillData({
                vendorId: invoice.vendorId || '',
                purchaseOrderId: invoice.purchaseOrderId || '',
                number: invoice.number || '',
                date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '',
                notes: invoice.notes || '',
                tax: invoice.tax || 11,
                paymentType: invoice.paymentType || 'CREDIT',
                receiptImage: invoice.receiptImage || ''
            })
            setItems(invoice.items?.map((it: any) => ({
                id: it.id,
                no: it.no,
                description: it.description,
                qty: it.qty,
                unit: it.unit,
                unitPrice: it.unitPrice,
                discount: it.discount,
                amount: it.amount
            })) || [])
            fetchVendors()
        }
    }, [isOpen, invoice])

    const fetchVendors = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`)
            const data = await res.json()
            setVendors(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error('Failed to fetch vendors')
        }
    }

    const handleItemChange = (id: string, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }
                if (field === 'qty' || field === 'unitPrice' || field === 'discount') {
                    const sub = updated.qty * updated.unitPrice
                    const disc = (sub * (updated.discount / 100))
                    updated.amount = sub - disc
                }
                return updated
            }
            return item
        }))
    }

    const addItem = () => {
        setItems([
            ...items,
            { id: Date.now().toString(), no: items.length + 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }
        ])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return
        const newItems = items.filter(i => i.id !== id).map((item, index) => ({ ...item, no: index + 1 }))
        setItems(newItems)
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmt = subtotal * (billData.tax / 100)
    const grandTotal = subtotal + taxAmt

    const handleSubmit = async () => {
        if (!billData.vendorId) {
            setError("Please select a vendor")
            return
        }

        const emptyItems = items.some(i => !i.description.trim())
        if (emptyItems) {
            setError("Please fill in all item descriptions")
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            const payload = {
                ...billData,
                subtotal,
                taxAmt,
                grandTotal,
                items: items.map(i => ({
                    no: i.no,
                    description: i.description,
                    qty: i.qty,
                    unit: i.unit,
                    unitPrice: i.unitPrice,
                    discount: i.discount,
                    amount: i.amount
                }))
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices/${invoice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to update Vendor Bill')

            onSuccess()
            onClose()
        } catch (e: any) {
            setError(e.message)
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm shadow-2xl overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <header className="p-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <Receipt size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Vendor Bill</h2>
                                <p className="text-sm font-medium text-slate-500">Modify draft invoice {billData.number}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-bold flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
                                        <FileText size={18} className="text-rose-600" />
                                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Billed Items</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {items.map((item, index) => (
                                            <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-4 rounded-2xl relative group border border-transparent hover:border-slate-200 transition-all">
                                                <div className="col-span-1 flex items-center justify-center p-3 text-sm font-bold text-slate-300">
                                                    {index + 1}.
                                                </div>
                                                <div className="col-span-5 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20 transition-all"
                                                        placeholder="Item detail..."
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Qty & Unit</label>
                                                    <div className="flex">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="0.01"
                                                            value={item.qty}
                                                            onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                            className="w-1/2 px-3 py-2 bg-white border border-slate-200 border-r-0 rounded-l-lg text-sm text-center font-bold"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                            className="w-1/2 px-2 py-2 bg-white border border-slate-200 rounded-r-lg text-xs text-center text-slate-500"
                                                            placeholder="pcs"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-1 pt-6 text-right">
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                        disabled={items.length === 1}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="col-span-12 flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-200/50">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-500 font-bold uppercase tracking-tighter text-[10px]">Discount (%):</span>
                                                        <input
                                                            type="number"
                                                            value={item.discount}
                                                            onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                                                        />
                                                    </div>
                                                    <div className="font-mono font-black text-rose-700 bg-rose-50 px-4 py-1.5 rounded-xl border border-rose-100 shadow-sm">
                                                        Rp {item.amount.toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={addItem}
                                        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-black hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all active:scale-[0.99]"
                                    >
                                        <Plus size={18} /> Add New Item
                                    </button>
                                </section>

                                <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Bill Notes / Description</label>
                                    <textarea
                                        value={billData.notes}
                                        onChange={e => setBillData({ ...billData, notes: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-rose-500/20 transition-all font-medium"
                                        rows={3}
                                        placeholder="Add any specific instructions or references here..."
                                    />
                                </section>
                            </div>

                            <div className="space-y-8">
                                <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-100 pb-4">Vendor & Dates</h3>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Vendor *</label>
                                        <select
                                            value={billData.vendorId}
                                            onChange={e => setBillData({ ...billData, vendorId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-rose-500/20"
                                        >
                                            <option value="">-- Choose Vendor --</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Reference (PI No.)</label>
                                        <input
                                            type="text"
                                            value={billData.number}
                                            disabled
                                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-bold font-mono text-slate-500 cursor-not-allowed uppercase"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bill Date</label>
                                        <input
                                            type="date"
                                            value={billData.date}
                                            onChange={e => setBillData({ ...billData, date: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipe Pembayaran</label>
                                        <select
                                            value={billData.paymentType}
                                            onChange={e => setBillData({ ...billData, paymentType: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-2 focus:ring-rose-500/20 text-rose-600"
                                        >
                                            <option value="CREDIT">CREDIT (Hutang)</option>
                                            <option value="CASH">CASH (Tunai)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bon Pembelian</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        const formData = new FormData()
                                                        formData.append('file', file)
                                                        try {
                                                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
                                                                method: 'POST',
                                                                body: formData
                                                            })
                                                            const data = await res.json()
                                                            setBillData({ ...billData, receiptImage: data.url })
                                                        } catch (err) {
                                                            console.error('Upload failed')
                                                        }
                                                    }
                                                }}
                                                className="hidden"
                                                id="edit-receipt-upload"
                                            />
                                            <label
                                                htmlFor="edit-receipt-upload"
                                                className="flex flex-col items-center justify-center w-full h-40 px-4 py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-rose-50 hover:border-rose-300 transition-all group"
                                            >
                                                {billData.receiptImage ? (
                                                    <div className="relative w-full h-full">
                                                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${billData.receiptImage}`} alt="Receipt" className="w-full h-full object-cover rounded-2xl" />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                                                            <span className="text-white text-[10px] font-black uppercase tracking-widest bg-rose-600 px-3 py-1 rounded-lg shadow-lg">Ganti Foto</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 transition-all mb-2">
                                                            <Save size={24} className="text-slate-400 group-hover:text-rose-500" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-500 group-hover:text-rose-600 uppercase tracking-tighter">Klik untuk upload bon</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                        <Calculator size={18} className="text-emerald-600" />
                                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Final Summary</h3>
                                    </div>

                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between text-slate-500 font-bold">
                                            <span>Subtotal</span>
                                            <span className="font-mono text-slate-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-slate-500 font-bold">
                                            <div className="flex items-center gap-2">
                                                <span>Tax</span>
                                                <input
                                                    type="number"
                                                    value={billData.tax}
                                                    onChange={e => setBillData({ ...billData, tax: parseFloat(e.target.value) || 0 })}
                                                    className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-black text-rose-600"
                                                />
                                                <span>%</span>
                                            </div>
                                            <span className="font-mono text-slate-900">Rp {taxAmt.toLocaleString('id-ID')}</span>
                                        </div>

                                        <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Due</span>
                                                <span className="font-black text-slate-900 text-lg leading-tight">Net Pay</span>
                                            </div>
                                            <span className="text-2xl font-black font-mono text-rose-600 tracking-tighter">
                                                Rp {grandTotal.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>

                    <footer className="p-6 bg-white border-t border-slate-200 flex items-center justify-end gap-4 sticky bottom-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-50 rounded-2xl transition-all"
                        >
                            Cancel Changes
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 bg-rose-600 text-white px-10 py-3 rounded-2xl font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 disabled:opacity-70 active:scale-[0.98]"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Update Bill
                        </button>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
