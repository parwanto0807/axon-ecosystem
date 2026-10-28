"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Eye, Edit, Trash2, X,
    CheckCircle2, AlertCircle, RefreshCw,
    Briefcase, Clock, FileText, ShoppingCart, Ban,
    DollarSign, Percent, BarChart3, LayoutGrid, List, Filter,
    ChevronDown, Calendar, Building2, Package,
    Activity, TrendingUp, Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/uiStore"
import ProjectDetailModal from "@/components/sales/ProjectDetailModal"
import ProjectPDFModal from "@/components/sales/ProjectPDFModal"

// ─── UTILS ────────────────────────────────────────────────────────────────────
const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
};

const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; icon: React.ElementType; progress: number }> = {
    PROSPECTING: { label: 'Prospecting', dot: 'bg-muted-foreground/60', icon: Search, progress: 10 },
    SURVEY_STAGE: { label: 'Survey Stage', dot: 'bg-amber-500', icon: Clock, progress: 30 },
    QUOTATION_STAGE: { label: 'Quotation Stage', dot: 'bg-blue-500', icon: FileText, progress: 50 },
    ORDERED: { label: 'Ordered', dot: 'bg-violet-500', icon: ShoppingCart, progress: 70 },
    COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', icon: CheckCircle2, progress: 100 },
    LOST: { label: 'Lost', dot: 'bg-rose-500', icon: Ban, progress: 0 },
}

const PRIORITY_CONFIG: Record<string, { dot: string }> = {
    HIGH: { dot: 'bg-rose-500' },
    MEDIUM: { dot: 'bg-amber-500' },
    LOW: { dot: 'bg-emerald-500' },
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

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
        if (q.status === 'ACCEPTED' || q.status === 'SENT') {
            quotationRevenue += (q.subtotal || 0)
            q.items?.forEach((i: any) => { quotationHpp += (i.costPrice || 0) * (i.qty || 1) })
        }
    })
    const quotationProfit = quotationRevenue - quotationHpp
    const quotationMargin = quotationRevenue > 0 ? (quotationProfit / quotationRevenue) * 100 : 0

    return { revenue, cogs, materialUsageCosts, directPurchaseCosts, operationalExpenses, profit, margin, quotationRevenue, quotationHpp, quotationProfit, quotationMargin }
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function StatusPill({ label, dot }: { label: string; dot: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    )
}

function PriorityPill({ label, dot }: { label: string; dot: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    )
}

function FlagPill({ tone, label, title }: { tone: 'rose' | 'amber'; label: string; title: string }) {
    const toneCls = tone === 'rose'
        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'
        : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
    const dot = tone === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
    return (
        <span title={title} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneCls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    )
}

