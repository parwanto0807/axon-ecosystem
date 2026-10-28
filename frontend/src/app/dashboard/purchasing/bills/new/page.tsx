"use client"

import { useState, useEffect, Suspense } from "react"
import { Plus, Trash2, Save, ArrowLeft, Loader2, Calculator, Receipt } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const textareaClass =
    "min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const compactInputClass =
    "rounded-md border border-border bg-background text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

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
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders`)
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
                let selectedPo = pos.find(p => p.id === billData.purchaseOrderId)
                if (!selectedPo) {
                    const poRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${billData.purchaseOrderId}`)
                    if (poRes.ok) {
                        selectedPo = await poRes.json()
                    }
                }

                // 1. Set basic info from PO
                if (selectedPo) {
                    setBillData(prev => ({
                        ...prev,
                        vendorId: selectedPo.vendorId || prev.vendorId,
                        tax: selectedPo.tax !== undefined ? selectedPo.tax : prev.tax,
                        paymentType: selectedPo.paymentType || 'CREDIT'
                    }))
                }

                // 2. Fetch specific received items from backend
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${billData.purchaseOrderId}/receivable-items`)
                const receivableItems = await res.json()

                if (Array.isArray(receivableItems) && receivableItems.length > 0) {
                    setError(null)
                    setItems(receivableItems.map((i: any) => ({
                        id: i.id || Date.now().toString() + Math.random(),
                        no: i.no,
                        description: i.productName ? `${i.description} - ${i.productName}` : i.description,
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

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed to save Vendor Bill') }

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
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1200px]">
                <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/purchasing/bills"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Record Vendor Bill</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">Draft a new invoice received from a supplier.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Bill (Draft)
                    </button>
                </header>

                {error && (
                    <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-rose-600">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                        <section className="rounded-xl border border-border bg-card">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Receipt size={16} className="text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Billed Items</h2>
                                </div>

                                {/* Auto-fill from PO */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Copy from PO:</span>
                                    <select
                                        value={billData.purchaseOrderId}
                                        onChange={e => setBillData({ ...billData, purchaseOrderId: e.target.value })}
                                        className="h-9 cursor-pointer rounded-lg border border-border bg-background px-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    >
                                        <option value="">-- No PO Selected --</option>
                                        {availablePos.map(p => (
                                            <option key={p.id} value={p.id}>{p.number}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3 p-4">
                                {loading && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                        Memuat item penerimaan...
                                    </div>
                                )}

                                {items.map((item, index) => (
                                    <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
                                        <div className="grid grid-cols-12 gap-2 items-start">
                                            <div className="hidden items-center justify-center pt-5 text-xs text-muted-foreground sm:col-span-1 sm:flex">
                                                {index + 1}.
                                            </div>
                                            <div className="col-span-12 space-y-1 sm:col-span-5">
                                                <label className="text-xs font-medium text-muted-foreground">Description</label>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                                    className={`${inputClass} h-9`}
                                                    placeholder="Billed item detail..."
                                                />
                                            </div>
                                            <div className="col-span-6 space-y-1 sm:col-span-2">
                                                <label className="text-xs font-medium text-muted-foreground">Qty & Unit</label>
                                                <div className="flex">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        value={item.qty}
                                                        onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                        className={`${inputClass} h-9 rounded-r-none text-center`}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                                        className={`${inputClass} h-9 rounded-l-none border-l-0 text-center`}
                                                        placeholder="pcs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-6 space-y-1 sm:col-span-3">
                                                <label className="text-xs font-medium text-muted-foreground">Unit Price</label>
                                                <div className="relative">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className={`${inputClass} h-9 pl-8 font-mono`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-12 flex justify-end pt-1 sm:col-span-1 sm:pt-5">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                                                    disabled={items.length === 1}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            <div className="col-span-12 mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground">Discount (%):</span>
                                                    <input
                                                        type="number"
                                                        value={item.discount}
                                                        onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                        className={`${compactInputClass} h-8 w-16 px-2 text-center text-xs`}
                                                    />
                                                </div>
                                                <span className="font-mono text-sm font-medium text-foreground">
                                                    Rp {item.amount.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addItem}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Plus size={15} /> Add Item
                                </button>
                            </div>
                        </section>

                        <section className="rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <h2 className="text-sm font-semibold text-foreground">Bill Notes</h2>
                            </div>
                            <div className="p-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Bill Notes / Description</label>
                                    <textarea
                                        value={billData.notes}
                                        onChange={e => setBillData({ ...billData, notes: e.target.value })}
                                        className={textareaClass}
                                        rows={3}
                                        placeholder="Payment instructions, references..."
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <section className="rounded-xl border border-border bg-card">
                            <div className="border-b border-border px-4 py-3">
                                <h2 className="text-sm font-semibold text-foreground">Vendor & Dates</h2>
                            </div>
                            <div className="space-y-4 p-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Select Vendor *</label>
                                    <select
                                        value={billData.vendorId}
                                        onChange={e => setBillData({ ...billData, vendorId: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Reference / Physical Bill No.</label>
                                    <input
                                        type="text"
                                        value={billData.number}
                                        onChange={e => setBillData({ ...billData, number: e.target.value })}
                                        className={inputClass}
                                        placeholder="Leave empty to auto-generate"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Bill Date</label>
                                    <input
                                        type="date"
                                        value={billData.date}
                                        onChange={e => setBillData({ ...billData, date: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Tipe Pembayaran</label>
                                    <select
                                        value={billData.paymentType}
                                        onChange={e => setBillData({ ...billData, paymentType: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="CREDIT">CREDIT (Hutang)</option>
                                        <option value="CASH">CASH (Tunai)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Upload Bon Pembelian</label>
                                    <div className="relative">
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
                                            id="receipt-upload"
                                        />
                                        <label
                                            htmlFor="receipt-upload"
                                            className="group flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-4 transition-colors hover:bg-muted"
                                        >
                                            {billData.receiptImage ? (
                                                <div className="relative h-full w-full">
                                                    <img src={`${process.env.NEXT_PUBLIC_API_URL}${billData.receiptImage}`} alt="Receipt" className="h-full w-full rounded-md object-cover" />
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <span className="text-xs font-medium text-white">Ganti Foto</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Save size={20} className="mb-1.5 text-muted-foreground" />
                                                    <span className="text-xs font-medium text-muted-foreground">Klik untuk upload bon</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <Calculator size={16} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Summary</h2>
                            </div>

                            <div className="space-y-3 p-4 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs">Subtotal</span>
                                    <span className="font-mono text-foreground">Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">PPN/Tax</span>
                                        <input
                                            type="number"
                                            value={billData.tax}
                                            onChange={e => setBillData({ ...billData, tax: parseFloat(e.target.value) || 0 })}
                                            className={`${compactInputClass} h-8 w-14 px-2 text-center text-xs`}
                                        />
                                        <span className="text-xs">%</span>
                                    </div>
                                    <span className="font-mono text-foreground">Rp {taxAmt.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <span className="text-sm font-semibold text-foreground">Total Due</span>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        Rp {grandTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 border-t border-border pt-3">
                                    <Link
                                        href="/dashboard/purchasing/bills"
                                        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function NewVendorBillPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center p-6"><div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>}>
            <NewVendorBillForm />
        </Suspense>
    )
}
