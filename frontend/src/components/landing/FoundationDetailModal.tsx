"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    Home,
    Users,
    ShieldCheck,
    CreditCard,
    School,
    DoorOpen,
    MapPin,
    Wrench,
    ArrowRight,
    Users2,
    CalendarDays,
    FileText,
    Activity,
    Lock,
    LayoutDashboard,
    SearchCheck,
    BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface FoundationDetailModalProps {
    isOpen: boolean
    onClose: () => void
}

const translations = {
    ID: {
        title: "Detail Solusi: Yayasan Pendidikan & Perumahan",
        intro: "Kelola yayasan atau kompleks perumahan dengan transparansi penuh. Axon hadir untuk memastikan setiap aset, keamanan, dan administrasi berjalan sinkron tanpa celah miskomunikasi.",
        workflowTitle: "Ekosistem Transparansi Modern",
        workflowSubtitle: "Bagaimana Axon menciptakan lingkungan yang aman dan terorganisir:",
        workflow: [
            {
                phase: "Manajemen Data (HRM)",
                desc: "Database staf, atau warga terpusat. Pengelolaan gaji dan slip digital secara instan.",
                icon: Users2
            },
            {
                phase: "Kontrol Akses (Security)",
                desc: "Sinergi dengan Smart Gate. Kontrol tamu dan log absensi staf keamanan secara real-time.",
                icon: DoorOpen
            },
            {
                phase: "Patroli & Keamanan (Guard)",
                desc: "Patroli petugas dengan pelacakan GPS real-time untuk menjamin keamanan setiap sudut area.",
                icon: MapPin
            },
            {
                phase: "Perawatan Aset (Maintenance)",
                desc: "Jadwal pemeliharaan gedung atau fasilitas umum secara berkala untuk menjaga nilai aset.",
                icon: Wrench
            },
            {
                phase: "Laporan Konsolidasi",
                desc: "Laporan keuangan transparan, termasuk laporan khusus keuangan atau iuran warga.",
                icon: FileText
            }
        ],
        strategicTitle: "Kenapa Memilih Axon untuk Komunitas Anda?",
        arguments: [
            {
                title: "Axon HRM (Gaji & Slip Digital)",
                tagline: "Admin Tanpa Kertas",
                desc: "Sederhanakan penggajian guru dan staf. Kirim slip gaji digital langsung ke smartphone mereka, pastikan akurasi tanpa kesalahan manual.",
                icon: CreditCard
            },
            {
                title: "Axon Guard (Patroli Real-time)",
                tagline: "Keamanan Terpantau",
                desc: "Pastikan petugas keamanan melakukan patroli sesuai rute. Sistem GPS memverifikasi kehadiran mereka di titik-titik krusial secara real-time.",
                icon: Activity
            },
            {
                title: "Smart Gate & Manajemen Akses",
                tagline: "Kontrol Tamu Presisi",
                desc: "Integrasikan sistem dengan gerbang pintar. Catat setiap tamu yang masuk dan keluar untuk keamanan warga atau lingkungan sekolah.",
                icon: Lock
            },
            {
                title: "Laporan Keuangan & Iuran",
                tagline: "Transparansi Penuh",
                desc: "Kelola dana keuangan untuk iuran bulanan warga dengan sistem pelaporan yang detail dan mudah dipantau oleh pengurus.",
                icon: BarChart3
            },
            {
                title: "Jadwal Maintenance Aset",
                tagline: "Aset Terawat",
                desc: "Jangan tunggu rusak. Jadwalkan perawatan rutin untuk gedung, CCTV, hingga fasilitas air agar semua tetap berfungsi optimal.",
                icon: CalendarDays
            }
        ],
        conclusionTitle: "Investasi Ketenangan Pikiran",
        conclusion: "Axon bukan sekadar software, tapi mitra dalam membangun kepercayaan komunitas. Dengan transparansi data dan keamanan yang terjamin, Anda menciptakan lingkungan yang lebih harmonis dan profesional.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Education Foundation & Housing",
        intro: "Manage foundations or housing complexes with full transparency. Axon ensures every asset, security, and administration runs in sync without communication gaps.",
        workflowTitle: "Modern Transparency Ecosystem",
        workflowSubtitle: "How Axon creates a safe and organized environment:",
        workflow: [
            {
                phase: "Data Management (HRM)",
                desc: "Centralized teacher, staff, or resident database. Instant digital salary and slip management.",
                icon: Users2
            },
            {
                phase: "Access Control (Security)",
                desc: "Synergy with Smart Gates. Real-time guest control and security staff attendance logs.",
                icon: DoorOpen
            },
            {
                phase: "Patrol & Security (Guard)",
                desc: "Officer patrols with real-time GPS tracking to ensure the safety of every corner.",
                icon: MapPin
            },
            {
                phase: "Asset Care (Maintenance)",
                desc: "Periodic maintenance schedules for buildings or public facilities to maintain asset value.",
                icon: Wrench
            },
            {
                phase: "Consolidated Reports",
                desc: "Transparent financial reports, including specific scholarship or resident fee reports.",
                icon: FileText
            }
        ],
        strategicTitle: "Why Choose Axon for Your Community?",
        arguments: [
            {
                title: "Axon HRM (Digital Payroll)",
                tagline: "Paperless Admin",
                desc: "Simplify teacher and staff payroll. Send digital payslips directly to their smartphones, ensuring accuracy without manual errors.",
                icon: CreditCard
            },
            {
                title: "Axon Guard (Real-time Patrol)",
                tagline: "Monitored Security",
                desc: "Ensure security officers patrol according to the route. GPS verifies their presence at crucial points in real-time.",
                icon: Activity
            },
            {
                title: "Smart Gate & Access Control",
                tagline: "Precise Guest Control",
                desc: "Integrate the system with smart gates. Record every guest entering and leaving for the safety of residents or school grounds.",
                icon: Lock
            },
            {
                title: "Scholarship & Fee Reports",
                tagline: "Full Transparency",
                desc: "Manage scholarship funds for students or monthly resident fees with a detailed reporting system easy for management to monitor.",
                icon: BarChart3
            },
            {
                title: "Asset Maintenance Schedule",
                tagline: "Maintained Assets",
                desc: "Don't wait for damage. Schedule routine maintenance for buildings, CCTV, to water facilities to keep everything optimal.",
                icon: CalendarDays
            }
        ],
        conclusionTitle: "Investment in Peace of Mind",
        conclusion: "Axon is more than software; it's a partner in building community trust. With data transparency and guaranteed security, you create a more harmonious and professional environment.",
        closeBtn: "Close"
    }
}

