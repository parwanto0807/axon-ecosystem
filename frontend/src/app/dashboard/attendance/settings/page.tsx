"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    MapPin, 
    Plus, 
    Search, 
    Edit2, 
    Trash2, 
    Save, 
    X,
    Navigation,
    LocateFixed,
    Settings2,
    CheckCircle2,
    Clock,
    ChevronDown,
    Filter,
    ArrowRight,
    ExternalLink,
    AlertCircle
} from "lucide-react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

// Component for Map Preview
function MapPreview({ lat, lon, zoom = 15, className = "" }: { lat: number, lon: number, zoom?: number, className?: string }) {
    if (!lat || !lon) return (
        <div className={`bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 ${className}`}>
            <MapPin size={24} className="opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Koordinat Kosong</p>
        </div>
    )

    // Using ll for center and q for marker
    const mapUrl = `https://maps.google.com/maps?ll=${lat},${lon}&q=${lat},${lon}&hl=id&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`

    return (
        <div className={`overflow-hidden relative ${className}`}>
            <iframe
                key={`${lat}-${lon}`} // Force reload on coordinate change
                title="Map Preview"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapUrl}
                className="grayscale-[0.2] contrast-[1.1]"
            />
            {/* Overlay Gradient to match premium feel */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-slate-900/5 shadow-inner" />
        </div>
    )
}

