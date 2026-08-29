"use client"

import { useState, useEffect } from "react"
import {
    Landmark,
    Plus,
    Trash2,
    CheckCircle2,
    Clock,
    AlertCircle,
    DollarSign,
    Search,
    X,
    TrendingUp,
    ArrowRight,
    Wallet,
    Percent,
    Calendar,
    FileText,
    HandCoins
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useSession } from "next-auth/react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

const t = {
    ID: {
        title: 'Pinjaman Investor',
        subtitle: 'Kelola pinjaman dari investor, pencairan dana, dan bagi hasil profit',
        addNew: 'Tambah Pinjaman',
        search: 'Cari investor atau nomor pinjaman...',
        totalLoans: 'Total Pinjaman',
        activeLoans: 'Pinjaman Aktif',
        totalPrincipal: 'Total Modal',
        totalDisbursed: 'Total Dicairkan',
        totalRepaid: 'Total Dikembalikan',
        totalProfit: 'Total Profit Dibagikan',
        overdue: 'Jatuh Tempo',
        investorName: 'Nama Investor',
        contact: 'Kontak',
        principal: 'Jumlah Pinjaman',
        profitShare: 'Bagi Hasil (%)',
        interestRate: 'Suku Bunga (%)',
        repaymentType: 'Tipe Pengembalian',
        full: 'Lunas Sekaligus',
        installment: 'Cicilan',
        tenor: 'Tenor (Bulan)',
        dueDate: 'Jatuh Tempo',
        status: 'Status',
        project: 'Project',
        actions: 'Aksi',
        viewDetail: 'Lihat Detail',
        draft: 'Draft',
        active: 'Aktif',
        partial: 'Sebagian',
        paid: 'Lunas',
        overdueStatus: 'Jatuh Tempo',
        noData: 'Belum ada pinjaman investor',
        confirmDelete: 'Hapus pinjaman ini?',
        saved: 'Tersimpan',
        cancelled: 'Dibatalkan',
        all: 'Semua',
        notes: 'Catatan',
        selectProject: 'Pilih Project (opsional)',
        noProject: 'Tanpa Project',
    },
    EN: {
        title: 'Investor Loans',
        subtitle: 'Manage investor loans, fund disbursements, and profit sharing',
        addNew: 'Add Loan',
        search: 'Search investor or loan number...',
        totalLoans: 'Total Loans',
        activeLoans: 'Active Loans',
        totalPrincipal: 'Total Principal',
        totalDisbursed: 'Total Disbursed',
        totalRepaid: 'Total Repaid',
        totalProfit: 'Total Profit Distributed',
        overdue: 'Overdue',
        investorName: 'Investor Name',
        contact: 'Contact',
        principal: 'Loan Amount',
        profitShare: 'Profit Sharing (%)',
        interestRate: 'Interest Rate (%)',
        repaymentType: 'Repayment Type',
        full: 'Full Payment',
        installment: 'Installment',
        tenor: 'Tenor (Months)',
        dueDate: 'Due Date',
        status: 'Status',
        project: 'Project',
        actions: 'Actions',
        viewDetail: 'View Detail',
        draft: 'Draft',
        active: 'Active',
        partial: 'Partial',
        paid: 'Paid',
        overdueStatus: 'Overdue',
        noData: 'No investor loans yet',
        confirmDelete: 'Delete this loan?',
        saved: 'Saved',
        cancelled: 'Cancelled',
        all: 'All',
        notes: 'Notes',
        selectProject: 'Select Project (optional)',
        noProject: 'No Project',
    }
}

