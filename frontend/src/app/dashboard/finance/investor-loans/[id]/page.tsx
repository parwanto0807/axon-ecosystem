"use client"

import { useState, useEffect } from "react"
import {
    ArrowLeft,
    Landmark,
    Wallet,
    HandCoins,
    TrendingUp,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    DollarSign,
    Percent,
    FileText,
    CreditCard,
    Banknote,
    Pencil,
    X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import InvestorLoanPDFModal from "../InvestorLoanPDFModal"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

const t = {
    ID: {
        back: 'Kembali',
        loanDetail: 'Detail Pinjaman',
        investor: 'Investor',
        investorName: 'Nama Investor',
        contact: 'Kontak',
        project: 'Project',
        principal: 'Modal Pinjaman',
        profitShare: 'Bagi Hasil',
        interest: 'Bunga',
        tenor: 'Tenor',
        dueDate: 'Jatuh Tempo',
        status: 'Status',
        repaymentType: 'Tipe Pengembalian',
        notes: 'Catatan',
        disbursements: 'Pencairan Dana',
        repayments: 'Pengembalian',
        profitDist: 'Bagi Hasil Profit',
        schedule: 'Jadwal Cicilan',
        disburse: 'Cairkan Dana',
        repay: 'Bayar / Cicil',
        distributeProfit: 'Distribusi Profit',
        totalDisbursed: 'Total Dicairkan',
        totalRepaid: 'Total Dikembalikan',
        outstanding: 'Sisa Hutang',
        totalProfitDist: 'Total Profit Dibagikan',
        amount: 'Jumlah',
        date: 'Tanggal',
        method: 'Metode',
        cash: 'Cash',
        transfer: 'Transfer',
        installment: 'Cicilan',
        full: 'Lunas',
        bank: 'Rekening Bank',
        proof: 'Bukti',
        noData: 'Belum ada data',
        draft: 'Draft',
        active: 'Aktif',
        partial: 'Sebagian',
        paid: 'Lunas',
        overdue: 'Jatuh Tempo',
        activate: 'Aktifkan Pinjaman',
        monthlyPayment: 'Cicilan/Bulan',
        installmentNo: 'Cicilan Ke',
        pending: 'Menunggu',
        distributed: 'Terdistibusi',
        totalProfit: 'Total Profit Project',
        sharePercent: 'Persentase Share',
        distributedAmount: 'Jumlah Dibagikan',
        saved: 'Tersimpan',
        cancelled: 'Batal',
        selectBank: 'Pilih Rekening Bank',
        notesPlaceholder: 'Catatan tambahan...',
        proofUrl: 'URL Bukti Pembayaran',
    },
    EN: {
        back: 'Back',
        loanDetail: 'Loan Detail',
        investor: 'Investor',
        investorName: 'Investor Name',
        contact: 'Contact',
        project: 'Project',
        principal: 'Loan Principal',
        profitShare: 'Profit Sharing',
        interest: 'Interest',
        tenor: 'Tenor',
        dueDate: 'Due Date',
        status: 'Status',
        repaymentType: 'Repayment Type',
        notes: 'Notes',
        disbursements: 'Fund Disbursements',
        repayments: 'Repayments',
        profitDist: 'Profit Distribution',
        schedule: 'Repayment Schedule',
        disburse: 'Disburse Fund',
        repay: 'Pay / Installment',
        distributeProfit: 'Distribute Profit',
        totalDisbursed: 'Total Disbursed',
        totalRepaid: 'Total Repaid',
        outstanding: 'Outstanding Balance',
        totalProfitDist: 'Total Profit Distributed',
        amount: 'Amount',
        date: 'Date',
        method: 'Method',
        cash: 'Cash',
        transfer: 'Transfer',
        installment: 'Installment',
        full: 'Full',
        bank: 'Bank Account',
        proof: 'Proof',
        noData: 'No data yet',
        draft: 'Draft',
        active: 'Active',
        partial: 'Partial',
        paid: 'Paid',
        overdue: 'Overdue',
        activate: 'Activate Loan',
        monthlyPayment: 'Monthly Payment',
        installmentNo: 'Installment #',
        pending: 'Pending',
        distributed: 'Distributed',
        totalProfit: 'Total Project Profit',
        sharePercent: 'Share Percent',
        distributedAmount: 'Distributed Amount',
        saved: 'Saved',
        cancelled: 'Cancel',
        selectBank: 'Select Bank Account',
        notesPlaceholder: 'Additional notes...',
        proofUrl: 'Payment Proof URL',
    }
}

export default function InvestorLoanDetailPage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role || 'STAFF'
    const lang = (session?.user as any)?.lang || 'ID'
    const T = t[lang as keyof typeof t] || t.ID
    const params = useParams()
    const loanId = params.id as string

    const [loan, setLoan] = useState<any>(null)
    const [schedule, setSchedule] = useState<any>(null)
    const [bankAccounts, setBankAccounts] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activating, setActivating] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showPDFModal, setShowPDFModal] = useState(false)
    const [company, setCompany] = useState<any>(null)

    const [showDisburseModal, setShowDisburseModal] = useState(false)
    const [showRepayModal, setShowRepayModal] = useState(false)
    const [showProfitModal, setShowProfitModal] = useState(false)

    const [editForm, setEditForm] = useState({
        investorName: '',
        investorContact: '',
        principalAmount: 0,
        profitSharingPercent: 0,
        interestRate: 0,
        repaymentType: 'INSTALLMENT',
        tenorMonths: 12,
        dueDate: '',
        projectId: '',
        notes: ''
    })

    const [disburseForm, setDisburseForm] = useState({
        amount: 0,
        method: 'TRANSFER',
        bankAccountId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        proofUrl: ''
    })

    const [repayForm, setRepayForm] = useState({
        amount: 0,
        type: 'INSTALLMENT',
        bankAccountId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        proofUrl: ''
    })

    const [profitForm, setProfitForm] = useState({
        totalProjectProfit: 0,
        bankAccountId: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    useEffect(() => {
        if (loanId) {
            fetchLoan()
            fetchSchedule()
            fetchBankAccounts()
            fetchProjects()
            fetchCompany()
        }
    }, [loanId])

    const fetchLoan = async () => {
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}`)
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setLoan(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchSchedule = async () => {
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}/schedule`)
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setSchedule(data)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch(`${API_BASE}/bank-accounts`)
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setBankAccounts(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        }
    }

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                headers: { 'x-user-role': userRole }
            })
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setProjects(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        }
    }

    const fetchCompany = async () => {
        try {
            const res = await fetch(`${API_BASE}/company`, {
                headers: { 'x-user-role': userRole }
            })
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            setCompany(data)
        } catch (e) {
            console.error(e)
        }
    }

    const openEditModal = () => {
        setEditForm({
            investorName: loan.investorName || '',
            investorContact: loan.investorContact || '',
            principalAmount: loan.principalAmount || 0,
            profitSharingPercent: loan.profitSharingPercent || 0,
            interestRate: loan.interestRate || 0,
            repaymentType: loan.repaymentType || 'INSTALLMENT',
            tenorMonths: loan.tenorMonths || 12,
            dueDate: loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : '',
            projectId: loan.projectId || '',
            notes: loan.notes || ''
        })
        setShowEditModal(true)
    }

    const handleUpdate = async () => {
        if (!editForm.investorName) return alert('Nama investor wajib diisi')
        if (!editForm.principalAmount || editForm.principalAmount <= 0) return alert('Jumlah pinjaman harus lebih dari 0')

        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({
                    ...editForm,
                    projectId: editForm.projectId || null,
                    tenorMonths: editForm.repaymentType === 'INSTALLMENT' ? editForm.tenorMonths : null,
                    dueDate: editForm.dueDate || null
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            setShowEditModal(false)
            fetchLoan()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleActivate = async () => {
        setActivating(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}/activate`, { method: 'POST', headers: { 'x-user-role': userRole } })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            fetchLoan()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setActivating(false)
        }
    }

    const handleDisburse = async () => {
        if (!disburseForm.amount || disburseForm.amount <= 0) return alert('Jumlah harus lebih dari 0')
        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}/disburse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({
                    ...disburseForm,
                    bankAccountId: disburseForm.bankAccountId || null
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            setShowDisburseModal(false)
            setDisburseForm({ amount: 0, method: 'TRANSFER', bankAccountId: '', date: new Date().toISOString().split('T')[0], notes: '', proofUrl: '' })
            fetchLoan()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleRepay = async () => {
        if (!repayForm.amount || repayForm.amount <= 0) return alert('Jumlah harus lebih dari 0')
        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}/repay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({
                    ...repayForm,
                    bankAccountId: repayForm.bankAccountId || null
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            setShowRepayModal(false)
            setRepayForm({ amount: 0, type: 'INSTALLMENT', bankAccountId: '', date: new Date().toISOString().split('T')[0], notes: '', proofUrl: '' })
            fetchLoan()
            fetchSchedule()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDistributeProfit = async () => {
        if (!profitForm.totalProjectProfit || profitForm.totalProjectProfit <= 0) return alert('Total profit harus lebih dari 0')
        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/investor-loans/${loanId}/distribute-profit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
                body: JSON.stringify({
                    ...profitForm,
                    bankAccountId: profitForm.bankAccountId || null
                })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.message)
            }
            setShowProfitModal(false)
            setProfitForm({ totalProjectProfit: 0, bankAccountId: '', date: new Date().toISOString().split('T')[0], notes: '' })
            fetchLoan()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setSaving(false)
        }
    }

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
        const labels: Record<string, string> = {
            DRAFT: T.draft, ACTIVE: T.active, PARTIAL: T.partial, PAID: T.paid, OVERDUE: T.overdue
        }
        return labels[s] || s
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!loan) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-gray-500">Pinjaman tidak ditemukan</p>
                <Link href="/dashboard/finance/investor-loans" className="mt-4 text-blue-600 hover:underline">
                    {T.back}
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/finance/investor-loans"
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-blue-600" />
                        {loan.number}
                    </h1>
                    <p className="text-sm text-gray-500">{loan.investorName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(loan.status)}`}>
                    {statusLabel(loan.status)}
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-gray-500">{T.principal}</span>
                    </div>
                    <p className="text-lg font-bold text-purple-600">{formatRp(loan.principalAmount)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-gray-500">{T.totalDisbursed}</span>
                    </div>
                    <p className="text-lg font-bold text-indigo-600">{formatRp(loan.totalDisbursed)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <HandCoins className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-gray-500">{T.totalRepaid}</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{formatRp(loan.totalRepaid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-gray-500">{T.outstanding}</span>
                    </div>
                    <p className="text-lg font-bold text-red-600">{formatRp(loan.outstandingBalance)}</p>
                </div>
            </div>

            {/* Info & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Loan Info */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">{T.loanDetail}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">{T.investor}</p>
                            <p className="font-medium">{loan.investorName}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">{T.project}</p>
                            <p className="font-medium">{loan.project ? `${loan.project.number} - ${loan.project.name}` : '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">{T.profitShare}</p>
                            <p className="font-medium flex items-center gap-1">
                                <Percent className="w-3 h-3" /> {loan.profitSharingPercent}%
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">{T.interest}</p>
                            <p className="font-medium">{loan.interestRate}%</p>
                        </div>
                        <div>
                            <p className="text-gray-500">{T.tenor}</p>
                            <p className="font-medium">{loan.tenorMonths ? `${loan.tenorMonths} bulan` : '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">{T.dueDate}</p>
                            <p className="font-medium">{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('id-ID') : '-'}</p>
                        </div>
                        {loan.notes && (
                            <div className="col-span-2 md:col-span-3">
                                <p className="text-gray-500">{T.notes}</p>
                                <p className="font-medium">{loan.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4">Aksi</h3>
                    <div className="space-y-3">
                        {loan.status === 'DRAFT' && (
                            <>
                                <button
                                    onClick={openEditModal}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Pencil className="w-4 h-4" />
                                    {lang === 'EN' ? 'Edit Loan' : 'Edit Pinjaman'}
                                </button>
                                <button
                                    onClick={handleActivate}
                                    disabled={activating}
                                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {activating ? '...' : T.activate}
                                </button>
                            </>
                        )}
                        {loan.status !== 'DRAFT' && loan.status !== 'PAID' && (
                            <>
                                <button
                                    onClick={() => setShowDisburseModal(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    <Wallet className="w-4 h-4" />
                                    {T.disburse}
                                </button>
                                <button
                                    onClick={() => setShowRepayModal(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 transition"
                                >
                                    <HandCoins className="w-4 h-4" />
                                    {T.repay}
                                </button>
                                {loan.profitSharingPercent > 0 && (
                                    <button
                                        onClick={() => setShowProfitModal(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 transition"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        {T.distributeProfit}
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => setShowPDFModal(true)}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-lg hover:bg-slate-900 transition"
                        >
                            <FileText className="w-4 h-4" />
                            {lang === 'EN' ? 'Print Contract' : 'Cetak Kontrak'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Disbursements Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                    {T.disbursements}
                </h3>
                {loan.disbursements?.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">{T.noData}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.date}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.amount}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.method}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.bank}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.notes}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loan.disbursements.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">{new Date(d.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-3 py-2 font-medium text-indigo-600">{formatRp(d.amount)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                d.method === 'CASH' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {d.method === 'CASH' ? T.cash : T.transfer}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{d.bankAccount?.bankName || '-'}</td>
                                        <td className="px-3 py-2 text-gray-500">{d.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Repayments Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-emerald-600" />
                    {T.repayments}
                </h3>
                {loan.repayments?.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">{T.noData}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.date}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.amount}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.method}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.bank}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.notes}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loan.repayments.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-3 py-2 font-medium text-emerald-600">{formatRp(r.amount)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                r.type === 'FULL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {r.type === 'FULL' ? T.full : `${T.installment} #${r.installmentNumber || '-'}`}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{r.bankAccount?.bankName || '-'}</td>
                                        <td className="px-3 py-2 text-gray-500">{r.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Profit Distributions Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    {T.profitDist}
                </h3>
                {loan.profitDistributions?.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">{T.noData}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.date}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.totalProfit}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.sharePercent}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.distributedAmount}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.status}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loan.profitDistributions.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-3 py-2">{formatRp(p.totalProjectProfit)}</td>
                                        <td className="px-3 py-2">{p.investorSharePercent}%</td>
                                        <td className="px-3 py-2 font-medium text-amber-600">{formatRp(p.distributedAmount)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                p.status === 'DISTRIBUTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {p.status === 'DISTRIBUTED' ? T.distributed : T.pending}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Repayment Schedule */}
            {schedule && schedule.type === 'INSTALLMENT' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {T.schedule}
                    </h3>
                    <div className="flex items-center gap-4 mb-4 text-sm">
                        <span className="text-gray-500">{T.monthlyPayment}: <strong>{formatRp(schedule.monthlyPayment)}</strong></span>
                        <span className="text-gray-500">{T.tenor}: <strong>{schedule.tenor} bulan</strong></span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.installmentNo}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">{T.amount}</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Jatuh Tempo</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {schedule.schedule.map((s: any) => (
                                    <tr key={s.installment} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">{s.installment}</td>
                                        <td className="px-3 py-2 font-medium">{formatRp(s.amount)}</td>
                                        <td className="px-3 py-2">{new Date(s.dueDate).toLocaleDateString('id-ID')}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                s.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                s.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {s.status === 'PAID' ? 'Lunas' : s.status === 'PARTIAL' ? 'Sebagian' : 'Menunggu'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Disburse Modal */}
            <AnimatePresence>
                {showDisburseModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDisburseModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-md p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-indigo-600" />
                                {T.disburse}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.amount} *</label>
                                    <input
                                        type="number"
                                        value={disburseForm.amount || ''}
                                        onChange={e => setDisburseForm({ ...disburseForm, amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.method}</label>
                                        <select
                                            value={disburseForm.method}
                                            onChange={e => setDisburseForm({ ...disburseForm, method: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="TRANSFER">{T.transfer}</option>
                                            <option value="CASH">{T.cash}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.date}</label>
                                        <input
                                            type="date"
                                            value={disburseForm.date}
                                            onChange={e => setDisburseForm({ ...disburseForm, date: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.bank}</label>
                                    <select
                                        value={disburseForm.bankAccountId}
                                        onChange={e => setDisburseForm({ ...disburseForm, bankAccountId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{T.selectBank}</option>
                                        {bankAccounts.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.notes}</label>
                                    <input
                                        type="text"
                                        value={disburseForm.notes}
                                        onChange={e => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder={T.notesPlaceholder}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowDisburseModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    {T.cancelled}
                                </button>
                                <button onClick={handleDisburse} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                                    {saving ? '...' : T.saved}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Repay Modal */}
            <AnimatePresence>
                {showRepayModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRepayModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-md p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <HandCoins className="w-5 h-5 text-emerald-600" />
                                {T.repay}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.amount} *</label>
                                    <input
                                        type="number"
                                        value={repayForm.amount || ''}
                                        onChange={e => setRepayForm({ ...repayForm, amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Sisa hutang: {formatRp(loan.outstandingBalance)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.method}</label>
                                        <select
                                            value={repayForm.type}
                                            onChange={e => setRepayForm({ ...repayForm, type: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="INSTALLMENT">{T.installment}</option>
                                            <option value="FULL">{T.full}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.date}</label>
                                        <input
                                            type="date"
                                            value={repayForm.date}
                                            onChange={e => setRepayForm({ ...repayForm, date: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.bank}</label>
                                    <select
                                        value={repayForm.bankAccountId}
                                        onChange={e => setRepayForm({ ...repayForm, bankAccountId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{T.selectBank}</option>
                                        {bankAccounts.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.notes}</label>
                                    <input
                                        type="text"
                                        value={repayForm.notes}
                                        onChange={e => setRepayForm({ ...repayForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder={T.notesPlaceholder}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowRepayModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    {T.cancelled}
                                </button>
                                <button onClick={handleRepay} disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                    {saving ? '...' : T.saved}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profit Distribution Modal */}
            <AnimatePresence>
                {showProfitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowProfitModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-md p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                                {T.distributeProfit}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.totalProfit} *</label>
                                    <input
                                        type="number"
                                        value={profitForm.totalProjectProfit || ''}
                                        onChange={e => setProfitForm({ ...profitForm, totalProjectProfit: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                                    <p className="text-amber-800">
                                        Bagian investor: <strong>{loan.profitSharingPercent}%</strong> = <strong>
                                            {formatRp((profitForm.totalProjectProfit * loan.profitSharingPercent) / 100)}
                                        </strong>
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.date}</label>
                                    <input
                                        type="date"
                                        value={profitForm.date}
                                        onChange={e => setProfitForm({ ...profitForm, date: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.bank}</label>
                                    <select
                                        value={profitForm.bankAccountId}
                                        onChange={e => setProfitForm({ ...profitForm, bankAccountId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{T.selectBank}</option>
                                        {bankAccounts.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.notes}</label>
                                    <input
                                        type="text"
                                        value={profitForm.notes}
                                        onChange={e => setProfitForm({ ...profitForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder={T.notesPlaceholder}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowProfitModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    {T.cancelled}
                                </button>
                                <button onClick={handleDistributeProfit} disabled={saving} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                                    {saving ? '...' : T.saved}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Pencil className="w-5 h-5 text-blue-600" />
                                    {lang === 'EN' ? 'Edit Loan' : 'Edit Pinjaman'}
                                </h2>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.investorName} *</label>
                                    <input
                                        type="text"
                                        value={editForm.investorName}
                                        onChange={e => setEditForm({ ...editForm, investorName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.contact}</label>
                                    <input
                                        type="text"
                                        value={editForm.investorContact}
                                        onChange={e => setEditForm({ ...editForm, investorContact: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.principal} *</label>
                                        <input
                                            type="number"
                                            value={editForm.principalAmount || ''}
                                            onChange={e => setEditForm({ ...editForm, principalAmount: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.profitShare}</label>
                                        <input
                                            type="number"
                                            value={editForm.profitSharingPercent || ''}
                                            onChange={e => setEditForm({ ...editForm, profitSharingPercent: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.interest}</label>
                                        <input
                                            type="number"
                                            value={editForm.interestRate || ''}
                                            onChange={e => setEditForm({ ...editForm, interestRate: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.repaymentType}</label>
                                        <select
                                            value={editForm.repaymentType}
                                            onChange={e => setEditForm({ ...editForm, repaymentType: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="INSTALLMENT">{lang === 'EN' ? 'Installment' : 'Cicilan'}</option>
                                            <option value="FULL">{lang === 'EN' ? 'Full Payment' : 'Lunas Sekaligus'}</option>
                                        </select>
                                    </div>
                                </div>

                                {editForm.repaymentType === 'INSTALLMENT' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{T.tenor}</label>
                                        <input
                                            type="number"
                                            value={editForm.tenorMonths || ''}
                                            onChange={e => setEditForm({ ...editForm, tenorMonths: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                            min="1"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.dueDate}</label>
                                    <input
                                        type="date"
                                        value={editForm.dueDate}
                                        onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.project}</label>
                                    <select
                                        value={editForm.projectId}
                                        onChange={e => setEditForm({ ...editForm, projectId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">{lang === 'EN' ? 'No Project' : 'Tanpa Project'}</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{T.notes}</label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    {T.cancelled}
                                </button>
                                <button onClick={handleUpdate} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? '...' : T.saved}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PDF Modal */}
            {showPDFModal && loan && company && (
                <InvestorLoanPDFModal
                    loan={loan}
                    company={company}
                    onClose={() => setShowPDFModal(false)}
                />
            )}
        </div>
    )
}
