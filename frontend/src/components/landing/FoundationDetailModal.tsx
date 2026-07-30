"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    X, Home, Users, ShieldCheck, CreditCard, DoorOpen, MapPin,
    Wrench, ArrowRight, Users2, CalendarDays, FileText, Activity, Lock, BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface FoundationDetailModalProps { isOpen: boolean; onClose: () => void }

const translations = {
    ID: {
        title: "Detail Solusi: Yayasan & Perumahan",
        intro: "Kelola yayasan atau kompleks perumahan dengan transparansi penuh. Axon memastikan setiap aset, keamanan, dan administrasi berjalan sinkron tanpa celah.",
        workflowTitle: "Ekosistem Transparansi",
        workflowSubtitle: "Bagaimana Axon menciptakan lingkungan yang aman dan terorganisir:",
        workflow: [
            { phase: "Manajemen Data (HRM)", desc: "Database staf atau warga terpusat. Pengelolaan gaji dan slip digital secara instan.", icon: Users2 },
            { phase: "Kontrol Akses", desc: "Sinergi dengan Smart Gate. Kontrol tamu dan log absensi staf keamanan secara real-time.", icon: DoorOpen },
            { phase: "Patroli & Keamanan", desc: "Patroli petugas dengan pelacakan GPS real-time untuk menjamin keamanan setiap sudut area.", icon: MapPin },
            { phase: "Perawatan Aset", desc: "Jadwal pemeliharaan gedung atau fasilitas umum secara berkala untuk menjaga nilai aset.", icon: Wrench },
            { phase: "Laporan Konsolidasi", desc: "Laporan keuangan transparan, termasuk laporan khusus keuangan atau iuran warga.", icon: FileText }
        ],
        strategicTitle: "Kenapa Memilih Axon?",
        arguments: [
            { title: "Axon HRM", desc: "Sederhanakan penggajian guru dan staf. Slip gaji digital langsung ke smartphone.", icon: CreditCard },
            { title: "Axon Guard", desc: "Patroli real-time dengan GPS — pastikan petugas melakukan rute sesuai standar.", icon: Activity },
            { title: "Smart Gate & Akses", desc: "Integrasi gerbang pintar. Catat setiap tamu yang masuk dan keluar.", icon: Lock },
            { title: "Laporan Keuangan", desc: "Kelola dana keuangan dan iuran bulanan dengan sistem pelaporan detail.", icon: BarChart3 },
            { title: "Maintenance Aset", desc: "Jadwalkan perawatan rutin gedung, CCTV, dan fasilitas air.", icon: CalendarDays }
        ],
        conclusionTitle: "Investasi Ketenangan",
        conclusion: "Axon adalah mitra dalam membangun kepercayaan komunitas. Transparansi data dan keamanan terjamin menciptakan lingkungan yang harmonis dan profesional.",
        closeBtn: "Tutup"
    },
    EN: {
        title: "Solution Details: Foundation & Housing",
        intro: "Manage foundations or housing complexes with full transparency. Axon ensures every asset, security, and administration runs in sync.",
        workflowTitle: "Transparency Ecosystem",
        workflowSubtitle: "How Axon creates a safe and organized environment:",
        workflow: [
            { phase: "Data Management (HRM)", desc: "Centralized staff or resident database. Instant digital salary and slip management.", icon: Users2 },
            { phase: "Access Control", desc: "Synergy with Smart Gates. Real-time guest control and security staff attendance logs.", icon: DoorOpen },
            { phase: "Patrol & Security", desc: "Officer patrols with real-time GPS tracking to ensure comprehensive area safety.", icon: MapPin },
            { phase: "Asset Care", desc: "Periodic maintenance schedules for buildings or public facilities to maintain asset value.", icon: Wrench },
            { phase: "Consolidated Reports", desc: "Transparent financial reports, including scholarship or resident fee reports.", icon: FileText }
        ],
        strategicTitle: "Why Choose Axon?",
        arguments: [
            { title: "Axon HRM", desc: "Simplify teacher and staff payroll. Digital payslips sent directly to smartphones.", icon: CreditCard },
            { title: "Axon Guard", desc: "Real-time GPS patrol — ensure officers follow assigned routes to standard.", icon: Activity },
            { title: "Smart Gate & Access", desc: "Smart gate integration. Record every guest entering and leaving.", icon: Lock },
            { title: "Financial Reports", desc: "Manage scholarship funds and monthly fees with detailed reporting system.", icon: BarChart3 },
            { title: "Asset Maintenance", desc: "Schedule routine maintenance for buildings, CCTV, and water facilities.", icon: CalendarDays }
        ],
        conclusionTitle: "Investment in Peace of Mind",
        conclusion: "Axon is a partner in building community trust. With data transparency and guaranteed security, create a more harmonious and professional environment.",
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
                                            <Home className="text-primary w-7 h-7" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'ID' ? 'Solusi Komunitas' : 'Community Solutions'}</span>
                                            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1">
                                                {lang === 'ID' ? 'Yayasan & Perumahan' : 'Foundation & Housing'}
                                            </h2>
                                        </div>
                                    </div>
                                    <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed">{t.intro}</p>
                                </div>

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
