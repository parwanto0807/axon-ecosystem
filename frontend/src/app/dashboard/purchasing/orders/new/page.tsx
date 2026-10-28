"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { Plus, Trash2, Save, FileText, ArrowLeft, Loader2, Search, Calculator, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const itemInputClass =
    "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const textareaClass =
    "min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

function Field({
    label,
    children,
    className = "",
}: {
    label: string
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-muted-foreground">{label}</label>
            {children}
        </div>
    )
}

export default function NewPurchaseOrderPage() {
    const router = useRouter()

    const [vendors, setVendors] = useState<any[]>([])
    const [availableSkus, setAvailableSkus] = useState<any[]>([])
    const [workOrders, setWorkOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
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
        paymentType: 'CREDIT',
        businessCategoryId: ''
    })

    const [items, setItems] = useState([
        { id: '1', no: 1, description: '', qty: 1, unit: 'pcs', unitPrice: 0, discount: 0, amount: 0 }
    ])
    const [expenses, setExpenses] = useState<any[]>([])
    const [businessCategories, setBusinessCategories] = useState<any[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [venRes, skuRes, woRes, bcRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-skus`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
                ])
                const venData = await venRes.json()
                const skuData = await skuRes.json()
                const woData = await woRes.json()
                const bcData = await bcRes.json()
                setVendors(Array.isArray(venData) ? venData : [])
                setWorkOrders(Array.isArray(woData) ? woData : [])
                setBusinessCategories(Array.isArray(bcData) ? bcData : [])

                // SKUs come perfectly formatted from /api/product-skus
                const skusArr = Array.isArray(skuData) ? skuData : [];
                const formattedSkus = skusArr.map(s => ({
                    ...s,
                    productName: s.product?.name || s.name || '',
                    displayLabel: `[${s.code}] ${s.product?.name || s.name || ''} ${s.name ? '- ' + s.name : ''}`.trim()
                }))
                setAvailableSkus(formattedSkus)
            } catch (e) {
                console.error('Failed to fetch data')
            }
        }
        fetchData()
    }, [])

    const handleItemChange = (id: string, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
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

    const removeItem = (id: string) => {
        if (items.length === 1) return
        const newItems = items.filter(i => i.id !== id).map((item, index) => ({ ...item, no: index + 1 }))
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

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to create Purchase Order')

            router.push('/dashboard/purchasing/orders')
            router.refresh()
        } catch (e: any) {
            setError(e.message)
            setSubmitting(false)
        }
    }

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1200px]">
                <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/purchasing/orders"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Create Purchase Order</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">Draft a new order to your supplier.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled
                            title="Save PO first to create expenses"
                            className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground opacity-60"
                        >
                            <Receipt size={16} />
                            Create Expense
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Create PO
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-rose-600">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
                    {/* Main column */}
                    <div className="space-y-4">
                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <FileText size={15} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Order Items</h2>
                            </div>
                            <div className="space-y-3 p-4">
                                {items.map((item, index) => (
                                    <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Item {index + 1}
                                            </span>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                disabled={items.length === 1}
                                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                                title="Remove item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <Field label="Product Description">
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
                                            </Field>

                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                <Field label="Qty">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        value={item.qty}
                                                        onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-center`}
                                                    />
                                                </Field>
                                                <Field label="Unit">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                        className={`${itemInputClass} text-center`}
                                                        placeholder="pcs"
                                                    />
                                                </Field>
                                                <Field label="Unit Price (Rp)">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-right`}
                                                    />
                                                </Field>
                                                <Field label="Discount (%)">
                                                    <input
                                                        type="number"
                                                        value={item.discount}
                                                        onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                        className={`${itemInputClass} text-center`}
                                                    />
                                                </Field>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-border pt-2">
                                                <span className="text-xs text-muted-foreground">Amount</span>
                                                <span className="text-sm font-medium tabular-nums text-foreground">
                                                    Rp {item.amount.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addItem}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    <Plus size={15} /> Add Item
                                </button>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <h2 className="text-sm font-semibold text-foreground">Notes</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
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
                        </section>

                        {expenses.length > 0 && (
                            <section className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                    <Receipt size={15} className="text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Related Expenses</h2>
                                </div>
                                <div className="space-y-2 p-4">
                                    {expenses.map((exp: any) => (
                                        <div
                                            key={exp.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                    <Receipt size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-foreground">{exp.category}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{exp.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-sm font-medium tabular-nums text-foreground">
                                                    Rp {exp.amount.toLocaleString('id-ID')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{exp.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between border-t border-border pt-3">
                                        <span className="text-xs font-medium text-muted-foreground">Total Expenses</span>
                                        <span className="text-sm font-semibold tabular-nums text-foreground">
                                            Rp {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                            <Link
                                href="/dashboard/purchasing/orders"
                                className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                Cancel
                            </Link>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Create PO
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4 lg:sticky lg:top-4">
                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <h2 className="text-sm font-semibold text-foreground">Initial Details</h2>
                            </div>
                            <div className="space-y-4 p-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-muted-foreground">Tipe Pembayaran</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPoData({ ...poData, paymentType: 'CREDIT' })}
                                            className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                                                poData.paymentType === 'CREDIT'
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            Tempo (Credit)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPoData({ ...poData, paymentType: 'CASH' })}
                                            className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                                                poData.paymentType === 'CASH'
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            Tunai (Cash)
                                        </button>
                                    </div>
                                </div>

                                <Field label="Select Vendor *">
                                    <select
                                        value={poData.vendorId}
                                        onChange={e => setPoData({ ...poData, vendorId: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Unit Bisnis / Kategori *">
                                    <select
                                        value={poData.businessCategoryId}
                                        onChange={e => setPoData({ ...poData, businessCategoryId: e.target.value })}
                                        className={inputClass}
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

                                <div className="space-y-4 border-t border-border pt-4">
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
                                            className={inputClass}
                                        >
                                            <option value="">-- No Source Work Order --</option>
                                            {workOrders.map(w => (
                                                <option key={w.id} value={w.id}>[{w.number}] {w.customer?.name}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    {poData.workOrderId && (
                                        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">Linked Info</span>
                                                <div className="h-px flex-1 bg-border" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">Project</span>
                                                    <span className="text-xs font-medium text-foreground">
                                                        {workOrders.find(w => w.id === poData.workOrderId)?.project?.name || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">Sales Order</span>
                                                    <span className="text-xs font-medium text-foreground">
                                                        {(() => {
                                                            const wo = workOrders.find(w => w.id === poData.workOrderId);
                                                            if (!wo?.salesOrder) return "N/A";
                                                            return `[${wo.salesOrder.number}] ${wo.salesOrder.subject || ''}`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <Calculator size={15} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Summary</h2>
                            </div>
                            <div className="space-y-3 p-4 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span className="tabular-nums text-foreground">Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <span>PPN/Tax</span>
                                        <input
                                            type="number"
                                            value={poData.tax}
                                            onChange={e => setPoData({ ...poData, tax: parseFloat(e.target.value) || 0 })}
                                            className="h-7 w-12 rounded-md border border-border bg-background px-1.5 text-center text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                        />
                                        <span>%</span>
                                    </div>
                                    <span className="tabular-nums text-foreground">Rp {taxAmt.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <span className="font-semibold text-foreground">Grand Total</span>
                                    <span className="text-base font-semibold tabular-nums text-foreground">
                                        Rp {grandTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Create PO
                                </button>
                            </div>
                        </section>
                    </aside>
                </div>
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
                className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            >
                <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                    {selected?.displayLabel || '-- Choose Product SKU --'}
                </span>
                <svg
                    className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full min-w-[360px] overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                        <Search size={14} className="flex-shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Cari product / SKU..."
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filtered.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No product found</div>
                        )}
                        {filtered.map(sku => (
                            <button
                                key={sku.id}
                                type="button"
                                onClick={() => { onChange(sku.code); setOpen(false); setQuery('') }}
                                className={`w-full border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-muted ${
                                    sku.code === value ? 'bg-muted font-medium text-foreground' : 'text-foreground'
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
