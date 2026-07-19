"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Chart,
  Line,
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  LineController,
  BarController,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { 
  getSalesData, 
  getExpensesData, 
  getInventoryStock, 
  getLowStockItems, 
  getProfitLossReport, 
  getCashFlowReport, 
  getRecentActivity,
  getSalesByCategory
} from "@/lib/api";
import { format } from "date-fns";
import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";


const translations: any = {
  ID: {
    enterpriseDashboard: "Dashboard",
    enterprise: "Enterprise",
    analyticsSubtitle: "Analisis performa bisnis real-time",
    syncDashboard: "Sinkronisasi",
    intelligenceReport: "Laporan Intelijen",
    totalRevenue: "Total Pendapatan",
    grossRevenueDesc: "Pendapatan kotor periode ini",
    operatingExpenses: "Biaya Operasional",
    operationalBurnDesc: "Total biaya operasional",
    stockManagement: "Manajemen Stok",
    activeSKUsDesc: "Total SKU aktif",
    lowStockAlert: "Peringatan Stok Rendah",
    belowMinStockDesc: "Barang di bawah stok minimum",
    critical: "Kritis",
    stable: "Stabil",
    salesPerformance: "Performa Penjualan",
    revenueGrowthDesc: "Pertumbuhan Pendapatan (12 Bulan Terakhir)",
    live: "Langsung",
    expenseAllocation: "Alokasi Biaya",
    operationalCategoriesDesc: "Berdasarkan Kategori Operasional",
    total: "Total",
    revenue: "Pendapatan",
    financialHealthSummary: "Ringkasan Kesehatan Keuangan",
    netProfitMargin: "Margin Laba Bersih",
    expensesCOGS: "Biaya (HPP)",
    cashFlowHealth: "Kesehatan Arus Kas",
    positive: "POSITIF",
    operatingActivities: "Aktivitas Operasi",
    netCashChange: "Perubahan Kas Bersih",
    downloadFullReport: "Unduh Laporan Lengkap",
    stockWatchlist: "Daftar Pantau Stok",
    immediateAttentionDesc: "Barang yang memerlukan perhatian segera",
    viewAll: "Lihat Semua",
    left: "TERSISA",
    min: "Min",
    allStable: "Semua Stabil",
    inventorySafeDesc: "Level inventaris saat ini dalam batas aman.",
    recentActivity: "Aktivitas Terbaru",
    latestTransactionsDesc: "Transaksi & pembaruan bisnis terbaru",
    noRecentActivity: "Tidak ada aktivitas terbaru ditemukan.",
    controlPanel: "Panel Kontrol",
    executeFrequentActions: "Eksekusi tindakan rutin",
    invoice: "Faktur",
    quote: "Penawaran",
    work: "Pekerjaan",
    stock: "Stok",
    efficiencyTip: "Tips Efisiensi",
    efficiencyDesc: 'Gunakan tombol "Sinkronisasi" di atas untuk menyegarkan semua metrik secara instan.',
    salesByCategory: "Performa Penjualan Per Kategori",
    salesByCategoriesDesc: "Berdasarkan Kategori Bisnis",
  },
  EN: {
    enterpriseDashboard: "Dashboard",
    enterprise: "Enterprise",
    analyticsSubtitle: "Real-time business performance analytics",
    syncDashboard: "Sync Dashboard",
    intelligenceReport: "Intelligence Report",
    totalRevenue: "Total Revenue",
    grossRevenueDesc: "Gross revenue this period",
    operatingExpenses: "Operating Expenses",
    operationalBurnDesc: "Total operational burn",
    stockManagement: "Stock Management",
    activeSKUsDesc: "Total active SKUs",
    lowStockAlert: "Low Stock Alert",
    belowMinStockDesc: "Items below minimum stock",
    critical: "Critical",
    stable: "Stable",
    salesPerformance: "Sales Performance",
    revenueGrowthDesc: "Revenue Growth (Last 12 Months)",
    live: "Live",
    expenseAllocation: "Expense Allocation",
    operationalCategoriesDesc: "By Operational Categories",
    total: "Total",
    revenue: "Revenue",
    financialHealthSummary: "Financial Health Summary",
    netProfitMargin: "Net Profit Margin",
    expensesCOGS: "Expenses (COGS)",
    cashFlowHealth: "Cash Flow Health",
    positive: "POSITIVE",
    operatingActivities: "Operating Activities",
    netCashChange: "Net Cash Change",
    downloadFullReport: "Download Full Report",
    stockWatchlist: "Stock Watchlist",
    immediateAttentionDesc: "Items requiring immediate attention",
    viewAll: "View All",
    left: "LEFT",
    min: "Min",
    allStable: "All Stable",
    inventorySafeDesc: "Inventory levels are currently within safe limits.",
    recentActivity: "Recent Activity",
    latestTransactionsDesc: "Latest business transactions & updates",
    noRecentActivity: "No recent activity found.",
    controlPanel: "Control Panel",
    executeFrequentActions: "Execute frequent actions",
    invoice: "Invoice",
    quote: "Quote",
    work: "Work",
    stock: "Stock",
    efficiencyTip: "Efficiency Tip",
    efficiencyDesc: 'Use the "Sync Data" button at the top to refresh all metrics across the command center instantly.',
    salesByCategory: "Sales Performance by Category",
    salesByCategoriesDesc: "By Business Category",
  }
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  LineController,
  BarController
);

