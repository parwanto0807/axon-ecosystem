"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardList,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Check,
    TrendingUp,
    TrendingDown,
    Minus,
    DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse {
    id: string
    code: string
    name: string
}

interface SKU {
    id: string
    code: string
    name: string
    purchasePrice: number
    product: { name: string }
    warehouseStocks: { warehouse: { id: string }; quantity: number }[]
}

interface Movement {
    id: string
    number: string
    status: string
    date: string
    warehouse: Warehouse
    notes?: string
    confirmedAt?: string
    items: {
        qty: number
        systemQty?: number
        sku: { code: string; product: { name: string } }
    }[]
}

interface OpnameItem {
    skuId: string
    systemQty: number
    actualQty: number
    unitCost: number
    _name: string
    _code: string
}

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`

const STATUS_CFG: Record<string, string> = {
    DRAFT: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
    CONFIRMED:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
    CANCELLED: "border-border bg-muted text-muted-foreground",
}

const STATUS_DOT: Record<string, string> = {
    DRAFT: "bg-amber-500",
    CONFIRMED: "bg-emerald-500",
    CANCELLED: "bg-muted-foreground/50",
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
    const dot = STATUS_DOT[status] || STATUS_DOT.DRAFT
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {status}
        </span>
    )
}

export default function OpnamePage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)
    const [selectedWh, setSelectedWh] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<OpnameItem[]>([])
    const [saving, setSaving] = useState(false)

    const showToast = (type: "success" | "error", msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, wRes, sRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements?type=OPNAME`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock`),
            ])
            setMovements(await mRes.json())
            setWarehouses((await wRes.json()).filter((w: Warehouse & { isActive: boolean }) => w.isActive))
            setSkus(await sRes.json())
        } catch {
            showToast("error", "Gagal memuat")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const openNew = () => {
        setSelectedWh("")
        setItems([])
        setNotes("")
        setModalOpen(true)
    }

    const loadItemsForWarehouse = (whId: string) => {
        setSelectedWh(whId)
        setItems(
            skus
                .filter((s) => s.warehouseStocks.some((ws) => ws.warehouse?.id === whId))
                .map((s) => {
                    const systemQty =
                        s.warehouseStocks.find((ws) => ws.warehouse?.id === whId)?.quantity || 0
                    return {
                        skuId: s.id,
                        systemQty,
                        actualQty: systemQty,
                        unitCost: s.purchasePrice,
                        _name: s.product?.name,
                        _code: s.code,
                    }
                })
        )
    }

    const handleSave = async () => {
        if (!selectedWh || items.length === 0) return
        setSaving(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    warehouseId: selectedWh,
                    type: "OPNAME",
                    date,
                    notes,
                    items: items.map((i) => ({
                        skuId: i.skuId,
                        qty: i.actualQty,
                        systemQty: i.systemQty,
                        unitCost: i.unitCost,
                    })),
                }),
            })
            if (res.ok) {
                setModalOpen(false)
                showToast("success", "Session opname dibuat sebagai Draft")
                load()
            } else {
                const d = await res.json()
                showToast("error", d.message)
            }
        } finally {
            setSaving(false)
        }
    }

    const handleConfirm = async (id: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/${id}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmedBy: "Admin" }),
        })
        if (res.ok) {
            showToast("success", "Stock Opname dikonfirmasi! Stok telah disesuaikan.")
            load()
        } else {
            const d = await res.json()
            showToast("error", d.message)
        }
    }

    const discrepancies = items.filter((i) => i.actualQty !== i.systemQty).length
    const totalDiff = items.reduce((s, i) => s + (i.actualQty - i.systemQty) * i.unitCost, 0)

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`fixed right-6 top-6 z-[300] flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
                                toast.type === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}
                        >
                            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Stock Opname</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Perhitungan Fisik &amp; Penyesuaian Stok
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={load}
                            className="h-9 rounded-lg px-3 text-sm font-medium"
                        >
                            <RefreshCw size={15} className="mr-1.5" />
                            Reload
                        </Button>
                        <Button onClick={openNew} className="h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Buat opname
                        </Button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : movements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <ClipboardList size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Belum ada session opname</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            Mulai opname baru untuk menghitung stok fisik dan menyesuaikan sistem.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Nomor</th>
                                            <th className="px-3 py-2.5 font-medium">Gudang</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Items Diopname</th>
                                            <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {movements.map((m) => (
                                            <tr key={m.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                                    {m.number}
                                                </td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">
                                                    {m.warehouse?.name}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                                    {new Date(m.date).toLocaleDateString("id-ID", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <p className="text-sm font-medium tabular-nums text-foreground">
                                                        {m.items.length} SKU
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {m.items.filter((i) => i.qty !== i.systemQty).length} selisih
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <StatusPill status={m.status} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end">
                                                        {m.status === "DRAFT" && (
                                                            <Button
                                                                onClick={() => handleConfirm(m.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Konfirmasi & Terapkan Penyesuaian"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Check size={15} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="space-y-3 md:hidden">
                            {movements.map((m) => {
                                const selisih = m.items.filter((i) => i.qty !== i.systemQty).length
                                return (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border border-border bg-card p-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-foreground">{m.number}</p>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {new Date(m.date).toLocaleDateString("id-ID", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                            <StatusPill status={m.status} />
                                        </div>

                                        <div className="mt-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                            <p className="text-[11px] text-muted-foreground">Gudang</p>
                                            <p className="text-sm font-medium text-foreground">
                                                {m.warehouse?.name}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                <span>{m.items.length} SKU</span>
                                                {selisih > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                                                        {selisih} selisih
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {m.status === "DRAFT" && (
                                            <Button
                                                onClick={() => handleConfirm(m.id)}
                                                variant="outline"
                                                className="mt-2.5 h-9 w-full rounded-lg text-sm font-medium"
                                            >
                                                <Check size={14} className="mr-1.5" />
                                                Konfirmasi &amp; Terapkan
                                            </Button>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Opname modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <ClipboardList size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            Stock Opname Baru
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            Perhitungan fisik &amp; penyesuaian stok
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setModalOpen(false)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </header>

                            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="block text-xs font-medium text-muted-foreground">
                                            Gudang yang Diopname{" "}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedWh}
                                            onChange={(e) => loadItemsForWarehouse(e.target.value)}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="">-- Pilih Gudang --</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.code} - {w.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-muted-foreground">
                                            Tanggal
                                        </label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {selectedWh && discrepancies > 0 && (
                                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
                                        <p className="text-xs font-medium text-foreground">
                                            {discrepancies} item dengan selisih stok
                                        </p>
                                        <p
                                            className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                                                totalDiff >= 0
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400"
                                            }`}
                                        >
                                            <DollarSign size={13} />
                                            {totalDiff >= 0 ? "+" : ""}
                                            {fmt(totalDiff)}
                                        </p>
                                    </div>
                                )}

                                {selectedWh && (
                                    <div className="overflow-hidden rounded-xl border border-border">
                                        {/* Desktop items table */}
                                        <div className="hidden max-h-72 overflow-auto md:block">
                                            <table className="w-full border-collapse text-left text-sm">
                                                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                                                    <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                                                        <th className="px-3 py-2.5 font-medium">SKU</th>
                                                        <th className="px-3 py-2.5 font-medium">Produk</th>
                                                        <th className="px-3 py-2.5 text-center font-medium">
                                                            Stok Sistem
                                                        </th>
                                                        <th className="px-3 py-2.5 text-center font-medium">
                                                            Stok Fisik
                                                        </th>
                                                        <th className="px-3 py-2.5 text-center font-medium">
                                                            Selisih
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right font-medium">
                                                            Nilai Selisih
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {items.map((item, idx) => {
                                                        const diff = item.actualQty - item.systemQty
                                                        return (
                                                            <tr
                                                                key={item.skuId}
                                                                className={
                                                                    diff !== 0
                                                                        ? "bg-muted/30"
                                                                        : "transition-colors hover:bg-muted/30"
                                                                }
                                                            >
                                                                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                                                                    {item._code}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-xs text-foreground">
                                                                    {item._name}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center text-sm tabular-nums text-foreground">
                                                                    {item.systemQty}
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="any"
                                                                        value={item.actualQty}
                                                                        onChange={(e) => {
                                                                            const ni = [...items]
                                                                            ni[idx].actualQty = +e.target.value
                                                                            setItems(ni)
                                                                        }}
                                                                        className={`mx-auto block h-9 w-24 rounded-lg border bg-background px-2 text-right text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
                                                                            diff > 0
                                                                                ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                                                                                : diff < 0
                                                                                  ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                                                                                  : "border-border text-foreground"
                                                                        }`}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center">
                                                                    {diff === 0 ? (
                                                                        <Minus
                                                                            size={14}
                                                                            className="mx-auto text-muted-foreground/50"
                                                                        />
                                                                    ) : diff > 0 ? (
                                                                        <span className="flex items-center justify-center gap-1 text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                            <TrendingUp size={12} />+{diff}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center justify-center gap-1 text-xs font-medium tabular-nums text-rose-600 dark:text-rose-400">
                                                                            <TrendingDown size={12} />
                                                                            {diff}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums">
                                                                    {diff !== 0 && (
                                                                        <span
                                                                            className={
                                                                                diff > 0
                                                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                                                    : "text-rose-600 dark:text-rose-400"
                                                                            }
                                                                        >
                                                                            {diff > 0 ? "+" : ""}
                                                                            {fmt(diff * item.unitCost)}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile items list */}
                                        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-2 md:hidden">
                                            {items.map((item, idx) => {
                                                const diff = item.actualQty - item.systemQty
                                                return (
                                                    <div
                                                        key={item.skuId}
                                                        className={`rounded-lg border p-2.5 ${
                                                            diff !== 0
                                                                ? "border-border bg-muted/30"
                                                                : "border-border bg-card"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="font-mono text-[10px] text-muted-foreground">
                                                                    {item._code}
                                                                </p>
                                                                <p className="truncate text-xs font-medium text-foreground">
                                                                    {item._name}
                                                                </p>
                                                            </div>
                                                            {diff !== 0 && (
                                                                <span
                                                                    className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                                                                        diff > 0
                                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                                            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                                                                    }`}
                                                                >
                                                                    {diff > 0 ? "+" : ""}
                                                                    {diff}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex items-end gap-3">
                                                            <div className="flex-1">
                                                                <p className="mb-1 text-[10px] text-muted-foreground">
                                                                    Sistem
                                                                </p>
                                                                <p className="text-sm font-medium tabular-nums text-foreground">
                                                                    {item.systemQty}
                                                                </p>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="mb-1 text-right text-[10px] text-muted-foreground">
                                                                    Fisik
                                                                </p>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    value={item.actualQty}
                                                                    onChange={(e) => {
                                                                        const ni = [...items]
                                                                        ni[idx].actualQty = +e.target.value
                                                                        setItems(ni)
                                                                    }}
                                                                    className={`h-9 w-full rounded-lg border bg-background px-2 text-right text-sm tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
                                                                        diff > 0
                                                                            ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                                                                            : diff < 0
                                                                              ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                                                                              : "border-border text-foreground"
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalOpen(false)}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !selectedWh}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    {saving ? "Menyimpan..." : "Simpan sebagai Draft"}
                                </Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
