"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    Factory,
    ShoppingCart,
    Calculator,
    Zap,
    Package,
    BarChart4,
    TrendingUp,
    Settings2,
    ShieldCheck,
    BarChart3,
    ArrowRight,
    Cpu,
    Truck,
    LayoutDashboard,
    SearchCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface ManufacturingDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const translations = {
    ID: {
        title: "Detail Solusi: Transformasi Digital Manufaktur & Logistik",
        intro: "Dalam ekosistem industri modern, efisiensi bukan lagi sebuah pilihan, melainkan keharusan. Axon hadir sebagai \"Otak Digital\" yang menghubungkan setiap syaraf operasional perusahaan Anda—mulai dari permintaan pelanggan hingga pengiriman barang jadi.",
        workflowTitle: "Alur Kerja Terintegrasi (End-to-End Workflow)",
        workflowSubtitle: "Memahami bagaimana Axon bekerja memudahkan Anda melihat efisiensi yang tercipta:",
        workflow: [
            {
                phase: "Fase Input (Sales & CRM)",
                desc: "Pesanan pelanggan masuk melalui modul Sales Order. Sistem secara otomatis memeriksa ketersediaan stok di Multi-Gudang.",
                icon: ShoppingCart
            },
            {
                phase: "Fase Perencanaan (MRP & BOM)",
                desc: "Jika stok kurang, modul MRP akan \"membedah\" Bill of Materials (BOM) untuk menghitung kebutuhan bahan baku, jadwal mesin, dan tenaga kerja secara otomatis.",
                icon: Calculator
            },
            {
                phase: "Fase Eksekusi (Produksi & IoT)",
                desc: "Perintah kerja dikirim ke lantai produksi. Melalui fitur Built-to-Fit, data dari mesin produksi dapat ditarik langsung via IoT, memberikan laporan output yang akurat tanpa input manual.",
                icon: Cpu
            },
            {
                phase: "Fase Output & Distribusi",
                desc: "Barang jadi masuk ke Inventory dengan sistem barcode/QR untuk pelacakan logistik yang presisi hingga sampai ke tangan pelanggan.",
                icon: Truck
            },
            {
                phase: "Fase Finansial",
                desc: "Seluruh biaya (bahan baku, listrik, upah buruh/payroll) otomatis dikonversi menjadi laporan Laba Rugi dan Neraca.",
                icon: BarChart4
            }
        ],
        strategicTitle: "Argumentasi Strategis untuk Pertumbuhan Bisnis",
        arguments: [
            {
                title: "Produksi Berbasis Data",
                tagline: "Data-Driven Manufacturing",
                desc: "Hilangkan spekulasi dalam produksi. Dengan integrasi BOM dan MRP, Anda tahu persis berapa biaya produksi satu unit barang hingga ke satuan terkecil. Ini memungkinkan Anda menetapkan harga jual yang lebih kompetitif dengan margin yang aman.",
                icon: BarChart3
            },
            {
                title: "Manajemen Logistik Cerdas",
                tagline: "Smart Logistics",
                desc: "Logistik bukan hanya soal pengiriman, tapi soal kecepatan putaran barang. Fitur Real-time Tracking dan Multi-Warehouse Management memastikan tidak ada stok yang \"mati\" di gudang, mengoptimalkan arus kas perusahaan.",
                icon: Package
            },
            {
                title: "Kustomisasi Tingkat Tinggi",
                tagline: "Advanced Customization",
                desc: "Kami memahami bahwa setiap pabrik punya aturan unik. Fitur Built-to-Fit memungkinkan kami membangun komponen Custom Payroll yang menghitung premi berdasarkan target produksi, atau integrasi sensor mesin untuk deteksi dini kerusakan.",
                icon: Settings2
            },
            {
                title: "Laporan Konsolidasi Otomatis",
                tagline: "Auto-Reporting",
                desc: "Ucapkan selamat tinggal pada lembur di akhir bulan hanya untuk menarik laporan. Axon melakukan konsolidasi data secara instan, memberikan Anda gambaran kesehatan finansial perusahaan secara real-time untuk pengambilan keputusan cepat.",
                icon: LayoutDashboard
            },
            {
                title: "Keamanan & Skalabilitas",
                tagline: "Safe & Scalable",
                desc: "Sebagai mitra teknologi, kami memastikan data industri Anda tersimpan aman dengan enkripsi standar industri di server yang fleksibel, siap tumbuh seiring bertambahnya lini produksi atau cabang baru perusahaan Anda.",
                icon: ShieldCheck
            }
        ],
        conclusionTitle: "Kesimpulan Nilai Tambah",
        conclusion: "Axon bukan sekadar aplikasi, melainkan investasi aset digital. Kami merampingkan proses yang rumit menjadi alur yang sederhana, terukur, dan transparan. Dengan Axon, Anda tidak hanya mengelola bisnis, Anda memimpin pasar dengan efisiensi.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Manufacturing & Logistics Digital Transformation",
        intro: "In modern industrial ecosystems, efficiency is no longer optional—it's a necessity. Axon acts as the \"Digital Brain\" connecting every operational nerve of your company, from customer demand to finished goods delivery.",
        workflowTitle: "End-to-End Integrated Workflow",
        workflowSubtitle: "Understanding how Axon works helps you visualize the efficiency created:",
        workflow: [
            {
                phase: "Input Phase (Sales & CRM)",
                desc: "Customer orders enter via the Sales Order module. The system automatically checks stock availability across Multi-Warehouses.",
                icon: ShoppingCart
            },
            {
                phase: "Planning Phase (MRP & BOM)",
                desc: "If stock is low, the MRP module dissects the Bill of Materials (BOM) to automatically calculate raw materials, machine schedules, and labor needs.",
                icon: Calculator
            },
            {
                phase: "Execution Phase (Production & IoT)",
                desc: "Work orders are sent to the production floor. Via Built-to-Fit, machine data can be pulled directly via IoT, providing accurate output reports without manual input.",
                icon: Cpu
            },
            {
                phase: "Output & Distribution Phase",
                desc: "Finished goods enter Inventory with barcode/QR systems for precise logistics tracking until they reach the customer.",
                icon: Truck
            },
            {
                phase: "Financial Phase",
                desc: "All costs (raw materials, electricity, labor/payroll) are automatically converted into Profit & Loss statements and Balance Sheets.",
                icon: BarChart4
            }
        ],
        strategicTitle: "Strategic Arguments for Business Growth",
        arguments: [
            {
                title: "Data-Driven Manufacturing",
                tagline: "Precision Production",
                desc: "Eliminate speculation in production. With BOM and MRP integration, know exactly the production cost of a single unit down to the smallest detail. This allows for more competitive pricing with secure margins.",
                icon: BarChart3
            },
            {
                title: "Smart Logistics Management",
                tagline: "Optimized Flow",
                desc: "Logistics isn't just about shipping; it's about turnover speed. Real-time Tracking and Multi-Warehouse Management ensure no stock dies in the warehouse, optimizing the company's cash flow.",
                icon: Package
            },
            {
                title: "Advanced Customization",
                tagline: "Tailor-Made Solutions",
                desc: "We understand every factory has unique rules. Built-to-Fit allows us to build Custom Payroll components based on production targets or IoT sensor integration for preventive maintenance.",
                icon: Settings2
            },
            {
                title: "Automated Consolidation",
                tagline: "Real-time Reporting",
                desc: "Say goodbye to month-end overtime just to pull reports. Axon consolidates data instantly, giving you a real-time view of your financial health for quick decision-making.",
                icon: LayoutDashboard
            },
            {
                title: "Security & Scalability",
                tagline: "Enterprise Grade",
                desc: "As your technology partner, we ensure your industrial data is securely stored with industry-standard encryption on flexible servers, ready to grow as you add lines or branches.",
                icon: ShieldCheck
            }
        ],
        conclusionTitle: "Value Proposition",
        conclusion: "Axon is more than just an application; it's a digital asset investment. We streamline complex processes into simple, measurable, and transparent flows. With Axon, you don't just manage a business—you lead the market with efficiency.",
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-[150] cursor-pointer"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[151] pointer-events-none p-2 md:p-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: "spring", damping: 30, stiffness: 200 }}
                            className="bg-background border border-border/50 w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-2xl pointer-events-auto relative selection:bg-indigo-500/30"
                        >
                            {/* Header Gradient Decor */}
                            <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent -z-10" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 p-3 rounded-full bg-muted/50 hover:bg-indigo-600 hover:text-white text-muted-foreground transition-all duration-300 z-10 shadow-lg group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform" />
                            </button>

                            <div className="p-6 md:p-16">
                                {/* Hero Section */}
                                <div className="max-w-4xl mb-12 md:mb-20">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                                            <Factory className="text-white" size={32} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Solutions Deep Dive</span>
                                            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter leading-none mt-1">
                                                {lang === 'ID' ? 'Industri Manufaktur & Logistik' : 'Manufacturing & Logistics'}
                                            </h2>
                                        </div>
                                    </motion.div>

                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-base md:text-2xl font-medium text-muted-foreground leading-relaxed"
                                    >
                                        {t.intro}
                                    </motion.p>
                                </div>

                                {/* Workflow Section */}
                                <div className="mb-16 md:mb-24">
                                    <div className="mb-12">
                                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-600 mb-4">{t.workflowTitle}</h3>
                                        <p className="text-xl font-bold text-foreground opacity-70">{t.workflowSubtitle}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                                        {/* Connector Line (Desktop) */}
                                        <div className="hidden md:block absolute top-[60px] left-[50px] right-[50px] h-[2px] bg-gradient-to-r from-indigo-600/20 via-indigo-600/40 to-indigo-600/20 -z-10" />

                                        {t.workflow.map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                                className="group"
                                            >
                                                <div className="mb-6 w-12 h-12 rounded-full bg-background border-2 border-indigo-600/30 flex items-center justify-center text-indigo-600 font-black shadow-inner group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 mx-auto md:mx-0">
                                                    <item.icon size={20} />
                                                </div>
                                                <h4 className="font-black text-[10px] uppercase tracking-tighter mb-2 text-foreground group-hover:text-indigo-600 transition-colors">{item.phase}</h4>
                                                <p className="text-[9px] leading-relaxed text-muted-foreground font-medium">{item.desc}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Strategic Arguments Grid */}
                                <div className="mb-24">
                                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-600 mb-12">{t.strategicTitle}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {t.arguments.map((arg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + (idx * 0.1) }}
                                                whileHover={{ y: -5 }}
                                                className="p-8 rounded-[2.5rem] bg-muted/30 border border-border/50 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative overflow-hidden"
                                            >
                                                {/* Hover Gradient Background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/[0.03] to-purple-600/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                <div className="relative z-10">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                                        <arg.icon size={24} className="text-white" />
                                                    </div>
                                                    <div className="mb-4">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 opacity-60 mb-1 block">{arg.tagline}</span>
                                                        <h4 className="text-xl font-black text-foreground tracking-tight">{arg.title}</h4>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                                        {arg.desc}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conclusion & Value Prop */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center pt-16 border-t border-border/50">
                                    <div className="md:col-span-8">
                                        <h3 className="text-2xl font-black text-foreground mb-4 tracking-tighter uppercase">{t.conclusionTitle}</h3>
                                        <p className="text-xl font-medium text-muted-foreground leading-relaxed">
                                            {t.conclusion}
                                        </p>
                                    </div>
                                    <div className="md:col-span-4 flex justify-end">
                                        <Button
                                            onClick={onClose}
                                            className="rounded-[2rem] h-20 px-12 bg-indigo-600 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 group active:scale-95"
                                        >
                                            {t.closeBtn}
                                            <ArrowRight size={20} className="ml-4 group-hover:translate-x-2 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

function idxHeaderTranslation(lang: string) {
    return lang === 'ID' ? 'Manufaktur & Logistik' : 'Manufacturing & Logistics'
}
