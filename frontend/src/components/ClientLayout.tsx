"use client"

import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { FloatingOperationalNav } from "@/components/FloatingOperationalNav";
import { CommandPalette } from "@/components/CommandPalette";
import { useUIStore } from "@/store/uiStore";
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { BarChart3, Search, Bell, User, LogOut } from "lucide-react"
import { useLocationTracker } from "@/hooks/useLocationTracker"


export function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isSidebarCollapsed, shouldBlurBackground } = useUIStore()
    const { data: session } = useSession()
    const userName = session?.user?.name || 'User'
    const userEmail = session?.user?.email || 'user@example.com'
    const userImage = session?.user?.image
    const [mounted, setMounted] = useState(false)

    // Silent background location tracker — runs for all non-admin users during work hours
    useLocationTracker()

    useEffect(() => {
        setMounted(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="flex min-h-screen bg-[#f8fafc] relative font-sans">
            {/* Global Command Palette — Ctrl+K anywhere */}
            <CommandPalette />
            {/* Main Application Container with Dynamic Blur */}
            <div 
                className={`flex-1 flex flex-col min-h-screen transition-all duration-700 ease-in-out ${
                    isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'
                }`}
            >
                {/* Mobile Header - Visible only on mobile/tablet */}
                <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-2xl border-b border-slate-50 z-[40] flex items-center justify-between px-4 shadow-[0_2px_15px_rgba(0,0,0,0.02)] transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <BarChart3 className="text-white w-5 h-5" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter text-slate-900">AXON</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Cari menu (Ctrl+K)"
                        >
                            <Search size={22} />
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors relative">
                            <Bell size={22} />
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        </button>
                    </div>
                </header>

                <Sidebar />
                
                {/* Desktop Top Navbar - Temporary */}
                <header className="hidden lg:flex sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-2xl border-b border-slate-200 px-8 items-center justify-end shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-400 hover:text-slate-600 group"
                            title="Cari menu (Ctrl+K)"
                        >
                            <Search size={15} />
                            <span className="text-[11px] font-medium hidden xl:block">Cari menu...</span>
                            <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-slate-200 text-slate-400">Ctrl K</kbd>
                        </button>
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900 leading-none">{userName}</p>
                                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{userEmail}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                {userImage ? (
                                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={16} className="text-indigo-600" />
                                )}
                            </div>
                            <button onClick={() => signOut()} className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors shadow-sm ml-2" title="Logout">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>
                
                <main className="flex-1 transition-all duration-300 ease-in-out pb-32 mt-14 lg:mt-0">
                    <div className="w-full h-full">
                        {children}
                    </div>
                </main>

                {/* Bottom Nav for Mobile */}
                <MobileNav />
                <FloatingOperationalNav />
            </div>
        </div>
    )
}
