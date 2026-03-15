"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2, Plus, Search, MoreVertical,
    Trash2, Edit2, X, Check, Landmark,
    CreditCard, User, MapPin, Activity,
    ChevronRight, AlertCircle
} from "lucide-react"

interface BankAccount {
    id: string
    bankName: string
    accountNumber: string
    accountHolder: string
    branch?: string
    isActive: boolean
    coaId?: string
    coa?: {
        id: string
        code: string
        name: string
    }
}

interface COA {
    id: string
    code: string
    name: string
}

export default function BankAccountsPage() {
    const [banks, setBanks] = useState<BankAccount[]>([])
    const [coas, setCoas] = useState<COA[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
    const [formData, setFormData] = useState({
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        branch: "",
        coaId: "",
        isActive: true
    })

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        fetchBanks()
        fetchCoas()
    }, [])

    const fetchBanks = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/bank-accounts")
            setBanks(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchCoas = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/coa")
            const data = await res.json()
            // Filter only cash/bank type accounts if possible, or just all
            setCoas(data.filter((a: any) => a.postingType === 'POSTING'))
        } catch (e) { console.error(e) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const method = editingBank ? "PUT" : "POST"
        const url = editingBank
            ? `http://localhost:5000/api/bank-accounts/${editingBank.id}`
            : "http://localhost:5000/api/bank-accounts"

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                setIsModalOpen(false)
                setEditingBank(null)
                setFormData({ bankName: "", accountNumber: "", accountHolder: "", branch: "", coaId: "", isActive: true })
                fetchBanks()
            }
        } catch (e) { console.error(e) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return
        try {
            await fetch(`http://localhost:5000/api/bank-accounts/${id}`, { method: "DELETE" })
            fetchBanks()
        } catch (e) { console.error(e) }
    }

    const openEdit = (bank: BankAccount) => {
        setEditingBank(bank)
        setFormData({
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            accountHolder: bank.accountHolder,
            branch: bank.branch || "",
            coaId: bank.coaId || "",
            isActive: bank.isActive
        })
        setIsModalOpen(true)
    }

    const filteredBanks = banks.filter(b =>
        b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.accountNumber.includes(searchTerm) ||
        b.accountHolder.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 md:px-6 md:py-8 space-y-6 md:space-y-8 w-full font-inter bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[1rem] md:rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20 shrink-0">
                        <Landmark size={24} className="text-white w-5 md:w-6 h-5 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Master Bank</h1>
                        <p className="text-xs md:text-sm font-medium text-slate-400">Pengelolaan rekening bank dan integrasi COA</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingBank(null)
                        setFormData({ bankName: "", accountNumber: "", accountHolder: "", branch: "", coaId: "", isActive: true })
                        setIsModalOpen(true)
                    }}
                    className="flex w-full md:w-auto justify-center items-center gap-2 px-6 py-3.5 md:py-3 bg-indigo-600 text-white rounded-[1.25rem] md:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 mt-2 md:mt-0"
                >
                    <Plus size={18} /> Tambah Rekening
                </button>
            </header>

            <div className="flex items-center gap-3 md:gap-4 bg-white p-2 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm max-w-md w-full">
                <div className="pl-3 md:pl-4 text-slate-400"><Search size={18} /></div>
                <input
                    type="text"
                    placeholder="Cari bank, nomor rekening, atau pemilik..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 py-2 md:py-3 px-2 text-xs md:text-sm focus:outline-none font-medium text-slate-700 bg-transparent"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <AnimatePresence>
                    {filteredBanks.map((bank, idx) => (
                        <motion.div
                            key={bank.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all group flex flex-col relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4 md:mb-6 relative z-10">
                                <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Building2 size={24} className="w-5 md:w-6 h-5 md:h-6" />
                                </div>
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(bank)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(bank.id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10 flex-1">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{bank.bankName}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{bank.branch || "Kantor Pusat"}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <CreditCard size={14} className="text-slate-400" />
                                        <span className="font-mono text-sm font-bold tracking-wider">{bank.accountNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <User size={14} className="text-slate-400" />
                                        <span className="text-xs font-bold uppercase">{bank.accountHolder}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-dashed border-slate-100 mt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COA Linked</span>
                                        </div>
                                        {bank.coa ? (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-900">{bank.coa.code}</p>
                                                <p className="text-[9px] font-bold text-indigo-600 truncate max-w-[120px]">{bank.coa.name}</p>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 italic">
                                                <AlertCircle size={10} /> Unlinked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Pill */}
                            <div className={`absolute top-8 right-8 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bank.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                {bank.isActive ? 'Active' : 'Inactive'}
                            </div>

                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 p-8 opacity-5 -mr-10 -mt-10 group-hover:opacity-10 group-hover:-mr-5 group-hover:-mt-5 transition-all">
                                <Landmark size={180} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'} bg-slate-900/40 backdrop-blur-sm`}>
                        <motion.div
                            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`bg-white shadow-2xl w-full max-w-xl overflow-hidden relative flex flex-col ${isMobile ? 'rounded-t-[2rem] max-h-[90vh]' : 'rounded-[3rem]'}`}
                        >
                            {isMobile && (
                                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                                </div>
                            )}
                            <div className="p-6 md:p-8 pb-0 flex items-center justify-between shrink-0">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                    {editingBank ? "Edit Rekening" : "Tambah Rekening Baru"}
                                </h2>
                                {!isMobile && (
                                    <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bank</label>
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                placeholder="Contoh: BCA, Mandiri, BNI"
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Rekening</label>
                                        <div className="relative">
                                            <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.accountNumber}
                                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                                placeholder="00012345678"
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900 text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pemilik Rekening</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.accountHolder}
                                                onChange={e => setFormData({ ...formData, accountHolder: e.target.value })}
                                                placeholder="Nama lengkap pemilik"
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900 text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cabang (Opsional)</label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                            <input
                                                type="text"
                                                value={formData.branch}
                                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                                placeholder="KCP Sudirman"
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hubungkan ke Akun COA</label>
                                    <div className="relative">
                                        <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                        <select
                                            value={formData.coaId}
                                            onChange={e => setFormData({ ...formData, coaId: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 font-bold text-slate-900 text-sm appearance-none"
                                        >
                                            <option value="">-- Pilih Akun Perkiraan --</option>
                                            {coas.map(coa => (
                                                <option key={coa.id} value={coa.id}>
                                                    [{coa.code}] {coa.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic ml-1">Penting: Link ini digunakan untuk posting jurnal otomatis.</p>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                                    <input
                                        type="checkbox"
                                        id="active"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer"
                                    />
                                    <label htmlFor="active" className="text-xs font-black text-slate-700 uppercase tracking-widest cursor-pointer">Rekening Aktif</label>
                                </div>

                                <div className="pt-2 flex gap-3 pb-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-3 md:py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all border border-slate-100 rounded-2xl bg-white"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 md:py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} /> {editingBank ? "Update Rekening" : "Simpan Rekening"}
                                    </button>
                                </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
