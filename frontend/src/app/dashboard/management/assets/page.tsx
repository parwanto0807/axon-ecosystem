"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Edit, Trash2, Box, ChevronLeft, X, Save,
    User, Calendar, Settings, Monitor,
    Wind, Smartphone, HardDrive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
interface BusinessCategory {
    id: string;
    name: string;
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

const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
    AC: { label: 'Air Conditioner', icon: Wind, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    IT: { label: 'IT Equipment', icon: Monitor, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    ELECTRONIC: { label: 'Electronic', icon: Smartphone, color: 'bg-purple-50 text-purple-700 border-purple-100' },
    VEHICLE: { label: 'Vehicle', icon: HardDrive, color: 'bg-orange-50 text-orange-700 border-orange-100' },
    GENERAL: { label: 'General Asset', icon: Box, color: 'bg-slate-50 text-slate-700 border-slate-100' }
}

const STATUS_STYLE: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    INACTIVE: 'bg-slate-50 text-slate-500 border-slate-100',
    BROKEN: 'bg-rose-50 text-rose-700 border-rose-100',
    REPLACED: 'bg-amber-50 text-amber-700 border-amber-100'
}

import { useSession } from "next-auth/react"

export default function AssetsPage() {
    const { data: session } = useSession()
    const userRole = session?.user?.role || 'USER'
    const canDelete = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

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
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const assetsUrl = selectedBusinessCategoryId 
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets`
            
            const [assetsRes, customersRes, bizRes] = await Promise.all([
                fetch(assetsUrl),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            ])
            const assetsData = await assetsRes.json()
            const customersData = await customersRes.json()
            const bizData = await bizRes.json()
            setAssets(assetsData)
            setCustomers(customersData)
            setBusinessCategories(bizData)
        } catch {
            // Error logged above or handled
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedBusinessCategoryId])

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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets/${id}`, { method: 'DELETE' })
            fetchData()
        } catch {
            // Error handled
        }
    }

    const filteredAssets = assets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.customer?.name && a.customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = !selectedCategory || a.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="p-4 md:p-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 md:mb-12">
                <div className="flex items-center gap-3 md:gap-4">
                    <Link href="/dashboard/management">
                        <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-xl border border-border">
                            <ChevronLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
                            Master <span className="text-indigo-600">Assets</span>
                        </h1>
                        <p className="text-[10px] md:text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">Customer Unit Management</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={(e) => setSelectedBusinessCategoryId(e.target.value)}
                        className="w-full sm:w-48 bg-white md:bg-secondary/50 border border-slate-200 md:border-border rounded-xl md:rounded-2xl py-3 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm md:shadow-none focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none cursor-pointer"
                    >
                        <option value="">All Business Units</option>
                        {businessCategories.map(biz => (
                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                        ))}
                    </select>

                    <div className="relative group flex-1 sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Cari asset, SN, pelanggan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white md:bg-secondary/50 border border-slate-200 md:border-border rounded-xl md:rounded-2xl py-3 pl-11 pr-4 text-xs font-black uppercase tracking-tight shadow-sm md:shadow-none focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                        />
                    </div>
                    <Button
                        onClick={handleCreate}
                        className="hidden md:flex rounded-xl font-bold shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 px-6 h-11"
                    >
                        <Plus size={18} className="mr-2" />
                        New Asset
                    </Button>
                </div>
            </header>

            {/* Mobile Native Shortcuts */}
            <div className="lg:hidden mb-8 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-4 pb-2">
                <button 
                    onClick={handleCreate}
                    className="flex flex-col items-center gap-2 group shrink-0"
                >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-active:scale-90 transition-transform">
                        <Plus size={24} strokeWidth={3} />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Tambah</span>
                </button>

                <div className="w-px h-8 bg-slate-200 shrink-0" />

                <button 
                    onClick={() => setSelectedCategory(null)}
                    className="flex flex-col items-center gap-2 group shrink-0"
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-active:scale-90 ${!selectedCategory ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' : 'bg-white border-slate-100 text-slate-400 font-bold'}`}>
                        <Box size={22} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tight ${!selectedCategory ? 'text-slate-900' : 'text-slate-400'}`}>Semua</span>
                </button>

                {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const Icon = cat.icon
                    const isActive = selectedCategory === key
                    const bgColor = cat.color.split(' ')[0]
                    const textColor = cat.color.split(' ')[1]
                    
                    return (
                        <button 
                            key={key}
                            onClick={() => setSelectedCategory(isActive ? null : key)}
                            className="flex flex-col items-center gap-2 group shrink-0"
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-active:scale-90 shadow-sm ${isActive ? `${bgColor} border-current ${textColor} shadow-lg scale-105` : 'bg-white border-slate-100 text-slate-400'}`}>
                                <Icon size={22} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{cat.label.split(' ')[0]}</span>
                        </button>
                    )
                })}
            </div>

            <div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    </div>
                ) : filteredAssets.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/30 border-b border-border">
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Asset Name & Category</th>
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">S/N & Location</th>
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Owner / Customer</th>
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Service Schedule</th>
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground w-32">Status</th>
                                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredAssets.map((asset) => {
                                    const CatIcon = CATEGORIES[asset.category]?.icon || Box
                                    return (
                                        <tr key={asset.id} className="group hover:bg-secondary/10 transition-colors">
                                            <td className="px-6 py-5 align-top">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${CATEGORIES[asset.category]?.color || 'bg-slate-50 text-slate-400'}`}>
                                                        <CatIcon size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-foreground uppercase tracking-tight text-base leading-tight group-hover:text-indigo-600 transition-colors truncate">
                                                            {asset.name}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mt-1">
                                                            {asset.brand} {asset.model}
                                                        </p>
                                                        <div className="mt-1">
                                                            <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                                                                {asset.businessCategory?.name || 'GENERIC'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] font-black uppercase tracking-tighter text-slate-700">
                                                        SN: <span className="text-indigo-600">{asset.serialNumber || '—'}</span>
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80">
                                                        <Settings size={12} className="text-slate-400" />
                                                        <span>{asset.location || '—'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/70">
                                                    <User size={12} className="text-indigo-600 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{asset.customer?.name || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                        <Calendar size={12} />
                                                        <span>Next: {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : '—'}</span>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                                                        Last: {asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : '—'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[asset.status] || 'bg-slate-50'}`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-top text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button onClick={() => handleEdit(asset)} variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                                                        <Edit size={16} />
                                                    </Button>
                                                    {canDelete && (
                                                        <Button onClick={() => handleDelete(asset.id)} variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                                            <Trash2 size={16} />
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
                ) : (
                    <Card className="glass-card border-dashed py-24 border-2 border-border/50">
                        <CardContent className="flex flex-col items-center justify-center">
                            <Box size={80} className="text-muted-foreground mb-6 opacity-10 animate-pulse" />
                            <p className="text-2xl font-black text-foreground mb-2 tracking-tight uppercase">No Assets Found</p>
                            <p className="text-muted-foreground font-medium mb-10 max-w-sm text-center">Manage your customer's hardware and units here for automated service scheduling.</p>
                            <Button
                                onClick={handleCreate}
                                className="rounded-2xl font-black bg-indigo-600 text-white px-10 py-6 text-lg shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all"
                            >
                                <Plus size={24} className="mr-3" />
                                Add Your First Asset
                            </Button>
                        </CardContent>
                    </Card>
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

function AssetModal({ isOpen, onClose, asset, customers, businessCategories, onSuccess }: { isOpen: boolean, onClose: () => void, asset: CustomerAsset | null, customers: any[], businessCategories: BusinessCategory[], onSuccess: () => void }) {
    const [formData, setFormData] = useState<Partial<CustomerAsset>>({
        name: '',
        customerId: '',
        category: 'AC',
        brand: '',
        model: '',
        serialNumber: '',
        location: '',
        specifications: {},
        installationDate: '',
        lastServiceDate: '',
        nextServiceDate: '',
        status: 'ACTIVE',
        notes: '',
        businessCategoryId: ''
    })

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (asset) {
            setFormData({
                ...asset,
                installationDate: asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : '',
                lastServiceDate: asset.lastServiceDate ? new Date(asset.lastServiceDate).toISOString().split('T')[0] : '',
                nextServiceDate: asset.nextServiceDate ? new Date(asset.nextServiceDate).toISOString().split('T')[0] : '',
            })
        } else {
            setFormData({
                name: '',
                customerId: '',
                category: 'AC',
                brand: '',
                model: '',
                serialNumber: '',
                location: '',
                specifications: {},
                installationDate: new Date().toISOString().split('T')[0],
                lastServiceDate: '',
                nextServiceDate: '',
                status: 'ACTIVE',
                notes: '',
                businessCategoryId: ''
            })
        }
    }, [asset, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const method = asset ? 'PUT' : 'POST'
        const url = asset ? `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets/${asset.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets`

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-card border border-border shadow-2xl md:rounded-[2.5rem] overflow-hidden max-h-[95vh] flex flex-col">
                        
                        <header className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-white relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <Box size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">
                                        {asset ? 'Edit' : 'New'} <span className="text-indigo-600">Asset</span>
                                    </h2>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest underline decoration-indigo-600/30">Unit Categorization</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                <X size={20} />
                            </Button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customer Owner</label>
                                    <select
                                        required
                                        value={formData.customerId}
                                        onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Name</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. AC Daikin 2nd Floor"
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 ml-1">Business Unit *</label>
                                    <select
                                        required
                                        value={formData.businessCategoryId || ''}
                                        onChange={e => setFormData({ ...formData, businessCategoryId: e.target.value })}
                                        className="w-full bg-rose-50/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    >
                                        <option value="">Select Business Unit</option>
                                        {businessCategories.map(biz => (
                                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    >
                                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand</label>
                                    <input
                                        value={formData.brand || ''}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Model / Type</label>
                                    <input
                                        value={formData.model || ''}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Serial Number</label>
                                    <input
                                        value={formData.serialNumber || ''}
                                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-600/50 outline-none uppercase"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Installed Location</label>
                                    <input
                                        value={formData.location || ''}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g. Lt. 2, R. Direktur"
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Installation Date</label>
                                    <input
                                        type="date"
                                        value={formData.installationDate || ''}
                                        onChange={e => setFormData({ ...formData, installationDate: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600/50 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Next Service Reminder</label>
                                    <input
                                        type="date"
                                        value={formData.nextServiceDate || ''}
                                        onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })}
                                        className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Technical Specs & Notes</label>
                                <textarea
                                    rows={3}
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600/50 outline-none resize-none"
                                />
                            </div>

                            <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${formData.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Operational Status</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Current hardware viability</p>
                                    </div>
                                </div>
                                <select 
                                    value={formData.status} 
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="BROKEN">BROKEN</option>
                                    <option value="REPLACED">REPLACED</option>
                                </select>
                            </div>
                        </form>

                        <footer className="p-6 md:p-8 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-secondary/5 relative z-10">
                            <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-11 px-8">Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 h-11 px-10"
                            >
                                <Save size={18} className="mr-2" />
                                {loading ? 'Saving...' : (asset ? 'Update' : 'Register') + ' Asset'}
                            </Button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
