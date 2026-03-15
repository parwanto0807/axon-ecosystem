"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Wrench, Plus, Search, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
    Clock, MapPin, User, Calendar, DollarSign, Package,
    ClipboardList, Play, Pause, Check, Ban, XCircle, HardHat,
    AlertTriangle, ChevronRight, SquareCheckBig, Circle, Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import WorkOrderPDFModal from "./WorkOrderPDFModal"
import { useSession } from "next-auth/react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface WO {
    id: string; number: string; title: string; description?: string
    type: string; status: string; priority: string
    projectId?: string; project?: { number: string; name: string }
    salesOrderId?: string; salesOrder?: { number: string }
    customerId?: string; customer?: { name: string; code: string; address?: string | null }
    assignedTo?: string; location?: string
    scheduledStart?: string; scheduledEnd?: string
    actualStart?: string; actualEnd?: string
    estimatedHours?: number; actualHours?: number
    notes?: string; completionNotes?: string
    items: WOItem[]; tasks: WOTask[]
    stockMovements: any[]
    expenses: any[]
    reports: WorkOrderReport[]
    _count?: { items: number; tasks: number; reports: number }
    createdAt: string
}
interface WorkOrderReport {
    id: string
    workOrderId: string
    taskId?: string | null
    task?: { id: string; title: string }
    date: string
    description: string
    progress: number
    reportedBy?: string
    createdAt: string
    photos: WorkOrderReportPhoto[]
}
interface WorkOrderReportPhoto {
    id: string
    url: string
}
interface WOItem {
    id?: string; type: string; source: string; description: string; skuId?: string
    qty: number; unit: string; unitCost: number; totalCost: number; notes?: string
    isReleased: boolean
    sku?: { code: string; product: { name: string } }
}
interface WOTask { id?: string; title: string; description?: string; isDone: boolean; doneAt?: string; sortOrder?: number }
interface Ref { id: string; number: string; name?: string; customer?: { name: string } }
interface SKU { id: string; code: string; name: string; purchasePrice: number; product: { name: string } }

// ─── Config ──────────────────────────────────────────────────────────────────

