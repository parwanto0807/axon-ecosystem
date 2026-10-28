"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Box,
    ChevronLeft,
    X,
    Save,
    User,
    Calendar,
    Settings,
    Monitor,
    Wind,
    Smartphone,
    HardDrive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface BusinessCategory {
    id: string
    name: string
}

interface CustomerAsset {
    id: string
    customerId: string
    customer?: { name: string; code: string }
    name: string
    category: string
    brand?: string
    model?: string
    serialNumber?: string
    location?: string
    specifications?: any
    installationDate?: string
    lastServiceDate?: string
    nextServiceDate?: string
    status: string
    notes?: string
    businessCategoryId?: string | null
    businessCategory?: BusinessCategory | null
}

const CATEGORIES: Record<string, { label: string; icon: any }> = {
    AC: { label: "Air conditioner", icon: Wind },
    IT: { label: "IT equipment", icon: Monitor },
    ELECTRONIC: { label: "Electronic", icon: Smartphone },
    VEHICLE: { label: "Vehicle", icon: HardDrive },
    GENERAL: { label: "General asset", icon: Box },
}

const STATUS_STYLE: Record<string, string> = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
    INACTIVE: "border-border bg-muted text-muted-foreground",
    BROKEN: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400",
    REPLACED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

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

export default function AssetsPage() {
    const { data: session } = useSession()
    const userRole = session?.user?.role || "USER"
    const canDelete = userRole === "SUPER_ADMIN" || userRole === "ADMIN"

    const [assets, setAssets] = useState<CustomerAsset[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingAsset, setEditingAsset] = useState<CustomerAsset | null>(null)

    useEffect(() => {
        fetchData()
    }, [selectedBusinessCategoryId])

    const fetchData = async () => {
        setLoading(true)
        try {
            const assetsUrl = selectedBusinessCategoryId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets`

            const [assetsRes, customersRes, bizRes] = await Promise.all([
                fetch(assetsUrl),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`),
            ])
            const assetsData = await assetsRes.json()
            const customersData = await customersRes.json()
            const bizData = await bizRes.json()
            setAssets(assetsData)
            setCustomers(customersData)
            setBusinessCategories(bizData)
        } catch {
            // Errors are handled by the individual requests
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingAsset(null)
        setIsModalOpen(true)
    }

    const handleEdit = (asset: CustomerAsset) => {
        setEditingAsset(asset)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets/${id}`, { method: "DELETE" })
            fetchData()
        } catch {
            // Error handled
        }
    }

    const filteredAssets = assets.filter((a) => {
        const matchesSearch =
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.customer?.name && a.customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = !selectedCategory || a.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/management">
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                                <ChevronLeft size={16} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Assets</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Customer units and maintenance schedules
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleCreate} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        New asset
                    </Button>
                </header>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Search asset, serial or customer"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={(e) => setSelectedBusinessCategoryId(e.target.value)}
                        className={`${inputClass} cursor-pointer sm:w-52`}
                    >
                        <option value="">All business units</option>
                        {businessCategories.map((biz) => (
                            <option key={biz.id} value={biz.id}>
                                {biz.name}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
                    </span>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            !selectedCategory
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        All categories
                    </button>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                selectedCategory === key
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filteredAssets.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                        <th className="px-3 py-2.5 font-medium">Asset</th>
                                        <th className="px-3 py-2.5 font-medium">Serial & location</th>
                                        <th className="px-3 py-2.5 font-medium">Owner</th>
                                        <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                                            Service schedule
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">Status</th>
                                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredAssets.map((asset) => {
                                        const CatIcon = CATEGORIES[asset.category]?.icon || Box
                                        return (
                                            <tr key={asset.id} className="group transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                                                            <CatIcon size={15} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {asset.name}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                                {[asset.brand, asset.model]
                                                                    .filter(Boolean)
                                                                    .join(" ") || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="font-mono text-[11px] text-foreground">
                                                        {asset.serialNumber || "—"}
                                                    </p>
                                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Settings size={10} />
                                                        {asset.location || "—"}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                                                        <User size={11} className="flex-shrink-0 text-muted-foreground" />
                                                        <span className="max-w-[150px] truncate">
                                                            {asset.customer?.name || "Unassigned"}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                                        >
                                                            {asset.businessCategory?.name || "Generic"}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="hidden px-3 py-2.5 lg:table-cell">
                                                    <p className="flex items-center gap-1 text-[11px] text-foreground">
                                                        <Calendar size={11} className="text-muted-foreground" />
                                                        Next:{" "}
                                                        {asset.nextServiceDate
                                                            ? new Date(asset.nextServiceDate).toLocaleDateString()
                                                            : "—"}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                        Last:{" "}
                                                        {asset.lastServiceDate
                                                            ? new Date(asset.lastServiceDate).toLocaleDateString()
                                                            : "—"}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span
                                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                                            STATUS_STYLE[asset.status] || STATUS_STYLE.INACTIVE
                                                        }`}
                                                    >
                                                        {asset.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button
                                                            onClick={() => handleEdit(asset)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Edit asset"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Edit size={15} />
                                                        </Button>
                                                        {canDelete && (
                                                            <Button
                                                                onClick={() => handleDelete(asset.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete asset"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2 size={15} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Box size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No assets found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {searchQuery || selectedCategory
                                ? "Try adjusting your search or filter to find what you are looking for."
                                : "Track customer units and maintenance schedules by adding your first asset."}
                        </p>
                        <Button onClick={handleCreate} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Add asset
                        </Button>
                    </div>
                )}
            </div>

            <AssetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                asset={editingAsset}
                customers={customers}
                businessCategories={businessCategories}
                onSuccess={fetchData}
            />
        </div>
    )
}

function AssetModal({
    isOpen,
    onClose,
    asset,
    customers,
    businessCategories,
    onSuccess,
}: {
    isOpen: boolean
    onClose: () => void
    asset: CustomerAsset | null
    customers: any[]
    businessCategories: BusinessCategory[]
    onSuccess: () => void
}) {
    const [formData, setFormData] = useState<Partial<CustomerAsset>>({
        name: "",
        customerId: "",
        category: "AC",
        brand: "",
        model: "",
        serialNumber: "",
        location: "",
        specifications: {},
        installationDate: "",
        lastServiceDate: "",
        nextServiceDate: "",
        status: "ACTIVE",
        notes: "",
        businessCategoryId: "",
    })

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (asset) {
            setFormData({
                ...asset,
                installationDate: asset.installationDate
                    ? new Date(asset.installationDate).toISOString().split("T")[0]
                    : "",
                lastServiceDate: asset.lastServiceDate
                    ? new Date(asset.lastServiceDate).toISOString().split("T")[0]
                    : "",
                nextServiceDate: asset.nextServiceDate
                    ? new Date(asset.nextServiceDate).toISOString().split("T")[0]
                    : "",
            })
        } else {
            setFormData({
                name: "",
                customerId: "",
                category: "AC",
                brand: "",
                model: "",
                serialNumber: "",
                location: "",
                specifications: {},
                installationDate: new Date().toISOString().split("T")[0],
                lastServiceDate: "",
                nextServiceDate: "",
                status: "ACTIVE",
                notes: "",
                businessCategoryId: "",
            })
        }
    }, [asset, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const method = asset ? "PUT" : "POST"
        const url = asset
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets/${asset.id}`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets`

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                const err = await res.json()
                alert(err.message || "Failed to save asset")
            }
        } catch {
            alert("Network error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                    <Box size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {asset ? "Edit asset" : "New asset"}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">
                                        {asset ? "Update unit details" : "Register a customer unit"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                            >
                                <X size={16} />
                            </Button>
                        </header>

                        <form
                            id="asset-form"
                            onSubmit={handleSubmit}
                            className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Customer owner" required className="sm:col-span-2">
                                    <select
                                        required
                                        value={formData.customerId || ""}
                                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="">Select customer</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Asset name" required>
                                    <input
                                        required
                                        value={formData.name || ""}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. AC Daikin 2nd floor"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Business unit" required>
                                    <select
                                        required
                                        value={formData.businessCategoryId || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, businessCategoryId: e.target.value })
                                        }
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="">Select business unit</option>
                                        {businessCategories.map((biz) => (
                                            <option key={biz.id} value={biz.id}>
                                                {biz.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Category">
                                    <select
                                        value={formData.category || "AC"}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        {Object.entries(CATEGORIES).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Brand">
                                    <input
                                        value={formData.brand || ""}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Model / type">
                                    <input
                                        value={formData.model || ""}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Serial number">
                                    <input
                                        value={formData.serialNumber || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, serialNumber: e.target.value })
                                        }
                                        className={`${inputClass} font-mono uppercase`}
                                    />
                                </Field>

                                <Field label="Installed location">
                                    <input
                                        value={formData.location || ""}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g. Lt. 2, R. Direktur"
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Installation date">
                                    <input
                                        type="date"
                                        value={formData.installationDate || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, installationDate: e.target.value })
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Next service reminder">
                                    <input
                                        type="date"
                                        value={formData.nextServiceDate || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, nextServiceDate: e.target.value })
                                        }
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Technical notes" className="sm:col-span-2">
                                    <textarea
                                        rows={3}
                                        value={formData.notes || ""}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className={textareaClass}
                                    />
                                </Field>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                <div>
                                    <p className="text-xs font-medium text-foreground">Operational status</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Current condition of the asset
                                    </p>
                                </div>
                                <select
                                    value={formData.status || "ACTIVE"}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="h-8 cursor-pointer rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="BROKEN">Broken</option>
                                    <option value="REPLACED">Replaced</option>
                                </select>
                            </div>
                        </form>

                        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="asset-form"
                                disabled={loading}
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                <Save size={15} className="mr-1.5" />
                                {loading ? "Saving..." : asset ? "Save changes" : "Create asset"}
                            </Button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