export default function InvestorLoansPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role || 'STAFF'
    const lang = (session?.user as any)?.lang || 'ID'
    const T = t[lang as keyof typeof t] || t.ID

    const [loans, setLoans] = useState<any[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [deleting, setDeleting] = useState<string | null>(null)

    const [form, setForm] = useState<{
        investorName: string,
        investorContact: string,
        principalAmount: number,
        profitSharingPercent: number,
        interestRate: number,
        repaymentType: string,
        tenorMonths: number,
        dueDate: string,
        projectId: string,
        salesOrderIds: string[],
        notes: string
    }>({
        investorName: '',
        investorContact: '',
        principalAmount: 0,
        profitSharingPercent: 0,
        interestRate: 0,
        repaymentType: 'INSTALLMENT',
        tenorMonths: 12,
        dueDate: '',
        projectId: '',
        salesOrderIds: [],
        notes: ''
    })

    useEffect(() => {
        fetchLoans()
        if (userRole) {
            fetchProjects()
        }
    }, [userRole])

    const fetchLoans = async () => {
        try {
            const res = await fetch(`${API_BASE}/investor-loans`)
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setLoans(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
            setLoans([])
        } finally {
            setLoading(false)
        }
    }

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                headers: { 'x-user-role': (session?.user as any)?.role || 'STAFF' }
            })
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setProjects(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        }
    }

    const handleCreate = async () => {
        if (!form.investorName) return alert('Nama investor wajib diisi')
        if (!form.principalAmount || form.principalAmount <= 0) return alert('Jumlah pinjaman harus lebih dari 0')

        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({
                    ...form,
                    projectId: form.projectId || null,
                    tenorMonths: form.repaymentType === 'INSTALLMENT' ? form.tenorMonths : null,
                    dueDate: form.dueDate || null
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message || 'Gagal menyimpan')
            }
            setShowModal(false)
            setForm({
                investorName: '', investorContact: '', principalAmount: 0,
                profitSharingPercent: 0, interestRate: 0, repaymentType: 'INSTALLMENT',
                tenorMonths: 12, dueDate: '', projectId: '', salesOrderIds: [], notes: ''
            })
            fetchLoans()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(T.confirmDelete)) return
        setDeleting(id)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${id}`, { method: 'DELETE', headers: { 'x-user-role': userRole } })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            fetchLoans()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setDeleting(null)
        }
    }

    const filtered = loans.filter(loan => {
        const matchSearch = !search ||
            loan.investorName?.toLowerCase().includes(search.toLowerCase()) ||
            loan.number?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = filterStatus === 'ALL' || loan.status === filterStatus
        return matchSearch && matchStatus
    })

    const calcSummary = () => {
        const activeLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'PARTIAL').length
        const totalPrincipal = loans.reduce((s, l) => s + (l.principalAmount || 0), 0)
        const totalDisbursed = loans.reduce((s, l) => s + (l.totalDisbursed || 0), 0)
        const totalRepaid = loans.reduce((s, l) => s + (l.totalRepaid || 0), 0)
        const totalProfit = loans.reduce((s, l) => s + (l.totalProfitDistributed || 0), 0)
        const overdue = loans.filter(l => {
            if (l.status === 'PAID' || l.status === 'DRAFT') return false
            if (l.dueDate) return new Date(l.dueDate) < new Date()
            return false
        }).length
        return { totalLoans: loans.length, activeLoans, totalPrincipal, totalDisbursed, totalRepaid, totalProfit, overdue }
    }

    const summaryData = calcSummary()

    const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    const statusColor = (s: string) => {
        switch (s) {
            case 'DRAFT': return 'bg-gray-100 text-gray-600'
            case 'ACTIVE': return 'bg-blue-100 text-blue-600'
            case 'PARTIAL': return 'bg-amber-100 text-amber-600'
            case 'PAID': return 'bg-green-100 text-green-600'
            case 'OVERDUE': return 'bg-red-100 text-red-600'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    const statusLabel = (s: string) => {
        switch (s) {
            case 'DRAFT': return T.draft
            case 'ACTIVE': return T.active
            case 'PARTIAL': return T.partial
            case 'PAID': return T.paid
            case 'OVERDUE': return T.overdueStatus
            default: return s
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-blue-600" />
                        {T.title}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{T.subtitle}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    {T.addNew}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {[
                    { label: T.totalLoans, value: summaryData.totalLoans, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: T.activeLoans, value: summaryData.activeLoans, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: T.totalPrincipal, value: formatRp(summaryData.totalPrincipal), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: T.totalDisbursed, value: formatRp(summaryData.totalDisbursed), icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: T.totalRepaid, value: formatRp(summaryData.totalRepaid), icon: HandCoins, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: T.totalProfit, value: formatRp(summaryData.totalProfit), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: T.overdue, value: summaryData.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-xl p-3 border border-gray-100`}>
                        <div className="flex items-center gap-2 mb-1">
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                            <span className="text-xs text-gray-500 truncate">{item.label}</span>
                        </div>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={T.search}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['ALL', 'DRAFT', 'ACTIVE', 'PARTIAL', 'PAID', 'OVERDUE'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                    filterStatus === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {s === 'ALL' ? T.all : statusLabel(s)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Landmark className="w-12 h-12 mb-3" />
                        <p>{T.noData}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">No</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.investorName}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.principal}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.profitShare}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.repaymentType}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.dueDate}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.status}</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">{T.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((loan, idx) => (
                                    <tr key={loan.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{loan.investorName}</p>
                                                <p className="text-xs text-gray-400">{loan.number}</p>
                                                {loan.project && (
                                                    <p className="text-xs text-blue-500">{loan.project.number} - {loan.project.name}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{formatRp(loan.principalAmount)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-sm">
                                                <Percent className="w-3 h-3" />
                                                {loan.profitSharingPercent}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                loan.repaymentType === 'FULL'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {loan.repaymentType === 'FULL' ? T.full : T.installment}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(loan.status)}`}>
                                                {statusLabel(loan.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/finance/investor-loans/${loan.id}`}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                >
                                                    {T.viewDetail}
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(loan.id)}
                                                    disabled={deleting === loan.id}
                                                    className="text-red-400 hover:text-red-600 disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold">{T.addNew}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.investorName} *</label>
                                    <input
                                        type="text"
                                        value={form.investorName}
                                        onChange={e => setForm({ ...form, investorName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="PT Maju Jaya"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.contact}</label>
                                    <input
                                        type="text"
                                        value={form.investorContact}
                                        onChange={e => setForm({ ...form, investorContact: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0812xxxxxxx / email@test.com"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.principal} *</label>
                                        <input
                                            type="number"
                                            value={form.principalAmount || ''}
                                            onChange={e => setForm({ ...form, principalAmount: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="500000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.profitShare}</label>
                                        <input
                                            type="number"
                                            value={form.profitSharingPercent || ''}
                                            onChange={e => setForm({ ...form, profitSharingPercent: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="30"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.interestRate}</label>
                                        <input
                                            type="number"
                                            value={form.interestRate || ''}
                                            onChange={e => setForm({ ...form, interestRate: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.repaymentType}</label>
                                        <select
                                            value={form.repaymentType}
                                            onChange={e => setForm({ ...form, repaymentType: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="INSTALLMENT">{T.installment}</option>
                                            <option value="FULL">{T.full}</option>
                                        </select>
                                    </div>
                                </div>

                                {form.repaymentType === 'INSTALLMENT' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.tenor}</label>
                                        <input
                                            type="number"
                                            value={form.tenorMonths || ''}
                                            onChange={e => setForm({ ...form, tenorMonths: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="12"
                                            min="1"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.dueDate}</label>
                                    <input
                                        type="date"
                                        value={form.dueDate}
                                        onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.project}</label>
                                    <select
                                        value={form.projectId}
                                        onChange={e => setForm({ ...form, projectId: e.target.value, salesOrderIds: [] })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{T.noProject}</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {form.projectId && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Sales Order / PO yang didanai:</label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {(() => {
                                                const selectedProject = projects.find(p => p.id === form.projectId);
                                                if (!selectedProject || !selectedProject.salesOrders || selectedProject.salesOrders.length === 0) {
                                                    return <p className="text-sm text-gray-500">Tidak ada PO di project ini.</p>;
                                                }
                                                return selectedProject.salesOrders.map((so: any) => (
                                                    <label key={so.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-100 cursor-pointer hover:bg-gray-50">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                            checked={form.salesOrderIds.includes(so.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setForm(prev => ({ ...prev, salesOrderIds: [...prev.salesOrderIds, so.id] }));
                                                                } else {
                                                                    setForm(prev => ({ ...prev, salesOrderIds: prev.salesOrderIds.filter(id => id !== so.id) }));
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{so.number} {so.poNumber ? `(PO: ${so.poNumber})` : ''}</span>
                                                            <span className="text-xs text-gray-500">{formatRp(so.grandTotal)}</span>
                                                        </div>
                                                    </label>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.notes}</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Catatan tambahan..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {T.cancelled}
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? '...' : T.saved}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
