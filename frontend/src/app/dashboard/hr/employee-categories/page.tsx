"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Tag, 
    Plus, 
    Search, 
    Edit3, 
    Trash2, 
    ArrowLeft,
    Save,
    X,
    LayoutGrid
} from "lucide-react"
import Link from "next/link"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function EmployeeCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const [formData, setFormData] = useState({ name: "" })

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/hr/employee-categories`)
            const data = await res.json()
            setCategories(data)
        } catch (e) {
            console.error("Failed to fetch categories", e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingCategory 
                ? `${API_BASE}/hr/employee-categories/${editingCategory.id}`
                : `${API_BASE}/hr/employee-categories`
            const method = editingCategory ? 'PUT' : 'POST'
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setIsModalOpen(false)
                setEditingCategory(null)
                setFormData({ name: "" })
                fetchCategories()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus kategori ini? Karyawan di kategori ini akan kehilangan relasi kategorinya.")) return
        try {
            await fetch(`${API_BASE}/hr/employee-categories/${id}`, { method: 'DELETE' })
            fetchCategories()
        } catch (e) {
            console.error(e)
        }
    }

    const openModal = (cat: any = null) => {
        if (cat) {
            setEditingCategory(cat)
            setFormData({ name: cat.name })
        } else {
            setEditingCategory(null)
            setFormData({ name: "" })
        }
        setIsModalOpen(true)
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen pb-24 md:pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/hr/employees">
                            <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                                <ArrowLeft size={18} />
                            </button>
                        </Link>
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Tag className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">KATEGORI KARYAWAN</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[5.5rem]">Data Master Bisnis</p>
                </div>

                <button 
                    onClick={() => openModal()}
                    className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] md:text-xs font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={16} />
                    TAMBAH KATEGORI
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</div>
                ) : categories.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <Tag size={40} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase">Belum ada kategori</p>
                    </div>
                ) : categories.map((cat) => (
                    <motion.div 
                        key={cat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                    <LayoutGrid size={20} className="text-slate-400 group-hover:text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{cat.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kategori Staff</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => openModal(cat)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(cat.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                    {editingCategory ? 'Edit Kategori' : 'Kategori Baru'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Kategori</label>
                                    <input 
                                        autoFocus
                                        required
                                        type="text"
                                        placeholder="Contoh: IT Service, AC Service..."
                                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-sm font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ name: e.target.value })}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} />
                                    {editingCategory ? 'SIMPAN PERUBAHAN' : 'TAMBAH KATEGORI'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