const DATE_FORMAT = "yyyy-MM-dd";
const today = new Date();
const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

const startDate = format(oneYearAgo, DATE_FORMAT);
const endDate = format(today, DATE_FORMAT);

interface ActivityItem {
  id: string;
  type: 'INVOICE' | 'QUOTATION' | 'WORK_ORDER' | 'PROPOSAL';
  title: string;
  subtitle: string;
  amount?: number;
  date: Date;
  status: string;
}

interface CashFlowReport {
  operating: { total: number; items: any[] };
  investing: { total: number; items: any[] };
  financing: { total: number; items: any[] };
}

interface ProfitLossReport {
  totalRevenue: number;
  totalCOGS: number;
  netProfit: number;
  revenue: any[];
  cogs: any[];
  expenses: any[];
}

interface SalesData {
  monthlySales: number[];
  months: string[];
  rawData: any[];
}

interface ExpensesData {
  categories: string[];
  amounts: number[];
  rawData: any[];
}

interface DashboardCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ElementType;
  description: string;
  trend?: string;
  trendType?: 'up' | 'down';
  colorClass: string;
}

// Premium animated number counter
function useAnimatedCounter(targetValue: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current || targetValue === 0) return
    hasAnimated.current = true
    const steps = 50
    const increment = targetValue / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= targetValue) {
        setValue(targetValue)
        clearInterval(timer)
      } else {
        setValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [targetValue, duration])

  return value
}

const cardAccents: Record<string, { border: string; icon: string; badge: string; glow: string }> = {
  "bg-teal-500":    { border: "#00C9A7", icon: "rgba(0,201,167,0.12)",  badge: "rgba(0,201,167,0.1)",  glow: "rgba(0,201,167,0.08)" },
  "bg-red-500":     { border: "#ef4444", icon: "rgba(239,68,68,0.10)",   badge: "rgba(239,68,68,0.08)",   glow: "rgba(239,68,68,0.05)" },
  "bg-emerald-500": { border: "#10b981", icon: "rgba(16,185,129,0.12)",  badge: "rgba(16,185,129,0.1)",  glow: "rgba(16,185,129,0.06)" },
  "bg-amber-500":   { border: "#f59e0b", icon: "rgba(245,158,11,0.12)",  badge: "rgba(245,158,11,0.1)",  glow: "rgba(245,158,11,0.06)" },
  "bg-indigo-500":  { border: "#00C9A7", icon: "rgba(0,201,167,0.12)",  badge: "rgba(0,201,167,0.1)",  glow: "rgba(0,201,167,0.06)" },
}

