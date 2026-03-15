"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Users, 
    Plus, 
    Search, 
    Filter, 
    MoreHorizontal, 
    Edit3, 
    Trash2, 
    UserCheck, 
    UserMinus,
    Briefcase,
    Building2,
    Calendar,
    Phone,
    Mail,
    ChevronDown,
    Download,
    DollarSign
} from "lucide-react"
import Link from "next/link"

const API_BASE = "http://localhost:5000/api"

export default function EmployeeListPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState("ALL")
    const [filterStatus, setFilterStatus] = useState("ALL")
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/employees`)
            const data = await res.json()
            setEmployees(data)
        } catch (e) {
            console.error("Failed to fetch employees", e)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this employee?")) return
        try {
            await fetch(`${API_BASE}/hr/employees/${id}`, { method: 'DELETE' })
            fetchEmployees()
        } catch (e) {
            console.error(e)
        }
    }

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (emp.nik && emp.nik.includes(searchQuery))
        const matchesType = filterType === "ALL" || emp.type === filterType
        const matchesStatus = filterStatus === "ALL" || emp.status === filterStatus
        return matchesSearch && matchesType && matchesStatus
    })

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen pb-24 md:pb-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Users className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">DATA KARYAWAN</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[3.25rem]">Manajemen Sumber Daya Manusia</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex-1 md:flex-none px-4 py-3 md:py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] md:text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        <Download size={16} />
                        EXPORT
                    </button>
                    <Link href="/dashboard/hr/employees/new" className="flex-[2] md:flex-none">
                        <button className="w-full px-6 py-3 md:py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] md:text-xs font-black hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                            <Plus size={16} />
                            TAMBAH KARYAWAN
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Staff', value: employees.length, color: 'indigo' },
                    { label: 'Permanent', value: employees.filter(e => e.type === 'TETAP').length, color: 'emerald' },
                    { label: 'Contract', value: employees.filter(e => e.type === 'KONTRAK').length, color: 'blue' },
                    { label: 'Harian Lepas', value: employees.filter(e => e.type === 'HARIAN_LEPAS').length, color: 'amber' },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label} 
                        className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm"
                    >
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-lg md:text-2xl font-black text-slate-800 mt-0.5 md:mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filter Area */}
            <div className="bg-white p-4 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text"
                        placeholder="Cari berdasarkan nama atau NIK..."
                        className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 rounded-xl md:rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                        <Filter size={16} />
                    </div>
                    <select 
                        className="bg-slate-50 px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border-none focus:ring-2 ring-indigo-500/10 outline-none shrink-0"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="ALL">Semua Tipe</option>
                        <option value="TETAP">Tetap</option>
                        <option value="KONTRAK">Kontrak</option>
                        <option value="HARIAN_LEPAS">Harian Lepas</option>
                    </select>

                    <select 
                        className="bg-slate-50 px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border-none focus:ring-2 ring-indigo-500/10 outline-none shrink-0"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Non-Aktif</option>
                    </select>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-8">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-bottom border-slate-100">
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info Karyawan</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jabatan & Dept</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Tipe</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gaji / Upah</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Loading data...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-slate-300">Data tidak ditemukan</td></tr>
                        ) : filteredEmployees.map((emp) => (
                            <motion.tr 
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={emp.id} 
                                className="hover:bg-slate-50/50 transition-colors group"
                            >
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{emp.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.nik || 'N/A'}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <Phone size={10} className="text-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400">{emp.phone || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Briefcase size={12} className="text-indigo-500" />
                                        <p className="text-xs font-black text-slate-700">{emp.position || 'Staf'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building2 size={12} className="text-slate-300" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.department || '-'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="space-y-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            emp.type === 'TETAP' ? 'bg-emerald-50 text-emerald-600' : 
                                            emp.type === 'KONTRAK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {emp.type}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{emp.status}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    {emp.type === 'HARIAN_LEPAS' ? (
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Rp {emp.dailyWage?.toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Per Hari / Pekerjaan</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-black text-indigo-600">Rp {emp.baseSalary?.toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Gaji Pokok / Bulan</p>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <Link href={`/dashboard/hr/employees/${emp.id}/edit`}>
                                            <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                <Edit3 size={14} />
                                            </button>
                                        </Link>
                                        <button 
                                            onClick={() => handleDelete(emp.id)}
                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col divide-y divide-slate-50">
                    {loading ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Loading data...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-slate-300">Data tidak ditemukan</div>
                    ) : filteredEmployees.map((emp) => (
                        <div key={emp.id} className="p-5 flex flex-col gap-4 active:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{emp.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.nik || 'NO NIK'}</p>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                    emp.type === 'TETAP' ? 'bg-emerald-50 text-emerald-600' : 
                                    emp.type === 'KONTRAK' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    {emp.type}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Briefcase size={8} className="text-indigo-500" /> Jabatan
                                    </p>
                                    <p className="text-[10px] font-black text-slate-700 uppercase truncate">{emp.position || 'Staf'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/50 text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-end gap-1.5">
                                        Gaji <DollarSign size={8} className="text-emerald-500" />
                                    </p>
                                    <p className="text-[10px] font-black text-slate-800">
                                        Rp {(emp.type === 'HARIAN_LEPAS' ? emp.dailyWage : emp.baseSalary)?.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{emp.status}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/dashboard/hr/employees/${emp.id}/edit`}>
                                        <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                                            <Edit3 size={14} />
                                        </button>
                                    </Link>
                                    <button 
                                        onClick={() => handleDelete(emp.id)}
                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
