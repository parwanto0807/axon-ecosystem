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
    LogOut
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useLanguage } from "@/context/LanguageContext"

const translations: any = {
    ID: {
        overview: 'Dashboard',
        masterData: 'Data Master',
        products: 'Produk',
        customers: 'Pelanggan',
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
        openingBalances: 'Saldo Awal',
        operationalApprovals: 'Persetujuan Ops',
        accountabilityReports: 'Laporan Pertanggungjawaban',
        systemSettings: 'Pengaturan Sistem',
        hrManagement: 'Manajemen SDM',
        employeeData: 'Data Karyawan',
        payrollSystem: 'Sistem Payroll',
        preferences: 'Preferensi',
        userManagement: 'Manajemen Pengguna',
        signOut: 'Keluar'
    },
    EN: {
        overview: 'Overview',
        masterData: 'Master Data',
        products: 'Products',
        customers: 'Customers',
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
        openingBalances: 'Opening Balances',
        operationalApprovals: 'Operational Approvals',
        accountabilityReports: 'Accountability Reports',
        systemSettings: 'System Settings',
        hrManagement: 'HR Management',
        employeeData: 'Employee Data',
        payrollSystem: 'Payroll System',
        preferences: 'Preferences',
        userManagement: 'User Management',
        signOut: 'Sign Out'
    }
}

