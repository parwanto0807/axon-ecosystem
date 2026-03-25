"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    Briefcase, Clock, Check, Ban, TrendingUp,
    Users, FileText, ShoppingCart, DollarSign,
    ArrowUpRight, ArrowDownRight, Percent,
    BarChart3, LayoutGrid, List, Filter,
    ChevronDown, Calendar, MoreVertical,
    Download, Printer, Share2, Star,
    Building2, Phone, Mail, MapPin,
    Package, Truck, Receipt, PieChart,
    Activity, Target, Award, Zap,
    Settings, Menu, Home, Bell,
    User, LogOut, HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import ProjectDetailModal from "@/components/sales/ProjectDetailModal"
import ProjectPDFModal from "@/components/sales/ProjectPDFModal"
import { generateProjectPDF } from "@/components/sales/ProjectPDFReport"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Customer { id: string; name: string; code: string; email?: string; phone?: string; address?: string }
interface BusinessCategory { id: string; name: string }
interface PreSalesProject {
    id: string; number: string; name: string; status: string; customerId: string; customer: Customer;
    surveys: (FieldSurvey & { expenses: any[] })[];
    quotations: any[];
    salesOrders: (SalesOrder & { items: any[] })[];
    purchaseOrders: any[];
    workOrders: (WorkOrder & { items: any[]; surveyExpenses: any[] })[];
    surveyExpenses: any[];
    createdAt: string; updatedAt?: string; deadline?: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    businessCategoryId?: string | null;
    businessCategory?: BusinessCategory | null;
}

interface FieldSurvey { id: string; number: string; date: string; location: string }
interface SalesOrder { id: string; number: string; grandTotal: number; status: string }
interface WorkOrder { id: string; number: string; status: string; stockMovements: any[] }
interface WorkOrderItem { id: string; type: string; totalCost: number; isReleased: boolean }
interface SurveyExpense { id: string; amount: number; status: string; purchaseOrderId?: string | null }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; progress: number }> = {
    PROSPECTING: { label: 'Prospecting', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Search, progress: 10 },
    SURVEY_STAGE: { label: 'Survey Stage', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, progress: 30 },
    QUOTATION_STAGE: { label: 'Quotation Stage', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText, progress: 50 },
    ORDERED: { label: 'Ordered', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: ShoppingCart, progress: 70 },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, progress: 100 },
    LOST: { label: 'Lost', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban, progress: 0 },
}

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
    HIGH: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Zap },
    MEDIUM: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Activity },
    LOW: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Target },
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const calcProjectStats = (p: PreSalesProject) => {
    const revenue = p.salesOrders?.reduce((acc, so) => acc + (so.grandTotal || 0), 0) || 0

    let materialUsageCosts = 0
    let directPurchaseCosts = 0
    let operationalExpenses = 0
    const processedExpenseIds = new Set<string>()

    const processExpense = (e: any) => {
        if (!e || !e.id || processedExpenseIds.has(e.id)) return;
        if (e.status === 'APPROVED' || e.status === 'POSTED') {
            if (!e.purchaseOrderId) {
                operationalExpenses += (e.amount || 0);
            }
        }
        processedExpenseIds.add(e.id);
    }

    // 1. Material usage from Stock Movements (CONFIRMED OUT)
    p.workOrders?.forEach(wo => {
        wo.stockMovements?.forEach(sm => {
            if (sm.status === 'CONFIRMED' && (sm.type === 'OUT' || sm.type === 'STOK_OUT')) {
                sm.items?.forEach((item: any) => {
                    materialUsageCosts += (item.qty || 0) * (item.unitCost || 0)
                })
            }
        })
    })

    // 2. Direct Costs from Purchase Orders (Exclude Inventory items to avoid double-counting)
    const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'POSTED'];
    p.purchaseOrders?.forEach(po => {
        if (validPOStatuses.includes(po.status)) {
            po.items?.forEach((item: any) => {
                const desc = (item.description || '').toLowerCase()
                const isInventoryItem = desc.includes('sku-') || desc.includes('prod-')
                const isService = desc.includes('jasa') || desc.includes('service') || desc.includes('fee') || desc.includes('ongkos')

                if (isService || !isInventoryItem) {
                    directPurchaseCosts += (item.qty || 0) * (item.unitPrice || 0)
                }
            })
        }
    })

    // 3. Operational Expenses
    p.surveys?.forEach(s => s.expenses?.forEach(processExpense))
    p.workOrders?.forEach(wo => wo.surveyExpenses?.forEach(processExpense))
    p.surveyExpenses?.forEach(processExpense)

    const cogs = materialUsageCosts + directPurchaseCosts
    const profit = revenue - (cogs + operationalExpenses)
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    return { revenue, cogs, materialUsageCosts, directPurchaseCosts, operationalExpenses, profit, margin }
}