export function FoundationDetailModal({ isOpen, onClose }: FoundationDetailModalProps) {
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
                            <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-indigo-600/10 via-teal-600/5 to-transparent -z-10" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 p-3 rounded-full bg-muted/50 hover:bg-teal-600 hover:text-white text-muted-foreground transition-all duration-300 z-10 shadow-lg group"
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
                                        <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-600/20">
                                            <Home className="text-white" size={32} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600">Community Solutions</span>
                                            <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter leading-none mt-1">
                                                {lang === 'ID' ? 'Yayasan & Perumahan' : 'Foundation & Housing'}
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
                                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-teal-600 mb-4">{t.workflowTitle}</h3>
                                        <p className="text-xl font-bold text-foreground opacity-70">{t.workflowSubtitle}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                                        {/* Connector Line (Desktop) */}
                                        <div className="hidden md:block absolute top-[60px] left-[50px] right-[50px] h-[2px] bg-gradient-to-r from-teal-600/20 via-teal-600/40 to-teal-600/20 -z-10" />

                                        {t.workflow.map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                                className="group"
                                            >
                                                <div className="mb-6 w-12 h-12 rounded-full bg-background border-2 border-teal-600/30 flex items-center justify-center text-teal-600 font-black shadow-inner group-hover:border-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500 mx-auto md:mx-0">
                                                    <item.icon size={20} />
                                                </div>
                                                <h4 className="font-black text-[10px] uppercase tracking-tighter mb-2 text-foreground group-hover:text-teal-600 transition-colors">{item.phase}</h4>
                                                <p className="text-[9px] leading-relaxed text-muted-foreground font-medium">{item.desc}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Strategic Arguments Grid */}
                                <div className="mb-24">
                                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-teal-600 mb-12">{t.strategicTitle}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {t.arguments.map((arg, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + (idx * 0.1) }}
                                                whileHover={{ y: -5 }}
                                                className="p-8 rounded-[2.5rem] bg-muted/30 border border-border/50 hover:border-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 group relative overflow-hidden"
                                            >
                                                {/* Hover Gradient Background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-teal-600/[0.03] to-indigo-600/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                <div className="relative z-10">
                                                    <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-600/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                                        <arg.icon size={24} className="text-white" />
                                                    </div>
                                                    <div className="mb-4">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-teal-500 opacity-60 mb-1 block">{arg.tagline}</span>
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
                                            className="rounded-[2rem] h-20 px-12 bg-teal-600 hover:bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl shadow-teal-600/30 group active:scale-95"
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
