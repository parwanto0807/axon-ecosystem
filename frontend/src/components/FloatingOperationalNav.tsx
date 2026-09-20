"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutGrid, 
    Camera, 
    Calendar,
    CheckSquare,
    Wrench
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
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-[100]">
            <div className="w-full bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-4 py-2.5 pb-safe flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.06)]">
                {/* Jadwal (Paling Kiri) */}
                <Link 
                    href="/dashboard/attendance/schedules" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/attendance/schedules') ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <div className={`p-1.5 rounded-xl ${isActive('/dashboard/attendance/schedules') ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                        <Calendar size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Jadwal</span>
                </Link>

                {/* Checklist (Kiri-Tengah) */}
                <Link 
                    href="/dashboard/maintenance" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/maintenance') && !pathname.includes('it-osl') ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <div className={`p-1.5 rounded-xl ${isActive('/dashboard/maintenance') && !pathname.includes('it-osl') ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                        <CheckSquare size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Checklist</span>
                </Link>
                
                {/* Action: Absen (Camera - Tengah) */}
                <Link 
                    href="/dashboard/attendance/log" 
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.35)] -mt-6 border-[3px] border-white transition-all active:scale-95 ${isActive('/dashboard/attendance/log') ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-900'}`}
                >
                    <Camera size={22} />
                </Link>

                {/* Tiket IT (Kanan-Tengah) */}
                <Link 
                    href="/dashboard/maintenance/it-osl/tickets" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/maintenance/it-osl') ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <div className={`p-1.5 rounded-xl ${isActive('/dashboard/maintenance/it-osl') ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                        <Wrench size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Tiket IT</span>
                </Link>

                {/* Home (Paling Kanan) */}
                <Link 
                    href="/dashboard/operational" 
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard/operational') ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <div className={`p-1.5 rounded-xl ${isActive('/dashboard/operational') ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                        <LayoutGrid size={20} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[50px] text-center">Home</span>
                </Link>
            </div>
        </div>
    );
}
