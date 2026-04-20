"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { 
    Activity, 
    Wifi, 
    Cpu, 
    Database, 
    Clock, 
    Server,
    ShieldCheck,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
);

interface MikroTikStatsProps {
    deviceId?: string;
    hideSelector?: boolean;
}

const MikroTikStats = ({ deviceId, hideSelector = false }: MikroTikStatsProps) => {
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(deviceId || null);
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [peakRx, setPeakRx] = useState(0);
    const [peakTx, setPeakTx] = useState(0);
    const [trafficData, setTrafficData] = useState<{labels: string[], rx: number[], tx: number[]}>({
        labels: [],
        rx: [],
        tx: []
    });
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    
    // Ensure we always have /api prefix correctly
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
    const API_BASE = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;

    const fetchDevices = async () => {
        try {
            const devRes = await fetch(`${API_BASE}/infrastructure/mikrotik`);
            if (!devRes.ok) throw new Error("Gagal mengambil daftar perangkat");
            const data = await devRes.json();
            setDevices(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            } else if (data.length === 0) {
                setLoading(false);
                setError("Belum ada perangkat MikroTik yang terdaftar");
            }
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        if (fetching || !selectedId) return;
        try {
            setFetching(true);
            const id = selectedId;
            const [monRes, trafRes] = await Promise.all([
                fetch(`${API_BASE}/infrastructure/mikrotik/${id}/monitor`),
                fetch(`${API_BASE}/infrastructure/mikrotik/${id}/traffic`)
            ]);

            const monitor = await monRes.json();
            const traffic = await trafRes.json();

            setStats(monitor);

            // Update traffic chart
            let totalRx = 0;
            let totalTx = 0;
            if (Array.isArray(traffic)) {
                traffic.forEach((t: any) => {
                    totalRx += parseFloat(t['rx-bits-per-second'] || 0);
                    totalTx += parseFloat(t['tx-bits-per-second'] || 0);
                });
            }

            const mbpsRx = totalRx / 1000000;
            const mbpsTx = totalTx / 1000000;

            // Update Peaks
            setPeakRx(prev => Math.max(prev, mbpsRx));
            setPeakTx(prev => Math.max(prev, mbpsTx));

            setTrafficData(prev => {
                const newLabels = [...prev.labels, new Date().toLocaleTimeString()].slice(-20);
                const newRx = [...prev.rx, mbpsRx].slice(-20); // Mbps
                const newTx = [...prev.tx, mbpsTx].slice(-20); // Mbps
                return { labels: newLabels, rx: newRx, tx: newTx };
            });

            setLoading(false);
            setFetching(false);
        } catch (e: any) {
            console.error("Failed to fetch MikroTik stats", e);
            setError(e.message || "Gagal menghubungi server");
            setLoading(false);
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        if (selectedId) {
            // Reset charts when switching device
            setTrafficData({ labels: [], rx: [], tx: [] });
            setPeakRx(0);
            setPeakTx(0);
            setStats(null);
            fetchStats();
        }
        const interval = setInterval(fetchStats, 5000); // Polling every 5s
        return () => clearInterval(interval);
    }, [selectedId]);

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800
        },
        plugins: {
            legend: {
                display: false
            },
            datalabels: {
                display: (context: any) => {
                    return context.dataset.data[context.dataIndex] > 0.1;
                },
                color: (context: any) => {
                    return context.dataset.borderColor;
                },
                font: {
                    weight: 'bold',
                    size: 9,
                    family: "'Poppins', sans-serif"
                },
                align: 'top',
                anchor: 'end',
                offset: 2,
                formatter: (value: any) => {
                    return value.toFixed(1);
                }
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                titleColor: '#0f172a',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 14,
                cornerRadius: 16,
                titleFont: { size: 12, family: "'Poppins', sans-serif", weight: '800' },
                bodyFont: { size: 12, family: "'Poppins', sans-serif", weight: '600' },
                boxWidth: 8,
                boxHeight: 8,
                boxPadding: 8,
                usePointStyle: true,
                callbacks: {
                    label: (context: any) => {
                        return ` ${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 5,
                    font: { size: 9, family: "'Poppins', sans-serif", weight: '800' },
                    color: '#94a3b8'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: 'rgba(0,0,0,0.03)'
                },
                ticks: {
                    font: { size: 10, family: "'Poppins', sans-serif", weight: '800' },
                    color: '#94a3b8',
                    callback: (value: any) => value + ' Mb'
                }
            }
        },
        interaction: { intersect: false },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 0 }
        }
    };

    const chartData = {
        labels: trafficData.labels,
        datasets: [
            {
                label: 'Download',
                data: trafficData.rx,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                borderWidth: 3,
            },
            {
                label: 'Upload',
                data: trafficData.tx,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                borderWidth: 3,
            }
        ]
    };

    if (error) return (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <Activity size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Monitoring Offline</h4>
            <p className="text-xs text-slate-500 font-medium mb-4">{error}</p>
            <Button onClick={fetchStats} variant="outline" className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-10 px-6">
                Coba Lagi
            </Button>
        </Card>
    );

    if (loading && !stats) return (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 animate-pulse">
            <div className="h-40 bg-slate-100 rounded-2xl mb-4" />
            <div className="grid grid-cols-3 gap-2">
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-20 bg-slate-100 rounded-xl" />
                <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
        </Card>
    );

    if (!stats) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
        >
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden relative border-t-4 border-indigo-600">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Wifi size={120} className="text-indigo-600" />
                </div>
                
                <CardHeader className="p-8 pb-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                <Activity size={12} /> Live Network
                            </span>
                            
                            {/* Device Selector Dropdown */}
                            {devices.length > 1 && !hideSelector && (
                                <select 
                                    value={selectedId || ''} 
                                    onChange={(e) => setSelectedId(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-slate-900 text-[10px] font-black rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1 px-2 outline-none cursor-pointer uppercase tracking-tight"
                                >
                                    {devices.map((dev) => (
                                        <option key={dev.id} value={dev.id}>
                                            {dev.name || 'Unnamed Router'}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                            {devices.find(d => d.id === selectedId)?.name || 'MikroTik Infrastructure'}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                <Clock size={12} /> {stats?.uptime || '---'}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                                <ShieldCheck size={12} /> Online
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100">
                            <ArrowDown size={14} className="text-indigo-100" />
                            <span className="text-[10px] font-black text-white/70 uppercase">Peak Download</span>
                            <span className="text-xs font-black text-white">{peakRx.toFixed(1)} Mbps</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-100">
                            <ArrowUp size={14} className="text-emerald-50" />
                            <span className="text-[10px] font-black text-white/70 uppercase tracking-tight">Peak Upload</span>
                            <span className="text-xs font-black text-white">{peakTx.toFixed(1)} Mbps</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Traffic Graph */}
                        <div className="lg:col-span-2 h-[200px] relative">
                            <Line data={chartData} options={chartOptions} />
                        </div>

                        {/* Real-time Indicators */}
                        <div className="space-y-4 flex flex-col justify-center">
                            <div className="flex items-center justify-between p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100 group hover:bg-indigo-600 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 group-hover:bg-white group-hover:text-indigo-600">
                                        <ArrowDown size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1 group-hover:text-indigo-100">Download</p>
                                        <h4 className="text-xl font-black text-slate-900 group-hover:text-white">{trafficData.rx[trafficData.rx.length-1]?.toFixed(1) || 0} <span className="text-xs opacity-60">Mbps</span></h4>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100 group hover:bg-emerald-500 transition-all duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 group-hover:bg-white group-hover:text-emerald-500">
                                        <ArrowUp size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1 group-hover:text-emerald-50">Upload</p>
                                        <h4 className="text-xl font-black text-slate-900 group-hover:text-white">{trafficData.tx[trafficData.tx.length-1]?.toFixed(1) || 0} <span className="text-xs opacity-60">Mbps</span></h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl mb-2">
                                <Cpu size={16} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">CPU Load</p>
                            <h5 className="text-lg font-black text-slate-900">{stats.cpu}%</h5>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mb-2">
                                <Database size={16} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Free RAM</p>
                            <h5 className="text-lg font-black text-slate-900">{(stats.memory / 1024 / 1024).toFixed(1)} MB</h5>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl mb-2">
                                <Wifi size={16} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Live Users</p>
                            <h5 className="text-lg font-black text-slate-900">{stats.activeUsers}</h5>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default MikroTikStats;
