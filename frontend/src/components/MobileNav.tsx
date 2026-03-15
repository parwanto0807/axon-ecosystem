"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    LayoutDashboard, 
    ShoppingCart, 
    DollarSign, 
    Package, 
    Menu 
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

export function MobileNav() {
    const pathname = usePathname()
    const { toggleMobileMenu } = useUIStore()

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dash', path: '/dashboard' },
        { id: 'sales', icon: ShoppingCart, label: 'Sales', path: '/dashboard/sales/projects' },
        { id: 'finance', icon: DollarSign, label: 'Fin', path: '/dashboard/finance/invoices' },
        { id: 'inventory', icon: Package, label: 'Inv', path: '/dashboard/inventory' },
    ]

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-[50] flex items-center justify-around px-2 pb-safe">
            {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
                
                return (
                    <Link 
                        key={item.id} 
                        href={item.path}
                        className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full rounded-none transition-all duration-300 ${
                            isActive 
                                ? 'text-indigo-600' 
                                : 'text-slate-400 hover:text-indigo-500'
                        }`}
                    >
                        <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-50 shadow-sm' : ''}`}>
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {item.label}
                        </span>
                    </Link>
                )
            })}
            
            <button 
                onClick={toggleMobileMenu}
                className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-all duration-300"
            >
                <div className="p-2.5 rounded-2xl">
                    <Menu size={22} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Menu</span>
            </button>
        </nav>
    )
}
