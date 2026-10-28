"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Edit2, Trash2, LayoutGrid, X, Save, Building2, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BusinessCategory {
    id: string
    name: string
    description: string | null
    _count?: {
        products: number
        customers: number
        vendors: number
        employees: number
        assets: number
    }
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

export default function BusinessCategoriesPage() {
    const [categories, setCategories] = useState<BusinessCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null)

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            const data = await res.json()
            setCategories(data)
        } catch (error) {
            console.error("Error fetching business categories:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this business category? This might affect related records.")) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories/${id}`, {
                method: "DELETE",
            })
            if (res.ok) {
                fetchCategories()
            } else {
                const error = await res.json()
                alert(error.message || "Failed to delete category")
            }
        } catch (error) {
            console.error("Error deleting category:", error)
        }
    }

    const filteredCategories = categories.filter(
        (cat) =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Business Categories</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Organize data across your business units
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setSelectedCategory(null)
                            setIsModalOpen(true)
                        }}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        <Plus size={16} className="mr-1.5" />
                        New category
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
                            placeholder="Search category"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredCategories.length}{" "}
                        {filteredCategories.length === 1 ? "category" : "categories"}
                    </span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" />
                        ))}
                    </div>
                ) : filteredCategories.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCategories.map((cat) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                            >
                                <div className="mb-3 flex items-start justify-between gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                                        <Building2 size={17} />
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Edit category"
                                            onClick={() => {
                                                setSelectedCategory(cat)
                                                setIsModalOpen(true)
                                            }}
                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <Edit2 size={15} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Delete category"
                                            onClick={() => handleDelete(cat.id)}
                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                        >
                                            <Trash2 size={15} />
                                        </Button>
                                    </div>
                                </div>

                                <h3 className="truncate text-sm font-medium text-foreground">{cat.name}</h3>
                                <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-muted-foreground">
                                    {cat.description || "No description provided."}
                                </p>

                                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Products</p>
                                        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                                            {cat._count?.products || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Users</p>
                                        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                                            {cat._count?.employees || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Assets</p>
                                        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                                            {cat._count?.assets || 0}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <SearchX size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No business categories found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {searchTerm
                                ? "Try adjusting your search to find what you are looking for."
                                : "Create your first business category to start organizing data."}
                        </p>
                    </div>
                )}
            </div>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                category={selectedCategory}
                onSuccess={fetchCategories}
            />
        </div>
    )
}

function CategoryModal({
    isOpen,
    onClose,
    category,
    onSuccess,
}: {
    isOpen: boolean
    onClose: () => void
    category: BusinessCategory | null
    onSuccess: () => void
}) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || "",
            })
        } else {
            setFormData({
                name: "",
                description: "",
            })
        }
    }, [category])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const method = category ? "PUT" : "POST"
            const url = category
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/business-categories/${category.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                const error = await res.json()
                alert(error.message || "Failed to save category")
            }
        } catch (error) {
            console.error("Error saving category:", error)
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
                        className="relative w-full overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl"
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                        <LayoutGrid size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            {category ? "Edit category" : "New category"}
                                        </h2>
                                        <p className="text-[11px] text-muted-foreground">
                                            {category ? "Update business unit details" : "Create a business unit"}
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
                            </div>

                            <div className="space-y-4 p-4 sm:p-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-muted-foreground">
                                        Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. IT Service Solutions"
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-muted-foreground">
                                        Description
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Briefly describe the business operations for this unit..."
                                        className={textareaClass}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    {loading ? (
                                        <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    ) : (
                                        <Save size={15} className="mr-1.5" />
                                    )}
                                    {category ? "Save changes" : "Create category"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
