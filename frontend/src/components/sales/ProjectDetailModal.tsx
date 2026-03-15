"use client"

import { motion } from "framer-motion"
import {
    X, CheckCircle2, FileText, ShoppingCart,
    Wrench, Truck, ClipboardCheck, Receipt,
    Calendar, MapPin, User, Info, DollarSign,
    Package, ShoppingBag, ArrowRight
} from "lucide-react"

interface ProjectDetailModalProps {
    project: any
    onClose: () => void
}

const fmt = (n: number) => `Rp ${n?.toLocaleString('id-ID')}`
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

export default function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
    // Collect all timeline items from project relations
    const timelineItems = [
        ...(project.surveys || []).map((s: any) => ({
            type: 'SURVEY',
            date: s.date,
            number: s.number,
            title: 'Survey Lapangan',
            details: s.location,
            value: s.expenses?.reduce((acc: number, e: any) => acc + (e.amount || 0), 0) || 0,
            status: s.status,
            icon: MapPin,
            color: 'bg-amber-500'
        })),
        ...(project.quotations || []).map((q: any) => ({
            type: 'QUOTATION',
            date: q.date,
            number: q.number,
            title: 'Penawaran Harga',
            details: q.subject,
            value: q.grandTotal,
            status: q.status,
            icon: FileText,
            color: 'bg-blue-500'
        })),
        ...(project.salesOrders || []).map((so: any) => ({
            type: 'SALES_ORDER',
            date: so.date,
            number: so.number,
            title: 'Pesanan Penjualan (SO)',
            details: so.subject,
            value: so.grandTotal,
            status: so.status,
            icon: ShoppingCart,
            color: 'bg-purple-500'
        })),
        ...(project.purchaseOrders || []).map((po: any) => {
            const validPOStatuses = ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'POSTED'];
            let directCost = 0;
            if (validPOStatuses.includes(po.status)) {
                po.items?.forEach((item: any) => {
                    const desc = (item.description || '').toLowerCase()
                    const isInventoryItem = desc.includes('sku-') || desc.includes('prod-')
                    const isService = desc.includes('jasa') || desc.includes('service') || desc.includes('fee') || desc.includes('ongkos')
                    if (isService || !isInventoryItem) directCost += (item.qty || 0) * (item.unitPrice || 0)
                });
            }
            return {
                type: 'PURCHASE_ORDER',
                date: po.date,
                number: po.number,
                title: 'Purchase Order (PO)',
                details: `Vendor: ${po.vendor?.name || 'Unknown'}${directCost < po.grandTotal ? ' (Direct Cost portion)' : ''}`,
                value: directCost > 0 ? directCost : po.grandTotal,
                status: po.status,
                icon: ShoppingBag,
                color: 'bg-orange-600'
            };
        }),
        ...(project.workOrders || []).map((wo: any) => ({
            type: 'WORK_ORDER',
            date: wo.createdAt,
            number: wo.number,
            title: 'Work Order (WO)',
            details: wo.title,
            value: wo.items?.reduce((acc: number, i: any) => acc + (i.totalCost || 0), 0) || 0,
            status: wo.status,
            icon: Wrench,
            color: 'bg-rose-500'
        })),
        ...(project.workOrders || []).flatMap((wo: any) => 
            (wo.stockMovements || []).map((sm: any) => ({
                type: 'STOCK_MOVEMENT',
                date: sm.date || sm.createdAt,
                number: sm.number,
                title: `Mutasi Barang (${sm.type === 'OUT' ? 'Keluar' : 'Masuk'})`,
                details: `${sm.warehouse?.name || 'Gudang'} -> ${sm.type === 'OUT' ? 'Proyek' : 'Balik'}`,
                value: sm.items?.reduce((acc: number, i: any) => acc + (i.qty * i.unitCost), 0) || 0,
                status: sm.status,
                icon: Package,
                color: sm.type === 'OUT' ? 'bg-rose-600' : 'bg-emerald-600'
            }))
        ),
        ...(project.deliveryOrders || []).map((doItem: any) => ({
            type: 'DELIVERY_ORDER',
            date: doItem.date,
            number: doItem.number,
            title: 'Delivery Order (DO)',
            details: `${doItem.items?.length || 0} items`,
            value: 0,
            status: doItem.status,
            icon: Truck,
            color: 'bg-sky-500'
        })),
        ...(project.basts || []).map((b: any) => ({
            type: 'BAST',
            date: b.date,
            number: b.number,
            title: 'BAST',
            details: b.receiverName || 'Selesai',
            value: 0,
            status: b.status,
            icon: ClipboardCheck,
            color: 'bg-emerald-500'
        })),
        ...(project.invoices || []).map((inv: any) => ({
            type: 'INVOICE',
            date: inv.date,
            number: inv.number,
            title: 'Invoice (Tagihan)',
            details: inv.notes || 'Tagihan Proyek',
            value: inv.grandTotal,
            status: inv.status,
            icon: Receipt,
            color: 'bg-indigo-500'
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="bg-slate-50 w-full max-w-2xl h-full shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-white px-5 py-4 md:px-8 md:py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Info size={20} className="text-white md:w-6 md:h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">{project.number}</p>
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{project.name}</h2>
                            <p className="text-xs font-semibold text-slate-400 capitalize">{project.customer?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Status Proyek</p>
                            <p className="text-base md:text-lg font-black text-slate-900 leading-tight">{project.status}</p>
                        </div>
                        <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Dibuat Pada</p>
                            <p className="text-base md:text-lg font-black text-slate-900 leading-tight">{fmtDate(project.createdAt)}</p>
                        </div>
                    </div>

                    {/* Timeline Section */}
                    <section>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-600" />
                            Journey Timeline
                        </h3>

                        <div className="relative pl-6 md:pl-8 space-y-6 md:space-y-8 before:absolute before:left-[11px] md:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                            {timelineItems.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada transaksi</p>
                                </div>
                            ) : timelineItems.map((item, idx) => (
                                <div key={idx} className="relative">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[21px] md:-left-[25px] top-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-[3px] md:border-4 border-slate-50 ${item.color} shadow-sm z-10`} />

                                    <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 md:gap-4">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${item.color} flex items-center justify-center text-white shrink-0`}>
                                                    <item.icon size={16} className="md:w-5 md:h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.number}</p>
                                                    <h4 className="text-sm md:text-base font-bold text-slate-900 leading-tight">{item.title}</h4>
                                                    <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 md:mt-1 line-clamp-1">{item.details}</p>
                                                    <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-3">
                                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                            <Calendar size={10} className="md:w-3 md:h-3" /> {fmtDate(item.date)}
                                                        </span>
                                                        <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase tracking-tighter bg-slate-100 text-slate-600">
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {item.value > 0 && (
                                                <div className="text-left sm:text-right w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nilai Transaksi</p>
                                                    <p className="text-sm font-black text-indigo-600 flex items-center justify-start sm:justify-end">
                                                        <DollarSign size={14} className="mr-0.5" />
                                                        {item.value.toLocaleString('id-ID')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </motion.div>
        </div>
    )
}
