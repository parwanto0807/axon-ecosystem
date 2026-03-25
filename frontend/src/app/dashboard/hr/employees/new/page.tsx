"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    Users, 
    ArrowLeft, 
    Save, 
    User, 
    Briefcase, 
    DollarSign, 
    Landmark, 
    Mail, 
    Phone, 
    MapPin,
    ShieldCheck,
    CreditCard,
    Calendar,
    Tag,
    Building2
} from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function NewEmployeePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [businessCategories, setBusinessCategories] = useState<any[]>([])
    const [formData, setFormData] = useState({
        name: "",
        nik: "",
        email: "",
        phone: "",
        address: "",
        type: "TETAP",
        status: "ACTIVE",
        position: "",
        department: "",
        joinDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        dailyWage: 0,
        bankName: "",
        bankAccount: "",
        categoryId: "",
        businessCategoryId: "",
        createVendor: true
    })

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_BASE}/hr/employee-categories`)
                const data = await res.json()
                setCategories(data)
            } catch (e) {
                console.error(e)
            }
        }
        const fetchBusinessCategories = async () => {
            try {
                const res = await fetch(`${API_BASE}/business-categories`)
                const data = await res.json()
                setBusinessCategories(data)
            } catch (e) {
                console.error(e)
            }
        }
        fetchCategories()
        fetchBusinessCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/hr/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                router.push("/dashboard/hr/employees")
            } else {
                const err = await res.json()
                alert(`Error: ${err.message}`)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to save employee.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/hr/employees">
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <ArrowLeft size={20} />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">TAMBAH KARYAWAN</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrasi Staf Baru ke Dalam Sistem</p>
                    </div>
                </div>
                <button 
                    disabled={loading}
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'MENYIMPAN...' : 'SIMPAN DATA'}
                </button>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                {/* Personal Info Section */}
                <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <User size={18} />
                        </div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Data Pribadi</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Lengkap</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                placeholder="Masukkan nama lengkap karyawan..."
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">NIK (Nomor Induk Kependudukan)</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                placeholder="32xxxxxxxxxxxxxxxx"
                                value={formData.nik}
                                onChange={e => setFormData({...formData, nik: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                    <input 
                                        type="email"
                                        className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        placeholder="email@company.com"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">No. WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        placeholder="08xxxxxxxxxx"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alamat Domisili</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-5 text-slate-300 w-4 h-4" />
                                <textarea 
                                    className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none min-h-[100px]"
                                    placeholder="Masukkan alamat lengkap sesuai KTP..."
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employment Section */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                <Briefcase size={18} />
                            </div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Status Pekerjaan</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipe Karyawan</label>
                                    <select 
                                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="TETAP">Tetap (Permanent)</option>
                                        <option value="KONTRAK">Kontrak (Contract)</option>
                                        <option value="HARIAN_LEPAS">Harian Lepas (Casual)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Status Keaktifan</label>
                                    <select 
                                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="ACTIVE">Aktif</option>
                                        <option value="INACTIVE">Non-Aktif</option>
                                        <option value="RESIGNED">Mengundurkan Diri</option>
                                        <option value="TERMINATED">Diberhentikan</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Jabatan</label>
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        placeholder="Staff IT / Manager / dll"
                                        value={formData.position}
                                        onChange={e => setFormData({...formData, position: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Departemen</label>
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        placeholder="Operational / Finance"
                                        value={formData.department}
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Departemen / Kumpulan</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                    <select 
                                        className="w-full bg-slate-50 pl-11 pr-5 py-4 rounded-2xl border-none text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        value={formData.categoryId}
                                        onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                    >
                                        <option value="">Pilih Kategori Karyawan...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-1">Unit Bisnis (Multi-Business) *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 w-4 h-4" />
                                    <select 
                                        required
                                        className="w-full bg-rose-50/30 pl-11 pr-5 py-4 rounded-2xl border-none text-xs font-black text-slate-900 focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        value={formData.businessCategoryId}
                                        onChange={e => setFormData({...formData, businessCategoryId: e.target.value})}
                                    >
                                        <option value="">Pilih Unit Bisnis...</option>
                                        {businessCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 text-emerald-500">Tanggal Bergabung</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
                                    <input 
                                        type="date"
                                        className="w-full bg-emerald-50/50 pl-11 pr-4 py-4 rounded-2xl border border-emerald-100 text-xs font-black text-emerald-700 focus:ring-2 ring-emerald-500/10 outline-none"
                                        value={formData.joinDate}
                                        onChange={e => setFormData({...formData, joinDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarSign size={18} />
                            </div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Kompensasi & Pembayaran</h2>
                        </div>

                        <div className="space-y-4">
                            {formData.type === 'HARIAN_LEPAS' ? (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Upah Per Hari / Pekerjaan</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl border-none text-sm font-black text-slate-800 focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={formData.dailyWage}
                                            onChange={e => setFormData({...formData, dailyWage: Number(e.target.value)})}
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight">* Karyawan Harian Lepas dibayar berdasarkan kehadiran atau tugas.</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gaji Pokok Per Bulan</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl border-none text-sm font-black text-indigo-600 focus:ring-2 ring-indigo-500/10 outline-none"
                                            value={formData.baseSalary}
                                            onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Bank</label>
                                    <div className="relative">
                                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                        <input 
                                            type="text"
                                            className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            placeholder="BCA / Mandiri / dll"
                                            value={formData.bankName}
                                            onChange={e => setFormData({...formData, bankName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">No. Rekening</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                        <input 
                                            type="text"
                                            className="w-full bg-slate-50 pl-11 pr-4 py-4 rounded-2xl border-none text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            placeholder="xxxxx89012"
                                            value={formData.bankAccount}
                                            onChange={e => setFormData({...formData, bankAccount: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex items-center justify-between gap-4 group cursor-pointer" onClick={() => setFormData({...formData, createVendor: !formData.createVendor})}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.createVendor ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Kaitkan ke Profile Pembayaran</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Otomatis buat Vendor Profile untuk Penggajian</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-all ${formData.createVendor ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.createVendor ? 'right-1' : 'left-1'}`} />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