// ─── PULL TO REFRESH ──────────────────────────────────────────────────────────
const PullToRefresh = ({ onRefresh, children }: { onRefresh: () => Promise<void>; children: React.ReactNode }) => {
    const [refreshing, setRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const startY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = (e: TouchEvent) => {
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY
        }
    }

    const handleTouchMove = (e: TouchEvent) => {
        if (startY.current && window.scrollY === 0) {
            const currentY = e.touches[0].clientY
            const distance = Math.max(0, currentY - startY.current)
            if (distance > 0) {
                e.preventDefault()
                setPullDistance(Math.min(distance * 0.5, 80))
            }
        }
    }

    const handleTouchEnd = async () => {
        if (pullDistance > 60) {
            setRefreshing(true)
            await onRefresh()
            setRefreshing(false)
        }
        setPullDistance(0)
        startY.current = 0
    }

    useEffect(() => {
        const el = containerRef.current
        if (el) {
            el.addEventListener('touchstart', handleTouchStart, { passive: false })
            el.addEventListener('touchmove', handleTouchMove, { passive: false })
            el.addEventListener('touchend', handleTouchEnd)
            return () => {
                el.removeEventListener('touchstart', handleTouchStart)
                el.removeEventListener('touchmove', handleTouchMove)
                el.removeEventListener('touchend', handleTouchEnd)
            }
        }
    }, [pullDistance])

    return (
        <div ref={containerRef} className="w-full">
            <div className="relative">
                <div
                    className="absolute left-0 right-0 flex justify-center transition-transform"
                    style={{ transform: `translateY(${pullDistance}px)` }}
                >
                    <div className={`w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={16} className="text-white" />
                    </div>
                </div>
                <div style={{ transform: `translateY(${pullDistance}px)` }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
    const [projects, setProjects] = useState<PreSalesProject[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<PreSalesProject | null>(null)
    const [viewing, setViewing] = useState<PreSalesProject | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
    const [companyProfile, setCompanyProfile] = useState<any>(null)
    const [pdfProject, setPdfProject] = useState<{ project: PreSalesProject, stats: any } | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [activePage, setActivePage] = useState('projects')
    const [showFilters, setShowFilters] = useState(false)
    const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>('')
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'revenue' | 'progress'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const showToast = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const projectsUrl = selectedBusinessCategoryId 
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/projects?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/projects`

            const [pR, cR, compR, bizR] = await Promise.all([
                fetch(projectsUrl),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            ])
            setProjects(await pR.json())
            setCustomers(await cR.json())
            setCompanyProfile(await compR.json())
            setBusinessCategories(await bizR.json())
            showToast('success', 'Data refreshed successfully')
        } catch {
            showToast('error', 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [showToast, selectedBusinessCategoryId])

    useEffect(() => { load() }, [load])

    const handleStatus = async (id: string, status: string) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
            })
            showToast('success', 'Status updated')
            load()
        } catch {
            showToast('error', 'Failed to update status')
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete project "${name}"? This action cannot be undone.`)) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`, { method: 'DELETE' })
            if (res.ok) {
                showToast('success', 'Project deleted successfully')
                load()
            } else {
                const data = await res.json()
                showToast('error', data.message || 'Failed to delete project')
            }
        } catch (e) {
            showToast('error', 'Network error occurred')
        }
    }

    const filtered = (Array.isArray(projects) ? projects : [])
        .filter(p => {
            const s = search.toLowerCase()
            return (p.number.toLowerCase().includes(s) ||
                p.name.toLowerCase().includes(s) ||
                (p.customer?.name?.toLowerCase().includes(s))) &&
                (filterStatus === 'ALL' || p.status === filterStatus) &&
                (selectedPriority === 'ALL' || p.priority === selectedPriority)
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                return sortOrder === 'desc'
                    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            }
            if (sortBy === 'name') {
                return sortOrder === 'desc'
                    ? b.name.localeCompare(a.name)
                    : a.name.localeCompare(b.name)
            }
            if (sortBy === 'revenue') {
                const revA = calcProjectStats(a).revenue
                const revB = calcProjectStats(b).revenue
                return sortOrder === 'desc' ? revB - revA : revA - revB
            }
            return 0
        })

    const stats = {
        total: filtered.length,
        revenue: filtered.reduce((acc, p) => acc + calcProjectStats(p).revenue, 0),
        profit: filtered.reduce((acc, p) => acc + calcProjectStats(p).profit, 0),
        active: filtered.filter(p => !['COMPLETED', 'LOST'].includes(p.status)).length,
        avgMargin: filtered.length > 0
            ? filtered.reduce((acc, p) => acc + calcProjectStats(p).margin, 0) / filtered.length
            : 0
    }

    return (
        <div className="w-full bg-slate-50">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        className={`fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[300] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                        {toast.type === 'success' ? <CheckCircle2 size={20} /> :
                            toast.type === 'error' ? <AlertCircle size={20} /> :
                                <Activity size={20} />}
                        <span className="flex-1">{toast.msg}</span>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-full">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header - Sticky on scroll */}
            <header className="sticky top-16 lg:top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 lg:px-1 py-3">
                <div className="flex items-center justify-between max-w-7xl lg:max-w-none mx-auto lg:mx-0">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Menu size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Briefcase size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Projects</h1>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    {filtered.length} active items
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="relative w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Bell size={18} className="text-slate-600" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <User size={18} className="text-white" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="w-full">
                <PullToRefresh onRefresh={load}>
                    <div className="px-4 lg:px-1 py-4 max-w-7xl lg:max-w-none mx-auto lg:mx-0 space-y-5">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Projects', value: stats.total, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Active', value: stats.active, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Revenue', value: fmt(stats.revenue).replace('Rp ', ''), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Avg Margin', value: `${stats.avgMargin.toFixed(1)}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                        <stat.icon size={16} className={stat.color} />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {stat.label}
                                    </span>
                                </div>
                                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Search & Filters */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search projects or customers..."
                                    className="w-full pl-11 pr-4 py-3.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                            <select
                                value={selectedBusinessCategoryId}
                                onChange={e => setSelectedBusinessCategoryId(e.target.value)}
                                className="h-[52px] px-4 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="">All Units</option>
                                {businessCategories.map(biz => (
                                    <option key={biz.id} value={biz.id}>{biz.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`h-[52px] px-4 rounded-2xl border transition-all flex items-center gap-2 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                            >
                                <Filter size={18} />
                                <span className="text-xs font-bold hidden sm:inline">Filters</span>
                            </button>
                            <div className="flex bg-white rounded-2xl border border-slate-200 p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-lg overflow-hidden"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setFilterStatus(s)}
                                                        className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${filterStatus === s
                                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Priority</p>
                                            <div className="flex gap-2">
                                                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setSelectedPriority(p)}
                                                        className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${selectedPriority === p
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Date Range</p>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'today', label: 'Today' },
                                                    { id: 'week', label: 'This Week' },
                                                    { id: 'month', label: 'This Month' },
                                                    { id: 'all', label: 'All Time' },
                                                ].map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => setDateRange(r.id as any)}
                                                        className={`flex-1 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${dateRange === r.id
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sort By</p>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'date', label: 'Date' },
                                                    { id: 'name', label: 'Name' },
                                                    { id: 'revenue', label: 'Revenue' },
                                                ].map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            if (sortBy === s.id) {
                                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                            } else {
                                                                setSortBy(s.id as any)
                                                                setSortOrder('desc')
                                                            }
                                                        }}
                                                        className={`flex-1 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${sortBy === s.id
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {s.label}
                                                        {sortBy === s.id && (
                                                            <ChevronDown
                                                                size={12}
                                                                className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Projects List/Grid/Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Briefcase size={24} className="text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 flex flex-col items-center"
                        >
                            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Briefcase size={48} className="text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-400 text-lg mb-2">No projects found</p>
                            <p className="text-sm text-slate-400 mb-6">Try adjusting your filters or create a new project</p>
                            <Button
                                onClick={() => { setEditing(null); setModalOpen(true) }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3"
                            >
                                <Plus size={18} className="mr-2" />
                                New Project
                            </Button>
                        </motion.div>
                    ) : (
                        <>
                            {/* Mobile/Tablet Cards */}
                            <div className="lg:hidden">
                                {viewMode === 'grid' ? (
                        // Grid View - Mobile/Tablet Optimized
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((p, idx) => {
                                const stats = calcProjectStats(p)
                                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                const StatusIcon = sc.icon
                                const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                const PriorityIcon = priority?.icon

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
                                    >
                                        {/* Card Header */}
                                        <div className="p-5 border-b border-slate-50">
                                            <div className="flex items-start justify-between mb-3 gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-lg">
                                                            {p.number}
                                                        </span>
                                                        {PriorityIcon && (
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider ${priority.color}`}>
                                                                <PriorityIcon size={10} />
                                                                {p.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 text-base mb-1 break-words whitespace-normal group-hover:text-indigo-600 transition-colors">
                                                        {p.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Building2 size={12} className="shrink-0" />
                                                        <span className="text-[10px] font-semibold truncate">{p.customer?.name || 'Unknown'}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            {p.businessCategory?.name || 'GENERIC'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border ${sc.color}`}>
                                                    <StatusIcon size={10} />
                                                    <span>{sc.label}</span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${sc.progress}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className="h-full bg-indigo-600 rounded-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 space-y-4">
                                            {/* Quick Stats */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-slate-50 rounded-2xl p-3">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Revenue</p>
                                                    <p className="text-sm font-black text-slate-900">{fmt(stats.revenue)}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-2xl p-3">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Profit</p>
                                                    <p className={`text-sm font-black ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {stats.profit >= 0 ? '+' : ''}{fmt(stats.profit)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Margin Indicator */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stats.margin > 20 ? 'bg-emerald-100' :
                                                        stats.margin > 10 ? 'bg-amber-100' : 'bg-rose-100'
                                                        }`}>
                                                        <Percent size={14} className={
                                                            stats.margin > 20 ? 'text-emerald-600' :
                                                                stats.margin > 10 ? 'text-amber-600' : 'text-rose-600'
                                                        } />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Margin</p>
                                                        <p className={`text-sm font-black ${stats.margin > 20 ? 'text-emerald-600' :
                                                            stats.margin > 10 ? 'text-amber-600' : 'text-rose-600'
                                                            }`}>
                                                            {stats.margin.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Calendar size={12} />
                                                    <span className="text-[9px] font-semibold">{fmtDate(p.createdAt)}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => setViewing(p)}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-3 rounded-xl transition-all active:scale-[0.98] font-bold text-[10px] uppercase tracking-wider"
                                                >
                                                    <Eye size={14} />
                                                    Details
                                                </button>
                                                <button
                                                    onClick={() => { setEditing(p); setModalOpen(true) }}
                                                    className="w-12 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-90"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setPdfProject({ project: p, stats })}
                                                    className="w-12 h-11 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all active:scale-90"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id, p.name)}
                                                    className="w-12 h-11 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all active:scale-90"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    ) : (
                        // List View - Optimized for tablets
                        <div className="space-y-3">
                            {filtered.map((p, idx) => {
                                const stats = calcProjectStats(p)
                                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                const StatusIcon = sc.icon

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl ${sc.color.replace('text-', 'bg-').replace('border-', '')} flex items-center justify-center shrink-0`}>
                                                <StatusIcon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider">
                                                        {p.number}
                                                    </span>
                                                    <span className="text-[8px] text-slate-400">•</span>
                                                    <span className="text-[8px] font-semibold text-slate-400">
                                                        {fmtDate(p.createdAt)}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-sm break-words whitespace-normal">{p.name}</h3>
                                                <p className="text-[10px] text-slate-500 truncate">{p.customer?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900">{fmt(stats.revenue)}</p>
                                                <p className={`text-[9px] font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {stats.profit >= 0 ? '+' : ''}{fmt(stats.profit)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setViewing(p)} className="p-2 hover:bg-slate-100 rounded-xl" title="View details">
                                                    <Eye size={16} className="text-slate-400" />
                                                </button>
                                                <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-2 hover:bg-indigo-50 rounded-xl" title="Edit project">
                                                    <Edit size={16} className="text-indigo-400" />
                                                </button>
                                                <button onClick={() => setPdfProject({ project: p, stats })} className="p-2 hover:bg-emerald-50 rounded-xl" title="Generate PDF">
                                                    <FileText size={16} className="text-emerald-400" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id, p.name)} className="p-2 hover:bg-rose-50 rounded-xl" title="Delete project">
                                                    <Trash2 size={16} className="text-rose-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Project</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Priority</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Revenue</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Profit / Margin</th>
                                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((p, idx) => {
                                        const stats = calcProjectStats(p)
                                        const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                        const StatusIcon = sc.icon
                                        const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                        const PriorityIcon = priority?.icon

                                        return (
                                            <motion.tr
                                                key={p.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">{p.number}</span>
                                                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                                            <Calendar size={10} /> {fmtDate(p.createdAt)}
                                                        </span>
                                                        <div className="mt-1">
                                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                                {p.businessCategory?.name || 'GENERIC'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                            <Building2 size={14} />
                                                        </div>
                                                        <span className="font-semibold text-slate-600 text-sm">{p.customer?.name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${sc.color}`}>
                                                            <StatusIcon size={12} />
                                                            <span>{sc.label}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        {PriorityIcon && (
                                                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${priority.color}`}>
                                                                <PriorityIcon size={12} />
                                                                {p.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-slate-900">{fmt(stats.revenue)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-black ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {stats.profit >= 0 ? '+' : ''}{fmt(stats.profit)}
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${stats.margin > 20 ? 'text-emerald-500' : stats.margin > 10 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                            {stats.margin.toFixed(1)}% Margin
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewing(p)}
                                                            className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            title="Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditing(p); setModalOpen(true) }}
                                                            className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setPdfProject({ project: p, stats })}
                                                            className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                            title="Report"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id, p.name)}
                                                            className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                </div>
            </PullToRefresh>
        </div>

            {/* Modals */}
            <AnimatePresence>
                {modalOpen && (
                    <ProjectFormModal
                        project={editing}
                        customers={customers}
                        businessCategories={businessCategories}
                        onClose={() => setModalOpen(false)}
                        onSuccess={() => {
                            setModalOpen(false);
                            load();
                            showToast('success', editing ? 'Project updated!' : 'Project created!')
                        }}
                    />
                )}
                {viewing && (
                    <ProjectDetailModal
                        project={viewing}
                        onClose={() => setViewing(null)}
                    />
                )}
                {pdfProject && (
                    <ProjectPDFModal
                        isOpen={!!pdfProject}
                        onClose={() => setPdfProject(null)}
                        project={pdfProject.project}
                        stats={pdfProject.stats}
                        companyProfile={companyProfile}
                    />
                )}
            </AnimatePresence>

            {/* FAB for mobile */}
            <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40 active:scale-95 transition-transform z-50"
            >
                <Plus size={24} />
            </button>
        </div>
    )
}

// ─── PROJECT FORM MODAL ───────────────────────────────────────────────────────
function ProjectFormModal({ project, customers, businessCategories, onClose, onSuccess }: {
    project: PreSalesProject | null;
    customers: Customer[];
    businessCategories: BusinessCategory[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const isEdit = !!project
    const [form, setForm] = useState({
        name: project?.name || '',
        customerId: project?.customerId || '',
        status: project?.status || 'PROSPECTING',
        priority: project?.priority || 'MEDIUM',
        deadline: project?.deadline || '',
        businessCategoryId: project?.businessCategoryId || '',
    })
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState(1)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${project!.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/projects`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) onSuccess()
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="md:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-4" />

                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900 text-lg">
                            {isEdit ? 'Edit Project' : 'New Project'}
                        </h2>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {isEdit ? 'Update project details' : 'Create a new sales project'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                        <X size={18} className="text-slate-600" />
                    </button>
                </div>

                {!isEdit && (
                    <div className="px-6 pt-6">
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex-1">
                                    <div
                                        className={`h-1 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-3">
                            Step {step} of 3: {step === 1 ? 'Basic Info' : step === 2 ? 'Customer' : 'Additional'}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-6 max-h-[70vh] overflow-y-auto space-y-5">
                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                Project Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., Network Upgrade - PT. ABC"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                Customer <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                value={form.customerId}
                                onChange={e => setForm({ ...form, customerId: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
                            >
                                <option value="">Select customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-rose-500 mb-2 block">
                                Business Unit <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                value={form.businessCategoryId}
                                onChange={e => setForm({ ...form, businessCategoryId: e.target.value })}
                                className="w-full bg-rose-50/30 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
                            >
                                <option value="">Select business unit</option>
                                {businessCategories.map(biz => (
                                    <option key={biz.id} value={biz.id}>{biz.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Project Status
                                </label>
                                <select
                                    required
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Target Deadline
                                </label>
                                <input
                                    type="date"
                                    value={form.deadline}
                                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                Priority Level
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: 'HIGH' as const, label: 'High', color: 'rose' },
                                    { value: 'MEDIUM' as const, label: 'Medium', color: 'amber' },
                                    { value: 'LOW' as const, label: 'Low', color: 'emerald' },
                                ]).map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, priority: p.value })}
                                        className={`py-3 rounded-xl border text-[9px] font-bold uppercase tracking-wider transition-all ${form.priority === p.value
                                            ? `bg-${p.color}-600 text-white border-${p.color}-600`
                                            : `bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100`}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 rounded-xl h-12 font-bold text-xs uppercase tracking-wider border-slate-200 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="flex-1 rounded-xl h-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : (isEdit ? 'Update Project' : 'Create Project')}
                            </Button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
