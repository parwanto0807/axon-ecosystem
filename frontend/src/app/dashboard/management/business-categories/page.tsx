"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    LayoutGrid,
    X,
    Save,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Building2,
    ChevronRight,
    SearchX
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"

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

export default function BusinessCategoriesPage() {
    const { data: session } = useSession()
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
                method: 'DELETE'
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

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Business Categories</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-bold px-2 py-0 text-[10px] uppercase tracking-widest">
                                    {categories.length} TOTAL UNITS
                                </Badge>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">• Multi-Business Management</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" size={18} />
                        <input
                            type="text"
                            placeholder="Find business unit..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                        />
                    </div>
                    <Button
                        onClick={() => {
                            setSelectedCategory(null)
                            setIsModalOpen(true)
                        }}
                        className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-black text-xs uppercase tracking-[0.2em]">New Unit</span>
                    </Button>
                </div>
            </div>

            {/* Grid Section */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm" />
                    ))}
                </div>
            ) : filteredCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategories.map(cat => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shadow-inner">
                                        <Building2 size={28} />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setSelectedCategory(cat)
                                                setIsModalOpen(true)
                                            }}
                                            className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(cat.id)}
                                            className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 truncate group-hover:text-indigo-600 transition-colors">
                                    {cat.name}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 line-clamp-2 min-h-[2.5rem] mb-6 leading-relaxed">
                                    {cat.description || "No description provided for this business unit."}
                                </p>

                                <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-50">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Products</p>
                                        <p className="text-sm font-black text-slate-900">{cat._count?.products || 0}</p>
                                    </div>
                                    <div className="text-center border-x border-slate-50 px-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Users</p>
                                        <p className="text-sm font-black text-slate-900">{cat._count?.employees || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projects</p>
                                        <p className="text-sm font-black text-slate-900">{cat._count?.assets || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-24 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                        <SearchX size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Business Units Found</h2>
                    <p className="text-slate-500 max-w-md mt-2 font-medium">We couldn't find any results matching your search criteria. Try adjusting your filters or creating a new unit.</p>
                </div>
            )}

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                category={selectedCategory}
                onSuccess={fetchCategories}
            />
        </div>
    )
}

function CategoryModal({ isOpen, onClose, category, onSuccess }: { isOpen: boolean, onClose: () => void, category: BusinessCategory | null, onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: "",
        description: ""
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || ""
            })
        } else {
            setFormData({
                name: "",
                description: ""
            })
        }
    }, [category])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const method = category ? 'PUT' : 'POST'
            const url = category
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/business-categories/${category.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                            <LayoutGrid size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                                {category ? 'Edit' : 'New'} Business Unit
                                            </h2>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Multi-Business Setup</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                        <X size={20} />
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Name <span className="text-rose-500">*</span></label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. IT SERVICE SOLUTIONS"
                                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-300 placeholder:uppercase"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Description</label>
                                        <textarea
                                            rows={4}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Briefly describe the business operations for this unit..."
                                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none placeholder:text-slate-300 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
                                <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl font-black text-xs uppercase tracking-[0.2em] px-8 h-12 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    Cancel
                                </Button>
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    className="rounded-2xl font-black text-xs uppercase tracking-[0.2em] px-10 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {category ? 'Update' : 'Launch'} Unit
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