function Segmented<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string; icon?: React.ReactNode }[]
    value: T
    onChange: (value: T) => void
}) {
    return (
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition-colors ${
                        value === option.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {option.label}
                    {option.icon}
                </button>
            ))}
        </div>
    )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
                </div>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon size={16} />
                </div>
            </div>
        </div>
    )
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
                    className="absolute left-0 right-0 z-50 flex justify-center transition-all"
                    style={{
                        transform: `translateY(${pullDistance}px)`,
                        opacity: pullDistance > 0 || refreshing ? 1 : 0,
                        pointerEvents: 'none'
                    }}
                >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
                        <RefreshCw size={16} />
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
        <div className="mt-3 flex items-center justify-between border-t border-border px-2 py-3">
            <span className="text-[11px] font-medium text-muted-foreground">
                Page {page} of {totalPages} ({total} projects)
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="h-7 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">
                    Prev
                </button>
                {pages.map(p => (
                    <button key={p} onClick={() => onPage(p)}
                        className={`h-7 w-7 rounded-md text-xs font-medium transition-colors ${page === p ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                        {p}
                    </button>
                ))}
                <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="h-7 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">
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

    const statusOptions = ['ALL', ...Object.keys(STATUS_CONFIG)].map(s => ({
        value: s,
        label: s === 'ALL' ? 'All' : STATUS_CONFIG[s].label,
    }))

    const priorityOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => ({ value: p, label: p }))

    const periodOptions = [
        { id: 'today', label: 'Today' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'all', label: 'All' },
    ]

    const sortOptions = [
        { id: 'no_so', label: '🔴 Belum SO First' },
        { id: 'date', label: 'Date' },
        { id: 'name', label: 'Name' },
        { id: 'revenue', label: 'Revenue' },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -50, scale: 0.9 }}
                            className="fixed left-1/2 top-4 z-[100] flex w-[90%] items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-medium text-foreground shadow-lg md:w-auto md:min-w-80"
                        >
                            {toast.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> :
                                toast.type === 'error' ? <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" /> :
                                    <Activity size={14} className="text-primary" />}
                            <span className="flex-1">{toast.msg}</span>
                            <button onClick={() => setToast(null)} className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => useUIStore.getState().toggleMobileMenu()}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                            aria-label="Open menu"
                        >
                            <Menu size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {filtered.length} {filtered.length === 1 ? 'project' : 'projects'} · Sales pipeline, revenue and profitability
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => { setEditing(null); setModalOpen(true) }}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        <Plus size={16} className="mr-1.5" />
                        New Project
                    </Button>
                </header>

                {/* Search & Filters bar */}
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1 lg:max-w-xs">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search projects or customers..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={e => setSelectedBusinessCategoryId(e.target.value)}
                        className={`${inputClass} cursor-pointer lg:w-48`}
                    >
                        <option value="">All Units</option>
                        {businessCategories.map(biz => (
                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${showFilters ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <Filter size={14} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 lg:ml-auto" role="toolbar" aria-label="View options">
                        <button onClick={() => handleViewModeChange('grid')}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            aria-label="Grid view" aria-pressed={viewMode === 'grid'}>
                            <LayoutGrid size={15} />
                        </button>
                        <button onClick={() => handleViewModeChange('list')}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            aria-label="List view" aria-pressed={viewMode === 'list'}>
                            <List size={15} />
                        </button>
                        <button onClick={() => handleViewModeChange('table')}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
                            className="mb-4 overflow-hidden"
                        >
                            <div className="flex flex-wrap gap-5 rounded-xl border border-border bg-muted/20 p-4">
                                <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">Status</p>
                                    <Segmented options={statusOptions} value={filterStatus} onChange={setFilterStatus} />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">Priority</p>
                                    <Segmented options={priorityOptions} value={selectedPriority} onChange={setSelectedPriority} />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">Period</p>
                                    <Segmented
                                        options={periodOptions.map(r => ({ value: r.id, label: r.label }))}
                                        value={dateRange}
                                        onChange={(value) => setDateRange(value as any)}
                                    />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">Sort</p>
                                    <Segmented
                                        options={sortOptions.map(s => ({
                                            value: s.id,
                                            label: s.label,
                                            icon: sortBy === s.id
                                                ? <ChevronDown size={11} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                                : undefined,
                                        }))}
                                        value={sortBy}
                                        onChange={(value) => {
                                            if (sortBy === value) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                            else { setSortBy(value as any); setSortOrder('desc') }
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <PullToRefresh onRefresh={load}>
                    {/* Stats Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Total Revenue" value={formatCurrencyCompact(stats.revenue)} icon={DollarSign} />
                        <StatCard label="Est. HPP / Modal (Penawaran)" value={formatCurrencyCompact(stats.quotationHpp)} icon={Package} />
                        <StatCard label="Active Projects" value={String(stats.active)} icon={Activity} />
                        <StatCard label="Avg Margin" value={`${stats.avgMargin.toFixed(1)}%`} icon={TrendingUp} />
                    </div>

                    {/* Projects Views */}
                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Briefcase size={22} />
                            </div>
                            <h3 className="text-sm font-medium text-foreground">No projects found</h3>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                {hasActiveFilters
                                    ? "Try adjusting your filters."
                                    : "Create your first project to get started."}
                            </p>
                            <button onClick={() => { if (hasActiveFilters) { setSearch(''); setSearchTerm(''); setFilterStatus('ALL'); setDateRange('all'); setSelectedPriority('ALL'); } else { setEditing(null); setModalOpen(true); } }}
                                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                                {hasActiveFilters ? <><RefreshCw size={14} /> Clear Filters</> : <><Plus size={14} /> Create First Project</>}
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            {/* Mobile Cards */}
                            <div className="lg:hidden">
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {paginated.map((p, idx) => {
                                            const stats = calcProjectStats(p)
                                            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                            const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                            const hasSalesOrder = Boolean(p.salesOrders && p.salesOrders.length > 0)
                                            const hasInvoice = Boolean(p.invoices && p.invoices.length > 0)

                                            return (
                                                <motion.div
                                                    key={p.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-muted/20"
                                                >
                                                    <div className="border-b border-border p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-mono text-[11px] font-medium text-muted-foreground">{p.number}</span>
                                                                    {priority && (
                                                                        <PriorityPill label={p.priority!} dot={priority.dot} />
                                                                    )}
                                                                    {!hasSalesOrder && (
                                                                        <FlagPill tone="rose" label="Belum SO" title="Project belum memiliki Pesanan Penjualan (Sales Order)" />
                                                                    )}
                                                                    {!hasInvoice && (
                                                                        <FlagPill tone="amber" label="Belum INV" title="Project belum diinvoice (No Invoice)" />
                                                                    )}
                                                                </div>
                                                                <h3 className="truncate text-sm font-medium text-foreground">{p.name}</h3>
                                                                <div className="mt-0.5 flex items-center gap-2">
                                                                    <span className="truncate text-[11px] text-muted-foreground">{p.customer?.name || 'Unknown'}</span>
                                                                    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                        {p.businessCategory?.name || 'GENERIC'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <StatusPill label={sc.label} dot={sc.dot} />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${sc.progress}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                                                                className="h-full rounded-full bg-primary" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3 p-3">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                                                                <p className="text-[10px] font-medium text-muted-foreground">Revenue</p>
                                                                <p className="truncate text-[11px] font-medium text-foreground tabular-nums">{formatCurrencyCompact(stats.revenue)}</p>
                                                            </div>
                                                            <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                                                                <p className="text-[10px] font-medium text-muted-foreground">Expense</p>
                                                                <p className="truncate text-[11px] font-medium text-rose-600 tabular-nums dark:text-rose-400">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</p>
                                                            </div>
                                                            <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                                                                <p className="text-[10px] font-medium text-muted-foreground">Profit</p>
                                                                <p className={`truncate text-[11px] font-medium tabular-nums ${stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                    {stats.profit > 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={`flex h-5 w-5 items-center justify-center rounded ${stats.margin > 20 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : stats.margin > 10 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                                                    <Percent size={11} />
                                                                </div>
                                                                <span className={`text-[11px] font-medium ${stats.margin > 20 ? 'text-emerald-600 dark:text-emerald-400' : stats.margin > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{stats.margin.toFixed(1)}%</span>
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground">{fmtDate(p.createdAt)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                                                            <span className="text-[10px] font-medium text-muted-foreground">Est. HPP Penawaran</span>
                                                            <span className="text-[11px] font-medium text-foreground tabular-nums">{formatCurrencyCompact(stats.quotationHpp)}</span>
                                                            <span className={`text-[11px] font-medium ${stats.quotationProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                {stats.quotationMargin.toFixed(1)}% est. margin
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-0.5">
                                                            <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground transition-colors hover:bg-muted">
                                                                <Eye size={13} /> View
                                                            </button>
                                                            <button onClick={() => window.location.href = `/dashboard/sales/projects/${p.id}/resume`} aria-label={`Resume ${p.name}`} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground transition-colors hover:bg-muted">
                                                                <BarChart3 size={13} /> Resume
                                                            </button>
                                                            <button onClick={() => { setEditing(p); setModalOpen(true) }} aria-label={`Edit ${p.name}`} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                <Edit size={14} />
                                                            </button>
                                                            <button onClick={() => setPdfProject({ project: p, stats })} title="PDF" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                <FileText size={14} />
                                                            </button>
                                                            <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} title="Delete" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                                <Trash2 size={14} />
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
                                                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                                                >
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                        <StatusIcon size={14} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                                            <span className="font-mono text-[11px] text-muted-foreground">{p.number}</span>
                                                            <span className="text-[11px] text-muted-foreground">•</span>
                                                            <span className="text-[11px] text-muted-foreground">{fmtDate(p.createdAt)}</span>
                                                            {!hasSalesOrder && (
                                                                <FlagPill tone="rose" label="Belum SO" title="Project belum memiliki Pesanan Penjualan (Sales Order)" />
                                                            )}
                                                            {!hasInvoice && (
                                                                <FlagPill tone="amber" label="Belum INV" title="Project belum diinvoice (No Invoice)" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="truncate text-sm font-medium text-foreground">{p.name}</h3>
                                                            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{p.customer?.name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="hidden pr-2 text-right sm:block">
                                                        <p className="text-[11px] text-muted-foreground">Rev</p>
                                                        <p className="text-[11px] text-muted-foreground">Exp</p>
                                                    </div>
                                                    <div className="hidden text-right sm:block">
                                                        <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrencyCompact(stats.revenue)}</p>
                                                        <p className="text-[11px] font-medium text-rose-600 tabular-nums dark:text-rose-400">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</p>
                                                    </div>
                                                    <div className="ml-1 hidden border-l border-border pl-3 text-right sm:block">
                                                        <p className="text-[11px] text-muted-foreground">Profit</p>
                                                        <p className={`text-sm font-medium tabular-nums ${stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {stats.profit >= 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                                        </p>
                                                        <p className={'text-[11px] font-medium ' + (stats.quotationProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                                            Est. {formatCurrencyCompact(stats.quotationHpp)} ({stats.quotationMargin.toFixed(0)}%)
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} title="View" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                            <Eye size={14} />
                                                        </button>
                                                        <button onClick={() => window.location.href = `/dashboard/sales/projects/${p.id}/resume`} aria-label={`Resume ${p.name}`} title="Resume" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                            <BarChart3 size={14} />
                                                        </button>
                                                        <button onClick={() => { setEditing(p); setModalOpen(true); }} aria-label={`Edit ${p.name}`} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button onClick={() => setPdfProject({ project: p, stats })} aria-label={`Export PDF ${p.name}`} title="PDF" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                            <FileText size={14} />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} aria-label={`Delete ${p.name}`} title="Delete" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                                <th className="px-3 py-2.5 font-medium">Project</th>
                                                <th className="px-3 py-2.5 font-medium">Customer</th>
                                                <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                                <th className="px-3 py-2.5 text-center font-medium">Priority</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Expenses</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Est. HPP (Quo)</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Est. Margin (Quo)</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Margin</th>
                                                <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {paginated.map((p, idx) => {
                                                const stats = calcProjectStats(p)
                                                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.PROSPECTING
                                                const priority = p.priority ? PRIORITY_CONFIG[p.priority] : null
                                                const hasSalesOrder = Boolean(p.salesOrders && p.salesOrders.length > 0)
                                                const hasInvoice = Boolean(p.invoices && p.invoices.length > 0)

                                                return (
                                                    <motion.tr
                                                        key={p.id}
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.02 }}
                                                        className="group transition-colors hover:bg-muted/30"
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-mono text-[11px] font-medium text-muted-foreground">{p.number}</span>
                                                                    {!hasSalesOrder && (
                                                                        <FlagPill tone="rose" label="Belum SO" title="Project belum memiliki Pesanan Penjualan (SO)" />
                                                                    )}
                                                                    {!hasInvoice && (
                                                                        <FlagPill tone="amber" label="Belum INV" title="Project belum diinvoice (No Invoice)" />
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-medium leading-tight text-foreground">{p.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar size={11} /> {fmtDate(p.createdAt)}</span>
                                                                    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{p.businessCategory?.name || 'GENERIC'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                                    <Building2 size={11} />
                                                                </div>
                                                                <span className="text-xs font-medium text-foreground">{p.customer?.name || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex justify-center">
                                                                <StatusPill label={sc.label} dot={sc.dot} />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex justify-center">
                                                                {priority ? (
                                                                    <PriorityPill label={p.priority!} dot={priority.dot} />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-sm font-medium text-foreground tabular-nums">{formatCurrencyCompact(stats.revenue)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-sm font-medium text-rose-600 tabular-nums dark:text-rose-400">{formatCurrencyCompact(stats.cogs + stats.operationalExpenses)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-sm font-medium text-amber-600 tabular-nums dark:text-amber-400">{formatCurrencyCompact(stats.quotationHpp)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <div className="flex flex-col items-end leading-tight">
                                                                <span className={`text-sm font-medium tabular-nums ${stats.quotationProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                    {stats.quotationProfit > 0 ? '+' : ''}{formatCurrencyCompact(stats.quotationProfit)}
                                                                </span>
                                                                <span className={'text-[11px] font-medium ' + (stats.quotationMargin > 20 ? 'text-emerald-500' : stats.quotationMargin > 10 ? 'text-amber-500' : 'text-rose-500')}>
                                                                    {stats.quotationMargin.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <div className="flex flex-col items-end leading-tight">
                                                                <span className={`text-sm font-medium tabular-nums ${stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                    {stats.profit > 0 ? '+' : ''}{formatCurrencyCompact(stats.profit)}
                                                                </span>
                                                                <span className={'text-[11px] font-medium ' + (stats.margin > 20 ? 'text-emerald-500' : stats.margin > 10 ? 'text-amber-500' : 'text-rose-500')}>
                                                                    {stats.margin.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} title="Details" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                    <Eye size={15} />
                                                                </button>
                                                                <button onClick={() => window.location.href = `/dashboard/sales/projects/${p.id}/resume`} aria-label={`Resume ${p.name}`} title="Resume" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                    <BarChart3 size={15} />
                                                                </button>
                                                                <button onClick={() => { setEditing(p); setModalOpen(true) }} aria-label={`Edit ${p.name}`} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                    <Edit size={15} />
                                                                </button>
                                                                <button onClick={() => setPdfProject({ project: p, stats })} aria-label={`Export PDF ${p.name}`} title="Report" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                                    <FileText size={15} />
                                                                </button>
                                                                <button onClick={() => setDeleteConfirm({ id: p.id, name: p.name })} aria-label={`Delete ${p.name}`} title="Delete" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </PullToRefresh>

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
                            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
                        >
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 24 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-sm sm:rounded-2xl"
                            >
                                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                        <Trash2 size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-foreground">Delete Project?</h3>
                                        <p className="text-[11px] text-muted-foreground">This action cannot be undone.</p>
                                    </div>
                                </div>
                                <div className="px-4 py-4">
                                    <p className="text-xs text-muted-foreground">Permanently delete:</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">{deleteConfirm.name}</p>
                                </div>
                                <div className="flex gap-2 border-t border-border px-4 py-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDeleteConfirm(null)}
                                        className="h-9 flex-1 rounded-lg text-sm font-medium"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleDelete}
                                        className="h-9 flex-1 rounded-lg bg-rose-600 text-sm font-medium text-white hover:bg-rose-700"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FAB for mobile */}
                <button
                    onClick={() => { setEditing(null); setModalOpen(true) }}
                    className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 lg:hidden"
                >
                    <Plus size={20} />
                </button>
            </div>
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl"
            >
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Briefcase size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-foreground">
                            {isEdit ? 'Edit Project' : 'New Project'}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            {isEdit ? 'Update project details' : 'Create a new sales project'}
                        </p>
                    </div>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="space-y-3.5 overflow-y-auto px-4 py-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Project Name <span className="text-rose-500">*</span>
                            </label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., Network Upgrade - PT. ABC"
                                className={inputClass} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Customer <span className="text-rose-500">*</span>
                            </label>
                            <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                className={`${inputClass} cursor-pointer`}>
                                <option value="">Select customer</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Business Unit <span className="text-rose-500">*</span>
                            </label>
                            <select required value={form.businessCategoryId} onChange={e => setForm({ ...form, businessCategoryId: e.target.value })}
                                className={`${inputClass} cursor-pointer`}>
                                <option value="">Select business unit</option>
                                {businessCategories.map((biz: any) => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
                                <select required value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                    className={`${inputClass} cursor-pointer`}>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {([
                                    { value: 'HIGH', label: 'High' },
                                    { value: 'MEDIUM', label: 'Medium' },
                                    { value: 'LOW', label: 'Low' },
                                ]).map(p => (
                                    <button key={p.value} type="button" onClick={() => setForm({ ...form, priority: p.value })}
                                        className={'h-9 rounded-lg border text-xs font-medium transition-colors ' + (form.priority === p.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground')}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 border-t border-border px-4 py-3">
                        <Button type="button" variant="outline" onClick={onClose}
                            className="h-9 flex-1 rounded-lg text-sm font-medium">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="h-9 flex-1 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
