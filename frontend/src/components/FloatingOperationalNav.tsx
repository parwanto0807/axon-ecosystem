"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutGrid, 
    Camera, 
    History, 
    Calendar,
    Palmtree
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useSession } from "next-auth/react";

export function FloatingOperationalNav() {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const { toggleMobileMenu } = useUIStore();
    const { data: session } = useSession();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    // Only show for OPERATIONAL role
    if (session?.user?.role !== 'OPERATIONAL') return null;

    const isActive = (path: string) => {
        if (path === '/dashboard/operational') {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    return (
        <div className="lg:hidden fixed bottom-0 inset-x-0 p-6 z-[100] pointer-events-none">
            <div className="max-w-md mx-auto bg-white/80 backdrop-blur-2xl border border-slate-100 rounded-[2.5rem] p-3 flex items-center justify-around shadow-2xl shadow-indigo-500/10 pointer-events-auto">
                {/* Hr. Libur */}
                <Link 
                    href="/dashboard/attendance/holidays" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/attendance/holidays') ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <Palmtree size={22} className={isActive('/dashboard/attendance/holidays') ? 'fill-indigo-600/10' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Hr. Libur</span>
                </Link>

                {/* Jadwal */}
                <Link 
                    href="/dashboard/attendance/schedules" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/attendance/schedules') ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <Calendar size={22} className={isActive('/dashboard/attendance/schedules') ? 'fill-indigo-600/10' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Jadwal</span>
                </Link>
                
                {/* Action: Absen (Camera) */}
                <Link 
                    href="/dashboard/attendance/log" 
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl -mt-10 border-4 transition-all active:scale-90 ${isActive('/dashboard/attendance/log') ? 'bg-indigo-600 border-white' : 'bg-slate-900 border-white'}`}
                >
                    <Camera size={24} />
                </Link>

                {/* Riwayat */}
                <Link 
                    href="/dashboard/attendance/history" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/attendance/history') ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <History size={22} className={isActive('/dashboard/attendance/history') ? 'fill-indigo-600/10' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Riwayat</span>
                </Link>

                {/* Home */}
                <Link 
                    href="/dashboard/operational" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/operational') ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <LayoutGrid size={22} className={isActive('/dashboard/operational') ? 'fill-indigo-600/10' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Home</span>
                </Link>
            </div>
        </div>
    );
}
