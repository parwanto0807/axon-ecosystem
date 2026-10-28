"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Wrench, Plus, Search, Edit, Trash2, X, CheckCircle2, AlertCircle, RefreshCw, MapPin, User, Calendar, Package, ClipboardList, Play, Pause, Check, Ban, XCircle, HardHat, AlertTriangle, SquareCheckBig, Circle, Printer, Box, Wind, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import WorkOrderPDFModal from "./WorkOrderPDFModal"
import { useSession } from "next-auth/react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface WO {
    id: string; number: string; title: string; description?: string
    type: string; status: string; priority: string
    projectId?: string; project?: { number: string; name: string }
    salesOrderId?: string; salesOrder?: { number: string }
    customerId?: string; customer?: { id: string; name: string; code: string; address?: string | null }
    assetId?: string; asset?: { id: string; name: string; category: string; brand?: string; model?: string; serialNumber?: string }
    assignedTo?: string; location?: string
    scheduledStart?: string; scheduledEnd?: string
    actualStart?: string; actualEnd?: string
    estimatedHours?: number; actualHours?: number
    notes?: string; completionNotes?: string
    items: WOItem[]; tasks: WOTask[]
    stockMovements: any[]
    expenses: any[]
    reports: WorkOrderReport[]
    purchaseOrders?: PurchaseOrder[]
    _count?: { items: number; tasks: number; reports: number }
    businessCategoryId?: string
    businessCategory?: { id: string; name: string }
    createdAt: string
}
interface BusinessCategory { id: string; name: string; description?: string }
interface WorkOrderReport {
    id: string
    workOrderId: string
    taskId?: string | null
    task?: { id: string; title: string }
    date: string
    description: string
    progress: number
    checklist?: any
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
interface SKU { id: string; code: string; name: string; purchasePrice: number; product: { name: string; type?: string } }

interface PurchaseOrderItem {
    id: string
    purchaseOrderId: string
    no: number
    description: string
    qty: number
    unit: string
    unitPrice: number
    discount: number
    amount: number
}

interface PurchaseOrder {
    id: string
    number: string
    date: string
    status: string
    vendorId: string
    vendor?: { name: string; code: string }
    projectId?: string | null
    salesOrderId?: string | null
    workOrderId?: string | null
    grandTotal: number
    items: PurchaseOrderItem[]
}

// ─── Config ──────────────────────────────────────────────────────────────────

const WO_TYPE: Record<string, { label: string; color: string; icon: string }> = {
    SERVICE: { label: 'Jasa / IT Support', color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400', icon: '🔧' },
    INSTALLATION: { label: 'Instalasi', color: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400', icon: '📷' },
    REPAIR: { label: 'Perbaikan', color: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400', icon: '🛠' },
    DEVELOPMENT: { label: 'Pengembangan Sistem', color: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400', icon: '💻' },
    PROCUREMENT: { label: 'Pengadaan Hardware/SW', color: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-400', icon: '🖥' },
}
const WO_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'border-border bg-muted text-muted-foreground' },
    CONFIRMED: { label: 'Confirmed', color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400' },
    IN_PROGRESS: { label: 'In Progress', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400' },
    ON_HOLD: { label: 'On Hold', color: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400' },
    COMPLETED: { label: 'Completed', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400' },
    CLOSED: { label: 'Closed', color: 'border-border bg-card text-muted-foreground' },
    CANCELLED: { label: 'Cancelled', color: 'border-border bg-muted text-muted-foreground line-through' },
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
    AC: ['Cuci Filter / Indoor', 'Pembersihan Outdoor', 'Cek Tekanan Freon', 'Cek Drainase Lendir', 'Cek Arus Listrik (Ampere)', 'Cek Kebocoran Pipa', 'Tes Fungsi Remote'],
    IT: ['Cek Koneksi Jaringan', 'Update Patch / Software', 'Backup Data Konfigurasi', 'Pembersihan Fisik (Dusting)', 'Cek Log Error System', 'Pengetesan Performa'],
    GENERAL: ['Pemeriksaan Kondisi Fisik', 'Pembersihan Unit', 'Pengetesan Fungsi Utama', 'Pelumasan Komponen Bergerak', 'Update Status Label']
}
const WO_PRIORITY: Record<string, string> = {
    LOW: 'border-border bg-muted text-muted-foreground',
    NORMAL: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400',
    HIGH: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
    URGENT: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400',
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
    DRAFT: [{ next: 'CONFIRMED', label: 'Konfirmasi', icon: CheckCircle2, color: 'bg-primary hover:bg-primary/90' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    CONFIRMED: [{ next: 'IN_PROGRESS', label: 'Mulai Kerjakan', icon: Play, color: 'bg-primary hover:bg-primary/90' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    IN_PROGRESS: [{ next: 'ON_HOLD', label: 'Tahan / Hold', icon: Pause, color: 'bg-amber-500 hover:bg-amber-600' }, { next: 'COMPLETED', label: 'Selesai', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-700' }],
    ON_HOLD: [{ next: 'IN_PROGRESS', label: 'Lanjutkan', icon: Play, color: 'bg-primary hover:bg-primary/90' }, { next: 'CANCELLED', label: 'Batalkan', icon: Ban, color: 'bg-rose-600 hover:bg-rose-700' }],
    COMPLETED: [{ next: 'CLOSED', label: 'Tutup WO', icon: XCircle, color: 'bg-primary hover:bg-primary/90' }],
    CLOSED: [],
    CANCELLED: [],
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const defaultForm = { title: '', description: '', type: 'SERVICE', priority: 'NORMAL', projectId: '', salesOrderId: '', customerId: '', assetId: '', assignedTo: '', location: '', scheduledStart: '', scheduledEnd: '', estimatedHours: '', notes: '', businessCategoryId: '' }

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>}>
            <WorkOrdersContent />
        </Suspense>
    )
}

function WorkOrdersContent() {
    const searchParams = useSearchParams()
    const targetId = searchParams.get('id')
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role

    const [wos, setWos] = useState<WO[]>([])
    const [projects, setProjects] = useState<Ref[]>([])
    const [salesOrders, setSalesOrders] = useState<Ref[]>([])
    const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([])
    const [assets, setAssets] = useState<{ id: string; name: string; customerId: string; category: string; brand?: string; model?: string; serialNumber?: string }[]>([])
    const [skus, setSkus] = useState<SKU[]>([])
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
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
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])
    const [filterBusinessCategoryId, setFilterBusinessCategoryId] = useState('')

    // Form state
    const [form, setForm] = useState(defaultForm)
    const [items, setItems] = useState<Omit<WOItem, 'id'>[]>([])
    const [tasks, setTasks] = useState<Omit<WOTask, 'id'>[]>([])
    const [releasing, setReleasing] = useState(false)
    const [releaseWarehouse, setReleaseWarehouse] = useState('')
    const [releaseModalOpen, setReleaseModalOpen] = useState(false)

    // PO Import state
    const [poImportModalOpen, setPoImportModalOpen] = useState(false)
    const [selectedPoId, setSelectedPoId] = useState('')
    const [selectedPoItems, setSelectedPoItems] = useState<Record<string, boolean>>({})
    const [selectedPoSource, setSelectedPoSource] = useState('STOCK')

    // Expense Form State
    const [expenseModalOpen, setExpenseModalOpen] = useState(false)
    const [expenseForm, setExpenseForm] = useState({ category: 'TRANSPORT', amount: '', description: '' })
    const [submittingExpense, setSubmittingExpense] = useState(false)

    // Report Form State
    const [reportModalOpen, setReportModalOpen] = useState(false)
    const [reportForm, setReportForm] = useState({ description: '', progress: '0', reportedBy: '', taskId: '', checklist: {} as any })
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
            if (filterBusinessCategoryId) params.set('businessCategoryId', filterBusinessCategoryId)

            const endpoints = [
                { name: 'work-orders', url: `${process.env.NEXT_PUBLIC_API_URL}/api/work-orders?${params}` },
                { name: 'projects', url: `${process.env.NEXT_PUBLIC_API_URL}/api/projects` },
                { name: 'orders', url: `${process.env.NEXT_PUBLIC_API_URL}/api/orders` },
                { name: 'customers', url: `${process.env.NEXT_PUBLIC_API_URL}/api/customers` },
                { name: 'assets', url: `${process.env.NEXT_PUBLIC_API_URL}/api/customer-assets` },
                { name: 'stock', url: `${process.env.NEXT_PUBLIC_API_URL}/api/inventory/stock` },
                { name: 'warehouses', url: `${process.env.NEXT_PUBLIC_API_URL}/api/warehouses` },
                { name: 'company', url: `${process.env.NEXT_PUBLIC_API_URL}/api/settings/company` },
                { name: 'business-categories', url: `${process.env.NEXT_PUBLIC_API_URL}/api/business-categories` },
                { name: 'purchase-orders', url: `${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders` }
            ]

            const results = await Promise.all(
                endpoints.map(e => fetch(e.url, { 
                    headers: { 
                        'x-user-role': userRole || '',
                        'x-user-dept': (session?.user as any)?.department || '',
                        'x-user-name': session?.user?.name || ''
                    } 
                }).then(async r => {
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
            setAssets(results[4])
            setSkus(results[5])
            setWarehouses(results[6])
            setCompanyInfo(results[7] || {})
            setBusinessCategories(results[8] || [])
            setPurchaseOrders(results[9] || [])
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
            assetId: wo.assetId || '',
            assignedTo: wo.assignedTo || '', location: wo.location || '',
            scheduledStart: wo.scheduledStart ? wo.scheduledStart.split('T')[0] : '',
            scheduledEnd: wo.scheduledEnd ? wo.scheduledEnd.split('T')[0] : '',
            estimatedHours: wo.estimatedHours?.toString() || '', notes: wo.notes || '',
            businessCategoryId: wo.businessCategoryId || ''
        })
        setItems((wo.items || []).map(i => ({
            id: i.id, type: i.type, source: (i as any).source || 'STOCK', description: i.description, skuId: i.skuId,
            qty: i.qty, unit: i.unit, unitCost: i.unitCost, totalCost: i.totalCost,
            notes: i.notes, isReleased: i.isReleased || false
        })))
        setTasks((wo.tasks || []).map(t => ({ id: t.id, title: t.title, description: t.description, isDone: t.isDone, doneAt: t.doneAt })))
        setModalOpen(true)
    }

    const openDetail = async (wo: WO, autoOpenReport: boolean = false) => {
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${wo.id}`, {
                headers: { 'x-user-role': userRole }
            })
            if (res.ok) {
                const data = await res.json()
                setViewing(data)
            } else {
                setViewing(wo)
            }
            if (autoOpenReport) {
                setActiveTab('REPORTS')
                setReportModalOpen(true)
            } else {
                setActiveTab('INFO')
            }
            setDetailOpen(true)
        } finally {
            setLoading(false)
        }
    }

    // Auto-open if query param ?id=... is present
    useEffect(() => {
        if (targetId && wos.length > 0 && !viewing && !detailOpen) {
            const found = wos.find(w => w.id === targetId)
            if (found) {
                openDetail(found)
            }
        }
    }, [targetId, wos, viewing, detailOpen])

    // PO Import Helpers
    const openPoImportModal = () => {
        // Find candidate POs:
        const linkedPo = purchaseOrders.find(p => 
            (editing && p.workOrderId === editing.id) ||
            (form.projectId && p.projectId === form.projectId) ||
            (form.salesOrderId && p.salesOrderId === form.salesOrderId)
        )
        const initialPoId = linkedPo ? linkedPo.id : (purchaseOrders[0]?.id || '')
        setSelectedPoId(initialPoId)

        const poObj = purchaseOrders.find(p => p.id === initialPoId)
        const initialSelection: Record<string, boolean> = {}
        if (poObj?.items) {
            poObj.items.forEach(it => { initialSelection[it.id] = true })
        }
        setSelectedPoItems(initialSelection)
        setSelectedPoSource('STOCK')
        setPoImportModalOpen(true)
    }

    const handlePoSelectChange = (poId: string) => {
        setSelectedPoId(poId)
        const poObj = purchaseOrders.find(p => p.id === poId)
        const newSelection: Record<string, boolean> = {}
        if (poObj?.items) {
            poObj.items.forEach(it => { newSelection[it.id] = true })
        }
        setSelectedPoItems(newSelection)
    }

    const handleTogglePoItem = (itemId: string) => {
        setSelectedPoItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
    }

    const handleToggleAllPoItems = (selectAll: boolean) => {
        const poObj = purchaseOrders.find(p => p.id === selectedPoId)
        const newSelection: Record<string, boolean> = {}
        if (poObj?.items) {
            poObj.items.forEach(it => { newSelection[it.id] = selectAll })
        }
        setSelectedPoItems(newSelection)
    }

    const handleApplyPoItemsToBom = () => {
        const poObj = purchaseOrders.find(p => p.id === selectedPoId)
        if (!poObj || !poObj.items) return

        const itemsToAdd: Omit<WOItem, 'id'>[] = []
        poObj.items.forEach(it => {
            if (selectedPoItems[it.id]) {
                const matchedSku = skus.find(s => 
                    s.code === it.description ||
                    s.name?.toLowerCase() === it.description.toLowerCase() ||
                    s.product?.name?.toLowerCase() === it.description.toLowerCase()
                )

                const itemType = (matchedSku as any)?.product?.type === 'SERVICE' ? 'LABOR' : 'MATERIAL'
                const itemDescription = matchedSku ? `[${matchedSku.code}] ${matchedSku.product?.name || matchedSku.name}` : (it.description || 'Material')
                const qty = Number(it.qty) || 1
                const unitCost = Number(it.unitPrice) || 0

                itemsToAdd.push({
                    type: itemType,
                    source: selectedPoSource,
                    skuId: matchedSku?.id,
                    description: itemDescription,
                    qty: qty,
                    unit: it.unit || 'pcs',
                    unitCost: unitCost,
                    totalCost: qty * unitCost,
                    isReleased: false,
                    notes: `Ref PO: ${poObj.number}`
                })
            }
        })

        if (itemsToAdd.length === 0) {
            showToast('error', 'Pilih minimal satu item dari PO')
            return
        }

        setItems(prev => [...prev, ...itemsToAdd])
        setPoImportModalOpen(false)
        showToast('success', `${itemsToAdd.length} item dari PO berhasil dimasukkan ke Bill of Materials`)
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
                assetId: form.assetId || null,
                assignedTo: form.assignedTo, location: form.location,
                scheduledStart: form.scheduledStart || null, scheduledEnd: form.scheduledEnd || null,
                estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
                notes: form.notes,
                businessCategoryId: form.businessCategoryId || null,
                items: items.map(i => ({ ...i, totalCost: i.qty * i.unitCost })),
                tasks: tasks.map(t => ({ ...t }))
            }
            const url = editing ? `${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${editing.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/work-orders`
            const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify(payload) })
            if (res.ok) { setModalOpen(false); showToast('success', editing ? 'Work Order diperbarui' : 'Work Order dibuat'); load() }
            else { const d = await res.json(); showToast('error', d.message) }
        } finally { setSaving(false) }
    }

    const handleReleaseMaterials = async (woId: string) => {
        if (!releaseWarehouse) return showToast('error', 'Pilih gudang asal material')
        setReleasing(true)
        try {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${woId}/release-materials`, {
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${viewing.id}/expenses`, {
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
            formData.append('checklist', JSON.stringify(reportForm.checklist))
            reportPhotos.forEach(file => formData.append('photos', file))

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${viewing.id}/reports`, {
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
            setReportForm({ description: '', progress: '0', reportedBy: '', taskId: '', checklist: {} })
            setReportPhotos([])
            await openDetail(viewing)
            setActiveTab('REPORTS')
            load()
        } catch (err: any) {
            showToast('error', err.message)
        } finally { setSubmittingReport(false) }
    }

    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('Hapus laporan ini?')) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${reportId}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
            if (res.ok) {
                showToast('success', 'Laporan dihapus')
                if (viewing) openDetail(viewing)
                load()
            }
        } catch (e) { showToast('error', 'Gagal menghapus laporan') }
    }

    const handleStatusChange = async (wo: WO, nextStatus: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${wo.id}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify({ status: nextStatus })
        })
        if (res.ok) { showToast('success', `Status berubah ke ${WO_STATUS[nextStatus].label}`); load() }
        else { const d = await res.json(); showToast('error', d.message) }
    }

    const handleTaskToggle = async (woId: string, taskId: string, isDone: boolean) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${woId}/tasks/${taskId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': userRole }, body: JSON.stringify({ isDone })
        })
        if (viewing) {
            setViewing(prev => prev ? { ...prev, tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, isDone } : t) } : prev)
        }
        load()
    }

    const handleDelete = async (wo: WO) => {
        if (!confirm(`Hapus WO "${wo.number}"?`)) return
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders/${wo.id}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
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
    const ic = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
    const icItem = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
    const lc = "mb-1 block text-xs font-medium text-muted-foreground"
    const selectClass = "h-10 w-auto shrink-0 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px] space-y-4 md:space-y-5">
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`fixed right-4 top-4 z-[400] flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                            <HardHat size={18} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Work Orders</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">Manajemen Pekerjaan Operasional</p>
                        </div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                        {userRole !== 'OPERATIONAL' && (
                            <Button onClick={openCreate} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none">
                                <Plus size={16} className="mr-1.5" /> Buat Work Order
                            </Button>
                        )}
                        <Button variant="outline" onClick={load} className="h-9 rounded-lg px-3 text-sm font-medium">
                            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                            <span className="ml-1.5 hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                </header>

                {/* Mobile FAB */}
                {userRole !== 'OPERATIONAL' && (
                    <button
                        onClick={openCreate}
                        aria-label="Buat Work Order"
                        className="fixed bottom-24 right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
                    >
                        <Plus size={22} />
                    </button>
                )}

                <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Total WO', value: stats.total, icon: Wrench, tone: 'text-foreground' },
                        { label: 'In Progress', value: stats.inProgress, icon: Play, tone: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Urgent', value: stats.urgent, icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400' },
                        { label: 'Selesai', value: stats.completed, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted ${s.tone}`}>
                                <s.icon size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-lg font-semibold leading-tight tabular-nums text-foreground">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nomor, judul, PIC…"
                            className="h-10 w-full rounded-lg border border-border bg-background px-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
                            <option value="">Status</option>
                            {Object.entries(WO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
                            <option value="">Tipe</option>
                            {Object.entries(WO_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <select value={filterBusinessCategoryId} onChange={e => setFilterBusinessCategoryId(e.target.value)} className={selectClass}>
                            <option value="">All Units</option>
                            {businessCategories.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : wos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <HardHat size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">Belum ada Work Order</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">Belum ada Work Order yang tersedia</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Nomor / Judul</th>
                                            <th className="px-3 py-2.5 font-medium">Tipe</th>
                                            <th className="px-3 py-2.5 font-medium">Referensi</th>
                                            <th className="px-3 py-2.5 font-medium">PIC / Lokasi</th>
                                            <th className="px-3 py-2.5 font-medium">Business Unit</th>
                                            <th className="px-3 py-2.5 font-medium">Jadwal</th>
                                            <th className="px-3 py-2.5 text-center font-medium">Progress</th>
                                            <th className="px-3 py-2.5 text-center font-medium">Status</th>
                                            <th className="px-3 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {wos.map(wo => {
                                            const doneTasks = wo.tasks?.filter(t => t.isDone).length || 0
                                            const totalTasks = wo.tasks?.length || 0
                                            const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null
                                            return (
                                                <tr key={wo.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => openDetail(wo)}>
                                                    <td className="px-3 py-2.5">
                                                        <div className="mb-1 flex items-center gap-1.5">
                                                            <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${WO_PRIORITY[wo.priority]}`}>{wo.priority}</span>
                                                        </div>
                                                        <p className="text-xs font-medium text-primary">{wo.number}</p>
                                                        <p className="text-sm font-medium leading-tight text-foreground">{wo.title}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${WO_TYPE[wo.type]?.color}`}>
                                                            {WO_TYPE[wo.type]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                                        {wo.project && <p className="font-medium text-foreground">{wo.project.number}</p>}
                                                        {wo.customer && <p>{wo.customer.name}</p>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                                        {wo.assignedTo && <p className="flex items-center gap-1.5"><User size={11} /> {wo.assignedTo}</p>}
                                                        {wo.location && <p className="flex items-center gap-1.5"><MapPin size={11} /> {wo.location}</p>}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {wo.businessCategory ? (
                                                            <span className="inline-flex rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                {wo.businessCategory.name}
                                                            </span>
                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                                        {wo.scheduledStart ? fmtDate(wo.scheduledStart) : '—'}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        {pct !== null ? (
                                                            <div>
                                                                <div className="mx-auto h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                                    <div className={`h-full rounded-full ${doneTasks === totalTasks && totalTasks > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <p className={`mt-1 text-[11px] font-medium ${doneTasks === totalTasks && totalTasks > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{doneTasks}/{totalTasks}</p>
                                                            </div>
                                                        ) : <span className="block text-center text-xs text-muted-foreground">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${WO_STATUS[wo.status]?.color}`}>
                                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                            {WO_STATUS[wo.status]?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                        {userRole !== 'OPERATIONAL' && (
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <button onClick={() => { openEdit(wo); }} title="Edit Work Order" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Edit size={15} /></button>
                                                                {['DRAFT', 'CANCELLED'].includes(wo.status) && (
                                                                    <button onClick={() => handleDelete(wo)} title="Hapus Work Order" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card List */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {wos.map(wo => {
                                const doneTasks = wo.tasks?.filter(t => t.isDone).length || 0
                                const totalTasks = wo.tasks?.length || 0
                                const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null
                                const statusCfg = WO_STATUS[wo.status]
                                const typeCfg = WO_TYPE[wo.type]
                                return (
                                    <div key={wo.id} onClick={() => openDetail(wo)} className="rounded-xl border border-border bg-card p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${WO_PRIORITY[wo.priority]}`}>{wo.priority}</span>
                                                    <span className="text-[11px] font-medium text-primary">{wo.number}</span>
                                                </div>
                                                <h3 className="truncate text-sm font-medium leading-tight text-foreground">{wo.title}</h3>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeCfg?.color}`}>{typeCfg?.label}</span>
                                                    {wo.businessCategory && (
                                                        <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                            {wo.businessCategory.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCfg?.color}`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                {statusCfg?.label}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><User size={12} /></div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-muted-foreground">Assigned To</p>
                                                    <p className="truncate text-xs font-medium text-foreground">{wo.assignedTo || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Calendar size={12} /></div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-muted-foreground">Schedule</p>
                                                    <p className="truncate text-xs font-medium text-foreground">{fmtDate(wo.scheduledStart)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {pct !== null && (
                                            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-2.5">
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${doneTasks === totalTasks && totalTasks > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        Job Progress
                                                    </span>
                                                    <span className={`text-[11px] font-medium ${doneTasks === totalTasks && totalTasks > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{doneTasks}/{totalTasks} Task</span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                    <div className={`h-full rounded-full ${doneTasks === totalTasks && totalTasks > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                                                {wo.assignedTo?.substring(0, 1) || '?'}
                                            </div>
                                            {userRole !== 'OPERATIONAL' && (
                                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => openEdit(wo)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                                        <Edit size={14} /> Edit
                                                    </button>
                                                    {['DRAFT', 'CANCELLED'].includes(wo.status) && (
                                                        <button onClick={() => handleDelete(wo)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                                            <Trash2 size={14} /> Hapus
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Detail Drawer */}
                <AnimatePresence>
                    {detailOpen && viewing && (
                        <div className="fixed inset-0 z-[150] flex items-end justify-center md:items-stretch md:justify-end">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                                animate={isMobile ? { y: 0 } : { x: 0 }}
                                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                                className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl md:h-full md:max-w-2xl md:rounded-none md:border-l"
                            >
                                <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium text-primary">{viewing.number}</p>
                                        <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">{viewing.title}</h2>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${WO_STATUS[viewing.status]?.color}`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                {WO_STATUS[viewing.status]?.label}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${WO_TYPE[viewing.type]?.color}`}>{WO_TYPE[viewing.type]?.label}</span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${WO_PRIORITY[viewing.priority]}`}>{viewing.priority}</span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button onClick={() => setPdfOpen(true)} title="Cetak Work Order" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Printer size={16} /></button>
                                        <button onClick={() => setDetailOpen(false)} title="Tutup" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={18} /></button>
                                    </div>
                                </div>

                                <div className="border-b border-border px-4 py-2 md:px-6">
                                    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                                        <button onClick={() => setActiveTab('INFO')} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'INFO' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Informasi Umum</button>
                                        <button onClick={() => setActiveTab('REPORTS')} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'REPORTS' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                            Progress
                                            {viewing.reports?.length > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{viewing.reports.length}</span>}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-20 md:px-6 md:py-5">
                                    {activeTab === 'INFO' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoBlock label="Pelanggan" value={viewing.customer?.name} />
                                                <InfoBlock label="Aset / Unit" value={viewing.asset ? `[${viewing.asset.category}] ${viewing.asset.name} ${viewing.asset.serialNumber ? `(${viewing.asset.serialNumber})` : ''}` : undefined} icon={<Box size={12} className="text-muted-foreground" />} />
                                                <InfoBlock label="PIC / Teknisi" value={viewing.assignedTo} />
                                                <InfoBlock label="Lokasi" value={viewing.location} icon={<MapPin size={12} className="text-muted-foreground" />} />
                                                <InfoBlock label="Project" value={viewing.project ? `${viewing.project.number} — ${viewing.project.name}` : undefined} />
                                                <InfoBlock label="Jadwal Mulai" value={fmtDate(viewing.scheduledStart)} />
                                                <InfoBlock label="Jadwal Selesai" value={fmtDate(viewing.scheduledEnd)} />
                                                <InfoBlock label="Business Unit" value={viewing.businessCategory?.name} icon={<Wind size={12} className="text-muted-foreground" />} />
                                            </div>

                                            {viewing.purchaseOrders && viewing.purchaseOrders.length > 0 && (
                                                <div>
                                                    <p className={`${lc} flex items-center gap-1.5`}><ShoppingBag size={12} /> PO Pembelian Terkait ({viewing.purchaseOrders.length})</p>
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        {viewing.purchaseOrders.map((po: any) => (
                                                            <div key={po.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[11px] font-medium text-foreground">{po.number}</span>
                                                                        <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{po.status}</span>
                                                                    </div>
                                                                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">{po.vendor?.name || 'Vendor'}</p>
                                                                    <p className="text-[11px] text-muted-foreground">{po.items?.length || 0} item · {fmt(po.grandTotal || 0)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {viewing.description && (
                                                <div>
                                                    <p className={lc}>Deskripsi</p>
                                                    <p className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground">{viewing.description}</p>
                                                </div>
                                            )}

                                            {viewing.tasks.length > 0 && (
                                                <div>
                                                    <p className={`${lc} flex items-center gap-1.5 ${viewing.tasks.filter((t: any) => t.isDone).length === viewing.tasks.length ? 'text-emerald-600 dark:text-emerald-400' : ''}`}><ClipboardList size={12} /> Checklist Pekerjaan ({viewing.tasks.filter((t: any) => t.isDone).length}/{viewing.tasks.length})</p>
                                                    <div className="space-y-1.5">
                                                        {viewing.tasks.map(task => (
                                                            <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-2.5 ${task.isDone ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-border bg-card'}`}>
                                                                <button onClick={() => handleTaskToggle(viewing.id, task.id!, !task.isDone)} className="mt-0.5 flex-shrink-0">
                                                                    {task.isDone ? <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" /> : <Circle size={17} className="text-muted-foreground/50 transition-colors hover:text-foreground" />}
                                                                </button>
                                                                <p className={`text-sm font-medium leading-tight ${task.isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {viewing.items.length > 0 && (
                                                <div className="space-y-2.5">
                                                    <p className={`${lc} flex items-center gap-1.5`}><Package size={12} /> Bill of Materials ({viewing.items.length} item)</p>

                                                    {viewing.items.some((i: any) => i.type === 'MATERIAL' && (i.source === 'STOCK' || !i.source) && !i.isReleased && i.skuId) && (
                                                        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                                    <Package size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-foreground">Pengambilan Stock dari Gudang</p>
                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">Terdapat material tipe Pengambilan Stock yang belum dirilis ke Gudang.</p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReleaseWarehouse(warehouses[0]?.id || '')
                                                                    setReleaseModalOpen(true)
                                                                }}
                                                                className="h-9 w-full rounded-lg px-4 text-sm font-medium sm:w-auto"
                                                            >
                                                                Rilis ke Gudang
                                                            </Button>
                                                        </div>
                                                    )}

                                                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                                                        <table className="w-full text-xs">
                                                            <thead><tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Deskripsi</th><th className="px-3 py-2 text-center font-medium">Qty</th><th className="px-3 py-2 text-center font-medium">Sumber</th><th className="px-3 py-2 text-right font-medium">Rilis?</th><th className="px-3 py-2 text-right font-medium">Total</th></tr></thead>
                                                            <tbody className="divide-y divide-border">
                                                                {viewing.items.map((item, i) => (
                                                                    <tr key={i}>
                                                                        <td className="px-3 py-2 font-medium text-foreground">{item.description}</td>
                                                                        <td className="px-3 py-2 text-center text-muted-foreground">{item.qty} {item.unit}</td>
                                                                        <td className="px-3 py-2 text-center"><span className="inline-flex rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{ITEM_SOURCE[(item as any).source] || (item as any).source || 'STOCK'}</span></td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {item.type === 'MATERIAL' ? (
                                                                                item.isReleased ? (
                                                                                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">Released</span>
                                                                                ) : (
                                                                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">Draft</span>
                                                                                )
                                                                            ) : '—'}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">{fmt(item.totalCost)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="border-t border-border pt-4">
                                                <p className={lc}>Ubah Status</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {STATUS_TRANSITIONS[viewing.status]?.map(t => (
                                                        <button key={t.next} onClick={async () => { 
                                                            await handleStatusChange(viewing, t.next);
                                                            if (t.next === 'COMPLETED') {
                                                                setActiveTab('REPORTS');
                                                                setReportForm({ description: '', progress: '100', reportedBy: '', taskId: '', checklist: {} });
                                                                setReportModalOpen(true);
                                                            } else {
                                                                setDetailOpen(false); 
                                                            }
                                                        }}
                                                            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-primary-foreground ${t.color}`}>
                                                            <t.icon size={14} /> {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                    <ClipboardList size={14} className="text-muted-foreground" /> Histori Progress
                                                </h3>
                                                <Button onClick={() => setReportModalOpen(true)} className="h-8 rounded-lg px-3 text-xs font-medium">
                                                    <Plus size={13} className="mr-1" /> Buat Laporan
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {viewing.reports && viewing.reports.length > 0 ? (
                                                    viewing.reports.map((report) => (
                                                        <div key={report.id} className="group/report rounded-lg border border-border bg-card p-3">
                                                            <div className="mb-2.5 flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                                                        <span className="inline-flex rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{fmtDate(report.date)}</span>
                                                                        <span className="inline-flex rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{report.progress}% PROGRESS</span>
                                                                    </div>
                                                                    {report.task && (
                                                                        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                                                                            <SquareCheckBig size={12} className="text-emerald-500" />
                                                                            <span className="text-[11px] font-medium">{report.task.title}</span>
                                                                        </div>
                                                                    )}
                                                                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                        <User size={10} /> {report.reportedBy || 'Staff Lapangan'}
                                                                    </p>
                                                                </div>
                                                                <button onClick={() => handleDeleteReport(report.id)} className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover/report:opacity-100 dark:hover:bg-rose-950/40">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                            <p className="mb-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{report.description}</p>

                                                            {report.checklist && typeof report.checklist === 'object' && Object.keys(report.checklist).length > 0 && (
                                                                <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2">
                                                                    {Object.entries(report.checklist).map(([k, v]) => (
                                                                        <div key={k} className="flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-muted/40">
                                                                            <span className="flex-1 text-[11px] leading-tight text-muted-foreground">{k}</span>
                                                                            <div className="shrink-0">
                                                                                {typeof v === 'boolean' ? (
                                                                                    v ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-muted-foreground/40" />
                                                                                ) : (
                                                                                    <span className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground">{v as string}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {report.photos && report.photos.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {report.photos.map(p => (
                                                                        <div key={p.id} className="aspect-video overflow-hidden rounded-lg border border-border">
                                                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${p.url}`} alt="Progress" className="h-full w-full cursor-zoom-in object-cover" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${p.url}`, '_blank')} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                            <AlertCircle size={22} />
                                                        </div>
                                                        <p className="text-sm font-medium text-foreground">Belum ada laporan</p>
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
                        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                            <Wrench size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">{editing ? `Edit WO — ${editing.number}` : 'Work Order Baru'}</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">Lengkapi detail pekerjaan dan bill of materials</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={16} /></button>
                                </div>
                                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        <Section title="Informasi Dasar" icon={<Wrench size={14} className="text-muted-foreground" />}>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <div className="md:col-span-2"><label className={lc}>Judul Pekerjaan <span className="text-rose-500">*</span></label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Instalasi CCTV Gedung A Lt.3" className={ic} /></div>
                                                <div>
                                                    <label className={lc}>Business Unit <span className="text-rose-500">*</span></label>
                                                    <select required value={form.businessCategoryId} onChange={e => setForm({ ...form, businessCategoryId: e.target.value })} className={ic}>
                                                        <option value="">— Pilih Unit Bisnis —</option>
                                                        {businessCategories.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                                                    </select>
                                                </div>
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
                                        <Section title="Penugasan & Jadwal" icon={<Calendar size={14} className="text-muted-foreground" />}>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                                                        {salesOrders.map(so => <option key={so.id} value={so.id}>{so.number} — {(so as any).items?.map((i: any) => i.description).join(' · ') || '#'}</option>)}
                                                    </select>
                                                </div>
                                                <div><label className={lc}>Pelanggan <span className="text-rose-500">*</span></label>
                                                    <select required value={form.customerId} onChange={e => handleCustomerChange(e.target.value)} className={ic}>
                                                        <option value="">— Pilih Pelanggan —</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div><label className={lc}>Aset / Unit (Opsional)</label>
                                                    <select value={form.assetId} onChange={e => {
                                                        const assetId = e.target.value
                                                        const asset = assets.find(a => a.id === assetId)
                                                        setForm({ ...form, assetId, location: asset?.brand ? `${asset.brand} ${asset.model || ''}` : form.location })
                                                    }} className={ic}>
                                                        <option value="">— Pilih Unit Aset —</option>
                                                        {assets.filter(a => a.customerId === form.customerId).map(a => (
                                                            <option key={a.id} value={a.id}>[{a.category}] {a.name} — {a.serialNumber || 'No SN'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div><label className={lc}>PIC / Teknisi</label><input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Nama teknisi" className={ic} /></div>
                                                <div><label className={lc}>Jadwal Mulai</label><input type="date" value={form.scheduledStart} onChange={e => setForm({ ...form, scheduledStart: e.target.value })} className={ic} /></div>
                                                <div><label className={lc}>Lokasi Pekerjaan</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Alamat atau lokasi" className={ic} /></div>
                                            </div>
                                        </Section>
                                        <Section title={`Checklist Pekerjaan (${tasks.length})`} icon={<SquareCheckBig size={14} className="text-muted-foreground" />}>
                                            <div className="space-y-2">
                                                {tasks.map((task, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input value={task.title} onChange={e => { const nt = [...tasks]; nt[idx].title = e.target.value; setTasks(nt) }} placeholder={`Langkah ${idx + 1}`} className={`${icItem} flex-1`} />
                                                        <button type="button" onClick={() => removeTask(idx)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={addTask} className="h-9 w-full rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"> + Tambah Langkah</button>
                                            </div>
                                        </Section>
                                        <Section 
                                            title={`Bill of Materials (${items.length} item)`} 
                                            icon={<Package size={14} className="text-muted-foreground" />}
                                            extra={
                                                <button
                                                    type="button"
                                                    onClick={openPoImportModal}
                                                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-muted px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                                                >
                                                    <ShoppingBag size={13} />
                                                    Tarik dari PO Pembelian
                                                </button>
                                            }
                                        >
                                            <div className="space-y-3">
                                                {items.map((item, idx) => (
                                                    <div key={idx} className="group relative space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                                                        <button type="button" onClick={() => removeItem(idx)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"><Trash2 size={14} /></button>
                                                        <div className="grid grid-cols-12 gap-3 pr-3 md:pr-6">
                                                            <div className="col-span-6 md:col-span-3">
                                                                <label className={lc}>Tipe</label>
                                                                <select value={item.type} onChange={e => updateItem(idx, 'type', e.target.value)} className={icItem}>
                                                                    {Object.entries(ITEM_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="col-span-6 md:col-span-3">
                                                                <label className={lc}>Sumber (Source)</label>
                                                                <select value={item.source} onChange={e => updateItem(idx, 'source', e.target.value)} className={icItem}>
                                                                    {Object.entries(ITEM_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                                </select>
                                                            </div>
                                                            {item.source !== 'OPERASIONAL' ? (
                                                                <>
                                                                    <div className="col-span-12 md:col-span-6">
                                                                        <label className={lc}>Master Produk/Material (Opsional)</label>
                                                                        <select value={item.skuId || ''} onChange={e => updateItem(idx, 'skuId', e.target.value || undefined)} className={icItem}>
                                                                            <option value="">— Input Manual —</option>
                                                                            {skus.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-12 md:col-span-5">
                                                                        <label className={lc}>Deskripsi / Nama Item</label>
                                                                        <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Tulis deskripsi..." className={icItem} />
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
                                                                    }} placeholder="Tulis deskripsi operasional manual..." className={icItem} />
                                                                </div>
                                                            )}
                                                            <div className="col-span-4 md:col-span-3">
                                                                <label className={lc}>Qty</label>
                                                                <input type="number" min="0" step="any" value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} className={icItem} />
                                                            </div>
                                                            <div className="col-span-4 md:col-span-3">
                                                                <label className={lc}>Satuan</label>
                                                                <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className={icItem} />
                                                            </div>
                                                            <div className="col-span-4 md:col-span-3">
                                                                <label className={lc}>Biaya Satuan</label>
                                                                <input type="number" min="0" step="any" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className={icItem} />
                                                            </div>
                                                            <div className="col-span-12 md:col-span-3">
                                                                <label className={lc}>Total Biaya</label>
                                                                <input disabled value={fmt(item.totalCost)} className={`${icItem} cursor-not-allowed bg-muted/50 font-medium text-muted-foreground`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {items.length > 0 && (
                                                    <div className="flex justify-end pr-2 pt-2">
                                                        <div className="text-right">
                                                            <p className="mb-1 text-[11px] text-muted-foreground">Estimasi Total Biaya</p>
                                                            <p className="text-base font-semibold tabular-nums text-foreground">{fmt(totalEstCost)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <button type="button" onClick={addItem} className="h-9 w-full rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"> + Tambah Item BOM</button>
                                            </div>
                                        </Section>
                                    </div>
                                    <div className="flex gap-2 border-t border-border px-4 py-3">
                                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none">Batal</Button>
                                        <Button type="submit" disabled={saving} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none">
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
                        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpenseModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-md sm:rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Wrench size={16} /></div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Request Biaya</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">{viewing.number}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setExpenseModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={16} /></button>
                                </div>
                                <form onSubmit={handleRequestExpense} className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                        <div><label className={lc}>Nominal (Rp)</label><input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={ic} /></div>
                                        <div><label className={lc}>Keperluan</label><textarea required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} rows={3} className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" /></div>
                                    </div>
                                    <div className="flex gap-2 border-t border-border px-4 py-3">
                                        <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">Batal</Button>
                                        <Button type="submit" disabled={submittingExpense} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">Kirim</Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Report Modal */}
                <AnimatePresence>
                    {reportModalOpen && viewing && (
                        <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReportModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ClipboardList size={16} /></div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Laporan Progress</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">{viewing.number}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReportModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={16} /></button>
                                </div>
                                <form onSubmit={handleSubmitReport} className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                        <div>
                                            <label className={lc}>Pilih Checklist Pekerjaan <span className="text-rose-500">*</span></label>
                                            <select required value={reportForm.taskId} onChange={e => setReportForm({ ...reportForm, taskId: e.target.value })} className={ic}>
                                                <option value="">— Pilih Langkah Pekerjaan —</option>
                                                {viewing.tasks.map((t, idx) => (
                                                    <option key={t.id} value={t.id}>{idx + 1}. {t.title} {t.isDone ? '(SELESAI)' : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <div><label className={lc}>Progress (%)</label><input required type="number" min="0" max="100" value={reportForm.progress} onChange={e => setReportForm({ ...reportForm, progress: e.target.value })} className={ic} /></div>
                                            <div><label className={lc}>Dilaporkan Oleh</label><input value={reportForm.reportedBy} onChange={e => setReportForm({ ...reportForm, reportedBy: e.target.value })} className={ic} /></div>
                                        </div>
                                        <div><label className={lc}>Keterangan</label><textarea required value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} rows={4} className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" /></div>

                                        {(viewing.asset?.category === 'AC' || viewing.asset?.category === 'IT' || true) && (
                                            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                                                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                                    <SquareCheckBig size={12} />
                                                    Standar Pekerjaan ({viewing.asset?.category || 'Umum'})
                                                </p>
                                                
                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                    {(CHECKLIST_TEMPLATES[viewing.asset?.category || 'GENERAL'] || CHECKLIST_TEMPLATES.GENERAL).map((item: string) => (
                                                        <label key={item} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/40">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!reportForm.checklist[item]} 
                                                                onChange={e => setReportForm({
                                                                    ...reportForm,
                                                                    checklist: { ...reportForm.checklist, [item]: e.target.checked }
                                                                })}
                                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                                                            />
                                                            <span className="text-[11px] font-medium text-foreground">{item}</span>
                                                        </label>
                                                    ))}
                                                </div>

                                                {viewing.asset?.category === 'AC' && (
                                                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                                                        <div><label className={lc}>Pressure (PSI)</label><input type="text" value={reportForm.checklist.pressure || ''} onChange={e => setReportForm({ ...reportForm, checklist: { ...reportForm.checklist, pressure: e.target.value } })} placeholder="e.g. 140" className={ic} /></div>
                                                        <div><label className={lc}>Ampere (A)</label><input type="text" value={reportForm.checklist.ampere || ''} onChange={e => setReportForm({ ...reportForm, checklist: { ...reportForm.checklist, ampere: e.target.value } })} placeholder="e.g. 3.5" className={ic} /></div>
                                                    </div>
                                                )}
                                                
                                                {viewing.asset?.category === 'IT' && (
                                                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                                                        <div><label className={lc}>CPU Load (%)</label><input type="text" value={reportForm.checklist.cpuLoad || ''} onChange={e => setReportForm({ ...reportForm, checklist: { ...reportForm.checklist, cpuLoad: e.target.value } })} placeholder="e.g. 45" className={ic} /></div>
                                                        <div><label className={lc}>RAM Usage (%)</label><input type="text" value={reportForm.checklist.ramUsage || ''} onChange={e => setReportForm({ ...reportForm, checklist: { ...reportForm.checklist, ramUsage: e.target.value } })} placeholder="e.g. 70" className={ic} /></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className={lc}>Foto Lapangan</label>
                                            <input type="file" multiple accept="image/*" onChange={e => { if (e.target.files) setReportPhotos([...reportPhotos, ...Array.from(e.target.files)]) }} className={ic} />
                                            <div className="mt-2 grid grid-cols-4 gap-2">
                                                {reportPhotos.map((file, i) => (
                                                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                                                        <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover" />
                                                        <button type="button" onClick={() => setReportPhotos(reportPhotos.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-md bg-rose-500 p-0.5 text-primary-foreground"><X size={10} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 border-t border-border px-4 py-3">
                                        <Button type="button" variant="outline" onClick={() => setReportModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">Batal</Button>
                                        <Button type="submit" disabled={submittingReport} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">{submittingReport ? 'Mengirim...' : 'Kirim Laporan'}</Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* PO Import Modal */}
                <AnimatePresence>
                    {poImportModalOpen && (
                        <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPoImportModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ShoppingBag size={16} /></div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Tarik Item dari PO Pembelian</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">Otomatis lengkapi data Material & Pengambilan Stock ke BOM</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPoImportModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={16} /></button>
                                </div>

                                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                    <div>
                                        <label className={lc}>Pilih PO Pembelian (Purchase Order) <span className="text-rose-500">*</span></label>
                                        <select
                                            value={selectedPoId}
                                            onChange={e => handlePoSelectChange(e.target.value)}
                                            className={ic}
                                        >
                                            <option value="">— Pilih PO Pembelian —</option>
                                            {(() => {
                                                const linkedPos = purchaseOrders.filter(p => 
                                                    (editing && p.workOrderId === editing.id) ||
                                                    (form.projectId && p.projectId === form.projectId) ||
                                                    (form.salesOrderId && p.salesOrderId === form.salesOrderId)
                                                )
                                                const otherPos = purchaseOrders.filter(p => !linkedPos.some(lp => lp.id === p.id))
                                                return (
                                                    <>
                                                        {linkedPos.length > 0 && (
                                                            <optgroup label="⭐ PO Terkait Work Order / Project Ini">
                                                                {linkedPos.map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        [{p.number}] {p.vendor?.name || 'Vendor'} — Rp {p.grandTotal?.toLocaleString('id-ID')} ({p.items?.length || 0} item)
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        <optgroup label="📋 Semua PO Pembelian Lainnya">
                                                            {otherPos.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    [{p.number}] {p.vendor?.name || 'Vendor'} — Rp {p.grandTotal?.toLocaleString('id-ID')} ({p.items?.length || 0} item)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </>
                                                )
                                            })()}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={lc}>Set Sumber Material (Source)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPoSource('STOCK')}
                                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${selectedPoSource === 'STOCK' ? 'border-primary bg-muted text-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted/40'}`}
                                            >
                                                <span>📦 Pengambilan Stock</span>
                                                {selectedPoSource === 'STOCK' && <CheckCircle2 size={14} className="shrink-0 text-primary" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPoSource('PO')}
                                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${selectedPoSource === 'PO' ? 'border-primary bg-muted text-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted/40'}`}
                                            >
                                                <span>📑 Pembelian PO Langsung</span>
                                                {selectedPoSource === 'PO' && <CheckCircle2 size={14} className="shrink-0 text-primary" />}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedPoId && (
                                        <div className="space-y-3">
                                            {(() => {
                                                const poObj = purchaseOrders.find(p => p.id === selectedPoId)
                                                if (!poObj) return null
                                                const poItems = poObj.items || []
                                                const selectedCount = Object.values(selectedPoItems).filter(Boolean).length

                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between border-t border-border pt-3">
                                                            <div>
                                                                <p className="text-xs font-medium text-foreground">Daftar Item ({poItems.length})</p>
                                                                <p className="text-[11px] text-muted-foreground">{selectedCount} item dipilih</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleAllPoItems(true)}
                                                                    className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/80"
                                                                >
                                                                    Pilih Semua
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleAllPoItems(false)}
                                                                    className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                >
                                                                    Batal Pilih
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
                                                            {poItems.length === 0 ? (
                                                                <p className="p-6 text-center text-xs text-muted-foreground">Tidak ada item di PO ini</p>
                                                            ) : (
                                                                poItems.map((item) => {
                                                                    const isChecked = !!selectedPoItems[item.id]
                                                                    const matchedSku = skus.find(s => 
                                                                        s.code === item.description ||
                                                                        s.name?.toLowerCase() === item.description.toLowerCase() ||
                                                                        s.product?.name?.toLowerCase() === item.description.toLowerCase()
                                                                    )

                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            onClick={() => handleTogglePoItem(item.id)}
                                                                            className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${isChecked ? 'bg-muted/30 hover:bg-muted/40' : 'opacity-70 hover:bg-muted/20'}`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => {}} // handled by parent div
                                                                                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
                                                                            />
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <p className="text-xs font-medium leading-tight text-foreground">
                                                                                        {matchedSku ? (matchedSku.product?.name || matchedSku.name) : item.description}
                                                                                    </p>
                                                                                    {matchedSku && (
                                                                                        <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                                            {matchedSku.code}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {matchedSku && matchedSku.name && matchedSku.name !== matchedSku.product?.name && (
                                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">{matchedSku.name}</p>
                                                                                )}
                                                                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                                                    <span>Qty: <strong className="font-medium text-foreground">{item.qty} {item.unit}</strong></span>
                                                                                    <span>·</span>
                                                                                    <span>Biaya: <strong className="font-medium text-foreground">{fmt(item.unitPrice || 0)}</strong></span>
                                                                                    <span>·</span>
                                                                                    <span>Total: <strong className="font-medium text-foreground">{fmt(item.amount || (item.qty * (item.unitPrice || 0)))}</strong></span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })
                                                            )}
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 border-t border-border px-4 py-3">
                                    <Button type="button" variant="outline" onClick={() => setPoImportModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">Batal</Button>
                                    <Button
                                        type="button"
                                        disabled={!selectedPoId || Object.values(selectedPoItems).filter(Boolean).length === 0}
                                        onClick={handleApplyPoItemsToBom}
                                        className="h-9 flex-1 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
                                    >
                                        Tambahkan ke BOM ({Object.values(selectedPoItems).filter(Boolean).length})
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Release Material Modal */}
                <AnimatePresence>
                    {releaseModalOpen && viewing && (
                        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReleaseModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98 }}
                                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Package size={16} /></div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-semibold text-foreground">Rilis Pengambilan Stock ke Gudang</h2>
                                            <p className="truncate text-[11px] text-muted-foreground">{viewing.number}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReleaseModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={16} /></button>
                                </div>

                                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                    <div>
                                        <label className={lc}>Pilih Gudang Asal Material <span className="text-rose-500">*</span></label>
                                        <select required value={releaseWarehouse} onChange={e => setReleaseWarehouse(e.target.value)} className={ic}>
                                            <option value="">— Pilih Gudang —</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={lc}>Daftar Material yang Akan Dirilis:</label>
                                        <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
                                            {viewing.items.filter(i => i.type === 'MATERIAL' && (i.source === 'STOCK' || !i.source) && !i.isReleased && i.skuId).map((it, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-2 py-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-foreground">{it.description}</p>
                                                        <p className="text-[10px] text-muted-foreground">{it.sku?.code || ''}</p>
                                                    </div>
                                                    <span className="whitespace-nowrap text-xs font-medium text-foreground">{it.qty} {it.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 border-t border-border px-4 py-3">
                                    <Button type="button" variant="outline" onClick={() => setReleaseModalOpen(false)} className="h-9 flex-1 rounded-lg px-4 text-sm font-medium">Batal</Button>
                                    <Button
                                        type="button"
                                        disabled={releasing || !releaseWarehouse}
                                        onClick={async () => {
                                            await handleReleaseMaterials(viewing.id)
                                            setReleaseModalOpen(false)
                                            await openDetail(viewing)
                                        }}
                                        className="h-9 flex-1 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
                                    >
                                        {releasing ? 'Memproses...' : 'Konfirmasi Rilis'}
                                    </Button>
                                </div>
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
        </div>
    )
}

function Section({ title, icon, extra, children }: { title: string; icon: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {icon}
                    <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
                </div>
                {extra}
            </div>
            {children}
        </div>
    )
}

function InfoBlock({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
    if (!value) return null
    return (
        <div>
            <p className="mb-0.5 text-[11px] text-muted-foreground">{label}</p>
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">{icon}{value}</p>
        </div>
    )
}
