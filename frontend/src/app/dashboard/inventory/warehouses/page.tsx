"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Database,
    Plus,
    Edit,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    MapPin,
    Phone,
    User,
    Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Warehouse {
    id: string
    code: string
    name: string
    location?: string
    type: string
    managedBy?: string
    phone?: string
    isActive: boolean
    _count?: { stocks: number }
    stocks?: { quantity: number; sku: { purchasePrice: number } }[]
    createdAt: string
    businessCategoryId: string | null
    businessCategory?: { id: string; name: string }
}

interface BusinessCategory {
    id: string
    name: string
}

const TYPE_CFG: Record<string, string> = {
    MAIN: "border-primary/25 bg-primary/10 text-primary",
    BRANCH: "border-border bg-muted text-foreground",
    VIRTUAL: "border-border bg-background text-muted-foreground",
}

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`
const defaultForm = {
    code: "",
    name: "",
    location: "",
    type: "MAIN",
    managedBy: "",
    phone: "",
    isActive: true,
    businessCategoryId: "",
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

function Field({
    label,
    required,
    children,
    className = "",
}: {
    label: string
    required?: boolean
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-muted-foreground">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    )
}

function TypePill({ type }: { type: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                TYPE_CFG[type] || "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${
                    type === "MAIN" ? "bg-primary" : "bg-muted-foreground/60"
                }`}
            />
            {type}
        </span>
    )
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
            {active ? "Aktif" : "Nonaktif"}
        </span>
    )
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Warehouse | null>(null)
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)
    const [form, setForm] = useState(defaultForm)
    const [saving, setSaving] = useState(false)
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [filterBusinessCategory, setFilterBusinessCategory] = useState("ALL")

    const showToast = (type: "success" | "error", msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [wR, bcR] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`),
            ])
            setWarehouses(await wR.json())
            setBusinessCategories(await bcR.json())
        } catch {
            showToast("error", "Gagal memuat data")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const openCreate = () => {
        setEditing(null)
        setForm(defaultForm)
        setModalOpen(true)
    }

    const openEdit = (w: Warehouse) => {
        setEditing(w)
        setForm({
            code: w.code,
            name: w.name,
            location: w.location || "",
            type: w.type,
            managedBy: w.managedBy || "",
            phone: w.phone || "",
            isActive: w.isActive,
            businessCategoryId: w.businessCategoryId || "",
        })
        setModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = editing
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/warehouses/${editing.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/warehouses`
            const res = await fetch(url, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (res.ok) {
                setModalOpen(false)
                showToast("success", editing ? "Gudang diperbarui" : "Gudang dibuat")
                load()
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus gudang "${name}"?`)) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses/${id}`, { method: "DELETE" })
        showToast("success", "Gudang dihapus")
        load()
    }

    const filtered = warehouses.filter(
        (w) => filterBusinessCategory === "ALL" || w.businessCategoryId === filterBusinessCategory
    )

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className={`fixed right-4 top-4 z-[300] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg sm:right-6 sm:top-6 ${
                                toast.type === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300"
                                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/80 dark:text-rose-300"
                            }`}
                        >
                            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Manajemen Gudang</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Kelola Lokasi Penyimpanan Stok</p>
                    </div>
                    <Button onClick={openCreate} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        Tambah Gudang
                    </Button>
                </header>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                        value={filterBusinessCategory}
                        onChange={(e) => setFilterBusinessCategory(e.target.value)}
                        className={`${inputClass} cursor-pointer sm:w-56`}
                    >
                        <option value="ALL">All Business Units</option>
                        {Array.isArray(businessCategories) &&
                            businessCategories.map((bc) => (
                                <option key={bc.id} value={bc.id}>
                                    {bc.name}
                                </option>
                            ))}
                    </select>
                    <Button
                        variant="outline"
                        onClick={load}
                        className="h-10 rounded-lg px-3 text-sm font-medium"
                    >
                        <RefreshCw size={15} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
                        Reload
                    </Button>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filtered.length} gudang
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Database size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Belum ada gudang</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {filterBusinessCategory !== "ALL"
                                ? "Tidak ada gudang pada unit bisnis ini. Coba pilih unit bisnis lain."
                                : "Tambahkan gudang pertama Anda untuk mulai mengelola stok."}
                        </p>
                        <Button onClick={openCreate} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Tambah Gudang
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Gudang</th>
                                            <th className="px-3 py-2.5 font-medium">Tipe</th>
                                            <th className="px-3 py-2.5 font-medium">Unit bisnis</th>
                                            <th className="px-3 py-2.5 font-medium">Lokasi</th>
                                            <th className="px-3 py-2.5 font-medium">Penanggung jawab</th>
                                            <th className="px-3 py-2.5 text-right font-medium">SKU</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Nilai aset</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((w) => {
                                            const totalValue =
                                                w.stocks?.reduce(
                                                    (s, ws) => s + ws.quantity * ws.sku.purchasePrice,
                                                    0
                                                ) || 0
                                            return (
                                                <tr key={w.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-3 py-2.5">
                                                        <p className="font-mono text-[11px] text-muted-foreground">
                                                            {w.code}
                                                        </p>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {w.name}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <TypePill type={w.type} />
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {w.businessCategory ? (
                                                            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                {w.businessCategory.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="max-w-[220px] px-3 py-2.5">
                                                        {w.location ? (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <MapPin size={13} className="shrink-0" />
                                                                <span className="truncate">{w.location}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {w.managedBy ? (
                                                            <>
                                                                <p className="text-xs text-foreground">{w.managedBy}</p>
                                                                {w.phone && (
                                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                                        {w.phone}
                                                                    </p>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className="tabular-nums text-foreground">
                                                            {w._count?.stocks || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        <span className="tabular-nums text-foreground">
                                                            {fmt(totalValue)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <StatusPill active={w.isActive} />
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <Button
                                                                onClick={() => openEdit(w)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Edit gudang"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Edit size={15} />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(w.id, w.name)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Hapus gudang"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2 size={15} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 lg:hidden">
                            {filtered.map((w) => {
                                const totalValue =
                                    w.stocks?.reduce(
                                        (s, ws) => s + ws.quantity * ws.sku.purchasePrice,
                                        0
                                    ) || 0
                                return (
                                    <div
                                        key={w.id}
                                        className="rounded-xl border border-border bg-card p-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                    {w.code}
                                                </p>
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {w.name}
                                                </p>
                                            </div>
                                            <StatusPill active={w.isActive} />
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <TypePill type={w.type} />
                                            {w.businessCategory && (
                                                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                    {w.businessCategory.name}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
                                            {w.location && (
                                                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                                    <MapPin size={13} className="mt-0.5 shrink-0" />
                                                    <span className="leading-snug">{w.location}</span>
                                                </div>
                                            )}
                                            {w.managedBy && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <User size={13} className="shrink-0" />
                                                    <span className="truncate">{w.managedBy}</span>
                                                </div>
                                            )}
                                            {w.phone && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <Phone size={13} className="shrink-0" />
                                                    <span className="truncate">{w.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Package size={12} />
                                                    <span className="font-medium text-foreground">
                                                        {w._count?.stocks || 0}
                                                    </span>
                                                    SKU
                                                </span>
                                                <span>
                                                    Nilai{" "}
                                                    <span className="font-medium text-foreground">
                                                        {fmt(totalValue)}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    onClick={() => openEdit(w)}
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Edit gudang"
                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(w.id, w.name)}
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Hapus gudang"
                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
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
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                        <Database size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            {editing ? "Edit Gudang" : "Tambah Gudang"}
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {editing
                                                ? "Perbarui informasi gudang"
                                                : "Tambahkan gudang baru"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setModalOpen(false)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-4">
                                <form id="warehouse-form" onSubmit={handleSubmit} className="space-y-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field label="Kode" required>
                                            <input
                                                required
                                                maxLength={10}
                                                value={form.code}
                                                onChange={(e) =>
                                                    setForm({ ...form, code: e.target.value.toUpperCase() })
                                                }
                                                placeholder="GDG-01"
                                                className={`${inputClass} font-mono uppercase`}
                                            />
                                        </Field>
                                        <Field label="Tipe">
                                            <select
                                                value={form.type}
                                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="MAIN">Main (Utama)</option>
                                                <option value="BRANCH">Branch (Cabang)</option>
                                                <option value="VIRTUAL">Virtual</option>
                                            </select>
                                        </Field>
                                        <Field label="Unit Bisnis / Kategori" className="sm:col-span-2">
                                            <select
                                                value={form.businessCategoryId}
                                                onChange={(e) =>
                                                    setForm({ ...form, businessCategoryId: e.target.value })
                                                }
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="">-- Generic / Shared --</option>
                                                {Array.isArray(businessCategories) &&
                                                    businessCategories.map((bc) => (
                                                        <option key={bc.id} value={bc.id}>
                                                            {bc.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </Field>
                                        <Field label="Nama Gudang" required className="sm:col-span-2">
                                            <input
                                                required
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                placeholder="Gudang Utama Jakarta"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Lokasi / Alamat" className="sm:col-span-2">
                                            <input
                                                value={form.location}
                                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                                placeholder="Jl. Contoh No. 1, Jakarta"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Penanggung Jawab">
                                            <input
                                                value={form.managedBy}
                                                onChange={(e) =>
                                                    setForm({ ...form, managedBy: e.target.value })
                                                }
                                                placeholder="Nama PIC"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Telepon">
                                            <input
                                                value={form.phone}
                                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                placeholder="08xxxx"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 sm:col-span-2">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                checked={form.isActive}
                                                onChange={(e) =>
                                                    setForm({ ...form, isActive: e.target.checked })
                                                }
                                                className="h-4 w-4 rounded border-border accent-primary"
                                            />
                                            <label
                                                htmlFor="isActive"
                                                className="cursor-pointer text-xs font-medium text-foreground"
                                            >
                                                Gudang Aktif
                                            </label>
                                        </div>
                                    </div>
                                </form>
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
                                    type="submit"
                                    form="warehouse-form"
                                    disabled={saving}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    {saving ? "Menyimpan..." : editing ? "Update Gudang" : "Buat Gudang"}
                                </Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
