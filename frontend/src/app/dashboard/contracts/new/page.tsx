"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    FileText, Save, ArrowLeft, Plus, Trash2, 
    User, Building2, Calendar, DollarSign,
    GripVertical, Layout, Edit2, AlertCircle,
    CheckCircle2, Briefcase, RefreshCw, FilePlus
} from "lucide-react"
import Link from "next/link"
import { motion, Reorder } from "framer-motion"

interface Clause {
    id: string;
    title: string;
    content: string;
}

export default function NewContractPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [vendors, setVendors] = useState<any[]>([])
    const [bridgeType, setBridgeType] = useState<"" | "CUSTOMER" | "VENDOR">("")
    
    // Form State
    const [formData, setFormData] = useState({
        number: "",
        subject: "",
        type: "EMPLOYMENT",
        status: "DRAFT",
        startDate: "",
        endDate: "",
        amount: 0,
        currency: "IDR",
        billingCycle: "MONTHLY",
        autoBilling: false,
        billingDay: 1,
        dueDay: 10,
        
        // Parties
        firstPartyName: "GARRY TISNANTONO",
        firstPartyTitle: "DIREKTUR PT. Grafindo Mitrasemesta",
        firstPartyAddress: "Bekasi, Kawasan industry Jababeka, blok U 8 D Cikarang",
        
        secondPartyName: "",
        secondPartyTitle: "",
        secondPartyAddress: "",
        
        // Relations
        customerId: "",
        vendorId: "",
        projectId: ""
    })

    const [clauses, setClauses] = useState<Clause[]>([
        { id: "1", title: "MASA BERLAKU", content: "Perjanjian ini berlaku untuk jangka waktu 1 (satu) tahun terhitung sejak tanggal ditandatangani." },
        { id: "2", title: "LINGKUP PEKERJAAN", content: "PIHAK KEDUA akan melaksanakan tugas dan tanggung jawab sesuai dengan arahan PIHAK PERTAMA terkait operasional perusahaan." },
        { id: "3", title: "KOMPENSASI", content: "PIHAK PERTAMA akan memberikan kompensasi kepada PIHAK KEDUA sebesar nilai yang disepakati setiap bulannya." }
    ])

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const [p, c, v] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`).then(r => r.json()),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`).then(r => r.json()),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`).then(r => r.json())
                ])
                setProjects(p)
                setCustomers(c)
                setVendors(v)
            } catch (e) { console.error(e) }
        }
        fetchRefs()

        // Duplication Hydration Logic
        const saved = localStorage.getItem('duplicated_contract');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Extract only valid flat fields, exclude objects
                const { 
                    clauses: savedClauses, 
                    customer, vendor, project, user, // Exclude these
                    ...rest 
                } = data;
                
                // Sanitize null values to empty strings
                const sanitizedRest = { ...rest };
                ['projectId', 'customerId', 'vendorId', 'type'].forEach(key => {
                    if (sanitizedRest[key] === null) sanitizedRest[key] = "";
                });

                setFormData(prev => ({ 
                    ...prev, 
                    ...sanitizedRest,
                    startDate: rest.startDate ? rest.startDate.split('T')[0] : "",
                    endDate: rest.endDate ? rest.endDate.split('T')[0] : ""
                }));
                if (savedClauses) setClauses(savedClauses);
                
                // Set Bridge Type
                if (rest.customerId) setBridgeType("CUSTOMER");
                else if (rest.vendorId) setBridgeType("VENDOR");
                
                localStorage.removeItem('duplicated_contract');
            } catch (e) { console.error("Failed to load duplicated contract:", e) }
        }
    }, [])

    const addClause = () => {
        const newClause = { id: Date.now().toString(), title: `PASAL ${clauses.length + 1}`, content: "" }
        setClauses([...clauses, newClause])
    }

    const loadSPKTemplate = () => {
        setFormData({
            ...formData,
            subject: "PERPANJANGAN PERJANJIAN KERJA",
            type: "EMPLOYMENT",
            startDate: "2026-01-02",
            endDate: "2026-12-31",
            amount: 10500000,
            secondPartyName: "PARWANTO",
            secondPartyTitle: "Staff IT Support",
            secondPartyAddress: "Cibitung, Perumahan Metland Cibitung Cluster Taman Marunda Blok S6 No. 34 Rt. 003 Rw. 26 Kelurahan Wanajaya, Kec Cibitung Kab. Bekasi",
        })
        setClauses([
            { id: "p1", title: "JABATAN DAN WAKTU", content: "PIHAK PERTAMA sepakat dan bersedia mempekerjakan PIHAK KEDUA sebagai Staff dibidang IT Support untuk jangka waktu 1 (satu) tahun, terhitung sejak tanggal 02 Januari 2026 sampai dengan 31 Desember 2026." },
            { id: "p2", title: "HONORARIUM", content: "Sesuai dengan tugas dan pekerjaan yang dibebankan kepada PIHAK KEDUA, oleh karena itu PIHAK PERTAMA membayar Honor/Upah kepada PIHAK KEDUA sebesar Rp. 10.500.000, (sepuluh juta lima ratus ribu rupiah)." },
            { id: "p3", title: "TUNJANGAN", content: "Bahwa PIHAK PERTAMA akan membayarkan Tunjangan Hari Raya Keagamaan kepada PIHAK KEDUA, sesuai ketentuan yang berlaku diperusahaan." },
            { id: "p4", title: "KEWAJIBAN PIHAK KEDUA", content: "Bahwa PIHAK KEDUA berjanji akan melakukan segala tugas dan kewajiban yang diberikan PIHAK PERTAMA dengan sebaik-baiknya dan penuh rasa tanggungjawab, adapun tugas dan kewajiban sebagai berikut;\n1) Menjaga kerahasiaan PIHAK PERTAMA...\n2) PIHAK KEDUA akan mengerjakan segala bidang...\n3) PIHAK KEDUA akan membuat jadwal maintenance...\n4) Menyediakan lembar Absensi...\n5) Memberikan Laporan perbaikan...\n6) Legalisasi Software...\n7) Inventarisasi Perangkat IT...\n8) Menangani hardware/software/network..." },
            { id: "p5", title: "WAKTU KERJA", content: "PIHAK KEDUA membuat jadwal waktu kerja sebagai acuan, dan apabila pada kondisi libur dan Perusahaan mengalami trouble mengenai IT, maka PIHAK KEDUA wajib datang untuk menyelesaikan troble tersebut.\nSenin-Jumat: 08.00-17.00\nSabtu-Minggu: On Call" },
            { id: "p6", title: "BERAKHIRNYA PERJANJIAN", content: "1) Perjanjian ini akan berakhir dengan sendirinya apabila: Jangka waktu berakhir atau PIHAK KEDUA meninggal dunia.\n2) PIHAK PERTAMA dapat mengakhiri apabila terjadi tindak pidana atau permintaan sendiri." },
            { id: "p7", title: "PESANGON", content: "Dengan berakhirnya perjanjian sebagaimana dimaksud Pasal 6, PIHAK PERTAMA tidak ada kewajiban memberikan pembayaran berupa uang pesangon, uang ganti kerugian dan uang jasa kecuali ada kebijakan lain dari PIHAK PERTAMA." },
            { id: "p8", title: "LAIN-LAIN", content: "1) PIHAK KEDUA tidak akan meminta honor lain diluar kesepakatan.\n2) Perubahan akan dilakukan secara musyawarah." }
        ])
    }

    const removeClause = (id: string) => {
        setClauses(clauses.filter(c => c.id !== id))
    }

    const updateClause = (id: string, field: keyof Clause, value: string) => {
        setClauses(clauses.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Basic Validation
        if (!formData.subject || !formData.startDate || !formData.endDate || !formData.firstPartyName || !formData.secondPartyName) {
            alert("Mohon lengkapi data wajib: Subjek, Tanggal, dan Nama Pihak.")
            return
        }

        setLoading(true)
        try {
            // Clean empty relation IDs
            const payload = {
                ...formData,
                clauses,
                projectId: formData.projectId || null,
                customerId: formData.customerId || null,
                vendorId: formData.vendorId || null,
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            
            if (res.ok) {
                alert("Kontrak berhasil disimpan!")
                router.push('/dashboard/contracts')
            } else {
                const err = await res.json()
                alert(`Gagal menyimpan: ${err.message || 'Unknown error'}`)
            }
        } catch (e: any) { 
            console.error(e) 
            alert(`Error koneksi: ${e.message}`)
        }
        finally { setLoading(false) }
    }

    return (
        <div className="px-8 py-10 space-y-10 w-full font-inter bg-slate-50/30 min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/contracts" className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-105">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Buat Kontrak Baru</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                            <Layout size={12} className="text-indigo-500" /> Professional Agreement Template
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={loadSPKTemplate}
                        className="flex items-center gap-3 px-6 py-4 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-slate-100 shadow-sm"
                    >
                        <FilePlus size={16} className="text-indigo-600" />
                        Gunakan Template SPK Parwanto
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Simpan Kontrak
                    </button>
                </div>
            </header>

            <form className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Content - Clauses */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Parties Section */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-10 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <User size={20} />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pihak-Pihak Terkait</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* PIHAK PERTAMA */}
                            <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-dashed border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Pihak Pertama</h3>
                                    <Building2 size={16} className="text-slate-300" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 capitalize">Nama Lengkap</label>
                                        <input 
                                            value={formData.firstPartyName}
                                            onChange={(e) => setFormData({...formData, firstPartyName: e.target.value})}
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 capitalize">Jabatan & Instansi</label>
                                        <input 
                                            value={formData.firstPartyTitle}
                                            onChange={(e) => setFormData({...formData, firstPartyTitle: e.target.value})}
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PIHAK KEDUA */}
                            <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-dashed border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Pihak Kedua</h3>
                                    <User size={16} className="text-slate-300" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 capitalize">Nama Lengkap</label>
                                        <input 
                                            value={formData.secondPartyName}
                                            placeholder="Contoh: Parwanto"
                                            onChange={(e) => setFormData({...formData, secondPartyName: e.target.value})}
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 capitalize">Jabatan / Domisili</label>
                                        <input 
                                            value={formData.secondPartyTitle}
                                            placeholder="Contoh: Staff IT / Cibitung"
                                            onChange={(e) => setFormData({...formData, secondPartyTitle: e.target.value})}
                                            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Clauses / Pasal */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                    <FileText size={20} />
                                </div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Detail Pasal & Ketentuan</h2>
                            </div>
                            <button 
                                type="button"
                                onClick={addClause}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
                            >
                                <Plus size={14} /> Tambah Pasal
                            </button>
                        </div>

                        <div className="space-y-6">
                            {clauses.map((clause, index) => (
                                <motion.div 
                                    layout
                                    key={clause.id} 
                                    className="p-8 rounded-3xl border border-slate-100 hover:border-indigo-100 bg-slate-50/20 space-y-4 group relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">{index + 1}</span>
                                            <input 
                                                value={clause.title}
                                                onChange={(e) => updateClause(clause.id, 'title', e.target.value)}
                                                className="bg-transparent border-none outline-none text-xs font-black text-slate-900 uppercase tracking-widest w-full focus:text-indigo-600 transition-colors"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeClause(clause.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <textarea 
                                        rows={3}
                                        value={clause.content}
                                        onChange={(e) => updateClause(clause.id, 'content', e.target.value)}
                                        placeholder="Isi ketentuan pasal ini..."
                                        className="w-full bg-white/50 p-6 rounded-2xl border border-slate-100 text-xs font-medium focus:ring-2 ring-indigo-500/10 outline-none resize-none leading-relaxed"
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Config */}
                <aside className="lg:col-span-4 space-y-8">
                    {/* General & Project Mapping */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <Briefcase size={20} />
                            </div>
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Metadata & Project</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Kontrak</label>
                                <select 
                                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                    value={formData.type || "SERVICE"}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="EMPLOYMENT">Internal (Employment)</option>
                                    <option value="SERVICE">Service Agreement</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="RENTAL">Rental</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acuan Project</label>
                                <select 
                                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                    value={formData.projectId || ""}
                                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                                >
                                    <option value="">-- Tanpa Project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>[{p.number}] {p.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pihak Kedua (Bridge)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <select 
                                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold"
                                        value={bridgeType || ""}
                                        onChange={(e) => {
                                            const val = e.target.value as any
                                            setBridgeType(val)
                                            if (val === "") setFormData({ ...formData, customerId: "", vendorId: "" })
                                        }}
                                    >
                                        <option value="">-- Manual/Lainnya --</option>
                                        <option value="CUSTOMER">Customer (Pemasukan)</option>
                                        <option value="VENDOR">Vendor/Karyawan (Biaya/Gaji)</option>
                                    </select>
                                    
                                    {bridgeType === "CUSTOMER" && (
                                        <select 
                                            className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold"
                                            value={formData.customerId || ""}
                                            onChange={(e) => {
                                                const c = customers.find(x => x.id === e.target.value)
                                                setFormData({
                                                    ...formData,
                                                    customerId: e.target.value,
                                                    vendorId: "",
                                                    type: formData.type === 'EMPLOYMENT' ? 'SERVICE' : formData.type,
                                                    secondPartyName: c?.name || formData.secondPartyName,
                                                    secondPartyAddress: c?.address || formData.secondPartyAddress
                                                })
                                            }}
                                        >
                                            <option value="">-- Pilih Customer --</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}

                                    {bridgeType === "VENDOR" && (
                                        <select 
                                            className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold"
                                            value={formData.vendorId || ""}
                                            onChange={(e) => {
                                                const v = vendors.find(x => x.id === e.target.value)
                                                setFormData({
                                                    ...formData,
                                                    vendorId: e.target.value,
                                                    customerId: "",
                                                    secondPartyName: v?.name || formData.secondPartyName,
                                                    secondPartyAddress: v?.address || formData.secondPartyAddress
                                                })
                                            }}
                                        >
                                            <option value="">-- Pilih Vendor/Karyawan --</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    )}

                                    {bridgeType === "" && (
                                        <div className="bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Manual Input</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial & Billing */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-8 text-white">
                        <div className="flex items-center gap-3 border-b border-indigo-500/30 pb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <DollarSign size={20} />
                            </div>
                            <h2 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Nilai & Penagihan</h2>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Besaran Nominal (Bulan)</label>
                                <input 
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                                    className="w-full bg-white/5 border-none px-4 py-4 rounded-2xl text-2xl font-black text-white focus:ring-2 ring-indigo-500/50 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mulai</label>
                                    <input 
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        className="w-full bg-white/10 border-none px-4 py-3 rounded-xl text-xs font-bold text-white focus:ring-2 ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Berakhir</label>
                                    <input 
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                        className="w-full bg-white/10 border-none px-4 py-3 rounded-xl text-xs font-bold text-white focus:ring-2 ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tgl Penagihan (1-31)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.billingDay}
                                        onChange={(e) => setFormData({...formData, billingDay: Number(e.target.value)})}
                                        className="w-full bg-white/10 border-none px-4 py-3 rounded-xl text-xs font-bold text-white focus:ring-2 ring-indigo-500 outline-none"
                                        placeholder="Contoh: 1"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tgl Jth Tempo (1-31)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dueDay}
                                        onChange={(e) => setFormData({...formData, dueDay: Number(e.target.value)})}
                                        className="w-full bg-white/10 border-none px-4 py-3 rounded-xl text-xs font-bold text-white focus:ring-2 ring-indigo-500 outline-none"
                                        placeholder="Contoh: 10"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                                <div>
                                    <p className="text-xs font-black text-white">Auto Billing</p>
                                    <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-tight mt-0.5">Buat Draft Invoice Otomatis</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, autoBilling: !formData.autoBilling})}
                                    className={`w-14 h-7 rounded-full transition-all relative ${formData.autoBilling ? 'bg-indigo-500 shadow-lg shadow-indigo-500/40' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.autoBilling ? 'left-8 shadow-sm' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
        </div>
    )
}
