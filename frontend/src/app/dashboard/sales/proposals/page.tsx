"use client"

import { useState, useEffect, useCallback, type ReactNode, type FormEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    FileText,
    User,
    Briefcase,
    Calendar,
    Download,
    Printer,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// --- TYPES ---
interface Customer { id: string; name: string; code: string }
interface Project { id: string; number: string; name: string }
interface ProposalOption {
    id?: string;
    name: string;
    provider: string;
    description: string;
    estimatedCost: number;
    details: string;
}
interface Proposal {
    id: string;
    number: string;
    date: string;
    title: string;
    recipientName: string;
    subject: string;
    salutation: string;
    background: string;
    impact: string;
    solution: string;
    conclusion: string;
    signatoryName: string;
    signatoryRole: string;
    status: string;
    customerId?: string;
    projectId?: string;
    customer?: Customer;
    project?: Project;
    options: ProposalOption[];
    createdAt: string;
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

const selectClass =
    "h-10 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"

function Field({
    label,
    required,
    children,
    className = "",
}: {
    label: string
    required?: boolean
    children: ReactNode
    className?: string
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-muted-foreground">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    )
}

function StatusPill({ status }: { status: string }) {
    const isDraft = status === "DRAFT"
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                isDraft
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${isDraft ? "bg-muted-foreground/50" : "bg-emerald-500"}`} />
            {status}
        </span>
    )
}

function SectionHeading({ children }: { children: ReactNode }) {
    return (
        <h3 className="mb-3 border-b border-border pb-2 text-xs font-semibold text-foreground">{children}</h3>
    )
}

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [company, setCompany] = useState<any>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Proposal | null>(null)
    const [viewing, setViewing] = useState<Proposal | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [propRes, custRes, projRes, compRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/proposals`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/company`)
            ])
            setProposals(await propRes.json())
            setCustomers(await custRes.json())
            setProjects(await projRes.json())
            setCompany(await compRes.json())
        } catch (error) {
            console.error('Error loading data:', error)
            showToast('error', 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => { loadData() }, [loadData])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this proposal?')) return
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/proposals/${id}`, { method: 'DELETE' })
            if (res.ok) {
                showToast('success', 'Proposal deleted')
                loadData()
            }
        } catch {
            showToast('error', 'Failed to delete')
        }
    }

    const filtered = proposals.filter(p =>
        p.number.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.customer?.name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className={`fixed right-4 top-4 z-[300] flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg ${
                                toast.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                        >
                            {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sales Proposals</h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">Crafting professional solutions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={loadData}
                            className="h-9 rounded-lg px-3 text-sm font-medium"
                        >
                            <RefreshCw size={15} className="mr-1.5" />
                            Reload
                        </Button>
                        <Button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Create Proposal
                        </Button>
                    </div>
                </header>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search proposals, customers..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filtered.length} {filtered.length === 1 ? "proposal" : "proposals"}
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FileText size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No proposals found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {search
                                ? "Try adjusting your search to find what you are looking for."
                                : "Create your first proposal to get started."}
                        </p>
                        <Button
                            onClick={() => { setEditing(null); setModalOpen(true) }}
                            className="mt-5 h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1.5" />
                            Create your first proposal
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">Proposal</th>
                                            <th className="px-3 py-2.5 font-medium">Customer</th>
                                            <th className="px-3 py-2.5 font-medium">Project</th>
                                            <th className="px-3 py-2.5 font-medium">Date</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((p) => (
                                            <tr key={p.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-[11px] text-muted-foreground">{p.number}</p>
                                                            <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                {p.options?.length || 0} option{(p.options?.length || 0) !== 1 ? "s" : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <User size={12} className="flex-shrink-0 text-muted-foreground" />
                                                        <span className="max-w-[180px] truncate text-foreground">
                                                            {p.customer?.name || 'No Customer'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    {p.project ? (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <Briefcase size={12} className="flex-shrink-0 text-muted-foreground" />
                                                            <span className="max-w-[200px] truncate text-foreground">
                                                                {p.project.number} - {p.project.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Calendar size={12} className="flex-shrink-0" />
                                                        <span>{fmtDate(p.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <StatusPill status={p.status} />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button
                                                            onClick={() => setViewing(p)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Preview proposal"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Eye size={15} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => { setEditing(p); setModalOpen(true) }}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Edit proposal"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Edit size={15} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleDelete(p.id)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Delete proposal"
                                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                        >
                                                            <Trash2 size={15} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 lg:hidden">
                            {filtered.map((p) => (
                                <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-mono text-[11px] text-muted-foreground">{p.number}</p>
                                            <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                                        </div>
                                        <StatusPill status={p.status} />
                                    </div>

                                    <div className="mt-2.5 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <User size={11} className="flex-shrink-0" />
                                            <span className="truncate">{p.customer?.name || 'No Customer'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <Calendar size={11} className="flex-shrink-0" />
                                            <span>{fmtDate(p.date)}</span>
                                        </div>
                                        {p.project && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                <Briefcase size={11} className="flex-shrink-0" />
                                                <span className="truncate">{p.project.number} - {p.project.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                                        <span className="text-[11px] text-muted-foreground">
                                            {p.options?.length || 0} option{(p.options?.length || 0) !== 1 ? "s" : ""}
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            <Button
                                                onClick={() => setViewing(p)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Eye size={15} />
                                            </Button>
                                            <Button
                                                onClick={() => { setEditing(p); setModalOpen(true) }}
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit size={15} />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(p.id)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                            >
                                                <Trash2 size={15} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <AnimatePresence>
                {modalOpen && (
                    <ProposalFormModal
                        proposal={editing}
                        customers={customers}
                        projects={projects}
                        onClose={() => setModalOpen(false)}
                        onSuccess={() => { setModalOpen(false); loadData(); showToast('success', editing ? 'Proposal updated!' : 'Proposal created!') }}
                    />
                )}
                {viewing && (
                    <ProposalPreviewModal
                        proposal={viewing}
                        company={company}
                        onClose={() => setViewing(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function ProposalFormModal({ proposal, customers, projects, onClose, onSuccess }: {
    proposal: Proposal | null;
    customers: Customer[];
    projects: Project[];
    onClose: () => void;
    onSuccess: () => void
}) {
    const isEdit = !!proposal
    const [form, setForm] = useState({
        title: proposal?.title || '',
        recipientName: proposal?.recipientName || '',
        subject: proposal?.subject || '',
        salutation: proposal?.salutation || '',
        background: proposal?.background || '',
        impact: proposal?.impact || '',
        solution: proposal?.solution || '',
        conclusion: proposal?.conclusion || '',
        signatoryName: proposal?.signatoryName || 'Parwanto',
        signatoryRole: proposal?.signatoryRole || 'IT Support',
        customerId: proposal?.customerId || '',
        projectId: proposal?.projectId || '',
        status: proposal?.status || 'DRAFT',
        options: proposal?.options || [] as ProposalOption[]
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const url = isEdit ? `${process.env.NEXT_PUBLIC_API_URL}/api/proposals/${proposal!.id}` : `${process.env.NEXT_PUBLIC_API_URL}/api/proposals`
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) onSuccess()
        } catch {
            alert('Error saving proposal')
        } finally {
            setLoading(false)
        }
    }

    const addOption = () => {
        setForm({
            ...form,
            options: [...form.options, { name: `Opsi ${form.options.length + 1}`, provider: '', description: '', estimatedCost: 0, details: '' }]
        })
    }

    const updateOption = (idx: number, field: keyof ProposalOption, val: any) => {
        const newOptions = [...form.options]
        newOptions[idx] = { ...newOptions[idx], [field]: val }
        setForm({ ...form, options: newOptions })
    }

    const removeOption = (idx: number) => {
        setForm({ ...form, options: form.options.filter((_, i) => i !== idx) })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            />
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-4xl sm:rounded-2xl"
            >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-foreground">
                                {isEdit ? 'Edit Proposal' : 'New Proposal'}
                            </h2>
                            <p className="truncate text-[11px] text-muted-foreground">Define your project details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setForm({
                                    ...form,
                                    title: 'PROPOSAL PENGAMBILALIHAN DAN PENINGKATAN KONEKSI RADIO POINT-TO-POINT',
                                    recipientName: 'Bapak Ismanto',
                                    subject: 'Permohonan Izin Pengambilalihan dan Peningkatan Kualitas Koneksi Radio Point-to-Point Gedung 2 – Gedung 1',
                                    salutation: 'Selamat Sore, Bapak Ismanto.',
                                    background: 'Kami ingin menyampaikan perhatian terhadap kondisi koneksi Radio Point-to-Point (PTP) yang saat ini menghubungkan Gedung 2 ke Gedung 1. Berdasarkan pengamatan, koneksi tersebut sering mengalami kendala teknis yang signifikan, berdampak pada terputusnya jaringan secara berkala.',
                                    impact: 'Masalah ini diperparah dengan respons teknisi dari vendor saat ini yang cenderung lambat (>5 jam), terutama karena jarak lokasi. Situasi ini secara langsung menyebabkan lost koneksi yang sering terjadi, mengganggu efektivitas pekerjaan karyawan, dan berpotensi menimbulkan kerugian operasional yang berkelanjutan.',
                                    solution: 'Untuk mengatasi masalah kritis ini dan memastikan stabilitas operasional, kami mengajukan permohonan untuk mengambil alih secara penuh kontrol dan pemantauan Koneksi Point-to-Point dari Gedung 1 ke Gedung 2.\n\nTujuan Pengambilalihan Kontrol:\n- Memastikan pemantauan koneksi secara real-time dan proaktif.\n- Mempercepat waktu respons dan penanganan masalah secara drastis.\n- Meningkatkan stabilitas dan keandalan koneksi jaringan antar gedung.',
                                    conclusion: 'Mengingat urgensi masalah dan dampak negatifnya terhadap produktivitas kerja, serta untuk memanfaatkan waktu luang operasional, kami memohon Bapak untuk dapat memberikan keputusan secepatnya.\n\nKami berencana untuk melakukan tindakan perbaikan dan instalasi di masa Libur Lebaran ini agar transisi dan gangguan terhadap aktivitas operasional kerja dapat dimulai.',
                                    options: [
                                        { name: 'Opsi 1', provider: 'PT. Grafindo Mitrasemesta', description: 'Disesuaikan dengan biaya pengadaan perangkat baru dan operasional internal.', estimatedCost: 11500000, details: 'Estimasi Biaya Pengadaan' },
                                        { name: 'Opsi 2', provider: 'CV Intech Mitra Abadi', description: 'Sistem sewa bulanan dengan nilai yang sama dengan biaya vendor sebelumnya.', estimatedCost: 500000, details: 'Rp. 500.000/bulan' }
                                    ]
                                })}
                                className="h-8 rounded-lg px-2.5 text-[11px] font-medium sm:px-3 sm:text-xs"
                            >
                                Load Sample Data
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <section>
                                <SectionHeading>Recipient Information</SectionHeading>
                                <div className="space-y-3">
                                    <Field label="Recipient Name (Kepada Yth.)" required>
                                        <input
                                            required
                                            value={form.recipientName}
                                            onChange={e => setForm({ ...form, recipientName: e.target.value })}
                                            placeholder="e.g., Bapak Ismanto"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Subject (Perihal)" required>
                                        <input
                                            required
                                            value={form.subject}
                                            onChange={e => setForm({ ...form, subject: e.target.value })}
                                            placeholder="e.g., Permohonan Izin Pengambilalihan..."
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Salutation (Salam Pembuka)">
                                        <input
                                            value={form.salutation}
                                            onChange={e => setForm({ ...form, salutation: e.target.value })}
                                            placeholder="e.g., Selamat Sore, Bapak Ismanto."
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section>
                                <SectionHeading>Proposal Metadata</SectionHeading>
                                <div className="space-y-3">
                                    <Field label="Proposal Title" required>
                                        <input
                                            required
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            placeholder="Full context title..."
                                            className={inputClass}
                                        />
                                    </Field>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <Field label="Linked Customer">
                                            <select
                                                value={form.customerId}
                                                onChange={e => setForm({ ...form, customerId: e.target.value })}
                                                className={selectClass}
                                            >
                                                <option value="">-- No Customer --</option>
                                                {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Linked Project">
                                            <select
                                                value={form.projectId}
                                                onChange={e => setForm({ ...form, projectId: e.target.value })}
                                                className={selectClass}
                                            >
                                                <option value="">-- No Project --</option>
                                                {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Content Sections */}
                        <section>
                            <SectionHeading>Narrative Content</SectionHeading>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <Field label="1. Latar Belakang Masalah (Background)">
                                        <textarea
                                            rows={4}
                                            value={form.background}
                                            onChange={e => setForm({ ...form, background: e.target.value })}
                                            className={textareaClass}
                                        />
                                    </Field>
                                    <Field label="2. Dampak Permasalahan (Impact)">
                                        <textarea
                                            rows={4}
                                            value={form.impact}
                                            onChange={e => setForm({ ...form, impact: e.target.value })}
                                            className={textareaClass}
                                        />
                                    </Field>
                                </div>
                                <div className="space-y-3">
                                    <Field label="3. Usulan Solusi (Proposed Solution)">
                                        <textarea
                                            rows={4}
                                            value={form.solution}
                                            onChange={e => setForm({ ...form, solution: e.target.value })}
                                            className={textareaClass}
                                        />
                                    </Field>
                                    <Field label="5. Permohonan Keputusan (Closing/CTA)">
                                        <textarea
                                            rows={4}
                                            value={form.conclusion}
                                            onChange={e => setForm({ ...form, conclusion: e.target.value })}
                                            className={textareaClass}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>

                        {/* Options Table */}
                        <section>
                            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                                <h3 className="text-xs font-semibold text-foreground">4. Skema Penawaran Kerjasama (Pricing Options)</h3>
                                <Button
                                    type="button"
                                    onClick={addOption}
                                    variant="ghost"
                                    className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Plus size={14} className="mr-1.5" /> Add Option
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {form.options.map((opt, idx) => (
                                    <div key={idx} className="rounded-xl border border-border bg-muted/20 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-[11px] font-medium text-muted-foreground">Option {idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeOption(idx)}
                                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                            <Field label="Option Name">
                                                <input
                                                    value={opt.name}
                                                    onChange={e => updateOption(idx, 'name', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Opsi 1"
                                                />
                                            </Field>
                                            <Field label="Provider / Agent">
                                                <input
                                                    value={opt.provider}
                                                    onChange={e => updateOption(idx, 'provider', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="PT. Grafindo..."
                                                />
                                            </Field>
                                            <Field label="Estimated Cost">
                                                <input
                                                    type="number"
                                                    value={opt.estimatedCost}
                                                    onChange={e => updateOption(idx, 'estimatedCost', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </Field>
                                            <Field label="Cost Details">
                                                <input
                                                    value={opt.details}
                                                    onChange={e => updateOption(idx, 'details', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Sistem sewa bulanan..."
                                                />
                                            </Field>
                                            <Field label="Description / Notes" className="md:col-span-4">
                                                <textarea
                                                    rows={2}
                                                    value={opt.description}
                                                    onChange={e => updateOption(idx, 'description', e.target.value)}
                                                    className={textareaClass}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <SectionHeading>Signature</SectionHeading>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Signatory Name">
                                    <input
                                        value={form.signatoryName}
                                        onChange={e => setForm({ ...form, signatoryName: e.target.value })}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Signatory Role">
                                    <input
                                        value={form.signatoryRole}
                                        onChange={e => setForm({ ...form, signatoryRole: e.target.value })}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </section>
                    </div>
                </form>

                <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="h-9 rounded-lg px-4 text-sm font-medium"
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Update Proposal' : 'Save Proposal')}
                    </Button>
                </footer>
            </motion.div>
        </div>
    )
}

function ProposalPreviewModal({ proposal, company, onClose }: { proposal: Proposal; company: any; onClose: () => void }) {
    const [busy, setBusy] = useState(false)
    const comp = company || { name: 'PT. Axon Ecosystem' }
    const generatePDF = async () => {
        setBusy(true)
        try {
            const { default: jsPDF } = await import('jspdf')
            const { default: autoTable } = await import('jspdf-autotable')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const W = 210; const M = 15
            const indigo = [79, 70, 229] as [number, number, number]
            const dark = [15, 23, 42] as [number, number, number]
            const gray = [100, 116, 139] as [number, number, number]
            const light = [241, 245, 249] as [number, number, number]
            const white = [255, 255, 255] as [number, number, number]
            let y = M

            // Logo & Header
            if (comp.logo) {
                try {
                    const img = new Image(); img.crossOrigin = 'anonymous'
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `${process.env.NEXT_PUBLIC_API_URL}${comp.logo}` })
                    if (img.complete && img.naturalWidth > 0) {
                        const cv = document.createElement('canvas')
                        cv.width = img.naturalWidth; cv.height = img.naturalHeight
                        cv.getContext('2d')!.drawImage(img, 0, 0)
                        doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, 22, 22)
                    }
                } catch { /* skip */ }
            }

            const ix = comp.logo ? M + 26 : M
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...dark)
            doc.text(comp.name || 'PT. Axon Ecosystem', ix, y + 5)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            let cy = y + 11
            if (comp.address) {
                const addr = doc.splitTextToSize(`${comp.address}${comp.city ? ', ' + comp.city : ''}`, 88)
                doc.text(addr, ix, cy); cy += addr.length * 4
            }
            if (comp.phone || comp.email) {
                doc.text([comp.phone && `Tel: ${comp.phone}`, comp.email && `Email: ${comp.email}`].filter(Boolean).join('  |  '), ix, cy)
                cy += 4
            }

            // Header Meta (Right Side)
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            const hdrMeta = [['No. Proposal', proposal.number], ['Tanggal', fmtDate(proposal.date)]]
            let hy = y + 4
            hdrMeta.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold'); doc.text(`${k} :`, W - M - 28, hy, { align: 'right' })
                doc.setFont('helvetica', 'normal').setTextColor(...dark); doc.text(v, W - M, hy, { align: 'right' })
                doc.setTextColor(...gray); hy += 4.5
            })

            y = Math.max(cy, hy) + 5
            doc.setDrawColor(...indigo).setLineWidth(0.8).line(M, y, W - M, y)
            y += 8

            // Title
            doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...indigo)
            doc.text('SURAT PROPOSAL', W / 2, y, { align: 'center' })
            y += 8

            // Recipient section
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...gray).text('KEPADA YTH.', M, y)
            y += 4
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark).text(proposal.recipientName, M, y)
            y += 10

            // Detail section label
            doc.setDrawColor(...light).setLineWidth(0.3).line(M, y, W - M, y); y += 6
            doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...gray).text('DETAIL PROPOSAL', M, y)
            y += 5
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...gray).text('Perihal', M, y)
            doc.setFont('helvetica', 'normal').setTextColor(...dark).text(`: ${proposal.subject}`, M + 30, y)
            y += 10

            doc.setFont('helvetica', 'bold').setFontSize(10).text(proposal.salutation + ',', M, y); y += 6
            doc.setFont('helvetica', 'italic').setFontSize(9).text('Dengan hormat,', M, y); y += 10

            // Content Sections
            const sections = [
                { t: '1. Latar Belakang Masalah', c: proposal.background },
                { t: '2. Dampak Permasalahan', c: proposal.impact },
                { t: '3. Usulan Solusi', c: proposal.solution },
                { t: '4. Skema Penawaran Kerjasama', c: '' },
            ]

            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...dark)

            for (const s of sections) {
                if (y > 255) { doc.addPage(); y = 20 }
                doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark).text(s.t, M, y); y += 6
                if (s.c) {
                    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105)
                    const lines = doc.splitTextToSize(s.c, W - M * 2 - 10)
                    doc.text(lines, M + 5, y)
                    y += lines.length * 4.5 + 8
                }
            }

            // Table for Skema
            if (proposal.options.length > 0) {
                autoTable(doc, {
                    startY: y - 2,
                    margin: { left: M + 5, right: M },
                    head: [['No', 'Pengadaan Perangkat / Jasa', 'Estimasi Biaya']],
                    body: proposal.options.map((o, idx) => [
                        idx + 1,
                        { content: `${o.provider}\n${o.description}`, styles: { fontStyle: 'normal' } },
                        { content: `${fmt(o.estimatedCost || 0)}\n${o.details}`, styles: { fontStyle: 'bold' } }
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: indigo, textColor: white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
                    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
                    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 50, halign: 'right' } }
                })
                y = (doc as any).lastAutoTable.finalY + 10
            }

            if (y > 240) { doc.addPage(); y = 20 }
            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...dark).text('5. Permohonan Keputusan', M, y); y += 6
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(71, 85, 105)
            const conc = doc.splitTextToSize(proposal.conclusion, W - M * 2 - 10)
            doc.text(conc, M + 5, y)
            y += conc.length * 4.5 + 15

            // Signature - 2 Column Layout like Quotation
            if (y > 230) { doc.addPage(); y = 20 }
            const sw = (W - M * 2 - 10) / 2
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text('Disetujui oleh,', M, y)
            doc.text('Hormat kami,', M + sw + 10, y)
            doc.text(`${comp.city || 'Tanjung Morawa'}, ${fmtDate(proposal.date)}`, M + sw + 10, y + 4)

            // TTD Image - Proportional Scaling
            try {
                const ttdImg = new Image(); ttdImg.crossOrigin = 'anonymous'
                await new Promise<void>(r => { ttdImg.onload = () => r(); ttdImg.onerror = () => r(); ttdImg.src = '/TTD Fix.png' })
                if (ttdImg.complete && ttdImg.naturalWidth > 0) {
                    const tcv = document.createElement('canvas')
                    tcv.width = ttdImg.naturalWidth; tcv.height = ttdImg.naturalHeight
                    tcv.getContext('2d')!.drawImage(ttdImg, 0, 0)

                    const ratio = ttdImg.naturalHeight / ttdImg.naturalWidth
                    const dw = 45; const dh = dw * ratio
                    doc.addImage(tcv.toDataURL('image/png'), 'PNG', M + sw + 10, y + 2, dw, dh)
                    y += Math.max(25, dh + 5)
                } else {
                    y += 25
                }
            } catch {
                y += 25
            }

            doc.setDrawColor(203, 213, 225).setLineWidth(0.4).line(M, y, M + sw, y).line(M + sw + 10, y, M + sw * 2 + 10, y)
            y += 4
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray)
            doc.text('Nama / Jabatan', M, y); doc.text('Nama / Jabatan', M + sw + 10, y); y += 4
            doc.setFont('helvetica', 'bold').setTextColor(...dark)
            doc.text(proposal.recipientName, M, y); doc.text(proposal.signatoryName, M + sw + 10, y)

            // Footer
            const pc = doc.getNumberOfPages()
            for (let i = 1; i <= pc; i++) {
                doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7).setTextColor(...gray)
                doc.text(`Dokumen resmi dari ${comp.name || 'PT. Axon Ecosystem'}`, M, 290)
                doc.text(`Hal ${i} / ${pc}`, W - M, 290, { align: 'right' })
            }

            doc.save(`Proposal_${proposal.number}.pdf`)
        } catch (e) {
            console.error(e)
            alert('Gagal generate PDF')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-[1000px] sm:rounded-2xl print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
            >
                <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-foreground">Proposal Preview</h2>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{proposal.number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            className="h-9 rounded-lg px-3 text-sm font-medium"
                        >
                            <Printer size={15} className="mr-1.5" /> Print
                        </Button>
                        <Button
                            onClick={generatePDF}
                            disabled={busy}
                            className="h-9 rounded-lg px-4 text-sm font-medium"
                        >
                            {busy ? <RefreshCw size={15} className="mr-1.5 animate-spin" /> : <Download size={15} className="mr-1.5" />}
                            {busy ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 print:bg-card print:p-0">
                    <div
                        id="proposal-paper"
                        className="relative mx-auto my-2 w-[210mm] min-h-[297mm] bg-card p-[15mm] font-sans leading-relaxed text-foreground shadow-xl print:m-0 print:w-full print:shadow-none"
                    >
                        {/* Header */}
                        <div className="mb-0 flex items-start justify-between border-b-2 border-primary pb-5">
                            <div className="flex items-start gap-5">
                                {comp.logo && (
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL}${comp.logo}`}
                                        alt="logo"
                                        className="h-16 w-auto object-contain"
                                    />
                                )}
                                <div>
                                    <div className="mb-1 text-lg font-semibold tracking-tight text-foreground">
                                        {comp.name || 'PT. Axon Ecosystem'}
                                    </div>
                                    <div className="max-w-[300px] text-[10px] leading-relaxed text-muted-foreground">
                                        {comp.address}
                                        {comp.city && <span>, {comp.city}</span>}
                                        {comp.phone && <div className="mt-1">Tel: {comp.phone} | Email: {comp.email}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <table className="ml-auto border-collapse text-[10px]">
                                    <tbody>
                                        <tr>
                                            <td className="pb-1 pr-2 text-right font-medium text-muted-foreground">No. Proposal :</td>
                                            <td className="pb-1 text-right font-medium text-foreground">{proposal.number}</td>
                                        </tr>
                                        <tr>
                                            <td className="pr-2 text-right font-medium text-muted-foreground">Tanggal :</td>
                                            <td className="text-right font-medium text-foreground">{fmtDate(proposal.date)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Document label */}
                        <div className="border-b border-border py-4 text-center">
                            <span className="text-sm font-semibold text-primary">Surat Proposal</span>
                        </div>

                        {/* Proposal title */}
                        <div className="mb-10 mt-8 text-center">
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">{proposal.title}</h1>
                        </div>

                        {/* Recipient & Meta */}
                        <div className="mb-8 space-y-5">
                            <div className="border-b border-border pb-4">
                                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Kepada Yth.</p>
                                <p className="text-sm font-semibold text-foreground">{proposal.recipientName}</p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-medium text-muted-foreground">Detail Proposal</p>
                                <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                                    <span className="font-medium text-muted-foreground">Perihal</span>
                                    <span className="font-medium text-foreground">: {proposal.subject}</span>
                                </div>
                            </div>
                        </div>

                        {/* Salutation */}
                        <div className="mb-8">
                            <p className="mb-2 text-sm font-semibold text-foreground">{proposal.salutation},</p>
                            <p className="text-sm italic text-muted-foreground">Dengan hormat,</p>
                        </div>

                        {/* Main Content */}
                        <div className="space-y-8 text-sm">
                            <section className="space-y-3">
                                <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-foreground">1</span>
                                    Latar Belakang Masalah
                                </h2>
                                <p className="whitespace-pre-wrap pl-8 text-justify leading-relaxed text-muted-foreground">{proposal.background}</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-foreground">2</span>
                                    Dampak Permasalahan
                                </h2>
                                <p className="whitespace-pre-wrap pl-8 text-justify leading-relaxed text-muted-foreground">{proposal.impact}</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-foreground">3</span>
                                    Usulan Solusi
                                </h2>
                                <p className="whitespace-pre-wrap pl-8 text-justify leading-relaxed text-muted-foreground">{proposal.solution}</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-foreground">4</span>
                                    Skema Penawaran Kerjasama
                                </h2>
                                <div className="ml-8 overflow-hidden rounded-lg border border-border">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/40 text-[10px] font-medium text-muted-foreground">
                                                <th className="w-12 border-r border-border p-2.5 text-center font-medium">No</th>
                                                <th className="border-r border-border p-2.5 text-left font-medium">Pengadaan Perangkat / Jasa</th>
                                                <th className="w-48 p-2.5 text-right font-medium">Estimasi Biaya</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {proposal.options.map((opt, i) => (
                                                <tr key={i} className="align-top">
                                                    <td className="border-r border-border p-2.5 text-center text-[11px] font-medium text-muted-foreground">{i + 1}</td>
                                                    <td className="border-r border-border p-2.5">
                                                        <p className="text-xs font-medium text-foreground">{opt.provider}</p>
                                                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{opt.description}</p>
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <p className="text-sm font-semibold text-foreground">{fmt(opt.estimatedCost || 0)}</p>
                                                        <p className="mt-0.5 text-[10px] text-muted-foreground">{opt.details}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h2 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-foreground">5</span>
                                    Permohonan Keputusan
                                </h2>
                                <p className="whitespace-pre-wrap pl-8 text-justify leading-relaxed text-muted-foreground">{proposal.conclusion}</p>
                            </section>
                        </div>

                        {/* Signatures */}
                        <div className="mt-12 grid grid-cols-2 gap-16">
                            <div className="space-y-16 text-center">
                                <p className="text-[10px] font-medium text-muted-foreground">Disetujui oleh,</p>
                                <div className="mt-12 border-t border-border pt-3">
                                    <p className="mb-1 text-[10px] text-muted-foreground">Nama / Jabatan</p>
                                    <p className="text-sm font-semibold text-foreground">{proposal.recipientName}</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="mb-1 text-[10px] font-medium text-muted-foreground">Hormat kami,</p>
                                <p className="mb-2 text-[10px] italic text-muted-foreground">{comp.city || 'Tanjung Morawa'}, {fmtDate(proposal.date)}</p>

                                <div className="my-1 flex h-14 justify-center">
                                    <img src="/TTD Fix.png" alt="Signature" className="h-full w-auto object-contain" />
                                </div>

                                <div className="mt-1 border-t border-border pt-3">
                                    <p className="mb-1 text-[10px] text-muted-foreground">Nama / Jabatan</p>
                                    <p className="text-sm font-semibold text-foreground">{proposal.signatoryName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Page Decoration */}
                        <div className="pointer-events-none absolute bottom-0 right-0 p-8 opacity-5 grayscale">
                            <FileText size={150} />
                        </div>
                    </div>
                </div>
            </motion.div>
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                    .fixed { position: relative !important; background: transparent !important; backdrop-filter: none !important; }
                    #proposal-paper {
                        margin: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        height: auto !important;
                        padding: 15mm !important;
                        border-radius: 0 !important;
                        background: white !important;
                        color: #0f172a !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    )
}
