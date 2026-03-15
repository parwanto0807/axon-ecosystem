"use client"

import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { useUIStore } from "@/store/uiStore";
import { Providers } from "@/components/Providers";
import { useState, useEffect } from "react"
import { Menu, BarChart3, Search, Bell } from "lucide-react"

export function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isSidebarCollapsed, toggleMobileMenu } = useUIStore()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div className="flex min-h-screen bg-[#f8fafc] relative font-sans">
            {/* Mobile Header - Visible only on mobile/tablet */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-100 z-[40] flex items-center justify-between px-6 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <BarChart3 className="text-white w-5 h-5" />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-slate-900">AXON</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Search size={22} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors relative">
                        <Bell size={22} />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                    </button>
                </div>
            </header>

            <Sidebar />
            
            <main
                className="flex-1 transition-all duration-300 ease-in-out pb-32 mt-16 lg:mt-0"
                style={{ 
                    paddingLeft: mounted && window.innerWidth >= 1024 
                        ? (isSidebarCollapsed ? '84px' : '284px') 
                        : '0' 
                }}
            >
                <div className="w-full">
                    {children}
                </div>
            </main>

            {/* Bottom Nav for Mobile */}
            <MobileNav />
        </div>
    )
}
