"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Search, Eye, Edit, Trash2, X, Save,
    CheckCircle2, AlertCircle, RefreshCw,
    FileText, ClipboardList, User, ArrowRight,
    Briefcase, Calendar, MoreVertical,
    Download, Printer, Send
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
                fetch('http://localhost:5000/api/proposals'),
                fetch('http://localhost:5000/api/customers'),
                fetch('http://localhost:5000/api/projects'),
                fetch('http://localhost:5000/api/company')
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
            const res = await fetch(`http://localhost:5000/api/proposals/${id}`, { method: 'DELETE' })
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
        <div className="px-4 py-6 space-y-6 w-full max-w-[1600px] mx-auto">
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <ClipboardList size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Proposals</h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Crafting Professional Solutions</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={loadData} className="rounded-xl border-slate-200 text-slate-600 h-11 px-4 text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={14} className="mr-2" /> Reload
                    </Button>
                    <Button onClick={() => { setEditing(null); setModalOpen(true) }}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                        <Plus size={16} className="mr-2" /> Create Proposal
                    </Button>
                </div>
            </header>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Search proposals, customers..."
                        className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-medium" 
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-32 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <FileText size={40} className="text-slate-200" />
                    </div>
                    <p className="font-bold text-slate-400 uppercase tracking-[0.2em] text-sm">No proposals found</p>
                    <Button variant="ghost" className="mt-4 text-indigo-600 hover:text-indigo-700 font-bold" onClick={() => setModalOpen(true)}>
                        Create your first proposal
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((p) => (
                        <motion.div 
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden hover:border-indigo-200 transition-all group"
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{p.number}</p>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{p.title}</h3>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${p.status === 'DRAFT' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {p.status}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <User size={14} className="text-slate-400" />
                                        <span className="text-xs font-semibold truncate">{p.customer?.name || 'No Customer'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className="text-xs font-semibold">{fmtDate(p.date)}</span>
                                    </div>
                                    {p.project && (
                                        <div className="flex items-center gap-3 text-indigo-600">
                                            <Briefcase size={14} className="text-indigo-400" />
                                            <span className="text-xs font-bold truncate">{p.project.number} - {p.project.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex items-center gap-2 border-t border-slate-50">
                                    <Button onClick={() => setViewing(p)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl h-10 text-[10px] font-bold uppercase tracking-wider border-none shadow-none">
                                        <Eye size={14} className="mr-2" /> Preview
                                    </Button>
                                    <Button onClick={() => { setEditing(p); setModalOpen(true) }} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl h-10 text-[10px] font-bold uppercase tracking-wider border-none shadow-none">
                                        <Edit size={14} className="mr-2" /> Edit
                                    </Button>
                                    <button onClick={() => handleDelete(p.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const url = isEdit ? `http://localhost:5000/api/proposals/${proposal!.id}` : 'http://localhost:5000/api/proposals'
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
                
                <header className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isEdit ? 'Edit Proposal' : 'New Proposal'}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Define your project details</p>
                        </div>
                        {!isEdit && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setForm({
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
                            })} className="h-8 text-[9px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100">
                                Load Sample Data
                            </Button>
                        )}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-all"><X size={20} /></button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Recipient Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Recipient Name (Kepada Yth.)</label>
                                    <input required value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })}
                                        placeholder="e.g., Bapak Ismanto" className="form-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Subject (Perihal)</label>
                                    <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                        placeholder="e.g., Permohonan Izin Pengambilalihan..." className="form-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Salutation (Salam Pembuka)</label>
                                    <input value={form.salutation} onChange={e => setForm({ ...form, salutation: e.target.value })}
                                        placeholder="e.g., Selamat Sore, Bapak Ismanto." className="form-input" />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Proposal Metadata</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Proposal Title</label>
                                    <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="Full context title..." className="form-input" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Linked Customer</label>
                                        <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="form-select">
                                            <option value="">-- No Customer --</option>
                                            {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Linked Project</label>
                                        <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="form-select">
                                            <option value="">-- No Project --</option>
                                            {Array.isArray(projects) && projects.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8">
                        <section className="space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Narrative Content</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">1. Latar Belakang Masalah (Background)</label>
                                        <textarea rows={4} value={form.background} onChange={e => setForm({ ...form, background: e.target.value })} className="form-textarea" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">2. Dampak Permasalahan (Impact)</label>
                                        <textarea rows={4} value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} className="form-textarea" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">3. Usulan Solusi (Proposed Solution)</label>
                                        <textarea rows={4} value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} className="form-textarea" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">5. Permohonan Keputusan (Closing/CTA)</label>
                                        <textarea rows={4} value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })} className="form-textarea" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Options Table */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">4. Skema Penawaran Kerjasama (Pricing Options)</h3>
                                <Button type="button" onClick={addOption} variant="ghost" className="h-8 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50">
                                    <Plus size={14} className="mr-1.5" /> Add Option
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                {form.options.map((opt, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group/opt">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Option Name</label>
                                                <input value={opt.name} onChange={e => updateOption(idx, 'name', e.target.value)} className="form-input bg-white" placeholder="Opsi 1" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Provider / Agent</label>
                                                <input value={opt.provider} onChange={e => updateOption(idx, 'provider', e.target.value)} className="form-input bg-white" placeholder="PT. Grafindo..." />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Estimated Cost</label>
                                                <input type="number" value={opt.estimatedCost} onChange={e => updateOption(idx, 'estimatedCost', e.target.value)} className="form-input bg-white" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Cost Details</label>
                                                <input value={opt.details} onChange={e => updateOption(idx, 'details', e.target.value)} className="form-input bg-white" placeholder="Sistem sewa bulanan..." />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Description / Notes</label>
                                                <textarea rows={2} value={opt.description} onChange={e => updateOption(idx, 'description', e.target.value)} className="form-textarea bg-white" />
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeOption(idx)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border border-rose-100 text-rose-500 shadow-sm opacity-0 group-hover/opt:opacity-100 transition-all flex items-center justify-center hover:bg-rose-50">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Signature</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Signatory Name</label>
                                    <input value={form.signatoryName} onChange={e => setForm({ ...form, signatoryName: e.target.value })} className="form-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Signatory Role</label>
                                    <input value={form.signatoryRole} onChange={e => setForm({ ...form, signatoryRole: e.target.value })} className="form-input" />
                                </div>
                            </div>
                        </section>
                    </div>
                </form>

                <footer className="px-10 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 flex-shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-11 px-6 font-bold uppercase tracking-wider text-xs">Cancel</Button>
                    <Button type="submit" disabled={loading} onClick={handleSubmit} className="rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20">
                        {loading ? 'Saving...' : (isEdit ? 'Update Proposal' : 'Save Proposal')}
                    </Button>
                </footer>

                <style jsx>{`
                    .form-input, .form-select, .form-textarea {
                        width: 100%;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 1rem;
                        padding: 0.75rem 1rem;
                        font-size: 0.875rem;
                        transition: all 0.2s;
                    }
                    .form-input:focus, .form-select:focus, .form-textarea:focus {
                        outline: none;
                        background: white;
                        border-color: #6366f1;
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #e2e8f0;
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #cbd5e1;
                    }
                `}</style>
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
                    await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = `http://localhost:5000${comp.logo}` })
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
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto pt-10 pb-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[950px] overflow-hidden flex flex-col relative">
                
                <header className="sticky top-0 z-[10] px-10 py-5 border-b border-slate-100 flex items-center justify-between no-print bg-white/90 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <FileText size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Proposal Preview</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-10 rounded-xl gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 border-slate-200" 
                            onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Button>
                        <Button className="h-10 rounded-xl gap-2 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                            onClick={generatePDF} disabled={busy}>
                            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} 
                            {busy ? 'Generating...' : 'Download PDF'}
                        </Button>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-200 flex items-center justify-center transition-all text-slate-400">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-0 bg-slate-100/50 print:bg-white">
                    <div id="proposal-paper" className="w-[210mm] min-h-[297mm] mx-auto my-12 bg-white shadow-2xl p-[15mm] print:m-0 print:shadow-none print:w-full font-sans text-slate-900 leading-relaxed relative rounded-xl">
                        
                        {/* Professional Header - Quotation Style */}
                        <div className="flex justify-between items-start border-b-[3px] border-indigo-600 pb-6 mb-0">
                            <div className="flex gap-6 items-start">
                                {comp.logo && <img src={`http://localhost:5000${comp.logo}`} alt="logo" className="h-16 w-auto object-contain" />}
                                <div>
                                    <div className="font-black text-xl text-slate-900 mb-1 tracking-tight uppercase">{comp.name || 'PT. Axon Ecosystem'}</div>
                                    <div className="text-[10px] text-slate-500 max-w-[300px] leading-relaxed">
                                        {comp.address}
                                        {comp.city && <span>, {comp.city}</span>}
                                        {comp.phone && <div className="mt-1">Tel: {comp.phone} | Email: {comp.email}</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <table className="ml-auto text-[10px] border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="text-right text-slate-400 font-bold pr-2 pb-1">No. Proposal :</td>
                                            <td className="text-right text-slate-900 font-bold pb-1">{proposal.number}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-right text-slate-400 font-bold pr-2">Tanggal :</td>
                                            <td className="text-right text-slate-900 font-bold">{fmtDate(proposal.date)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Centered Title */}
                        <div className="text-center py-4 border-b border-slate-100 mb-10">
                            <span className="font-black text-sm uppercase tracking-[0.2em] text-indigo-600">Surat Proposal</span>
                        </div>

                        {/* Title Section (Project Name) */}
                        <div className="text-center mb-12">
                            <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">
                                {proposal.title}
                            </h1>
                        </div>

                        {/* Recipient & Meta */}
                        <div className="mb-10 space-y-6">
                            <div className="pb-4 border-b border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kepada Yth.</p>
                                <p className="text-sm font-black text-slate-900">{proposal.recipientName}</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Detail Proposal</p>
                                <div className="grid grid-cols-[120px_1fr] text-sm gap-y-2">
                                    <span className="font-bold text-slate-500">Perihal</span>
                                    <span className="font-bold text-slate-900">: {proposal.subject}</span>
                                </div>
                            </div>
                        </div>

                        {/* Salutation */}
                        <div className="mb-8">
                            <p className="font-bold text-base mb-2">{proposal.salutation},</p>
                            <p className="italic text-slate-600 text-sm">Dengan hormat,</p>
                        </div>

                        {/* Main Content */}
                        <div className="space-y-10 text-[14px]">
                            <section className="space-y-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                    Latar Belakang Masalah
                                </h2>
                                <p className="whitespace-pre-wrap pl-9 text-slate-600 leading-relaxed text-justify">{proposal.background}</p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                    Dampak Permasalahan
                                </h2>
                                <p className="whitespace-pre-wrap pl-9 text-slate-600 leading-relaxed text-justify">{proposal.impact}</p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                                    Usulan Solusi
                                </h2>
                                <p className="whitespace-pre-wrap pl-9 text-slate-600 leading-relaxed text-justify">{proposal.solution}</p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                                    Skema Penawaran Kerjasama
                                </h2>
                                <div className="ml-9 overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-indigo-600 text-[8px] font-black uppercase tracking-widest text-white">
                                                <th className="p-3 text-center border-r border-indigo-500 w-12">No</th>
                                                <th className="p-3 text-left border-r border-indigo-500">Pengadaan Perangkat / Jasa</th>
                                                <th className="p-3 text-right w-48">Estimasi Biaya</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proposal.options.map((opt, i) => (
                                                <tr key={i} className={`align-top border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                                    <td className="p-3 text-center border-r border-slate-100 text-xs font-bold text-slate-400">{i + 1}</td>
                                                    <td className="p-3 border-r border-slate-100">
                                                        <p className="font-bold text-slate-900 text-xs">{opt.provider}</p>
                                                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{opt.description}</p>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <p className="font-bold text-indigo-600 text-sm">{fmt(opt.estimatedCost || 0)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">{opt.details}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">5</span>
                                    Permohonan Keputusan
                                </h2>
                                <p className="whitespace-pre-wrap pl-9 text-slate-600 leading-relaxed text-justify">{proposal.conclusion}</p>
                            </section>
                        </div>

                        {/* Signatures - 2 Column Layout like Quotation */}
                        <div className="mt-16 grid grid-cols-2 gap-20">
                            <div className="text-center space-y-16">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disetujui oleh,</p>
                                <div className="border-t border-slate-200 pt-3 mt-12">
                                    <p className="text-[10px] text-slate-400 mb-1">Nama / Jabatan</p>
                                    <p className="font-bold text-slate-900 text-sm">{proposal.recipientName}</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hormat kami,</p>
                                <p className="text-[10px] text-slate-500 italic mb-2">{comp.city || 'Tanjung Morawa'}, {fmtDate(proposal.date)}</p>
                                
                                <div className="flex justify-center my-1 h-14">
                                    <img src="/TTD Fix.png" alt="Signature" className="h-full w-auto object-contain" />
                                </div>

                                <div className="border-t border-slate-200 pt-3 mt-1">
                                    <p className="text-[10px] text-slate-400 mb-1">Nama / Jabatan</p>
                                    <p className="font-bold text-slate-900 text-sm">{proposal.signatoryName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Page Decoration */}
                        <div className="absolute bottom-0 right-0 p-8 opacity-5 grayscale pointer-events-none">
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
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    )
}
