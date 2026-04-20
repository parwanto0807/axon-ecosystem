"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Clock,
    MapPin,
    Camera,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    RefreshCcw,
    Activity,
    User,
    ArrowRightLeft,
    ScanLine,
    LogOut,
    Check,
    LayoutGrid,
    History,
    Menu as MenuIcon,
    Loader2,
    Calendar
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from 'next/link'
import { useUIStore } from "@/store/uiStore"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`
const MODEL_URL = "https://vladmandic.github.io/face-api/model/"

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function AttendanceLogPage() {
    const { data: session }: any = useSession()
    const { toggleMobileMenu } = useUIStore()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [location, setLocation] = useState<{ lat: number, lon: number, accuracy: number } | null>(null)
    const [locError, setLocError] = useState<string | null>(null)
    const [isCapturing, setIsCapturing] = useState(false)
    const [photo, setPhoto] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<any>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [faceapi, setFaceapi] = useState<any>(null)
    const [faceDetected, setFaceDetected] = useState(false)
    const [autoCaptureProgress, setAutoCaptureProgress] = useState(0)
    const [sensorStatus, setSensorStatus] = useState({ camera: false, gps: false })

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Helper: Check if now is within ±2 Hour window of schedule
    const checkWindow = (timeStr: string) => {
        if (!timeStr || !currentTime) return { ok: true, status: 'OK' };
        const [h, m] = timeStr.split(':').map(Number);
        const target = new Date(currentTime);
        target.setHours(h, m, 0, 0);
        
        const diffMs = currentTime.getTime() - target.getTime();
        const absDiff = Math.abs(diffMs);
        const twoHours = 2 * 60 * 60 * 1000;
        
        if (absDiff <= twoHours) return { ok: true, status: 'OK' };
        return { ok: false, status: diffMs < 0 ? 'EARLY' : 'LATE' };
    };

    const assignedLoc = status?.employee?.attendanceLocation;
    const currentDist = (location && assignedLoc) ? getDistance(location.lat, location.lon, assignedLoc.latitude, assignedLoc.longitude) : null;
    const isOutOfRange = currentDist !== null && currentDist > assignedLoc.radius;
    const isLowAccuracy = location !== null && location.accuracy > 200; // Akurasi di atas 200m dianggap tidak akurat/ISP
    const isNoAssignment = status?.employee && !assignedLoc;

    const hasIn = status?.logs?.some((l: any) => l.type === 'CLOCK_IN');
    const hasOut = status?.logs?.some((l: any) => l.type === 'CLOCK_OUT');

    const inCheck = checkWindow(status?.schedule?.startTime);
    const outCheck = checkWindow(status?.schedule?.endTime);

    const inWindow = inCheck.ok;
    const outWindow = outCheck.ok;

    const canShowCamera = isCapturing && sensorStatus.gps && !isLowAccuracy && !isOutOfRange && assignedLoc && !hasOut && (inWindow || outWindow);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        loadModels()
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (session?.user?.id) fetchStatus()
    }, [session])

    useEffect(() => {
        if (modelsLoaded) {
            requestLocation()
        }
    }, [modelsLoaded])

    useEffect(() => {
        // Only start camera if GPS is valid, in range, and NOT finished for the day
        if (modelsLoaded && sensorStatus.gps && !isLowAccuracy && !isOutOfRange && assignedLoc && !hasOut) {
            startCamera()
        } else {
            stopCamera()
        }
        // Cleanup on unmount or state change
        return () => {
            if (!sensorStatus.gps || isLowAccuracy || isOutOfRange) {
                stopCamera()
            }
        }
    }, [modelsLoaded, sensorStatus.gps, isLowAccuracy, isOutOfRange, assignedLoc])

    const loadModels = async () => {
        try {
            const faceapiModule = await import("@vladmandic/face-api")
            setFaceapi(faceapiModule)
            await Promise.all([
                faceapiModule.nets.tinyFaceDetector.load(MODEL_URL),
                faceapiModule.nets.faceLandmark68Net.load(MODEL_URL),
            ])
            setModelsLoaded(true)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/hr/attendance/my-status?employeeId=${session?.user?.id || ''}`)
            const data = await res.json()
            setStatus(data)
        } catch (e) { console.error(e) }
    }

    const requestLocation = () => {
        if (!navigator.geolocation) return setLocError("GPS Not Supported")

        setLocError(null)
        setSensorStatus(prev => ({ ...prev, gps: false }))

        const timeout = setTimeout(() => {
            if (!location) setMessage({ type: 'error', text: "Pastikan GPS aktif & akurat" })
        }, 10000)

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timeout)
                setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy })
                setSensorStatus(prev => ({ ...prev, gps: true }))
                setLocError(null)
            },
            (err) => {
                let msg = "Gagal mengambil lokasi"
                if (err.code === 1) msg = "Izin Lokasi Ditolak. Buka Pengaturan Browser."
                if (err.code === 2) msg = "GPS Tidak Aktif. Nyalakan GPS di HP Anda."
                if (err.code === 3) msg = "Timeout GPS. Coba di tempat terbuka."
                setLocError(msg)
                setSensorStatus(prev => ({ ...prev, gps: false }))
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    const startCamera = async () => {
        setIsCapturing(true)
        setPhoto(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } },
                audio: false
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setSensorStatus(prev => ({ ...prev, camera: true }))
            }
        } catch (err) {
            setSensorStatus(prev => ({ ...prev, camera: false }))
            setIsCapturing(false)
        }
    }

    useEffect(() => {
        let interval: any = null;

        if (isCapturing && videoRef.current && !photo && modelsLoaded) {
            let detectionCount = 0;
            interval = setInterval(async () => {
                if (videoRef.current && videoRef.current.readyState === 4) {
                    // Set higher threshold (0.85) for strictness
                    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.85 });
                    const detection = await faceapi.detectSingleFace(videoRef.current, options);

                    if (detection && videoRef.current) {
                        const { x, y, width, height } = detection.box;
                        const videoWidth = videoRef.current.videoWidth;
                        const centerX = x + width / 2;

                        // Validation: Must be large enough and relatively centered
                        const isLargeEnough = width > 160;
                        const isCentered = centerX > videoWidth * 0.25 && centerX < videoWidth * 0.75;

                        if (isLargeEnough && isCentered) {
                            setFaceDetected(true);
                            detectionCount++;
                            // Increase to 20 frames for stability (~2 seconds)
                            setAutoCaptureProgress(Math.min((detectionCount / 20) * 100, 100));
                            if (detectionCount >= 20) {
                                clearInterval(interval);
                                takePhoto();
                            }
                        } else {
                            // If face found but position is wrong (side profile or too small)
                            setFaceDetected(false);
                            detectionCount = 0;
                            setAutoCaptureProgress(0);
                        }
                    } else {
                        setFaceDetected(false);
                        detectionCount = 0;
                        setAutoCaptureProgress(0);
                    }
                }
            }, 100);
        }

        return () => {
            if (interval) clearInterval(interval);
            setFaceDetected(false);
            setAutoCaptureProgress(0);
        }
    }, [isCapturing, photo, modelsLoaded, faceapi]);

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d')
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth
                canvasRef.current.height = videoRef.current.videoHeight
                context.drawImage(videoRef.current, 0, 0)
                setPhoto(canvasRef.current.toDataURL('image/webp'))
                stopCamera()
                setFaceDetected(false)
                setAutoCaptureProgress(0)
            }
        }
    }

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        }
        setIsCapturing(false)
    }

    const handleClock = async (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
        if (!location || !photo) return
        setLoading(true)
        try {
            const formData = new FormData()
            const blob = await (await fetch(photo)).blob()
            formData.append('image', blob, 'att.webp')
            formData.append('type', type)
            formData.append('employeeId', session.user.id)
            formData.append('latitude', location.lat.toString())
            formData.append('longitude', location.lon.toString())
            formData.append('accuracy', location.accuracy.toString())

            const res = await fetch(`${API_BASE}/hr/attendance/${type === 'CLOCK_IN' ? 'clock-in' : 'clock-out'}`, {
                method: 'POST',
                body: formData
            })
            const result = await res.json()
            if (res.ok) {
                setMessage({ type: result.attendance.status === 'VALID' ? 'success' : 'error', text: result.attendance.notes || "Absensi Berhasil" })
                setPhoto(null)
                fetchStatus()
            } else {
                setMessage({ type: 'error', text: result.message || "Gagal Absensi" })
            }
        } catch (e) {
            setMessage({ type: 'error', text: "Koneksi Terputus" })
        } finally { setLoading(false) }
    }


    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Native Thin Header (Stacked below Global Header) */}
            <div className="relative z-10 bg-white/95 backdrop-blur-2xl border-b border-slate-50 px-4 py-1.5 flex items-center justify-between shadow-sm shadow-slate-200/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        {session?.user?.image ? <img src={session.user.image} alt="U" className="w-full h-full object-cover" /> : <User size={14} />}
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Employee Profile</p>
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{session?.user?.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none tabular-nums">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 pt-2 pb-32 px-4 space-y-4 overflow-y-auto max-w-md mx-auto w-full">

                {/* Geofencing Warning Banners */}
                <AnimatePresence>
                    {isNoAssignment && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0"><AlertCircle size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black text-amber-600 uppercase">Lokasi Belum Diatur</p>
                                <p className="text-[9px] font-bold text-amber-500 uppercase mt-1">Hubungi HR untuk menentukan lokasi tugas Anda.</p>
                            </div>
                        </motion.div>
                    )}

                    {isLowAccuracy && !isNoAssignment && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0"><Activity size={20} /></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-blue-600 uppercase">Akurasi GPS Rendah (±{Math.round(location?.accuracy || 0)}m)</p>
                                <p className="text-[9px] font-bold text-blue-500 uppercase mt-1">Sinyal tidak stabil. Gunakan HP atau keluar ruangan.</p>
                            </div>
                        </motion.div>
                    )}

                    {isOutOfRange && !isNoAssignment && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
                                <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">Lokasi Tidak Sesuai</p>
                                <p className="text-[9px] font-bold text-rose-500 uppercase mt-1">Anda masih diluar koordinat yang sudah ditentukan ({Math.round(currentDist || 0)}m)</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Camera Container */}
                <div className="relative aspect-square w-full rounded-[2.5rem] bg-slate-900 overflow-hidden shadow-2xl border-2 border-slate-50">
                    {canShowCamera ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <motion.div
                                    animate={{
                                        scale: faceDetected ? [1, 1.05, 1] : 1,
                                        borderColor: faceDetected ? '#10b981' : '#ffffff20'
                                    }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-[70%] h-[75%] border-[3px] border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-3 relative"
                                >
                                    <ScanLine className={`w-10 h-10 ${faceDetected ? 'text-emerald-500' : 'text-white/10'}`} />
                                    {faceDetected && (
                                        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden absolute bottom-10">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${autoCaptureProgress}%` }} className="h-full bg-emerald-500" />
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </>
                    ) : photo ? (
                        <img src={photo} alt="P" className="w-full h-full object-cover scale-x-[-1]" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                            {!modelsLoaded ? (
                                <>
                                    <Loader2 className="animate-spin text-white/20" size={32} />
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Loading AI Models...</p>
                                </>
                            ) : !sensorStatus.gps ? (
                                <>
                                    <MapPin className="text-rose-500/20 animate-pulse" size={48} />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest">{locError || "Menunggu GPS..."}</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase">Aktifkan lokasi di pengaturan perangkat Anda</p>
                                    </div>
                                    <button
                                        onClick={requestLocation}
                                        className="mt-4 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                                    >
                                        Coba Lagi
                                    </button>
                                </>
                            ) : isLowAccuracy ? (
                                <>
                                    <Activity className="text-rose-500/20" size={32} />
                                    <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-[0.2em] leading-relaxed">Sinyal GPS Lemah<br />(Akurasi ±{Math.round(location?.accuracy || 0)}m)</p>
                                </>
                            ) : isOutOfRange ? (
                                <>
                                    <AlertCircle className="text-rose-500/20" size={32} />
                                    <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-[0.2em] leading-relaxed">Anda masih diluar koordinat<br />yang sudah ditentukan</p>
                                    <p className="text-[8px] font-bold text-rose-500/20 uppercase mt-2">{assignedLoc.name}</p>
                                </>
                            ) : hasOut ? (
                                <>
                                    <CheckCircle2 className="text-emerald-500/30" size={48} />
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Absensi Selesai</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Sampai Jumpa Besok!</p>
                                </>
                            ) : (
                                <>
                                    <Camera className="text-white/10" size={32} />
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Initialising Camera...</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Sensor Overlays */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md border ${sensorStatus.camera ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${sensorStatus.camera ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[8px] font-black uppercase">CAM</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md border ${sensorStatus.gps ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${sensorStatus.gps ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[8px] font-black uppercase tracking-tight">
                                GPS {location && `[${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}] ±${Math.round(location.accuracy)}m`}
                            </span>
                        </div>
                    </div>

                    {photo && (
                        <button onClick={startCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-3xl hover:bg-white/20">
                            <RefreshCcw size={20} />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {status?.schedule && !inWindow && !outWindow && !hasOut && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-3xl bg-amber-50 border border-amber-100 text-[10px] font-black uppercase text-amber-700 text-center leading-relaxed">
                            <p className="mb-1">Bukan Jendela Waktu Absensi</p>
                            <p className="text-[8px] opacity-60">Window: 2 Jam Sebelum & Sesudah Jadwal</p>
                        </motion.div>
                    )}
                    {message && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={`p-4 rounded-3xl border text-[10px] font-black uppercase text-center leading-relaxed ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Minimal Today Logs */}
                <div className="bg-slate-50 p-6 rounded-[2rem] space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Status</p>
                            {status?.employee?.attendanceLocation && (
                                <div className="flex items-center gap-1.5 text-indigo-600">
                                    <MapPin size={10} />
                                    <span className="text-[9px] font-black uppercase">{status.employee.attendanceLocation.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="px-3 py-1 bg-white rounded-full text-[8px] font-black text-slate-600 uppercase border border-slate-200">
                                {status?.schedule?.startTime ? `${status.schedule.startTime} - ${status.schedule.endTime}` : 'No Schedule'}
                            </div>
                            {status?.schedule && (
                                <p className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">±2h Window Active</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {['CLOCK_IN', 'CLOCK_OUT'].map(type => {
                            const log = status?.logs?.find((l: any) => l.type === type)
                            return (
                                <div key={type} className={`p-4 rounded-[1.5rem] border ${log ? 'bg-white border-slate-100' : 'bg-slate-100/50 border-dashed border-slate-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${log ? (type === 'CLOCK_IN' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500') : 'bg-slate-200 text-slate-400'}`}>
                                            {type === 'CLOCK_IN' ? <ArrowRightLeft size={12} className="rotate-90" /> : <LogOut size={12} />}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">{type.split('_')[1]}</p>
                                    </div>
                                    <p className={`text-sm font-black uppercase ${log ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {log ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Native Fixed Bottom Actions - Positioned ABOVE MobileNav (h-20) */}
            <div className="fixed bottom-20 inset-x-0 z-[60] p-4 bg-white/90 backdrop-blur-2xl border-t border-slate-100 max-w-md mx-auto w-full shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        disabled={loading || !photo || !sensorStatus.gps || isOutOfRange || isNoAssignment || hasIn || !inWindow}
                        onClick={() => handleClock('CLOCK_IN')}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${isOutOfRange || isNoAssignment || hasIn || !inWindow ? 'bg-slate-200 text-slate-400 shadow-none' : 'bg-indigo-600 text-white shadow-indigo-200'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : (hasIn ? <Check size={14} /> : (isOutOfRange || isNoAssignment ? <AlertCircle size={14} /> : <Check size={14} />))}
                        <span className="truncate">{hasIn ? 'Sudah Masuk' : (!inWindow ? (inCheck.status === 'EARLY' ? 'Terlalu Pagi' : 'Sudah Lewat') : (isOutOfRange || isNoAssignment) ? 'Luar Radius' : 'Absen Masuk')}</span>
                    </button>
                    <button
                        disabled={loading || !photo || !sensorStatus.gps || isOutOfRange || isNoAssignment || hasOut || (!hasIn && !status?.logs?.length) || !outWindow}
                        onClick={() => handleClock('CLOCK_OUT')}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${hasOut || isOutOfRange || isNoAssignment || (!hasIn && !status?.logs?.length) || !outWindow ? 'bg-white border-2 border-slate-100 text-slate-300' : 'bg-white border-2 border-slate-100 text-slate-800'}`}
                    >
                        <span className="truncate">{hasOut ? 'Sudah Keluar' : (!outWindow ? (outCheck.status === 'EARLY' ? 'Belum Waktu' : 'Sudah Lewat') : (isOutOfRange || isNoAssignment) ? 'Luar Radius' : 'Absen Keluar')}</span>
                    </button>
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
