"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart3,
    LayoutDashboard,
    ShieldCheck,
    Settings,
    Cpu,
    Activity,
    Menu,
    ChevronLeft,
    Box,
    Users,
    TableProperties,
    ChevronDown,
    ChevronRight,
    ChevronsUpDown,
    ChevronsLeftRight,
    Tag,
    Building2,
    FileText,
    ShoppingCart,
    Briefcase,
    MapPin,
    DollarSign,
    CheckCircle2,
    Warehouse,
    Package,
    PackagePlus,
    PackageMinus,
    ArrowLeftRight,
    ClipboardList,
    Database,
    Wrench,
    HardHat,
    PackageCheck,
    ClipboardCheck,
    Receipt,
    Landmark,
    BookOpen,
    PieChart,
    TrendingUp,
    Waves,
    LayoutGrid,
    ShoppingBag,
    Wallet,
    LogOut,
    Calendar,
    Network
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useLanguage } from "@/context/LanguageContext"
import { CommandPaletteTrigger } from "@/components/CommandPalette"

const translations: any = {
    ID: {
        overview: 'Dashboard',
        masterData: 'Data Master',
        products: 'Produk',
        customers: 'Pelanggan',
        assets: 'Master Asset',
        operationsOverview: 'Ringkasan',
        vendors: 'Vendor',
        salesPipeline: 'Pipeline Penjualan',
        projects: 'Proyek',
        surveys: 'Survei',
        proposals: 'Proposal',
        quotations: 'Penawaran',
        salesOrders: 'Pesanan Penjualan',
        contracts: 'Kontrak / SPK',
        inventory: 'Inventaris',
        stockMonitor: 'Monitor Stok',
        warehouses: 'Gudang',
        stockIn: 'Stok Masuk',
        stockOut: 'Stok Keluar',
        transfers: 'Transfer',
        stockOpname: 'Stock Opname',
        purchasing: 'Pembelian',
        purchaseOrders: 'Pesanan Pembelian',
        vendorBills: 'Tagihan Vendor',
        operations: 'Operasional',
        workOrders: 'Perintah Kerja',
        progressReports: 'Laporan Progres',
        deliveryOrders: 'Surat Jalan',
        beritaAcara: 'Berita Acara',
        finance: 'Keuangan / Akuntansi',
        operationalCosts: 'Biaya Operasional',
        customerInvoices: 'Faktur Pelanggan',
        bankAccounts: 'Rekening Bank',
        financialReports: 'Laporan Keuangan',
        generalLedger: 'Buku Besar',
        balanceSheet: 'Neraca',
        profitLoss: 'Laba Rugi',
        cashFlow: 'Arus Kas',
        cashProjection: 'Proyeksi Kas',
        coa: 'Bagan Akun (COA)',
        journals: 'Jurnal Umum',
        openingBalances: 'Saldo Awal',
        operationalApprovals: 'Persetujuan Ops',
        accountabilityReports: 'Laporan Pertanggungjawaban',
        systemSettings: 'Pengaturan Sistem',
        hrManagement: 'Manajemen SDM',
        employeeData: 'Data Karyawan',
        payrollSystem: 'Sistem Payroll',
        locationTracking: 'Live Location',
        preferences: 'Preferensi',

        userManagement: 'Manajemen Pengguna',
        businessCategories: 'Kategori Bisnis',
        signOut: 'Keluar',
        attendance: 'Presensi',
        clockInOut: 'Absen Masuk / Keluar',
        attendanceHistory: 'Riwayat Absensi',
        attendanceSettings: 'Pengaturan Lokasi',
        attendanceSchedules: 'Jadwal Kerja',
        holidays: 'Hari Libur',
        operationalHome: 'Beranda (Ops)',
        infrastructure: 'Infrastruktur',
        networkSettings: 'Pengaturan Jaringan',
        mikrotikMonitoring: 'Monitoring MikroTik',
        invoiceTemplate: 'Template Invoice',
    },
    EN: {
        overview: 'Overview',
        masterData: 'Master Data',
        products: 'Products',
        customers: 'Customers',
        assets: 'Master Assets',
        operationsOverview: 'Operations Overview',
        vendors: 'Vendors',
        salesPipeline: 'Sales Pipeline',
        projects: 'Projects',
        surveys: 'Surveys',
        proposals: 'Proposals',
        quotations: 'Quotations',
        salesOrders: 'Sales Orders',
        contracts: 'Contracts / SPK',
        inventory: 'Inventory',
        stockMonitor: 'Stock Monitor',
        warehouses: 'Warehouses',
        stockIn: 'Stock In',
        stockOut: 'Stock Out',
        transfers: 'Transfers',
        stockOpname: 'Stock Opname',
        purchasing: 'Purchasing',
        purchaseOrders: 'Purchase Orders',
        vendorBills: 'Vendor Bills',
        operations: 'Operations',
        workOrders: 'Work Orders',
        progressReports: 'Progress Reports',
        deliveryOrders: 'Delivery Orders',
        beritaAcara: 'Berita Acara',
        finance: 'Finance / Accounting',
        operationalCosts: 'Operational Costs',
        customerInvoices: 'Customer Invoices',
        bankAccounts: 'Bank Accounts',
        financialReports: 'Financial Reports',
        generalLedger: 'General Ledger',
        balanceSheet: 'Balance Sheet',
        profitLoss: 'Profit & Loss',
        cashFlow: 'Cash Flow',
        cashProjection: 'Cash Projection',
        coa: 'Chart of Accounts',
        journals: 'General Journal',
        openingBalances: 'Opening Balances',
        operationalApprovals: 'Operational Approvals',
        accountabilityReports: 'Accountability Reports',
        systemSettings: 'System Settings',
        hrManagement: 'HR Management',
        employeeData: 'Employee Data',
        payrollSystem: 'Payroll System',
        locationTracking: 'Live Location',
        preferences: 'Preferences',

        userManagement: 'User Management',
        businessCategories: 'Business Categories',
        signOut: 'Sign Out',
        attendance: 'Attendance',
        clockInOut: 'Clock In / Out',
        attendanceHistory: 'History',
        attendanceSettings: 'Location Settings',
        attendanceSchedules: 'Work Schedules',
        holidays: 'Public Holidays',
        operationalHome: 'Home (Ops)',
        infrastructure: 'Infrastructure',
        networkSettings: 'Network Settings',
        mikrotikMonitoring: 'MikroTik Monitoring',
        invoiceTemplate: 'Invoice Template',
    }
}

