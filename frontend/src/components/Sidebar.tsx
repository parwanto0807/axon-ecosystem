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
    Network,
    GitBranch
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
        salesRecap: 'Rekap Penagihan',
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
        investorLoans: 'Pinjaman Investor',
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
        development: 'Development',
        developmentPlanning: 'Planning & Progress',
        itMaintenance: 'IT Maintenance',
        itOsl: 'IT-OSL Service Log',
        dashboardOsl: 'Dashboard OSL',
        ticketsOsl: 'Tiket & Quick-Log',
        assetRegistry: 'Registri Aset + QR',
        picDirectory: 'Direktori PIC',
        pmChecklist: 'PM Checklist',
        handover: 'Serah Terima Shift',
        oslReports: 'Laporan OSL',
        masterOsl: 'Master OSL',
        checklistDaily: 'Checklist Harian',
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
        salesRecap: 'Billing Recap',
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
        investorLoans: 'Investor Loans',
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
        development: 'Development',
        developmentPlanning: 'Planning & Progress',
        itMaintenance: 'IT Maintenance',
        itOsl: 'IT-OSL Service Log',
        dashboardOsl: 'Dashboard OSL',
        ticketsOsl: 'Tickets & Quick-Log',
        assetRegistry: 'Asset Registry + QR',
        picDirectory: 'PIC Directory',
        pmChecklist: 'PM Checklist',
        handover: 'Shift Handover',
        oslReports: 'OSL Reports',
        masterOsl: 'OSL Master',
        checklistDaily: 'Daily Checklist',
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
        requiredDepartment: ['SALES', 'FINANCE']
    },
    {
        id: 'sales',
        icon: ShoppingCart,
        label: t.salesPipeline,
        requiredDepartment: ['SALES', 'FINANCE'],
        children: [
            { id: 'quotations', icon: FileText, label: t.quotations, path: '/dashboard/sales/quotations', requiredDepartment: ['SALES'] },
            { id: 'orders', icon: ShoppingBag, label: t.salesOrders, path: '/dashboard/sales/orders', requiredDepartment: ['SALES'] },
            { id: 'monitoring', icon: BarChart3, label: t.salesRecap, path: '/dashboard/sales/monitoring', requiredDepartment: ['SALES', 'FINANCE'] },
            { id: 'projects', icon: Briefcase, label: t.projects, path: '/dashboard/sales/projects', requiredDepartment: ['SALES'] },
            { id: 'surveys', icon: MapPin, label: t.surveys, path: '/dashboard/sales/surveys', requiredDepartment: ['SALES'] },
            { id: 'proposals', icon: ClipboardList, label: t.proposals, path: '/dashboard/sales/proposals', requiredDepartment: ['SALES'] },
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
            { id: 'coa', icon: TableProperties, label: t.coa, path: '/dashboard/finance/coa' },
            { id: 'banks', icon: Landmark, label: t.bankAccounts, path: '/dashboard/finance/banks' },
            { id: 'opening-balances', icon: LayoutGrid, label: t.openingBalances, path: '/dashboard/finance/opening-balances' },
            { id: 'system-accounts', icon: Settings, label: t.systemSettings, path: '/dashboard/finance/system-accounts' },
            { id: 'invoices', icon: Receipt, label: t.customerInvoices, path: '/dashboard/finance/invoices' },
            { id: 'operational-expenses', icon: Wallet, label: t.operationalCosts, path: '/dashboard/finance/operational-expenses' },
            { id: 'approvals', icon: ShieldCheck, label: t.operationalApprovals, path: '/dashboard/finance/approvals' },
            { id: 'expense-reports', icon: Receipt, label: t.accountabilityReports, path: '/dashboard/finance/expenses' },
            { id: 'investor-loans', icon: Landmark, label: t.investorLoans, path: '/dashboard/finance/investor-loans' },
            { id: 'journals', icon: BookOpen, label: t.journals, path: '/dashboard/finance/journals' },
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
        id: 'development-group',
        label: t.development,
        isHeader: true,
    },
    {
        id: 'development',
        icon: GitBranch,
        label: t.development,
        children: [
            { id: 'dev-planning', icon: Calendar, label: t.developmentPlanning, path: '/dashboard/development' },
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
        label: t.itMaintenance,
        children: [
            { id: 'it-osl-dashboard', icon: BarChart3, label: t.dashboardOsl, path: '/dashboard/maintenance/it-osl', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-customers', icon: Building2, label: 'Data Customer (B2B)', path: '/dashboard/maintenance/it-osl/customers', requiredRoles: ['SUPER_ADMIN'] },
            { id: 'it-osl-tickets', icon: ClipboardList, label: t.ticketsOsl, path: '/dashboard/maintenance/it-osl/tickets', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-assets', icon: Database, label: t.assetRegistry, path: '/dashboard/maintenance/it-osl/assets', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-pics', icon: Users, label: t.picDirectory, path: '/dashboard/maintenance/it-osl/pics', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-pm', icon: Calendar, label: t.pmChecklist, path: '/dashboard/maintenance/it-osl/pm', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-handovers', icon: ArrowLeftRight, label: t.handover, path: '/dashboard/maintenance/it-osl/handovers', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-reports', icon: FileText, label: t.oslReports, path: '/dashboard/maintenance/it-osl/reports', requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'] },
            { id: 'it-osl-settings', icon: Settings, label: t.masterOsl, path: '/dashboard/maintenance/it-osl/settings', requiredRoles: ['ADMIN', 'SUPER_ADMIN'] },
            { id: 'it-checklist', icon: ClipboardList, label: t.checklistDaily, path: '/dashboard/maintenance' },
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
            {/* Desktop Sidebar — Technical Engineering Console */}
            <motion.div
                animate={{
                    width: isCollapsed ? 64 : 228,
                    x: 0
                }}
                className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col transition-all duration-200"
                style={{
                    background: "#06090e",
                    borderRight: "1px solid #161f2e",
                    boxShadow: "none"
                }}
            >
                {/* Floating Desktop Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-5 w-6 h-6 flex items-center justify-center rounded-md z-50 transition-colors shadow-xs border text-slate-400 hover:text-white"
                    style={{
                        background: "#0d131f",
                        borderColor: "#1e293b",
                    }}
                    title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
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
                    isCollapsed ? 'px-2.5 py-3 justify-center' : 'px-3 py-3'
                }`}
                style={{ borderBottom: "1px solid #161f2e" }}
            >
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-xs">
                                <Cpu className="w-3.5 h-3.5" strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 leading-none">
                                    <span className="font-bold text-xs tracking-tight text-white">AXON<span className="text-blue-500">.CORE</span></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <span className="font-mono text-[8px] text-slate-400 tracking-wider mt-0.5">
                                    {isLoading ? 'SYNCING...' : 'ENTERPRISE OS // v2.4'}
                                </span>
                            </div>
                        </motion.div>
                    )}
                    {isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white"
                        >
                            <Cpu className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {isMobile && (
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft size={15} />
                    </button>
                )}
            </div>

            {/* Command Palette Trigger */}
            <div className={`shrink-0 ${isCollapsed ? 'px-1.5 py-1.5 flex justify-center' : 'px-2.5 py-1.5'}`}
                style={{ borderBottom: '1px solid #161f2e' }}>
                <CommandPaletteTrigger isCollapsed={isCollapsed} />
            </div>

            {/* Expand / Collapse All Toggle Button */}
            {!isCollapsed && (
                <div className="px-3 py-1 flex items-center justify-between gap-1 shrink-0 border-b border-slate-800/80 bg-slate-950/40">
                    <span className="text-[8.5px] font-mono uppercase tracking-widest text-slate-400">NAVIGATION</span>
                    <button
                        type="button"
                        onClick={toggleExpandAll}
                        className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono transition-colors text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700"
                        title={isAllExpanded ? "Collapse all submenus" : "Expand all submenus"}
                    >
                        {isAllExpanded ? (
                            <>
                                <ChevronsLeftRight size={9} className="text-slate-400" />
                                <span>COLLAPSE</span>
                            </>
                        ) : (
                            <>
                                <ChevronsUpDown size={9} className="text-blue-400" />
                                <span>EXPAND</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-2 pt-2 overflow-y-auto no-scrollbar pb-6 space-y-0.5">
                {filteredMenuItems.map((item: any) => (
                    item.isHeader ? (
                        !isCollapsed && (
                            <div key={item.id} className="px-2 pt-2.5 pb-0.5 mt-0.5 first:mt-0 first:pt-0.5 border-t first:border-t-0 border-slate-800/60">
                                <span className="text-[8.5px] font-mono tracking-widest text-slate-400 uppercase">
                                    // {item.label}
                                </span>
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

            {/* Operator Card + Logout */}
            <div
                className="px-2.5 py-2 mt-auto shrink-0 bg-[#080d14]"
                style={{ borderTop: "1px solid #161f2e" }}
            >
                {!isCollapsed ? (
                    <div className="flex items-center gap-2 p-1.5 rounded mb-1 bg-slate-900/60 border border-slate-800/80">
                        <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-[10px] font-mono font-bold text-slate-300">
                            {(userName || 'O').charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-[11px] font-semibold text-slate-200 truncate leading-tight">{userName || 'Operator'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[8.5px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                    {userRole}
                                </span>
                                <span className="text-slate-600 text-[8.5px]">•</span>
                                <span className="font-mono text-[8.5px] text-slate-400 uppercase">{userDept}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded mx-auto mb-1.5 bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-slate-300" title={`${userName} (${userRole})`}>
                        {(userName || 'O').charAt(0).toUpperCase()}
                    </div>
                )}

                <button
                    onClick={onLogout}
                    className={`flex items-center gap-1.5 rounded transition-colors text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 ${
                        isCollapsed
                            ? 'justify-center w-7 h-7 mx-auto'
                            : 'w-full px-2 py-1 text-[10px] font-mono'
                    }`}
                    title="Exit Console"
                >
                    <LogOut size={12} />
                    {!isCollapsed && (
                        <span>DISCONNECT</span>
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
                    flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors duration-150 relative
                    ${isCollapsed ? 'justify-center px-0 h-8 w-8 mx-auto' : 'mb-0.5'}
                `}
                style={isActive ? {
                    background: "rgba(37, 99, 235, 0.14)",
                    borderLeft: "2px solid #3b82f6",
                    paddingLeft: isCollapsed ? undefined : "6px",
                    color: "#93c5fd",
                } : item.isSpecial ? {
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    color: "#fbbf24",
                } : {
                    color: "#94a3b8",
                }}
                onMouseEnter={e => {
                    if (!isActive && !item.isSpecial) {
                        e.currentTarget.style.background = "#0f172a"
                        e.currentTarget.style.color = "#f8fafc"
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive && !item.isSpecial) {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.color = "#94a3b8"
                    }
                }}
            >
                {Icon && (
                    <div className="relative shrink-0">
                        <Icon size={isCollapsed ? 15 : 13.5} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.children && isCollapsed && (
                            <div
                                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"
                            />
                        )}
                    </div>
                )}

                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            className="flex-1 flex items-center justify-between overflow-hidden"
                        >
                            <span className="font-medium text-[11.5px] whitespace-nowrap tracking-tight">{item.label}</span>
                            {item.children && (
                                <ChevronRight
                                    size={10.5}
                                    className={`transition-transform duration-200 shrink-0 ${
                                        isOpen ? 'rotate-90 text-blue-400' : 'text-slate-600'
                                    }`}
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

            {/* Collapsed Flyout/Tooltip Menu — Dark Console */}
            {isCollapsed && isHovered && !isMobile && (
                <motion.div
                    initial={{ opacity: 0, x: 8, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="fixed left-[76px] z-100 min-w-56 rounded-md py-2 px-1.5 flex flex-col gap-0.5 pointer-events-auto"
                    style={{
                        top: 'auto',
                        marginTop: '-36px',
                        background: "#0b0f17",
                        border: "1px solid #1e293b",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
                    }}
                >
                    {/* Transparent Bridge to maintain hover */}
                    <div className="absolute -left-4 top-0 bottom-0 w-4 bg-transparent" />

                    <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between border-b border-slate-800">
                        <span className="font-semibold text-white text-xs tracking-tight">{item.label}</span>
                        {item.icon && <item.icon size={13} className="text-blue-400" />}
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-[70vh] overflow-y-auto no-scrollbar">
                        {item.children ? (
                            item.children.map((child: any) => (
                                <div key={child.id} className="flex flex-col gap-0.5">
                                    <Link
                                        href={child.path || '#'}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors"
                                        style={{
                                            color: pathname === child.path ? '#93c5fd' : '#94a3b8',
                                            background: pathname === child.path ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                            fontWeight: pathname === child.path ? 600 : 400,
                                        }}
                                        onMouseEnter={e => {
                                            if (pathname !== child.path) {
                                                e.currentTarget.style.background = "#141c2b"
                                                e.currentTarget.style.color = "#f8fafc"
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (pathname !== child.path) {
                                                e.currentTarget.style.background = "transparent"
                                                e.currentTarget.style.color = "#94a3b8"
                                            }
                                        }}
                                    >
                                        {child.icon && <child.icon size={13} />}
                                        <span className="flex-1">{child.label}</span>
                                        {child.children && <ChevronRight size={10} className="text-slate-600" />}
                                    </Link>

                                    {/* Handle Nested Children in Flyout (flattened with indentation) */}
                                    {child.children && (
                                        <div className="ml-3 pl-2.5 flex flex-col gap-0.5 my-0.5 border-l border-slate-800">
                                            {child.children.map((subChild: any) => (
                                                <Link
                                                    key={subChild.id}
                                                    href={subChild.path || '#'}
                                                    className="flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors"
                                                    style={{
                                                        color: pathname === subChild.path ? '#93c5fd' : '#64748b',
                                                        fontWeight: pathname === subChild.path ? 600 : 400,
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = "#f8fafc" }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = pathname === subChild.path ? '#93c5fd' : "#64748b" }}
                                                >
                                                    {subChild.icon && <subChild.icon size={12} />}
                                                    <span>{subChild.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-2.5 py-1">
                                <span className="text-[11px] text-slate-500 font-mono">Open console view</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Expanded Submenu — Dark Console */}
            <AnimatePresence>
                {isOpen && !isCollapsed && item.children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-3 flex flex-col mt-0.5 mb-1 pl-2.5 border-l border-slate-800"
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
