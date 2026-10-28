"use client"

import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { FloatingOperationalNav } from "@/components/FloatingOperationalNav";
import { CommandPalette } from "@/components/CommandPalette";
import { useUIStore } from "@/store/uiStore";
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Search, Bell, User, LogOut, Terminal, Activity, Shield } from "lucide-react"
import { useLocationTracker } from "@/hooks/useLocationTracker"

export function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isSidebarCollapsed } = useUIStore()
    const { data: session } = useSession()
    const userName = session?.user?.name || 'Operator'
    const userRole = (session?.user as any)?.role || 'USER'
    const userDept = (session?.user as any)?.department || 'HQ'
    const userImage = session?.user?.image
    const [mounted, setMounted] = useState(false)

    // Silent background location tracker — runs for non-admin users during work hours
    useLocationTracker()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#06090e] relative font-sans">
                {/* Fixed placeholder sidebar - zero layout shift, no buttons for extensions to touch */}
                <div 
                    className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-[#06090e] border-r border-[#161f2e]"
                    style={{ width: isSidebarCollapsed ? 64 : 228 }}
                >
                    <div className="px-3 py-3 border-b border-[#161f2e] flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                            <Terminal className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">AXON<span className="text-blue-500">.CORE</span></span>
                        </div>
                    </div>
                </div>

                {/* Main container placeholder */}
                <div 
                    className={`flex-1 flex flex-col min-h-screen w-full transition-[padding] duration-200 ease-out ${
                        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[228px]'
                    }`}
                >
                    <header className="hidden lg:flex sticky top-0 z-30 h-11 bg-white/90 dark:bg-[#090d14]/90 border-b border-slate-200 dark:border-slate-800/80 px-4 items-center justify-between" />
                    <main className="flex-1 p-3 lg:p-4">
                        <div className="flex items-center justify-center py-20 text-slate-400 font-mono text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-2" />
                            <span>INITIALIZING CONSOLE...</span>
                        </div>
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#06090e] text-slate-900 dark:text-slate-100 relative font-sans">
            {/* Global Command Palette — Ctrl+K anywhere */}
            <CommandPalette />

            {/* Main Application Container */}
            <div 
                className={`flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden transition-[padding] duration-200 ease-out ${
                    isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[228px]'
                }`}
            >
                {/* Mobile Header - Visible only on mobile/tablet */}
                <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-[40] flex items-center justify-between px-3.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs">
                            <Terminal className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-xs tracking-tight leading-none text-slate-900 dark:text-white">AXON<span className="text-blue-600">.OPS</span></span>
                            <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                            title="Command Console (Ctrl+K)"
                        >
                            <Search size={16} />
                        </button>
                        <button className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors relative">
                            <Bell size={16} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                        </button>
                    </div>
                </header>

                <Sidebar />
                
                {/* Desktop Engineering Command Bar — Compact 44px Height */}
                <header className="hidden lg:flex sticky top-0 z-30 h-11 bg-white/90 dark:bg-[#090d14]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 items-center justify-between shadow-xs">
                    {/* Left: System Status Telemetry */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 font-mono text-[11px]">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 font-semibold tracking-wide">SYSTEM NOMINAL</span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">14ms</span>
                        </div>

                        <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                            <Shield size={13} className="text-blue-500" />
                            <span>NODE:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">JKT-DC01</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">PROD</span>
                        </div>
                    </div>

                    {/* Right: Actions, Command Trigger, Operator Profile */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 group"
                            title="Command Console (Ctrl+K)"
                        >
                            <Search size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden xl:block">Command console...</span>
                            <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">Ctrl K</kbd>
                        </button>

                        <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors relative">
                            <Bell size={16} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                        </button>

                        {/* Operator Identity */}
                        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">{userName}</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">{userRole}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">[{userDept}]</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {userImage ? (
                                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    (userName || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            <button 
                                onClick={() => signOut()} 
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1" 
                                title="Exit Console"
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                </header>
                
                <main className="flex-1 min-w-0 max-w-full pb-12 lg:pb-8 mt-12 lg:mt-0 overflow-x-hidden">
                    <div className="w-full min-w-0 max-w-full h-full">
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
