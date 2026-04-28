"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Network, RefreshCw } from "lucide-react";
import Link from "next/link";
import MikroTikStats from "@/components/dashboard/MikroTikStats";
import { useState } from "react";

export default function MikrotikStatusPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white px-4 lg:px-8 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/operational" className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">MikroTik Status</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-emerald-500">Live Monitoring</p>
                    </div>
                </div>
                <button 
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
                >
                    <RefreshCw size={18} />
                </button>
            </header>

            <main className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={refreshKey}
                >
                    <MikroTikStats deviceId="cmo6n97xe0000ig0gllj7yjyi" hideSelector={true} />
                </motion.div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Network size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-amber-800 uppercase tracking-tight mb-1">Pemberitahuan</p>
                        <p className="text-[10px] font-bold text-amber-700/80 leading-relaxed uppercase tracking-wider">
                            Data diperbarui secara real-time. Tutup halaman ini jika tidak digunakan untuk menghemat kuota data dan beban server.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
