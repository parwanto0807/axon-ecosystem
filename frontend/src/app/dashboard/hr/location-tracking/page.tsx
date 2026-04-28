"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
    MapPin, Users, RefreshCw, Clock, AlertCircle,
    CheckCircle2, WifiOff, Radar, Calendar,
    ChevronRight, X, Navigation, User, Info, History
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

// Dynamically import map to avoid SSR issues with Leaflet
const LiveMap = dynamic(() => import("./LiveMap"), { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-3xl">
        <div className="text-center space-y-3">
            <Radar className="mx-auto text-indigo-300 animate-pulse" size={48} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Peta...</p>
        </div>
    </div>
)})

type Employee = {
    id: string
    name: string
    position: string | null
    department: string | null
    pingRequested: boolean
    pingRequestedAt: string | null
    schedule: { startTime: string; endTime: string } | null
    latestPing: {
        latitude: number
        longitude: number
        accuracy: number | null
        notes: string | null
        isManual: boolean
        reportedAt: string
    } | null
}

type PingHistory = {
    id: string
    latitude: number
    longitude: number
    accuracy: number | null
    isManual: boolean
    reportedAt: string
}

function getStatus(emp: Employee): 'online' | 'late' | 'offline' | 'no-schedule' {
    if (!emp.schedule) return 'no-schedule'
    if (!emp.latestPing) return 'offline'
    const diffMs = Date.now() - new Date(emp.latestPing.reportedAt).getTime()
    const diffMin = diffMs / 60000
    if (diffMin <= 35) return 'online'
    if (diffMin <= 90) return 'late'
    return 'offline'
}

