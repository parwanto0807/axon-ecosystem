"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Calendar,
    Briefcase,
    Clock,
    Plus,
    Search,
    Trash2,
    Users,
    ClipboardList,
    Save,
    X,
    Filter,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    CalendarDays,
    Settings2,
    CheckSquare,
    Square,
    Info,
    RefreshCcw,
    RotateCcw,
    MapPin
} from "lucide-react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

export default function AttendanceSchedulesPage() {
    const { data: session } = useSession()
    const isOperational = session?.user?.role === 'OPERATIONAL'

    const [employees, setEmployees] = useState<any[]>([])
    const [schedules, setSchedules] = useState<any[]>([])
    const [holidays, setHolidays] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDay, setSelectedDay] = useState(new Date().getDate())
    const [isAdding, setIsAdding] = useState(false)
    const [isBulkAdding, setIsBulkAdding] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

    const [formData, setFormData] = useState({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00',
        notes: ''
    })

    const [bulkData, setBulkData] = useState({
        employeeIds: [] as string[],
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '17:00',
        excludeWeekends: true,
        excludeHolidays: true,
        notes: ''
    })

    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

    useEffect(() => {
        if (session) {
            fetchInitialData()
        }
    }, [currentMonth, currentYear, session])

    const fetchInitialData = async () => {
        setLoading(true)
        console.log("FETCHING DATA WITH SESSION:", session?.user?.role, (session?.user as any)?.id)
        try {
            const headers = {
                'x-user-role': session?.user?.role || '',
                'x-user-id': (session?.user as any)?.id || ''
            }
            const [empRes, schedRes, holRes] = await Promise.all([
                fetch(`${API_BASE}/hr/employees`, { headers }),
                fetch(`${API_BASE}/hr/employee-schedules?startDate=${currentYear}-${currentMonth + 1}-01&endDate=${currentYear}-${currentMonth + 1}-31`, { headers }),
                fetch(`${API_BASE}/hr/holidays`, { headers })
            ])
            const [empData, schedData, holData] = await Promise.all([
                empRes.json(),
                schedRes.json(),
                holRes.json()
            ])
            setEmployees(empData || [])
            setSchedules(schedData || [])
            setHolidays(holData || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!formData.employeeId) return alert("Pilih karyawan")
        try {
            const res = await fetch(`${API_BASE}/hr/employee-schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                setIsAdding(false)
                setMessage({ type: 'success', text: "Jadwal berhasil disimpan" })
                fetchInitialData()
            }
        } catch (e) { console.error(e) }
    }

    const handleBulkSave = async () => {
        if (bulkData.employeeIds.length === 0) return alert("Pilih karyawan")
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/hr/employee-schedules/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bulkData)
            })
            const result = await res.json()
            if (res.ok) {
                setIsBulkAdding(false)
                setMessage({ type: 'success', text: `Generate Berhasil: ${result.count} jadwal terdaftar` })
                fetchInitialData()
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus jadwal?")) return
        await fetch(`${API_BASE}/hr/employee-schedules/${id}`, { method: 'DELETE' })
        fetchInitialData()
    }

    // --- GRID LOGIC ---
    const daysInMonth = useMemo(() => new Date(currentYear, currentMonth + 1, 0).getDate(), [currentMonth, currentYear])
    const calendarDays = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

    const getShiftLabel = (startTime: string) => {
        if (!startTime) return 'OFF'
        const hour = parseInt(startTime.split(':')[0])
        if (hour === 8 || hour === 9) return 'N'  // Normal Office Hours
        if (hour >= 4 && hour < 11) return 'P'    // Pagi
        if (hour >= 11 && hour < 18) return 'S'   // Siang (Updated from PM)
        return 'M'                                // Malam
    }

    const getDayInitial = (day: number) => {
        const date = new Date(currentYear, currentMonth, day)
        const days = ['M', 'S', 'S', 'R', 'K', 'J', 'S']
        return days[date.getDay()]
    }

    const isWeekend = (day: number) => {
        const date = new Date(currentYear, currentMonth, day)
        return date.getDay() === 0 || date.getDay() === 6
    }

    const isHoliday = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return holidays.some(h => h.date.startsWith(dateStr))
    }

    const isToday = (day: number) => {
        const today = new Date()
        return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
    }

    const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const scheduleMap = useMemo(() => {
        const map: any = {}
        schedules.forEach(s => {
            const dateStr = s.date.split('T')[0]
            const day = new Date(s.date).getDate()
            if (!map[s.employeeId]) map[s.employeeId] = {}
            map[s.employeeId][day] = s
        })
        return map
    }, [schedules])

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(prev => prev + 1)
        } else {
            setCurrentMonth(prev => prev + 1)
        }
    }

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(prev => prev - 1)
        } else {
            setCurrentMonth(prev => prev - 1)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-6 bg-[#f8fafc] min-h-screen pb-20">
            {/* Header Style Design Reference */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">JADWAL SHIFT KARYAWAN</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">
                        Teknisi (Rotasi 5 Hari)
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-200">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><ChevronLeft size={18} className="text-slate-400" /></button>
                    <div className="flex items-center gap-2 px-4">
                        <Calendar size={16} className="text-indigo-600" />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            {new Date(currentYear, currentMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><ChevronRight size={18} className="text-slate-400" /></button>
                </div>
            </div>

            {/* Sub Header / Division Title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">DIVISI TEKNISI</h2>
                </div>
                {!isOperational && (
                    <div className="flex items-center gap-2">
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsBulkAdding(true)}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-3"
                        >
                            <RotateCcw size={14} /> Atur Offset
                        </motion.button>
                         <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAdding(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center gap-3"
                        >
                            <Plus size={14} /> Input Manual
                        </motion.button>
                    </div>
                )}
            </div>

            {/* ERROR/SUCCESS MESSAGE */}
            <AnimatePresence>
                {message && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl flex items-center justify-between text-[10px] font-black uppercase ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        <div className="flex items-center gap-3">
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                        <button onClick={() => setMessage(null)}><X size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SEARCH */}
            {!isOperational && (
                <div className="relative group max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600" size={16} />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-600/5"
                        placeholder="Cari Nama Personil..."
                    />
                </div>
            )}

            {/* DESKTOP ROSTER GRID */}
            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden relative max-w-full">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <RefreshCcw className="animate-spin text-indigo-600" size={40} />
                    </div>
                )}

                <div className="overflow-x-auto custom-scrollbar w-full">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="sticky left-0 z-40 bg-slate-50/80 backdrop-blur px-8 py-6 text-left border-r border-b border-slate-100 w-[200px] min-w-[200px]">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nama Personil</span>
                                </th>
                                {calendarDays.map(day => {
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const holiday = holidays.find(h => h.date.startsWith(dateStr))
                                    const weekend = isWeekend(day)
                                    const today = isToday(day)
                                    return (
                                        <th 
                                            key={day} 
                                            title={holiday ? `Libur Nasional: ${holiday.name}` : weekend ? 'Akhir Pekan' : ''}
                                            className={`group relative px-2 py-4 border-r border-b border-slate-100 min-w-[42px] text-center transition-colors ${today ? 'bg-emerald-50' : holiday ? 'bg-rose-50/50' : ''}`}
                                        >
                                            <div className="space-y-1">
                                                <p className={`text-[9px] font-black uppercase ${holiday || weekend ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    {getDayInitial(day)}
                                                </p>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-black transition-all ${today ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110' : holiday || weekend ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {day}
                                                </div>
                                            </div>
                                            
                                            {/* Header Tooltip - Adjusted to show below to avoid clipping */}
                                            {(holiday || weekend) && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-xl">
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-900" />
                                                    <p className={`${holiday ? 'text-rose-400' : 'text-indigo-400'} mb-1`}>
                                                        {holiday ? 'Hari Libur Nasional' : 'Akhir Pekan'}
                                                    </p>
                                                    {holiday ? holiday.name : new Date(currentYear, currentMonth, day).toLocaleDateString('id-ID', { weekday: 'long' })}
                                                </div>
                                            )}
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-center">
                            {filteredEmployees.map((emp, idx) => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="sticky left-0 z-40 bg-white/95 backdrop-blur px-8 py-4 text-left border-r border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg ${['bg-indigo-50 text-indigo-600', 'bg-violet-50 text-violet-600', 'bg-blue-50 text-blue-600', 'bg-rose-50 text-rose-600'][idx % 4]}`}>
                                                {emp.name?.[0]}
                                            </div>
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight truncate max-w-[120px]">{emp.name}</span>
                                        </div>
                                    </td>
                                    {calendarDays.map(day => {
                                        const schedule = scheduleMap[emp.id]?.[day]
                                        const label = getShiftLabel(schedule?.startTime)
                                        const today = isToday(day)

                                        let bgColor = 'bg-white'
                                        let textColor = 'text-slate-300'
                                        let borderColor = 'border-slate-100'

                                        if (label === 'P') {
                                            bgColor = 'bg-orange-50/30'
                                            textColor = 'text-orange-600'
                                            borderColor = 'border-orange-200'
                                        } else if (label === 'S') {
                                            bgColor = 'bg-indigo-50/30'
                                            textColor = 'text-indigo-600'
                                            borderColor = 'border-indigo-200'
                                        } else if (label === 'M') {
                                            bgColor = 'bg-slate-800'
                                            textColor = 'text-slate-200'
                                            borderColor = 'border-slate-700'
                                        } else if (label === 'N') {
                                            bgColor = 'bg-emerald-50'
                                            textColor = 'text-emerald-700'
                                            borderColor = 'border-emerald-200'
                                        }

                                        return (
                                            <td key={day} className={`p-2 border-r border-slate-100 ${today ? 'bg-emerald-50/20' : ''}`}>
                                                <div className="group/cell relative">
                                                    <div 
                                                        onClick={() => {
                                                            if (isOperational) return
                                                            if (schedule) handleDelete(schedule.id)
                                                            else {
                                                                setFormData({...formData, employeeId: emp.id, date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`})
                                                                setIsAdding(true)
                                                            }
                                                        }}
                                                        className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[9px] font-black ${isOperational ? 'cursor-default' : 'cursor-pointer hover:scale-105'} transition-all shadow-sm ${bgColor} ${textColor} ${borderColor}`}
                                                    >
                                                        {label !== 'OFF' ? label : 'OFF'}
                                                    </div>

                                                    {/* Cell Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-900 text-white text-[8px] font-black uppercase rounded-xl opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap shadow-2xl">
                                                        <p className="text-indigo-400 mb-1">{emp.name}</p>
                                                        <p className="mb-1">{new Date(currentYear, currentMonth, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                                        <p className="text-emerald-400">{schedule ? `${schedule.startTime} - ${schedule.endTime}` : 'LIBUR / OFF'}</p>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                                                    </div>
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MOBILE NATIVE-STYLE VIEW */}
            <div className="md:hidden space-y-6 pb-20">
                {/* Weekly Calendar Grid (7 Columns) */}
                <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                        {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map((day, idx) => (
                            <div key={day} className={`text-center text-[8px] font-black uppercase tracking-widest py-2 ${idx === 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Date Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Empty slots for month start alignment */}
                        {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-full aspect-square" />
                        ))}

                        {/* Actual Dates */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const dateCode = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            const isActive = selectedDay === day
                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth
                            
                            const dayOfWeek = new Date(currentYear, currentMonth, day).getDay()
                            const isSunday = dayOfWeek === 0
                            const isSaturday = dayOfWeek === 6
                            const isHoliday = holidays.some(h => h.date.split('T')[0] === dateCode)

                            // Color indicator for shift (Now using getShiftLabel)
                            const schedule = employees[0] ? schedules.find(s => s.employeeId === employees[0].id && s.date.split('T')[0] === dateCode) : null
                            const sLabel = schedule ? getShiftLabel(schedule.startTime) : 'OFF'
                            
                            let indicatorColor = 'bg-slate-100'
                            if (sLabel === 'P') indicatorColor = 'bg-blue-400'
                            else if (sLabel === 'S') indicatorColor = 'bg-indigo-400'
                            else if (sLabel === 'M') indicatorColor = 'bg-rose-400'
                            else if (sLabel === 'N') indicatorColor = 'bg-emerald-400'

                            let cellStyle = isToday ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-50 text-slate-600'
                            if (isSunday || isHoliday) cellStyle = 'bg-rose-50 border-rose-100/50 text-rose-600'
                            else if (isSaturday) cellStyle = 'bg-slate-100 border-slate-200/50 text-slate-500'

                            return (
                                <motion.button
                                    key={day}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedDay(day)}
                                    className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${
                                        isActive 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                        : cellStyle
                                    }`}
                                >
                                    <span className="text-xs font-black">{day}</span>
                                    {/* Shift Label Marker */}
                                    {schedule ? (
                                        <div className={`mt-0.5 px-1 py-0.5 rounded-md text-[7px] font-black ${isActive ? 'bg-white/20 text-white' : `${indicatorColor} text-white`}`}>
                                            {getShiftLabel(schedule.startTime)}
                                        </div>
                                    ) : (
                                        <div className="mt-0.5 px-1 py-0.5 rounded-md text-[7px] font-black text-slate-300">
                                            OFF
                                        </div>
                                    )}
                                </motion.button>
                            )
                        })}
                    </div>
                </div>

                {/* Selected Day Header */}
                <div className="flex items-center justify-between bg-white/50 p-4 rounded-3xl border border-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                             <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Jadwal Tanggal</p>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {selectedDay} {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('id-ID', { month: 'long' })}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Shift Cards */}
                <div className="space-y-4">
                    {employees.map(emp => {
                        const dateCode = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
                        const schedule = schedules.find(s => s.employeeId === emp.id && s.date.split('T')[0] === dateCode)
                        
                        let label = 'OFF'
                        let bgColor = 'bg-slate-50'
                        let textColor = 'text-slate-400'
                        let description = 'Waktu istirahat / libur'

                        if (schedule) {
                            label = getShiftLabel(schedule.startTime)
                            if (label === 'P') { bgColor = 'bg-blue-50'; textColor = 'text-blue-600'; description = 'Shift Pagi (07:00 - 15:00)' }
                            else if (label === 'S') { bgColor = 'bg-indigo-50'; textColor = 'text-indigo-600'; description = 'Shift Siang (15:00 - 23:00)' }
                            else if (label === 'M') { bgColor = 'bg-rose-50'; textColor = 'text-rose-600'; description = 'Shift Malam (23:00 - 07:00)' }
                            else if (label === 'N') { bgColor = 'bg-emerald-50'; textColor = 'text-emerald-600'; description = 'Shift Normal (08:00 - 17:00)' }
                        }

                        return (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={emp.id}
                                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6"
                            >
                                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                                            {emp.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.position || "Staff"}</p>
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{emp.name}</h4>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${bgColor} ${textColor}`}>
                                            {label}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {new Date().getDate() === selectedDay && new Date().getMonth() === currentMonth && (
                                                <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase animate-pulse">
                                                    HARI INI
                                                </span>
                                            )}
                                            <p className={`text-[8px] font-black uppercase ${schedule ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {schedule ? '• JADWAL AKTIF' : '• LIBUR / OFF'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                                            <Clock size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Informasi Shift</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-800">{description}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                                            <MapPin size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Lokasi</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-800 truncate">{emp.attendanceLocation?.name || "Pusat"}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* ACTION MODALS (REUSED) */}
            {/* 1. BULK MODAL */}
            <AnimatePresence>
                {isBulkAdding && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkAdding(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative p-10 overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                        <Settings2 className="text-indigo-600" />
                                        Bulk Schedule Generator
                                    </h2>
                                    <button onClick={() => setIsBulkAdding(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X size={24} /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mulai</label>
                                            <input type="date" value={bulkData.startDate} onChange={e => setBulkData({...bulkData, startDate: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai</label>
                                            <input type="date" value={bulkData.endDate} onChange={e => setBulkData({...bulkData, endDate: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Jam Masuk</label><input type="time" value={bulkData.startTime} onChange={e => setBulkData({...bulkData, startTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black" /></div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Jam Pulang</label><input type="time" value={bulkData.endTime} onChange={e => setBulkData({...bulkData, endTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-black" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setBulkData({...bulkData, excludeWeekends: !bulkData.excludeWeekends})} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${bulkData.excludeWeekends ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Lewati Akhir Pekan</span>
                                            {bulkData.excludeWeekends ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                        <button onClick={() => setBulkData({...bulkData, excludeHolidays: !bulkData.excludeHolidays})} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${bulkData.excludeHolidays ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Lewati Hari Libur</span>
                                            {bulkData.excludeHolidays ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2"><label className="text-[10px] font-black text-slate-400 uppercase">Karyawan</label></div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {employees.map(emp => (
                                                <button key={emp.id} onClick={() => setBulkData(prev => ({...prev, employeeIds: prev.employeeIds.includes(emp.id) ? prev.employeeIds.filter(i => i !== emp.id) : [...prev.employeeIds, emp.id]}))} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${bulkData.employeeIds.includes(emp.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {emp.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <motion.button whileTap={{ scale: 0.98 }} disabled={loading} onClick={handleBulkSave} className="mt-10 w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4">
                                    {loading ? <RefreshCcw size={20} className="animate-spin" /> : "Proses Generate"}
                                </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 2. MANUAL ADD MODAL */}
             <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Input Jadwal Tunggal</h3>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Karyawan</label><select value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black">{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Tanggal</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Masuk</label><input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" /></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Pulang</label><input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" /></div>
                                </div>
                                <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700">Simpan Jadwal</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
