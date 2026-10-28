"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, usePathname } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import {
    Search, X, ArrowRight, CornerDownLeft,
    LayoutDashboard, ShieldCheck, Database, ShoppingCart,
    Warehouse, ShoppingBag, HardHat, DollarSign, Users,
    Receipt, Wallet, BarChart3, BookOpen, PieChart,
    TrendingUp, Waves, TableProperties, Settings, Landmark,
    LayoutGrid, Briefcase, MapPin, ClipboardList, FileText,
    Package, PackagePlus, PackageMinus, ArrowLeftRight,
    Wrench, Activity, PackageCheck, ClipboardCheck,
    Calendar, Network, Cpu
} from "lucide-react"

// ─── All menu items flat list for search ──────────────────────────────────────
const ALL_ROUTES = [
    { id: 'dashboard', label: 'Dashboard', labelEn: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Core' },
    { id: 'att-log', label: 'Absen Masuk / Keluar', labelEn: 'Clock In/Out', path: '/dashboard/attendance/log', icon: ShieldCheck, group: 'Presensi' },
    { id: 'att-history', label: 'Riwayat Absensi', labelEn: 'Attendance History', path: '/dashboard/attendance/history', icon: ClipboardList, group: 'Presensi' },
    { id: 'att-schedules', label: 'Jadwal Kerja', labelEn: 'Work Schedules', path: '/dashboard/attendance/schedules', icon: Briefcase, group: 'Presensi' },
    { id: 'att-settings', label: 'Pengaturan Lokasi', labelEn: 'Location Settings', path: '/dashboard/attendance/settings', icon: MapPin, group: 'Presensi' },
    { id: 'att-holidays', label: 'Hari Libur', labelEn: 'Public Holidays', path: '/dashboard/attendance/holidays', icon: Calendar, group: 'Presensi' },
    { id: 'products', label: 'Produk', labelEn: 'Products', path: '/dashboard/management/products', icon: Package, group: 'Data Master' },
    { id: 'customers', label: 'Pelanggan', labelEn: 'Customers', path: '/dashboard/management/customers', icon: Users, group: 'Data Master' },
    { id: 'assets', label: 'Master Asset', labelEn: 'Master Assets', path: '/dashboard/management/assets', icon: Database, group: 'Data Master' },
    { id: 'vendors', label: 'Vendor', labelEn: 'Vendors', path: '/dashboard/purchasing/vendors', icon: Users, group: 'Data Master' },
    { id: 'projects', label: 'Proyek', labelEn: 'Projects', path: '/dashboard/sales/projects', icon: Briefcase, group: 'Sales' },
    { id: 'surveys', label: 'Survei', labelEn: 'Surveys', path: '/dashboard/sales/surveys', icon: MapPin, group: 'Sales' },
    { id: 'proposals', label: 'Proposal', labelEn: 'Proposals', path: '/dashboard/sales/proposals', icon: ClipboardList, group: 'Sales' },
    { id: 'quotations', label: 'Penawaran', labelEn: 'Quotations', path: '/dashboard/sales/quotations', icon: FileText, group: 'Sales' },
    { id: 'orders', label: 'Pesanan Penjualan', labelEn: 'Sales Orders', path: '/dashboard/sales/orders', icon: ShoppingBag, group: 'Sales' },
    { id: 'contracts', label: 'Kontrak / SPK', labelEn: 'Contracts / SPK', path: '/dashboard/contracts', icon: FileText, group: 'Sales' },
    { id: 'inv-monitor', label: 'Monitor Stok', labelEn: 'Stock Monitor', path: '/dashboard/inventory', icon: Package, group: 'Inventaris' },
    { id: 'inv-warehouse', label: 'Gudang', labelEn: 'Warehouses', path: '/dashboard/inventory/warehouses', icon: Warehouse, group: 'Inventaris' },
    { id: 'inv-in', label: 'Stok Masuk', labelEn: 'Stock In', path: '/dashboard/inventory/stock-in', icon: PackagePlus, group: 'Inventaris' },
    { id: 'inv-out', label: 'Stok Keluar', labelEn: 'Stock Out', path: '/dashboard/inventory/stock-out', icon: PackageMinus, group: 'Inventaris' },
    { id: 'inv-transfer', label: 'Transfer Stok', labelEn: 'Stock Transfer', path: '/dashboard/inventory/transfers', icon: ArrowLeftRight, group: 'Inventaris' },
    { id: 'inv-opname', label: 'Stock Opname', labelEn: 'Stock Opname', path: '/dashboard/inventory/opname', icon: ClipboardList, group: 'Inventaris' },
    { id: 'purchase-orders', label: 'Pesanan Pembelian', labelEn: 'Purchase Orders', path: '/dashboard/purchasing/orders', icon: FileText, group: 'Pembelian' },
    { id: 'vendor-bills', label: 'Tagihan Vendor', labelEn: 'Vendor Bills', path: '/dashboard/purchasing/bills', icon: Receipt, group: 'Pembelian' },
    { id: 'op-overview', label: 'Ringkasan Operasional', labelEn: 'Ops Overview', path: '/dashboard/operations', icon: LayoutGrid, group: 'Operasional' },
    { id: 'work-orders', label: 'Perintah Kerja', labelEn: 'Work Orders', path: '/dashboard/operations/work-orders', icon: Wrench, group: 'Operasional' },
    { id: 'progress-reports', label: 'Laporan Progres', labelEn: 'Progress Reports', path: '/dashboard/operations/reports', icon: Activity, group: 'Operasional' },
    { id: 'delivery-orders', label: 'Surat Jalan', labelEn: 'Delivery Orders', path: '/dashboard/operations/delivery-orders', icon: PackageCheck, group: 'Operasional' },
    { id: 'bast', label: 'Berita Acara', labelEn: 'BAST', path: '/dashboard/operations/bast', icon: ClipboardCheck, group: 'Operasional' },
    { id: 'invoices', label: 'Faktur Pelanggan', labelEn: 'Customer Invoices', path: '/dashboard/finance/invoices', icon: Receipt, group: 'Keuangan' },
    { id: 'operational-expenses', label: 'Biaya Operasional', labelEn: 'Operational Costs', path: '/dashboard/finance/operational-expenses', icon: Wallet, group: 'Keuangan' },
    { id: 'approvals', label: 'Persetujuan Ops', labelEn: 'Operational Approvals', path: '/dashboard/finance/approvals', icon: ShieldCheck, group: 'Keuangan' },
    { id: 'expense-reports', label: 'Laporan Pertanggungjawaban', labelEn: 'Accountability Reports', path: '/dashboard/finance/expenses', icon: Receipt, group: 'Keuangan' },
    { id: 'executive-summary', label: 'Executive Summary', labelEn: 'Executive Summary', path: '/dashboard/finance/reports/executive-summary', icon: TrendingUp, group: 'Laporan Keuangan' },
    { id: 'ledger', label: 'Buku Besar', labelEn: 'General Ledger', path: '/dashboard/finance/reports/ledger', icon: BookOpen, group: 'Laporan Keuangan' },
    { id: 'balance-sheet', label: 'Neraca', labelEn: 'Balance Sheet', path: '/dashboard/finance/reports/balance-sheet', icon: PieChart, group: 'Laporan Keuangan' },
    { id: 'profit-loss', label: 'Laba Rugi', labelEn: 'Profit & Loss', path: '/dashboard/finance/reports/profit-loss', icon: TrendingUp, group: 'Laporan Keuangan' },
    { id: 'cash-flow', label: 'Arus Kas', labelEn: 'Cash Flow', path: '/dashboard/finance/reports/cash-flow', icon: Waves, group: 'Laporan Keuangan' },
    { id: 'forecast', label: 'Proyeksi Kas', labelEn: 'Cash Projection', path: '/dashboard/finance/reports/cash-flow-forecast', icon: BarChart3, group: 'Laporan Keuangan' },
    { id: 'trial-balance', label: 'Neraca Saldo', labelEn: 'Trial Balance', path: '/dashboard/finance/reports/trial-balance', icon: TableProperties, group: 'Laporan Keuangan' },
    { id: 'coa', label: 'Bagan Akun (COA)', labelEn: 'Chart of Accounts', path: '/dashboard/finance/coa', icon: TableProperties, group: 'Keuangan' },
    { id: 'journals', label: 'Jurnal Umum', labelEn: 'General Journal', path: '/dashboard/finance/journals', icon: BookOpen, group: 'Keuangan' },
    { id: 'opening-balances', label: 'Saldo Awal', labelEn: 'Opening Balances', path: '/dashboard/finance/opening-balances', icon: LayoutGrid, group: 'Keuangan' },
    { id: 'system-accounts', label: 'Pengaturan Akun Sistem', labelEn: 'System Accounts', path: '/dashboard/finance/system-accounts', icon: Settings, group: 'Keuangan' },
    { id: 'banks', label: 'Rekening Bank', labelEn: 'Bank Accounts', path: '/dashboard/finance/banks', icon: Landmark, group: 'Keuangan' },
    { id: 'employee-list', label: 'Data Karyawan', labelEn: 'Employee Data', path: '/dashboard/hr/employees', icon: ClipboardList, group: 'SDM' },
    { id: 'payroll-list', label: 'Sistem Payroll', labelEn: 'Payroll System', path: '/dashboard/hr/payroll', icon: DollarSign, group: 'SDM' },
    { id: 'it-osl-dashboard', label: 'Dashboard OSL', labelEn: 'OSL Dashboard', path: '/dashboard/maintenance/it-osl', icon: BarChart3, group: 'IT Maintenance' },
    { id: 'it-osl-tickets', label: 'Tiket & Quick-Log', labelEn: 'Tickets & Quick-Log', path: '/dashboard/maintenance/it-osl/tickets', icon: ClipboardList, group: 'IT Maintenance' },
    { id: 'it-osl-assets', label: 'Registri Aset + QR', labelEn: 'Asset Registry + QR', path: '/dashboard/maintenance/it-osl/assets', icon: Database, group: 'IT Maintenance' },
    { id: 'it-osl-pm', label: 'PM Checklist', labelEn: 'PM Checklist', path: '/dashboard/maintenance/it-osl/pm', icon: Calendar, group: 'IT Maintenance' },
    { id: 'it-osl-handovers', label: 'Serah Terima Shift', labelEn: 'Shift Handover', path: '/dashboard/maintenance/it-osl/handovers', icon: ArrowLeftRight, group: 'IT Maintenance' },
    { id: 'it-osl-reports', label: 'Laporan OSL', labelEn: 'OSL Reports', path: '/dashboard/maintenance/it-osl/reports', icon: FileText, group: 'IT Maintenance' },
    { id: 'it-osl-settings', label: 'Master OSL', labelEn: 'OSL Master', path: '/dashboard/maintenance/it-osl/settings', icon: Settings, group: 'IT Maintenance' },
    { id: 'it-checklist', label: 'IT Checklist', labelEn: 'IT Checklist', path: '/dashboard/maintenance', icon: ClipboardList, group: 'Maintenance' },
    { id: 'it-mikrotik', label: 'Monitoring MikroTik', labelEn: 'MikroTik Monitoring', path: '/dashboard/operational/mikrotik', icon: Network, group: 'Maintenance' },
    { id: 'network', label: 'Pengaturan Jaringan', labelEn: 'Network Settings', path: '/dashboard/settings/network', icon: Cpu, group: 'Pengaturan' },
    { id: 'settings', label: 'Preferensi', labelEn: 'Preferences', path: '/dashboard/settings/company', icon: Settings, group: 'Pengaturan' },
    { id: 'user-management', label: 'Manajemen Pengguna', labelEn: 'User Management', path: '/dashboard/settings/users', icon: Users, group: 'Pengaturan' },
]

// ─── Highlight matching text ───────────────────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <span>{text}</span>
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = text.split(regex)
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part)
                    ? <mark key={i} className="bg-teal-400/25 text-teal-300 rounded px-0.5 font-black not-italic">{part}</mark>
                    : <span key={i}>{part}</span>
            )}
        </span>
    )
}

