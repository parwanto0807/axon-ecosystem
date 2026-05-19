"use client";

import { motion } from "framer-motion";
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
    Menu as MenuIcon,
    Target,
    TrendingDown,
    ClipboardList,
    Palmtree,
    Network
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useUIStore } from "@/store/uiStore";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`;

export default function OperationalDashboard() {
    const { data: session }: any = useSession();
    const { toggleMobileMenu } = useUIStore();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [perfData, setPerfData] = useState<any>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetch(`${API_BASE}/hr/attendance/my-performance`, {
                headers: {
                    'x-user-id': (session.user as any)?.id || '',
                    'x-user-role': session.user.role || ''
                }
            })
            .then(r => r.json())
            .then(data => setPerfData(data))
            .catch(console.error);
        }
    }, [session]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* App Header (Native Feel) */}
            <header className="bg-white/95 backdrop-blur-xl px-4 lg:px-8 py-3 rounded-b-[1.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-slate-50 relative z-20">
                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-indigo-50 flex items-center justify-center shadow-md shadow-indigo-600/20">
                                <span className="text-white font-bold text-base">{session?.user?.name?.[0]}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Welcome Back</p>
                                <h1 className="text-base font-bold text-slate-800 tracking-tight">{session?.user?.name}</h1>
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 relative active:scale-95 transition-all">
                            <Bell size={16} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 border-2 border-slate-50 rounded-full" />
                        </button>
                    </div>
                    
                    {/* Status Pill */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <MapPin size={12} className="text-emerald-500" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Akurasi GPS Baik</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/50 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Online</span>
                        </div>
                    </div>
                </div>
            </header>

            <motion.div 
                variants={container} 
                initial="hidden" 
                animate="show" 
                className="w-full px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 pb-12"
            >
                
                {/* LEFT COLUMN: PRIMARY ACTIONS & MONITORING */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Main Action Card (Hero) */}
                    <motion.div variants={item}>
                        <div className="relative p-5 lg:p-6 rounded-[1.5rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Clock size={100} strokeWidth={1} />
                            </div>
                            
                            <div className="relative z-10 text-center lg:text-left mb-6">
                                <p suppressHydrationWarning className="text-[9px] lg:text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">
                                    {format(currentTime, 'EEEE, d MMM yyyy', { locale: id })}
                                </p>
                                <h2 suppressHydrationWarning className="text-4xl lg:text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">
                                    {format(currentTime, 'HH:mm:ss')}
                                </h2>
                            </div>

                            <Link href="/dashboard/attendance/log" className="block relative z-10 w-full lg:w-fit lg:px-8 bg-white text-indigo-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:bg-slate-50 active:scale-95 transition-all outline-none">
                                <Camera size={16} />
                                Lakukan Absensi
                            </Link>
                        </div>
                    </motion.div>

                    {/* Quick Actions (Native App Icons Menu) */}
                    <motion.div variants={item} className="space-y-3">
                        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Menu Layanan</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 bg-white p-4 lg:p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                            {[
                                { href: "/dashboard/attendance/history", color: "bg-purple-50 text-purple-600", icon: History, label: "Riwayat" },
                                { href: "/dashboard/attendance/schedules", color: "bg-amber-50 text-amber-600", icon: Calendar, label: "Jadwal" },
                                { href: "/dashboard/maintenance", color: "bg-emerald-50 text-emerald-600", icon: ClipboardList, label: "Checklist" },
                                { href: "/dashboard/attendance/holidays", color: "bg-sky-50 text-sky-600", icon: Palmtree, label: "Libur" },
                                { href: "/dashboard/operational/mikrotik", color: "bg-blue-50 text-blue-600", icon: Network, label: "MikroTik" },
                                { isButton: true, onClick: () => signOut(), color: "bg-rose-50 text-rose-600", icon: LogOut, label: "Keluar", danger: true }
                            ].map((act: any, i: number) => (
                                act.isButton ? (
                                    <button key={i} onClick={act.onClick} className={`flex flex-col items-center gap-2 active:scale-90 transition-all outline-none ${act.soon ? 'opacity-50 relative cursor-not-allowed' : ''}`}>
                                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${act.color} ${act.danger ? 'border border-rose-100' : ''}`}>
                                            <act.icon size={20} />
                                        </div>
                                        <span className={`text-[8px] lg:text-[9px] font-bold uppercase tracking-wider ${act.danger ? 'text-rose-600' : 'text-slate-600'}`}>{act.label}</span>
                                        {act.soon && <div className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white text-[6px] font-bold px-1.5 py-0.5 rounded-full tracking-tighter">SOON</div>}
                                    </button>
                                ) : (
                                    <Link key={i} href={act.href!} className="flex flex-col items-center gap-2 active:scale-90 transition-all outline-none">
                                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${act.color}`}>
                                            <act.icon size={20} />
                                        </div>
                                        <span className="text-[8px] lg:text-[9px] font-bold text-slate-600 uppercase tracking-wider">{act.label}</span>
                                    </Link>
                                )
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT COLUMN: PERFORMANCE & TRENDS (Side widgets in Desktop) */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="hidden lg:block text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Statistik & Analitik</h3>
                    
                    <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                        {/* Attendance Performance */}
                        <div className="p-4 lg:p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <Target size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight">Performa</p>
                                    <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider">Absensi</p>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-end justify-between mb-1.5">
                                    <span className="text-xl lg:text-3xl font-black text-slate-800 tabular-nums leading-none">
                                        {perfData?.performance ?? '--'}<span className="text-xs text-slate-400">%</span>
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full tabular-nums">
                                        {perfData ? `${perfData.presentDays}/${perfData.totalWorkDays}` : '--'}
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
                        <div className="p-4 lg:p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <TrendingDown size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight">Keterlambatan</p>
                                    <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider">Mingguan</p>
                                </div>
                            </div>

                            <div>
                                {(() => {
                                    const data = perfData?.lateness || [];
                                    const totalLate = data.reduce((sum: number, d: any) => sum + Math.max(d.lateMinutes, 0), 0);
                                    return (
                                        <>
                                            <p className="text-lg lg:text-2xl font-black text-slate-800 tabular-nums leading-none mb-1">
                                                {totalLate}<span className="text-[9px] lg:text-xs text-slate-400 font-semibold"> mnt</span>
                                            </p>
                                            <p className="text-[8px] lg:text-[9px] font-semibold text-slate-400">
                                                {data.filter((d: any) => d.lateMinutes > 0).length} hari terlambat
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.div>

                    {/* Line Chart — Lateness Trend */}
                    {perfData?.lateness && perfData.lateness.length > 0 && (
                        <motion.div variants={item} className="p-4 lg:p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tren 7 Hari</h3>
                                <span className="text-[8px] font-semibold text-slate-300 uppercase">Menit</span>
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
                </div>
            </motion.div>
        </div>
    );
}
