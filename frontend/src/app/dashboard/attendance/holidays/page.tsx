"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Calendar,
    Plus,
    Search,
    Trash2,
    Save,
    X,
    RefreshCcw,
    CheckCircle2,
    AlertCircle,
    Info,
    CalendarDays,
    UploadCloud,
    Download,
    FileSpreadsheet,
    ChevronRight,
    Filter
} from "lucide-react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function HolidaysPage() {
    const { data: session } = useSession()
    const canEdit = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
    
    const [holidays, setHolidays] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        name: '',
        description: '',
        isNational: true
    })
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

    useEffect(() => {
        fetchHolidays()
    }, [])

    const fetchHolidays = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/hr/holidays`)
            const data = await res.json()
            setHolidays(data || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        setMessage(null)
        try {
            const res = await fetch(`${API_BASE}/hr/holidays/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: new Date().getFullYear() })
            })
            const result = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: `Sync Nasional Berhasil (${result.count} data)` })
                fetchHolidays()
            } else {
                setMessage({ type: 'error', text: result.message || "Gagal sinkronasi otomatis." })
            }
        } catch (e) {
            setMessage({ type: 'error', text: "Server tidak merespon." })
        } finally {
            setIsSyncing(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsSyncing(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                const lines = text.split('\n')
                const items = []
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (!line) continue
                    const [date, name, type] = line.split(',')
                    if (date && name) {
                        items.push({ 
                            date: date.trim(), 
                            name: name.trim(), 
                            isNational: type?.trim().toLowerCase() !== 'false' 
                        })
                    }
                }
                const res = await fetch(`${API_BASE}/hr/holidays/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                })
                if (res.ok) {
                    setMessage({ type: 'success', text: "Import CSV Berhasil" })
                    fetchHolidays()
                    setIsImporting(false)
                }
            } catch (err: any) {
                setMessage({ type: 'error', text: "Format file tidak didukung." })
            } finally {
                setIsSyncing(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }
        reader.readAsText(file)
    }

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,date,name,isNational\n2026-01-01,Tahun Baru Masehi,true"
        const link = document.createElement("a")
        link.setAttribute("href", encodeURI(csvContent))
        link.setAttribute("download", "template_hari_libur.csv")
        link.click()
    }

    const handleSave = async () => {
        if (!formData.name) return alert("Nama wajib diisi")
        try {
            const res = await fetch(`${API_BASE}/hr/holidays`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                setIsAdding(false)
                setFormData({ date: new Date().toISOString().split('T')[0], name: '', description: '', isNational: true })
                fetchHolidays()
            }
        } catch (e) { console.error(e) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus?")) return
        await fetch(`${API_BASE}/hr/holidays/${id}`, { method: 'DELETE' })
        fetchHolidays()
    }

    // --- SORTING & GROUPING LOGIC ---
    const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const filteredHolidays = sortedHolidays.filter(h => 
        h.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groupedHolidays: { monthYear: string, items: any[] }[] = []
    filteredHolidays.forEach(h => {
        const date = new Date(h.date)
        const monthYear = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        const lastGroup = groupedHolidays[groupedHolidays.length - 1]
        
        if (lastGroup && lastGroup.monthYear === monthYear) {
            lastGroup.items.push(h)
        } else {
            groupedHolidays.push({ monthYear, items: [h] })
        }
    })

    return (
        <div className="p-4 md:p-8 space-y-6 bg-slate-50/30 min-h-screen pb-20">
            {/* Minimalist Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                        <Calendar className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">HARI LIBUR</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Calendar Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                    {canEdit && (
                        <>
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                disabled={isSyncing}
                                onClick={handleSync}
                                className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 disabled:opacity-50 shrink-0"
                                title="Sync Nasional"
                            >
                                <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
                            </motion.button>
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsImporting(true)}
                                className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0"
                                title="Import CSV"
                            >
                                <UploadCloud size={16} />
                            </motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all shrink-0 whitespace-nowrap"
                            >
                                <Plus size={14} />
                                Tambah
                            </motion.button>
                        </>
                    )}
                </div>
            </div>

            {/* Alert Message */}
            <AnimatePresence>
                {message && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`p-4 rounded-xl flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-tight ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                    >
                        <div className="flex items-center gap-3">
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                        <button onClick={() => setMessage(null)}><X size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact Search */}
            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" size={16} />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all text-slate-800 placeholder:text-slate-300"
                    placeholder="Cari hari libur..."
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Form Sidebar - Compact */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-6 sticky top-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={16} className="text-rose-600" />
                                    Input Libur
                                </h2>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama</label>
                                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tanggal</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipe</label>
                                    <div className="flex gap-2">
                                        {['Nasional', 'Internal'].map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setFormData({...formData, isNational: type === 'Nasional'})}
                                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${((type === 'Nasional') === formData.isNational) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <motion.button 
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSave}
                                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700"
                            >
                                Simpan Data
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* List Content - Minimalist Table Rows */}
                <div className={`${isAdding ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-8`}>
                    {loading ? (
                        <div className="py-20 text-center opacity-30"><RefreshCcw className="mx-auto animate-spin" /></div>
                    ) : groupedHolidays.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tidak ada data ditemukan</p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {groupedHolidays.map((group) => (
                                <div key={group.monthYear} className="space-y-3">
                                    <div className="flex items-center gap-4 px-2">
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">{group.monthYear}</h3>
                                        <div className="h-[1px] w-full bg-slate-100" />
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                                        {group.items.map((h) => (
                                            <div key={h.id} className="group flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/50 transition-all gap-4">
                                                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                                                    {/* Compact Date Box */}
                                                    <div className="flex flex-col items-center justify-center min-w-[45px] py-1 border-r border-slate-100 pr-4 sm:pr-5 shrink-0">
                                                        <span className="text-lg font-black text-slate-900 leading-none">{new Date(h.date).getDate()}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(h.date).toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                                                    </div>
                                                    {/* Content */}
                                                    <div className="space-y-1 flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-700 group-hover:text-rose-600 transition-colors uppercase tracking-tight break-words line-clamp-2 md:line-clamp-none">{h.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                           <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.isNational ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{h.isNational ? 'Libur Nasional' : 'Libur Internal'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {canEdit && (
                                                    <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                                                        <button onClick={() => handleDelete(h.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Compact Import Modal */}
            <AnimatePresence>
                {isImporting && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImporting(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative p-8 text-center"
                        >
                            <FileSpreadsheet className="mx-auto text-slate-200 mb-6" size={48} />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Import CSV</h3>
                            <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed mb-8">Format: date (YYYY-MM-DD), name, isNational</p>
                            
                            <div className="space-y-3">
                                <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleFileUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                                    <UploadCloud size={16} /> Pilih File
                                </button>
                                <button onClick={downloadTemplate} className="w-full py-3 text-slate-400 text-[9px] font-black uppercase hover:text-slate-600">Download Template</button>
                            </div>
                            <button onClick={() => setIsImporting(false)} className="absolute top-4 right-4 p-2 text-slate-200 hover:text-slate-400"><X size={20} /></button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
