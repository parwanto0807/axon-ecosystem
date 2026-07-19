"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X, Factory, ShoppingCart, Calculator, Package, BarChart4,
    Cpu, Truck, Settings2, ShieldCheck, BarChart3, LayoutDashboard, ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface ManufacturingDetailModalProps { isOpen: boolean; onClose: () => void }

const translations = {
    ID: {
        title: "Detail Solusi: Manufaktur & Logistik",
        intro: "Dalam ekosistem industri modern, efisiensi bukan lagi pilihan, melainkan keharusan. Axon hadir sebagai penghubung setiap syaraf operasional — dari permintaan pelanggan hingga pengiriman barang jadi.",
        workflowTitle: "Alur Kerja Terintegrasi",
        workflowSubtitle: "Bagaimana Axon menghubungkan setiap tahap operasional:",
        workflow: [
            { phase: "Input (Sales & CRM)", desc: "Pesanan pelanggan masuk via Sales Order. Sistem otomatis memeriksa ketersediaan stok di Multi-Gudang.", icon: ShoppingCart },
            { phase: "Perencanaan (MRP & BOM)", desc: "MRP menghitung kebutuhan bahan baku, jadwal mesin, dan tenaga kerja secara otomatis berdasarkan BOM.", icon: Calculator },
            { phase: "Produksi & IoT", desc: "Data dari mesin produksi ditarik via IoT, memberikan laporan output akurat tanpa input manual.", icon: Cpu },
            { phase: "Distribusi", desc: "Barang jadi masuk Inventory dengan barcode/QR untuk pelacakan logistik yang presisi.", icon: Truck },
            { phase: "Finansial", desc: "Seluruh biaya otomatis dikonversi menjadi laporan Laba Rugi dan Neraca.", icon: BarChart4 }
        ],
        strategicTitle: "Keunggulan Strategis",
        arguments: [
            { title: "Produksi Berbasis Data", desc: "Integrasi BOM dan MRP memberikan visibilitas biaya produksi hingga satuan terkecil untuk harga jual yang lebih kompetitif.", icon: BarChart3 },
            { title: "Manajemen Logistik Cerdas", desc: "Real-time tracking dan multi-warehouse memastikan tidak ada stok mengendap, mengoptimalkan arus kas.", icon: Package },
            { title: "Kustomisasi Tingkat Tinggi", desc: "Custom payroll berdasarkan target produksi, atau integrasi IoT mesin untuk deteksi dini kerusakan.", icon: Settings2 },
            { title: "Laporan Konsolidasi Otomatis", desc: "Konsolidasi data instan — gambaran kesehatan finansial real-time untuk keputusan cepat.", icon: LayoutDashboard },
            { title: "Keamanan & Skalabilitas", desc: "Data industri tersimpan aman dengan enkripsi standar industri, siap tumbuh bersama bisnis Anda.", icon: ShieldCheck }
        ],
        conclusionTitle: "Nilai Tambah",
        conclusion: "Axon bukan sekadar aplikasi, melainkan investasi aset digital. Kami merampingkan proses rumit menjadi alur yang sederhana, terukur, dan transparan.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Manufacturing & Logistics",
        intro: "In modern industry, efficiency isn't optional — it's a necessity. Axon connects every operational nerve, from customer demand to finished goods delivery.",
        workflowTitle: "Integrated Workflow",
        workflowSubtitle: "How Axon connects each operational stage:",
        workflow: [
            { phase: "Input (Sales & CRM)", desc: "Customer orders enter via Sales Order. The system automatically checks multi-warehouse stock.", icon: ShoppingCart },
            { phase: "Planning (MRP & BOM)", desc: "MRP calculates raw materials, machine schedules, and labor needs automatically based on BOM.", icon: Calculator },
            { phase: "Production & IoT", desc: "Machine data pulled via IoT, providing accurate output reports without manual input.", icon: Cpu },
            { phase: "Distribution", desc: "Finished goods enter Inventory with barcode/QR for precise logistics tracking.", icon: Truck },
            { phase: "Financials", desc: "All costs automatically convert into P&L statements and Balance Sheets.", icon: BarChart4 }
        ],
        strategicTitle: "Strategic Advantages",
        arguments: [
            { title: "Data-Driven Manufacturing", desc: "BOM and MRP integration provides cost visibility to the smallest unit for more competitive pricing.", icon: BarChart3 },
            { title: "Smart Logistics", desc: "Real-time tracking and multi-warehouse ensures no stagnant stock, optimizing cash flow.", icon: Package },
            { title: "Advanced Customization", desc: "Custom payroll based on production targets, or IoT integration for preventive maintenance.", icon: Settings2 },
            { title: "Automated Consolidation", desc: "Instant data consolidation — real-time financial health for quick decision-making.", icon: LayoutDashboard },
            { title: "Security & Scalability", desc: "Industrial data securely stored with industry encryption, ready to grow with your business.", icon: ShieldCheck }
        ],
        conclusionTitle: "Value Proposition",
        conclusion: "Axon is more than software — it's a digital asset investment. We streamline complex processes into simple, measurable, and transparent workflows.",
        closeBtn: "Close"
    }
}

export function ManufacturingDetailModal({ isOpen, onClose }: ManufacturingDetailModalProps) {
    const { lang } = useLanguage()
    const t = translations[lang as keyof typeof translations]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[150] cursor-pointer"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[151] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background border border-border w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto relative"
                        >
                            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10">
                                <X size={18} />
                            </button>

                            <div className="p-8 md:p-12">
                                <div className="max-w-3xl mb-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Factory className="text-primary w-7 h-7" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'ID' ? 'Solusi Industri' : 'Industry Solutions'}</span>
                                            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1">
                                                {lang === 'ID' ? 'Manufaktur & Logistik' : 'Manufacturing & Logistics'}
                                            </h2>
                                        </div>
                                    </div>
                                    <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed">{t.intro}</p>
                                </div>

                                {/* Workflow */}
                                <div className="mb-14">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">{t.workflowTitle}</h3>
                                    <p className="text-sm text-muted-foreground font-medium mb-8">{t.workflowSubtitle}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                        {t.workflow.map((item, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                                    <item.icon size={18} />
                                                </div>
                                                <h4 className="font-bold text-xs text-foreground mb-1.5">{item.phase}</h4>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Strategic Arguments */}
                                <div className="mb-14">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6">{t.strategicTitle}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {t.arguments.map((arg, idx) => (
                                            <div key={idx} className="p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                                                    <arg.icon size={18} />
                                                </div>
                                                <h4 className="font-bold text-sm text-foreground mb-1.5">{arg.title}</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{arg.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conclusion */}
                                <div className="flex flex-col sm:flex-row gap-8 items-start justify-between pt-8 border-t border-border">
                                    <div className="max-w-2xl">
                                        <h3 className="text-lg font-bold text-foreground mb-2">{t.conclusionTitle}</h3>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{t.conclusion}</p>
                                    </div>
                                    <Button onClick={onClose} className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors shrink-0">
                                        {t.closeBtn}
                                        <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
