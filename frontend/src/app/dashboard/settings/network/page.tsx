"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Cpu, 
    Plus, 
    Search, 
    Edit2, 
    Trash2, 
    Save, 
    X,
    Activity,
    ShieldCheck,
    Globe,
    Zap,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function NetworkSettingsPage() {
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [testingId, setTestingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        port: 8728,
        username: '',
        password: '',
        isActive: true
    })
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchDevices()
    }, [])

    const fetchDevices = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/infrastructure/mikrotik`)
            if (res.ok) {
                const data = await res.json()
                setDevices(data)
            }
        } catch (e) {
            console.error("Failed to fetch devices", e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const url = editingId 
                ? `${API_BASE}/infrastructure/mikrotik/${editingId}`
                : `${API_BASE}/infrastructure/mikrotik`
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setIsAdding(false)
                setEditingId(null)
                setFormData({ name: '', ip: '', port: 8728, username: '', password: '', isActive: true })
                fetchDevices()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus perangkat MikroTik ini?")) return
        try {
            const res = await fetch(`${API_BASE}/infrastructure/mikrotik/${id}`, { method: 'DELETE' })
            if (res.ok) fetchDevices()
        } catch (e) {
            console.error(e)
        }
    }

    const testConnection = async (id: string) => {
        setTestingId(id)
        try {
            const res = await fetch(`${API_BASE}/infrastructure/mikrotik/${id}/test`, { method: 'POST' })
            const data = await res.json()
            
            if (res.ok) {
                alert("SUKSES: Koneksi berhasil terhubung ke MikroTik!")
            } else {
                alert(`KONEKSI GAGAL: ${data.error || 'Terjadi kesalahan tidak dikenal'}`)
            }
        } catch (e) {
            console.error(e)
            alert("KESALAHAN: Tidak dapat menghubungi server backend.")
        } finally {
            setTestingId(null)
            fetchDevices() // Refresh to show logs if needed
        }
    }

    const filteredDevices = devices.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ip.includes(searchQuery)
    )

    return (
        <div className="p-4 md:p-10 space-y-10 bg-slate-50/50 min-h-screen pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                        <Cpu className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">PENGATURAN JARINGAN</h1>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">MikroTik RouterOS v6/v7 Infrastructure Management</p>
                    </div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        setFormData({ name: '', ip: '', port: 8728, username: '', password: '', isActive: true })
                    }}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[1.75rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 transition-all border-b-4 border-indigo-800"
                >
                    <Plus size={18} />
                    Tambah Perangkat
                </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Search & List */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan nama atau IP Router..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/50 focus:outline-none focus:border-indigo-600/30 text-sm font-bold placeholder:text-slate-300 transition-all"
                        />
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                            <Loader2 size={40} className="animate-spin text-indigo-600" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghubungkan ke pusat data...</p>
                        </div>
                    ) : filteredDevices.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic text-slate-400">
                            <Globe size={64} strokeWidth={1} className="opacity-10" />
                            <p className="text-sm font-bold">Belum ada perangkat MikroTik yang terdaftar.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredDevices.map((device) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={device.id}
                                    className="p-6 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-indigo-600/20 transition-all flex flex-col gap-6"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Zap size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 uppercase tracking-tight">{device.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{device.ip}:{device.port}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${device.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {device.isActive ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-50">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</p>
                                            <p className="text-xs font-bold text-slate-700">{device.username}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Added On</p>
                                            <p className="text-xs font-bold text-slate-700">{format(new Date(device.createdAt), 'dd MMM yyyy')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => testConnection(device.id)}
                                            disabled={testingId === device.id}
                                            className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            {testingId === device.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            {testingId === device.id ? 'TESTING...' : 'TEST KONEKSI'}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingId(device.id)
                                                setFormData(device)
                                                setIsAdding(true)
                                            }}
                                            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(device.id)}
                                            className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Form Overlay */}
                <AnimatePresence>
                    {isAdding && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsAdding(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                                            <Plus className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingId ? 'Edit Perangkat' : 'Tambah MikroTik Baru'}</h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Konfigurasi Akses API RouterOS</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8 overflow-y-auto space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nama Perangkat</label>
                                            <input 
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-600/30 focus:bg-white outline-none font-bold text-sm transition-all"
                                                placeholder="Contoh: Router Kantor Pusat"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">IP Address / Host</label>
                                            <input 
                                                value={formData.ip}
                                                onChange={(e) => setFormData({...formData, ip: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-600/30 focus:bg-white outline-none font-bold text-sm transition-all text-indigo-600"
                                                placeholder="192.168.88.1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Port API (v6/v7)</label>
                                            <input 
                                                type="number"
                                                value={formData.port}
                                                onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-600/30 focus:bg-white outline-none font-bold text-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Username Admin</label>
                                            <input 
                                                value={formData.username}
                                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-600/30 focus:bg-white outline-none font-bold text-sm transition-all"
                                                placeholder="admin"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Password</label>
                                            <input 
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-indigo-600/30 focus:bg-white outline-none font-bold text-sm transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50 flex items-center justify-end gap-4">
                                    <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Batal</button>
                                    <button 
                                        onClick={handleSave}
                                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-3"
                                    >
                                        <Save size={16} />
                                        Simpan Perangkat
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
