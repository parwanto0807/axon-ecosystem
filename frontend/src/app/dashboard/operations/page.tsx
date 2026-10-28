"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Wrench,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    PlusCircle,
    ClipboardList,
    MapPin,
    ChevronRight,
    RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface DashboardData {
    stats: {
        CONFIRMED?: number;
        IN_PROGRESS?: number;
        COMPLETED?: number;
        ON_HOLD?: number;
    };
    myTasks: any[];
    serviceReminders: any[];
    recentReports: any[];
}

function StatusPill({ status }: { status: string }) {
    const styles =
        status === "IN_PROGRESS"
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
            : status === "COMPLETED"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                : status === "ON_HOLD"
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                    : status === "CONFIRMED"
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
                        : "border-border bg-muted text-muted-foreground"

    const dot =
        status === "IN_PROGRESS"
            ? "bg-amber-500"
            : status === "COMPLETED"
                ? "bg-emerald-500"
                : status === "ON_HOLD"
                    ? "bg-rose-500"
                    : status === "CONFIRMED"
                        ? "bg-blue-500"
                        : "bg-muted-foreground/50"

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {status}
        </span>
    )
}

function priorityDot(priority: string) {
    if (priority === "HIGH") return "bg-rose-500"
    if (priority === "MEDIUM") return "bg-amber-500"
    return "bg-blue-500"
}

export default function OperatorDashboard() {
    const { data: session }: any = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!session?.user?.name) return
        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/operator/dashboard?user=${encodeURIComponent(session.user.name)}`)
            if (res.ok) {
                const d = await res.json()
                setData(d)
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }, [session?.user?.name])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short'
    })

    if (!session) return null

    const berjalan = (data?.stats?.IN_PROGRESS || 0) + (data?.stats?.ON_HOLD || 0)
    const antrean = data?.stats?.CONFIRMED || 0
    const selesai = data?.stats?.COMPLETED || 0
    const total = berjalan + antrean + selesai

    const kpis = [
        { label: "Berjalan", value: berjalan, icon: Wrench },
        { label: "Antrean", value: antrean, icon: Clock },
        { label: "Selesai", value: selesai, icon: CheckCircle2 },
        { label: "Total Tugas", value: total, icon: ClipboardList },
    ]

    const quickActions = [
        { label: 'Tugas Saya', icon: Wrench, link: '/dashboard/operations/work-orders' },
        { label: 'Buat Laporan', icon: PlusCircle, link: '/dashboard/operations/work-orders' },
        { label: 'Jadwal Servis', icon: Calendar, link: '/dashboard/management/assets' },
        { label: 'Cek Progress', icon: ClipboardList, link: '/dashboard/operations/reports' },
    ]

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Halo, <span className="text-primary">{session.user.name?.split(' ')[0]}</span>!
                        </h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Dashboard Kendali Operasional Lapangan
                        </p>
                    </div>
                </header>

                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {kpis.map((kpi) => {
                        const Icon = kpi.icon
                        return (
                            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
                                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <Icon size={16} />
                                </div>
                                <p className="text-2xl font-semibold tabular-nums text-foreground">{kpi.value}</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{kpi.label}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon
                        return (
                            <Link key={action.label} href={action.link}>
                                <div className="flex h-full items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-xs font-medium text-foreground">{action.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <Wrench size={15} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Tugas Utama Saya</h2>
                            </div>
                            <Link
                                href="/dashboard/operations/work-orders"
                                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Lihat Semua
                            </Link>
                        </div>

                        {loading ? (
                            <div className="flex h-48 items-center justify-center">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                            </div>
                        ) : data?.myTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <CheckCircle2 size={22} />
                                </div>
                                <p className="text-sm font-medium text-foreground">Semua Tugas Sudah Selesai!</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Tidak ada tugas aktif saat ini.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {data?.myTasks.map((wo: any) => (
                                    <Link key={wo.id} href={`/dashboard/operations/work-orders?id=${wo.id}`}>
                                        <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot(wo.priority)}`} title={wo.priority} />
                                                    <span className="font-mono text-[11px] text-muted-foreground">{wo.number}</span>
                                                    <StatusPill status={wo.status} />
                                                </div>
                                                <p className="mt-1 truncate text-sm font-medium text-foreground">{wo.title}</p>
                                                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                                                    <MapPin size={11} className="shrink-0" />
                                                    {wo.location || 'Lokasi Belum Ditentukan'}
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <Clock size={15} className="text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Jadwal Servis Unit</h2>
                                </div>
                                <Link
                                    href="/dashboard/management/assets"
                                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Kelola Aset
                                </Link>
                            </div>

                            {loading ? (
                                <div className="flex h-48 items-center justify-center">
                                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                </div>
                            ) : data?.serviceReminders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <AlertCircle size={22} />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">Tidak ada jadwal servis mendesak.</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Semua unit dalam kondisi terjadwal.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {data?.serviceReminders.map((asset: any) => (
                                        <div
                                            key={asset.id}
                                            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                                <span className="text-[10px] leading-none">Servis</span>
                                                <span className="mt-0.5 text-[11px] font-semibold text-foreground">
                                                    {fmtDate(asset.nextServiceDate)}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                    Customer: {asset.customer.name}
                                                </p>
                                            </div>
                                            <Link href="/dashboard/operations/work-orders">
                                                <Button size="sm" className="h-8 rounded-lg px-3 text-xs">
                                                    Buat WO
                                                </Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!loading && data && (
                            <div className="rounded-xl border border-border bg-card p-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCw size={14} className="text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Ringkasan Aktivitas</h2>
                                </div>
                                <div className="mt-3 flex items-end justify-between">
                                    <div>
                                        <p className="text-2xl font-semibold tabular-nums text-foreground">
                                            {data.recentReports.length}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Laporan Baru (Baru-baru ini)
                                        </p>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {data.recentReports.slice(0, 3).map((r: any, i: number) => (
                                            <div
                                                key={i}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground"
                                            >
                                                {r.reportedBy?.substring(0, 1)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
