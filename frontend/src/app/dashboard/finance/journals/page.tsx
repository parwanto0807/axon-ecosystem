"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    BookOpen, Plus, Search, Calendar, Edit2, Trash2,
    RefreshCw, Download, FileText, Check, AlertCircle, X, Paperclip, Save, PlusCircle, Ban
} from "lucide-react"

interface Account {
    id: string
    code: string
    name: string
    type: string
    postingType: string
}

interface JournalItem {
    id?: string
    coaId: string
    description: string
    debit: number
    credit: number
    coa?: Account
}

interface JournalEntry {
    id: string
    number: string
    date: string
    description: string | null
    reference: string | null
    type: string
    status: string
    createdBy: string | null
    attachmentUrl: string | null
    voidedAt: string | null
    voidedBy: string | null
    items: JournalItem[]
}

export default function JournalsPage() {
    const [journals, setJournals] = useState<JournalEntry[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    
    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // Form state
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
    const [formRef, setFormRef] = useState("")
    const [formDesc, setFormDesc] = useState("")
    const [formAttachment, setFormAttachment] = useState("")
    const [formItems, setFormItems] = useState<JournalItem[]>([
        { coaId: "", description: "", debit: 0, credit: 0 },
        { coaId: "", description: "", debit: 0, credit: 0 }
    ])

    const fetchJournals = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/journals?type=GENERAL`)
            if (res.ok) {
                const data = await res.json()
                setJournals(data)
            }
        } catch (e) {
            console.error('Failed to fetch journals', e)
        } finally {
            setLoading(false)
        }
    }

    const fetchAccounts = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/coa`)
            if (res.ok) {
                const data = await res.json()
                setAccounts(data.filter((a: Account) => a.postingType === 'POSTING'))
            }
        } catch (e) {
            console.error('Failed to fetch COA', e)
        }
    }

    useEffect(() => {
        fetchJournals()
        fetchAccounts()
    }, [])

    const filteredJournals = journals.filter(j => 
        j.number.toLowerCase().includes(search.toLowerCase()) ||
        (j.description && j.description.toLowerCase().includes(search.toLowerCase())) ||
        (j.reference && j.reference.toLowerCase().includes(search.toLowerCase()))
    )

    // Form calculations
    const totalDebit = formItems.reduce((sum, item) => sum + (Number(item.debit) || 0), 0)
    const totalCredit = formItems.reduce((sum, item) => sum + (Number(item.credit) || 0), 0)
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
    }

    const handleAddItem = () => {
        setFormItems([...formItems, { coaId: "", description: "", debit: 0, credit: 0 }])
    }

    const handleRemoveItem = (index: number) => {
        if (formItems.length <= 2) return // min 2 rows
        const newItems = [...formItems]
        newItems.splice(index, 1)
        setFormItems(newItems)
    }

    const handleItemChange = (index: number, field: keyof JournalItem, value: any) => {
        const newItems = [...formItems]
        
        if (field === 'debit') {
            newItems[index].debit = Number(value)
            if (Number(value) > 0) newItems[index].credit = 0
        } else if (field === 'credit') {
            newItems[index].credit = Number(value)
            if (Number(value) > 0) newItems[index].debit = 0
        } else {
            newItems[index][field] = value as never
        }
        
        setFormItems(newItems)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isBalanced) return alert("Total Debit dan Kredit belum seimbang (balance)!")
        
        // validate items
        for (let i=0; i<formItems.length; i++) {
            if (!formItems[i].coaId) return alert(`Baris ${i+1}: Akun belum dipilih`)
            if (formItems[i].debit === 0 && formItems[i].credit === 0) return alert(`Baris ${i+1}: Nilai belum diisi`)
        }

        setIsSubmitting(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/journals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: formDate,
                    reference: formRef,
                    description: formDesc,
                    attachmentUrl: formAttachment,
                    items: formItems
                })
            })
            
            if (res.ok) {
                setIsFormOpen(false)
                setFormItems([
                    { coaId: "", description: "", debit: 0, credit: 0 },
                    { coaId: "", description: "", debit: 0, credit: 0 }
                ])
                setFormDesc("")
                setFormRef("")
                setFormAttachment("")
                fetchJournals()
            } else {
                const data = await res.json()
                alert(data.message || 'Terjadi kesalahan')
            }
        } catch (error) {
            console.error(error)
            alert('Gagal menyimpan jurnal')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleVoid = async (id: string) => {
        if (!confirm("Anda yakin ingin membatalkan (VOID) jurnal ini? Tindakan ini tidak dapat diubah.")) return
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/journals/${id}/void`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voidedBy: 'Admin' })
            })
            if (res.ok) {
                fetchJournals()
            } else {
                const data = await res.json()
                alert(data.message || 'Gagal void jurnal')
            }
        } catch (e) {
            console.error(e)
            alert("Error membatalkan jurnal")
        }
    }

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 md:space-y-8 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        Jurnal Umum
                    </h1>
                    <p className="text-gray-500 mt-1">Kelola entri jurnal manual (multi-line) dan penyesuaian</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchJournals}
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Buat Jurnal
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari nomor jurnal, referensi, keterangan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Tanggal & No. Jurnal</th>
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4">Referensi</th>
                                <th className="px-6 py-4 text-right">Total Debit</th>
                                <th className="px-6 py-4 text-right">Total Kredit</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        Memuat data jurnal...
                                    </td>
                                </tr>
                            ) : filteredJournals.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-gray-900">Belum ada jurnal</p>
                                        <p>Data jurnal manual akan muncul di sini</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredJournals.map((j) => {
                                    const totalD = j.items.reduce((s, i) => s + Number(i.debit), 0)
                                    const totalC = j.items.reduce((s, i) => s + Number(i.credit), 0)
                                    const isVoid = j.status === 'VOID'
                                    
                                    return (
                                        <tr key={j.id} className={`hover:bg-gray-50 transition-colors ${isVoid ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{j.number}</div>
                                                <div className="text-gray-500 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(j.date).toLocaleDateString('id-ID')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={isVoid ? 'line-through text-gray-500' : 'text-gray-800'}>
                                                    {j.description || '-'}
                                                </span>
                                                {isVoid && <div className="text-xs text-red-500 font-medium mt-1">Dibatalkan oleh {j.voidedBy}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{j.reference || '-'}</td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                {formatCurrency(totalD)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                {formatCurrency(totalC)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                    isVoid ? 'bg-red-50 text-red-600 border-red-200' 
                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                }`}>
                                                    {j.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleVoid(j.id)}
                                                    disabled={isVoid}
                                                    title={isVoid ? "Sudah dibatalkan" : "Batalkan (Void) Jurnal"}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isVoid ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:text-red-600'
                                                    }`}
                                                >
                                                    <Ban className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Create Journal */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFormOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Buat Jurnal Umum</h2>
                                    <p className="text-sm text-gray-500 mt-1">Masukkan data header dan baris jurnal (multi-line)</p>
                                </div>
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                                {/* Header Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Tanggal Jurnal *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Referensi</label>
                                        <input
                                            type="text"
                                            placeholder="No. Dokumen (Opsional)"
                                            value={formRef}
                                            onChange={(e) => setFormRef(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Keterangan Umum</label>
                                        <input
                                            type="text"
                                            placeholder="Deskripsi transaksi..."
                                            value={formDesc}
                                            onChange={(e) => setFormDesc(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Lines */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-gray-900">Baris Jurnal (Lines)</h3>
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border ${
                                            isBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                                        }`}>
                                            {isBalanced ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                            {isBalanced ? 'Seimbang (Balanced)' : 'Belum Seimbang (Unbalanced)'}
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-center">#</th>
                                                    <th className="px-4 py-3 w-1/3">Akun (COA) *</th>
                                                    <th className="px-4 py-3">Deskripsi Baris</th>
                                                    <th className="px-4 py-3 w-48 text-right">Debit (Rp)</th>
                                                    <th className="px-4 py-3 w-48 text-right">Kredit (Rp)</th>
                                                    <th className="px-4 py-3 w-12 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {formItems.map((item, index) => (
                                                    <tr key={index} className="bg-white">
                                                        <td className="px-4 py-3 text-center text-gray-400 font-medium">{index + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                value={item.coaId}
                                                                onChange={(e) => handleItemChange(index, 'coaId', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                                            >
                                                                <option value="">Pilih Akun...</option>
                                                                {accounts.map(acc => (
                                                                    <option key={acc.id} value={acc.id}>
                                                                        {acc.code} - {acc.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Catatan spesifik baris..."
                                                                value={item.description}
                                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.debit || ''}
                                                                onChange={(e) => handleItemChange(index, 'debit', e.target.value)}
                                                                disabled={item.credit > 0}
                                                                className={`w-full px-3 py-2 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                                                                    item.credit > 0 ? 'bg-gray-100 border-transparent text-gray-400' : 'border-gray-300'
                                                                }`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.credit || ''}
                                                                onChange={(e) => handleItemChange(index, 'credit', e.target.value)}
                                                                disabled={item.debit > 0}
                                                                className={`w-full px-3 py-2 border rounded-lg text-right focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                                                                    item.debit > 0 ? 'bg-gray-100 border-transparent text-gray-400' : 'border-gray-300'
                                                                }`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => handleRemoveItem(index)}
                                                                disabled={formItems.length <= 2}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3">
                                                        <button
                                                            onClick={handleAddItem}
                                                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                        >
                                                            <PlusCircle className="w-4 h-4" />
                                                            Tambah Baris
                                                        </button>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right ${isBalanced ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        {formatCurrency(totalDebit)}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right ${isBalanced ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        {formatCurrency(totalCredit)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                                {!isBalanced && (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-2 bg-red-50/50 text-red-600 text-sm text-right font-medium">
                                                            Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    Pastikan total debit & kredit seimbang sebelum menyimpan.
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsFormOpen(false)}
                                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !isBalanced}
                                        className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Simpan Jurnal
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
