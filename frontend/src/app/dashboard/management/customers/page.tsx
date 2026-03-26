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
    MapPin,
    FileText,
    ChevronLeft,
    Building2,
    X,
    Save,
    CreditCard,
    Calendar,
    Briefcase,
    User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, { method: 'DELETE' })
            fetchCustomers()
        } catch (error) {
            console.error("Error deleting customer:", error)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const groupedCustomers = filteredCustomers.reduce((acc, customer) => {
        const type = customer.type || 'OTHERS'
        if (!acc[type]) acc[type] = []
        acc[type].push(customer)
        return acc
    }, {} as Record<string, Customer[]>)

    const groupOrder = Object.keys(groupedCustomers).sort((a, b) => {
        if (a === 'CORPORATE') return -1
        if (b === 'CORPORATE') return 1
        if (a === 'INDIVIDUAL') return -1
        if (b === 'INDIVIDUAL') return 1
        return a.localeCompare(b)
    })

    return (
        <div className="p-4 md:p-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-12">
                <div className="flex items-center gap-3 md:gap-4">
                    <Link href="/dashboard/management">
                        <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-xl border border-border">
                            <ChevronLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
                            Master <span className="text-primary">Customer</span>
                        </h1>
                        <p className="text-[10px] md:text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">Enterprise Client Registry</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={(e) => setSelectedBusinessCategoryId(e.target.value)}
                        className="w-full sm:w-48 bg-white border border-border rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm cursor-pointer"
                    >
                        <option value="">All Business Units</option>
                        {businessCategories.map(biz => (
                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                        ))}
                    </select>

                    <div className="relative group flex-1 sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase font-black tracking-tight"
                        />
                    </div>
                    <Button
                        onClick={handleCreate}
                        className="rounded-xl font-bold shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 px-6 h-11"
                    >
                        <Plus size={18} className="mr-2" />
                        New Customer
                    </Button>
                </div>
            </header>

            <div>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : filteredCustomers.length > 0 ? (
                    <div className="space-y-12">
                        {groupOrder.map((group) => {
                            const groupList = groupedCustomers[group]
                            if (!groupList || groupList.length === 0) return null

                            return (
                                <section key={group} className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                                            {group === 'CORPORATE' ? 'Corporate Clients' : 'Individual Clients'}
                                            <span className="text-indigo-600 ml-2">({groupList.length})</span>
                                        </h2>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
                                        {/* DESKTOP & TABLET: PROFESSIONAL TABLE */}
                                        <div className="hidden md:block overflow-x-auto no-scrollbar">
                                            <table className="w-full text-sm text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-secondary/30 border-b border-border">
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground w-24">Code</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Entity Name & Details</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Business Unit</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground hidden lg:table-cell">Contact Info</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground hidden xl:table-cell">Financial Terms</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground w-32">Status</th>
                                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right w-24">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {groupList.map((c) => (
                                                        <tr key={c.id} className="group hover:bg-secondary/10 transition-colors">
                                                            <td className="px-6 py-5 align-top">
                                                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-tighter">
                                                                    {c.code}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 align-top">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                                                                        {c.type === 'CORPORATE' ? <Building2 size={20} /> : <User size={20} />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-black text-foreground uppercase tracking-tight text-base leading-tight group-hover:text-primary transition-colors truncate">
                                                                            {c.name}
                                                                        </p>
                                                                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mt-1">
                                                                            {c.company || 'Direct Entity'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 align-top">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {c.businessCategories && c.businessCategories.length > 0 ? (
                                                                        c.businessCategories.map(biz => (
                                                                            <Badge key={biz.id} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-black px-2 py-0.5 text-[10px] uppercase tracking-widest">
                                                                                {biz.name}
                                                                            </Badge>
                                                                        ))
                                                                    ) : (
                                                                        <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-slate-200 font-black px-2 py-0.5 text-[10px] uppercase tracking-widest">
                                                                            GENERIC
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 align-top hidden lg:table-cell">
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/70">
                                                                        <Mail size={12} className="text-primary" />
                                                                        <span className="truncate max-w-[150px]">{c.email || '—'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/70">
                                                                        <Phone size={12} className="text-primary" />
                                                                        <span>{c.phone || '—'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 align-top hidden xl:table-cell">
                                                                <div className="space-y-1.5 text-[11px] font-bold">
                                                                    <p className="text-emerald-600 uppercase tracking-tighter flex items-center gap-1.5">
                                                                        <CreditCard size={12} /> Limit: {c.creditLimit.toLocaleString()}
                                                                    </p>
                                                                    <p className="text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                        <Calendar size={12} /> Terms: {c.paymentTerms || 'COD'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 align-top">
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
                                                                        {c.isActive ? 'Active' : 'Disabled'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 align-top text-right">
                                                                <div className="flex items-center justify-end gap-1 translate-y-[-4px]">
                                                                    <Button
                                                                        onClick={() => handleEdit(c)}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="w-9 h-9 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleDelete(c.id)}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="w-9 h-9 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* MOBILE: PROFESSIONAL LIST VIEW */}
                                        <div className="md:hidden divide-y divide-border/40">
                                            {groupList.map((c) => (
                                                <div key={c.id} className="p-5 flex flex-col gap-4 active:bg-secondary/10 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 shrink-0">
                                                                {c.type === 'CORPORATE' ? <Building2 size={20} /> : <User size={20} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase tracking-tighter">
                                                                        {c.code}
                                                                    </span>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                                </div>
                                                                <p className="font-black text-foreground uppercase tracking-tight text-sm leading-tight truncate">
                                                                    {c.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                            <Button onClick={() => handleEdit(c)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400">
                                                                <Edit size={14} />
                                                            </Button>
                                                            <Button onClick={() => handleDelete(c.id)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400">
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                                                        <div className="space-y-1">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Contact</p>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/80 truncate">
                                                                <Mail size={10} className="text-primary shrink-0" />
                                                                <span className="truncate">{c.email || '—'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/80">
                                                                <Phone size={10} className="text-primary shrink-0" />
                                                                <span>{c.phone || '—'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Terms</p>
                                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter flex items-center gap-1.5">
                                                                <CreditCard size={10} className="shrink-0" /> {c.creditLimit.toLocaleString()}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                <Calendar size={10} className="shrink-0" /> {c.paymentTerms || 'COD'}
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
                    <Card className="glass-card border-dashed py-24 border-2 border-border/50">
                        <CardContent className="flex flex-col items-center justify-center">
                            <Users size={80} className="text-muted-foreground mb-6 opacity-10 animate-pulse" />
                            <p className="text-2xl font-black text-foreground mb-2 tracking-tight uppercase">No Customers Found</p>
                            <p className="text-muted-foreground font-medium mb-10 max-w-sm text-center">Maintain your business relationships by adding your first enterprise client.</p>
                            <Button
                                onClick={handleCreate}
                                className="rounded-2xl font-black bg-indigo-600 text-white px-10 py-6 text-lg shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all"
                            >
                                <Plus size={24} className="mr-3" />
                                New Customer
                            </Button>
                        </CardContent>
                    </Card>
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

function CustomerModal({ isOpen, onClose, customer, onSuccess }: { isOpen: boolean, onClose: () => void, customer: Customer | null, onSuccess: () => void }) {
    const [formData, setFormData] = useState<Partial<Customer>>({
        code: '',
        name: '',
        type: 'CORPORATE',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        taxAddress: '',
        company: '',
        creditLimit: 0,
        paymentTerms: 'NET 30',
        businessCategoryId: '',
        businessCategories: [],
        isActive: true,
        pics: []
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
                pics: customer.pics || []
            })
        } else {
            setFormData({
                code: `CUST-${Date.now().toString().slice(-6)}`,
                name: '',
                type: 'CORPORATE',
                email: '',
                phone: '',
                address: '',
                taxId: '',
                taxAddress: '',
                company: '',
                creditLimit: 0,
                paymentTerms: 'NET 30',
                businessCategories: [],
                isActive: true,
                pics: []
            })
        }
    }, [customer, isOpen])

    const handleAddPIC = () => {
        setFormData({
            ...formData,
            pics: [...(formData.pics || []), { name: '', department: '', email: '', phone: '' }]
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
        const method = customer ? 'PUT' : 'POST'
        const url = customer ? `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customer.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/customers`

        try {
            console.log(`[FRONTEND] Submitting ${method} to ${url}`, formData)
            
            // Prepare payload
            const { businessCategories, ...otherData } = formData;
            const payload = {
                ...otherData,
                businessCategoryIds: businessCategories?.map(b => b.id) || []
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                const errorData = await res.json()
                console.error("[FRONTEND] Server Error:", errorData)
                alert(`Error: ${errorData.message || 'Failed to save customer'}`)
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-card border border-border shadow-2xl md:rounded-[2.5rem] overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col mx-2 md:mx-0"
                    >
                        <header className="p-5 md:p-8 border-b border-border flex items-center justify-between bg-white relative z-10 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">
                                        {customer ? 'Edit' : 'New'} <span className="text-primary">Customer</span>
                                    </h2>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Client Master Registry</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                <X size={20} />
                            </Button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-8 space-y-8 md:space-y-10">
                            {/* SECTION: BASIC INFO */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <Briefcase size={16} className="text-primary" />
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70">Company Details</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Customer Code</label>
                                        <input
                                            required
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name / Display Name</label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. PT. Global Teknologi Solusi"
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        >
                                            <option value="CORPORATE">CORPORATE (B2B)</option>
                                            <option value="INDIVIDUAL">INDIVIDUAL (B2C)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Parent Company (Optional)</label>
                                        <input
                                            value={formData.company || ''}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-full">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 ml-1">Business Units <span className="text-rose-500">*</span></label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-secondary/20 border border-border rounded-xl min-h-[50px]">
                                            {businessCategories.map(biz => {
                                                const isSelected = formData.businessCategories?.some(b => b.id === biz.id);
                                                return (
                                                    <Badge
                                                        key={biz.id}
                                                        onClick={() => {
                                                            const current = formData.businessCategories || [];
                                                            const next = isSelected 
                                                                ? current.filter(b => b.id !== biz.id)
                                                                : [...current, biz];
                                                            setFormData({ ...formData, businessCategories: next });
                                                        }}
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={`cursor-pointer transition-all px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-none ${
                                                            isSelected 
                                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" 
                                                                : "bg-white hover:bg-secondary text-muted-foreground border-border"
                                                        }`}
                                                    >
                                                        {biz.name}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        {(!formData.businessCategories || formData.businessCategories.length === 0) && (
                                            <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase tracking-tight italic">Please select at least one business unit</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <hr className="border-border/40" />

                            {/* SECTION: CONTACT INFO */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <Mail size={16} className="text-primary" />
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70">Contact Information</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                        <input
                                            value={formData.phone || ''}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Correspondence Address</label>
                                        <textarea
                                            rows={2}
                                            value={formData.address || ''}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <hr className="border-border/40" />

                            {/* SECTION: PICs */}
                            <section>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-indigo-600" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Points of Contact (PIC)</h3>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddPIC}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold border-indigo-600/20 text-indigo-600 hover:bg-indigo-50 h-10 px-4"
                                    >
                                        <Plus size={14} className="mr-1.5" />
                                        Add PIC
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {formData.pics?.map((pic, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-5 md:p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePIC(index)}
                                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">PIC Full Name</label>
                                                    <input
                                                        required
                                                        value={pic.name}
                                                        onChange={e => handlePICChange(index, 'name', e.target.value)}
                                                        className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Department</label>
                                                    <input
                                                        required
                                                        value={pic.department}
                                                        onChange={e => handlePICChange(index, 'department', e.target.value)}
                                                        placeholder="e.g. Procurement"
                                                        className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                                                    <input
                                                        type="email"
                                                        value={pic.email || ''}
                                                        onChange={e => handlePICChange(index, 'email', e.target.value)}
                                                        className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                                    <input
                                                        value={pic.phone || ''}
                                                        onChange={e => handlePICChange(index, 'phone', e.target.value)}
                                                        className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {(!formData.pics || formData.pics.length === 0) && (
                                        <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-50">
                                            <User size={32} className="text-slate-300 mb-2" />
                                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No contacts registered</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <hr className="border-border/40" />

                            {/* SECTION: TAX & FINANCIALS */}
                            <section>
                                <div className="flex items-center gap-2 mb-4 md:mb-6">
                                    <FileText size={16} className="text-primary" />
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70">Tax & Financial Terms</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tax ID (NPWP)</label>
                                        <input
                                            value={formData.taxId || ''}
                                            onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-black focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Credit Limit (Rp)</label>
                                        <input
                                            type="number"
                                            value={formData.creditLimit ?? 0}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, creditLimit: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 md:py-3 text-sm font-black focus:ring-2 focus:ring-emerald-500/50 outline-none text-emerald-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Terms</label>
                                        <input
                                            value={formData.paymentTerms || ''}
                                            onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                            placeholder="e.g. NET 30"
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2 md:col-span-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registered Tax Address</label>
                                        <textarea
                                            rows={2}
                                            value={formData.taxAddress || ''}
                                            onChange={e => setFormData({ ...formData, taxAddress: e.target.value })}
                                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 md:py-3 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-primary/5 rounded-3xl p-6 border border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-foreground">Active Partnership</p>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Enable or disable trading for this client profile</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.isActive ? 'bg-indigo-600' : 'bg-muted'}`}
                                >
                                    <motion.div
                                        animate={{ x: formData.isActive ? 28 : 4 }}
                                        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md text-indigo-600 flex items-center justify-center"
                                    />
                                </button>
                            </section>

                            {/* Hidden submit button to allow Enter key submission */}
                            <button type="submit" className="hidden" />
                        </form>


                        <footer className="p-5 md:p-8 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-secondary/5 relative z-10">
                            <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-11 px-8 active:scale-95 border border-transparent hover:border-border">Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 h-11 px-10 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <Save size={18} className="mr-2" />
                                {loading ? 'Saving...' : (customer ? 'Update' : 'Register') + ' Customer'}
                            </Button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