const getMenuItems = (t: any) => [
    {
        id: 'core',
        label: t.overview,
        isHeader: true,
        requiredDepartment: ['SALES', 'LOGISTIC', 'FINANCE', 'HR']
    },
    {
        id: 'dashboard', 
        icon: LayoutDashboard, 
        label: t.overview, 
        path: '/dashboard', 
        requiredDepartment: ['SALES', 'LOGISTIC', 'FINANCE', 'HR'] 
    },
    {
        id: 'operational-dashboard',
        icon: LayoutDashboard,
        label: t.operationalHome,
        path: '/dashboard/operational',
        requiredRoles: ['OPERATIONAL']
    },
    {
        id: 'attendance-group',
        label: 'PRESENSI',
        isHeader: true,
    },
    {
        id: 'attendance',
        icon: ShieldCheck,
        label: t.attendance,
        children: [
            { id: 'att-log', icon: Activity, label: t.clockInOut, path: '/dashboard/attendance/log' },
            { id: 'att-history', icon: ClipboardList, label: t.attendanceHistory, path: '/dashboard/attendance/history' },
            { id: 'att-schedules', icon: Briefcase, label: t.attendanceSchedules, path: '/dashboard/attendance/schedules', requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATIONAL'] },
            { id: 'att-settings', icon: MapPin, label: t.attendanceSettings, path: '/dashboard/attendance/settings', requiredRoles: ['ADMIN', 'SUPER_ADMIN'] },
            { id: 'att-holidays', icon: Calendar, label: t.holidays, path: '/dashboard/attendance/holidays' },
        ]
    },
    {
        id: 'master', icon: Database, label: t.masterData, requiredDepartment: ['SALES', 'LOGISTIC', 'FINANCE', 'HR'], children: [
            { id: 'business-categories', label: t.businessCategories, path: '/dashboard/management/business-categories', icon: LayoutGrid, requiredRoles: ['ADMIN', 'SUPER_ADMIN'] },
            { id: 'products', label: t.products, path: '/dashboard/management/products', icon: Package, requiredDepartment: ['SALES', 'LOGISTIC', 'FINANCE'] },
            { id: 'customers', label: t.customers, path: '/dashboard/management/customers', icon: Users },
            { id: 'assets', label: t.assets, path: '/dashboard/management/assets', icon: Box },
            { id: 'vendors', label: t.vendors, path: '/dashboard/purchasing/vendors', icon: Building2, requiredDepartment: ['LOGISTIC', 'FINANCE'] },
        ]
    },

    {
        id: 'sales-group',
        label: 'SALES',
        isHeader: true,
        requiredDepartment: ['SALES']
    },
    {
        id: 'sales',
        icon: ShoppingCart,
        label: t.salesPipeline,
        requiredDepartment: ['SALES'],
        children: [
            { id: 'projects', icon: Briefcase, label: t.projects, path: '/dashboard/sales/projects' },
            { id: 'surveys', icon: MapPin, label: t.surveys, path: '/dashboard/sales/surveys' },
            { id: 'proposals', icon: ClipboardList, label: t.proposals, path: '/dashboard/sales/proposals' },
            { id: 'quotations', icon: FileText, label: t.quotations, path: '/dashboard/sales/quotations' },
            { id: 'orders', icon: ShoppingBag, label: t.salesOrders, path: '/dashboard/sales/orders' },
            { id: 'contracts', icon: FileText, label: t.contracts, path: '/dashboard/contracts' }
        ]
    },

    {
        id: 'logistic-group',
        label: 'LOGISTIC',
        isHeader: true,
        requiredDepartment: ['LOGISTIC']
    },
    {
        id: 'inventory',
        icon: Warehouse,
        label: t.inventory,
        requiredDepartment: ['LOGISTIC'],
        children: [
            { id: 'inv-monitor', icon: Package, label: t.stockMonitor, path: '/dashboard/inventory' },
            { id: 'inv-warehouse', icon: Database, label: t.warehouses, path: '/dashboard/inventory/warehouses' },
            { id: 'inv-in', icon: PackagePlus, label: t.stockIn, path: '/dashboard/inventory/stock-in' },
            { id: 'inv-out', icon: PackageMinus, label: t.stockOut, path: '/dashboard/inventory/stock-out' },
            { id: 'inv-transfer', icon: ArrowLeftRight, label: t.transfers, path: '/dashboard/inventory/transfers' },
            { id: 'inv-opname', icon: ClipboardList, label: t.stockOpname, path: '/dashboard/inventory/opname' },
        ]
    },
    {
        id: 'purchasing',
        icon: ShoppingBag,
        label: t.purchasing,
        requiredDepartment: ['LOGISTIC', 'FINANCE'],
        children: [
            { id: 'purchase-orders', icon: FileText, label: t.purchaseOrders, path: '/dashboard/purchasing/orders' },
            { id: 'vendor-bills', icon: Receipt, label: t.vendorBills, path: '/dashboard/purchasing/bills' }
        ]
    },

    {
        id: 'operation-group',
        label: 'OPERATION',
        isHeader: true,
        requiredDepartment: ['LOGISTIC']
    },
    {
        id: 'operations',
        icon: HardHat,
        label: t.operations,
        requiredDepartment: ['LOGISTIC'],
        children: [
            { id: 'op-overview', icon: LayoutGrid, label: t.operationsOverview, path: '/dashboard/operations' },
            { id: 'work-orders', icon: Wrench, label: t.workOrders, path: '/dashboard/operations/work-orders', requiredDepartment: ['LOGISTIC'] },
            { id: 'reports', icon: Activity, label: t.progressReports, path: '/dashboard/operations/reports' },
            { id: 'delivery-orders', icon: PackageCheck, label: t.deliveryOrders, path: '/dashboard/operations/delivery-orders' },
            { id: 'bast', icon: ClipboardCheck, label: t.beritaAcara, path: '/dashboard/operations/bast', requiredDepartment: ['LOGISTIC'] },
        ]
    },

    {
        id: 'finance-group',
        label: 'ACC FINANCE',
        isHeader: true,
        requiredDepartment: ['FINANCE']
    },
    {
        id: 'finance',
        icon: DollarSign,
        label: t.finance,
        requiredDepartment: ['FINANCE'],
        children: [
            { id: 'invoices', icon: Receipt, label: t.customerInvoices, path: '/dashboard/finance/invoices' },
            { id: 'operational-expenses', icon: Wallet, label: t.operationalCosts, path: '/dashboard/finance/operational-expenses' },
            { id: 'approvals', icon: ShieldCheck, label: t.operationalApprovals, path: '/dashboard/finance/approvals' },
            { id: 'expense-reports', icon: Receipt, label: t.accountabilityReports, path: '/dashboard/finance/expenses' },
            {
                id: 'reports',
                icon: BarChart3,
                label: t.financialReports,
                isSpecial: true,
                children: [
                    { id: 'executive-summary', label: 'Executive Summary', icon: TrendingUp, path: '/dashboard/finance/reports/executive-summary' },
                    { id: 'ledger', label: t.generalLedger, icon: BookOpen, path: '/dashboard/finance/reports/ledger' },
                    { id: 'balance-sheet', label: t.balanceSheet, icon: PieChart, path: '/dashboard/finance/reports/balance-sheet' },
                    { id: 'profit-loss', label: t.profitLoss, icon: TrendingUp, path: '/dashboard/finance/reports/profit-loss' },
                    { id: 'cash-flow', label: t.cashFlow, icon: Waves, path: '/dashboard/finance/reports/cash-flow' },
                    { id: 'forecast', label: t.cashProjection, icon: BarChart3, path: '/dashboard/finance/reports/cash-flow-forecast' },
                ]
            },
            { id: 'coa', icon: TableProperties, label: t.coa, path: '/dashboard/finance/coa' },
            { id: 'journals', icon: BookOpen, label: t.journals, path: '/dashboard/finance/journals' },
            { id: 'opening-balances', icon: LayoutGrid, label: t.openingBalances, path: '/dashboard/finance/opening-balances' },
            { id: 'system-accounts', icon: Settings, label: t.systemSettings, path: '/dashboard/finance/system-accounts' },
            { id: 'banks', icon: Landmark, label: t.bankAccounts, path: '/dashboard/finance/banks' },
        ]
    },
    {
        id: 'hr',
        icon: Users,
        label: t.hrManagement,
        requiredDepartment: ['HR'],
        children: [
            { id: 'employee-list', icon: ClipboardList, label: t.employeeData, path: '/dashboard/hr/employees' },
            { id: 'payroll-list', icon: DollarSign, label: t.payrollSystem, path: '/dashboard/hr/payroll' },
            { id: 'location-tracking', icon: MapPin, label: t.locationTracking, path: '/dashboard/hr/location-tracking', requiredRoles: ['SUPER_ADMIN'] },
        ]
    },
    {
        id: 'maintenance-group',
        label: 'MAINTENANCE',
        isHeader: true,
    },
    {
        id: 'it-maintenance',
        icon: Wrench,
        label: 'IT Maintenance',
        children: [
            { id: 'it-checklist', icon: ClipboardList, label: 'IT Checklist', path: '/dashboard/maintenance' },
            { id: 'it-mikrotik', icon: Network, label: t.mikrotikMonitoring, path: '/dashboard/operational/mikrotik' },
        ]
    },
    {
        id: 'infra-group',
        label: t.infrastructure,
        isHeader: true,
        requiredRoles: ['ADMIN', 'SUPER_ADMIN']
    },

    {
        id: 'network',
        icon: Cpu,
        label: t.networkSettings,
        path: '/dashboard/settings/network',
        requiredRoles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
        id: 'invoice-template',
        icon: Receipt,
        label: t.invoiceTemplate,
        path: '/dashboard/invoice',
        requiredRoles: ['ADMIN', 'SUPER_ADMIN']
    },
    { id: 'settings', icon: Settings, label: t.preferences, path: '/dashboard/settings/company', requiredRoles: ['ADMIN', 'SUPER_ADMIN'] },
    { id: 'user-management', icon: Users, label: t.userManagement, path: '/dashboard/settings/users', requiredRoles: ['ADMIN', 'SUPER_ADMIN'] },
]

import { useUIStore } from "@/store/uiStore"

export function Sidebar() {
    const { isSidebarCollapsed: isCollapsed, toggleSidebar, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()
    const { data: session, status }: any = useSession()
    const { lang } = useLanguage()

    const t = translations[lang] || translations.EN
    const menuItems = getMenuItems(t)

    const userRole = session?.user?.role || 'USER'
    const userDept = session?.user?.department || 'NONE'
    const isOperational = userRole === 'OPERATIONAL'

    const isLoading = status === 'loading'

    const filteredMenuItems = menuItems.filter((item: any) => {
        // If loading, show only items with no restrictions
        if (isLoading) {
            return !item.requiredRoles && !item.requiredDepartment
        }

        // Super Admin and Admin see everything
        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return true

        // Check Dept for top-level
        if (item.requiredDepartment && !item.requiredDepartment.includes(userDept)) return false

        // Check Roles for top-level
        if (item.requiredRoles && !item.requiredRoles.includes(userRole)) return false

        return true
    }).map((item: any) => {
        if (!item.children) return item
        return {
            ...item,
            children: item.children.filter((child: any) => {
                if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return true
                if (child.requiredRoles && !child.requiredRoles.includes(userRole)) return false
                if (child.requiredDepartment && !child.requiredDepartment.includes(userDept)) return false
                return true
            })
        }
    }).filter((item: any) => {
        // Hide headers or groups if they become empty after child filtering (except 'core' & 'dashboard')
        if (item.children && item.children.length === 0 && !['core', 'dashboard'].includes(item.id)) return false
        return true
    })

    return (
        <>
            {/* Desktop Sidebar — Dark Obsidian */}
            <motion.div
                animate={{
                    width: isCollapsed ? 80 : 280,
                    x: 0
                }}
                className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col transition-all duration-300"
                style={{
                    background: "#0D1117",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "4px 0 24px rgba(0,0,0,0.3)"
                }}
            >
                {/* Floating Desktop Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-7 w-6 h-6 flex items-center justify-center rounded-full z-50 transition-colors shadow-md border"
                    style={{
                        background: "#161B22",
                        borderColor: "rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.5)"
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = "#fff"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = "rgba(255,255,255,0.5)"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
                    }}
                >
                    {isCollapsed ? <Menu size={12} /> : <ChevronLeft size={12} />}
                </button>

                <div className="flex flex-col h-full overflow-hidden">
                    <SidebarContent
                        isCollapsed={isCollapsed}
                        toggleSidebar={toggleSidebar}
                        filteredMenuItems={filteredMenuItems}
                        userName={session?.user?.name}
                        userRole={userRole}
                        userDept={userDept}
                        isLoading={isLoading}
                        onLogout={() => signOut()}
                        t={t}
                    />
                </div>
            </motion.div>

            {/* Mobile Sidebar Overlay (hidden for OPERATIONAL — they use floating nav) */}
            {!isOperational && (
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100"
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-70 z-101 flex flex-col"
                            style={{ background: "#0D1117", boxShadow: "8px 0 32px rgba(0,0,0,0.5)" }}
                        >
                            <div className="flex flex-col h-full overflow-hidden">
                                <SidebarContent
                                    isCollapsed={false}
                                    toggleSidebar={() => setMobileMenuOpen(false)}
                                    isMobile
                                    filteredMenuItems={filteredMenuItems}
                                    userName={session?.user?.name}
                                    userRole={userRole}
                                    userDept={userDept}
                                    isLoading={isLoading}
                                    onLogout={() => signOut()}
                                    t={t}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            )}
        </>
    )
}

interface SidebarContentProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    filteredMenuItems: any[];
    userName?: string;
    userRole: string;
    userDept: string;
    isMobile?: boolean;
    isLoading?: boolean;
    onLogout: () => void;
    t: any;
}

function SidebarContent({
    isCollapsed,
    toggleSidebar,
    filteredMenuItems,
    userName,
    userRole,
    userDept,
    isMobile = false,
    isLoading = false,
    onLogout,
    t
}: SidebarContentProps) {
    const { setMobileMenuOpen } = useUIStore()
    const pathname = usePathname()
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})
    const allParentIds = useRef<string[]>([])

    // Collect all parent menu IDs (menus with children)
    useEffect(() => {
        const ids: string[] = []
        const collect = (items: any[]) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    ids.push(item.id)
                    collect(item.children)
                }
            })
        }
        collect(filteredMenuItems)
        allParentIds.current = ids
    }, [filteredMenuItems])

    // Auto-open active menu path submenus
    useEffect(() => {
        const initial: Record<string, boolean> = {}
        const findActive = (items: any[]) => {
            items.forEach(item => {
                if (item.children) {
                    const hasActive = item.children.some((child: any) =>
                        child.path === pathname || child.children?.some((sub: any) => sub.path === pathname)
                    )
                    if (hasActive) {
                        initial[item.id] = true
                    }
                    findActive(item.children)
                }
            })
        }
        findActive(filteredMenuItems)
        setOpenSubmenus(prev => ({ ...initial, ...prev }))
    }, [pathname, filteredMenuItems])

    const isAllExpanded = allParentIds.current.length > 0 && allParentIds.current.every(id => !!openSubmenus[id])

    const toggleExpandAll = () => {
        if (isAllExpanded) {
            setOpenSubmenus({})
        } else {
            const nextState: Record<string, boolean> = {}
            allParentIds.current.forEach(id => { nextState[id] = true })
            setOpenSubmenus(nextState)
        }
    }

    const toggleSubmenu = (id: string) => {
        setOpenSubmenus(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <>
            {/* Logo / Header */}
            <div
                className={`flex items-center justify-between shrink-0 ${
                    isCollapsed ? 'px-4 py-6 justify-center' : 'px-6 py-6'
                }`}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3"
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    background: "linear-gradient(135deg, #00C9A7, #00A589)",
                                    boxShadow: "0 0 16px rgba(0,201,167,0.35)"
                                }}
                            >
                                <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
                            </div>
                            <div>
                                <span className="font-black text-lg tracking-tighter text-white">AXON</span>
                                {isLoading && (
                                    <span className="block text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#00C9A7" }}>SYNCING...</span>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #00C9A7, #00A589)",
                                boxShadow: "0 0 16px rgba(0,201,167,0.35)"
                            }}
                        >
                            <BarChart3 className="text-white w-4 h-4" strokeWidth={2.5} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMobile && (
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 rounded-xl transition-colors"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            <ChevronLeft size={18} />
                        </button>
                    )}
            </div>

            {/* Command Palette Trigger */}
            <div className={`shrink-0 ${isCollapsed ? 'px-2.5 py-3 flex justify-center' : 'px-3 py-3'}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <CommandPaletteTrigger isCollapsed={isCollapsed} />
            </div>

            {/* Expand / Collapse All Toggle Button */}
            {!isCollapsed && (
                <div className="px-3 pt-2 pb-2 flex items-center justify-between gap-1 shrink-0 border-b border-white/[0.04]">
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/30">Submenu</span>
                    <button
                        type="button"
                        onClick={toggleExpandAll}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 active:scale-95 shadow-sm"
                        title={isAllExpanded ? "Tutup semua submenu" : "Buka semua submenu"}
                    >
                        {isAllExpanded ? (
                            <>
                                <ChevronsLeftRight size={12} className="text-[#38BDF8]" />
                                <span>Collapse All</span>
                            </>
                        ) : (
                            <>
                                <ChevronsUpDown size={12} className="text-[#00C9A7]" />
                                <span>Expand All</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 pt-4 overflow-y-auto no-scrollbar pb-10 space-y-0.5">
                {filteredMenuItems.map((item: any) => (
                    item.isHeader ? (
                        !isCollapsed && (
                            <div key={item.id} className="px-3 pt-6 pb-2 mt-2 first:mt-0 first:pt-3 border-t first:border-t-0 border-white/[0.06]">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1.5 h-3 rounded-full bg-gradient-to-b from-[#00C9A7] to-[#38BDF8] shadow-[0_0_10px_rgba(0,201,167,0.6)]" />
                                    <span
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#38BDF8]"
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </div>
                        )
                    ) : (
                        <MenuItem
                            key={item.id}
                            item={item}
                            isCollapsed={isCollapsed}
                            isMobile={isMobile}
                            toggleMobileMenu={() => setMobileMenuOpen(false)}
                            openSubmenus={openSubmenus}
                            toggleSubmenu={toggleSubmenu}
                        />
                    )
                ))}
            </nav>

            {/* User Card + Logout */}
            <div
                className="px-3 pb-5 pt-4 mt-auto shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
                {!isCollapsed ? (
                    <div
                        className="flex items-center gap-3 p-3 rounded-xl mb-2"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                        <div
                            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg, #00C9A7, #0099FF)" }}
                        >
                            {(userName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold text-white truncate tracking-tight">{userName || 'System Admin'}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-widest truncate mt-0.5"
                                style={{ color: "rgba(255,255,255,0.3)" }}>
                                {isLoading ? 'SYNCING...' : `${userRole} • ${userDept}`}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center text-xs font-black text-white"
                        style={{ background: "linear-gradient(135deg, #00C9A7, #0099FF)" }}
                    >
                        {(userName || 'A').charAt(0).toUpperCase()}
                    </div>
                )}

                <button
                    onClick={onLogout}
                    className={`flex items-center gap-2.5 rounded-xl transition-all duration-200 group ${
                        isCollapsed
                            ? 'justify-center w-9 h-9 mx-auto'
                            : 'w-full px-3 py-2.5'
                    }`}
                    style={{ color: "rgba(255,255,255,0.3)" }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(239,68,68,0.08)"
                        e.currentTarget.style.color = "#ef4444"
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.color = "rgba(255,255,255,0.3)"
                    }}
                >
                    <LogOut size={16} strokeWidth={2} />
                    {!isCollapsed && (
                        <span className="text-[11px] font-bold uppercase tracking-widest">{t.signOut}</span>
                    )}
                </button>
            </div>
        </>
    )
}

function MenuItem({
    item,
    isCollapsed,
    level = 0,
    isMobile = false,
    toggleMobileMenu,
    openSubmenus,
    toggleSubmenu
}: {
    item: any
    isCollapsed: boolean
    level?: number
    isMobile?: boolean
    toggleMobileMenu?: () => void
    openSubmenus: Record<string, boolean>
    toggleSubmenu: (id: string) => void
}) {
    const pathname = usePathname()
    const [isHovered, setIsHovered] = useState(false)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isActive = pathname === item.path || (item.children?.some((child: any) => pathname === child.path))
    const isOpen = !!openSubmenus[item.id]

    const Icon = item.icon

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        setIsHovered(true)
    }

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false)
        }, 300) // Small delay to allow cursor transition
    }

    return (
        <div
            className="relative group/menu-item"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                onClick={() => {
                    if (item.children) {
                        toggleSubmenu(item.id)
                    } else if (item.path) {
                        if (isMobile && toggleMobileMenu) toggleMobileMenu()
                    }
                }}
                className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative
                    ${isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'mb-0.5'}
                `}
                style={isActive ? {
                    background: "rgba(0,201,167,0.1)",
                    borderLeft: "2px solid #00C9A7",
                    paddingLeft: isCollapsed ? undefined : "10px",
                    color: "#00C9A7",
                } : item.isSpecial ? {
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.18)",
                    color: "#f59e0b",
                } : {
                    color: "rgba(255,255,255,0.45)",
                }}
                onMouseEnter={e => {
                    if (!isActive && !item.isSpecial) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                        e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive && !item.isSpecial) {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.color = "rgba(255,255,255,0.45)"
                    }
                }}
            >
                {Icon && (
                    <div className="relative shrink-0">
                        <Icon size={isCollapsed ? 18 : 16} strokeWidth={isActive ? 2.5 : 2} />
                        {item.children && isCollapsed && (
                            <div
                                className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                                style={{ background: "#00C9A7" }}
                            />
                        )}
                    </div>
                )}

                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1 flex items-center justify-between overflow-hidden"
                        >
                            <span className="font-semibold text-[13px] whitespace-nowrap tracking-tight">{item.label}</span>
                            {item.children && (
                                <ChevronRight
                                    size={13}
                                    className={`transition-transform duration-300 shrink-0 ${
                                        isOpen ? 'rotate-90' : ''
                                    }`}
                                    style={{ color: "rgba(255,255,255,0.2)" }}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop Link Wrapper */}
                {!item.children && item.path && !isMobile && (
                    <Link href={item.path} className="absolute inset-0 z-10" />
                )}
                {!item.children && item.path && isMobile && (
                    <Link href={item.path} onClick={toggleMobileMenu} className="absolute inset-0 z-10" />
                )}
            </div>

            {/* Collapsed Flyout/Tooltip Menu — Dark */}
            {isCollapsed && isHovered && !isMobile && (
                <motion.div
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="fixed left-18.75 z-100 min-w-55 rounded-2xl py-3 px-2 flex flex-col gap-1 pointer-events-auto"
                    style={{
                        top: 'auto',
                        marginTop: '-40px',
                        background: "#161B22",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                    }}
                >
                    {/* Transparent Bridge to maintain hover */}
                    <div className="absolute -left-4 top-0 bottom-0 w-4 bg-transparent" />

                    <div className="px-3 py-2 mb-1 flex items-center justify-between"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="font-bold text-white text-sm tracking-tight">{item.label}</span>
                        {item.icon && <item.icon size={13} style={{ color: "#00C9A7" }} />}
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-[70vh] overflow-y-auto no-scrollbar">
                        {item.children ? (
                            item.children.map((child: any) => (
                                <div key={child.id} className="flex flex-col gap-0.5">
                                    <Link
                                        href={child.path || '#'}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                                        style={{
                                            color: pathname === child.path ? '#00C9A7' : 'rgba(255,255,255,0.55)',
                                            background: pathname === child.path ? 'rgba(0,201,167,0.08)' : 'transparent',
                                            fontWeight: pathname === child.path ? 700 : 500,
                                        }}
                                        onMouseEnter={e => {
                                            if (pathname !== child.path) {
                                                e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                                                e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (pathname !== child.path) {
                                                e.currentTarget.style.background = "transparent"
                                                e.currentTarget.style.color = "rgba(255,255,255,0.55)"
                                            }
                                        }}
                                    >
                                        {child.icon && <child.icon size={15} strokeWidth={pathname === child.path ? 2.5 : 2} />}
                                        <span className="flex-1">{child.label}</span>
                                        {child.children && <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.2)" }} />}
                                    </Link>

                                    {/* Handle Nested Children in Flyout (flattened with indentation) */}
                                    {child.children && (
                                        <div className="ml-4 pl-3 flex flex-col gap-0.5 my-1"
                                            style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                            {child.children.map((subChild: any) => (
                                                <Link
                                                    key={subChild.id}
                                                    href={subChild.path || '#'}
                                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all"
                                                    style={{
                                                        color: pathname === subChild.path ? '#00C9A7' : 'rgba(255,255,255,0.35)',
                                                        fontWeight: pathname === subChild.path ? 700 : 400,
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)" }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = pathname === subChild.path ? '#00C9A7' : "rgba(255,255,255,0.35)" }}
                                                >
                                                    {subChild.icon && <subChild.icon size={13} />}
                                                    <span>{subChild.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-1">
                                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click to open page</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Expanded Submenu — Dark */}
            <AnimatePresence>
                {isOpen && !isCollapsed && item.children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-3 flex flex-col mt-0.5 mb-1 pl-3"
                        style={{ borderLeft: "1px solid rgba(0,201,167,0.2)" }}
                    >
                        {item.children.map((child: any) => (
                            <MenuItem
                                key={child.id}
                                item={child}
                                level={level + 1}
                                isCollapsed={isCollapsed}
                                isMobile={isMobile}
                                toggleMobileMenu={toggleMobileMenu}
                                openSubmenus={openSubmenus}
                                toggleSubmenu={toggleSubmenu}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