const DashboardCard = ({ title, value, icon: Icon, description, trend, trendType, colorClass }: DashboardCardProps) => {
  const accent = cardAccents[colorClass] || cardAccents["bg-teal-500"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative"
    >
      {/* Gradient border effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{ background: `linear-gradient(135deg, ${accent.border}20, transparent 60%)` }}
      />

      <Card
        className="relative overflow-hidden rounded-2xl border bg-white"
        style={{
          borderColor: `${accent.border}25`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 4px 16px ${accent.glow}`
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${accent.border}, ${accent.border}40)` }}
        />

        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ background: accent.icon }}
            >
              <Icon className="h-4 w-4" style={{ color: accent.border }} strokeWidth={2.5} />
            </div>
            {trend && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black"
                style={{
                  background: trendType === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                  color: trendType === 'up' ? '#10b981' : '#ef4444'
                }}
              >
                {trendType === 'up' ? <ArrowUpRight size={11} className="flex-shrink-0" /> : <ArrowDownRight size={11} className="flex-shrink-0" />}
                {trend}
              </div>
            )}
          </div>

          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5"
              style={{ color: accent.border }}
            >
              {title}
            </p>
            <div
              className="text-xl font-black tracking-tight leading-tight font-financial"
              style={{ color: "#0D1117" }}
            >
              {value}
            </div>
            <p className="text-[11px] font-medium mt-1.5" style={{ color: "#94a3b8" }}>{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
};


export default function DashboardPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.EN;
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'OPERATIONAL') {
      router.push('/dashboard/operational');
    }
  }, [session, status, router]);

  // Fetch data for the dashboard
  const { data: salesData, isLoading: isLoadingSales, refetch: refetchSales } = useQuery<SalesData>({ queryKey: ['salesData'], queryFn: getSalesData });
  const { data: expensesData, isLoading: isLoadingExpenses, refetch: refetchExpenses } = useQuery<ExpensesData>({ queryKey: ['expensesData'], queryFn: getExpensesData });
  const { data: inventoryStock, isLoading: isLoadingInventory, refetch: refetchInventory } = useQuery({ queryKey: ['inventoryStock'], queryFn: getInventoryStock });
  const { data: lowStockItems, isLoading: isLoadingLowStock, refetch: refetchLowStock } = useQuery({ queryKey: ['lowStockItems'], queryFn: getLowStockItems });
  const { data: profitLossReport, isLoading: isLoadingProfitLoss, refetch: refetchProfitLoss } = useQuery<ProfitLossReport>({ queryKey: ['profitLossReport', startDate, endDate], queryFn: () => getProfitLossReport(startDate, endDate) });
  const { data: cashFlowReport, isLoading: isLoadingCashFlow, refetch: refetchCashFlow } = useQuery<CashFlowReport>({ queryKey: ['cashFlowReport', startDate, endDate], queryFn: () => getCashFlowReport(startDate, endDate) });
  const { data: recentActivity, isLoading: isLoadingActivity, refetch: refetchActivity } = useQuery({ queryKey: ['recentActivity'], queryFn: getRecentActivity });
  const { data: categorySales, isLoading: isLoadingCategorySales, refetch: refetchCategorySales } = useQuery({ 
    queryKey: ['salesByCategory', startDate, endDate], 
    queryFn: () => getSalesByCategory(startDate, endDate) 
  });

  const handleRefresh = () => {
    refetchSales();
    refetchExpenses();
    refetchInventory();
    refetchLowStock();
    refetchProfitLoss();
    refetchCashFlow();
    refetchActivity();
    refetchCategorySales();
  };

  const isLoading = isLoadingSales || isLoadingExpenses || isLoadingInventory || isLoadingLowStock || isLoadingProfitLoss || isLoadingCashFlow || isLoadingActivity;

  const safeTotalRevenue = profitLossReport?.totalRevenue || 0;
  const safeTotalCOGS = profitLossReport?.totalCOGS || 0;
  const safeNetProfit = profitLossReport?.netProfit || 0;
  const profitMargin = safeTotalRevenue > 0 ? (safeNetProfit / safeTotalRevenue) * 100 : 0;
  const cogsRatio = safeTotalRevenue > 0 ? (safeTotalCOGS / safeTotalRevenue) * 100 : 0;

  // Chart Configurations
  const salesChartData = useMemo(() => ({
    labels: salesData?.months || [],
    datasets: [
      {
        type: 'line' as const,
        label: t.revenue,
        data: salesData?.monthlySales || [],
        borderColor: '#00C9A7',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#00C9A7',
        pointBorderWidth: 2.5,
        tension: 0.4,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(0, 201, 167, 0.15)');
          gradient.addColorStop(1, 'rgba(0, 201, 167, 0)');
          return gradient;
        },
        order: 1,
      },
      {
        type: 'bar' as const,
        label: 'Volume',
        data: salesData?.monthlySales || [],
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(0, 201, 167, 0.35)');
          gradient.addColorStop(1, 'rgba(0, 201, 167, 0.05)');
          return gradient;
        },
        borderRadius: 12,
        borderWidth: 0,
        barThickness: 32,
        maxBarThickness: 45,
        order: 2,
      },
    ],
  }), [salesData, t.revenue]);

  const expensePieData = useMemo(() => ({
    labels: expensesData?.categories || [],
    datasets: [
      {
        label: t.expenseAllocation,
        data: expensesData?.amounts || [],
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
        ],
        borderWidth: 0,
        hoverOffset: 20,
      },
    ],
  }), [expensesData]);

  const categorySalesPieData = useMemo(() => ({
    labels: categorySales?.map(d => d.category) || [],
    datasets: [
      {
        label: t.salesByCategory,
        data: categorySales?.map(d => d.amount) || [],
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
        ],
        borderWidth: 0,
        hoverOffset: 20,
      },
    ],
  }), [categorySales]);

  if (status === 'loading' || (status === 'authenticated' && (session?.user as any)?.role === 'OPERATIONAL')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(210, 20%, 97%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "linear-gradient(135deg, #00C9A7, #00A589)", boxShadow: "0 0 24px rgba(0,201,167,0.4)" }}
          >
            <TrendingUp size={22} className="text-white" />
          </div>
          <p className="text-[10px] font-black max-w-[120px] text-center uppercase tracking-widest leading-loose" style={{ color: "#94a3b8" }}>
            Syncing Experience...
          </p>
        </div>
      </div>
    );
  }

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 11, weight: 800 as any, family: 'Inter' },
          color: '#64748b'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropBlur: 10,
        padding: 16,
        titleFont: { size: 14, weight: '900' as any, family: 'Inter' },
        bodyFont: { size: 13, weight: '600' as any, family: 'Inter' },
        footerFont: { size: 11, italic: true },
        cornerRadius: 16,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || context.label || '';
            if (label) label += ': ';
            
            // For Bar/Line charts, value is in context.parsed.y
            // For Pie/Doughnut charts, value is in context.parsed
            const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
            
            if (value !== null && value !== undefined) {
              label += new Intl.NumberFormat('id-ID', { 
                style: 'currency', 
                currency: 'IDR', 
                maximumFractionDigits: 0 
              }).format(value);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { weight: 700 as any, size: 11 }, color: '#94a3b8', padding: 10 }
      },
      y: {
        border: { display: false },
        grid: { color: 'rgba(241, 245, 249, 1)', drawTicks: false },
        ticks: {
          font: { weight: 700 as any, size: 10 },
          color: '#94a3b8',
          padding: 15,
          callback: (value: any) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value;
          }
        }
      }
    }
  };

  const getLoadingSpinner = () => (
    <div className="flex justify-center items-center py-4"><RefreshCcw className="animate-spin h-5 w-5" style={{ color: "#00C9A7" }} /></div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 space-y-6 lg:space-y-8" style={{ background: "hsl(210, 20%, 97%)" }}>
      {/* Header Section */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00C9A7, #00A589)", boxShadow: "0 0 20px rgba(0,201,167,0.35)" }}
          >
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight leading-tight" style={{ color: "#0D1117" }}>
              {t.enterprise} <span style={{ color: "#00C9A7" }}>{t.enterpriseDashboard}</span>
            </h1>
            <p className="text-xs font-semibold" style={{ color: "#94a3b8" }}>{t.analyticsSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex-1 lg:flex-none rounded-xl border bg-white shadow-sm transition-all font-black text-[10px] uppercase tracking-widest px-3 lg:px-5 h-10"
            style={{ borderColor: "#e2e8f0", color: "#64748b" }}
          >
            <RefreshCcw size={14} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t.syncDashboard}
          </Button>
          <Button
            className="flex-1 lg:flex-none rounded-xl text-white font-black text-[10px] uppercase tracking-widest px-3 lg:px-7 h-10 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #00C9A7, #00A589)", boxShadow: "0 8px 20px rgba(0,201,167,0.35)" }}
          >
            {t.intelligenceReport}
          </Button>
        </div>
      </motion.header>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <DashboardCard
          title={t.totalRevenue}
          value={isLoadingSales ? getLoadingSpinner() : `Rp ${((salesData?.rawData as any[]) || []).reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0).toLocaleString()}`}
          icon={DollarSign}
          description={t.grossRevenueDesc}
          trend="+12.5%"
          trendType="up"
          colorClass="bg-teal-500"
        />
        <DashboardCard
          title={t.operatingExpenses}
          value={isLoadingExpenses ? getLoadingSpinner() : `Rp ${((expensesData?.rawData as any[]) || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0).toLocaleString()}`}
          icon={ShoppingCart}
          description={t.operationalBurnDesc}
          trend="-2.4%"
          trendType="down"
          colorClass="bg-red-500"
        />
        <DashboardCard
          title={t.stockManagement}
          value={isLoadingInventory ? getLoadingSpinner() : (inventoryStock?.length || 0).toLocaleString()}
          icon={Package}
          description={t.activeSKUsDesc}
          colorClass="bg-emerald-500"
        />
        <DashboardCard
          title={t.lowStockAlert}
          value={isLoadingLowStock ? getLoadingSpinner() : (lowStockItems?.length || 0).toLocaleString()}
          icon={ShieldAlert}
          description={t.belowMinStockDesc}
          trend={lowStockItems?.length > 5 ? t.critical : t.stable}
          trendType={lowStockItems?.length > 5 ? "down" : "up"}
          colorClass="bg-amber-500"
        />
      </div>



      {/* Analytics & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sales Performance Chart */}
        <Card className="lg:col-span-2 border shadow-lg rounded-2xl bg-white overflow-hidden" style={{ borderColor: "rgba(0,201,167,0.12)" }}>
          <CardHeader className="p-4 lg:p-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black tracking-tight" style={{ color: "#0D1117" }}>{t.salesPerformance}</CardTitle>
              <p className="text-[10px] font-bold mt-1 uppercase tracking-[0.2em]" style={{ color: "#94a3b8" }}>{t.revenueGrowthDesc}</p>
            </div>
            <div className="flex">
              <span
                className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full"
                style={{ color: "#00C9A7", background: "rgba(0,201,167,0.1)" }}
              >
                <Activity size={13} /> {t.live}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-3">
            <div className="h-[250px] lg:h-[320px] w-full">
              <Chart type="bar" data={salesChartData as any} options={{
                ...commonOptions,
                plugins: {
                  ...commonOptions.plugins,
                  legend: {
                    ...commonOptions.plugins.legend,
                    display: typeof window !== 'undefined' && window.innerWidth > 640
                  }
                }
              } as any} />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Breakdown */}
        <Card className="border-none shadow-xl rounded-2xl bg-white">
          <CardHeader className="p-4 lg:p-6 pb-3">
            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{t.expenseAllocation}</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">{t.operationalCategoriesDesc}</p>
          </CardHeader>
          <CardContent className="p-6 lg:p-8 pt-4 flex flex-col items-center justify-center">
            <div className="h-[210px] w-full relative">
              <Doughnut
                data={expensePieData}
                options={{
                  ...commonOptions,
                  cutout: '75%',
                  plugins: { ...commonOptions.plugins, legend: { display: false } },
                  scales: { x: { display: false }, y: { display: false } }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t.total}</p>
                <p className="text-sm font-black text-slate-900 truncate w-full">
                  Rp {((expensesData?.amounts || []).reduce((a: number, b: number) => a + (Number(b) || 0), 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
            <div className="mt-6 w-full space-y-2">
              {(expensesData?.categories || []).slice(0, 3).map((cat: string, i: number) => (
                <div key={cat} className="flex items-center justify-between text-[10px] font-black">
                  <span className="flex items-center gap-2 text-slate-500 truncate pr-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: expensePieData.datasets[0].backgroundColor[i] }} />
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="text-slate-900 font-black whitespace-nowrap">
                    Rp {((expensesData?.amounts?.[i] || 0) / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category Breakdown */}
        <Card className="border-none shadow-xl rounded-2xl bg-indigo-600 text-white">
          <CardHeader className="p-4 lg:p-6 pb-3">
            <CardTitle className="text-lg font-black tracking-tight">{t.salesByCategory}</CardTitle>
            <p className="text-[10px] font-bold text-indigo-200 mt-1 uppercase tracking-[0.2em]">{t.salesByCategoriesDesc}</p>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-3 flex flex-col items-center justify-center">
            <div className="h-[180px] w-full relative">
              <Doughnut
                data={categorySalesPieData}
                options={{
                  ...commonOptions,
                  cutout: '75%',
                  plugins: { 
                    ...commonOptions.plugins, 
                    legend: { display: false },
                    tooltip: {
                      ...commonOptions.plugins.tooltip,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1e293b',
                      bodyColor: '#475569',
                    }
                  },
                  scales: { x: { display: false }, y: { display: false } }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest leading-none mb-1">{t.total}</p>
                <p className="text-sm font-black text-white truncate w-full">
                  Rp {(((categorySales || []).reduce((a, b) => a + b.amount, 0)) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
            <div className="mt-6 w-full space-y-2">
              {(categorySales || []).slice(0, 3).map((item, i) => (
                <div key={item.category} className="flex items-center justify-between text-[10px] font-black">
                  <span className="flex items-center gap-2 text-indigo-200 truncate pr-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categorySalesPieData.datasets[0].backgroundColor[i] }} />
                    <span className="truncate">{item.category}</span>
                  </span>
                  <span className="text-white font-black whitespace-nowrap">Rp {(item.amount / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Reports & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <Card className="border-none shadow-xl rounded-2xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="p-4 lg:p-6 pb-3">
            <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <Layers size={20} className="text-indigo-400" />
              {t.financialHealthSummary}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0 flex flex-col md:flex-row gap-8 lg:gap-10">
            <div className="flex-1 space-y-6">
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="text-indigo-400" size={40} />
                </div>
                <p className="text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-[0.2em]">{t.netProfitMargin}</p>
                <div className="flex items-end justify-between relative z-10">
                  <h3 className="text-2xl lg:text-4xl font-black tracking-tighter text-white">
                    Rp {safeNetProfit.toLocaleString()}
                  </h3>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black ${safeNetProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {safeNetProfit >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.revenue}</p>
                  <p className="text-base lg:text-lg font-black text-white">Rp {safeTotalRevenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.expensesCOGS}</p>
                  <p className="text-base lg:text-lg font-black text-red-400">Rp {safeTotalCOGS.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.cashFlowHealth}</p>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{t.positive}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-400 uppercase">{t.operatingActivities}</span>
                      <span className="text-sm font-black text-white">
                        Rp {cashFlowReport?.operating?.total?.toLocaleString() ?? '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-400 uppercase">{t.netCashChange}</span>
                      <span className="text-sm font-black text-indigo-400">
                        Rp {((cashFlowReport?.operating?.total || 0) + (cashFlowReport?.investing?.total || 0) + (cashFlowReport?.financing?.total || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/dashboard/finance/reports" className="flex items-center justify-center gap-3 w-full py-4 mt-8 rounded-2xl bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/5">
                {t.downloadFullReport} <ArrowRight size={16} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Watchlist */}
        <Card className="border-none shadow-xl rounded-2xl bg-white">
          <CardHeader className="p-6 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{t.stockWatchlist}</CardTitle>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">{t.immediateAttentionDesc}</p>
            </div>
            <Link href="/dashboard/inventory" className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">
              {t.viewAll}
            </Link>
          </CardHeader>
          <CardContent className="p-6 pt-0 pb-6">
            {isLoadingLowStock ? getLoadingSpinner() : (
              <div className="space-y-3">
                {lowStockItems?.length > 0 ? (
                  lowStockItems.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-400 uppercase">
                          {(item.name || item.product?.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-none mb-1">{item.name || item.product?.name || 'Unknown Item'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.code || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-red-500">{item.totalQty || item.stock || 0} {t.left}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.min}: {item.minStock || 0}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                      <ShieldAlert size={32} />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{t.allStable}</h4>
                    <p className="text-xs text-slate-500 font-medium">{t.inventorySafeDesc}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Row: Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl bg-white overflow-hidden">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{t.recentActivity}</CardTitle>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] font-mono">{t.latestUpdatesDesc}</p>
          </CardHeader>
          <CardContent className="p-6 pt-3">
            {isLoadingActivity ? getLoadingSpinner() : (
              <div className="space-y-4 lg:space-y-6">
                {recentActivity && recentActivity.length > 0 ? (
                  (recentActivity as ActivityItem[]).map((activity, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-4 p-2 group hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      <div className={`p-3 rounded-2xl flex-shrink-0 ${activity.type === 'INVOICE' ? 'bg-indigo-50 text-indigo-600' :
                        activity.type === 'QUOTATION' ? 'bg-emerald-50 text-emerald-600' :
                          activity.type === 'WORK_ORDER' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-50 text-slate-600'
                        }`}>
                        {activity.type === 'INVOICE' && <DollarSign size={18} />}
                        {activity.type === 'QUOTATION' && <ArrowUpRight size={18} />}
                        {activity.type === 'WORK_ORDER' && <Activity size={18} />}
                        {activity.type === 'PROPOSAL' && <Layers size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-black text-slate-900 truncate pr-2">{activity.title}</p>
                          <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">{format(activity.date, 'HH:mm • MMM d')}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">{activity.subtitle}</p>
                        {activity.amount && (
                          <p className="text-xs font-black text-indigo-600 mt-1.5">Rp {activity.amount.toLocaleString()}</p>
                        )}
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${['PAID', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(activity.status) ? 'bg-emerald-100 text-emerald-700' :
                        ['DRAFT', 'PENDING'].includes(activity.status) ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {activity.status}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Activity size={24} className="text-slate-200" />
                    </div>
                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{t.noRecentActivity}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="border-none shadow-xl rounded-2xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              {t.controlPanel}
            </CardTitle>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-[0.2em]">{t.executeFrequentActions}</p>
          </CardHeader>
          <CardContent className="p-6 pt-4 pb-10">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t.invoice, icon: DollarSign, color: 'bg-white/5', hoverColor: 'hover:bg-indigo-600/30', iconColor: 'text-indigo-400', href: '/dashboard/finance/invoices' },
                { label: t.quote, icon: ArrowUpRight, color: 'bg-indigo-600/20', hoverColor: 'hover:bg-indigo-600/40', iconColor: 'text-indigo-300', href: '/dashboard/sales/quotations' },
                { label: t.work, icon: Activity, color: 'bg-white/5', hoverColor: 'hover:bg-indigo-600/30', iconColor: 'text-indigo-400', href: '/dashboard/operations/work-orders' },
                { label: t.stock, icon: Package, color: 'bg-white/5', hoverColor: 'hover:bg-indigo-600/30', iconColor: 'text-indigo-400', href: '/dashboard/inventory' },
              ].map((action) => (
                <Link key={action.label} href={action.href} className="h-full">
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${action.color} ${action.hoverColor} backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-white/5 transition-all text-center h-full group pointer-events-auto`}
                  >
                    <div className="p-3 rounded-xl bg-slate-800/50 group-hover:bg-indigo-500 transition-all duration-300 shadow-lg group-hover:shadow-indigo-500/20">
                      <action.icon size={20} className={`${action.iconColor} group-hover:text-white transition-colors`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
