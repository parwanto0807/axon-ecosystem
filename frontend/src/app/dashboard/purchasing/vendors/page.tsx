"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Users,
    Search,
    Edit2,
    Trash2,
    Mail,
    Phone,
    Building2,
    MapPin,
    Loader2,
    AlertCircle,
    X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface BusinessCategory {
    id: string
    name: string
}

interface Vendor {
    id: string
    code: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    company: string | null
    taxId: string | null
    taxAddress: string | null
    businessCategoryId: string | null
    businessCategory: BusinessCategory | null
    businessCategories: BusinessCategory[]
    isActive: boolean
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

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                active
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/50"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    )
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Partial<Vendor>>({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        taxId: "",
        taxAddress: "",
        businessCategoryId: "",
        businessCategories: [],
        isActive: true,
    })
    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>("")
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchVendors = async () => {
        setLoading(true)
        try {
            const url = selectedBusinessCategoryId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/vendors?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/vendors`
            const res = await fetch(url)
            const data = await res.json()
            setVendors(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchBusinessCategories = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            const data = await res.json()
            setBusinessCategories(data)
        } catch (error) {
            console.error("Error fetching business categories:", error)
        }
    }

    useEffect(() => {
        fetchVendors()
        fetchBusinessCategories()
    }, [selectedBusinessCategoryId])

    const handleOpenModal = (vendor?: Vendor) => {
        setError(null)
        if (vendor) {
            setEditingId(vendor.id)
            setFormData({
                ...vendor,
                businessCategoryId: vendor.businessCategoryId || "",
                businessCategories: vendor.businessCategories || [],
            })
        } else {
            setEditingId(null)
            setFormData({
                name: "",
                email: "",
                phone: "",
                company: "",
                address: "",
                taxId: "",
                taxAddress: "",
                businessCategoryId: "",
                businessCategories: [],
                isActive: true,
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const url = editingId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/vendors/${editingId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/vendors`

            const method = editingId ? "PUT" : "POST"

            const payload = {
                ...formData,
                businessCategoryIds: formData.businessCategories?.map((b) => b.id) || [],
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.message || "Failed to save vendor")
            }

            await fetchVendors()
            setIsModalOpen(false)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vendor?")) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors/${id}`, { method: "DELETE" })
            fetchVendors()
        } catch (e) {
            console.error(e)
        }
    }

    const filteredVendors = vendors.filter(
        (v) =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.company && v.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Master Vendor</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Procurement Partner Registry</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        New Vendor
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
                            placeholder="Search vendors, codes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={(e) => setSelectedBusinessCategoryId(e.target.value)}
                        className={`${inputClass} cursor-pointer sm:w-52`}
                    >
                        <option value="">All Business Units</option>
                        {businessCategories.map((biz) => (
                            <option key={biz.id} value={biz.id}>
                                {biz.name}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredVendors.length} {filteredVendors.length === 1 ? "vendor" : "vendors"}
                    </span>
                </div>

                <main>
                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Users size={22} />
                            </div>
                            <p className="text-sm font-medium text-foreground">No vendors found</p>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                Maintain your supplier network by adding your first vendor.
                            </p>
                            <Button
                                onClick={() => handleOpenModal()}
                                className="mt-5 h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                <Plus size={16} className="mr-1.5" />
                                Add vendor
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
                                                <th className="px-3 py-2.5 font-medium">Vendor</th>
                                                <th className="px-3 py-2.5 font-medium">Business unit</th>
                                                <th className="px-3 py-2.5 font-medium">Contact</th>
                                                <th className="px-3 py-2.5 font-medium">Company</th>
                                                <th className="px-3 py-2.5 font-medium">Address</th>
                                                <th className="px-3 py-2.5 font-medium">Status</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredVendors.map((vendor) => (
                                                <tr key={vendor.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold text-foreground">
                                                                {vendor.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {vendor.name}
                                                                </p>
                                                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                                    {vendor.code || "NO-CODE"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex flex-wrap gap-1">
                                                            {vendor.businessCategories &&
                                                            vendor.businessCategories.length > 0 ? (
                                                                vendor.businessCategories.map((biz) => (
                                                                    <Badge
                                                                        key={biz.id}
                                                                        variant="outline"
                                                                        className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                                                    >
                                                                        {biz.name}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">
                                                                    GENERIC
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="space-y-1 text-xs text-muted-foreground">
                                                            <p className="flex items-center gap-1.5">
                                                                <Mail size={12} className="flex-shrink-0" />
                                                                <span className="truncate">{vendor.email || "N/A"}</span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5">
                                                                <Phone size={12} className="flex-shrink-0" />
                                                                <span>{vendor.phone || "N/A"}</span>
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                                                            <Building2
                                                                size={12}
                                                                className="flex-shrink-0 text-muted-foreground"
                                                            />
                                                            <span className="truncate">{vendor.company || "N/A"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <MapPin size={12} className="flex-shrink-0" />
                                                            <span className="line-clamp-1 max-w-[220px]">
                                                                {vendor.address || "N/A"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <StatusPill active={vendor.isActive} />
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <Button
                                                                onClick={() => handleOpenModal(vendor)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Edit vendor"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Edit2 size={15} />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(vendor.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete vendor"
                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2 size={15} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="grid grid-cols-1 gap-3 lg:hidden">
                                {filteredVendors.map((vendor) => (
                                    <div key={vendor.id} className="rounded-xl border border-border bg-card p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold text-foreground">
                                                    {vendor.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {vendor.name}
                                                    </p>
                                                    <p className="font-mono text-[11px] text-muted-foreground">
                                                        {vendor.code || "NO-CODE"}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusPill active={vendor.isActive} />
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {vendor.businessCategories && vendor.businessCategories.length > 0 ? (
                                                vendor.businessCategories.map((biz) => (
                                                    <Badge
                                                        key={biz.id}
                                                        variant="outline"
                                                        className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                                    >
                                                        {biz.name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground">GENERIC</span>
                                            )}
                                        </div>

                                        <div className="mt-2.5 grid grid-cols-1 gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                                            <p className="flex items-center gap-1.5">
                                                <Mail size={12} className="flex-shrink-0" />
                                                <span className="truncate">{vendor.email || "N/A"}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <Phone size={12} className="flex-shrink-0" />
                                                <span>{vendor.phone || "N/A"}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <Building2 size={12} className="flex-shrink-0" />
                                                <span className="truncate">{vendor.company || "N/A"}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <MapPin size={12} className="flex-shrink-0" />
                                                <span className="truncate">{vendor.address || "N/A"}</span>
                                            </p>
                                        </div>

                                        <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-border pt-2">
                                            <Button
                                                onClick={() => handleOpenModal(vendor)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit2 size={14} className="mr-1.5" /> Edit
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(vendor.id)}
                                                variant="ghost"
                                                size="icon"
                                                title="Delete vendor"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => !submitting && setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Users size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                            {editingId ? "Edit Vendor" : "New Vendor"}
                                        </h2>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            Partner Profile Registry
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => !submitting && setIsModalOpen(false)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </header>

                            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                                    {error && (
                                        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted px-3 py-2.5 text-xs text-foreground">
                                            <AlertCircle size={15} className="flex-shrink-0 text-rose-500" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label="Vendor Name" required>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name || ""}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, name: e.target.value }))
                                                }
                                                className={inputClass}
                                                placeholder="PT. Example Supplier"
                                            />
                                        </Field>

                                        <Field label="Business Units" required className="sm:col-span-2">
                                            <div className="flex min-h-[50px] flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                                                {businessCategories.map((biz) => {
                                                    const isSelected = formData.businessCategories?.some(
                                                        (b) => b.id === biz.id
                                                    )
                                                    return (
                                                        <button
                                                            key={biz.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = formData.businessCategories || []
                                                                const next = isSelected
                                                                    ? current.filter((b) => b.id !== biz.id)
                                                                    : [...current, biz]
                                                                setFormData({ ...formData, businessCategories: next })
                                                            }}
                                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                                isSelected
                                                                    ? "border-primary bg-primary text-primary-foreground"
                                                                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            }`}
                                                        >
                                                            {biz.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {(!formData.businessCategories ||
                                                formData.businessCategories.length === 0) && (
                                                <p className="text-[11px] italic text-rose-500">
                                                    Please select at least one business unit
                                                </p>
                                            )}
                                        </Field>

                                        <Field label="Email Address">
                                            <input
                                                type="email"
                                                value={formData.email || ""}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, email: e.target.value }))
                                                }
                                                className={inputClass}
                                                placeholder="contact@vendor.com"
                                            />
                                        </Field>

                                        <Field label="Phone Number">
                                            <input
                                                type="text"
                                                value={formData.phone || ""}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, phone: e.target.value }))
                                                }
                                                className={inputClass}
                                                placeholder="+62 812..."
                                            />
                                        </Field>

                                        <Field label="Office Address" className="sm:col-span-2">
                                            <textarea
                                                value={formData.address || ""}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, address: e.target.value }))
                                                }
                                                className={textareaClass}
                                                rows={2}
                                                placeholder="Full billing or office address..."
                                            />
                                        </Field>

                                        <Field label="Tax ID (NPWP)">
                                            <input
                                                type="text"
                                                value={formData.taxId || ""}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, taxId: e.target.value }))
                                                }
                                                className={`${inputClass} font-mono`}
                                                placeholder="00.000.000.0-000.000"
                                            />
                                        </Field>

                                        <Field label="Status">
                                            <select
                                                value={formData.isActive ? "true" : "false"}
                                                onChange={(e) =>
                                                    setFormData((p) => ({
                                                        ...p,
                                                        isActive: e.target.value === "true",
                                                    }))
                                                }
                                                className={`${inputClass} cursor-pointer`}
                                            >
                                                <option value="true">Active Vendor</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>

                                <footer className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsModalOpen(false)}
                                        className="h-9 rounded-lg px-4 text-sm font-medium"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="h-9 rounded-lg px-4 text-sm font-medium"
                                    >
                                        {submitting && <Loader2 size={15} className="mr-1.5 animate-spin" />}
                                        {editingId ? "Save Changes" : "Create Vendor"}
                                    </Button>
                                </footer>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
