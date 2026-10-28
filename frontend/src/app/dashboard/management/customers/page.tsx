"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Users,
    Mail,
    Phone,
    ChevronLeft,
    Building2,
    X,
    Save,
    CreditCard,
    Calendar,
    Briefcase,
    User,
    FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface CustomerPIC {
    id?: string
    name: string
    department: string
    email?: string
    phone?: string
}

interface BusinessCategory {
    id: string
    name: string
}

interface Customer {
    id: string
    code: string
    name: string
    type: string
    email: string | null
    phone: string | null
    address: string | null
    taxId: string | null
    taxAddress: string | null
    company: string | null
    creditLimit: number
    paymentTerms: string | null
    businessCategoryId: string | null
    businessCategory: BusinessCategory | null
    businessCategories: BusinessCategory[]
    isActive: boolean
    pics?: CustomerPIC[]
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
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    )
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>("")
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])

    useEffect(() => {
        fetchCustomers()
        fetchBusinessCategories()
    }, [selectedBusinessCategoryId])

    const fetchBusinessCategories = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            const data = await res.json()
            setBusinessCategories(data)
        } catch (error) {
            console.error("Error fetching business categories:", error)
        }
    }

    const fetchCustomers = async () => {
        try {
            const url = selectedBusinessCategoryId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/customers?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/customers`
            const res = await fetch(url)
            const data = await res.json()
            setCustomers(data)
        } catch (error) {
            console.error("Error fetching customers:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingCustomer(null)
        setIsModalOpen(true)
    }

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this customer?")) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, { method: "DELETE" })
            fetchCustomers()
        } catch (error) {
            console.error("Error deleting customer:", error)
        }
    }

    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const groupedCustomers = filteredCustomers.reduce((acc, customer) => {
        const type = customer.type || "OTHERS"
        if (!acc[type]) acc[type] = []
        acc[type].push(customer)
        return acc
    }, {} as Record<string, Customer[]>)

    const groupOrder = Object.keys(groupedCustomers).sort((a, b) => {
        if (a === "CORPORATE") return -1
        if (b === "CORPORATE") return 1
        if (a === "INDIVIDUAL") return -1
        if (b === "INDIVIDUAL") return 1
        return a.localeCompare(b)
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
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Customers</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Client registry, contacts and financial terms
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleCreate} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        New customer
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
                            placeholder="Search name, code or company"
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
                        {filteredCustomers.length}{" "}
                        {filteredCustomers.length === 1 ? "customer" : "customers"}
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filteredCustomers.length > 0 ? (
                    <div className="space-y-5">
                        {groupOrder.map((group) => {
                            const groupList = groupedCustomers[group]
                            if (!groupList || groupList.length === 0) return null

                            return (
                                <section key={group}>
                                    <div className="mb-2 flex items-center justify-between px-0.5">
                                        <h2 className="text-sm font-medium text-foreground">
                                            {group === "CORPORATE"
                                                ? "Corporate clients"
                                                : group === "INDIVIDUAL"
                                                ? "Individual clients"
                                                : group}
                                        </h2>
                                        <span className="text-xs text-muted-foreground">{groupList.length}</span>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                                        {/* Desktop table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full border-collapse text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                                        <th className="px-3 py-2.5 font-medium">Code</th>
                                                        <th className="px-3 py-2.5 font-medium">Customer</th>
                                                        <th className="px-3 py-2.5 font-medium">Business unit</th>
                                                        <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                                                            Contact
                                                        </th>
                                                        <th className="hidden px-3 py-2.5 font-medium xl:table-cell">
                                                            Terms
                                                        </th>
                                                        <th className="px-3 py-2.5 font-medium">Status</th>
                                                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {groupList.map((c) => (
                                                        <tr key={c.id} className="group transition-colors hover:bg-muted/30">
                                                            <td className="px-3 py-2.5 align-top">
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    {c.code}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 align-top">
                                                                <div className="flex items-start gap-2.5">
                                                                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                                                                        {c.type === "CORPORATE" ? (
                                                                            <Building2 size={15} />
                                                                        ) : (
                                                                            <User size={15} />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-medium text-foreground">
                                                                            {c.name}
                                                                        </p>
                                                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                                            {c.company || "Direct entity"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 align-top">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {c.businessCategories &&
                                                                    c.businessCategories.length > 0 ? (
                                                                        c.businessCategories.map((biz) => (
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
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="hidden px-3 py-2.5 align-top lg:table-cell">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                        <Mail size={11} className="flex-shrink-0" />
                                                                        <span className="max-w-[160px] truncate">
                                                                            {c.email || "—"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                        <Phone size={11} className="flex-shrink-0" />
                                                                        <span>{c.phone || "—"}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="hidden px-3 py-2.5 align-top xl:table-cell">
                                                                <div className="space-y-1 text-[11px]">
                                                                    <p className="flex items-center gap-1.5 text-foreground">
                                                                        <CreditCard size={11} />
                                                                        <span className="tabular-nums">
                                                                            Rp {c.creditLimit.toLocaleString()}
                                                                        </span>
                                                                    </p>
                                                                    <p className="flex items-center gap-1.5 text-muted-foreground">
                                                                        <Calendar size={11} />
                                                                        {c.paymentTerms || "COD"}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 align-top">
                                                                <StatusPill active={c.isActive} />
                                                            </td>
                                                            <td className="px-3 py-2.5 align-top">
                                                                <div className="flex items-center justify-end gap-0.5">
                                                                    <Button
                                                                        onClick={() => handleEdit(c)}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Edit customer"
                                                                        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                    >
                                                                        <Edit size={15} />
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleDelete(c.id)}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Delete customer"
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

                                        {/* Mobile list */}
                                        <div className="divide-y divide-border md:hidden">
                                            {groupList.map((c) => (
                                                <div key={c.id} className="flex flex-col gap-3 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex min-w-0 items-start gap-2.5">
                                                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                                                                {c.type === "CORPORATE" ? (
                                                                    <Building2 size={15} />
                                                                ) : (
                                                                    <User size={15} />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {c.name}
                                                                </p>
                                                                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                                                    {c.code}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-shrink-0 items-center gap-0.5">
                                                            <Button
                                                                onClick={() => handleEdit(c)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-md text-muted-foreground"
                                                            >
                                                                <Edit size={14} />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleDelete(c.id)}
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-md text-muted-foreground"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-2.5">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-muted-foreground">
                                                                Contact
                                                            </p>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                                                                <Mail size={10} className="flex-shrink-0" />
                                                                <span className="truncate">{c.email || "—"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                                                                <Phone size={10} className="flex-shrink-0" />
                                                                <span>{c.phone || "—"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-muted-foreground">
                                                                Terms
                                                            </p>
                                                            <p className="flex items-center gap-1.5 text-[11px] tabular-nums text-foreground">
                                                                <CreditCard size={10} className="flex-shrink-0" />
                                                                Rp {c.creditLimit.toLocaleString()}
                                                            </p>
                                                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                <Calendar size={10} className="flex-shrink-0" />
                                                                {c.paymentTerms || "COD"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Users size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No customers found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {searchQuery
                                ? "Try adjusting your search or filter to find what you are looking for."
                                : "Add your first customer to start managing relationships."}
                        </p>
                        <Button onClick={handleCreate} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Add customer
                        </Button>
                    </div>
                )}
            </div>

            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customer={editingCustomer}
                onSuccess={fetchCustomers}
            />
        </div>
    )
}

function CustomerModal({
    isOpen,
    onClose,
    customer,
    onSuccess,
}: {
    isOpen: boolean
    onClose: () => void
    customer: Customer | null
    onSuccess: () => void
}) {
    const [formData, setFormData] = useState<Partial<Customer>>({
        code: "",
        name: "",
        type: "CORPORATE",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        taxAddress: "",
        company: "",
        creditLimit: 0,
        paymentTerms: "NET 30",
        businessCategoryId: "",
        businessCategories: [],
        isActive: true,
        pics: [],
    })

    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchBusinessCategories()
    }, [])

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
        if (customer) {
            setFormData({
                ...customer,
                businessCategories: customer.businessCategories || [],
                pics: customer.pics || [],
            })
        } else {
            setFormData({
                code: `CUST-${Date.now().toString().slice(-6)}`,
                name: "",
                type: "CORPORATE",
                email: "",
                phone: "",
                address: "",
                taxId: "",
                taxAddress: "",
                company: "",
                creditLimit: 0,
                paymentTerms: "NET 30",
                businessCategories: [],
                isActive: true,
                pics: [],
            })
        }
    }, [customer, isOpen])

    const handleAddPIC = () => {
        setFormData({
            ...formData,
            pics: [...(formData.pics || []), { name: "", department: "", email: "", phone: "" }],
        })
    }

    const handleRemovePIC = (index: number) => {
        const newPics = [...(formData.pics || [])]
        newPics.splice(index, 1)
        setFormData({ ...formData, pics: newPics })
    }

    const handlePICChange = (index: number, field: keyof CustomerPIC, value: string) => {
        const newPics = [...(formData.pics || [])]
        newPics[index] = { ...newPics[index], [field]: value }
        setFormData({ ...formData, pics: newPics })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const method = customer ? "PUT" : "POST"
        const url = customer
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customer.id}`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/customers`

        try {
            const { businessCategories, ...otherData } = formData
            const payload = {
                ...otherData,
                businessCategoryIds: businessCategories?.map((b) => b.id) || [],
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                const errorData = await res.json()
                console.error("[FRONTEND] Server Error:", errorData)
                alert(`Error: ${errorData.message || "Failed to save customer"}`)
            }
        } catch (error) {
            console.error("[FRONTEND] Network Error:", error)
            alert("Network error. Please check if the server is running.")
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
                        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {customer ? "Edit customer" : "New customer"}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">
                                        {customer ? "Update client details" : "Add a client to your registry"}
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
                            id="customer-form"
                            onSubmit={handleSubmit}
                            className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-5"
                        >
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Briefcase size={14} className="text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">Company details</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Customer code" required>
                                        <input
                                            required
                                            value={formData.code || ""}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className={`${inputClass} font-mono uppercase`}
                                        />
                                    </Field>
                                    <Field label="Entity type">
                                        <select
                                            value={formData.type || "CORPORATE"}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className={`${inputClass} cursor-pointer`}
                                        >
                                            <option value="CORPORATE">Corporate (B2B)</option>
                                            <option value="INDIVIDUAL">Individual (B2C)</option>
                                        </select>
                                    </Field>
                                    <Field label="Full name / display name" required className="sm:col-span-2">
                                        <input
                                            required
                                            value={formData.name || ""}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. PT Global Teknologi Solusi"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Parent company" className="sm:col-span-2">
                                        <input
                                            value={formData.company || ""}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            placeholder="Optional"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                <Field label="Business units" required>
                                    <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                                        {businessCategories.length === 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                No business units available
                                            </span>
                                        )}
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
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                                                        isSelected
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                                                    }`}
                                                >
                                                    {biz.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {(!formData.businessCategories || formData.businessCategories.length === 0) && (
                                        <p className="text-[11px] text-rose-500">
                                            Select at least one business unit
                                        </p>
                                    )}
                                </Field>
                            </section>

                            <section className="space-y-4 border-t border-border pt-5">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">Contact information</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Email address">
                                        <input
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Phone number">
                                        <input
                                            value={formData.phone || ""}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Address" className="sm:col-span-2">
                                        <textarea
                                            rows={2}
                                            value={formData.address || ""}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className={textareaClass}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className="space-y-4 border-t border-border pt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-muted-foreground" />
                                        <h3 className="text-sm font-semibold text-foreground">Points of contact</h3>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddPIC}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg px-3 text-xs font-medium"
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Add PIC
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {formData.pics?.map((pic, index) => (
                                        <div key={index} className="rounded-lg border border-border p-3">
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="text-xs font-medium text-foreground">
                                                    Contact {index + 1}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePIC(index)}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <Field label="Full name">
                                                    <input
                                                        required
                                                        value={pic.name}
                                                        onChange={(e) =>
                                                            handlePICChange(index, "name", e.target.value)
                                                        }
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="Department">
                                                    <input
                                                        required
                                                        value={pic.department}
                                                        onChange={(e) =>
                                                            handlePICChange(index, "department", e.target.value)
                                                        }
                                                        placeholder="e.g. Procurement"
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="Email">
                                                    <input
                                                        type="email"
                                                        value={pic.email || ""}
                                                        onChange={(e) =>
                                                            handlePICChange(index, "email", e.target.value)
                                                        }
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field label="Phone">
                                                    <input
                                                        value={pic.phone || ""}
                                                        onChange={(e) =>
                                                            handlePICChange(index, "phone", e.target.value)
                                                        }
                                                        className={inputClass}
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    ))}

                                    {(!formData.pics || formData.pics.length === 0) && (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-muted-foreground">
                                            <User size={22} />
                                            <p className="mt-2 text-xs">No contacts registered</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4 border-t border-border pt-5">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">Tax & financial terms</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Tax ID (NPWP)">
                                        <input
                                            value={formData.taxId || ""}
                                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Credit limit (Rp)">
                                        <input
                                            type="number"
                                            value={formData.creditLimit ?? 0}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value)
                                                setFormData({
                                                    ...formData,
                                                    creditLimit: isNaN(val) ? 0 : val,
                                                })
                                            }}
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Payment terms">
                                        <input
                                            value={formData.paymentTerms || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, paymentTerms: e.target.value })
                                            }
                                            placeholder="e.g. NET 30"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Registered tax address" className="sm:col-span-2">
                                        <textarea
                                            rows={2}
                                            value={formData.taxAddress || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, taxAddress: e.target.value })
                                            }
                                            className={textareaClass}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                <div>
                                    <p className="text-xs font-medium text-foreground">Active partnership</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Enable or disable trading for this client
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                                        formData.isActive ? "bg-primary" : "bg-muted-foreground/30"
                                    }`}
                                >
                                    <motion.span
                                        animate={{ x: formData.isActive ? 22 : 2 }}
                                        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                                    />
                                </button>
                            </section>
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
                                form="customer-form"
                                disabled={loading}
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                <Save size={15} className="mr-1.5" />
                                {loading ? "Saving..." : customer ? "Save changes" : "Create customer"}
                            </Button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
