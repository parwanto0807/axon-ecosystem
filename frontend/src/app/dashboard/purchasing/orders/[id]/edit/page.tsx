"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Trash2, Save, FileText, ArrowLeft, Loader2, Calculator, Receipt, CheckCircle2, AlertCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence } from "framer-motion"
import ExpenseModal from "@/components/purchasing/ExpenseModal"

export default function EditPurchaseOrderPage() {
    const router = useRouter()
    const { id } = useParams()

    const [vendors, setVendors] = useState<any[]>([])
    const [availableSkus, setAvailableSkus] = useState<any[]>([])
    const [workOrders, setWorkOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [poData, setPoData] = useState({
        vendorId: '',
        workOrderId: '',
        projectId: '',
        salesOrderId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        terms: '',
        tax: 11,
        status: 'DRAFT',
        paymentType: 'CREDIT',
        businessCategoryId: ''
    })

    const [items, setItems] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])
    const [expenseModalOpen, setExpenseModalOpen] = useState(false)
    const [businessCategories, setBusinessCategories] = useState<any[]>([])
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [venRes, skuRes, poRes, woRes, bcRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-skus`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
                ])
                const venData = await venRes.json()
                const skuData = await skuRes.json()
                const poJson = await poRes.json()
                const woData = await woRes.json()
                const bcData = await bcRes.json()

                setVendors(Array.isArray(venData) ? venData : [])
                setWorkOrders(Array.isArray(woData) ? woData : [])
                setBusinessCategories(Array.isArray(bcData) ? bcData : [])

                const skusArr = Array.isArray(skuData) ? skuData : [];
                const formattedSkus = skusArr.map(s => ({
                    ...s,
                    productName: s.product?.name || s.name || '',
                    displayLabel: `[${s.code}] ${s.product?.name || s.name || ''} ${s.name ? '- ' + s.name : ''}`.trim()
                }))
                setAvailableSkus(formattedSkus)

                if (poJson && poJson.id) {
                    setPoData({
                        vendorId: poJson.vendorId || '',
                        workOrderId: poJson.workOrderId || '',
                        projectId: poJson.projectId || '',
                        salesOrderId: poJson.salesOrderId || '',
                        date: poJson.date ? new Date(poJson.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        notes: poJson.notes || '',
                        terms: poJson.terms || '',
                        tax: poJson.tax !== undefined ? poJson.tax : 11,
                        status: poJson.status || 'DRAFT',
                        paymentType: poJson.paymentType || 'CREDIT',
                        businessCategoryId: poJson.businessCategoryId || ''
                    })
                    if (poJson.items && poJson.items.length > 0) {
                        setItems(poJson.items.map((i: any) => ({
                            id: i.id || Date.now().toString() + Math.random(),
                            no: i.no,
                            description: i.description,
                            qty: i.qty,
                            unit: i.unit,
                            unitPrice: i.unitPrice,
                            discount: i.discount,
                            amount: i.amount
                        })))
                    } else {
                        setItems([{ id: '1', no: 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }])
                    }
                    if (poJson.surveyExpenses) {
                        setExpenses(poJson.surveyExpenses)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch data')
                setError('Failed to load Purchase Order details.')
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchData()
    }, [id])

    const handleItemChange = (itemId: string, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const updated = { ...item, [field]: value }
                // Auto calculate amount
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

    const removeItem = (itemId: string) => {
        if (items.length === 1) return
        const newItems = items.filter(i => i.id !== itemId).map((item, index) => ({ ...item, no: index + 1 }))
        setItems(newItems)
    }

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmt = subtotal * (poData.tax / 100)
    const grandTotal = subtotal + taxAmt

    const handleSubmit = async () => {
        if (!poData.vendorId) {
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
                ...poData,
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

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to update Purchase Order')

            router.push('/dashboard/purchasing/orders')
            router.refresh()
        } catch (e: any) {
            setError(e.message)
            setSubmitting(false)
        }
    }

    const handleCreateExpense = async (amount: number, description: string, category: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount, 
                    description, 
                    category,
                    projectId: poData.projectId,
                    workOrderId: poData.workOrderId
                })
            })
            if (res.ok) {
                setToast({ type: 'success', msg: 'Expense request created successfully!' })
                setTimeout(() => setToast(null), 3000)
            } else {
                throw new Error('Failed to create expense request')
            }
        } catch (e: any) {
            setToast({ type: 'error', msg: e.message })
            setTimeout(() => setToast(null), 3000)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6 w-full font-inter max-w-7xl mx-auto">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/purchasing/orders"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Purchase Order</h1>
                        <p className="text-sm font-medium text-slate-500">Update the details of your procurement order.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setExpenseModalOpen(true)}
                        className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Receipt size={18} />
                        Create Expense
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-70"
                    >
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Update PO
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-sm font-bold">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                            <FileText size={18} className="text-indigo-600" />
                            <h2 className="font-bold text-slate-800">Order Items</h2>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-4 rounded-2xl relative group">
                                    <div className="col-span-1 flex items-center justify-center p-3 text-sm font-bold text-slate-400">
                                        {index + 1}.
                                    </div>
                                    <div className="col-span-5 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Product Description</label>
                                        <select
                                            value={item.description}
                                            onChange={e => {
                                                const selectedSkuCode = e.target.value;
                                                const selectedSku = availableSkus.find(s => s.code === selectedSkuCode);

                                                setItems(items.map(i => {
                                                    if (i.id === item.id) {
                                                        const updated = { ...i, description: selectedSkuCode || e.target.value };
                                                        if (selectedSku) {
                                                            updated.unitPrice = selectedSku.purchasePrice || selectedSku.salePrice || 0;
                                                            if (selectedSku.unit?.name) {
                                                                updated.unit = selectedSku.unit.name;
                                                            } else if (selectedSku.purchaseUnit?.name) {
                                                                updated.unit = selectedSku.purchaseUnit.name;
                                                            }
                                                            const sub = updated.qty * updated.unitPrice;
                                                            const disc = (sub * (updated.discount / 100));
                                                            updated.amount = sub - disc;
                                                        }
                                                        return updated;
                                                    }
                                                    return i;
                                                }));
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="">-- Choose Product SKU --</option>
                                            {/* We also render the current description if it's not in the sku list (legacy support) */}
                                            {item.description && !availableSkus.find(s => s.code === item.description) && (
                                                <option value={item.description}>{item.description}</option>
                                            )}
                                            {availableSkus.map(sku => (
                                                <option key={sku.id} value={sku.code}>{sku.displayLabel}</option>
                                            ))}
                                        </select>
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
                                        <div className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                                            Rp {item.amount.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addItem}
                            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                        >
                            <Plus size={18} /> Add Item
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Terms & Conditions</label>
                                <textarea
                                    value={poData.terms}
                                    onChange={e => setPoData({ ...poData, terms: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    rows={3}
                                    placeholder="Payment terms, delivery requirements..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Internal Notes</label>
                                <textarea
                                    value={poData.notes}
                                    onChange={e => setPoData({ ...poData, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    rows={3}
                                    placeholder="Internal memo..."
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-slate-800">Initial Details</h2>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipe Pembayaran</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPoData({ ...poData, paymentType: 'CREDIT' })}
                                    className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${poData.paymentType === 'CREDIT'
                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                        }`}
                                >
                                    Tempo (Credit)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPoData({ ...poData, paymentType: 'CASH' })}
                                    className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${poData.paymentType === 'CASH'
                                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                                        }`}
                                >
                                    Tunai (Cash)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <select
                                value={poData.status}
                                onChange={e => setPoData({ ...poData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="APPROVED">Approved</option>
                                <option value="SENT">Sent</option>
                                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Select Vendor *</label>
                            <select
                                value={poData.vendorId}
                                onChange={e => setPoData({ ...poData, vendorId: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            >
                                <option value="">-- Choose Vendor --</option>
                                {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase italic text-violet-600">Unit Bisnis / Kategori *</label>
                            <select
                                value={poData.businessCategoryId}
                                onChange={e => setPoData({ ...poData, businessCategoryId: e.target.value })}
                                className="w-full px-4 py-3 bg-violet-50/30 border border-violet-100 rounded-xl font-bold text-violet-700"
                            >
                                <option value="">-- Generic / Shared --</option>
                                {businessCategories.map(bc => (
                                    <option key={bc.id} value={bc.id}>{bc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">PO Date</label>
                            <input
                                type="date"
                                value={poData.date}
                                onChange={e => setPoData({ ...poData, date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                            />
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase italic text-indigo-600">Source Work Order (Opsional)</label>
                                <select
                                    value={poData.workOrderId}
                                    onChange={e => {
                                        const woId = e.target.value;
                                        const wo = workOrders.find(w => w.id === woId);
                                        setPoData({
                                            ...poData,
                                            workOrderId: woId,
                                            projectId: wo?.projectId || '',
                                            salesOrderId: wo?.salesOrderId || ''
                                        });
                                    }}
                                    className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl font-bold text-indigo-700"
                                >
                                    <option value="">-- No Source Work Order --</option>
                                    {workOrders.map(w => (
                                        <option key={w.id} value={w.id}>[{w.number}] {w.customer?.name}</option>
                                    ))}
                                </select>
                            </div>

                            {poData.workOrderId && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Linked Info</span>
                                        <div className="h-px bg-slate-200 flex-1 ml-3"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Project ID</span>
                                            <span className="text-xs font-mono font-bold text-slate-600 truncate">{poData.projectId || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Sales Order ID</span>
                                            <span className="text-xs font-mono font-bold text-slate-600 truncate">{poData.salesOrderId || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {expenses.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                <Receipt size={18} className="text-amber-600" />
                                <h2 className="font-bold text-slate-800">Related Expenses</h2>
                            </div>
                            <div className="space-y-3">
                                {expenses.map((exp: any) => (
                                    <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                <Receipt size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{exp.category}</p>
                                                <p className="text-xs text-slate-500">{exp.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">Rp {exp.amount.toLocaleString('id-ID')}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${exp.status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`}>{exp.status}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center px-2">
                                    <span className="text-sm font-bold text-slate-500">Total Expenses</span>
                                    <span className="font-black text-rose-600">Rp {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    )}

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
                                        value={poData.tax}
                                        onChange={e => setPoData({ ...poData, tax: parseFloat(e.target.value) || 0 })}
                                        className="w-14 px-1 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs"
                                    />
                                    <span>%</span>
                                </div>
                                <span className="font-mono text-slate-900">Rp {taxAmt.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-extrabold text-slate-900">Grand Total</span>
                                <span className="text-xl font-black font-mono text-indigo-600">
                                    Rp {grandTotal.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <ExpenseModal
                isOpen={expenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                onSubmit={handleCreateExpense}
                initialAmount={grandTotal.toString()}
                initialDescription={`Pembelian ${items.map(i => {
                    const sku = availableSkus.find(s => s.code === i.description);
                    return sku ? sku.productName : i.description;
                }).filter(d => d).join(", ")}`}
            />
        </div>
    )
}