export default function AttendanceSettingsPage() {
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: 100,
        isActive: true
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDetail, setSelectedDetail] = useState<any>(null)

    useEffect(() => {
        fetchLocations()
    }, [])

    const fetchLocations = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/hr/attendance-locations`)
            const data = await res.json()
            setLocations(data)
        } catch (e) {
            console.error("Failed to fetch locations", e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        // Validation
        const lat = parseFloat(formData.latitude.toString().replace(',', '.'))
        const lon = parseFloat(formData.longitude.toString().replace(',', '.'))

        if (isNaN(lat) || isNaN(lon)) {
            alert("Koordinat tidak valid. Harap gunakan angka desimal (titik/koma).")
            return
        }

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            alert("Koordinat di luar jangkauan valid Bumi (Lat: -90 s/d 90, Lon: -180 s/d 180)")
            return
        }

        try {
            const url = editingId 
                ? `${API_BASE}/hr/attendance-locations/${editingId}`
                : `${API_BASE}/hr/attendance-locations`
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    latitude: lat,
                    longitude: lon
                })
            })

            if (res.ok) {
                setIsAdding(false)
                setEditingId(null)
                setFormData({ name: '', address: '', latitude: '', longitude: '', radius: 100, isActive: true })
                fetchLocations()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus lokasi ini?")) return
        try {
            const res = await fetch(`${API_BASE}/hr/attendance-locations/${id}`, { method: 'DELETE' })
            if (res.ok) fetchLocations()
        } catch (e) {
            console.error(e)
        }
    }

    const getCurrentPosition = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            setFormData({
                ...formData,
                latitude: pos.coords.latitude.toString(),
                longitude: pos.coords.longitude.toString()
            })
        }, (err) => {
            alert("Gagal mendapatkan lokasi: " + err.message)
        }, { enableHighAccuracy: true })
    }

    const filteredLocations = locations.filter(loc => 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-4 md:p-10 space-y-10 bg-slate-50/50 min-h-screen pb-24">
            {/* Header - Native App Feel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                            <MapPin className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">SETTING LOKASI</h1>
                            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Geofencing & Accuracy Master Control</p>
                        </div>
                    </div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setIsAdding(true)
                        setEditingId(null)
                        setFormData({ name: '', address: '', latitude: '', longitude: '', radius: 100, isActive: true })
                    }}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[1.75rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 transition-all border-b-4 border-indigo-800"
                >
                    <Plus size={18} />
                    Tambah Cabang Baru
                </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Form Sidebar - Enhanced Card Design */}
                <AnimatePresence>
                    {(isAdding || editingId) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="lg:col-span-12 xl:col-span-5 rounded-[2.5rem] bg-white border-4 border-indigo-50 shadow-2xl overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-8 flex items-center justify-between text-white">
                                <div className="flex items-center gap-4">
                                    <Settings2 size={24} />
                                    <h2 className="font-black text-lg uppercase tracking-widest">{editingId ? "Ubah Lokasi" : "Daftarkan Site"}</h2>
                                </div>
                                <button 
                                    onClick={() => { setIsAdding(false); setEditingId(null); }} 
                                    className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Map Preview in Form */}
                            <MapPreview 
                                lat={parseFloat(formData.latitude.toString().replace(',','.')) || 0} 
                                lon={parseFloat(formData.longitude.toString().replace(',','.')) || 0} 
                                className="h-48 md:h-64 border-b border-slate-100"
                            />

                            <div className="p-8 space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identitas Lokasi</label>
                                        <input 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] text-sm font-black focus:outline-none focus:border-indigo-500 transition-all text-slate-800"
                                            placeholder="Nama Kantor / Branch / Warehouse"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Alamat</label>
                                        <textarea 
                                            value={formData.address}
                                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] text-sm font-black focus:outline-none focus:border-indigo-500 transition-all min-h-[80px] text-slate-800"
                                            placeholder="Alamat Detail Lengkap..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">G-Latitude</label>
                                            <input 
                                                value={formData.latitude}
                                                onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] text-xs font-black focus:outline-none focus:border-indigo-500 transition-all text-slate-800"
                                                placeholder="-6.12345"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">G-Longitude</label>
                                            <input 
                                                value={formData.longitude}
                                                onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] text-xs font-black focus:outline-none focus:border-indigo-500 transition-all text-slate-800"
                                                placeholder="106.12345"
                                            />
                                        </div>
                                    </div>
                                    <motion.button 
                                        type="button"
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={getCurrentPosition}
                                        className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-[1.25rem] border-2 border-emerald-100 font-black text-[11px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-3"
                                    >
                                        <LocateFixed size={18} />
                                        Ambil Titik Koordinat GPS Saya
                                    </motion.button>

                                    <div className="bg-slate-50 p-6 rounded-[1.75rem] border border-slate-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Radius Geofencing</label>
                                            <span className="text-sm font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">{formData.radius} Meter</span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="50"
                                            max="1000"
                                            step="10"
                                            value={formData.radius}
                                            onChange={(e) => setFormData({...formData, radius: parseInt(e.target.value)})}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 uppercase italic">Karyawan hanya dapat absen jika berada dalam jangkauan meter ini.</p>
                                    </div>
                                </div>

                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSave}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4"
                                >
                                    <Save size={20} />
                                    Konfirmasi & Simpan
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* List Section - Responsive Grid */}
                <div className={`${(isAdding || editingId) ? 'lg:col-span-12 xl:col-span-7' : 'lg:col-span-12'} space-y-8`}>
                    {/* Search & Statistics */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 w-full relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-sm font-black focus:outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800"
                                placeholder="Cari Nama Site / Lokasi Project..."
                            />
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem] border border-indigo-100 font-black text-[10px] uppercase tracking-widest whitespace-nowrap">
                                <Navigation size={18} />
                                {filteredLocations.length} Titik Site
                            </div>
                            <button className="p-5 bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-[1.5rem] transition-all">
                                <Filter size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                        {loading ? (
                            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                                <Clock className="mx-auto text-indigo-200 animate-spin mb-6" size={60} />
                                <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Memvalidasi Data Geofence...</p>
                            </div>
                        ) : filteredLocations.length === 0 ? (
                            <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-8 border border-slate-100">
                                    <MapPin className="text-slate-200" size={48} />
                                </div>
                                <h3 className="text-lg font-black text-slate-700 uppercase mb-2 tracking-tight">Belum Ada Lokasi</h3>
                                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Silakan tambahkan lokasi kantor atau site proyek Anda.</p>
                            </div>
                        ) : filteredLocations.map((loc) => (
                            <motion.div 
                                layout
                                key={loc.id}
                                className={`bg-white rounded-[2.5rem] border border-slate-100 shadow-xl relative group overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 ${editingId === loc.id ? 'ring-4 ring-indigo-500 shadow-indigo-200' : ''}`}
                            >
                                {/* Mini Map Preview */}
                                <MapPreview 
                                    lat={loc.latitude} 
                                    lon={loc.longitude} 
                                    zoom={14}
                                    className="h-44 group-hover:h-48 transition-all duration-500 grayscale group-hover:grayscale-0 opacity-40 group-hover:opacity-100"
                                />

                                <div className="p-8 space-y-6 relative">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 uppercase text-lg leading-tight group-hover:text-indigo-600 transition-colors">{loc.name}</h3>
                                                {loc.isActive && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Aktif
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Navigation size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch ID: {loc.id.slice(-6)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingId(loc.id)
                                                    setIsAdding(true)
                                                    setFormData({
                                                        name: loc.name,
                                                        address: loc.address || '',
                                                        latitude: loc.latitude.toString(),
                                                        longitude: loc.longitude.toString(),
                                                        radius: loc.radius,
                                                        isActive: loc.isActive
                                                    })
                                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                                }}
                                                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(loc.id)}
                                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50/50 rounded-[1.75rem] border border-slate-100/50 group-hover:bg-white transition-all">
                                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic line-clamp-2">
                                            {loc.address || "Belum ada deskripsi alamat detail."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Koordinat</p>
                                            <p className="text-[11px] font-black text-slate-800">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</p>
                                        </div>
                                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 flex flex-col gap-1">
                                            <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em]">G-Radius</p>
                                            <p className="text-[11px] font-black text-white">{loc.radius} METER</p>
                                        </div>
                                    </div>

                                    <motion.button 
                                        onClick={() => setSelectedDetail(loc)}
                                        className="w-full py-4 mt-2 bg-slate-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all group/btn"
                                    >
                                        Detail Master Site
                                        <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedDetail && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDetail(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
                        >
                            <div className="lg:w-3/5 h-[40vh] lg:h-auto relative">
                                <MapPreview 
                                    lat={selectedDetail.latitude} 
                                    lon={selectedDetail.longitude} 
                                    zoom={16} 
                                    className="h-full"
                                />
                                <div className="absolute top-8 left-8 flex flex-col gap-2">
                                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-xl border border-white/20">
                                        <p className="text-[8px] font-black uppercase text-slate-400">Live coordinates</p>
                                        <p className="text-[10px] font-black text-slate-800">{selectedDetail.latitude.toFixed(6)}, {selectedDetail.longitude.toFixed(6)}</p>
                                    </div>
                                    <div className="bg-indigo-600 px-4 py-2 rounded-xl shadow-xl border border-indigo-400 text-white">
                                        <p className="text-[8px] font-black uppercase text-white/60">Geo-Radius</p>
                                        <p className="text-[10px] font-black">{selectedDetail.radius} Meters</p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-2/5 p-8 md:p-12 flex flex-col bg-slate-50/50">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedDetail.name}</h2>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Master Authorization Site</p>
                                    </div>
                                    <button onClick={() => setSelectedDetail(null)} className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-sm transition-all border border-slate-100 text-slate-400">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Navigation size={14} />
                                            Alamat Site
                                        </h4>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                            {selectedDetail.address || "Tidak ada keterangan alamat detail."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status Izin</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-black text-emerald-600">AUTHORIZED</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Staff</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-800">UNLIMITED</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
                                            Perubahan titik koordinat atau radius akan langsung mempengaruhi keakuratan absensi seluruh staf yang bertugas di lokasi ini.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col gap-3">
                                    <a 
                                        href={`https://www.google.com/maps?q=${selectedDetail.latitude},${selectedDetail.longitude}`}
                                        target="_blank"
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl"
                                    >
                                        <ExternalLink size={16} />
                                        Buka di Google Maps
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