// ─── Main Command Palette Component ───────────────────────────────────────────
export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [selectedIdx, setSelectedIdx] = useState(0)
    const router = useRouter()
    const pathname = usePathname()
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Filter results
    const results = query.trim()
        ? ALL_ROUTES.filter(r => {
            const q = query.toLowerCase()
            return (
                r.label.toLowerCase().includes(q) ||
                r.labelEn.toLowerCase().includes(q) ||
                r.group.toLowerCase().includes(q) ||
                r.path.toLowerCase().includes(q)
            )
        }).slice(0, 8)
        : ALL_ROUTES.filter(r => r.path !== pathname).slice(0, 6)

    const isDefaultMode = !query.trim()

    // Keyboard shortcut Ctrl+K
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
            if (e.key === 'Escape' && isOpen) setIsOpen(false)
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen])

    // Focus on open
    useEffect(() => {
        if (isOpen) {
            setQuery("")
            setSelectedIdx(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Arrow key + Enter navigation
    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); if (results[selectedIdx]) navigate(results[selectedIdx].path) }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen, results, selectedIdx])

    useEffect(() => { setSelectedIdx(0) }, [query])

    // Scroll selected into view
    useEffect(() => {
        const el = listRef.current?.children[selectedIdx] as HTMLElement
        el?.scrollIntoView({ block: 'nearest' })
    }, [selectedIdx])

    const navigate = useCallback((path: string) => {
        router.push(path)
        setIsOpen(false)
    }, [router])

    // Group results by module
    const grouped = results.reduce((acc: Record<string, typeof results>, item) => {
        if (!acc[item.group]) acc[item.group] = []
        acc[item.group].push(item)
        return acc
    }, {})

    // Flat list for selection index
    const flatResults = Object.values(grouped).flat()

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -8 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="relative w-full max-w-xl z-10 flex flex-col bg-[#0b0f17] border border-slate-800 rounded-lg shadow-2xl shadow-black/80 overflow-hidden"
                        style={{
                            maxHeight: '70vh',
                        }}
                    >
                        {/* Search Bar */}
                        <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-slate-800/80 bg-slate-950/60">
                            <Search size={16} className="text-slate-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Execute command or jump to module... (type to filter)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-slate-100 text-sm font-sans placeholder:text-slate-500"
                                style={{ caretColor: '#3b82f6' }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {query && (
                                <button onClick={() => setQuery("")}
                                    className="p-1 rounded hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200">
                                    <X size={14} />
                                </button>
                            )}
                            <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 bg-slate-900 text-slate-400 border border-slate-750">
                                ESC
                            </kbd>
                        </div>

                        {/* Results */}
                        <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1"
                            style={{ scrollbarWidth: 'thin' }}>
                            {results.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-2">
                                    <Search size={22} className="text-slate-600" />
                                    <p className="text-xs text-slate-400 font-mono">
                                        NO MATCH FOUND FOR &ldquo;{query}&rdquo;
                                    </p>
                                </div>
                            ) : (
                                Object.entries(grouped).map(([group, items]) => (
                                    <div key={group} className="mb-2">
                                        <div className="px-2.5 pt-2 pb-1">
                                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                                                {isDefaultMode ? '// AVAILABLE MODULES' : `// ${group}`}
                                            </span>
                                        </div>
                                        {items.map(item => {
                                            const flatIdx = flatResults.indexOf(item)
                                            const isSelected = flatIdx === selectedIdx
                                            const isCurrentPage = pathname === item.path
                                            const Icon = item.icon
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => navigate(item.path)}
                                                    onMouseEnter={() => setSelectedIdx(flatIdx)}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors duration-75 text-xs ${
                                                        isSelected
                                                            ? 'bg-blue-600/15 border border-blue-500/35 text-white'
                                                            : 'hover:bg-slate-900/60 border border-transparent text-slate-300'
                                                    }`}
                                                >
                                                    <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected ? 'bg-blue-600/25 text-blue-400' : 'bg-slate-900 text-slate-400'
                                                    }`}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                            <HighlightMatch text={item.label} query={query} />
                                                        </p>
                                                        <p className="text-[10px] font-mono truncate text-slate-400">
                                                            {item.path}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isCurrentPage && (
                                                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                CURRENT
                                                            </span>
                                                        )}
                                                        {isSelected
                                                            ? <kbd className="flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                                                <CornerDownLeft size={9} />
                                                              </kbd>
                                                            : <ArrowRight size={12} className="text-slate-600" />
                                                        }
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Hints */}
                        <div className="px-4 py-2.5 flex items-center justify-between shrink-0 border-t border-slate-800/80 bg-slate-950/60 font-mono text-[10px] text-slate-400">
                            <div className="flex items-center gap-3">
                                {[{ k: '↑↓', v: 'Navigate' }, { k: '↵', v: 'Execute' }, { k: 'ESC', v: 'Close' }].map(({ k, v }) => (
                                    <span key={k} className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-750">
                                            {k}
                                        </kbd>
                                        <span>{v}</span>
                                    </span>
                                ))}
                            </div>
                            <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-400">
                                AXON // ROUTER
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

// ─── Sidebar Trigger Button ────────────────────────────────────────────────────
export function CommandPaletteTrigger({ isCollapsed }: { isCollapsed: boolean }) {
    const open = () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    }
    return (
        <button
            onClick={open}
            className="w-full flex items-center gap-2 rounded-md transition-colors bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            style={{
                padding: isCollapsed ? '6px' : '6px 10px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            title="Command Console (Ctrl+K)"
        >
            <Search size={13} className="shrink-0 text-slate-500" />
            {!isCollapsed && (
                <>
                    <span className="flex-1 text-left text-xs font-mono truncate text-slate-400">Search commands...</span>
                    <kbd className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 bg-slate-800 border border-slate-700 text-slate-400">
                        Ctrl K
                    </kbd>
                </>
            )}
        </button>
    )
}
