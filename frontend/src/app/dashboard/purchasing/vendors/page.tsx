"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Users, Search, Edit2, Trash2, Mail, Phone, Building2, MapPin, Loader2, AlertCircle } from "lucide-react"

interface Vendor {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    company: string | null;
    taxId: string | null;
    taxAddress: string | null;
    isActive: boolean;
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<Partial<Vendor>>({
        name: '', email: '', phone: '', company: '', address: '', taxId: '', taxAddress: '', isActive: true
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchVendors = async () => {
        setLoading(true)
        try {
            const res = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/vendors')
            const data = await res.json()
            setVendors(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVendors()
    }, [])

    const handleOpenModal = (vendor?: Vendor) => {
        setError(null)
        if (vendor) {
            setEditingId(vendor.id)
            setFormData(vendor)
        } else {
            setEditingId(null)
            setFormData({ name: '', email: '', phone: '', company: '', address: '', taxId: '', taxAddress: '', isActive: true })
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
                : '${process.env.NEXT_PUBLIC_API_URL}/api/vendors'

            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error('Failed to save vendor')

            await fetchVendors()
            setIsModalOpen(false)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors/${id}`, { method: 'DELETE' })
            fetchVendors()
        } catch (e) {
            console.error(e)
        }
    }

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.company && v.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full font-inter">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Users size={20} className="text-white md:w-6 md:h-6" />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                            Master <span className="text-indigo-600">Vendor</span>
                        </h1>
                    </div>
                    <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-widest mt-1">Procurement Partner Registry</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative group flex-1 sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search vendors, codes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm uppercase font-black tracking-tight"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 h-11 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus size={18} /> <span>New Vendor</span>
                    </button>
                </div>
            </header>

            <main>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-slate-500 ml-3 font-medium">Loading vendors...</p>
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 border-dashed py-20 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase">No vendors found</h3>
                        <p className="text-slate-500 mt-1 font-medium">Maintain your supplier network by adding your first vendor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {filteredVendors.map((vendor, idx) => (
                            <motion.div
                                key={vendor.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-white rounded-3xl border border-slate-200 p-5 md:p-6 hover:shadow-xl hover:shadow-indigo-600/5 hover:border-indigo-200 transition-all relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner shrink-0">
                                            {vendor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                    {vendor.code || 'NO-CODE'}
                                                </span>
                                                <span className={`w-2 h-2 rounded-full ${vendor.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                            </div>
                                            <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight truncate leading-tight transition-colors group-hover:text-indigo-600">
                                                {vendor.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleOpenModal(vendor)} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(vendor.id)} 
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Mail size={14} />
                                                </div>
                                                <span className="truncate">{vendor.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Phone size={14} />
                                                </div>
                                                <span>{vendor.phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <Building2 size={14} />
                                                </div>
                                                <span className="truncate">{vendor.company || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="truncate">{vendor.address || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-bl-[60px] md:rounded-bl-[80px] -mr-12 -mt-12 group-hover:bg-indigo-600/10 transition-colors pointer-events-none" />
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !submitting && setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white w-full max-w-2xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto no-scrollbar mx-2 md:mx-0"
                        >
                            <header className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                            {editingId ? 'Edit' : 'New'} <span className="text-indigo-600">Vendor</span>
                                        </h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Partner Profile Registry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !submitting && setIsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </header>

                            {error && (
                                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-3 text-sm font-medium">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Vendor Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                                            placeholder="PT. Example Supplier"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Company Branch/Group</label>
                                        <input
                                            type="text"
                                            value={formData.company || ''}
                                            onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                                            placeholder="Subsidiary of XYZ"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                                            placeholder="contact@vendor.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
                                        <input
                                            type="text"
                                            value={formData.phone || ''}
                                            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                                            placeholder="+62 812..."
                                        />
                                    </div>

                                    <div className="sm:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Office Address</label>
                                        <textarea
                                            value={formData.address || ''}
                                            onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm resize-none"
                                            rows={2}
                                            placeholder="Full billing or office address..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tax ID (NPWP)</label>
                                        <input
                                            type="text"
                                            value={formData.taxId || ''}
                                            onChange={e => setFormData(p => ({ ...p, taxId: e.target.value }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs md:text-sm font-bold"
                                            placeholder="00.000.000.0-000.000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Status</label>
                                        <select
                                            value={formData.isActive ? 'true' : 'false'}
                                            onChange={e => setFormData(p => ({ ...p, isActive: e.target.value === 'true' }))}
                                            className="w-full px-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                                        >
                                            <option value="true">Active Vendor</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center justify-center gap-2 px-10 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-70 active:scale-95"
                                    >
                                        {submitting && <Loader2 size={18} className="animate-spin" />}
                                        {editingId ? 'Save Changes' : 'Create Vendor'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
