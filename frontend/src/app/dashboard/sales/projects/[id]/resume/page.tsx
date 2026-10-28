"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
    ArrowLeft, FileText, ShoppingCart, ShoppingBag,
    MapPin, Receipt, Wrench, TrendingUp,
    TrendingDown, Percent, AlertCircle, Clock, Printer,
    Building2, Calendar, BarChart3, Briefcase
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
    DRAFT: { pill: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/50' },
    SENT: { pill: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400', dot: 'bg-blue-500' },
    APPROVED: { pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    REJECTED: { pill: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400', dot: 'bg-rose-500' },
    COMPLETED: { pill: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400', dot: 'bg-indigo-500' },
    POSTED: { pill: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400', dot: 'bg-violet-500' },
    PAID: { pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    CONFIRMED: { pill: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-400', dot: 'bg-cyan-500' },
    DELIVERED: { pill: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-400', dot: 'bg-teal-500' },
    PARTIALLY_RECEIVED: { pill: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
    PENDING: { pill: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
    CANCELLED: { pill: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400', dot: 'bg-rose-500' },
    VOID: { pill: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400', dot: 'bg-rose-400' },
    ACTIVE: { pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
    CLOSED: { pill: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/50' },
}

const StatusBadge = ({ status }: { status: string }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.DRAFT
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {status}
        </span>
    )
}

function SectionHeader({
    icon,
    title,
    subtitle,
    right,
}: {
    icon: ReactNode
    title: string
    subtitle?: string
    right?: ReactNode
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            {right && <div className="text-right">{right}</div>}
        </div>
    )
}

function StatCard({
    label,
    value,
    negative,
    className = '',
}: {
    label: string
    value: string
    negative?: boolean
    className?: string
}) {
    return (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${className || 'text-foreground'}`}>
                {negative ? `(${value})` : value}
            </p>
        </div>
    )
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {icon}
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
                {value}
            </p>
        </div>
    )
}

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {icon}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
        </div>
    )
}

interface Project {
    id: string; number: string; name: string; status: string; createdAt: string; deadline?: string
    customer?: { name: string; code?: string; phone?: string; email?: string }
    businessCategory?: { name: string }
    surveys?: any[]; quotations?: any[]; salesOrders?: any[]; purchaseOrders?: any[]
    workOrders?: any[]; invoices?: any[]; surveyExpenses?: any[]; operationalExpenses?: any[]
    deliveryOrders?: any[]; basts?: any[]
}

export default function ProjectResumePage() {
    const { id } = useParams()
    const { data: session } = useSession()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id && session?.user?.role) fetchProject()
    }, [id, session])

    const fetchProject = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                headers: {
                    'x-user-role': session?.user?.role || ''
                }
            })
            const data = await res.json()
            if (res.ok && !data.message) {
                setProject(data)
            } else {
                setProject(null)
            }
        } catch (e) {
            console.error(e)
            setProject(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
    )

    if (!project) return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <AlertCircle size={22} />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">Project Not Found</p>
                <Link href="/dashboard/sales/projects" className="mt-1 text-xs text-primary hover:underline">
                    Kembali ke Projects
                </Link>
            </div>
        </div>
    )

    // ─── CALCULATIONS ───────────────────────────────────────────────────────
    const revenue = project.salesOrders?.reduce((acc, so) => acc + (so.grandTotal || 0), 0) || 0

    let materialUsageCosts = 0
    let operationalExpenses = 0
    const processedExpenseIds = new Set<string>()

    let validSurveyCosts = 0
    let validWoSurveyCosts = 0
    let validProjectSurveyCosts = 0
    let validOpExCosts = 0

    const processExpense = (e: any, category?: string) => {
        if (!e || !e.id || processedExpenseIds.has(e.id)) return
        if (e.status === 'APPROVED' || e.status === 'POSTED' || e.status === 'PAID') {
            if (!e.purchaseOrderId) {
                const amt = e.amount || 0
                operationalExpenses += amt
                if (category === 'survey') validSurveyCosts += amt
                if (category === 'wo_survey') validWoSurveyCosts += amt
                if (category === 'project_survey') validProjectSurveyCosts += amt
                if (category === 'opex') validOpExCosts += amt
            }
        }
        processedExpenseIds.add(e.id)
    }

    project.workOrders?.forEach(wo => {
        wo.stockMovements?.forEach((sm: any) => {
            if (sm.status === 'CONFIRMED' && (sm.type === 'OUT' || sm.type === 'STOK_OUT')) {
                sm.items?.forEach((item: any) => { materialUsageCosts += (item.qty || 0) * (item.unitCost || 0) })
            }
        })
    })

    const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'POSTED']
    let totalPOGrandTotal = 0
    project.purchaseOrders?.forEach(po => {
        if (validPOStatuses.includes(po.status)) {
            totalPOGrandTotal += po.grandTotal || 0
        }
    })

    project.surveys?.forEach(s => s.expenses?.forEach((e: any) => processExpense(e, 'survey')))
    project.workOrders?.forEach(wo => wo.surveyExpenses?.forEach((e: any) => processExpense(e, 'wo_survey')))
    project.surveyExpenses?.forEach((e: any) => processExpense(e, 'project_survey'))
    project.operationalExpenses?.forEach((e: any) => processExpense(e, 'opex'))

    const totalCOGS = materialUsageCosts + totalPOGrandTotal
    const totalExpenses = totalCOGS + operationalExpenses
    const profit = revenue - totalExpenses
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    const isProfit = profit >= 0

    // Quotation aggregates
    const okQuotations = project.quotations?.filter((q: any) => ['ACCEPTED', 'SENT'].includes(q.status)) || []
    const okQuotationsTotal = okQuotations.reduce((a: number, q: any) => a + (q.grandTotal || 0), 0)
    const okQuotationsHPP = okQuotations.reduce((a: number, q: any) => a + (q.items?.reduce((ia: number, item: any) => ia + (item.costPrice || 0) * (item.qty || 1), 0) || 0), 0)

    const rejectedQuotations = project.quotations?.filter((q: any) => ['REJECTED', 'VOID', 'CANCELLED', 'EXPIRED'].includes(q.status)) || []
    const rejectedQuotationsTotal = rejectedQuotations.reduce((a: number, q: any) => a + (q.grandTotal || 0), 0)
    const rejectedQuotationsHPP = rejectedQuotations.reduce((a: number, q: any) => a + (q.items?.reduce((ia: number, item: any) => ia + (item.costPrice || 0) * (item.qty || 1), 0) || 0), 0)

    return (
        <div className="resume-page min-h-screen bg-background p-4 md:p-6">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .resume-page { background: #ffffff !important; }
                    .resume-card { background: #ffffff !important; border-color: #e5e7eb !important; }
                }
            `}</style>

            <div className="mx-auto w-full max-w-[1440px]">
                {/* Header */}
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href="/dashboard/sales/projects" className="no-print flex-shrink-0">
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                                <ArrowLeft size={16} />
                            </Button>
                        </Link>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                                    {project.name}
                                </h1>
                                <StatusBadge status={project.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {project.number}
                                {project.customer?.name ? ` · ${project.customer.name}` : ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => window.print()}
                        variant="outline"
                        className="no-print hidden h-9 rounded-lg px-4 text-sm font-medium md:inline-flex"
                    >
                        <Printer size={16} className="mr-1.5" />
                        Print
                    </Button>
                </header>

                <div className="space-y-4 md:space-y-5">
                    {/* Project Info */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="resume-card rounded-xl border border-border bg-card p-4 md:p-5"
                    >
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <InfoItem
                                icon={<Building2 size={12} />}
                                label="Customer"
                                value={project.customer?.name || '-'}
                            />
                            <InfoItem
                                icon={<Briefcase size={12} />}
                                label="Unit Bisnis"
                                value={project.businessCategory?.name || '-'}
                            />
                            <InfoItem
                                icon={<Calendar size={12} />}
                                label="Dibuat"
                                value={fmtDate(project.createdAt)}
                            />
                            <InfoItem
                                icon={<Clock size={12} />}
                                label="Deadline"
                                value={project.deadline ? fmtDate(project.deadline) : '-'}
                            />
                        </div>
                    </motion.section>

                    {/* Profit / Loss Summary */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="resume-card rounded-xl border border-border bg-card p-4 md:p-5"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Profit & Loss Summary</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                                        <p className={`text-2xl font-semibold tabular-nums tracking-tight ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isProfit ? '+' : ''}{fmt(profit)}
                                        </p>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${margin > 20
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            : margin > 10
                                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400'
                                            }`}>
                                            <Percent size={12} />
                                            Margin: {margin.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <StatCard label="Total Pendapatan" value={fmt(revenue)} />
                            <StatCard label="HPP / Modal" value={fmt(totalCOGS)} negative />
                            <StatCard label="Biaya Operasional" value={fmt(operationalExpenses)} negative />
                        </div>
                    </motion.section>

                    {/* Survey Lapangan */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<MapPin size={16} />}
                            title="Survey Lapangan"
                            subtitle={`${project.surveys?.length || 0} survey`}
                            right={
                                <>
                                    <p className="text-xs font-medium text-muted-foreground">Total Biaya</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(validSurveyCosts)}</p>
                                </>
                            }
                        />
                        {project.surveys && project.surveys.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">No</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Lokasi</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Biaya</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.surveys.map((s, idx) => {
                                            const surveyExpense = s.expenses?.reduce((a: number, e: any) => a + (e.amount || 0), 0) || 0
                                            return (
                                                <tr key={s.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                                                    <td className="px-3 py-2.5 text-sm text-foreground">{fmtDate(s.date)}</td>
                                                    <td className="max-w-[240px] truncate px-3 py-2.5 text-sm text-foreground">{s.location || '-'}</td>
                                                    <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                                                    <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(surveyExpense)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon={<MapPin size={22} />} title="Belum ada survey" />
                        )}
                    </motion.section>

                    {/* Penawaran Harga */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<FileText size={16} />}
                            title="Penawaran Harga"
                            subtitle={`${project.quotations?.length || 0} penawaran`}
                        />
                        <div className="grid grid-cols-1 gap-3 border-b border-border bg-muted/20 p-4 sm:grid-cols-3">
                            <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs font-medium text-muted-foreground">Disetujui</p>
                                <div className="mt-2 space-y-1 text-xs">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Nilai</span>
                                        <span className="font-medium tabular-nums text-foreground">{fmt(okQuotationsTotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">HPP</span>
                                        <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">{fmt(okQuotationsHPP)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs font-medium text-muted-foreground">Ditolak</p>
                                <div className="mt-2 space-y-1 text-xs">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Nilai</span>
                                        <span className="font-medium tabular-nums text-foreground">{fmt(rejectedQuotationsTotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">HPP</span>
                                        <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">{fmt(rejectedQuotationsHPP)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                                <p className="text-xs font-medium text-muted-foreground">Total Keseluruhan</p>
                                <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                                    {fmt(project.quotations?.reduce((a, q) => a + (q.grandTotal || 0), 0) || 0)}
                                </p>
                            </div>
                        </div>
                        {project.quotations && project.quotations.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">No</th>
                                            <th className="px-3 py-2.5 font-medium">Nomor</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Subjek</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Estimasi HPP</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.quotations.map((q, idx) => {
                                            const estimasiHpp = q.items?.reduce((a: number, item: any) => a + (item.costPrice || 0) * (item.qty || 1), 0) || 0;
                                            return (
                                                <tr key={q.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                                                    <td className="px-3 py-2.5 text-sm font-medium text-foreground">{q.number}</td>
                                                    <td className="px-3 py-2.5 text-sm text-foreground">{fmtDate(q.date)}</td>
                                                    <td className="max-w-[240px] truncate px-3 py-2.5 text-sm text-foreground">{q.subject || '-'}</td>
                                                    <td className="px-3 py-2.5"><StatusBadge status={q.status} /></td>
                                                    <td className="px-3 py-2.5 text-right text-sm tabular-nums text-muted-foreground">{fmt(estimasiHpp)}</td>
                                                    <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(q.grandTotal || 0)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon={<FileText size={22} />} title="Belum ada penawaran" />
                        )}
                    </motion.section>

                    {/* Pesanan Penjualan */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<ShoppingCart size={16} />}
                            title="Pesanan Penjualan (SO)"
                            subtitle={`${project.salesOrders?.length || 0} pesanan`}
                            right={
                                <>
                                    <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(revenue)}</p>
                                </>
                            }
                        />
                        {project.salesOrders && project.salesOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">No</th>
                                            <th className="px-3 py-2.5 font-medium">Nomor</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Subjek</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.salesOrders.map((so, idx) => (
                                            <tr key={so.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                                                <td className="px-3 py-2.5 text-sm font-medium text-foreground">{so.number}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{fmtDate(so.date)}</td>
                                                <td className="max-w-[240px] truncate px-3 py-2.5 text-sm text-foreground">{so.subject || '-'}</td>
                                                <td className="px-3 py-2.5"><StatusBadge status={so.status} /></td>
                                                <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(so.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon={<ShoppingCart size={22} />} title="Belum ada Pesanan Penjualan" />
                        )}
                    </motion.section>

                    {/* Purchase Order */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<ShoppingBag size={16} />}
                            title="Purchase Order (PO)"
                            subtitle={`${project.purchaseOrders?.length || 0} PO`}
                            right={
                                <>
                                    <p className="text-xs font-medium text-muted-foreground">Total Biaya</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(totalPOGrandTotal)}</p>
                                </>
                            }
                        />
                        {project.purchaseOrders && project.purchaseOrders.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">No</th>
                                            <th className="px-3 py-2.5 font-medium">Nomor</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Vendor</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.purchaseOrders.map((po, idx) => (
                                            <tr key={po.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                                                <td className="px-3 py-2.5 text-sm font-medium text-foreground">{po.number}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{fmtDate(po.date)}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{po.vendor?.name || '-'}</td>
                                                <td className="px-3 py-2.5"><StatusBadge status={po.status} /></td>
                                                <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(po.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon={<ShoppingBag size={22} />} title="Belum ada PO" />
                        )}
                    </motion.section>

                    {/* Biaya Operasional */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<Wrench size={16} />}
                            title="Biaya Operasional"
                            subtitle="Survey expenses + OpEx"
                            right={
                                <>
                                    <p className="text-xs font-medium text-muted-foreground">Total Biaya</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{fmt(operationalExpenses)}</p>
                                </>
                            }
                        />
                        {operationalExpenses > 0 ? (
                            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
                                <StatCard label="Survey Expenses" value={fmt(validSurveyCosts)} />
                                <StatCard label="WO Expenses" value={fmt(validWoSurveyCosts)} />
                                <StatCard label="Project Expenses" value={fmt(validProjectSurveyCosts)} />
                                <StatCard label="OpEx" value={fmt(validOpExCosts)} />
                            </div>
                        ) : (
                            <EmptyState icon={<Wrench size={22} />} title="Belum ada biaya operasional" />
                        )}
                    </motion.section>

                    {/* Invoice / Tagihan */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<Receipt size={16} />}
                            title="Invoice / Tagihan"
                            subtitle={`${project.invoices?.length || 0} invoice`}
                            right={
                                <>
                                    <p className="text-xs font-medium text-muted-foreground">Total Tagihan</p>
                                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                        {fmt(project.invoices?.reduce((a, inv) => a + (inv.grandTotal || 0), 0) || 0)}
                                    </p>
                                </>
                            }
                        />
                        {project.invoices && project.invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="px-3 py-2.5 font-medium">No</th>
                                            <th className="px-3 py-2.5 font-medium">Nomor</th>
                                            <th className="px-3 py-2.5 font-medium">Tanggal</th>
                                            <th className="px-3 py-2.5 font-medium">Jatuh Tempo</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Grand Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.invoices.map((inv, idx) => (
                                            <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                                                <td className="px-3 py-2.5 text-sm font-medium text-foreground">{inv.number}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{fmtDate(inv.date)}</td>
                                                <td className="px-3 py-2.5 text-sm text-foreground">{inv.dueDate ? fmtDate(inv.dueDate) : '-'}</td>
                                                <td className="px-3 py-2.5"><StatusBadge status={inv.status} /></td>
                                                <td className="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-foreground">{fmt(inv.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon={<Receipt size={22} />} title="Belum ada Invoice" />
                        )}
                    </motion.section>

                    {/* P&L Summary */}
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="resume-card overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <SectionHeader
                            icon={<BarChart3 size={16} />}
                            title="Ringkasan Profit & Loss"
                        />
                        <div className="p-4 md:p-5">
                            <div className="max-w-xl space-y-1">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-xs font-medium text-muted-foreground">Total Pendapatan (SO)</span>
                                    <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(revenue)}</span>
                                </div>
                                <div className="border-t border-dashed border-border" />
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-xs text-muted-foreground">Biaya Material (Stok Keluar)</span>
                                    <span className="text-sm tabular-nums text-foreground">({fmt(materialUsageCosts)})</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-xs text-muted-foreground">Biaya Pembelian (PO)</span>
                                    <span className="text-sm tabular-nums text-foreground">({fmt(totalPOGrandTotal)})</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-xs text-muted-foreground">Biaya Operasional</span>
                                    <span className="text-sm tabular-nums text-foreground">({fmt(operationalExpenses)})</span>
                                </div>
                                <div className="border-t border-border" />
                                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-3">
                                    <span className="text-sm font-semibold text-foreground">Laba / Rugi Bersih</span>
                                    <span className={`text-lg font-semibold tabular-nums ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {isProfit ? '+' : ''}{fmt(profit)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-xs font-medium text-muted-foreground">Margin</span>
                                    <span className={`text-lg font-semibold tabular-nums ${margin > 20
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : margin > 10
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                        {margin.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>
        </div>
    )
}
