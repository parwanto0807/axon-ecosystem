"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import {
    Wrench, CheckCircle2, AlertTriangle, Upload, 
    X, Camera, History, FileText, ChevronDown, ChevronUp, Loader2,
    Settings, Plus, Trash2, Eye, EyeOff, Edit2, Check, RotateCcw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

type MaintenanceItemState = {
    category: string
    name: string
    status: "NORMAL" | "TROUBLE" | null
    troubleAnalysis: string
    photoFile: File | null
    photoUrl: string | null
    photoPreview: string | null
}

export default function MaintenancePage() {
    const { data: session, status } = useSession()
    const userRole = (session?.user as any)?.role || 'USER'
    const isSuperAdmin = userRole === 'SUPER_ADMIN'

    const [activeTab, setActiveTab] = useState<'form' | 'history' | 'settings'>('form')
    
    // Templates State
    const [checklistTemplate, setChecklistTemplate] = useState<any[]>([])
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

    // Form State
    const [itemsState, setItemsState] = useState<MaintenanceItemState[]>([])
    const [overallNotes, setOverallNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    // History State
    const [historyRuns, setHistoryRuns] = useState<any[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [expandedRun, setExpandedRun] = useState<string | null>(null)

    // Settings State
    const [allTemplates, setAllTemplates] = useState<any[]>([])
    const [newItemName, setNewItemName] = useState<{ [categoryId: string]: string }>({})
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [editingItemName, setEditingItemName] = useState<string>("")

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

    const fetchActiveTemplates = async () => {
        try {
            const [tplRes, todayRes] = await Promise.all([
                fetch(`${API_BASE}/maintenance/templates`),
                fetch(`${API_BASE}/maintenance/today`, {
                    headers: { 'x-user-email': session?.user?.email || '' }
                })
            ])

            if (tplRes.ok) {
                const data = await tplRes.json()
                const todayRun = todayRes.ok ? await todayRes.json() : null

                setChecklistTemplate(data)
                if (todayRun?.notes) setOverallNotes(todayRun.notes)
                
                // Initialize form state
                const initialState: MaintenanceItemState[] = []
                data.forEach((group: any) => {
                    group.items.forEach((item: any) => {
                        const existingResponse = todayRun?.items?.find((i: any) => 
                            i.itemName.toLowerCase() === item.name.toLowerCase() && 
                            i.itemCategory.toLowerCase() === group.name.toLowerCase()
                        )
                        console.log(`[DEBUG UI] Match for ${item.name}:`, existingResponse ? existingResponse.status : 'NOT FOUND')
                        initialState.push({
                            category: group.name,
                            name: item.name,
                            status: existingResponse ? existingResponse.status : null,
                            troubleAnalysis: existingResponse?.troubleAnalysis || "",
                            photoFile: null,
                            photoUrl: existingResponse?.photoUrl || null,
                            photoPreview: existingResponse?.photoUrl ? `${process.env.NEXT_PUBLIC_API_URL}${existingResponse.photoUrl}` : null
                        })
                    })
                })
                setItemsState(initialState)
            }
        } catch (e) {
            console.error("Failed to fetch templates", e)
        } finally {
            setIsLoadingTemplates(false)
        }
    }

    const fetchAllTemplates = async () => {
        try {
            const res = await fetch(`${API_BASE}/maintenance/templates/all`, {
                headers: { 'x-user-role': userRole }
            })
            if (res.ok) {
                const data = await res.json()
                setAllTemplates(data)
            }
        } catch (e) {
            console.error("Failed to fetch all templates", e)
        }
    }

    useEffect(() => {
        if (status === 'loading') return

        if (activeTab === 'form') {
            fetchActiveTemplates()
        } else if (activeTab === 'history') {
            fetchHistory()
        } else if (activeTab === 'settings' && isSuperAdmin) {
            fetchAllTemplates()
        }
    }, [activeTab, isSuperAdmin, status, session?.user?.email])

    const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
            const res = await fetch(`${API_BASE}/maintenance`)
            if (res.ok) {
                const data = await res.json()
                setHistoryRuns(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoadingHistory(false)
        }
    }

    // --- FORM HANDLERS ---

    const handlePhotoChange = (idx: number, file: File) => {
        const newState = [...itemsState]
        newState[idx].photoFile = file
        newState[idx].photoPreview = URL.createObjectURL(file)
        setItemsState(newState)
    }

    const removePhoto = (idx: number) => {
        const newState = [...itemsState]
        if (newState[idx].photoPreview) URL.revokeObjectURL(newState[idx].photoPreview!)
        newState[idx].photoFile = null
        newState[idx].photoPreview = null
        setItemsState(newState)
    }

    const setItemStatus = (idx: number, status: "NORMAL" | "TROUBLE" | null) => {
        const newState = [...itemsState]
        newState[idx].status = status
        setItemsState(newState)
    }

    const updateTroubleAnalysis = (idx: number, text: string) => {
        const newState = [...itemsState]
        newState[idx].troubleAnalysis = text
        setItemsState(newState)
    }

    const validateForm = () => {
        const filledItems = itemsState.filter(i => i.status !== null)
        if (filledItems.length === 0) return "Pilih minimal 1 item checklist untuk disimpan."

        for (const item of filledItems) {
            if (item.status === 'TROUBLE' && !item.troubleAnalysis.trim()) {
                return `Analisa trouble untuk "${item.name}" harus diisi.`
            }
            if (!item.photoFile && !item.photoUrl) {
                return `Foto untuk "${item.name}" wajib diupload.`
            }
        }
        return null
    }

    const handleSubmit = async () => {
        const error = validateForm()
        if (error) return alert(error)

        const itemsToSubmit = itemsState.filter(i => i.status !== null)
        setIsSubmitting(true)

        try {
            const uploadedItems = await Promise.all(itemsToSubmit.map(async (item) => {
                let photoUrl = item.photoUrl
                if (item.photoFile) {
                    const formData = new FormData()
                    formData.append('image', item.photoFile)
                    const uploadRes = await fetch(`${API_BASE}/maintenance/upload`, {
                        method: 'POST',
                        body: formData
                    })
                    const uploadData = await uploadRes.json()
                    photoUrl = uploadData.url
                }
                return {
                    itemCategory: item.category,
                    itemName: item.name,
                    status: item.status,
                    troubleAnalysis: item.status === 'TROUBLE' ? item.troubleAnalysis : null,
                    photoUrl
                }
            }))

            const payload = {
                notes: overallNotes,
                items: uploadedItems
            }

            const res = await fetch(`${API_BASE}/maintenance`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole,
                    'x-user-email': session?.user?.email || ''
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setSubmitSuccess(true)
                setTimeout(() => {
                    setSubmitSuccess(false)
                    setActiveTab('history')
                    // Refresh form data to match the newly submitted state
                    fetchActiveTemplates()
                }, 2000)
            } else {
                const data = await res.json()
                alert(`Error: ${data.message}`)
            }

        } catch (e) {
            console.error(e)
            alert("Terjadi kesalahan saat mengirim form.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- SETTINGS HANDLERS ---

    const handleToggleItemStatus = async (itemId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/maintenance/templates/item/${itemId}/toggle`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole 
                },
                body: JSON.stringify({ isActive: !currentStatus })
            })
            if (res.ok) {
                fetchAllTemplates()
                fetchActiveTemplates() // refresh form data
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleAddItem = async (categoryId: string) => {
        const name = newItemName[categoryId]?.trim()
        if (!name) return

        try {
            const res = await fetch(`${API_BASE}/maintenance/templates/item`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole 
                },
                body: JSON.stringify({ categoryId, name })
            })
            if (res.ok) {
                setNewItemName({ ...newItemName, [categoryId]: '' })
                fetchAllTemplates()
                fetchActiveTemplates()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleUpdateItem = async (itemId: string) => {
        const name = editingItemName.trim()
        if (!name) {
            setEditingItemId(null)
            return
        }

        try {
            const res = await fetch(`${API_BASE}/maintenance/templates/item/${itemId}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole 
                },
                body: JSON.stringify({ name })
            })
            if (res.ok) {
                setEditingItemId(null)
                fetchAllTemplates()
                fetchActiveTemplates()
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus item ini? Riwayat pengisian dengan item ini akan tetap ada, tetapi tidak akan muncul lagi di pengaturan.")) return

        try {
            const res = await fetch(`${API_BASE}/maintenance/templates/item/${itemId}`, {
                method: 'DELETE',
                headers: { 'x-user-role': userRole }
            })
            if (res.ok) {
                fetchAllTemplates()
                fetchActiveTemplates()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="flex-1 bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-indigo-600 text-white px-4 md:px-6 py-6 md:py-8 pb-10 md:pb-12 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 md:gap-4 mb-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Wrench className="text-white w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight">IT Maintenance</h1>
                            <p className="text-indigo-200 text-xs md:text-sm font-medium">Daily routine checklist & reporting</p>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4 md:mt-6 p-1 bg-white/10 rounded-2xl backdrop-blur-md w-fit max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                        <button 
                            onClick={() => setActiveTab('form')}
                            className={`px-4 md:px-6 py-2 shrink-0 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-md' : 'text-indigo-100 hover:bg-white/10'}`}
                        >
                            Isi Checklist
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`px-4 md:px-6 py-2 shrink-0 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-indigo-100 hover:bg-white/10'}`}
                        >
                            Riwayat
                        </button>
                        {isSuperAdmin && (
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 md:px-6 py-2 shrink-0 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-md' : 'text-indigo-100 hover:bg-white/10'}`}
                            >
                                <Settings size={14} /> Pengaturan
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-6">
                <AnimatePresence mode="wait">
                    {/* --- TAB: FORM --- */}
                    {activeTab === 'form' && (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {isLoadingTemplates ? (
                                <div className="text-center py-20">
                                    <Loader2 className="mx-auto text-indigo-400 animate-spin mb-3" size={32} />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Template...</p>
                                </div>
                            ) : checklistTemplate.length === 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-3">
                                    <p className="text-xs font-bold text-slate-400">Belum ada template checklist aktif.</p>
                                </div>
                            ) : (
                                <>
                                    {submitSuccess && (
                                        <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/20">
                                            <CheckCircle2 size={20} />
                                            <p className="text-sm font-bold">Checklist berhasil disimpan!</p>
                                        </div>
                                    )}

                                    {checklistTemplate.map(group => (
                                        <div key={group.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3">
                                                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{group.name}</h2>
                                            </div>
                                            <div className="divide-y divide-slate-50">
                                                {group.items.map((itemObj: any) => {
                                                    const itemName = itemObj.name
                                                    const globalIdx = itemsState.findIndex(i => i.name === itemName && i.category === group.name)
                                                    if (globalIdx === -1) return null
                                                    const item = itemsState[globalIdx]

                                                    return (
                                                        <div key={itemObj.id} className="group/item">
                                                            <div className={`px-4 md:px-5 py-3 md:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${item.status !== null && !item.photoPreview && !item.photoUrl ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50'}`}>
                                                                <div className="flex-1 w-full">
                                                                    <p className={`font-semibold text-sm transition-colors ${item.status === 'TROUBLE' ? 'text-rose-600' : 'text-slate-700'}`}>{item.name}</p>
                                                                    
                                                                    {item.status !== null && !item.photoPreview && !item.photoUrl && (
                                                                        <motion.p 
                                                                            initial={{ opacity: 0, y: -5 }} 
                                                                            animate={{ opacity: 1, y: 0 }} 
                                                                            className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1.5"
                                                                        >
                                                                            <AlertTriangle size={12} strokeWidth={3} /> Foto belum disertakan!
                                                                        </motion.p>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <button 
                                                                            onClick={() => setItemStatus(globalIdx, 'NORMAL')}
                                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.status === 'NORMAL' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                                            title="Normal"
                                                                        >
                                                                            <CheckCircle2 size={18} strokeWidth={item.status === 'NORMAL' ? 3 : 2} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setItemStatus(globalIdx, 'TROUBLE')}
                                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.status === 'TROUBLE' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}
                                                                            title="Trouble"
                                                                        >
                                                                            <AlertTriangle size={18} strokeWidth={item.status === 'TROUBLE' ? 3 : 2} />
                                                                        </button>
                                                                        
                                                                        {item.status !== null && (
                                                                            <button 
                                                                                onClick={() => setItemStatus(globalIdx, null)}
                                                                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 ml-1"
                                                                                title="Batal / Reset"
                                                                            >
                                                                                <RotateCcw size={16} strokeWidth={2} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                                    <div className="relative w-10 h-10 shrink-0">
                                                                        {item.photoPreview ? (
                                                                            <div className="w-full h-full rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 group/photo relative">
                                                                                <img src={item.photoPreview} alt="" className="w-full h-full object-cover" />
                                                                                <button 
                                                                                    onClick={() => removePhoto(globalIdx)}
                                                                                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity backdrop-blur-[2px]"
                                                                                >
                                                                                    <X size={16} strokeWidth={3} />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button 
                                                                                onClick={() => fileInputRefs.current[globalIdx]?.click()}
                                                                                className={`w-full h-full rounded-xl flex items-center justify-center transition-all border-2 border-dashed ${item.status !== null ? 'border-rose-400 text-rose-500 bg-rose-50 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}`}
                                                                                title="Ambil Foto"
                                                                            >
                                                                                <Camera size={16} />
                                                                            </button>
                                                                        )}
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*" 
                                                                            capture="environment"
                                                                            className="hidden" 
                                                                            ref={el => { fileInputRefs.current[globalIdx] = el }}
                                                                            onChange={e => e.target.files?.[0] && handlePhotoChange(globalIdx, e.target.files[0])}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {item.status === 'TROUBLE' && (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, height: 0 }} 
                                                                        animate={{ opacity: 1, height: 'auto' }} 
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="px-5 pb-4 overflow-hidden"
                                                                    >
                                                                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-1 shadow-inner">
                                                                            <textarea
                                                                                value={item.troubleAnalysis}
                                                                                onChange={e => updateTroubleAnalysis(globalIdx, e.target.value)}
                                                                                placeholder="Jelaskan detail trouble di sini..."
                                                                                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none min-h-[60px] text-rose-900 placeholder:text-rose-300 resize-none"
                                                                            />
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-3">
                                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Catatan Tambahan (Opsional)</h2>
                                        <textarea
                                            value={overallNotes}
                                            onChange={e => setOverallNotes(e.target.value)}
                                            placeholder="Tuliskan catatan keseluruhan..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 min-h-[100px]"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="animate-spin" size={18} /> Menyimpan...</>
                                        ) : (
                                            <><Upload size={18} /> Submit Checklist</>
                                        )}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* --- TAB: HISTORY --- */}
                    {activeTab === 'history' && (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {isLoadingHistory ? (
                                <div className="text-center py-20 space-y-3">
                                    <Loader2 className="mx-auto text-indigo-400 animate-spin" size={32} />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Riwayat...</p>
                                </div>
                            ) : historyRuns.length === 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-3">
                                    <History className="mx-auto text-slate-300" size={48} />
                                    <p className="text-xs font-bold text-slate-400">Belum ada riwayat checklist.</p>
                                </div>
                            ) : (
                                historyRuns.map(run => {
                                    const troubleCount = run.items.filter((i: any) => i.status === 'TROUBLE').length
                                    const isExpanded = expandedRun === run.id

                                    return (
                                        <div key={run.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                            <div 
                                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${troubleCount > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                        {troubleCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-sm">
                                                            {new Date(run.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">{run.user?.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400">{new Date(run.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {troubleCount > 0 && (
                                                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 hidden sm:block">
                                                            {troubleCount} Trouble
                                                        </span>
                                                    )}
                                                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-slate-100 bg-slate-50"
                                                    >
                                                        {run.notes && (
                                                            <div className="p-5 border-b border-slate-200">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan</p>
                                                                <p className="text-sm font-medium text-slate-700">{run.notes}</p>
                                                            </div>
                                                        )}
                                                        <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                            {run.items.map((item: any) => (
                                                                <div key={item.id} className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 flex gap-3 md:gap-4">
                                                                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                                                                        {item.photoUrl ? (
                                                                            <img src={`${process.env.NEXT_PUBLIC_API_URL}${item.photoUrl}`} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <FileText className="w-full h-full p-4 text-slate-300" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.itemCategory}</p>
                                                                                    <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block"></span>
                                                                                    <p className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                                </div>
                                                                                <p className="font-bold text-xs md:text-sm text-slate-800 leading-snug break-words">{item.itemName}</p>
                                                                            </div>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 md:py-0.5 rounded-md shrink-0 mt-0.5 ${item.status === 'NORMAL' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                                {item.status}
                                                                            </span>
                                                                        </div>
                                                                        {item.status === 'TROUBLE' && item.troubleAnalysis && (
                                                                            <p className="mt-2 text-[11px] md:text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 break-words">
                                                                                {item.troubleAnalysis}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })
                            )}
                        </motion.div>
                    )}

                    {/* --- TAB: SETTINGS (Super Admin Only) --- */}
                    {activeTab === 'settings' && isSuperAdmin && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-3xl border border-indigo-100 p-6 flex items-start gap-4 shadow-sm shadow-indigo-100">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-800 text-lg">Manajemen Template Checklist</h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Modul eksklusif Super Admin. Tambahkan item baru atau sembunyikan item lama agar tidak muncul di form teknisi.
                                    </p>
                                </div>
                            </div>

                            {allTemplates.map(category => (
                                <div key={category.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{category.name}</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {category.items.map((item: any) => (
                                            <div key={item.id} className={`p-4 flex items-center justify-between transition-colors ${!item.isActive ? 'bg-slate-50' : ''}`}>
                                                <div className="flex items-center gap-3 flex-1 mr-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                                        {item.isActive ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                                                    </div>
                                                    
                                                    {editingItemId === item.id ? (
                                                        <input 
                                                            autoFocus
                                                            type="text" 
                                                            value={editingItemName}
                                                            onChange={e => setEditingItemName(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleUpdateItem(item.id)
                                                                if (e.key === 'Escape') setEditingItemId(null)
                                                            }}
                                                            className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                        />
                                                    ) : (
                                                        <span className={`font-semibold text-sm truncate ${item.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                                            {item.name}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {editingItemId === item.id ? (
                                                        <>
                                                            <button onClick={() => handleUpdateItem(item.id)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">
                                                                <Check size={14} />
                                                            </button>
                                                            <button onClick={() => setEditingItemId(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingItemId(item.id)
                                                                    setEditingItemName(item.name)
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Edit Item"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleItemStatus(item.id, item.isActive)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                                    item.isActive 
                                                                        ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                                                                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                                                }`}
                                                            >
                                                                {item.isActive ? 'Hide' : 'Show'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Hapus Item"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Add New Item Form */}
                                    <div className="p-4 bg-indigo-50/30 flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Nama checklist baru..." 
                                            value={newItemName[category.id] || ''}
                                            onChange={e => setNewItemName({ ...newItemName, [category.id]: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && handleAddItem(category.id)}
                                            className="flex-1 bg-white border border-indigo-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                                        />
                                        <button 
                                            onClick={() => handleAddItem(category.id)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                                        >
                                            <Plus size={14} /> Tambah
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
