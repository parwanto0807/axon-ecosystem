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
                        initial={{ opacity: 0, scale: 0.96, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -12 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="relative w-full max-w-xl z-10 flex flex-col"
                        style={{
                            background: '#0D1117',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 24,
                            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,201,167,0.08)',
                            maxHeight: '70vh',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Search */}
                        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <Search size={18} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Cari menu, halaman... (ketik apapun)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-white text-sm font-medium"
                                style={{ caretColor: '#00C9A7' }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {query && (
                                <button onClick={() => setQuery("")}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    <X size={14} />
                                </button>
                            )}
                            <kbd className="hidden sm:flex items-center px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                ESC
                            </kbd>
                        </div>

                        {/* Results */}
                        <div ref={listRef} className="overflow-y-auto flex-1 p-2"
                            style={{ scrollbarWidth: 'none' }}>
                            {results.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Search size={28} style={{ color: 'rgba(255,255,255,0.08)' }} />
                                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                        Tidak ada hasil untuk <strong className="text-white/40">&ldquo;{query}&rdquo;</strong>
                                    </p>
                                </div>
                            ) : (
                                Object.entries(grouped).map(([group, items]) => (
                                    <div key={group} className="mb-1">
                                        <div className="px-3 pt-3 pb-1">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]"
                                                style={{ color: 'rgba(0,201,167,0.55)' }}>
                                                {isDefaultMode ? '⚡ Menu Tersedia' : group}
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
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100 mb-0.5"
                                                    style={{
                                                        background: isSelected ? 'rgba(0,201,167,0.1)' : 'transparent',
                                                        border: `1px solid ${isSelected ? 'rgba(0,201,167,0.18)' : 'transparent'}`,
                                                    }}
                                                >
                                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                                        style={{ background: isSelected ? 'rgba(0,201,167,0.18)' : 'rgba(255,255,255,0.05)' }}>
                                                        <Icon size={15} style={{ color: isSelected ? '#00C9A7' : 'rgba(255,255,255,0.4)' }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-semibold truncate"
                                                            style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                                                            <HighlightMatch text={item.label} query={query} />
                                                        </p>
                                                        <p className="text-[10px] truncate mt-0.5 font-mono"
                                                            style={{ color: 'rgba(255,255,255,0.22)' }}>
                                                            {item.path}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isCurrentPage && (
                                                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                                style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7' }}>
                                                                Halaman ini
                                                            </span>
                                                        )}
                                                        {isSelected
                                                            ? <kbd className="flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold"
                                                                style={{ background: 'rgba(0,201,167,0.15)', color: '#00C9A7', border: '1px solid rgba(0,201,167,0.2)' }}>
                                                                <CornerDownLeft size={9} />
                                                              </kbd>
                                                            : <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.1)' }} />
                                                        }
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer hints */}
                        <div className="px-5 py-3 flex items-center justify-between shrink-0"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center gap-4 text-[10px]"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {[{ k: '↑↓', v: 'Navigasi' }, { k: '↵', v: 'Buka' }, { k: 'ESC', v: 'Tutup' }].map(({ k, v }) => (
                                    <span key={k} className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {k}
                                        </kbd>
                                        {v}
                                    </span>
                                ))}
                            </div>
                            <span className="text-[9px] font-black tracking-wider"
                                style={{ color: 'rgba(0,201,167,0.35)' }}>AXON NAV</span>
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
            className="w-full flex items-center gap-2.5 rounded-xl transition-all duration-200"
            style={{
                padding: isCollapsed ? '8px' : '8px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.35)',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,201,167,0.08)'
                e.currentTarget.style.borderColor = 'rgba(0,201,167,0.2)'
                e.currentTarget.style.color = 'rgba(0,201,167,0.8)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
            }}
            title="Cari menu (Ctrl+K)"
        >
            <Search size={14} className="shrink-0" />
            {!isCollapsed && (
                <>
                    <span className="flex-1 text-left text-[11px] font-medium truncate">Cari menu...</span>
                    <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }}>
                        Ctrl K
                    </kbd>
                </>
            )}
        </button>
    )
}
