"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Save, FileText, ArrowLeft, Loader2, Calculator, Receipt, CheckCircle2, AlertCircle, Search } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import ExpenseModal from "@/components/purchasing/ExpenseModal"

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const itemInputClass =
    "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const textareaClass =
    "min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    )
}

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
            <div className="flex h-[60vh] items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1200px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/purchasing/orders"
                            aria-label="Back to purchase orders"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Edit Purchase Order</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">Update the details of your procurement order.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setExpenseModalOpen(true)}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            <Receipt size={16} />
                            Create Expense
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Update PO
                        </button>
                    </div>
                </header>

                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`fixed right-6 top-6 z-[400] flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-lg ${
                                toast.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                        >
                            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <FileText size={16} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Order Items</h2>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
                                            <div className="mb-3 flex items-start gap-2">
                                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Product Description</label>
                                                    <SkuSelect
                                                        value={item.description}
                                                        skus={availableSkus}
                                                        onChange={code => {
                                                            const selectedSku = availableSkus.find(s => s.code === code);

                                                            setItems(items.map(i => {
                                                                if (i.id === item.id) {
                                                                    const updated = { ...i, description: code };
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
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="mt-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600 disabled:opacity-40"
                                                    disabled={items.length === 1}
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-muted-foreground">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        value={item.qty}
                                                        onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-center`}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-muted-foreground">Unit</label>
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                        className={`${itemInputClass} text-center`}
                                                        placeholder="pcs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-muted-foreground">Unit Price (Rp)</label>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-right font-mono`}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-muted-foreground">Discount (%)</label>
                                                    <input
                                                        type="number"
                                                        value={item.discount}
                                                        onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-center`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                                <div className="font-mono text-sm font-medium text-foreground">
                                                    Rp {item.amount.toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addItem}
                                    className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Plus size={16} /> Add Item
                                </button>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <h2 className="text-sm font-semibold text-foreground">Notes</h2>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="Terms & Conditions">
                                        <textarea
                                            value={poData.terms}
                                            onChange={e => setPoData({ ...poData, terms: e.target.value })}
                                            className={textareaClass}
                                            rows={3}
                                            placeholder="Payment terms, delivery requirements..."
                                        />
                                    </Field>
                                    <Field label="Internal Notes">
                                        <textarea
                                            value={poData.notes}
                                            onChange={e => setPoData({ ...poData, notes: e.target.value })}
                                            className={textareaClass}
                                            rows={3}
                                            placeholder="Internal memo..."
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-foreground">Initial Details</h2>
                                </div>
                            </div>
                            <div className="space-y-4 p-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-muted-foreground">Tipe Pembayaran</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPoData({ ...poData, paymentType: 'CREDIT' })}
                                            className={`h-9 rounded-lg border px-2 text-xs font-medium transition-colors ${
                                                poData.paymentType === 'CREDIT'
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            Tempo (Credit)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPoData({ ...poData, paymentType: 'CASH' })}
                                            className={`h-9 rounded-lg border px-2 text-xs font-medium transition-colors ${
                                                poData.paymentType === 'CASH'
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            Tunai (Cash)
                                        </button>
                                    </div>
                                </div>

                                <Field label="Status">
                                    <select
                                        value={poData.status}
                                        onChange={e => setPoData({ ...poData, status: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="SENT">Sent</option>
                                        <option value="PARTIALLY_RECEIVED">Partially Received</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </Field>

                                <Field label="Select Vendor" required>
                                    <select
                                        value={poData.vendorId}
                                        onChange={e => setPoData({ ...poData, vendorId: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Unit Bisnis / Kategori" required>
                                    <select
                                        value={poData.businessCategoryId}
                                        onChange={e => setPoData({ ...poData, businessCategoryId: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="">-- Generic / Shared --</option>
                                        {businessCategories.map(bc => (
                                            <option key={bc.id} value={bc.id}>{bc.name}</option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="PO Date">
                                    <input
                                        type="date"
                                        value={poData.date}
                                        onChange={e => setPoData({ ...poData, date: e.target.value })}
                                        className={inputClass}
                                    />
                                </Field>

                                <div className="space-y-3 border-t border-border pt-4">
                                    <Field label="Source Work Order (Opsional)">
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
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">-- No Source Work Order --</option>
                                            {workOrders.map(w => (
                                                <option key={w.id} value={w.id}>[{w.number}] {w.customer?.name}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    {poData.workOrderId && (
                                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">Linked Info</span>
                                                <div className="h-px flex-1 bg-border" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-muted-foreground">Project ID</span>
                                                    <span className="truncate font-mono text-xs text-foreground">{poData.projectId || "N/A"}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-muted-foreground">Sales Order ID</span>
                                                    <span className="truncate font-mono text-xs text-foreground">{poData.salesOrderId || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {expenses.length > 0 && (
                            <section className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                    <Receipt size={16} className="text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Related Expenses</h2>
                                </div>
                                <div className="space-y-2 p-4">
                                    {expenses.map((exp: any) => (
                                        <div key={exp.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
                                                    exp.status === 'APPROVED'
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                }`}>
                                                    <Receipt size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-medium text-foreground">{exp.category}</p>
                                                    <p className="truncate text-[11px] text-muted-foreground">{exp.description}</p>
                                                </div>
                                            </div>
                                            <div className="ml-2 flex-shrink-0 text-right">
                                                <p className="text-xs font-medium text-foreground">Rp {exp.amount.toLocaleString('id-ID')}</p>
                                                <p className={`text-[11px] font-medium ${
                                                    exp.status === 'APPROVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                                }`}>{exp.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between border-t border-border pt-3">
                                        <span className="text-xs font-medium text-muted-foreground">Total Expenses</span>
                                        <span className="text-sm font-semibold text-foreground">
                                            Rp {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <Calculator size={16} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Summary</h2>
                            </div>
                            <div className="space-y-3 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-mono text-foreground">Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">PPN/Tax</span>
                                        <input
                                            type="number"
                                            value={poData.tax}
                                            onChange={e => setPoData({ ...poData, tax: parseFloat(e.target.value) || 0 })}
                                            className="h-8 w-14 rounded-md border border-border bg-background px-1 text-center text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                    </div>
                                    <span className="font-mono text-foreground">Rp {taxAmt.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <span className="text-sm font-semibold text-foreground">Grand Total</span>
                                    <span className="font-mono text-base font-semibold text-foreground">
                                        Rp {grandTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                <div className="flex gap-2 border-t border-border pt-3">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/dashboard/purchasing/orders')}
                                        className="h-9 flex-1 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Update PO
                                    </button>
                                </div>
                            </div>
                        </section>
                    </aside>
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
        </div>
    )
}

function SkuSelect({ value, skus, onChange }: { value: string; skus: any[]; onChange: (code: string) => void }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = skus.filter(s => s.displayLabel.toLowerCase().includes(query.toLowerCase()))
    const selected = skus.find(s => s.code === value)

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={!skus.length}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            >
                <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                    {selected?.displayLabel || '-- Choose Product SKU --'}
                </span>
                <svg className="h-4 w-4 flex-shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full min-w-[320px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
                        <Search size={15} className="flex-shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Cari product / SKU..."
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No product found</div>
                        )}
                        {filtered.map(sku => (
                            <button
                                key={sku.id}
                                type="button"
                                onClick={() => { onChange(sku.code); setOpen(false); setQuery('') }}
                                className={`w-full border-b border-border px-3 py-2.5 text-left text-sm text-foreground transition-colors last:border-0 hover:bg-muted ${
                                    sku.code === value ? 'bg-muted font-medium' : ''
                                }`}
                            >
                                {sku.displayLabel}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
