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
  MapPin,
} from "lucide-react";
import { 
  getSalesData, 
  getSalesOrderData,
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
    plannedSurveys: "Rencana Survey",
    plannedSurveysDesc: "Jadwal survey yang belum dilaksanakan",
    noPlannedSurveys: "Tidak ada survey terjadwal",
    schedule: "Jadwal",
    location: "Lokasi",
    customer: "Customer",
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
    plannedSurveys: "Planned Surveys",
    plannedSurveysDesc: "Upcoming field surveys",
    noPlannedSurveys: "No scheduled surveys",
    schedule: "Schedule",
    location: "Location",
    customer: "Customer",
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
  type: 'INVOICE' | 'QUOTATION' | 'WORK_ORDER' | 'PROPOSAL' | 'SALES_ORDER';
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

const DashboardCard = ({ title, value, icon: Icon, description, trend, trendType, colorClass }: DashboardCardProps) => {
  return (
    <div className="card-engine rounded-md p-3 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          // {title}
        </span>
        <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <Icon className="h-3 w-3" strokeWidth={2} />
        </div>
      </div>

      <div>
        <div className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-tabular mb-1 leading-tight">
          {value}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[9px] truncate max-w-[130px]">{description}</span>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-mono text-[9px] font-semibold shrink-0 ${
                trendType === 'up' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
              }`}
            >
              {trendType === 'up' ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
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
  const { data: salesOrderData, isLoading: isLoadingSalesOrder, refetch: refetchSalesOrder } = useQuery({ queryKey: ['salesOrderData'], queryFn: getSalesOrderData });
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
  const { data: plannedSurveys, isLoading: isLoadingSurveys, refetch: refetchSurveys } = useQuery({
    queryKey: ['plannedSurveys'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/surveys`);
      const data = await res.json();
      return (data || []).filter((s: any) => s.status === 'PLANNED');
    }
  });

  const handleRefresh = () => {
    refetchSales();
    refetchSalesOrder();
    refetchExpenses();
    refetchInventory();
    refetchLowStock();
    refetchProfitLoss();
    refetchCashFlow();
    refetchActivity();
    refetchCategorySales();
    refetchSurveys();
  };

  const isLoading = isLoadingSales || isLoadingSalesOrder || isLoadingExpenses || isLoadingInventory || isLoadingLowStock || isLoadingProfitLoss || isLoadingCashFlow || isLoadingActivity || isLoadingSurveys;

  const safeTotalRevenue = profitLossReport?.totalRevenue || 0;
  const safeTotalCOGS = profitLossReport?.totalCOGS || 0;
  const safeNetProfit = profitLossReport?.netProfit || 0;
  const profitMargin = safeTotalRevenue > 0 ? (safeNetProfit / safeTotalRevenue) * 100 : 0;
  const cogsRatio = safeTotalRevenue > 0 ? (safeTotalCOGS / safeTotalRevenue) * 100 : 0;

  // Chart Configurations
  const monthlyExpenses = useMemo(() => {
    const arr = Array(12).fill(0)
    const today = new Date()
    ;(expensesData?.rawData || []).forEach((exp: any) => {
      const d = new Date(exp.date || exp.createdAt)
      if (isNaN(d.getTime())) return
      const monthDiff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
      if (monthDiff >= 0 && monthDiff < 12) arr[11 - monthDiff] += Number(exp.amount) || 0
    })
    return arr
  }, [expensesData])

  const salesChartData = useMemo(() => ({
    labels: salesData?.months || [],
    datasets: [
      {
        type: 'line' as const,
        label: t.operatingExpenses,
        data: monthlyExpenses,
        borderColor: '#ef4444',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 2,
        tension: 0.4,
        borderDash: [6, 4],
        fill: false,
        order: 0,
      },
      {
        type: 'line' as const,
        label: 'Sales Order (Pipeline)',
        data: salesOrderData?.monthlyOrders || [],
        borderColor: '#a855f7', // Purple
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#a855f7',
        pointBorderWidth: 2,
        tension: 0.4,
        borderDash: [4, 4],
        fill: false,
        order: 1,
      },
      {
        type: 'line' as const,
        label: t.revenue,
        data: salesData?.monthlySales || [],
        borderColor: '#2563eb',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#2563eb',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
          gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
          return gradient;
        },
        order: 1,
      },
      {
        type: 'bar' as const,
        label: 'Volume',
        data: salesData?.monthlySales || [],
        backgroundColor: 'rgba(148, 163, 184, 0.25)',
        hoverBackgroundColor: 'rgba(148, 163, 184, 0.45)',
        borderRadius: 4,
        borderWidth: 0,
        barThickness: 24,
        maxBarThickness: 36,
        order: 2,
      },
    ],
  }), [salesData, monthlyExpenses, t.revenue, t.operatingExpenses]);

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
    <div className="min-h-screen p-3 lg:p-4 space-y-3 bg-slate-50 dark:bg-[#06090e]">
      {/* Header Section — Technical Operations Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              SYS-EXEC
            </span>
            <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Executive Telemetry Console
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Real-time multi-department operational & financial health telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>FEED: ACTIVE</span>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[11px] px-2.5 h-7 shadow-2xs"
          >
            <RefreshCcw size={12} className={`mr-1.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            REFRESH
          </Button>

          <Link href="/dashboard/finance/reports">
            <Button
              className="rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] px-3 h-7 shadow-2xs"
            >
              FINANCIAL LEDGER
            </Button>
          </Link>
        </div>
      </div>

      {/* Planned Surveys Tactical Alert Strip */}
      <div className="rounded-md bg-slate-900 border border-slate-800/80 p-2.5 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400">
              <MapPin size={14} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400">{t.plannedSurveys}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-800">
                  {plannedSurveys?.length || 0} DISPATCHED
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Field surveys scheduled for operational verification</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-1.5 lg:justify-end">
            {isLoadingSurveys ? (
              <RefreshCcw className="animate-spin h-3.5 w-3.5 text-slate-400" />
            ) : plannedSurveys?.length > 0 ? (
              plannedSurveys.slice(0, 4).map((s: any) => (
                <Link 
                  key={s.id} 
                  href="/dashboard/sales/surveys"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono transition-colors"
                >
                  <span className="text-blue-400 font-bold">{format(new Date(s.date), 'dd/MM')}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 truncate max-w-[140px]">{s.customer?.name || s.location}</span>
                </Link>
              ))
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">{t.noPlannedSurveys}</span>
            )}

            <Link 
              href="/dashboard/sales/surveys"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-semibold text-slate-200 transition-colors border border-slate-700"
            >
              DISPATCH VIEW <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
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



      {/* Analytics & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5 lg:gap-3">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500">// METRIC-01</span>
                <h3 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                  {t.salesPerformance}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t.revenueGrowthDesc}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t.live}
            </span>
          </div>

          <div className="h-[200px] lg:h-[220px] w-full pt-1">
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
        </div>

        {/* Expenses Allocation */}
        <div className="rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div className="pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500">// ALLOC-01</span>
              <h3 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                {t.expenseAllocation}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t.operationalCategoriesDesc}</p>
          </div>

          <div className="flex flex-col items-center justify-center py-1">
            <div className="h-[135px] w-full relative">
              <Doughnut
                data={expensePieData}
                options={{
                  ...commonOptions,
                  cutout: '75%',
                  plugins: { ...commonOptions.plugins, legend: { display: false } },
                  scales: { x: { display: false }, y: { display: false } }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                <span className="text-[8.5px] font-mono uppercase tracking-widest text-slate-400">{t.total}</span>
                <span className="text-xs font-bold font-tabular text-slate-900 dark:text-slate-100">
                  Rp {((expensesData?.amounts || []).reduce((a: number, b: number) => a + (Number(b) || 0), 0) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            <div className="mt-2.5 w-full space-y-1 border-t border-slate-100 dark:border-slate-800/60 pt-2">
              {(expensesData?.categories || []).slice(0, 3).map((cat: string, i: number) => (
                <div key={cat} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: expensePieData.datasets[0].backgroundColor[i] }} />
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                    Rp {((expensesData?.amounts?.[i] || 0) / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales by Category Breakdown */}
        <div className="rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div className="pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500">// REVENUE-02</span>
              <h3 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                {t.salesByCategory}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t.salesByCategoriesDesc}</p>
          </div>

          <div className="flex flex-col items-center justify-center py-1">
            <div className="h-[135px] w-full relative">
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
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#f8fafc',
                      bodyColor: '#cbd5e1',
                    }
                  },
                  scales: { x: { display: false }, y: { display: false } }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                <span className="text-[8.5px] font-mono uppercase tracking-widest text-slate-400">{t.total}</span>
                <span className="text-xs font-bold font-tabular text-slate-900 dark:text-slate-100">
                  Rp {(((categorySales || []).reduce((a, b) => a + b.amount, 0)) / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            <div className="mt-2.5 w-full space-y-1 border-t border-slate-100 dark:border-slate-800/60 pt-2">
              {(categorySales || []).slice(0, 3).map((item, i) => (
                <div key={item.category} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: categorySalesPieData.datasets[0].backgroundColor[i] }} />
                    <span className="truncate">{item.category}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                    Rp {(item.amount / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Telemetry & Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-3">
        {/* Financial Summary */}
        <div className="rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-blue-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-tight">
                  {t.financialHealthSummary}
                </h3>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                {t.positive}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t.netProfitMargin}</span>
                <div className="text-base lg:text-lg font-bold font-tabular text-slate-900 dark:text-white mt-0.5 leading-tight">
                  Rp {safeNetProfit.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <ArrowUpRight size={10} />
                  <span>{profitMargin.toFixed(1)}% margin</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{t.revenue} vs {t.expensesCOGS}</span>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="text-slate-500">Gross Rev:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Rp {safeTotalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                    <span className="text-slate-500">COGS Burn:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">Rp {safeTotalCOGS.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 mt-1">
                  COGS Ratio: {cogsRatio.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">{t.operatingActivities}:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Rp {cashFlowReport?.operating?.total?.toLocaleString() ?? '0'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">{t.netCashChange}:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  Rp {((cashFlowReport?.operating?.total || 0) + (cashFlowReport?.investing?.total || 0) + (cashFlowReport?.financing?.total || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Link href="/dashboard/finance/reports" className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-semibold transition-colors">
            {t.downloadFullReport} <ArrowRight size={11} />
          </Link>
        </div>

        {/* Low Stock Watchlist */}
        <div className="rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-tight">
                  {t.stockWatchlist}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">{t.immediateAttentionDesc}</p>
              </div>
              <Link href="/dashboard/inventory" className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {t.viewAll}
              </Link>
            </div>

            {isLoadingLowStock ? getLoadingSpinner() : (
              <div className="space-y-1.5">
                {lowStockItems?.length > 0 ? (
                  lowStockItems.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
                          {(item.name || item.product?.name || 'P').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{item.name || item.product?.name || 'Unknown Item'}</p>
                          <span className="font-mono text-[9px] text-slate-400">{item.code || 'SKU-N/A'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          {item.totalQty || item.stock || 0} {t.left}
                        </span>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{t.min}: {item.minStock || 0}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{t.allStable}</span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.inventorySafeDesc}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href="/dashboard/inventory" className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-semibold transition-colors">
            INVENTORY MANAGER <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* Activity Stream & Quick Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 lg:gap-3">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-tight">{t.recentActivity}</h3>
              <p className="text-[10px] text-slate-500 font-mono">{t.latestTransactionsDesc}</p>
            </div>
            <span className="font-mono text-[9px] text-slate-400 uppercase">STREAM: REALTIME</span>
          </div>

          {isLoadingActivity ? getLoadingSpinner() : (
            <div className="space-y-1.5">
              {recentActivity && recentActivity.length > 0 ? (
                (recentActivity as ActivityItem[]).slice(0, 5).map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center justify-between p-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        {activity.type === 'INVOICE' ? 'INV' : activity.type === 'QUOTATION' ? 'QUO' : activity.type === 'SALES_ORDER' ? 'SO' : activity.type === 'WORK_ORDER' ? 'WO' : 'DOC'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{activity.title}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{activity.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {activity.amount && (
                        <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          Rp {activity.amount.toLocaleString()}
                        </span>
                      )}
                      <span className="font-mono text-[9.5px] text-slate-400 hidden sm:inline">
                        {format(new Date(activity.date), 'HH:mm')}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold uppercase ${
                        ['PAID', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(activity.status)
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          : ['DRAFT', 'PENDING'].includes(activity.status)
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <span className="text-[11px] font-mono text-slate-400">{t.noRecentActivity}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactical Quick Actions */}
        <div className="rounded-md bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-tight">{t.controlPanel}</h3>
              <p className="text-[10px] text-slate-500 font-mono">{t.executeFrequentActions}</p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {[
                { label: t.invoice, icon: DollarSign, href: '/dashboard/finance/invoices' },
                { label: t.quote, icon: ArrowUpRight, href: '/dashboard/sales/quotations' },
                { label: t.work, icon: Activity, href: '/dashboard/operations/work-orders' },
                { label: t.stock, icon: Package, href: '/dashboard/inventory' },
              ].map((action) => (
                <Link 
                  key={action.label} 
                  href={action.href}
                  className="flex flex-col items-center justify-center p-2 rounded bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-colors text-center group"
                >
                  <action.icon size={15} className="text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1" />
                  <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-mono text-[9px] text-slate-500 flex items-center justify-between">
            <span>SHORTCUTS:</span>
            <kbd className="px-1 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">CTRL + K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
