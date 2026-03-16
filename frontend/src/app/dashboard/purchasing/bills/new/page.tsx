"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2, Save, FileText, ArrowLeft, Loader2, Calculator, Receipt } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function NewVendorBillForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const poIdFromQuery = searchParams.get('poId')

    const [vendors, setVendors] = useState<any[]>([])
    const [pos, setPos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [billData, setBillData] = useState({
        vendorId: '',
        purchaseOrderId: poIdFromQuery || '',
        number: '', // Can be manually entered to match physical bill
        date: new Date().toISOString().split('T')[0],
        notes: '',
        tax: 11,
        paymentType: 'CREDIT',
        receiptImage: ''
    })

    const [items, setItems] = useState([
        { id: '1', no: 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }
    ])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [venRes, poRes] = await Promise.all([
                    fetch('${process.env.NEXT_PUBLIC_API_URL}/api/vendors'),
                    fetch('${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders')
                ])
                const venData = await venRes.json()
                const poData = await poRes.json()
                setVendors(Array.isArray(venData) ? venData : [])
                setPos(Array.isArray(poData) ? poData : [])
            } catch (e) {
                console.error('Failed to fetch data')
            }
        }
        fetchData()
    }, [])

    // When PO is selected, auto-fill vendor and fetch received (receivable) items
    useEffect(() => {
        if (!billData.purchaseOrderId) return

        const fetchReceivableItems = async () => {
            setLoading(true)
            try {
                const selectedPo = pos.find(p => p.id === billData.purchaseOrderId)
                if (!selectedPo) return

                // 1. Set basic info from PO
                setBillData(prev => ({
                    ...prev,
                    vendorId: selectedPo.vendorId,
                    tax: selectedPo.tax,
                    paymentType: selectedPo.paymentType || 'CREDIT'
                }))

                // 2. Fetch specific received items from backend
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${billData.purchaseOrderId}/receivable-items`)
                const receivableItems = await res.json()

                if (Array.isArray(receivableItems) && receivableItems.length > 0) {
                    setItems(receivableItems.map((i: any) => ({
                        id: i.id || Date.now().toString() + Math.random(),
                        no: i.no,
                        description: i.description,
                        qty: i.remainingQty, // Use the calculated remaining receivable qty
                        unit: i.unit,
                        unitPrice: i.unitPrice,
                        discount: i.discount,
                        amount: i.remainingQty * i.unitPrice * (1 - (i.discount / 100))
                    })))
                } else {
                    setItems([])
                    setError("Tidak ada barang yang sudah diterima (Stock In) atau semua barang sudah ditagih untuk PO ini.")
                }
            } catch (err) {
                console.error('Failed to fetch receivable items', err)
                setError("Gagal mengambil data penerimaan barang.")
            } finally {
                setLoading(false)
            }
        }

        fetchReceivableItems()
    }, [billData.purchaseOrderId, pos])

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

    // Calculations
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
                purchaseOrderId: billData.purchaseOrderId || null,
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

            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to save Vendor Bill')

            router.push('/dashboard/purchasing/bills')
            router.refresh()
        } catch (e: any) {
            setError(e.message)
            setSubmitting(false)
        }
    }

    // Filter POs by selected vendor if vendor is selected first
    const availablePos = billData.vendorId
        ? pos.filter(p => p.vendorId === billData.vendorId && p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
        : pos.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED')

    return (
        <div className="p-8 space-y-6 w-full font-inter max-w-7xl mx-auto">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/purchasing/bills"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Record Vendor Bill</h1>
                        <p className="text-sm font-medium text-slate-500">Draft a new invoice received from a supplier.</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-70"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Bill (Draft)
                </button>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Receipt size={18} className="text-rose-600" />
                                <h2 className="font-bold text-slate-800">Billed Items</h2>
                            </div>

                            {/* Auto-fill from PO */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Copy from PO:</span>
                                <select
                                    value={billData.purchaseOrderId}
                                    onChange={e => setBillData({ ...billData, purchaseOrderId: e.target.value })}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500/20"
                                >
                                    <option value="">-- No PO Selected --</option>
                                    {availablePos.map(p => (
                                        <option key={p.id} value={p.id}>{p.number}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-4 rounded-2xl relative group">
                                    <div className="col-span-1 flex items-center justify-center p-3 text-sm font-bold text-slate-400">
                                        {index + 1}.
                                    </div>
                                    <div className="col-span-5 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20"
                                            placeholder="Billed item detail..."
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
                                                className="w-1/2 px-3 py-2 bg-white border border-slate-200 border-r-0 rounded-l-lg text-sm text-center"
                                            />
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                className="w-1/2 px-2 py-2 bg-white border border-slate-200 rounded-r-lg text-xs text-center"
                                                placeholder="pcs"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-xs text-slate-400">Rp</span>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 pt-6 text-right">
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="col-span-12 flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 font-medium">Discount (%):</span>
                                            <input
                                                type="number"
                                                value={item.discount}
                                                onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center"
                                            />
                                        </div>
                                        <div className="font-mono font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg">
                                            Rp {item.amount.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addItem}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
                        >
                            <Plus size={18} /> Add Item
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Bill Notes / Description</label>
                            <textarea
                                value={billData.notes}
                                onChange={e => setBillData({ ...billData, notes: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                rows={3}
                                placeholder="Payment instructions, references..."
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="font-bold text-slate-800 mb-4">Vendor & Dates</h2>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Vendor *</label>
                            <select
                                value={billData.vendorId}
                                onChange={e => setBillData({ ...billData, vendorId: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                                <option value="">-- Choose Vendor --</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Reference / Physical Bill No.</label>
                            <input
                                type="text"
                                value={billData.number}
                                onChange={e => setBillData({ ...billData, number: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                placeholder="Leave empty to auto-generate"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Bill Date</label>
                            <input
                                type="date"
                                value={billData.date}
                                onChange={e => setBillData({ ...billData, date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipe Pembayaran</label>
                            <select
                                value={billData.paymentType}
                                onChange={e => setBillData({ ...billData, paymentType: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                                <option value="CREDIT">CREDIT (Hutang)</option>
                                <option value="CASH">CASH (Tunai)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Upload Bon Pembelian</label>
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
                                                const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/upload', {
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
                                    id="receipt-upload"
                                />
                                <label
                                    htmlFor="receipt-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition-all group"
                                >
                                    {billData.receiptImage ? (
                                        <div className="relative w-full h-full">
                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${billData.receiptImage}`} alt="Receipt" className="w-full h-full object-cover rounded-lg" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                                <span className="text-white text-xs font-bold">Ganti Foto</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Save size={24} className="text-slate-400 group-hover:text-rose-500 mb-2" />
                                            <span className="text-xs font-bold text-slate-500 group-hover:text-rose-600">Klik untuk upload bon</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                            <Calculator size={18} className="text-emerald-600" />
                            <h2 className="font-bold text-slate-800">Summary</h2>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-mono text-slate-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="flex justify-between items-center text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span>PPN/Tax</span>
                                    <input
                                        type="number"
                                        value={billData.tax}
                                        onChange={e => setBillData({ ...billData, tax: parseFloat(e.target.value) || 0 })}
                                        className="w-14 px-1 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs"
                                    />
                                    <span>%</span>
                                </div>
                                <span className="font-mono text-slate-900">Rp {taxAmt.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-extrabold text-slate-900">Total Due</span>
                                <span className="text-xl font-black font-mono text-rose-600">
                                    Rp {grandTotal.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default function NewVendorBillPage() {
    return (
        <Suspense fallback={<div className="p-8 flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-rose-500" size={32} /></div>}>
            <NewVendorBillForm />
        </Suspense>
    )
}
