"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, Layers, Package, Users, Building2, Wrench, FileSpreadsheet, 
  ArrowLeftRight, Settings
} from "lucide-react"

interface ItOslNavProps {
  badgeCounts?: {
    assets?: number
    pics?: number
    tickets?: number
  }
}

export function ItOslNav({ badgeCounts }: ItOslNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/dashboard/maintenance/it-osl",
      label: "Ringkasan",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/maintenance/it-osl/tickets",
      label: "Tiket Insiden",
      icon: Layers,
      count: badgeCounts?.tickets,
    },
    {
      href: "/dashboard/maintenance/it-osl/assets",
      label: "Registri Aset IT",
      icon: Package,
      count: badgeCounts?.assets,
    },
    {
      href: "/dashboard/maintenance/it-osl/pics",
      label: "Direktori PIC",
      icon: Users,
      count: badgeCounts?.pics,
    },
    {
      href: "/dashboard/maintenance/it-osl/customers",
      label: "Customer & Site",
      icon: Building2,
    },
    {
      href: "/dashboard/maintenance/it-osl/pm",
      label: "Preventive PM",
      icon: Wrench,
    },
    {
      href: "/dashboard/maintenance/it-osl/handovers",
      label: "Handover Shift",
      icon: ArrowLeftRight,
    },
    {
      href: "/dashboard/maintenance/it-osl/reports",
      label: "Laporan & SLA",
      icon: FileSpreadsheet,
    },
  ]

  return (
    <nav className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs mb-4">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard/maintenance/it-osl" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
              }`}
            >
              <Icon size={14} className={isActive ? "text-white dark:text-slate-900" : "text-slate-400"} />
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

