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
    TrendingDown
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
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
            {/* App Header (Native Feel) */}
            <header className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 border-4 border-indigo-50 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <span className="text-white font-black text-lg">{session?.user?.name?.[0]}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Welcome Back</p>
                            <h1 className="text-lg font-black text-slate-800 tracking-tight">{session?.user?.name}</h1>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 relative active:scale-95 transition-all">
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-slate-50 rounded-full" />
                    </button>
                </div>
                
                {/* Status Pill */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <MapPin size={14} className="text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Akurasi GPS Baik</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/50 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Online</span>
                    </div>
                </div>
            </header>

            <motion.div variants={container} initial="hidden" animate="show" className="px-6 space-y-8 -mt-4 pt-10">
                
                {/* Main Action Card (Hero) */}
                <motion.div variants={item}>
                    <div className="relative p-6 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Clock size={100} strokeWidth={1} />
                        </div>
                        
                        <div className="relative z-10 text-center mb-8 mt-2">
                            <p suppressHydrationWarning className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-2">
                                {format(currentTime, 'EEEE, d MMM yyyy', { locale: id })}
                            </p>
                            <h2 suppressHydrationWarning className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-md">
                                {format(currentTime, 'HH:mm:ss')}
                            </h2>
                        </div>

                        <Link href="/dashboard/attendance/log" className="block relative z-10 w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 active:scale-95 transition-all outline-none">
                            <Camera size={18} />
                            Lakukan Absensi
                        </Link>
                    </div>
                </motion.div>

                {/* Quick Actions (Native App Icons Menu) */}
                <motion.div variants={item} className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Menu Cepat</h3>
                    <div className="grid grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                        <Link href="/dashboard/attendance/history" className="flex flex-col items-center gap-3 active:scale-90 transition-all outline-none">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <History size={20} />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Riwayat</span>
                        </Link>
                        
                        <Link href="/dashboard/attendance/schedules" className="flex flex-col items-center gap-3 active:scale-90 transition-all outline-none">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Calendar size={20} />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Jadwal</span>
                        </Link>

                        <button className="flex flex-col items-center gap-3 active:scale-90 transition-all opacity-50 relative outline-none">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Izin</span>
                            <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">SOON</div>
                        </button>

                        <button onClick={() => signOut()} className="flex flex-col items-center gap-3 active:scale-90 transition-all outline-none">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                                <LogOut size={20} />
                            </div>
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Keluar</span>
                        </button>
                    </div>
                </motion.div>

                {/* Performance & Trends */}
                <motion.div variants={item} className="grid grid-cols-2 gap-4">
                    {/* Attendance Performance */}
                    <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                <Target size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Performa</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Absensi Bulan Ini</p>
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex items-end justify-between mb-2">
                                <span className="text-2xl font-black text-slate-800 tabular-nums leading-none">
                                    {perfData?.performance ?? '--'}<span className="text-sm text-slate-400">%</span>
                                </span>
                                <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full tabular-nums">
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
                    <div className="p-5 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                <TrendingDown size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Telat</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">7 Hari Terakhir</p>
                            </div>
                        </div>

                        <div>
                            {(() => {
                                const data = perfData?.lateness || [];
                                const maxVal = Math.max(...data.map((d: any) => Math.max(d.lateMinutes, 0)), 10);
                                const totalLate = data.reduce((sum: number, d: any) => sum + Math.max(d.lateMinutes, 0), 0);
                                return (
                                    <>
                                        <p className="text-lg font-black text-slate-800 tabular-nums leading-none mb-1">
                                            {totalLate}<span className="text-[10px] text-slate-400 font-bold"> mnt total</span>
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 mb-0.5">
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
                    <motion.div variants={item} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grafik Keterlambatan (menit)</h3>
                            <span className="text-[9px] font-bold text-slate-300 uppercase">7 Hari</span>
                        </div>
                        {(() => {
                            const data = perfData.lateness;
                            // Filter only work days for the line, keep all for x-axis
                            const values = data.map((d: any) => d.lateMinutes === -2 ? null : Math.max(d.lateMinutes, 0));
                            const workValues = values.filter((v: any) => v !== null) as number[];
                            const maxVal = Math.max(...workValues, 5);
                            const W = 300, H = 110, padX = 15, padY = 20;
                            const plotW = W - padX * 2;
                            const plotH = H - padY * 2;

                            // X positions for all days
                            const xPositions = data.map((_: any, i: number) => padX + (i / Math.max(data.length - 1, 1)) * plotW);

                            // Build points only for work days
                            const workPoints: { x: number; y: number; v: number; idx: number }[] = [];
                            values.forEach((v: number | null, i: number) => {
                                if (v !== null) {
                                    const y = padY + plotH - (v / maxVal) * plotH;
                                    workPoints.push({ x: xPositions[i], y, v, idx: i });
                                }
                            });

                            const linePath = workPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                            const areaPath = workPoints.length > 1
                                ? linePath + ` L${workPoints[workPoints.length - 1].x},${padY + plotH} L${workPoints[0].x},${padY + plotH} Z`
                                : '';

                            return (
                                <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                                    {/* Grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                                        <line key={i} x1={padX} x2={W - padX} y1={padY + plotH * (1 - pct)} y2={padY + plotH * (1 - pct)} stroke="#f1f5f9" strokeWidth="1" />
                                    ))}
                                    {/* Area fill */}
                                    {areaPath && <path d={areaPath} fill="url(#lateGrad)" opacity="0.2" />}
                                    {/* Line */}
                                    {workPoints.length > 1 && (
                                        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    )}
                                    {/* Work day dots + values */}
                                    {workPoints.map((p, i) => (
                                        <g key={`w${i}`}>
                                            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={p.v > 0 ? '#f97316' : '#10b981'} strokeWidth="2" />
                                            <text x={p.x} y={p.y - 9} fill={p.v > 0 ? '#ea580c' : '#059669'} fontSize="8" fontWeight="900" textAnchor="middle">
                                                {p.v > 0 ? `${p.v}m` : '✓'}
                                            </text>
                                        </g>
                                    ))}
                                    {/* Weekend/Holiday markers */}
                                    {data.map((d: any, i: number) => {
                                        if (d.lateMinutes !== -2) return null;
                                        const cx = xPositions[i];
                                        const cy = padY + plotH;
                                        return (
                                            <g key={`off${i}`}>
                                                <circle cx={cx} cy={cy} r="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2" />
                                                <text x={cx} y={cy - 7} fill="#94a3b8" fontSize="6" fontWeight="700" textAnchor="middle">
                                                    {d.label || 'Off'}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    {/* Day labels */}
                                    {data.map((d: any, i: number) => (
                                        <text key={`lbl${i}`} x={xPositions[i]} y={H + 14} fill={d.lateMinutes === -2 ? '#cbd5e1' : '#94a3b8'} fontSize="7" fontWeight="900" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
                                            {d.day}
                                        </text>
                                    ))}
                                    <defs>
                                        <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f97316" />
                                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            );
                        })()}
                    </motion.div>
                )}

            </motion.div>
        </div>
    );
}
