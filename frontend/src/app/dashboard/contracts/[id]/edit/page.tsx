"use client"

import { useState, useEffect, use } from "react"
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

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
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

    const [clauses, setClauses] = useState<Clause[]>([])

    useEffect(() => {
        const fetchData = async () => {
            setFetching(true)
            try {
                const [p, c, v, contract] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`).then(r => r.json()),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`).then(r => r.json()),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vendors`).then(r => r.json()),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${id}`).then(r => r.json())
                ])
                setProjects(p)
                setCustomers(c)
                setVendors(v)
                
                if (contract) {
                    setFormData({
                        ...contract,
                        startDate: contract.startDate?.split('T')[0] || "",
                        endDate: contract.endDate?.split('T')[0] || "",
                        customerId: contract.customerId || "",
                        vendorId: contract.vendorId || "",
                        projectId: contract.projectId || ""
                    })
                    setClauses(contract.clauses || [])
                    if (contract.customerId) setBridgeType("CUSTOMER")
                    else if (contract.vendorId) setBridgeType("VENDOR")
                }
            } catch (e) { 
                console.error(e) 
                alert("Gagal memuat data")
            } finally {
                setFetching(false)
            }
        }
        fetchData()
    }, [id])

    const addClause = () => {
        const newClause = { id: Date.now().toString(), title: `PASAL ${clauses.length + 1}`, content: "" }
        setClauses([...clauses, newClause])
    }

    const removeClause = (id: string) => {
        setClauses(clauses.filter(c => c.id !== id))
    }

    const updateClause = (id: string, field: keyof Clause, value: string) => {
        setClauses(clauses.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.subject || !formData.startDate || !formData.endDate || !formData.firstPartyName || !formData.secondPartyName) {
            alert("Mohon lengkapi data wajib: Subjek, Tanggal, dan Nama Pihak.")
            return
        }

        setLoading(true)
        try {
            const payload = {
                ...formData,
                clauses,
                projectId: formData.projectId || null,
                customerId: formData.customerId || null,
                vendorId: formData.vendorId || null,
                amount: Number(formData.amount)
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contracts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            
            if (res.ok) {
                alert("Kontrak berhasil diperbarui!")
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

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="animate-spin text-indigo-600" size={32} />
            </div>
        )
    }

    return (
        <div className="px-8 py-10 space-y-10 w-full font-inter bg-slate-50/30 min-h-screen">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/contracts" className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all hover:scale-105">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Edit Kontrak</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                            <Edit2 size={12} className="text-indigo-500" /> {formData.number}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Simpan Perubahan
                    </button>
                </div>
            </header>

            <form className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <User size={20} />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pihak-Pihak Terkait</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-dashed border-slate-200">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Pihak Pertama</h3>
                                <div className="space-y-4">
                                    <input value={formData.firstPartyName} onChange={e => setFormData({...formData, firstPartyName: e.target.value})} className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold" />
                                    <input value={formData.firstPartyTitle} onChange={e => setFormData({...formData, firstPartyTitle: e.target.value})} className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold" />
                                </div>
                            </div>
                            <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-dashed border-slate-200">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Pihak Kedua</h3>
                                <div className="space-y-4">
                                    <input value={formData.secondPartyName} onChange={e => setFormData({...formData, secondPartyName: e.target.value})} className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold" />
                                    <input value={formData.secondPartyTitle} onChange={e => setFormData({...formData, secondPartyTitle: e.target.value})} className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pasal & Ketentuan</h2>
                            <button type="button" onClick={addClause} className="px-4 py-2 bg-slate-50 text-[10px] font-black rounded-lg hover:bg-slate-100 transition-all">+ Tambah Pasal</button>
                        </div>
                        <div className="space-y-6">
                            {clauses.map((clause, index) => (
                                <div key={clause.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <input value={clause.title} onChange={e => updateClause(clause.id, 'title', e.target.value)} className="bg-transparent font-black text-xs uppercase text-slate-900" />
                                        <button type="button" onClick={() => removeClause(clause.id)} className="text-rose-500"><Trash2 size={16} /></button>
                                    </div>
                                    <textarea value={clause.content} onChange={e => updateClause(clause.id, 'content', e.target.value)} className="w-full p-4 rounded-xl border border-slate-50 text-xs min-h-[100px] bg-white" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
                        <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Detail & Relasi</h2>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400">Subjek Kontrak</label>
                                <input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400">Tipe</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold">
                                    <option value="EMPLOYMENT">Internal (Employment)</option>
                                    <option value="SERVICE">Service Agreement</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="RENTAL">Rental</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Pihak Kedua (Bridge)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <select 
                                        className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-bold"
                                        value={bridgeType}
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

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Acuan Project</label>
                                <select 
                                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-xs font-black focus:ring-2 ring-indigo-500/10 outline-none"
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                                >
                                    <option value="">-- Tanpa Project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>[{p.number}] {p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-8 text-white">
                        <div className="flex items-center gap-3 border-b border-indigo-500/30 pb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <DollarSign size={20} />
                            </div>
                            <h2 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Nilai & Penagihan</h2>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Besaran Nominal (Bulan)</label>
                                <input 
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                                    className="w-full bg-white/5 border-none px-4 py-4 rounded-2xl text-2xl font-black text-white outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400">Mulai</label>
                                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/10 px-4 py-3 rounded-xl text-xs font-bold text-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-400">Berakhir</label>
                                    <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/10 px-4 py-3 rounded-xl text-xs font-bold text-white" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                                <div>
                                    <p className="text-xs font-black text-white">Auto Billing</p>
                                    <p className="text-[10px] text-indigo-400/60 uppercase">Draft Invoice Otomatis</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, autoBilling: !formData.autoBilling})}
                                    className={`w-14 h-7 rounded-full transition-all relative ${formData.autoBilling ? 'bg-indigo-500 shadow-lg shadow-indigo-500/40' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.autoBilling ? 'left-8' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
        </div>
    )
}