const getMenuItems = (t: any) => [
    {
        id: 'core',
        label: 'Core Ecosystem',
        isHeader: true
    },
    { id: 'dashboard', icon: LayoutDashboard, label: t.overview, path: '/dashboard' },
    {
        id: 'master', icon: Database, label: t.masterData, children: [
            { id: 'products', label: t.products, path: '/dashboard/management/products', icon: Package },
            { id: 'customers', label: t.customers, path: '/dashboard/management/customers', icon: Users },
            { id: 'vendors', label: t.vendors, path: '/dashboard/purchasing/vendors', icon: Building2 },
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
            { id: 'work-orders', icon: Wrench, label: t.workOrders, path: '/dashboard/operations/work-orders' },
            { id: 'reports', icon: Activity, label: t.progressReports, path: '/dashboard/operations/reports' },
            { id: 'delivery-orders', icon: PackageCheck, label: t.deliveryOrders, path: '/dashboard/operations/delivery-orders' },
            { id: 'bast', icon: ClipboardCheck, label: t.beritaAcara, path: '/dashboard/operations/bast' },
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
                    { id: 'ledger', label: t.generalLedger, icon: BookOpen, path: '/dashboard/finance/reports/ledger' },
                    { id: 'balance-sheet', label: t.balanceSheet, icon: PieChart, path: '/dashboard/finance/reports/balance-sheet' },
                    { id: 'profit-loss', label: t.profitLoss, icon: TrendingUp, path: '/dashboard/finance/reports/profit-loss' },
                    { id: 'cash-flow', label: t.cashFlow, icon: Waves, path: '/dashboard/finance/reports/cash-flow' },
                    { id: 'forecast', label: t.cashProjection, icon: BarChart3, path: '/dashboard/finance/reports/cash-flow-forecast' },
                ]
            },
            { id: 'coa', icon: TableProperties, label: t.coa, path: '/dashboard/finance/coa' },
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
        ]
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

    const isLoading = status === 'loading'

    const filteredMenuItems = menuItems.filter(item => {
        // If loading, show only items with no restrictions
        if (isLoading) {
            return !item.requiredRoles && !item.requiredDepartment
        }

        // Super Admin and Admin see everything
        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return true

        // Check Roles
        if (item.requiredRoles && !item.requiredRoles.includes(userRole)) return false

        // Check Department
        if (item.requiredDepartment && !item.requiredDepartment.includes(userDept)) return false

        return true
    })

    return (
        <>
            {/* Desktop Sidebar */}
            <motion.div
                animate={{
                    width: isCollapsed ? 80 : 280,
                    x: 0
                }}
                className="hidden lg:flex fixed left-0 top-0 bottom-0 glass border-r border-border/40 z-50 flex-col transition-all duration-300 shadow-2xl shadow-indigo-500/5"
            >
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

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-white z-[101] flex flex-col shadow-2xl"
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

    return (
        <>
            <div className={`p-8 flex items-center justify-between ${isMobile ? 'border-b border-slate-100 bg-slate-50/50 mb-4' : ''}`}>
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                                <BarChart3 className="text-white w-5 h-5" />
                                {isLoading && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="absolute inset-0 border-2 border-white/20 border-t-white rounded-xl"
                                    />
                                )}
                            </div>
                            <span className="font-black text-2xl tracking-tighter text-slate-900">AXON</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {isMobile ? (
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center"
                    >
                        <ChevronLeft size={20} />
                    </button>
                ) : (
                    <button
                        onClick={toggleSidebar}
                        className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                    >
                        {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                    </button>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-10">
                {filteredMenuItems.map((item: any) => (
                    item.isHeader ? (
                        !isCollapsed && (
                            <div key={item.id} className="px-4 pt-6 pb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</span>
                            </div>
                        )
                    ) : (
                        <MenuItem 
                            key={item.id} 
                            item={item} 
                            isCollapsed={isCollapsed} 
                            isMobile={isMobile}
                            toggleMobileMenu={() => setMobileMenuOpen(false)}
                        />
                    )
                ))}
            </nav>

            <div className={`p-6 mt-auto ${isCollapsed ? 'items-center flex flex-col gap-4' : ''}`}>
                <div className={`p-4 rounded-3xl flex items-center gap-3 border border-slate-100 bg-slate-50/50 ${isCollapsed ? 'justify-center w-12 h-12 p-0 overflow-hidden' : 'w-full'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white flex-shrink-0 shadow-sm" />
                    {!isCollapsed && (
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{userName || 'System Admin'}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest mt-0.5">
                                {isLoading ? 'SYNCING...' : `${userRole} • ${userDept}`}
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    className={`
                        flex items-center gap-3 p-4 rounded-3xl transition-all duration-200 group mt-4
                        ${isCollapsed
                            ? 'justify-center w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100'
                            : 'w-full text-slate-400 hover:text-red-600 hover:bg-red-50 font-black'}
                    `}
                >
                    <LogOut size={isCollapsed ? 20 : 20} />
                    {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">{t.signOut}</span>}
                </button>
            </div>
        </>
    )
}

function MenuItem({ item, isCollapsed, level = 0, isMobile = false, toggleMobileMenu }: { item: any, isCollapsed: boolean, level?: number, isMobile?: boolean, toggleMobileMenu?: () => void }) {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isActive = pathname === item.path || (item.children?.some((child: any) => pathname === child.path))

    // Handle initial state for submenus
    useEffect(() => {
        if (!isCollapsed && isActive) setIsOpen(true)
    }, [isCollapsed, isActive])

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
                        setIsOpen(!isOpen)
                    } else if (item.path) {
                        if (isMobile && toggleMobileMenu) toggleMobileMenu()
                    }
                }}
                className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200
                    ${isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active-scale'
                        : item.isSpecial
                            ? 'bg-amber-500/10 text-amber-600 font-black border border-amber-500/20 hover:bg-amber-500/20'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
                    ${isCollapsed ? 'justify-center px-0 h-11 w-11 mx-auto' : 'mb-1'}
                `}
            >
                {Icon && (
                    <div className="relative">
                        <Icon size={isCollapsed ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
                        {item.children && isCollapsed && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 border border-white" />
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
                            <span className="font-semibold text-[13.5px] whitespace-nowrap tracking-tight">{item.label}</span>
                            {item.children && (
                                <ChevronRight
                                    size={14}
                                    className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
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

            {/* Collapsed Flyout/Tooltip Menu */}
            {isCollapsed && isHovered && !isMobile && (
                <motion.div
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="fixed left-[75px] z-[100] min-w-[220px] bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 flex flex-col gap-1 pointer-events-auto"
                    style={{
                        top: 'auto',
                        marginTop: '-44px'
                    }}
                >
                    {/* Transparent Bridge to maintain hover */}
                    <div className="absolute -left-4 top-0 bottom-0 w-4 bg-transparent" />

                    <div className="px-3 py-2 mb-1 border-b border-slate-50 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm tracking-tight">{item.label}</span>
                        {item.icon && <item.icon size={14} className="text-slate-300" />}
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-[70vh] overflow-y-auto no-scrollbar">
                        {item.children ? (
                            item.children.map((child: any) => (
                                <div key={child.id} className="flex flex-col gap-0.5">
                                    <Link
                                        href={child.path || '#'}
                                        className={`
                                            flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                                            ${pathname === child.path
                                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
                                        `}
                                    >
                                        {child.icon && <child.icon size={16} strokeWidth={pathname === child.path ? 2.5 : 2} />}
                                        <span className="flex-1">{child.label}</span>
                                        {child.children && <ChevronRight size={12} className="text-slate-300" />}
                                    </Link>

                                    {/* Handle Nested Children in Flyout (flattened with indentation) */}
                                    {child.children && (
                                        <div className="ml-4 pl-3 border-l border-slate-100 flex flex-col gap-0.5 my-1">
                                            {child.children.map((subChild: any) => (
                                                <Link
                                                    key={subChild.id}
                                                    href={subChild.path || '#'}
                                                    className={`
                                                        flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all
                                                        ${pathname === subChild.path
                                                            ? 'text-indigo-700 font-bold'
                                                            : 'text-slate-400 hover:text-indigo-500'}
                                                    `}
                                                >
                                                    {subChild.icon && <subChild.icon size={14} />}
                                                    <span>{subChild.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-1">
                                <span className="text-xs text-slate-400">Click to open page</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Expanded Submenu */}
            <AnimatePresence>
                {isOpen && !isCollapsed && item.children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-4 flex flex-col border-l border-slate-100 mt-1 mb-2"
                    >
                        {item.children.map((child: any) => (
                            <MenuItem
                                key={child.id}
                                item={child}
                                level={level + 1}
                                isCollapsed={isCollapsed}
                                isMobile={isMobile}
                                toggleMobileMenu={toggleMobileMenu}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