const statusConfig = {
    online:       { label: 'Terdeteksi',   color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
    late:         { label: 'Terlambat',    color: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-400' },
    offline:      { label: 'Tidak Aktif',  color: 'bg-rose-500',    text: 'text-rose-600',    bg: 'bg-rose-50',    dot: 'bg-rose-400' },
    'no-schedule':{ label: 'Tdk Terjadwal',color: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-50',   dot: 'bg-slate-300' }
}

function timeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Baru saja'
    if (diffMin < 60) return `${diffMin} menit lalu`
    const diffH = Math.floor(diffMin / 60)
    return `${diffH} jam lalu`
}

export default function LocationTrackingPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const userRole = (session?.user as any)?.role

    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [pingLoading, setPingLoading] = useState<string | null>(null)
    const [countdown, setCountdown] = useState(300) // 5 min auto-refresh
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')
    const [history, setHistory] = useState<PingHistory[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)
    const refreshRef = useRef<NodeJS.Timeout | null>(null)
    const pingPollRef = useRef<NodeJS.Timeout | null>(null)

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL']

    // Guard: redirect if not authorized
    useEffect(() => {
        if (session && !allowedRoles.includes(userRole)) {
            router.replace('/dashboard')
        }
    }, [session, userRole, router])

    const fetchData = useCallback(async () => {
        if (!session || !allowedRoles.includes(userRole)) return
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/location-tracking?date=${date}`, {
                headers: { 
                    'x-user-role': (session?.user as any)?.role || 'SUPER_ADMIN',
                    'x-user-dept': (session?.user as any)?.department || 'IT',
                    'x-user-name': session?.user?.name || 'Admin'
                }
            })
            const data = await res.json()
            setEmployees(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [session, userRole, date])

    const fetchHistory = useCallback(async (empId: string) => {
        setHistoryLoading(true)
        try {
            const res = await fetch(`${API_BASE}/location-tracking/history/${empId}?date=${date}`, {
                headers: { 
                    'x-user-role': (session?.user as any)?.role || 'SUPER_ADMIN',
                    'x-user-dept': (session?.user as any)?.department || 'IT',
                    'x-user-name': session?.user?.name || 'Admin'
                }
            })
            const data = await res.json()
            setHistory(data)
        } catch (e) {
            console.error(e)
        } finally {
            setHistoryLoading(false)
        }
    }, [date])

    // Fetch history when employee selected
    useEffect(() => {
        if (selectedId) {
            fetchHistory(selectedId)
        } else {
            setHistory([])
            setActiveTab('info')
        }
    }, [selectedId, fetchHistory])

    // Initial load + auto-refresh every 5 minutes
    useEffect(() => {
        fetchData()

        setCountdown(300)
        if (countdownRef.current) clearInterval(countdownRef.current)
        if (refreshRef.current) clearInterval(refreshRef.current)

        countdownRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) { fetchData(); return 300 }
                return c - 1
            })
        }, 1000)

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current)
            if (refreshRef.current) clearInterval(refreshRef.current)
        }
    }, [fetchData])

    const handleManualPing = async (empId: string) => {
        setPingLoading(empId)
        try {
            await fetch(`${API_BASE}/location-tracking/request-ping/${empId}`, {
                method: 'PATCH',
                headers: { 
                    'x-user-role': (session?.user as any)?.role || 'SUPER_ADMIN',
                    'x-user-dept': (session?.user as any)?.department || 'IT',
                    'x-user-name': session?.user?.name || 'Admin'
                }
            })
            // Optimistic update
            setEmployees(prev => prev.map(e =>
                e.id === empId ? { ...e, pingRequested: true, pingRequestedAt: new Date().toISOString() } : e
            ))
            
            // Start polling during ping wait
            if (pingPollRef.current) clearInterval(pingPollRef.current)
            pingPollRef.current = setInterval(() => fetchData(), 20000)
            
            setTimeout(() => {
                if (pingPollRef.current) clearInterval(pingPollRef.current)
                fetchData()
            }, 210000) 
        } catch (e) {
            console.error(e)
        } finally {
            setPingLoading(null)
        }
    }

    // Stop polling if no pending requests
    useEffect(() => {
        const hasPending = employees.some(e => e.pingRequested)
        if (!hasPending && pingPollRef.current) {
            clearInterval(pingPollRef.current)
            pingPollRef.current = null
        }
    }, [employees])

    const selectedEmp = employees.find(e => e.id === selectedId)
    const onlineCount = employees.filter(e => getStatus(e) === 'online').length
    const offlineCount = employees.filter(e => getStatus(e) === 'offline').length
    const mappableEmployees = employees.filter(e => e.latestPing)

    if (!session || !allowedRoles.includes(userRole)) return null

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <MapPin className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-800 uppercase tracking-tight">Live Location Tracking</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hanya jam kerja aktif · Multi-Role Access</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase">{onlineCount} Online</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-rose-400" />
                            <span className="text-[10px] font-black text-rose-600 uppercase">{offlineCount} Offline</span>
                        </div>
                    </div>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                        onClick={() => { fetchData(); setCountdown(300) }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                        <span className="text-indigo-300">({Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2,'0')})</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{employees.length} Karyawan Aktif</p>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-0.5 p-2">
                        {loading ? Array.from({length: 5}).map((_, i) => (
                            <div key={i} className="p-3 rounded-2xl animate-pulse bg-slate-50 h-16" />
                        )) : employees.map(emp => {
                            const status = getStatus(emp)
                            const cfg = statusConfig[status]
                            const isSelected = selectedId === emp.id
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedId(isSelected ? null : emp.id)}
                                    className={`p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-transparent hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {emp.name[0]}
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isSelected ? 'border-indigo-600' : 'border-white'} ${cfg.dot}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{emp.name}</p>
                                            <p className={`text-[9px] font-bold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {emp.latestPing ? timeAgo(emp.latestPing.reportedAt) : cfg.label}
                                            </p>
                                        </div>
                                        {emp.pingRequested && <Radar size={12} className={`animate-pulse shrink-0 ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`} />}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden">
                    <LiveMap employees={mappableEmployees} selectedId={selectedId} onSelect={setSelectedId} />

                    <AnimatePresence>
                        {selectedEmp && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute top-4 right-4 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[500] flex flex-col"
                            >
                                <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shrink-0">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">{selectedEmp.name[0]}</div>
                                        <button onClick={() => setSelectedId(null)} className="p-1.5 hover:bg-white/20 rounded-xl transition-all"><X size={14} /></button>
                                    </div>
                                    <p className="font-black text-sm uppercase tracking-tight">{selectedEmp.name}</p>
                                    <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">{selectedEmp.position || 'Staff'} · {selectedEmp.department}</p>
                                </div>

                                <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
                                    <button onClick={() => setActiveTab('info')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <Info size={14} /> Info
                                    </button>
                                    <button onClick={() => setActiveTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <History size={14} /> Riwayat
                                    </button>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto no-scrollbar max-h-[50vh]">
                                    {activeTab === 'info' ? (
                                        <div className="space-y-3">
                                            {selectedEmp.schedule ? (
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                                    <Clock size={14} className="text-indigo-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jadwal Hari Ini</p>
                                                        <p className="text-xs font-black text-slate-700">{selectedEmp.schedule.startTime} – {selectedEmp.schedule.endTime}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                                    <Calendar size={14} className="text-slate-400 shrink-0" />
                                                    <p className="text-xs font-bold text-slate-400">Tidak ada jadwal</p>
                                                </div>
                                            )}

                                            {selectedEmp.latestPing ? (
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                                                    <Navigation size={14} className="text-emerald-500 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lokasi Terakhir</p>
                                                        <p className="text-[10px] font-black text-slate-700">{timeAgo(selectedEmp.latestPing.reportedAt)}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-2xl">
                                                    <WifiOff size={14} className="text-rose-400 shrink-0" />
                                                    <p className="text-xs font-bold text-rose-400">No data today</p>
                                                </div>
                                            )}

                                            {selectedEmp.latestPing && (
                                                <a href={`https://www.google.com/maps?q=${selectedEmp.latestPing.latitude},${selectedEmp.latestPing.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                                                    <Navigation size={13} /> Google Maps
                                                </a>
                                            )}

                                            {(() => {
                                                const isPending = selectedEmp.pingRequested && !!selectedEmp.pingRequestedAt
                                                const secsElapsed = isPending ? Math.floor((Date.now() - new Date(selectedEmp.pingRequestedAt!).getTime()) / 1000) : 0
                                                const secsLeft = Math.max(0, 180 - secsElapsed)
                                                
                                                return (
                                                    <div className="pt-2">
                                                        <button 
                                                            onClick={() => !isPending && handleManualPing(selectedEmp.id)}
                                                            disabled={pingLoading === selectedEmp.id || (isPending && secsLeft > 0)}
                                                            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPending && secsLeft > 0 ? 'bg-amber-50 text-amber-500 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700'}`}
                                                        >
                                                            {pingLoading === selectedEmp.id ? <RefreshCw size={13} className="animate-spin" /> : (isPending && secsLeft > 0) ? <><Radar size={13} className="animate-pulse" /> {secsLeft}s...</> : <><Radar size={13} /> Cek Sekarang</>}
                                                        </button>
                                                        {isPending && secsLeft > 0 && <p className="text-[9px] text-center text-amber-400 font-bold uppercase mt-2">Menunggu aplikasi dibuka</p>}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-2">
                                            {historyLoading ? (
                                                <div className="text-center py-10"><RefreshCw className="mx-auto text-indigo-300 animate-spin" size={24} /></div>
                                            ) : history.length > 0 ? (
                                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                                    {history.map(ping => (
                                                        <div key={ping.id} className="relative">
                                                            <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${ping.isManual ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-800">{new Date(ping.reportedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{ping.isManual ? 'Manual' : 'Auto'}</p>
                                                                </div>
                                                                <a href={`https://www.google.com/maps?q=${ping.latitude},${ping.longitude}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600"><Navigation size={12} /></a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="text-center py-10 text-[10px] font-black text-slate-300 uppercase">Tidak ada riwayat</div>}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!loading && mappableEmployees.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-3">
                                <WifiOff className="mx-auto text-slate-200" size={56} />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No data today</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
