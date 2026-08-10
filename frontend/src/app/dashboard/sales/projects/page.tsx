"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
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
    User, LogOut, HelpCircle, AlertTriangle
} from "lucide-react"

// ─── UTILS ────────────────────────────────────────────────────────────────────
const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
    }).format(value);
};
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/uiStore"
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
    operationalExpenses: any[];
    invoices?: any[];
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
    PROSPECTING: { label: 'Prospecting', color: 'bg-slate-200 text-slate-700 border-slate-300', icon: Search, progress: 10 },
    SURVEY_STAGE: { label: 'Survey Stage', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock, progress: 30 },
    QUOTATION_STAGE: { label: 'Quotation Stage', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: FileText, progress: 50 },
    ORDERED: { label: 'Ordered', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: ShoppingCart, progress: 70 },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2, progress: 100 },
    LOST: { label: 'Lost', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Ban, progress: 0 },
}

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
    HIGH: { color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Zap },
    MEDIUM: { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Activity },
    LOW: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: Target },
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
        if (e.status === 'APPROVED' || e.status === 'POSTED' || e.status === 'PAID') {
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

    // 3. Operational Expenses (survey expenses + finance operational expenses linked to project)
    p.surveys?.forEach(s => s.expenses?.forEach(processExpense))
    p.workOrders?.forEach(wo => wo.surveyExpenses?.forEach(processExpense))
    p.surveyExpenses?.forEach(processExpense)
    p.operationalExpenses?.forEach(processExpense)

    const cogs = materialUsageCosts + directPurchaseCosts
    const profit = revenue - (cogs + operationalExpenses)
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    // 4. Estimated HPP / Modal from Quotations (current offer value)
    let quotationRevenue = 0
    let quotationHpp = 0
    p.quotations?.forEach((q: any) => {
        quotationRevenue += (q.subtotal || 0)
        q.items?.forEach((i: any) => { quotationHpp += (i.costPrice || 0) * (i.qty || 1) })
    })
    const quotationProfit = quotationRevenue - quotationHpp
    const quotationMargin = quotationRevenue > 0 ? (quotationProfit / quotationRevenue) * 100 : 0

    return { revenue, cogs, materialUsageCosts, directPurchaseCosts, operationalExpenses, profit, margin, quotationRevenue, quotationHpp, quotationProfit, quotationMargin }
}