const WO_TYPE: Record<string, { label: string; color: string; icon: string }> = {
    SERVICE: { label: 'Jasa / IT Support', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🔧' },
    INSTALLATION: { label: 'Instalasi', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '📷' },
    REPAIR: { label: 'Perbaikan', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🛠' },
    DEVELOPMENT: { label: 'Pengembangan Sistem', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: '💻' },
    PROCUREMENT: { label: 'Pengadaan Hardware/SW', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🖥' },
}
const WO_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    ON_HOLD: { label: 'On Hold', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CLOSED: { label: 'Closed', color: 'bg-slate-50 text-slate-500 border-slate-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-400 border-slate-200 line-through' },
}
const WO_PRIORITY: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-500',
    NORMAL: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-amber-100 text-amber-700',
    URGENT: 'bg-rose-100 text-rose-700',
}
const ITEM_TYPE: Record<string, string> = {
    MATERIAL: '📦 Material',
    LABOR: '👷 Tenaga Kerja',
    SUBCONTRACTOR: '🤝 Subkontraktor',
    TOOL: '🔩 Alat',
    OTHER: '📋 Lainnya',
}
const ITEM_SOURCE: Record<string, string> = {
    PO: 'Pembelian PO',
    CASH: 'Pembelian Cash',
    STOCK: 'Pengambilan Stock',
    JASA_PO: 'Pembelian Jasa PO',
    JASA_CASH: 'Pembelian Jasa CASH',
    ALAT_KERJA: 'Alat Pendukung Kerja',
    OPERASIONAL: 'Operasional',
    OTHER: 'Lainnya'
}
const STATUS_TRANSITIONS: Record<string, { next: string; label: string; icon: React.ElementType; color: string }[]> = {
    DRAFT: [{ next: 'CONFIRMED', label: 'Konfirmasi', icon: CheckCircle2, color: 'bg-sky-600 hover:bg-sky-700' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    CONFIRMED: [{ next: 'IN_PROGRESS', label: 'Mulai Kerjakan', icon: Play, color: 'bg-amber-500 hover:bg-amber-600' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    IN_PROGRESS: [{ next: 'ON_HOLD', label: 'Tahan / Hold', icon: Pause, color: 'bg-orange-500 hover:bg-orange-600' }, { next: 'COMPLETED', label: 'Selesai', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-700' }],
    ON_HOLD: [{ next: 'IN_PROGRESS', label: 'Lanjutkan', icon: Play, color: 'bg-amber-500 hover:bg-amber-600' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    COMPLETED: [{ next: 'CLOSED', label: 'Tutup WO', icon: XCircle, color: 'bg-slate-600 hover:bg-slate-700' }],
    CLOSED: [],
    CANCELLED: [],
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const defaultForm = { title: '', description: '', type: 'SERVICE', priority: 'NORMAL', projectId: '', salesOrderId: '', customerId: '', assignedTo: '', location: '', scheduledStart: '', scheduledEnd: '', estimatedHours: '', notes: '' }

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role

    const [wos, setWos] = useState<WO[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [companyInfo, setCompanyInfo] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [detailOpen, setDetailOpen] = useState(false)
    const [pdfOpen, setPdfOpen] = useState(false)
    const [viewing, setViewing] = useState<WO | null>(null)
    const [editing, setEditing] = useState<WO | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterType, setFilterType] = useState('')

    // Form state
    const [form, setForm] = useState(defaultForm)
    const [items, setItems] = useState<Omit<WOItem, 'id'>[]>([])
    const [tasks, setTasks] = useState<Omit<WOTask, 'id'>[]>([])
    const [releasing, setReleasing] = useState(false)
    const [releaseWarehouse, setReleaseWarehouse] = useState('')

    // Expense Form State
    const [expenseModalOpen, setExpenseModalOpen] = useState(false)
    const [expenseForm, setExpenseForm] = useState({ category: 'TRANSPORT', amount: '', description: '' })
    const [submittingExpense, setSubmittingExpense] = useState(false)

    // Report Form State
    const [reportModalOpen, setReportModalOpen] = useState(false)
    const [reportForm, setReportForm] = useState({ description: '', progress: '0', reportedBy: '', taskId: '' })
    const [reportPhotos, setReportPhotos] = useState<File[]>([])
    const [submittingReport, setSubmittingReport] = useState(false)
    const [activeTab, setActiveTab] = useState<'INFO' | 'REPORTS'>('INFO')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const showToast = useCallback((type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }, [])

    const load = useCallback(async () => {
        if (!userRole) return
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (filterStatus) params.set('status', filterStatus)
            if (filterType) params.set('type', filterType)

            const endpoints = [
                { name: 'work-orders', url: `http://localhost:5000/api/work-orders?${params}` },
                { name: 'projects', url: 'http://localhost:5000/api/projects' },
                { name: 'orders', url: 'http://localhost:5000/api/orders' },
                { name: 'customers', url: 'http://localhost:5000/api/customers' },
                { name: 'stock', url: 'http://localhost:5000/api/inventory/stock' },
                { name: 'warehouses', url: 'http://localhost:5000/api/warehouses' },
                { name: 'company', url: 'http://localhost:5000/api/settings/company' }
            ]

            const results = await Promise.all(
                endpoints.map(e => fetch(e.url, { headers: { 'x-user-role': userRole } }).then(async r => {
                    if (!r.ok) throw new Error(`Endpoint ${e.name} failed with status ${r.status}`)
                    const ct = r.headers.get('content-type')
                    if (!ct || !ct.includes('application/json')) {
                        const txt = await r.text()
                        console.error(`Endpoint ${e.name} returned non-JSON:`, txt.substring(0, 500))
                        throw new Error(`Endpoint ${e.name} did not return JSON`)
                    }
                    return r.json()
                }))
            )

            setWos(results[0])
            setProjects(results[1])
            setSalesOrders(results[2])
            setCustomers(results[3])
            setSkus(results[4])
            setWarehouses(results[5])
            setCompanyInfo(results[6] || {})
        } catch (e: any) {
            console.error('Work Order load error:', e)
            showToast('error', e.message || 'Gagal memuat data')
        } finally { setLoading(false) }
    }, [search, filterStatus, filterType, showToast, userRole])

    useEffect(() => { load() }, [load])

    // Summary Stats
    const stats = {
        total: wos.length,
        inProgress: wos.filter(w => w.status === 'IN_PROGRESS').length,
        urgent: wos.filter(w => w.priority === 'URGENT' && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length,
        completed: wos.filter(w => w.status === 'COMPLETED' || w.status === 'CLOSED').length,
    }

    // Modal Helpers
    const openCreate = () => {
        setEditing(null)
        setForm(defaultForm)
        setItems([])
        setTasks([])
        setModalOpen(true)
    }

    const openEdit = (wo: WO) => {
        setEditing(wo)
        setForm({
            title: wo.title, description: wo.description || '', type: wo.type, priority: wo.priority,
            projectId: wo.projectId || '',
            salesOrderId: wo.salesOrderId || '',
            customerId: wo.customerId || '',
            assignedTo: wo.assignedTo || '', location: wo.location || '',
            scheduledStart: wo.scheduledStart ? wo.scheduledStart.split('T')[0] : '',
            scheduledEnd: wo.scheduledEnd ? wo.scheduledEnd.split('T')[0] : '',
            estimatedHours: wo.estimatedHours?.toString() || '', notes: wo.notes || ''
        })
        setItems((wo.items || []).map(i => ({
            id: i.id, type: i.type, source: (i as any).source || 'STOCK', description: i.description, skuId: i.skuId,
            qty: i.qty, unit: i.unit, unitCost: i.unitCost, totalCost: i.totalCost,
            notes: i.notes, isReleased: i.isReleased || false
        })))
        setTasks((wo.tasks || []).map(t => ({ id: t.id, title: t.title, description: t.description, isDone: t.isDone, doneAt: t.doneAt })))
        setModalOpen(true)
    }

    const openDetail = async (wo: WO) => {
        setLoading(true)
        try {
            const res = await fetch(`http://localhost:5000/api/work-orders/${wo.id}`, {
                headers: { 'x-user-role': userRole }
            })
            if (res.ok) {
                const data = await res.json()
                setViewing(data)
            } else {
                setViewing(wo)
            }
            setActiveTab('INFO')
            setDetailOpen(true)
        } finally {
            setLoading(false)
        }
    }

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const payload = {
                title: form.title, description: form.description, type: form.type, priority: form.priority,
                projectId: form.projectId || null,
                salesOrderId: form.salesOrderId || null,
                customerId: form.customerId || null,
                assignedTo: form.assignedTo, location: form.location,
                scheduledStart: form.scheduledStart || null, scheduledEnd: form.scheduledEnd || null,
                estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
                notes: form.notes,
                items: items.map(i => ({ ...i, totalCost: i.qty * i.unitCost })),
                tasks: tasks.map(t => ({ ...t }))
            }
            const url = editing ? `http://localhost:5000/api/work-orders/${editing.id}` : 'http://localhost:5000/api/work-orders'
            const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify(payload) })
            if (res.ok) { setModalOpen(false); showToast('success', editing ? 'Work Order diperbarui' : 'Work Order dibuat'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleReleaseMaterials = async (woId: string) => {
        if (!releaseWarehouse) return showToast('error', 'Pilih gudang asal material')
        setReleasing(true)
        try {
            const r = await fetch(`http://localhost:5000/api/work-orders/${woId}/release-materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({ warehouseId: releaseWarehouse })
            })
            if (!r.ok) {
                const err = await r.json()
                throw new Error(err.message || 'Gagal merilis material')
            }
            showToast('success', 'Material berhasil dirilis ke gudang (Draft Stock Movement)')
            setReleaseWarehouse('')
            load()
        } catch (e: any) {
            showToast('error', e.message)
        } finally { setReleasing(false) }
    }

    const handleRequestExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewing) return;
        setSubmittingExpense(true)
        try {
            const res = await fetch(`http://localhost:5000/api/work-orders/${viewing.id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify(expenseForm)
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || 'Gagal request biaya')
            }
            showToast('success', 'Permintaan biaya berhasil dikirim ke Finance')
            setExpenseModalOpen(false)
            setExpenseForm({ category: 'TRANSPORT', amount: '', description: '' })
            openDetail(viewing)
            load()
        } catch (err: any) {
            showToast('error', err.message)
        } finally { setSubmittingExpense(false) }
    }

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!viewing) return
        setSubmittingReport(true)
        try {
            const formData = new FormData()
            formData.append('description', reportForm.description)
            formData.append('progress', reportForm.progress)
            formData.append('reportedBy', reportForm.reportedBy)
            if (reportForm.taskId) formData.append('taskId', reportForm.taskId)
            reportPhotos.forEach(file => formData.append('photos', file))

            const res = await fetch(`http://localhost:5000/api/work-orders/${viewing.id}/reports`, {
                method: 'POST',
                headers: { 'x-user-role': userRole },
                body: formData
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || 'Gagal mengirim laporan')
            }

            showToast('success', 'Laporan progress berhasil dikirim')
            setReportModalOpen(false)
            setReportForm({ description: '', progress: '0', reportedBy: '', taskId: '' })
            setReportPhotos([])
            openDetail(viewing)
            load()
        } catch (err: any) {
            showToast('error', err.message)
        } finally { setSubmittingReport(false) }
    }

    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('Hapus laporan ini?')) return
        try {
            const res = await fetch(`http://localhost:5000/api/reports/${reportId}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
            if (res.ok) {
                showToast('success', 'Laporan dihapus')
                if (viewing) openDetail(viewing)
                load()
            }
        } catch (e) { showToast('error', 'Gagal menghapus laporan') }
    }

    const handleStatusChange = async (wo: WO, nextStatus: string) => {
        const res = await fetch(`http://localhost:5000/api/work-orders/${wo.id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify({ status: nextStatus })
        })
        if (res.ok) { showToast('success', `Status berubah ke ${WO_STATUS[nextStatus].label}`); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const handleTaskToggle = async (woId: string, taskId: string, isDone: boolean) => {
        await fetch(`http://localhost:5000/api/work-orders/${woId}/tasks/${taskId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify({ isDone })
        })
        if (viewing) {
            setViewing(prev => prev ? { ...prev, tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, isDone } : t) } : prev)
        }
        load()
    }

    const handleDelete = async (wo: WO) => {
        if (!confirm(`Hapus WO "${wo.number}"?`)) return
        const res = await fetch(`http://localhost:5000/api/work-orders/${wo.id}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
        if (res.ok) { showToast('success', 'Work Order dihapus'); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    // Form Helpers
    const handleSalesOrderChange = (soId: string) => {
        const so = salesOrders.find(s => s.id === soId) as any
        if (so) {
            setForm(prev => ({
                ...prev,
                salesOrderId: soId,
                customerId: so.customer?.id || so.customerId || prev.customerId,
                location: so.customer?.address || prev.location,
                projectId: so.projectId || prev.projectId
            }))
        } else {
            setForm(prev => ({ ...prev, salesOrderId: soId }))
        }
    }

    const handleProjectChange = (pId: string) => {
        const p = projects.find(proj => proj.id === pId) as any
        if (p) {
            setForm(prev => ({
                ...prev,
                projectId: pId,
                customerId: p.customer?.id || p.customerId || prev.customerId,
                location: p.customer?.address || prev.location
            }))
        } else {
            setForm(prev => ({ ...prev, projectId: pId }))
        }
    }

    const handleCustomerChange = (cId: string) => {
        const c = customers.find(cust => cust.id === cId) as any
        if (c) {
            setForm(prev => ({
                ...prev,
                customerId: cId,
                location: c.address || prev.location
            }))
        } else {
            setForm(prev => ({ ...prev, customerId: cId }))
        }
    }

    // Item Helpers
    const addItem = () => setItems([...items, { type: 'MATERIAL', source: 'STOCK', description: '', qty: 1, unit: 'unit', unitCost: 0, totalCost: 0, isReleased: false }])
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
    const updateItem = (idx: number, field: string, val: unknown) => {
        const ni = [...items]
        ni[idx] = { ...ni[idx], [field]: val }
        if (field === 'skuId') {
            const sku = skus.find(s => s.id === val)
            if (sku) { ni[idx].description = ni[idx].description || sku.product.name; ni[idx].unitCost = sku.purchasePrice }
        }
        ni[idx].totalCost = ni[idx].qty * ni[idx].unitCost
        setItems(ni)
    }
    const addTask = () => setTasks([...tasks, { title: '', isDone: false }])
    const removeTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i))

    const totalEstCost = items.reduce((s, i) => s + i.totalCost, 0)
    const ic = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm"
    const lc = "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block"

    return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-5 md:py-6 space-y-5 md:space-y-6 font-inter w-full bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-4 right-4 z-[400] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-600/20 shrink-0"><HardHat size={20} className="text-white" /></div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Work Orders</h1>
                        <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">Manajemen Pekerjaan Operasional</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={openCreate} className="hidden md:flex rounded-xl bg-amber-600 hover:bg-amber-700 text-white h-10 px-5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-600/20 active:scale-95 transition-all">
                        <Plus size={14} className="mr-2" /> Work Order Baru
                    </Button>
                    <Button variant="outline" onClick={load} className="flex-1 md:flex-none rounded-xl border-slate-200 text-slate-600 h-10 px-4 md:w-10 md:px-0 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span className="md:hidden">Refresh</span>
                    </Button>
                </div>
            </header>

            {/* Mobile FAB */}
            <button
                onClick={openCreate}
                className="md:hidden fixed bottom-24 right-6 z-[100] w-14 h-14 bg-amber-600 text-white rounded-full shadow-[0_8px_30px_rgb(217,119,6,0.4)] flex items-center justify-center active:scale-90 transition-all border-4 border-white"
            >
                <Plus size={28} strokeWidth={3} />
            </button>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total WO', value: stats.total, color: 'bg-slate-700', icon: Wrench },
                    { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-500', icon: Play },
                    { label: 'Urgent', value: stats.urgent, color: 'bg-rose-600', icon: AlertTriangle },
                    { label: 'Selesai', value: stats.completed, color: 'bg-emerald-600', icon: CheckCircle2 },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl md:rounded-3xl p-3.5 md:p-5 border border-slate-100 shadow-sm flex items-center md:block gap-3">
                        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${s.color} flex items-center justify-center shrink-0 md:mb-3`}><s.icon size={15} className="text-white" /></div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">{s.label}</p>
                            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor, judul, PIC…"
                        className="pl-9 pr-4 py-2.5 md:py-3 text-sm border border-slate-200 rounded-xl md:rounded-2xl bg-white w-full focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all shadow-sm" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    <div className="relative shrink-0">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none md:hidden"><ChevronDown size={14} /></div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} 
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider outline-none shadow-sm focus:border-amber-500 whitespace-nowrap appearance-none md:appearance-auto pl-8 md:pl-3">
                            <option value="">Status</option>
                            {Object.entries(WO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div className="relative shrink-0">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none md:hidden"><ChevronDown size={14} /></div>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} 
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider outline-none shadow-sm focus:border-amber-500 whitespace-nowrap appearance-none md:appearance-auto pl-8 md:pl-3">
                            <option value="">Tipe</option>
                            {Object.entries(WO_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
            ) : (
                <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nomor / Judul</th>
                                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Referensi</th>
                                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">PIC / Lokasi</th>
                                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Jadwal</th>
                                <th className="px-5 py-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                                <th className="px-5 py-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-3.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {wos.map(wo => {
                                const doneTasks = wo.tasks?.filter(t => t.isDone).length || 0
                                const totalTasks = wo.tasks?.length || 0
                                const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null
                                return (
                                    <tr key={wo.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openDetail(wo)}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${WO_PRIORITY[wo.priority]}`}>{wo.priority}</span>
                                            </div>
                                            <p className="font-black text-xs text-amber-600">{wo.number}</p>
                                            <p className="font-semibold text-slate-800 text-sm leading-tight">{wo.title}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${WO_TYPE[wo.type]?.color}`}>
                                                {WO_TYPE[wo.type]?.icon} {wo.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {wo.project && <p className="font-semibold text-indigo-600">{wo.project.number}</p>}
                                            {wo.customer && <p>{wo.customer.name}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {wo.assignedTo && <p className="flex items-center gap-1"><User size={10} /> {wo.assignedTo}</p>}
                                            {wo.location && <p className="flex items-center gap-1"><MapPin size={10} /> {wo.location}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {wo.scheduledStart && <p>{fmtDate(wo.scheduledStart)}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {pct !== null ? (
                                                <div>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">{doneTasks}/{totalTasks}</p>
                                                </div>
                                            ) : <span className="text-[9px] text-slate-300">—</span>}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${WO_STATUS[wo.status]?.color}`}>{WO_STATUS[wo.status]?.label}</span>
                                        </td>
                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => { openEdit(wo); }} className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"><Edit size={13} /></button>
                                                {['DRAFT', 'CANCELLED'].includes(wo.status) && (
                                                    <button onClick={() => handleDelete(wo)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"><Trash2 size={13} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-4">
                    {wos.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <HardHat size={32} className="text-slate-300" />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-10">Belum ada Work Order yang tersedia</p>
                        </div>
                    ) : wos.map(wo => {
                        const doneTasks = wo.tasks?.filter(t => t.isDone).length || 0
                        const totalTasks = wo.tasks?.length || 0
                        const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null
                        const statusCfg = WO_STATUS[wo.status]
                        const typeCfg = WO_TYPE[wo.type]
                        return (
                            <motion.div key={wo.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => openDetail(wo)}
                                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] pointer-events-none ${statusCfg?.color?.split(' ')[0]}`} />
                                
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${WO_PRIORITY[wo.priority]}`}>{wo.priority}</span>
                                            <span className="text-[11px] font-black text-amber-600 tracking-tighter">{wo.number}</span>
                                        </div>
                                        <h3 className="text-[15px] font-black text-slate-900 leading-tight mb-1">{wo.title}</h3>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${typeCfg?.color}`}>{typeCfg?.label}</span>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusCfg?.color}`}>{statusCfg?.label}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0"><User size={12} className="text-slate-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Assigned To</p>
                                            <p className="text-[11px] font-bold text-slate-700 truncate">{wo.assignedTo || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center shrink-0"><Calendar size={12} className="text-slate-400" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Schedule</p>
                                            <p className="text-[11px] font-bold text-slate-700 truncate">{fmtDate(wo.scheduledStart)}</p>
                                        </div>
                                    </div>
                                </div>

                                {pct !== null && (
                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Job Progress</span>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-600">{doneTasks}/{totalTasks} Task</span>
                                        </div>
                                        <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${pct}%` }} 
                                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all shadow-[0_0_8px_rgba(245,158,11,0.3)]" 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                                    <div className="flex -space-x-1.5">
                                        {/* Avatar stack or just a placeholder */}
                                        <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">{wo.assignedTo?.substring(0, 1) || '?'}</div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => openEdit(wo)}
                                            className="h-9 px-3 rounded-xl bg-indigo-50 text-indigo-600 flex items-center gap-1.5 border border-indigo-100 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider">
                                            <Edit size={14} /> Edit
                                        </button>
                                        {['DRAFT', 'CANCELLED'].includes(wo.status) && (
                                            <button onClick={() => handleDelete(wo)}
                                                className="h-9 px-3 rounded-xl bg-rose-50 text-rose-600 flex items-center gap-1.5 border border-rose-100 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider">
                                                <Trash2 size={14} /> Hapus
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
                </>
            )}

            {/* Detail Drawer */}
            <AnimatePresence>
                {detailOpen && viewing && (
                    <div className="fixed inset-0 z-[150] flex items-end md:items-stretch md:justify-end text-slate-900">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { x: '100%' }} 
                            animate={isMobile ? { y: 0 } : { x: 0 }} 
                            exit={isMobile ? { y: '100%' } : { x: '100%' }} 
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full md:max-w-2xl bg-white h-[92vh] md:h-full overflow-y-auto shadow-2xl flex flex-col rounded-t-[2.5rem] md:rounded-none">

                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

                            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{viewing.number}</p>
                                    <h2 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight">{viewing.title}</h2>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${WO_STATUS[viewing.status]?.color}`}>{WO_STATUS[viewing.status]?.label}</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${WO_TYPE[viewing.type]?.color}`}>{WO_TYPE[viewing.type]?.icon} {viewing.type}</span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${WO_PRIORITY[viewing.priority]}`}>{viewing.priority}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => setPdfOpen(true)} className="text-slate-400 hover:text-indigo-600 w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center transition-colors"><Printer size={18} /></button>
                                    <button onClick={() => setDetailOpen(false)} className="text-slate-400 hover:text-rose-600 w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center transition-colors"><X size={20} /></button>
                                </div>
                            </div>

                            <div className="px-5 md:px-8 border-b border-slate-100 flex gap-4 md:gap-6 bg-white sticky top-[89px] md:top-[92px] z-10">
                                <button onClick={() => setActiveTab('INFO')} className={`py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'INFO' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Informasi Umum</button>
                                <button onClick={() => setActiveTab('REPORTS')} className={`py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'REPORTS' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                    Progress
                                    {viewing.reports?.length > 0 && <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full text-[9px]">{viewing.reports.length}</span>}
                                </button>
                            </div>

                            <div className="px-5 md:px-8 py-4 md:py-6 space-y-5 md:space-y-7 flex-1 pb-20">
                                {activeTab === 'INFO' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InfoBlock label="Pelanggan" value={viewing.customer?.name} />
                                            <InfoBlock label="PIC / Teknisi" value={viewing.assignedTo} />
                                            <InfoBlock label="Lokasi" value={viewing.location} icon={<MapPin size={11} className="text-slate-400" />} />
                                            <InfoBlock label="Project" value={viewing.project ? `${viewing.project.number} — ${viewing.project.name}` : undefined} />
                                            <InfoBlock label="Jadwal Mulai" value={fmtDate(viewing.scheduledStart)} />
                                            <InfoBlock label="Jadwal Selesai" value={fmtDate(viewing.scheduledEnd)} />
                                        </div>

                                        {viewing.description && (
                                            <div><p className={lc}>Deskripsi</p><p className="text-sm text-slate-600 bg-slate-50 rounded-2xl p-4">{viewing.description}</p></div>
                                        )}

                                        {viewing.tasks.length > 0 && (
                                            <div>
                                                <p className={lc + ' flex items-center gap-2'}><ClipboardList size={12} /> Checklist Pekerjaan ({viewing.tasks.filter(t => t.isDone).length}/{viewing.tasks.length})</p>
                                                <div className="space-y-2">
                                                    {viewing.tasks.map(task => (
                                                        <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${task.isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                                                            <button onClick={() => handleTaskToggle(viewing.id, task.id!, !task.isDone)} className="mt-0.5 flex-shrink-0">
                                                                {task.isDone ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-300 hover:text-amber-500 transition-colors" />}
                                                            </button>
                                                            <p className={`text-sm font-medium leading-tight ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {viewing.items.length > 0 && (
                                            <div>
                                                <p className={lc + ' flex items-center gap-2'}><Package size={12} /> Bill of Materials ({viewing.items.length} item)</p>
                                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-4 py-2 text-left text-[8px] font-black text-slate-400 uppercase">Deskripsi</th><th className="px-4 py-2 text-center text-[8px] font-black text-slate-400 uppercase">Qty</th><th className="px-4 py-2 text-center text-[8px] font-black text-slate-400 uppercase">Sumber</th><th className="px-4 py-2 text-right text-[8px] font-black text-slate-400 uppercase text-nowrap">Rilis?</th><th className="px-4 py-2 text-right text-[8px] font-black text-slate-400 uppercase">Total</th></tr></thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {viewing.items.map((item, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2.5 font-semibold text-slate-700">{item.description}</td>
                                                                    <td className="px-4 py-2.5 text-center">{item.qty} {item.unit}</td>
                                                                    <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">{ITEM_SOURCE[(item as any).source] || (item as any).source || 'STOCK'}</span></td>
                                                                    <td className="px-4 py-2.5 text-right">
                                                                        {item.type === 'MATERIAL' ? (item.isReleased ? 'Released' : 'Draft') : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{fmt(item.totalCost)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-100">
                                            <p className={lc}>Ubah Status</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {STATUS_TRANSITIONS[viewing.status]?.map(t => (
                                                    <button key={t.next} onClick={() => { handleStatusChange(viewing, t.next); setDetailOpen(false) }}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider ${t.color}`}>
                                                        <t.icon size={13} /> {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                                                <ClipboardList size={14} className="text-amber-500" /> Histori Progress
                                            </h3>
                                            <Button onClick={() => setReportModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider px-4 h-8">
                                                <Plus size={12} className="mr-1" /> Buat Laporan
                                            </Button>
                                        </div>

                                        <div className="space-y-6">
                                            {viewing.reports && viewing.reports.length > 0 ? (
                                                viewing.reports.map((report) => (
                                                    <div key={report.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative group/report">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{fmtDate(report.date)}</span>
                                                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{report.progress}% PROGRESS</span>
                                                                </div>
                                                                {report.task && (
                                                                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                                                        <SquareCheckBig size={12} className="text-emerald-500" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-tight">{report.task.title}</span>
                                                                    </div>
                                                                )}
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                    <User size={10} /> {report.reportedBy || 'Staff Lapangan'}
                                                                </p>
                                                            </div>
                                                            <button onClick={() => handleDeleteReport(report.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover/report:opacity-100 transition-opacity">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4 whitespace-pre-wrap">{report.description}</p>
                                                        {report.photos && report.photos.length > 0 && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {report.photos.map(p => (
                                                                    <div key={p.id} className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                                                                        <img src={`http://localhost:5000${p.url}`} alt="Progress" className="w-full h-full object-cover cursor-zoom-in" onClick={() => window.open(`http://localhost:5000${p.url}`, '_blank')} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                    <AlertCircle size={40} className="text-slate-200 mb-3" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Belum ada laporan</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-end md:items-start justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-0 md:pt-6 text-slate-900">
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }} 
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }} 
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-4xl min-h-[90vh] md:min-h-0 md:my-4 overflow-hidden flex flex-col">
                            
                            {/* Mobile Drag Handle for Modal */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-1 shrink-0" />
                            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center"><Wrench size={16} className="text-white" /></div>
                                    <h2 className="font-extrabold text-slate-900 text-base uppercase tracking-wider">{editing ? `Edit WO — ${editing.number}` : 'Work Order Baru'}</h2>
                                </div>
                                <button onClick={() => setModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-700" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                <Section title="Informasi Dasar" icon={<Wrench size={14} className="text-amber-500" />}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2"><label className={lc}>Judul Pekerjaan <span className="text-rose-500">*</span></label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Instalasi CCTV Gedung A Lt.3" className={ic} /></div>
                                        <div>
                                            <label className={lc}>Tipe Pekerjaan</label>
                                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={ic}>
                                                {Object.entries(WO_TYPE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={lc}>Prioritas</label>
                                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={ic}>
                                                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </Section>
                                <Section title="Penugasan & Jadwal" icon={<Calendar size={14} className="text-violet-500" />}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={lc}>Source Project (Opsional)</label>
                                            <select value={form.projectId} onChange={e => handleProjectChange(e.target.value)} className={ic}>
                                                <option value="">— Pilih Project —</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>[{p.number}] {p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={lc}>Pesanan Penjualan (Opsional)</label>
                                            <select value={form.salesOrderId} onChange={e => handleSalesOrderChange(e.target.value)} className={ic}>
                                                <option value="">— Pilih Sales Order —</option>
                                                {salesOrders.map(so => <option key={so.id} value={so.id}>{so.number}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={lc}>Pelanggan <span className="text-rose-500">*</span></label>
                                            <select required value={form.customerId} onChange={e => handleCustomerChange(e.target.value)} className={ic}>
                                                <option value="">— Pilih Pelanggan —</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={lc}>PIC / Teknisi</label><input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Nama teknisi" className={ic} /></div>
                                        <div><label className={lc}>Jadwal Mulai</label><input type="date" value={form.scheduledStart} onChange={e => setForm({ ...form, scheduledStart: e.target.value })} className={ic} /></div>
                                        <div><label className={lc}>Lokasi Pekerjaan</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Alamat atau lokasi" className={ic} /></div>
                                    </div>
                                </Section>
                                <Section title={`Checklist Pekerjaan (${tasks.length})`} icon={<SquareCheckBig size={14} className="text-sky-500" />}>
                                    <div className="space-y-2">
                                        {tasks.map((task, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input value={task.title} onChange={e => { const nt = [...tasks]; nt[idx].title = e.target.value; setTasks(nt) }} placeholder={`Langkah ${idx + 1}`} className={ic + ' flex-1'} />
                                                <button type="button" onClick={() => removeTask(idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addTask} className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400"> + Tambah Langkah</button>
                                    </div>
                                </Section>
                                <Section title={`Bill of Materials (${items.length} item)`} icon={<Package size={14} className="text-emerald-500" />}>
                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group">
                                                <button type="button" onClick={() => removeItem(idx)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                                <div className="grid grid-cols-12 gap-3 pr-2 md:pr-6">
                                                    <div className="col-span-6 md:col-span-3">
                                                        <label className={lc}>Tipe</label>
                                                        <select value={item.type} onChange={e => updateItem(idx, 'type', e.target.value)} className={ic}>
                                                            {Object.entries(ITEM_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-6 md:col-span-3">
                                                        <label className={lc}>Sumber (Source)</label>
                                                        <select value={item.source} onChange={e => updateItem(idx, 'source', e.target.value)} className={ic}>
                                                            {Object.entries(ITEM_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                        </select>
                                                    </div>
                                                    {item.source !== 'OPERASIONAL' ? (
                                                        <>
                                                            <div className="col-span-12 md:col-span-6">
                                                                <label className={lc}>Master Produk/Material (Opsional)</label>
                                                                <select value={item.skuId || ''} onChange={e => updateItem(idx, 'skuId', e.target.value || undefined)} className={ic}>
                                                                    <option value="">— Input Manual —</option>
                                                                    {skus.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="col-span-12 md:col-span-5">
                                                                <label className={lc}>Deskripsi / Nama Item</label>
                                                                <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Tulis deskripsi..." className={ic} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="col-span-12 md:col-span-11">
                                                            <label className={lc}>Deskripsi / Nama Item</label>
                                                            <input value={item.description} onChange={e => {
                                                                // Always clear SKU ID if it's Operasional
                                                                const ni = [...items]
                                                                ni[idx].description = e.target.value
                                                                ni[idx].skuId = undefined
                                                                setItems(ni)
                                                            }} placeholder="Tulis deskripsi operasional manual..." className={ic} />
                                                        </div>
                                                    )}
                                                    <div className="col-span-4 md:col-span-3">
                                                        <label className={lc}>Qty</label>
                                                        <input type="number" min="0" step="any" value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} className={ic} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-3">
                                                        <label className={lc}>Satuan</label>
                                                        <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className={ic} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-3">
                                                        <label className={lc}>Biaya Satuan</label>
                                                        <input type="number" min="0" step="any" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className={ic} />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className={lc}>Total Biaya</label>
                                                        <input disabled value={fmt(item.totalCost)} className={ic + ' bg-slate-100 font-bold text-slate-700 cursor-not-allowed'} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {items.length > 0 && (
                                            <div className="flex justify-end pr-2 pt-2">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estimasi Total Biaya</p>
                                                    <p className="text-lg font-black text-slate-900">{fmt(totalEstCost)}</p>
                                                </div>
                                            </div>
                                        )}
                                        <button type="button" onClick={addItem} className="w-full py-3 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 bg-white hover:bg-slate-50 transition-colors"> + Tambah Item BOM</button>
                                    </div>
                                </Section>
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl h-12 font-bold uppercase">Batal</Button>
                                    <Button type="submit" disabled={saving} className="flex-1 rounded-xl h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase shadow-lg shadow-amber-600/20">
                                        {saving ? 'Menyimpan...' : 'Simpan Work Order'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Request Expense Modal */}
            <AnimatePresence>
                {expenseModalOpen && viewing && (
                    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm text-slate-900">
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }} 
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }} 
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-t-[2rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pb-8 md:pb-0">
                            
                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-1 shrink-0" />
                            
                            <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50/50">
                                <h2 className="font-extrabold text-slate-900 text-sm uppercase">Request Biaya</h2>
                                <button onClick={() => setExpenseModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-700" /></button>
                            </div>
                            <form onSubmit={handleRequestExpense} className="p-6 space-y-4">
                                <div><label className={lc}>Nominal (Rp)</label><input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={ic} /></div>
                                <div><label className={lc}>Keperluan</label><textarea required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} rows={3} className={ic} /></div>
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)} className="flex-1 rounded-xl">Batal</Button>
                                    <Button type="submit" disabled={submittingExpense} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Kirim</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Report Modal */}
            <AnimatePresence>
                {reportModalOpen && viewing && (
                    <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm text-slate-900">
                        <motion.div 
                            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }} 
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }} 
                            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">
                            
                            {/* Mobile Drag Handle */}
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-1 shrink-0" />

                            <div className="flex items-center justify-between px-8 py-5 border-b border-amber-100 bg-amber-50/50">
                                <div>
                                    <h2 className="font-extrabold text-slate-900 text-xs md:text-sm uppercase tracking-wider">Laporan Progress</h2>
                                    <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">{viewing.number}</p>
                                </div>
                                <button onClick={() => setReportModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmitReport} className="p-6 md:p-8 space-y-5 overflow-y-auto pb-10 md:pb-8">
                                <div>
                                    <label className={lc}>Pilih Checklist Pekerjaan <span className="text-rose-500">*</span></label>
                                    <select required value={reportForm.taskId} onChange={e => setReportForm({ ...reportForm, taskId: e.target.value })} className={ic}>
                                        <option value="">— Pilih Langkah Pekerjaan —</option>
                                        {viewing.tasks.map((t, idx) => (
                                            <option key={t.id} value={t.id}>{idx + 1}. {t.title} {t.isDone ? '(SELESAI)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={lc}>Progress (%)</label><input required type="number" min="0" max="100" value={reportForm.progress} onChange={e => setReportForm({ ...reportForm, progress: e.target.value })} className={ic} /></div>
                                    <div><label className={lc}>Dilaporkan Oleh</label><input value={reportForm.reportedBy} onChange={e => setReportForm({ ...reportForm, reportedBy: e.target.value })} className={ic} /></div>
                                </div>
                                <div><label className={lc}>Keterangan</label><textarea required value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} rows={4} className={ic} /></div>
                                <div>
                                    <label className={lc}>Foto Lapangan</label>
                                    <input type="file" multiple accept="image/*" onChange={e => { if (e.target.files) setReportPhotos([...reportPhotos, ...Array.from(e.target.files)]) }} className={ic} />
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {reportPhotos.map((file, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => setReportPhotos(reportPhotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-rose-500 text-white rounded-md p-0.5"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <Button type="button" variant="outline" onClick={() => setReportModalOpen(false)} className="flex-1 rounded-xl h-12">Batal</Button>
                                    <Button type="submit" disabled={submittingReport} className="flex-1 rounded-xl h-12 bg-amber-600 text-white font-bold">{submittingReport ? 'Mengirim...' : 'Kirim Laporan'}</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PDF Modal */}
            <AnimatePresence>
                {pdfOpen && viewing && (
                    <WorkOrderPDFModal
                        workOrder={viewing as any}
                        company={companyInfo}
                        onClose={() => setPdfOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</h3>
                <div className="flex-1 h-px bg-slate-100" />
            </div>
            {children}
        </div>
    )
}

function InfoBlock({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
    if (!value) return null
    return (
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">{icon}{value}</p>
        </div>
    )
}
