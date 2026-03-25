"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
    Wrench,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowRight,
    PlusCircle,
    ClipboardList,
    Package,
    MapPin,
    User,
    ChevronRight,
    RefreshCw,
    Search
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface DashboardData {
    stats: {
        CONFIRMED?: number;
        IN_PROGRESS?: number;
        COMPLETED?: number;
        ON_HOLD?: number;
    };
    myTasks: any[];
    serviceReminders: any[];
    recentReports: any[];
}

export default function OperatorDashboard() {
    const { data: session }: any = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!session?.user?.name) return
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/operator/dashboard?user=${encodeURIComponent(session.user.name)}`)
            if (res.ok) {
                const d = await res.json()
                setData(d)
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }, [session?.user?.name])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short'
    })

    if (!session) return null

    return (
        <div className="max-w-screen mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 font-inter bg-slate-50/30 min-h-screen pb-32">
            {/* Hero Welcome Section */}
            <section className="relative overflow-hidden bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-600/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                            Halo, <span className="text-indigo-200">{session.user.name?.split(' ')[0]}</span>!
                        </h1>
                        <p className="text-indigo-100/80 font-bold uppercase tracking-[0.2em] text-[10px] md:text-sm">
                            Dashboard Kendali Operasional Lapangan
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 md:gap-8 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Berjalan</p>
                            <p className="text-2xl font-black">{(data?.stats?.IN_PROGRESS || 0) + (data?.stats?.ON_HOLD || 0)}</p>
                        </div>
                        <div className="text-center border-x border-white/10 px-4 md:px-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Antrean</p>
                            <p className="text-2xl font-black">{data?.stats?.CONFIRMED || 0}</p>
                        </div>
                        <div className="text-center text-emerald-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Selesai</p>
                            <p className="text-2xl font-black">{data?.stats?.COMPLETED || 0}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tugas Saya', icon: Wrench, color: 'text-amber-600 bg-amber-50', link: '/dashboard/operations/work-orders' },
                    { label: 'Buat Laporan', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50', link: '/dashboard/operations/work-orders' },
                    { label: 'Jadwal Servis', icon: Calendar, color: 'text-indigo-600 bg-indigo-50', link: '/dashboard/management/assets' },
                    { label: 'Cek Progress', icon: ClipboardList, color: 'text-blue-600 bg-blue-50', link: '/dashboard/operations/reports' }
                ].map((action, i) => (
                    <Link key={i} href={action.link}>
                        <motion.div 
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 transition-all hover:shadow-md h-full text-center"
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color}`}>
                                <action.icon size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{action.label}</span>
                        </motion.div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* My Assignments Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Wrench className="text-indigo-600" size={18} />
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tugas Utama Saya</h2>
                        </div>
                        <Link href="/dashboard/operations/work-orders" className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Lihat Semua</Link>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="bg-white h-24 rounded-3xl border border-slate-100 animate-pulse" />
                            ))
                        ) : data?.myTasks.length === 0 ? (
                            <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                                <CheckCircle2 className="mx-auto text-slate-200 mb-3" size={32} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semua Tugas Sudah Selesai!</p>
                            </div>
                        ) : data?.myTasks.map((wo: any) => (
                            <Link key={wo.id} href={`/dashboard/operations/work-orders?id=${wo.id}`}>
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-300 transition-all group relative overflow-hidden flex items-center gap-4">
                                    <div className={`w-2 h-full absolute left-0 top-0 ${wo.priority === 'HIGH' ? 'bg-rose-500' : wo.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{wo.number}</span>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${wo.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                                                {wo.status}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter leading-none mb-1 group-hover:text-indigo-600 transition-colors">{wo.title}</h3>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <p className="flex items-center gap-1.5 text-[10px] font-bold"><MapPin size={10} /> {wo.location || 'Lokasi Belum Ditentukan'}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Service Reminders Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Clock className="text-indigo-600" size={18} />
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Jadwal Servis Unit</h2>
                        </div>
                        <Link href="/dashboard/management/assets" className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Kelola Aset</Link>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="bg-white h-24 rounded-3xl border border-slate-100 animate-pulse" />
                            ))
                        ) : data?.serviceReminders.length === 0 ? (
                            <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                                <AlertCircle className="mx-auto text-slate-200 mb-3" size={32} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada jadwal servis mendesak.</p>
                            </div>
                        ) : data?.serviceReminders.map((asset: any) => (
                            <div key={asset.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Servis</span>
                                    <span className="text-xs font-black text-indigo-600">{fmtDate(asset.nextServiceDate)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tighter leading-none mb-1">{asset.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate">Customer: {asset.customer.name}</p>
                                </div>
                                <Link href="/dashboard/operations/work-orders">
                                    <button className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                        BUAT WO
                                    </button>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Today's Stats & Summary (Minor) */}
                    {!loading && data && (
                        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <RefreshCw size={14} className="text-emerald-400 animate-spin-slow" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ringkasan Aktivitas</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-black">{data.recentReports.length}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Laporan Baru (Baru-baru ini)</p>
                                </div>
                                <div className="flex -space-x-2">
                                     {data.recentReports.slice(0, 3).map((r: any, i: number) => (
                                         <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black">
                                             {r.reportedBy?.substring(0, 1)}
                                         </div>
                                     ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Mobile Toggle Spacer */}
            <div className="h-10 md:hidden" />
        </div>
    )
}