// ─── PULL TO REFRESH ──────────────────────────────────────────────────────────
const PullToRefresh = ({ onRefresh, children }: { onRefresh: () => Promise<void>; children: React.ReactNode }) => {
    const [refreshing, setRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const pullRef = useRef(0)
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
                pullRef.current = Math.min(distance * 0.5, 80)
                setPullDistance(pullRef.current)
            }
        }
    }

    const handleTouchEnd = async () => {
        if (pullRef.current > 60) {
            setRefreshing(true)
            await onRefresh()
            setRefreshing(false)
        }
        pullRef.current = 0
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
    }, [])

    return (
        <div ref={containerRef} className="w-full">
            <div className="relative">
                <div
                    className="absolute left-0 right-0 flex justify-center transition-all z-50"
                    style={{ 
                        transform: `translateY(${pullDistance}px)`,
                        opacity: pullDistance > 0 || refreshing ? 1 : 0,
                        pointerEvents: 'none'
                    }}
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

// ─── PAGINATION ─────────────────────────────────────────────────────────────────
function Pagination(props: any) {
    const { page, totalPages, total, onPage } = props
    const pages = []
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    for (let i = start; i <= Math.min(start + 4, totalPages); i++) pages.push(i)

    return (
        <div className="flex items-center justify-between px-2 py-3 border-t border-slate-200 mt-2">
            <span className="text-[11px] text-slate-500 font-medium">
                Page {page} of {totalPages} ({total} projects)
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">
                    Prev
                </button>
                {pages.map(p => (
                    <button key={p} onClick={() => onPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-all ${page === p ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {p}
                    </button>
                ))}
                <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">
                    Next
                </button>
            </div>
        </div>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role || ''
    const userName = (session?.user as any)?.name || 'User'
    const userEmail = (session?.user as any)?.email || 'user@example.com'
    const userImage = (session?.user as any)?.image
    const [projects, setProjects] = useState<PreSalesProject[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<PreSalesProject | null>(null)
    const [viewing, setViewing] = useState<PreSalesProject | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
    const [companyProfile, setCompanyProfile] = useState<any>(null)
    const [pdfProject, setPdfProject] = useState<{ project: PreSalesProject, stats: any } | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid')
    const [activePage, setActivePage] = useState('projects')

    useEffect(() => {
        const saved = localStorage.getItem('project_view_mode') as any
        if (['grid', 'list', 'table'].includes(saved)) {
            setViewMode(saved)
        }
    }, [])

    const handleViewModeChange = (mode: 'grid' | 'list' | 'table') => {
        setViewMode(mode)
        localStorage.setItem('project_view_mode', mode)
    }
    const [showFilters, setShowFilters] = useState(false)
    const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>('')
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'revenue' | 'progress' | 'no_so'>('no_so')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
    const [page, setPage] = useState(1)
    const perPage = 20

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
                fetch(projectsUrl, { headers: { 'x-user-role': userRole } }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, { headers: { 'x-user-role': userRole } }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`, { headers: { 'x-user-role': userRole } }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`, { headers: { 'x-user-role': userRole } })
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
    }, [showToast, selectedBusinessCategoryId, userRole])

    useEffect(() => { load() }, [load])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchTerm), 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1) }, [search, filterStatus, selectedPriority, dateRange, selectedBusinessCategoryId, sortBy, sortOrder])

    const handleStatus = async (id: string, status: string) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify({ status })
            })
            showToast('success', 'Status updated')
            load()
        } catch {
            showToast('error', 'Failed to update status')
        }
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${deleteConfirm.id}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
            if (res.ok) {
                showToast('success', 'Project deleted successfully')
                setDeleteConfirm(null)
                load()
            } else {
                const data = await res.json()
                showToast('error', data.message || 'Failed to delete project')
                setDeleteConfirm(null)
            }
        } catch (e) {
            showToast('error', 'Network error occurred')
            setDeleteConfirm(null)
        }
    }

    const filtered = (Array.isArray(projects) ? projects : [])
        .filter(p => {
            const s = search.toLowerCase()
            // Date range filter
            if (dateRange !== 'all') {
                const now = new Date()
                const created = new Date(p.createdAt)
                const start = new Date(now)
                if (dateRange === 'today') start.setHours(0, 0, 0, 0)
                else if (dateRange === 'week') start.setDate(now.getDate() - now.getDay())
                else if (dateRange === 'month') start.setDate(1)
                if (created < start) return false
            }
            return (p.number.toLowerCase().includes(s) ||
                p.name.toLowerCase().includes(s) ||
                (p.customer?.name?.toLowerCase().includes(s))) &&
                (filterStatus === 'ALL' || p.status === filterStatus) &&
                (selectedPriority === 'ALL' || p.priority === selectedPriority)
        })
        .sort((a, b) => {
            const aDone = ['COMPLETED', 'LOST'].includes(a.status) ? 1 : 0
            const bDone = ['COMPLETED', 'LOST'].includes(b.status) ? 1 : 0
            if (aDone !== bDone) return aDone - bDone

            if (sortBy === 'no_so') {
                const aHasSO = (a.salesOrders && a.salesOrders.length > 0) ? 1 : 0
                const bHasSO = (b.salesOrders && b.salesOrders.length > 0) ? 1 : 0
                if (aHasSO !== bHasSO) {
                    return sortOrder === 'desc' ? aHasSO - bHasSO : bHasSO - aHasSO
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
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

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)
    const hasActiveFilters = !!(search || searchTerm || filterStatus !== 'ALL' || dateRange !== 'all' || selectedPriority !== 'ALL')

    const stats = {
        total: filtered.length,
        revenue: filtered.reduce((acc, p) => acc + calcProjectStats(p).revenue, 0),
        profit: filtered.reduce((acc, p) => acc + calcProjectStats(p).profit, 0),
        active: filtered.filter(p => !['COMPLETED', 'LOST'].includes(p.status)).length,
        quotationHpp: filtered.reduce((acc, p) => acc + calcProjectStats(p).quotationHpp, 0),
        avgMargin: filtered.length > 0
            ? filtered.reduce((acc, p) => acc + calcProjectStats(p).margin, 0) / filtered.length
            : 0
    };

    return (
        <div className="w-full bg-white">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-auto md:min-w-80 z-300 flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                        {toast.type === 'success' ? <CheckCircle2 size={14} /> :
                            toast.type === 'error' ? <AlertCircle size={14} /> :
                                <Activity size={14} />}
                        <span className="flex-1">{toast.msg}</span>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-full">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="sticky top-16 lg:top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => useUIStore.getState().toggleMobileMenu()}
                            className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            <Menu size={16} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                                <Briefcase size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Dashboard</span>
                                    <span className="text-slate-300">›</span>
                                    <span className="hover:text-slate-600 transition-colors cursor-pointer">Sales</span>
                                    <span className="text-slate-300">›</span>
                                    <span className="text-indigo-600 font-semibold">Projects</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-slate-900 leading-none">Projects</h1>
                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {filtered.length} projects
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                        >
                            <Plus size={16} />
                            New Project
                        </button>
                    </div>
                </div>
            </header>

            {/* Search & Filters bar */}
            <div className="bg-white border-b border-slate-100 px-4 lg:px-5 py-3">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search projects or customers..."
                                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <select
                            value={selectedBusinessCategoryId}
                            onChange={e => setSelectedBusinessCategoryId(e.target.value)}
                            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        >
                            <option value="">All Units</option>
                            {businessCategories.map(biz => (
                                <option key={biz.id} value={biz.id}>{biz.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-9 px-3 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter size={14} />
                            <span className="hidden sm:inline">Filters</span>
                        </button>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5" role="toolbar" aria-label="View options">
                            <button onClick={() => handleViewModeChange('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                aria-label="Grid view" aria-pressed={viewMode === 'grid'}>
                                <LayoutGrid size={15} />
                            </button>
                            <button onClick={() => handleViewModeChange('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                aria-label="List view" aria-pressed={viewMode === 'list'}>
                                <List size={15} />
                            </button>
                            <button onClick={() => handleViewModeChange('table')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                aria-label="Table view" aria-pressed={viewMode === 'table'}>
                                <Menu size={15} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
                                                <button key={s} onClick={() => setFilterStatus(s)} aria-pressed={filterStatus === s}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</p>
                                        <div className="flex gap-1.5">
                                            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                                                <button key={p} onClick={() => setSelectedPriority(p)} aria-pressed={selectedPriority === p}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${selectedPriority === p ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Period</p>
                                        <div className="flex gap-1.5">
                                            {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'all', label: 'All' }].map(r => (
                                                <button key={r.id} onClick={() => setDateRange(r.id as any)} aria-pressed={dateRange === r.id}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${dateRange === r.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sort</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { id: 'no_so', label: '🔴 Belum SO First' },
                                                { id: 'date', label: 'Date' },
                                                { id: 'name', label: 'Name' },
                                                { id: 'revenue', label: 'Revenue' }
                                            ].map(s => (
                                                <button key={s.id} onClick={() => { if (sortBy === s.id) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy(s.id as any); setSortOrder('desc'); } }} aria-pressed={sortBy === s.id}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 ${sortBy === s.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                                    {s.label}
                                                    {sortBy === s.id && <ChevronDown size={10} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full px-4 lg:px-5 py-5">
                    <PullToRefresh onRefresh={load}>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrencyCompact(stats.revenue)}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <DollarSign size={18} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Est. HPP / Modal (Penawaran)</p>
                                    <h3 className="text-2xl font-bold text-amber-600 tracking-tight">{formatCurrencyCompact(stats.quotationHpp)}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Package size={18} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Projects</p>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.active}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Activity size={18} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Margin</p>
                                    <h3 className="text-2xl font-bold text-blue-600 tracking-tight">{stats.avgMargin.toFixed(1)}%</h3>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projects Views */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3 w-16 bg-slate-200 rounded-md"></div>
                                            <div className="h-4 w-3/4 bg-slate-200 rounded-md"></div>
                                        </div>
                                        <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                                    </div>
                                    <div className="space-y-3 mb-4"><div className="flex items-center gap-2"><div className="w-5 h-5 bg-slate-200 rounded-full"></div><div className="h-3 w-1/2 bg-slate-200 rounded-md"></div></div></div>
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                                        <div className="h-8 bg-slate-100 rounded-lg"></div>
                                        <div className="h-8 bg-slate-100 rounded-lg"></div>
                                        <div className="h-8 bg-slate-100 rounded-lg"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl border border-slate-200 py-20 px-6 flex flex-col items-center text-center shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                <Briefcase size={28} className="text-indigo-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1">No projects found</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm">
                                {hasActiveFilters
                                    ? "Try adjusting your filters."
                                    : "Create your first project to get started."}
                            </p>
                            <button onClick={() => { if (hasActiveFilters) { setSearch(''); setSearchTerm(''); setFilterStatus('ALL'); setDateRange('all'); setSelectedPriority('ALL'); } else { setEditing(null); setModalOpen(true); } }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-all flex items-center gap-2">
                                {hasActiveFilters ? <><RefreshCw size={14} /> Clear Filters</> : <><Plus size={14} /> Create First Project</>}
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            {/* Mobile Cards */}
                            <div className="lg:hidden">
                                {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {paginated.map((p, idx) => {
                                const stats = calcProjectStats(p)
                                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                const StatusIcon = sc.icon
                                const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                const PriorityIcon = priority?.icon
                                const hasSalesOrder = Boolean(p.salesOrders && p.salesOrders.length > 0)
                                const hasInvoice = Boolean(p.invoices && p.invoices.length > 0)

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                                    >
                                        <div className="p-4 border-b border-slate-100">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded-md">{p.number}</span>
                                                        {PriorityIcon && (
                                                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${priority.color}`}>
                                                                <PriorityIcon size={8} />
                                                                {p.priority}
                                                            </span>
                                                        )}
                                                        {!hasSalesOrder && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200" title="Project belum memiliki Pesanan Penjualan (Sales Order)">
                                                                <span className="relative flex h-2 w-2 shrink-0">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"></span>
                                                                </span>
                                                                <span>Belum SO</span>
                                                            </span>
                                                        )}
                                                        {!hasInvoice && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200" title="Project belum diinvoice (No Invoice)">
                                                                <span className="relative flex h-2 w-2 shrink-0">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]"></span>
                                                                </span>
                                                                <span>Belum INV</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-slate-500 font-medium truncate">{p.customer?.name || 'Unknown'}</span>
                                                        <span className="text-[8px] text-rose-500 font-semibold uppercase bg-rose-50 px-1 py-0.5 rounded">
                                                            {p.businessCategory?.name || 'GENERIC'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider border shrink-0 ${sc.color}`}>
                                                    <StatusIcon size={8} />
                                                    <span>{sc.label}</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-3">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${sc.progress}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                                                    className="h-full bg-indigo-600 rounded-full" />
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
                                                    <p className="text-[11px] font-bold text-slate-900 truncate">{formatCurrencyCompact(stats.revenue)}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Expense</p>
                                                    <p className="text-[11px] font-bold text-rose-600 truncate">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                                    <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Profit</p>
                                                    <p className={`text-[11px] font-bold truncate ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
{stats.profit > 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${stats.margin > 20 ? 'bg-emerald-100' : stats.margin > 10 ? 'bg-amber-100' : 'bg-rose-100'}`}>
                                                        <Percent size={9} className={stats.margin > 20 ? 'text-emerald-600' : stats.margin > 10 ? 'text-amber-600' : 'text-rose-600'} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${stats.margin > 20 ? 'text-emerald-600' : stats.margin > 10 ? 'text-amber-600' : 'text-rose-600'}`}>{stats.margin.toFixed(1)}%</span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-medium">{fmtDate(p.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-amber-50/60 border border-amber-100 rounded-lg px-2.5 py-1.5">
                                                <span className="text-[8px] font-semibold text-amber-500 uppercase tracking-wider">Est. HPP Penawaran</span>
                                                <span className="text-[10px] font-bold text-amber-700">{formatCurrencyCompact(stats.quotationHpp)}</span>
                                                <span className={`text-[10px] font-bold ${stats.quotationProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {stats.quotationMargin.toFixed(1)}% est. margin
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-lg text-[9px] font-semibold transition-all">
                                                    <Eye size={11} /> View
                                                </button>
                                                <button onClick={() => { setEditing(p); setModalOpen(true) }} aria-label={`Edit ${p.name}`} className="w-9 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all">
                                                    <Edit size={12} />
                                                </button>
                                                <button onClick={() => setPdfProject({ project: p, stats })} className="w-9 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all">
                                                    <FileText size={13} />
                                                </button>
                                                <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} className="w-9 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    ) : (
                        // List View - Compact
                        <div className="space-y-1.5">
                            {paginated.map((p, idx) => {
                                const stats = calcProjectStats(p)
                                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                const StatusIcon = sc.icon
                                const hasSalesOrder = Boolean(p.salesOrders && p.salesOrders.length > 0)
                                const hasInvoice = Boolean(p.invoices && p.invoices.length > 0)

                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all flex items-center gap-3 group"
                                    >
                                        <div className={`w-8 h-8 rounded-lg ${sc.color.replace('text-', 'bg-').replace('border-', '')} flex items-center justify-center shrink-0`}>
                                            <StatusIcon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider">{p.number}</span>
                                                <span className="text-[8px] text-slate-400">•</span>
                                                <span className="text-[8px] text-slate-500 font-medium">{fmtDate(p.createdAt)}</span>
                                                {!hasSalesOrder && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200" title="Project belum memiliki Pesanan Penjualan (Sales Order)">
                                                        <span className="relative flex h-2 w-2 shrink-0">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"></span>
                                                        </span>
                                                        <span>Belum SO</span>
                                                    </span>
                                                )}
                                                {!hasInvoice && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200" title="Project belum diinvoice (No Invoice)">
                                                        <span className="relative flex h-2 w-2 shrink-0">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]"></span>
                                                        </span>
                                                        <span>Belum INV</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                                                <span className="text-[9px] text-slate-500 truncate hidden sm:inline">{p.customer?.name}</span>
                                            </div>
                                        </div>
                                        <div className="text-right hidden sm:block pr-2">
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Rev</p>
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Exp</p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs font-bold text-slate-900">{formatCurrencyCompact(stats.revenue)}</p>
                                            <p className="text-[10px] font-bold text-rose-600">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</p>
                                        </div>
                                        <div className="text-right hidden sm:block border-l border-slate-200 pl-3 ml-1">
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase">Profit</p>
                                            <p className={`text-[11px] font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {stats.profit >= 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                            </p>
                                            <p className={'text-[9px] font-semibold ' + (stats.quotationProfit >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                                Est. {formatCurrencyCompact(stats.quotationHpp)} ({stats.quotationMargin.toFixed(0)}%)
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                                                <Eye size={13} className="text-slate-400" />
                                            </button>
                                            <button onClick={() => { setEditing(p); setModalOpen(true); }} aria-label={`Edit ${p.name}`} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                <Edit size={13} className="text-indigo-400" />
                                            </button>
                                            <button onClick={() => setPdfProject({ project: p, stats })} aria-label={`Export PDF ${p.name}`} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors" title="PDF">
                                                <FileText size={13} className="text-emerald-400" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} aria-label={`Delete ${p.name}`} className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={13} className="text-rose-400" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                            {/* Desktop Table */}
                            <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Project</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center">Priority</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Revenue</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Expenses</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Est. HPP (Quo)</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Est. Margin (Quo)</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Margin</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((p, idx) => {
                                        const stats = calcProjectStats(p)
                                        const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                        const StatusIcon = sc.icon
                                        const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                        const PriorityIcon = priority?.icon
                                        const hasSalesOrder = Boolean(p.salesOrders && p.salesOrders.length > 0)
                                        const hasInvoice = Boolean(p.invoices && p.invoices.length > 0)

                                        return (
                                            <motion.tr
                                                key={p.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{p.number}</span>
                                                            {!hasSalesOrder && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200" title="Project belum memiliki Pesanan Penjualan (SO)">
                                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"></span>
                                                                    </span>
                                                                    <span>Belum SO</span>
                                                                </span>
                                                            )}
                                                            {!hasInvoice && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200" title="Project belum diinvoice (No Invoice)">
                                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]"></span>
                                                                    </span>
                                                                    <span>Belum INV</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 text-xs leading-tight group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Calendar size={8} /> {fmtDate(p.createdAt)}</span>
                                                            <span className="text-[8px] text-rose-500 font-semibold uppercase bg-rose-50 px-1 py-0.5 rounded">{p.businessCategory?.name || 'GENERIC'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <Building2 size={10} />
                                                        </div>
                                                        <span className="font-semibold text-slate-600 text-xs">{p.customer?.name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center">
                                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-[20px] text-[9px] font-semibold border ${sc.color}`}>
                                                            <StatusIcon size={9} />
                                                            <span>{sc.label}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center">
                                                        {PriorityIcon && (
                                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-[20px] text-[9px] font-semibold ${priority.color}`}>
                                                                <PriorityIcon size={9} />
                                                                {p.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-semibold text-slate-900 text-xs">{formatCurrencyCompact(stats.revenue)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-semibold text-rose-600 text-xs">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-semibold text-amber-600 text-xs">{formatCurrencyCompact(stats.quotationHpp)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col items-end leading-tight">
                                                        <span className={`font-semibold text-xs ${stats.quotationProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {stats.quotationProfit > 0 ? '+' : ''}{formatCurrencyCompact(stats.quotationProfit)}
                                                        </span>
                                                        <span className={'text-[9px] font-medium ' + (stats.quotationMargin > 20 ? 'text-emerald-500' : stats.quotationMargin > 10 ? 'text-amber-500' : 'text-rose-500')}>
                                                            {stats.quotationMargin.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col items-end leading-tight">
                                                        <span className={`font-semibold text-xs ${stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
{stats.profit > 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                                        </span>
                                                        <span className={'text-[9px] font-medium ' + (stats.margin > 20 ? 'text-emerald-500' : stats.margin > 10 ? 'text-amber-500' : 'text-rose-500')}>
                                                            {stats.margin.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="w-7 h-7 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="Details">
                                                            <Eye size={12} />
                                                        </button>
                                                        <button onClick={() => { setEditing(p); setModalOpen(true) }} aria-label={`Edit ${p.name}`} className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="Edit">
                                                            <Edit size={12} />
                                                        </button>
                                                        <button onClick={() => setPdfProject({ project: p, stats })} aria-label={`Export PDF ${p.name}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all" title="Report">
                                                            <FileText size={12} />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} aria-label={`Delete ${p.name}`} className="w-7 h-7 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all" title="Delete">
                                                            <Trash2 size={12} />
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
                </PullToRefresh>
            </div>

            {/* Pagination */}
            {totalPages > 0 && <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />}

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
                        stats={calcProjectStats(viewing)}
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
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
                        >
                            <div className="p-5 text-center">
                                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
                                    <Trash2 size={20} className="text-rose-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Delete Project?</h3>
                                <p className="text-xs text-slate-500 mb-1">
                                    Permanently delete:
                                </p>
                                <p className="font-bold text-slate-800 text-xs mb-3">
                                    {deleteConfirm.name}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB for mobile */}
            <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="lg:hidden fixed bottom-20 right-4 w-12 h-12 rounded-full bg-linear-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform z-50"
            >
                <Plus size={20} />
            </button>
        </div>
    )
}

// ─── PROJECT FORM MODAL ───────────────────────────────────────────────────────────
function ProjectFormModal(props: any) {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role || ''
    const { project, customers, businessCategories, onClose, onSuccess } = props
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${project!.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/projects`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify(form)
            })
            if (res.ok) onSuccess()
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3" />

                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900 text-sm">
                            {isEdit ? 'Edit Project' : 'New Project'}
                        </h2>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                            {isEdit ? 'Update project details' : 'Create a new sales project'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <X size={14} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-4 py-4 max-h-[60vh] overflow-y-auto space-y-3.5">
                        <div>
                            <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                Project Name <span className="text-rose-500">*</span>
                            </label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., Network Upgrade - PT. ABC"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                        </div>

                        <div>
                            <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                Customer <span className="text-rose-500">*</span>
                            </label>
                            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                                <option value="">Select customer</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[8px] font-bold uppercase tracking-wider text-rose-500 mb-1.5 block">
                                Business Unit <span className="text-rose-500">*</span>
                            </label>
                            <select required value={form.businessCategoryId} onChange={e => setForm({ ...form, businessCategoryId: e.target.value })}
                                className="w-full bg-rose-50/30 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                                <option value="">Select business unit</option>
                                {businessCategories.map((biz: any) => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Status</label>
                                <select required value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none">
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Priority</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {([
                                    { value: 'HIGH', label: 'High', cls: 'bg-rose-600 text-white border-rose-600' },
                                    { value: 'MEDIUM', label: 'Medium', cls: 'bg-amber-600 text-white border-amber-600' },
                                    { value: 'LOW', label: 'Low', cls: 'bg-emerald-600 text-white border-emerald-600' },
                                ]).map(p => (
                                    <button key={p.value} type="button" onClick={() => setForm({ ...form, priority: p.value })}
                                        className={'py-2 rounded-lg border text-[8px] font-bold uppercase tracking-wider transition-all ' + (form.priority === p.value ? p.cls : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose}
                            className="flex-1 rounded-lg h-10 font-bold text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-100">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="flex-1 rounded-lg h-10 bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm disabled:opacity-50">
                            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

