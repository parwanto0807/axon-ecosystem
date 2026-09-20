"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
    Clock, 
    Calendar, 
    MapPin, 
    ShieldCheck, 
    History, 
    User,
    ArrowRight,
    Camera,
    CheckCircle2,
    LogOut,
    Bell,
    LayoutGrid,
    Target,
    TrendingDown,
    ClipboardList,
    Palmtree,
    Network,
    Wrench,
    Activity,
    AlertTriangle,
    Clock3,
    Layers,
    TrendingUp,
    Database,
    Users,
    ArrowLeftRight,
    FileText,
    Settings,
    QrCode,
    Plus,
    CheckSquare,
    ExternalLink,
    Zap,
    RefreshCw,
    Search,
    ChevronRight,
    ShieldAlert
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useUIStore } from "@/store/uiStore";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`;

type ItDashboardData = {
    total: number;
    active: number;
    pendingOver: number;
    avgMttrMin: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    breachCritical: number;
    breachList: { id: string; ticketNumber: string; summary: string }[];
    recent: { 
        id: string; 
        ticketNumber: string; 
        summary: string; 
        severity: string; 
        status: string; 
        location: { name: string } | null; 
        category: { name: string } | null;
        createdAt?: string;
    }[];
    slaCompliance: number;
};

type TodayChecklistData = {
    id?: string;
    submittedAt?: string;
    notes?: string;
    items?: { id: string; itemName: string; status: string }[];
};

export default function OperationalDashboard() {
    const { data: session }: any = useSession();
    const { toggleMobileMenu } = useUIStore();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [perfData, setPerfData] = useState<any>(null);
    const [itData, setItData] = useState<ItDashboardData | null>(null);
    const [todayChecklist, setTodayChecklist] = useState<TodayChecklistData | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'it' | 'attendance'>('all');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchAllData = async () => {
        if (!session?.user) return;
        setRefreshing(true);

        try {
            // Fetch HR attendance performance
            fetch(`${API_BASE}/hr/attendance/my-performance`, {
                headers: {
                    'x-user-id': (session.user as any)?.id || '',
                    'x-user-role': session.user.role || ''
                }
            })
            .then(r => r.json())
            .then(data => setPerfData(data))
            .catch(console.error);

            // Fetch IT OSL Dashboard KPIs
            fetch(`${API_BASE}/it-osl/dashboard`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setItData(data);
            })
            .catch(console.error);

            // Fetch Today's Checklist Status
            fetch(`${API_BASE}/maintenance/today`, {
                headers: { 'x-user-email': session?.user?.email || '' }
            })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setTodayChecklist(data);
            })
            .catch(console.error);

        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [session]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0 }
    };

    const isChecklistDoneToday = Boolean(todayChecklist && todayChecklist.items && todayChecklist.items.length > 0);
    const normalItemsCount = todayChecklist?.items?.filter(i => i.status === 'NORMAL').length || 0;
    const troubleItemsCount = todayChecklist?.items?.filter(i => i.status === 'TROUBLE').length || 0;

    // IT Maintenance Menu Items
    const itMaintenanceMenus = [
        {
            href: "/dashboard/maintenance/it-osl",
            icon: Activity,
            color: "bg-indigo-50 text-indigo-600 border-indigo-100",
            title: "Dashboard OSL",
            desc: "Monitoring KPI & SLA Insiden",
            badge: itData ? `${itData.slaCompliance}% SLA` : null,
            badgeColor: "bg-indigo-100 text-indigo-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/tickets",
            icon: ClipboardList,
            color: "bg-blue-50 text-blue-600 border-blue-100",
            title: "Tiket & Quick-Log",
            desc: "Log Tiket & Helpdesk IT",
            badge: itData?.active ? `${itData.active} Aktif` : null,
            badgeColor: "bg-blue-100 text-blue-700 font-black"
        },
        {
            href: "/dashboard/maintenance/it-osl/assets",
            icon: Database,
            color: "bg-purple-50 text-purple-600 border-purple-100",
            title: "Registri Aset + QR",
            desc: "Database Aset & Scan QR",
            badge: "Scan QR",
            badgeColor: "bg-purple-100 text-purple-700"
        },
        {
            href: "/dashboard/maintenance",
            icon: CheckSquare,
            color: "bg-emerald-50 text-emerald-600 border-emerald-100",
            title: "Checklist Harian IT",
            desc: "Server, UPS, Jaringan, CCTV",
            badge: isChecklistDoneToday ? "Selesai" : "Belum Diisi",
            badgeColor: isChecklistDoneToday ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/pm",
            icon: Calendar,
            color: "bg-teal-50 text-teal-600 border-teal-100",
            title: "PM Checklist Rutin",
            desc: "Preventive Maintenance Berkala",
            badge: "PM Schedule",
            badgeColor: "bg-teal-100 text-teal-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/handovers",
            icon: ArrowLeftRight,
            color: "bg-cyan-50 text-cyan-600 border-cyan-100",
            title: "Serah Terima Shift",
            desc: "Handover Shift IT Operasional",
            badge: "Shift Log",
            badgeColor: "bg-cyan-100 text-cyan-700"
        },
        {
            href: "/dashboard/operational/mikrotik",
            icon: Network,
            color: "bg-sky-50 text-sky-600 border-sky-100",
            title: "Monitoring MikroTik",
            desc: "Traffic, Router, Hotspot Host",
            badge: "Live Status",
            badgeColor: "bg-sky-100 text-sky-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/pics",
            icon: Users,
            color: "bg-amber-50 text-amber-600 border-amber-100",
            title: "Direktori PIC IT",
            desc: "Kontak PIC Lokasi & Vendor",
            badge: "Directory",
            badgeColor: "bg-amber-100 text-amber-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/reports",
            icon: FileText,
            color: "bg-rose-50 text-rose-600 border-rose-100",
            title: "Laporan OSL",
            desc: "Rekap Harian, Bulanan & MTTR",
            badge: "Export",
            badgeColor: "bg-rose-100 text-rose-700"
        },
        {
            href: "/dashboard/maintenance/it-osl/settings",
            icon: Settings,
            color: "bg-slate-100 text-slate-700 border-slate-200",
            title: "Master Setup OSL",
            desc: "Kategori & Lokasi Perangkat",
            badge: "Setup",
            badgeColor: "bg-slate-200 text-slate-700"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-16 font-sans">
            {/* App Header (Native Feel) */}
            <header className="bg-white/95 backdrop-blur-xl px-4 lg:px-8 py-3.5 rounded-b-[1.75rem] shadow-[0_4px_25px_rgba(0,0,0,0.03)] border-b border-slate-100 relative z-20">
                <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 border-2 border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white font-black text-lg">
                                {session?.user?.name?.[0] || 'O'}
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">
                                        IT Operational
                                    </span>
                                </div>
                                <h1 className="text-base font-black text-slate-800 tracking-tight leading-snug">{session?.user?.name || 'Operational User'}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={fetchAllData}
                                title="Refresh Data"
                                className={`w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 active:scale-95 transition-all ${refreshing ? 'animate-spin text-indigo-600' : ''}`}
                            >
                                <RefreshCw size={14} />
                            </button>
                            <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 relative active:scale-95 transition-all">
                                <Bell size={15} />
                                {itData?.breachCritical ? (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-ping" />
                                ) : (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full" />
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Status Pill & Tab Switcher for Mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-100/70 p-1.5 rounded-xl border border-slate-200/50">
                            <div className="flex items-center gap-1.5 px-2 py-0.5">
                                <MapPin size={13} className="text-emerald-500" />
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">GPS Akurat</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100/80 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-800 uppercase tracking-wider">Online</span>
                            </div>
                        </div>

                        {/* Mode Switcher Tabs */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-stretch sm:self-auto">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    activeTab === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Ringkasan
                            </button>
                            <button
                                onClick={() => setActiveTab('it')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                                    activeTab === 'it' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Wrench size={11} />
                                IT Maintenance
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    activeTab === 'attendance' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Absensi
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CRITICAL INCIDENT BANNER (If SLA breach exists) */}
            {itData && itData.breachCritical > 0 && (
                <div className="px-4 lg:px-8 pt-3">
                    <div className="bg-rose-500 text-white p-3.5 rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-between gap-3 animate-pulse">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <ShieldAlert size={20} className="shrink-0 text-white" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-100">Perhatian: Tiket Critical Lewat SLA</p>
                                <p className="text-xs font-bold truncate">{itData.breachList[0]?.ticketNumber} — {itData.breachList[0]?.summary}</p>
                            </div>
                        </div>
                        <Link 
                            href="/dashboard/maintenance/it-osl/tickets" 
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-white text-rose-600 text-[10px] font-black uppercase tracking-wider shadow-sm"
                        >
                            Tinjau
                        </Link>
                    </div>
                </div>
            )}

            <motion.div 
                variants={container} 
                initial="hidden" 
                animate="show" 
                className="w-full px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4"
            >
                
                {/* LEFT / MAIN COLUMN */}
                <div className="lg:col-span-8 space-y-4">
                    
                    {/* HERO CARDS SECTION */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'it' ? (
                            /* IT Maintenance Hero Focus */
                            <motion.div 
                                key="it-hero"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="relative p-5 lg:p-6 rounded-[1.75rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-950/20 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <Wrench size={120} strokeWidth={1} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            <Zap size={11} className="text-amber-400 fill-amber-400" />
                                            IT Maintenance Hub
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300">
                                            {format(currentTime, 'EEEE, d MMM', { locale: id })}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-black tracking-tight mb-1 text-white">
                                        Worklog & Maintenance
                                    </h2>
                                    <p className="text-xs text-indigo-200/80 mb-5 max-w-md">
                                        Pusat operasional lapangan IT, respons cepat tiket insiden, checklist harian, dan pencatatan aset terintegrasi.
                                    </p>

                                    {/* Fast Action Buttons */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                                        <Link 
                                            href="/dashboard/maintenance/it-osl/tickets" 
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center"
                                        >
                                            <Plus size={15} />
                                            <span>+ Quick-Log Tiket</span>
                                        </Link>
                                        <Link 
                                            href="/dashboard/maintenance/it-osl/assets" 
                                            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-center"
                                        >
                                            <QrCode size={15} />
                                            <span>Scan QR Aset</span>
                                        </Link>
                                        <Link 
                                            href="/dashboard/maintenance" 
                                            className="col-span-2 sm:col-span-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center"
                                        >
                                            <CheckSquare size={15} />
                                            <span>Checklist Harian</span>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* Attendance & Operational Hero */
                            <motion.div 
                                key="main-hero"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="relative p-5 lg:p-6 rounded-[1.75rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/25 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                    <Clock size={110} strokeWidth={1} />
                                </div>
                                
                                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p suppressHydrationWarning className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">
                                            {format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}
                                        </p>
                                        <h2 suppressHydrationWarning className="text-4xl lg:text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">
                                            {format(currentTime, 'HH:mm:ss')}
                                        </h2>
                                        <p className="text-xs text-indigo-100/80 mt-1">Shift Operasional IT & Presensi Lapangan</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Link 
                                            href="/dashboard/attendance/log" 
                                            className="w-full sm:w-auto px-6 bg-white text-indigo-600 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:bg-slate-50 active:scale-95 transition-all outline-none"
                                        >
                                            <Camera size={16} />
                                            Lakukan Absensi
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* IT MAINTENANCE QUICK METRICS STRIP */}
                    <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* 1. Active Tickets */}
                        <Link href="/dashboard/maintenance/it-osl/tickets" className="block">
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all active:scale-98">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <ClipboardList size={14} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Tiket</span>
                                </div>
                                <p className="text-xl font-black text-slate-800 tabular-nums">
                                    {itData?.active ?? '--'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate">
                                    {itData?.byStatus?.['IN_PROGRESS'] || 0} In Progress
                                </p>
                            </div>
                        </Link>

                        {/* 2. Daily Checklist Status */}
                        <Link href="/dashboard/maintenance" className="block">
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all active:scale-98">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isChecklistDoneToday ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <CheckSquare size={14} />
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isChecklistDoneToday ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {isChecklistDoneToday ? 'Selesai' : 'Belum'}
                                    </span>
                                </div>
                                <p className="text-xl font-black text-slate-800 tabular-nums">
                                    {isChecklistDoneToday ? `${normalItemsCount} Ok` : '0/15'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate">
                                    Checklist Harian IT
                                </p>
                            </div>
                        </Link>

                        {/* 3. SLA Compliance */}
                        <Link href="/dashboard/maintenance/it-osl" className="block">
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all active:scale-98">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <ShieldCheck size={14} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">SLA</span>
                                </div>
                                <p className="text-xl font-black text-slate-800 tabular-nums">
                                    {itData ? `${itData.slaCompliance}%` : '--%'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate">
                                    Kepatuhan Respon
                                </p>
                            </div>
                        </Link>

                        {/* 4. MTTR Average */}
                        <Link href="/dashboard/maintenance/it-osl/reports" className="block">
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition-all active:scale-98">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                                        <Clock3 size={14} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">MTTR</span>
                                </div>
                                <p className="text-xl font-black text-slate-800 tabular-nums">
                                    {itData ? `${itData.avgMttrMin}m` : '--m'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate">
                                    Rata-rata Resolusi
                                </p>
                            </div>
                        </Link>
                    </motion.div>

                    {/* IT MAINTENANCE COMPREHENSIVE MENU SUITE (Mobile Focused Grid) */}
                    <motion.div variants={item} className="space-y-2.5">
                        <div className="flex items-center justify-between pl-1">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Wrench size={12} className="text-indigo-600" />
                                Menu Lengkap IT Maintenance
                            </h3>
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                10 Layanan
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {itMaintenanceMenus.map((menu, i) => {
                                const Icon = menu.icon;
                                return (
                                    <Link 
                                        key={i} 
                                        href={menu.href}
                                        className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 active:scale-[0.98] transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${menu.color} group-hover:scale-105 transition-transform`}>
                                                    <Icon size={18} />
                                                </div>
                                                {menu.badge && (
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${menu.badgeColor}`}>
                                                        {menu.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-xs font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                {menu.title}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                                {menu.desc}
                                            </p>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-indigo-600">
                                            <span className="text-[9px] font-bold uppercase tracking-wider">Buka Modul</span>
                                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* RECENT IT TICKETS / WORKLOG STREAM */}
                    {itData && itData.recent && itData.recent.length > 0 && (
                        <motion.div variants={item} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                                        <Activity size={14} className="text-indigo-600" />
                                        Aktivitas Tiket Terbaru
                                    </h3>
                                    <p className="text-[10px] text-slate-400">Insiden dan permintaan penanganan aktif</p>
                                </div>
                                <Link 
                                    href="/dashboard/maintenance/it-osl/tickets" 
                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                                >
                                    Lihat Semua →
                                </Link>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {itData.recent.slice(0, 4).map((t) => (
                                    <Link 
                                        key={t.id} 
                                        href={`/dashboard/maintenance/it-osl/tickets`}
                                        className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                t.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' :
                                                t.severity === 'HIGH' ? 'bg-orange-500' :
                                                t.severity === 'NORMAL' ? 'bg-amber-400' : 'bg-emerald-500'
                                            }`} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                                        {t.ticketNumber}
                                                    </span>
                                                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600 truncate">
                                                    {t.summary}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-[9px] font-bold text-slate-400 block">
                                                {t.location?.name || 'Area Umum'}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* GENERAL OPERATIONAL QUICK ACCESS (Attendance, Holidays, Sign Out) */}
                    <motion.div variants={item} className="space-y-2.5">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            Layanan Kehadiran & Akun
                        </h3>
                        <div className="grid grid-cols-4 gap-2.5 bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100">
                            {[
                                { href: "/dashboard/attendance/history", color: "bg-purple-50 text-purple-600", icon: History, label: "Riwayat" },
                                { href: "/dashboard/attendance/schedules", color: "bg-amber-50 text-amber-600", icon: Calendar, label: "Jadwal" },
                                { href: "/dashboard/attendance/holidays", color: "bg-sky-50 text-sky-600", icon: Palmtree, label: "Libur" },
                                { isButton: true, onClick: () => signOut(), color: "bg-rose-50 text-rose-600", icon: LogOut, label: "Keluar", danger: true }
                            ].map((act: any, i: number) => (
                                act.isButton ? (
                                    <button 
                                        key={i} 
                                        onClick={act.onClick} 
                                        className="flex flex-col items-center gap-1.5 p-1 rounded-xl active:scale-90 transition-all outline-none"
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.color} ${act.danger ? 'border border-rose-100' : ''}`}>
                                            <act.icon size={18} />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${act.danger ? 'text-rose-600' : 'text-slate-600'}`}>{act.label}</span>
                                    </button>
                                ) : (
                                    <Link 
                                        key={i} 
                                        href={act.href!} 
                                        className="flex flex-col items-center gap-1.5 p-1 rounded-xl active:scale-90 transition-all outline-none"
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.color}`}>
                                            <act.icon size={18} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{act.label}</span>
                                    </Link>
                                )
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: PERFORMANCE & TRENDS (Side widgets in Desktop, Stacked in Mobile) */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        Analitik & Performa Lapangan
                    </h3>
                    
                    <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                        {/* Attendance Performance */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <Target size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Performa</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Absensi Bulan Ini</p>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-end justify-between mb-1.5">
                                    <span className="text-2xl lg:text-3xl font-black text-slate-800 tabular-nums leading-none">
                                        {perfData?.performance ?? '--'}<span className="text-xs text-slate-400 font-semibold">%</span>
                                    </span>
                                    <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                                        {perfData ? `${perfData.presentDays}/${perfData.totalWorkDays} Hari` : '--'}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                            (perfData?.performance ?? 0) >= 80 ? 'bg-emerald-500' : 
                                            (perfData?.performance ?? 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${perfData?.performance ?? 0}%` }} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Lateness Summary */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <TrendingDown size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Keterlambatan</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">7 Hari Terakhir</p>
                                </div>
                            </div>

                            <div>
                                {(() => {
                                    const data = perfData?.lateness || [];
                                    const totalLate = data.reduce((sum: number, d: any) => sum + Math.max(d.lateMinutes, 0), 0);
                                    return (
                                        <>
                                            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none mb-1">
                                                {totalLate}<span className="text-xs text-slate-400 font-bold"> mnt</span>
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400">
                                                {data.filter((d: any) => d.lateMinutes > 0).length} hari ada keterlambatan
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>

                    {/* Line Chart — Lateness Trend */}
                    {perfData?.lateness && perfData.lateness.length > 0 && (
                        <motion.div variants={item} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tren Menit Keterlambatan</h3>
                                <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">7 Hari</span>
                            </div>
                            {(() => {
                                const data = perfData.lateness;
                                const values = data.map((d: any) => d.lateMinutes === -2 ? null : Math.max(d.lateMinutes, 0));
                                const workValues = values.filter((v: any) => v !== null) as number[];
                                const maxVal = Math.max(...workValues, 5);
                                const W = 300, H = 100, padX = 15, padY = 15;
                                const plotW = W - padX * 2, plotH = H - padY * 2;
                                const xPositions = data.map((_: any, i: number) => padX + (i / Math.max(data.length - 1, 1)) * plotW);
                                const workPoints: any[] = [];
                                values.forEach((v: any, i: number) => {
                                    if (v !== null) workPoints.push({ x: xPositions[i], y: padY + plotH - (v / maxVal) * plotH, v, idx: i });
                                });
                                const linePath = workPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                                const areaPath = workPoints.length > 1 ? linePath + ` L${workPoints[workPoints.length - 1].x},${padY + plotH} L${workPoints[0].x},${padY + plotH} Z` : '';
                                return (
                                    <svg viewBox={`0 0 ${W} ${H + 15}`} className="w-full">
                                        {[0, 0.5, 1].map((pct, i) => <line key={i} x1={padX} x2={W - padX} y1={padY + plotH * (1 - pct)} y2={padY + plotH * (1 - pct)} stroke="#f1f5f9" strokeWidth="1" />)}
                                        {areaPath && <path d={areaPath} fill="url(#lateGrad)" opacity="0.2" />}
                                        {workPoints.length > 1 && <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                                        {workPoints.map((p, i) => (
                                            <g key={i}>
                                                <circle cx={p.x} cy={p.y} r="2.5" fill="white" stroke={p.v > 0 ? '#f97316' : '#10b981'} strokeWidth="1.5" />
                                                <text x={p.x} y={p.y - 6} fill={p.v > 0 ? '#ea580c' : '#059669'} fontSize="6" fontWeight="bold" textAnchor="middle">{p.v > 0 ? p.v : '✓'}</text>
                                            </g>
                                        ))}
                                        {data.map((d: any, i: number) => <text key={i} x={xPositions[i]} y={H + 10} fill="#94a3b8" fontSize="5" fontWeight="bold" textAnchor="middle">{d.day}</text>)}
                                        <defs><linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#f97316" stopOpacity="0" /></linearGradient></defs>
                                    </svg>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* SHIFT & PIC CONTACT CARD */}
                    <motion.div variants={item} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                    <ArrowLeftRight size={14} />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Serah Terima Shift</h4>
                            </div>
                            <Link href="/dashboard/maintenance/it-osl/handovers" className="text-[10px] font-black text-indigo-600">
                                Catat →
                            </Link>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Pastikan mencatat opening shift dan closing shift harian saat pergantian teknisi/tim operasional.
                        </p>
                        <div className="flex gap-2">
                            <Link 
                                href="/dashboard/maintenance/it-osl/handovers" 
                                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center text-[10px] font-black text-slate-700 uppercase tracking-wider border border-slate-200/60"
                            >
                                Log Shift
                            </Link>
                            <Link 
                                href="/dashboard/maintenance/it-osl/pics" 
                                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center text-[10px] font-black text-slate-700 uppercase tracking-wider border border-slate-200/60"
                            >
                                Kontak PIC
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
