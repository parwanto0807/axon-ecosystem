"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/context/LanguageContext"
import { motion, AnimatePresence } from "framer-motion"
import {
    ClipboardList, Plus, Search, Edit, Trash2, X, Save, Calendar,
    CheckCircle2, AlertCircle, Link2,
    Users, Play, Pause, Check, UploadCloud,
    LayoutGrid, BarChart3, Loader2, CalendarDays, Paperclip, Trash,
    Clock, FileText, TrendingUp, Activity, ChevronLeft, ChevronRight,
    FileDown, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface MeetingFile { id: string; fileName: string; filePath: string; fileSize: number; mimeType?: string; uploadedBy?: string }
interface Meeting {
    id: string; title: string; date: string; location?: string; link?: string;
    participants?: string; agenda?: string; resume?: string; decisions?: string; followUp?: string;
    pic?: string; deadline?: string; status: string; files: MeetingFile[]
}
interface Activity { id?: string; fase?: string; modul?: string; activity: string; pic?: string; startDate?: string; endDate?: string; progress: number; status: string }
interface Planning {
    id: string; number: string; title: string; description?: string;
    projectId?: string; salesOrderId?: string;
    startDate?: string; endDate?: string; progress: number; status: string;
    project?: { number: string; name: string };
    salesOrder?: { number: string; subject: string; customer?: { name: string } };
    activities: Activity[]; meetings: Meeting[]
}

const emptyActivity = { fase: '', modul: '', activity: '', pic: '', startDate: '', endDate: '', progress: 0, status: 'PLANNED' }

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const PLAN_STATUS: Record<string, { label: string; color: string; dot: string; icon: any }> = {
    PLANNING:  { label: 'Planning',  color: 'bg-sky-50 text-sky-700 border-sky-200',            dot: 'bg-sky-400',     icon: Calendar },
    ONGOING:   { label: 'Ongoing',   color: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400',   icon: Play },
    ON_HOLD:   { label: 'On Hold',   color: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-400',  icon: Pause },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Check },
}
const ACT_STATUS: Record<string, { color: string; label: string }> = {
    PLANNED: { color: 'bg-sky-100 text-sky-700',     label: 'Planned' },
    ONGOING: { color: 'bg-amber-100 text-amber-700', label: 'Ongoing' },
    DONE:    { color: 'bg-emerald-100 text-emerald-700', label: 'Done' },
}
const MTG_STATUS: Record<string, { label: string; color: string; dot: string }> = {
    SCHEDULED: { label: 'Terjadwal', color: 'bg-sky-50 text-sky-700 border-sky-200',            dot: 'bg-sky-400' },
    DONE:      { label: 'Selesai',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    CANCELLED: { label: 'Dibatalkan',color: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-400' },
}
const STAGES = ['Kick-off & Requirement', 'Analisis & Desain', 'Development', 'Testing / UAT', 'Deploy & Serah Terima']
const FASE_COLORS = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', barBg: '#e0e7ff', barFill: '#6366f1' },
    { bg: 'bg-violet-50', text: 'text-violet-700', barBg: '#ede9fe', barFill: '#7c3aed' },
    { bg: 'bg-sky-50',    text: 'text-sky-700',    barBg: '#e0f2fe', barFill: '#0ea5e9' },
    { bg: 'bg-emerald-50',text: 'text-emerald-700',barBg: '#d1fae5', barFill: '#10b981' },
    { bg: 'bg-rose-50',   text: 'text-rose-700',   barBg: '#ffe4e6', barFill: '#f43f5e' },
    { bg: 'bg-amber-50',  text: 'text-amber-700',  barBg: '#fef3c7', barFill: '#f59e0b' },
]

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDT   = (d: string) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const api = () => process.env.NEXT_PUBLIC_API_URL
const daysBetween = (a: string | undefined, b: string | undefined) => {
    const s = a ? new Date(a).setHours(0,0,0,0) : Date.now()
    const e = b ? new Date(b).setHours(0,0,0,0) : Date.now()
    return Math.max(0, Math.round((e - s) / 86400000))
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const toInputDate = (d: Date | string) => {
    const x = new Date(d)
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
}
const daysRemaining = (end?: string) => {
    if (!end) return null
    return Math.round((new Date(end).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function DevelopmentPage() {
    const { data: session } = useSession()
    const { lang } = useLanguage()
    const t: any = lang === 'ID' ? ID : EN
    const userRole = (session?.user as any)?.role
    const userName = session?.user?.name || ''

    const [plans, setPlans] = useState<Planning[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [orders, setOrders] = useState<any[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [tab, setTab] = useState<'MATRIX' | 'MEETINGS'>('MATRIX')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [meetingModal, setMeetingModal] = useState<Meeting | null>(null)
    const [newMeeting, setNewMeeting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [pdfPreview, setPdfPreview] = useState(false)
    const [meetingPdfPreview, setMeetingPdfPreview] = useState<Meeting | null>(null)
    const [form, setForm] = useState({
        title: '', description: '', projectId: '', salesOrderId: '',
        startDate: toInputDate(new Date()),
        endDate: toInputDate(addDays(new Date(), 30)),
        activities: [0,1,2,3,4].map(i => ({ ...emptyActivity, activity: STAGES[i] }))
    })

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const headers: any = { 'x-user-role': userRole||'', 'x-user-dept': (session?.user as any)?.department||'', 'x-user-name': userName||'' }
            const [pRes, prjRes, ordRes] = await Promise.all([
                fetch(`${api()}/api/development-plannings`, { headers }).then(r => r.json()),
                fetch(`${api()}/api/projects`, { headers }).then(r => r.json()),
                fetch(`${api()}/api/orders`, { headers }).then(r => r.json()),
            ])
            setPlans(Array.isArray(pRes) ? pRes : [])
            setProjects(Array.isArray(prjRes) ? prjRes : [])
            setOrders(Array.isArray(ordRes) ? ordRes : [])
            if (!selectedId && Array.isArray(pRes) && pRes.length > 0) setSelectedId(pRes[0].id)
        } catch (e: any) { console.error(e) }
        setLoading(false)
    }, [userRole, userName, session, selectedId])

    useEffect(() => { load() }, [load])

    const selected = plans.find(p => p.id === selectedId) || null
    const avgProgress = (acts: Activity[]) => acts.length === 0 ? 0 : Math.round(acts.reduce((s,a) => s + (Number(a.progress)||0), 0) / acts.length)
    const deriveStatus = (acts: Activity[]) => {
        if (acts.length === 0) return 'PLANNING'
        if (avgProgress(acts) === 100) return 'COMPLETED'
        if (acts.some(a => a.status === 'ONGOING')) return 'ONGOING'
        return 'PLANNING'
    }

    const openCreate = () => {
        setEditId(null)
        setForm({ title:'', description:'', projectId:'', salesOrderId:'', startDate:toInputDate(new Date()), endDate:toInputDate(addDays(new Date(),30)), activities:STAGES.map(s => ({ ...emptyActivity, activity:s })) })
        setModalOpen(true)
    }
    const openEdit = (p: Planning) => {
        setEditId(p.id)
        setForm({ title:p.title, description:p.description||'', projectId:p.projectId||'', salesOrderId:p.salesOrderId||'', startDate:toInputDate(p.startDate||new Date()), endDate:toInputDate(p.endDate||addDays(new Date(),30)), activities:p.activities.length ? p.activities.map(a => ({ ...emptyActivity,...a })) : STAGES.map(s => ({ ...emptyActivity, activity:s })) })
        setModalOpen(true)
    }
    const handleSave = async () => {
        if (!form.title) return showToast('error','Judul wajib diisi')
        const validActs = form.activities.filter(a => a.activity.trim())
        if (validActs.length === 0) return showToast('error','Minimal 1 aktivitas')
        setSaving(true)
        try {
            const headers: any = { 'Content-Type':'application/json', 'x-user-role':userRole||'', 'x-user-name':userName||'' }
            const payload = { title:form.title, description:form.description, projectId:form.projectId||null, salesOrderId:form.salesOrderId||null, startDate:form.startDate, endDate:form.endDate, progress:avgProgress(validActs), status:deriveStatus(validActs), activities:validActs.map(a => ({ ...a, progress:Number(a.progress)||0 })) }
            const url = editId ? `${api()}/api/development-plannings/${editId}` : `${api()}/api/development-plannings`
            const res = await fetch(url, { method:editId?'PUT':'POST', headers, body:JSON.stringify(payload) })
            if (res.ok) { const saved = await res.json(); setModalOpen(false); showToast('success',editId?'Planning diperbarui':'Planning dibuat'); setSelectedId(saved.id); load() }
            else { const e = await res.json().catch(() => ({})); showToast('error',e.message||'Gagal menyimpan') }
        } catch (e: any) { showToast('error',e.message) }
        setSaving(false)
    }
    const handleDelete = async (p: Planning) => {
        if (!confirm(`Hapus planning "${p.title}"?`)) return
        const res = await fetch(`${api()}/api/development-plannings/${p.id}`, { method:'DELETE', headers:{'x-user-role':userRole||''} })
        if (res.ok) { showToast('success','Planning dihapus'); if (selectedId===p.id) setSelectedId(null); load() }
        else showToast('error','Gagal hapus')
    }
    const openNewMeeting = () => { setNewMeeting(true); setMeetingModal({ id:'', title:'', date:new Date().toISOString().slice(0,16), status:'SCHEDULED', files:[], agenda:'' }) }
    const openEditMeeting = (m: Meeting) => { setNewMeeting(false); setMeetingModal({...m}) }
    const saveMeeting = async () => {
        if (!meetingModal) return
        if (!meetingModal.title) return showToast('error','Judul rapat wajib diisi')
        setSaving(true)
        try {
            const headers: any = { 'Content-Type':'application/json', 'x-user-role':userRole||'', 'x-user-name':userName||'' }
            let res: Response
            if (newMeeting) {
                res = await fetch(`${api()}/api/development-plannings/${selectedId}/meetings`, { method:'POST', headers, body:JSON.stringify({ title:meetingModal.title, date:meetingModal.date, location:meetingModal.location, link:meetingModal.link, participants:meetingModal.participants, agenda:meetingModal.agenda }) })
            } else {
                res = await fetch(`${api()}/api/development-meetings/${meetingModal.id}`, { method:'PUT', headers, body:JSON.stringify({ title:meetingModal.title, date:meetingModal.date, location:meetingModal.location, link:meetingModal.link, participants:meetingModal.participants, agenda:meetingModal.agenda, resume:meetingModal.resume, decisions:meetingModal.decisions, followUp:meetingModal.followUp, pic:meetingModal.pic, deadline:meetingModal.deadline, status:meetingModal.status }) })
            }
            if (res.ok) { setMeetingModal(null); showToast('success',newMeeting?'Rapat dijadwalkan':'Rapat diperbarui'); load() }
            else { const e = await res.json().catch(() => ({})); showToast('error',e.message||'Gagal') }
        } catch (e: any) { showToast('error',e.message) }
        setSaving(false)
    }
    const deleteMeeting = async (m: Meeting) => {
        if (!confirm(`Hapus rapat "${m.title}"?`)) return
        const res = await fetch(`${api()}/api/development-meetings/${m.id}`, { method:'DELETE', headers:{'x-user-role':userRole||''} })
        if (res.ok) { showToast('success','Rapat dihapus'); load() } else showToast('error','Gagal hapus')
    }
    const uploadFiles = async (m: Meeting, files: FileList | null) => {
        if (!files||files.length===0) return
        setUploading(true)
        const fd = new FormData()
        Array.from(files).forEach(f => fd.append('files',f))
        const res = await fetch(`${api()}/api/development-meetings/${m.id}/files`, { method:'POST', headers:{'x-user-role':userRole||''}, body:fd })
        if (res.ok) { showToast('success','File terupload'); load() } else showToast('error','Upload gagal')
        setUploading(false)
    }
    const deleteFile = async (f: MeetingFile) => {
        if (!confirm(`Hapus file "${f.fileName}"?`)) return
        const res = await fetch(`${api()}/api/development-meetings/files/${f.id}`, { method:'DELETE', headers:{'x-user-role':userRole||''} })
        if (res.ok) { showToast('success','File dihapus'); load() } else showToast('error','Gagal hapus file')
    }
    const fmtSize = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`

    const exportPDF = useCallback(async () => {
        if (!selected) return
        const jsPDFModule = await import('jspdf')
        const autoTableModule = await import('jspdf-autotable')
        const jsPDF = jsPDFModule.default
        const autoTable = (autoTableModule as any).default

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const now = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })

        // ── COLORS
        const C = { indigo:[99,102,241] as [number,number,number], violet:[124,58,237] as [number,number,number], slate50:[248,250,252] as [number,number,number], slate100:[241,245,249] as [number,number,number], slate300:[203,213,225] as [number,number,number], slate500:[100,116,139] as [number,number,number], slate700:[51,65,85] as [number,number,number], slate900:[15,23,42] as [number,number,number], emerald:[16,185,129] as [number,number,number], amber:[245,158,11] as [number,number,number], rose:[244,63,94] as [number,number,number], white:[255,255,255] as [number,number,number] }
        const statusColor: Record<string,number[]> = { PLANNING:C.indigo, ONGOING:C.amber, ON_HOLD:C.rose, COMPLETED:C.emerald }
        const sColor = (statusColor[selected.status] || C.indigo) as [number,number,number]

        // ── HEADER BAND
        doc.setFillColor(...sColor)
        doc.rect(0, 0, pageW, 18, 'F')
        doc.setTextColor(...C.white)
        doc.setFont('helvetica','bold')
        doc.setFontSize(13)
        doc.text('Development Planning & Progress', 12, 7)
        doc.setFontSize(8)
        doc.setFont('helvetica','normal')
        doc.text(`Diekspor: ${now}`, 12, 12.5)
        doc.setFont('helvetica','bold')
        doc.setFontSize(8)
        doc.text(`${selected.number}`, pageW - 12, 7, { align:'right' })
        doc.setFont('helvetica','normal')
        doc.text(PLAN_STATUS[selected.status]?.label || selected.status, pageW - 12, 12.5, { align:'right' })

        // ── TITLE SECTION
        let y = 25
        doc.setTextColor(...C.slate900)
        doc.setFont('helvetica','bold')
        doc.setFontSize(14)
        doc.text(selected.title, 12, y)
        y += 5
        if (selected.description) {
            doc.setFont('helvetica','normal')
            doc.setFontSize(8)
            doc.setTextColor(...C.slate500)
            const lines = doc.splitTextToSize(selected.description, pageW - 24)
            doc.text(lines, 12, y)
            y += lines.length * 4 + 1
        }

        // ── META ROW
        doc.setFontSize(8)
        doc.setTextColor(...C.slate500)
        doc.setFont('helvetica','normal')
        const meta = [
            selected.project ? `Project: ${selected.project.number} — ${selected.project.name}` : null,
            selected.salesOrder ? `SO: ${selected.salesOrder.number} — ${selected.salesOrder.subject}` : null,
            `Periode: ${fmtDate(selected.startDate)} — ${fmtDate(selected.endDate)}`,
        ].filter(Boolean).join('     ')
        doc.text(meta, 12, y + 1)
        y += 6

        // ── STAT BOXES
        const rem = daysRemaining(selected.endDate)
        const stats = [
            { label:'AKTIVITAS', value:`${selected.activities.length}`, sub:`${selected.activities.filter(a=>a.status==='DONE').length} selesai`, color:C.indigo },
            { label:'RAPAT', value:`${selected.meetings.filter(m=>m.status==='DONE').length}/${selected.meetings.length}`, sub:'selesai', color:C.emerald },
            { label:'SISA HARI', value:rem!==null?String(Math.abs(rem)):'—', sub:rem!==null&&rem<0?'hari terlambat':'hari tersisa', color:rem!==null&&rem<0?C.rose:rem!==null&&rem<=7?C.amber:C.slate300 },
            { label:'PROGRESS', value:`${selected.progress}%`, sub:'keseluruhan', color:C.violet },
        ]
        const boxW = (pageW - 28) / 4
        stats.forEach((s, i) => {
            const bx = 12 + i * (boxW + 2)
            doc.setFillColor(...(s.color as [number,number,number]), 0.12 as any)
            doc.setFillColor(s.color[0], s.color[1], s.color[2])
            doc.setGState && doc.setGState(new (doc as any).GState({opacity:0.1}))
            doc.roundedRect(bx, y, boxW, 14, 2, 2, 'F')
            if (doc.setGState) doc.setGState(new (doc as any).GState({opacity:1}))
            doc.setTextColor(...(s.color as [number,number,number]))
            doc.setFont('helvetica','bold'); doc.setFontSize(7)
            doc.text(s.label, bx + 3, y + 4)
            doc.setFontSize(12); doc.setFont('helvetica','bold')
            doc.text(s.value, bx + 3, y + 10)
            doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(...C.slate500)
            doc.text(s.sub, bx + 3, y + 13.5)
        })
        y += 19

        // ── ACTIVITIES TABLE
        doc.setFontSize(9)
        doc.setFont('helvetica','bold')
        doc.setTextColor(...C.slate900)
        doc.text('Daftar Aktivitas', 12, y)
        y += 3

        autoTable(doc, {
            startY: y,
            margin: { left: 12, right: 12 },
            head: [['#', 'Fase', 'Modul', 'Aktivitas', 'PIC', 'Mulai', 'Selesai', 'Progress', 'Status']],
            body: selected.activities.map((a, idx) => [
                idx + 1,
                a.fase || '—',
                a.modul || '—',
                a.activity,
                a.pic || '—',
                fmtDate(a.startDate),
                fmtDate(a.endDate),
                `${a.progress}%`,
                ACT_STATUS[a.status]?.label || a.status,
            ]),
            styles: { fontSize: 7.5, cellPadding: 2.5, textColor: C.slate700, lineColor: C.slate100, lineWidth: 0.3 },
            headStyles: { fillColor: sColor, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: C.slate50 },
            columnStyles: {
                0: { cellWidth: 8, halign:'center' },
                1: { cellWidth: 22 },
                2: { cellWidth: 25 },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 21 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 18, halign:'center' },
                8: { cellWidth: 16, halign:'center' },
            },
            didParseCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const val = parseInt(data.cell.raw)
                    if (!isNaN(val)) {
                        if (val === 100) {
                            data.cell.styles.textColor = C.emerald
                            data.cell.styles.fontStyle = 'bold'
                        } else if (val >= 80) {
                            data.cell.styles.textColor = C.indigo
                            data.cell.styles.fontStyle = 'bold'
                        } else if (val >= 50) {
                            data.cell.styles.textColor = C.amber
                            data.cell.styles.fontStyle = 'bold'
                        } else if (val >= 30) {
                            data.cell.styles.textColor = C.rose
                            data.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
            },
            didDrawPage: (_data: any) => {
                // footer per page
                doc.setFontSize(6.5)
                doc.setTextColor(...C.slate300)
                doc.text(`${selected.number} — ${selected.title}`, 12, pageH - 5)
                doc.text(`Hal ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - 12, pageH - 5, { align:'right' })
            }
        })

        // ── MEETINGS TABLE (if any)
        if (selected.meetings.length > 0) {
            const afterActs = (doc as any).lastAutoTable?.finalY || y
            let my = afterActs + 8
            if (my + 30 > pageH) { doc.addPage(); my = 15 }
            doc.setFontSize(9)
            doc.setFont('helvetica','bold')
            doc.setTextColor(...C.slate900)
            doc.text('Daftar Rapat', 12, my)
            my += 3

            autoTable(doc, {
                startY: my,
                margin: { left: 12, right: 12 },
                head: [['#', 'Judul Rapat', 'Tanggal', 'Lokasi / Link', 'Peserta', 'Agenda / Poin', 'Status', 'Resume']],
                body: selected.meetings.map((m, idx) => [
                    idx + 1,
                    m.title,
                    fmtDT(m.date),
                    m.location || m.link || '—',
                    m.participants || '—',
                    m.agenda ? m.agenda.slice(0, 80) + (m.agenda.length > 80 ? '...' : '') : '—',
                    MTG_STATUS[m.status]?.label || m.status,
                    m.resume ? m.resume.slice(0, 80) + (m.resume.length > 80 ? '...' : '') : '—',
                ]),
                styles: { fontSize: 7.5, cellPadding: 2.5, textColor: C.slate700, lineColor: C.slate100, lineWidth: 0.3 },
                headStyles: { fillColor: [14,165,233] as [number,number,number], textColor: C.white, fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: C.slate50 },
                columnStyles: {
                    0: { cellWidth: 8, halign:'center' },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 22 },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 'auto' },
                    6: { cellWidth: 16, halign:'center' },
                    7: { cellWidth: 35 },
                },
                didDrawPage: (_data: any) => {
                    doc.setFontSize(6.5)
                    doc.setTextColor(...C.slate300)
                    doc.text(`${selected.number} — ${selected.title}`, 12, pageH - 5)
                    doc.text(`Hal ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - 12, pageH - 5, { align:'right' })
                }
            })
        }

        // ── LAST PAGE FOOTER
        doc.setFontSize(6.5)
        doc.setTextColor(...C.slate300)
        const lastFinalY = (doc as any).lastAutoTable?.finalY || 0
        if (lastFinalY < pageH - 10) {
            doc.text(`${selected.number} — ${selected.title}`, 12, pageH - 5)
            doc.text(`Hal ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - 12, pageH - 5, { align:'right' })
        }

        doc.save(`${selected.number} - ${selected.title}.pdf`)
        showToast('success', 'PDF berhasil diunduh!')
    }, [selected, showToast])

    const exportSingleMeetingPDF = useCallback(async (m: Meeting) => {
        if (!selected) return
        const jsPDFModule = await import('jspdf')
        const autoTableModule = await import('jspdf-autotable')
        const jsPDF = jsPDFModule.default
        const autoTable = (autoTableModule as any).default

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const now = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
        const isUndangan = m.status === 'SCHEDULED'

        const C = { indigo:[99,102,241] as [number,number,number], emerald:[16,185,129] as [number,number,number], slate50:[248,250,252] as [number,number,number], slate100:[241,245,249] as [number,number,number], slate300:[203,213,225] as [number,number,number], slate500:[100,116,139] as [number,number,number], slate700:[51,65,85] as [number,number,number], slate900:[15,23,42] as [number,number,number], white:[255,255,255] as [number,number,number] }
        
        const mainColor = isUndangan ? C.indigo : C.emerald

        // ── HEADER BAND
        doc.setFillColor(...mainColor)
        doc.rect(0, 0, pageW, 18, 'F')
        doc.setTextColor(...C.white)
        doc.setFont('helvetica','bold')
        doc.setFontSize(13)
        doc.text(isUndangan ? 'MEETING INVITATION' : 'MEETING MINUTES', 12, 7)
        doc.setFontSize(8)
        doc.setFont('helvetica','normal')
        doc.text(`Dicetak: ${now}`, 12, 12.5)
        doc.setFont('helvetica','bold')
        doc.setFontSize(8)
        doc.text(`${selected.number}`, pageW - 12, 7, { align:'right' })
        doc.setFont('helvetica','normal')
        doc.text(MTG_STATUS[m.status]?.label || m.status, pageW - 12, 12.5, { align:'right' })

        // ── TITLE SECTION
        let y = 25
        doc.setTextColor(...C.slate900)
        doc.setFont('helvetica','bold')
        doc.setFontSize(14)
        doc.text(m.title, 12, y)
        y += 5
        
        doc.setFont('helvetica','normal')
        doc.setFontSize(8)
        doc.setTextColor(...C.slate500)
        doc.text(`Proyek: ${selected.project?.name || selected.title}`, 12, y)
        y += 6

        // ── INFO TABLE
        autoTable(doc, {
            startY: y,
            margin: { left: 12, right: 12 },
            body: [
                ['Tanggal / Jam', fmtDT(m.date), 'Status', MTG_STATUS[m.status]?.label || m.status],
                ['Lokasi / Link', m.location || m.link || '—', 'PIC', m.pic || '—'],
                ['Peserta', m.participants || '—', 'Deadline', m.deadline ? fmtDate(m.deadline) : '—']
            ],
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.slate700, lineColor: C.slate100, lineWidth: 0.3 },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: C.slate50, cellWidth: 35, textColor: C.slate900 },
                1: { cellWidth: 58 },
                2: { fontStyle: 'bold', fillColor: C.slate50, cellWidth: 25, textColor: C.slate900 },
                3: { cellWidth: 68 }
            }
        })
        y = (doc as any).lastAutoTable.finalY + 8

        const drawBoxedSection = (title: string, text: string, color: [number,number,number]) => {
            if (y > pageH - 40) { doc.addPage(); y = 15 }
            autoTable(doc, {
                startY: y,
                margin: { left: 12, right: 12 },
                head: [[title]],
                body: [[text]],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 4, lineColor: color, lineWidth: 0.5 },
                headStyles: { fillColor: color, textColor: C.white, fontStyle: 'bold', fontSize: 10 },
                bodyStyles: { fillColor: C.white, textColor: C.slate700, fontStyle: 'normal' }
            })
            y = (doc as any).lastAutoTable.finalY + 6
        }

        if (m.agenda) drawBoxedSection('Agenda / Poin Pembahasan:', m.agenda, C.indigo)
        if (m.resume) drawBoxedSection('Resume / Keputusan:', m.resume, C.emerald)
        if (m.followUp) drawBoxedSection('Tindak Lanjut (Follow Up):', m.followUp, C.slate700)

        // ── SIGNATURE
        y += 10
        if (y + 40 > pageH - 20) {
            doc.addPage()
            y = 20
        }
        
        const sigX = pageW - 12 - 50 // right aligned
        doc.setFontSize(9)
        doc.setFont('helvetica','normal')
        doc.setTextColor(...C.slate700)
        doc.text(`Jakarta, ${now}`, sigX + 25, y, { align: 'center' })
        doc.setFont('helvetica','bold')
        doc.text(isUndangan ? 'PIC / Pengundang' : 'Pembuat Notulen', sigX + 25, y + 5, { align: 'center' })
        
        try {
            const ttdImg = new Image(); ttdImg.crossOrigin = 'anonymous'
            await new Promise<void>((resolve, reject) => { 
                ttdImg.onload = () => resolve(); 
                ttdImg.onerror = () => reject(); 
                ttdImg.src = '/TTD Fix.png' 
            })
            if (ttdImg.complete && ttdImg.naturalWidth > 0) {
                const tcv = document.createElement('canvas')
                tcv.width = ttdImg.naturalWidth; tcv.height = ttdImg.naturalHeight
                tcv.getContext('2d')!.drawImage(ttdImg, 0, 0)
                const ratio = ttdImg.naturalHeight / ttdImg.naturalWidth
                const tw = 30
                doc.addImage(tcv.toDataURL('image/png'), 'PNG', sigX + 10, y + 8, tw, tw * ratio)
            }
        } catch(e) {
            // ignore if image fails to load
        }

        doc.setFont('helvetica','bold')
        doc.text(m.pic || 'Parwanto', sigX + 25, y + 30, { align: 'center' })
        doc.setLineWidth(0.3)
        doc.setDrawColor(...C.slate300)
        doc.line(sigX, y + 32, sigX + 50, y + 32)

        // ── LAST PAGE FOOTER
        doc.setFontSize(6.5)
        doc.setTextColor(...C.slate300)
        doc.text(`${selected.number} — ${m.title}`, 12, pageH - 5)
        doc.text('Digenerate oleh Axon Ecosystem', pageW - 12, pageH - 5, { align:'right' })

        doc.save(`${isUndangan ? 'Undangan' : 'Notulen'} - ${m.title}.pdf`)
        showToast('success', 'Surat Rapat berhasil diunduh!')
    }, [selected, showToast])

    const filtered = plans.filter(p =>
        p.number.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.project?.name||'').toLowerCase().includes(search.toLowerCase()) ||
        (p.salesOrder?.subject||'').toLowerCase().includes(search.toLowerCase())
    )
    const matrix = (() => {
        if (!selected) return null
        const acts = [...selected.activities].sort((a,b) => (a.startDate||'').localeCompare(b.startDate||''))
        const dates = acts.flatMap(a => [a.startDate,a.endDate]).filter(Boolean) as string[]
        const lo = dates.length ? new Date(Math.min(...dates.map(d => new Date(d as string).getTime()))).setHours(0,0,0,0) : Date.now()
        const hi = dates.length ? new Date(Math.max(...dates.map(d => new Date(d as string).getTime()))).setHours(0,0,0,0) : Date.now()
        const span = Math.max(Math.round((hi-lo)/86400000)+1, 14)
        const days: Date[] = Array.from({length:span},(_,i) => addDays(new Date(lo),i))
        return { acts, days, lo: new Date(lo), span }
    })()
    const getFaseColor = (fase: string|undefined, acts: Activity[]) => {
        const fases = [...new Set(acts.map(a => a.fase||''))].filter(Boolean)
        const idx = fases.indexOf(fase||'')
        return FASE_COLORS[Math.max(0,idx) % FASE_COLORS.length]
    }

    const totalActs = selected?.activities.length || 0
    const doneActs  = selected?.activities.filter(a => a.status==='DONE').length || 0
    const mtgDone   = selected?.meetings.filter(m => m.status==='DONE').length || 0
    const remaining = daysRemaining(selected?.endDate)

    // ─── RENDER ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-10">

            {/* PAGE HEADER */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="w-full px-3 md:px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                            <LayoutGrid className="text-white" size={16} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none truncate">{t.title}</h1>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 hidden md:block">{t.subtitle}</p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-bold shadow-lg shadow-indigo-600/20 text-sm shrink-0 gap-1.5">
                        <Plus size={14} />
                        <span className="hidden sm:inline">{t.newPlan}</span>
                        <span className="sm:hidden">Buat</span>
                    </Button>
                </div>
            </div>

            {/* TOAST */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{opacity:0,y:-20,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10,scale:0.96}} className="fixed top-5 right-5 z-[200]">
                        <div className={`px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border bg-white ${toast.type==='success'?'border-emerald-200 text-emerald-800':'border-rose-200 text-rose-800'}`}>
                            {toast.type==='success'
                                ? <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={15} className="text-emerald-600" /></div>
                                : <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center"><AlertCircle size={15} className="text-rose-600" /></div>}
                            <span className="font-bold text-sm">{toast.msg}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN */}
            <div className="w-full px-3 md:px-5 py-4 md:py-5">
                <div className={`grid gap-5 md:gap-6 items-start transition-all duration-300 ${sidebarOpen ? 'grid-cols-1 lg:grid-cols-[360px_1fr]' : 'grid-cols-1 lg:grid-cols-[44px_1fr]'}`}>

                    {/* ── LEFT: PLANNING LIST (COLLAPSIBLE) ───────────────── */}
                    <div className={`relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${sidebarOpen ? '' : 'items-center'}`} style={{maxHeight:'calc(100vh - 120px)'}}
                    >
                        {/* ── COLLAPSED STATE ── */}
                        {!sidebarOpen && (
                            <div className="flex flex-col items-center gap-3 py-4 w-full">
                                {/* Expand button */}
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-all"
                                    title="Buka daftar planning"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                {/* Count badge */}
                                <span className="px-1.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black">{filtered.length}</span>
                                {/* Vertical label */}
                                <div className="flex-1 flex items-center justify-center mt-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300" style={{writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)'}}>Planning</span>
                                </div>
                                {/* Mini plan dots */}
                                <div className="flex flex-col gap-1.5 mb-3">
                                    {filtered.slice(0,8).map(p => {
                                        const sc = PLAN_STATUS[p.status] || PLAN_STATUS.PLANNING
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedId(p.id); setTab('MATRIX'); setSidebarOpen(true) }}
                                                title={p.title}
                                                className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-125 ${selectedId===p.id ? 'ring-2 ring-offset-1 ring-indigo-500' : ''} ${sc.dot}`}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── EXPANDED STATE ── */}
                        {sidebarOpen && (
                        <>
                        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Semua Planning</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black">{filtered.length}</span>
                                    {/* Collapse button */}
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                                        title="Tutup daftar planning"
                                    >
                                        <ChevronLeft size={13} />
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPl}
                                    className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-100 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all placeholder:text-slate-300" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50/80">
                            {loading && (
                                <div className="p-4 space-y-3">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="animate-pulse space-y-2 p-3 rounded-xl bg-slate-50">
                                            <div className="flex justify-between"><div className="h-2.5 bg-slate-200 rounded-full w-1/4" /><div className="h-2.5 bg-slate-200 rounded-full w-1/5" /></div>
                                            <div className="h-3.5 bg-slate-200 rounded-full w-4/5" />
                                            <div className="h-2 bg-slate-100 rounded-full w-full" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!loading && filtered.length === 0 && (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><ClipboardList size={22} className="text-slate-300" /></div>
                                    <p className="text-sm font-semibold text-slate-400">{t.empty}</p>
                                </div>
                            )}
                            {filtered.map((p, idx) => {
                                const sc = PLAN_STATUS[p.status] || PLAN_STATUS.PLANNING
                                const isSel = selectedId === p.id
                                return (
                                    <motion.button key={p.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:idx*0.04}}
                                        onClick={() => { setSelectedId(p.id); setTab('MATRIX') }}
                                        className={`w-full text-left px-4 py-4 transition-all group relative ${isSel?'bg-indigo-50/80':'hover:bg-slate-50/80'}`}>
                                        <div className={`absolute left-0 inset-y-0 w-[3px] rounded-r-full transition-all ${isSel?'bg-indigo-600':'bg-transparent'}`} />
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">{p.number}</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${sc.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                                            </span>
                                        </div>
                                        <div className={`font-bold text-[13px] leading-snug mb-1.5 transition-colors ${isSel?'text-indigo-700':'text-slate-800 group-hover:text-indigo-700'}`}>{p.title}</div>
                                        {(p.project || p.salesOrder) && (
                                            <div className="flex items-center gap-1 mb-2.5">
                                                <FileText size={10} className="text-slate-300 shrink-0" />
                                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                                    {p.project ? `PRJ ${p.project.number} — ${p.project.name}` : `${p.salesOrder?.number} — ${p.salesOrder?.customer?.name||''}`}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${p.progress===100?'bg-gradient-to-r from-emerald-400 to-emerald-500':'bg-gradient-to-r from-indigo-500 to-violet-500'}`} style={{width:`${p.progress}%`}} />
                                            </div>
                                            <span className={`text-[10px] font-black tabular-nums ${p.progress===100?'text-emerald-600':'text-slate-500'}`}>{p.progress}%</span>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>
                        </>
                        )}
                    </div>

                    {/* ── RIGHT: DETAIL ───────────────────────────────────── */}
                    <div className="space-y-4 min-w-0">
                        {!selected ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mx-auto mb-4"><ClipboardList size={28} className="text-indigo-300" /></div>
                                <p className="font-bold text-slate-400 text-sm">{t.selectPlan}</p>
                                <p className="text-xs text-slate-300 mt-1">Pilih planning dari daftar di sebelah kiri</p>
                            </div>
                        ) : (
                            <>
                                {/* SUMMARY CARD */}
                                <motion.div key={selected.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className={`h-1 w-full ${selected.status==='COMPLETED'?'bg-gradient-to-r from-emerald-400 to-teal-400':selected.status==='ONGOING'?'bg-gradient-to-r from-amber-400 to-orange-400':selected.status==='ON_HOLD'?'bg-gradient-to-r from-orange-400 to-rose-400':'bg-gradient-to-r from-indigo-500 to-violet-500'}`} />
                                    <div className="p-5 md:p-6">
                                        <div className="flex flex-col md:flex-row md:items-start gap-5">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{selected.number}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${(PLAN_STATUS[selected.status]||PLAN_STATUS.PLANNING).color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${(PLAN_STATUS[selected.status]||PLAN_STATUS.PLANNING).dot}`} />
                                                        {(PLAN_STATUS[selected.status]||PLAN_STATUS.PLANNING).label}
                                                    </span>
                                                    {selected.project && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100"><FileText size={9} /> {selected.project.number}</span>}
                                                    {selected.salesOrder && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100"><FileText size={9} /> {selected.salesOrder.number}</span>}
                                                </div>
                                                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-1">{selected.title}</h2>
                                                {selected.description && <p className="text-sm text-slate-500 leading-relaxed mb-3">{selected.description}</p>}
                                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
                                                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" />{fmtDate(selected.startDate)} — {fmtDate(selected.endDate)}</span>
                                                    <span className="flex items-center gap-1.5"><Users size={12} className="text-slate-300" />{mtgDone}/{selected.meetings.length} {t.meetingsDone}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="relative w-24 h-24">
                                                    <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                                                        <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                                        <circle cx="18" cy="18" r="15" fill="none" stroke={selected.progress===100?'#10b981':'#6366f1'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${selected.progress*0.942} 100`} className="transition-all duration-700" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-xl font-black text-slate-900 leading-none">{selected.progress}%</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.progress}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => openEdit(selected)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-xs font-bold transition-all">
                                                        <Edit size={13} /> {t.editPlan}
                                                    </button>
                                                    <button onClick={() => setPdfPreview(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all">
                                                        <Eye size={13} /> Preview PDF
                                                    </button>
                                                    <button onClick={() => handleDelete(selected)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all">
                                                        <Trash2 size={13} /> {t.deletePlan}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STAT MINI CARDS */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
                                            <div className="bg-indigo-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1.5"><Activity size={12} className="text-indigo-500" /><span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Aktivitas</span></div>
                                                <div className="text-xl font-black text-indigo-700">{totalActs}</div>
                                                <div className="text-[10px] text-indigo-400 font-semibold">{doneActs} selesai</div>
                                            </div>
                                            <div className="bg-emerald-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1.5"><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Rapat</span></div>
                                                <div className="text-xl font-black text-emerald-700">{mtgDone}</div>
                                                <div className="text-[10px] text-emerald-400 font-semibold">dari {selected.meetings.length} total</div>
                                            </div>
                                            <div className={`rounded-xl p-3 ${remaining!==null&&remaining<0?'bg-rose-50':remaining!==null&&remaining<=7?'bg-amber-50':'bg-slate-50'}`}>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Clock size={12} className={remaining!==null&&remaining<0?'text-rose-500':remaining!==null&&remaining<=7?'text-amber-500':'text-slate-400'} />
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${remaining!==null&&remaining<0?'text-rose-500':remaining!==null&&remaining<=7?'text-amber-600':'text-slate-400'}`}>Sisa Hari</span>
                                                </div>
                                                <div className={`text-xl font-black ${remaining!==null&&remaining<0?'text-rose-700':remaining!==null&&remaining<=7?'text-amber-700':'text-slate-700'}`}>
                                                    {remaining!==null?(remaining<0?Math.abs(remaining):remaining):'—'}
                                                </div>
                                                <div className={`text-[10px] font-semibold ${remaining!==null&&remaining<0?'text-rose-400':remaining!==null&&remaining<=7?'text-amber-400':'text-slate-400'}`}>
                                                    {remaining!==null&&remaining<0?'hari terlambat':'hari tersisa'}
                                                </div>
                                            </div>
                                            <div className="bg-violet-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1.5"><TrendingUp size={12} className="text-violet-500" /><span className="text-[9px] font-black uppercase tracking-wider text-violet-500">Progress</span></div>
                                                <div className="text-xl font-black text-violet-700">{selected.progress}%</div>
                                                <div className="w-full h-1.5 bg-violet-100 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-700" style={{width:`${selected.progress}%`}} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* TABS */}
                                <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-fit">
                                    {([{key:'MATRIX',icon:BarChart3,label:t.matrix},{key:'MEETINGS',icon:CalendarDays,label:t.meetings,count:selected.meetings.length}] as any[]).map(({key,icon:Icon,label,count}) => (
                                        <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab===key?'bg-indigo-600 text-white shadow-md shadow-indigo-600/20':'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                                            <Icon size={13} />{label}
                                            {count!==undefined&&count>0&&<span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab===key?'bg-white/20 text-white':'bg-slate-100 text-slate-500'}`}>{count}</span>}
                                        </button>
                                    ))}
                                </div>

                                {/* MATRIX TAB */}
                                {tab==='MATRIX'&&matrix&&(
                                    <motion.div key="matrix" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><BarChart3 size={13} className="text-indigo-600" /></div>
                                                <h3 className="text-sm font-black text-slate-700">{t.scheduleMatrix}</h3>
                                            </div>
                                            <span className="text-[11px] text-slate-400 font-semibold hidden sm:block">
                                                {matrix.lo.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})} — {fmtDate(matrix.days[matrix.days.length-1].toISOString())}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse" style={{minWidth:Math.max(700,200+matrix.span*28)+'px'}}>
                                                <thead>
                                                    <tr className="border-b-2 border-slate-100 bg-slate-50/80">
                                                        <th className="sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10 px-4 py-3 text-left border-r border-slate-100 w-52 xl:w-64">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.activity}</span>
                                                        </th>
                                                        {matrix.days.map((d,i) => {
                                                            const isSun=d.getDay()===0, isSat=d.getDay()===6
                                                            const isToday=new Date().toDateString()===d.toDateString()
                                                            return (
                                                                <th key={i} className={`py-2 text-center ${isToday?'bg-indigo-600':isSun?'bg-rose-50':isSat?'bg-slate-100':''}`} style={{width:Math.max(24,Math.min(52,1600/matrix.span))+'px'}}>
                                                                    <div className={`text-[7px] font-bold ${isToday?'text-white':isSun?'text-rose-400':isSat?'text-slate-400':'text-slate-300'}`}>
                                                                        {['M','S','S','R','K','J','S'][d.getDay()]}
                                                                    </div>
                                                                    <div className={`text-[9px] font-black ${isToday?'text-white':isSun?'text-rose-500':isSat?'text-slate-500':'text-slate-400'}`}>{d.getDate()}</div>
                                                                    {d.getDate()===1&&<div className={`text-[6px] font-bold ${isToday?'text-indigo-200':'text-slate-300'}`}>{d.toLocaleDateString('id-ID',{month:'short'}).toUpperCase()}</div>}
                                                                </th>
                                                            )
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {matrix.acts.map((a,i) => {
                                                        const pct = (el?: string) => matrix.days.length===0?0:(daysBetween(matrix.days[0].toISOString(),el)*100/matrix.days.length)
                                                        const startPct=pct(a.startDate)
                                                        const widthPct=Math.max(3,((daysBetween(a.startDate,a.endDate)+1)*100/matrix.days.length))
                                                        const todayPct=pct(new Date().toISOString())
                                                        const fc=getFaseColor(a.fase,matrix.acts)
                                                        const fases=[...new Set(matrix.acts.map(act=>act.fase||''))].filter(Boolean)
                                                        const isEven=(fases.indexOf(a.fase||''))%2===0
                                                        return (
                                                            <tr key={i} className="group border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                                                <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-100 ${isEven?'bg-white':'bg-slate-50/40'} group-hover:bg-slate-50/60`}>
                                                                    {a.fase&&<div className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1 ${fc.bg} ${fc.text}`}>{a.fase}</div>}
                                                                    <div className="text-[11px] font-bold text-slate-700 leading-snug">
                                                                        {a.modul&&<span className="text-slate-400 mr-1">{a.modul} —</span>}{a.activity}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        {a.pic&&<span className="text-[9px] text-slate-400 font-medium">{a.pic}</span>}
                                                                        <span className={`text-[8px] font-bold px-1.5 py-px rounded-md ${ACT_STATUS[a.status]?.color||'bg-slate-100 text-slate-500'}`}>{ACT_STATUS[a.status]?.label||a.status}</span>
                                                                    </div>
                                                                </td>
                                                                <td colSpan={matrix.days.length} className="relative h-12 px-1.5">
                                                                    <div className="absolute inset-y-0 w-px bg-indigo-400/50 z-10" style={{left:`${todayPct}%`}} title="Hari ini" />
                                                                    {(a.startDate||a.endDate)&&(
                                                                        <div className="absolute top-1/2 -translate-y-1/2 h-6 rounded-lg overflow-hidden shadow-sm" style={{left:`calc(${startPct}% + 2px)`,width:`calc(${widthPct}% - 4px)`,backgroundColor:fc.barBg}}>
                                                                            <div className="h-full transition-all duration-500" style={{width:`${Number(a.progress)||0}%`,backgroundColor:fc.barFill,opacity:0.75}} />
                                                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-600">{Number(a.progress)||0}%</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                    {matrix.acts.length===0&&<tr><td colSpan={matrix.days.length+1} className="p-10 text-center text-slate-400 text-sm">{t.noActivity}</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-5 flex-wrap">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Legend</span>
                                            {[{label:t.legendPlanned,color:'#e0e7ff'},{label:t.legendOngoing,color:'#fef3c7'},{label:t.legendDone,color:'#d1fae5'}].map(({label,color})=>(
                                                <span key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                                                    <span className="w-3 h-3 rounded-md inline-block border border-black/5" style={{backgroundColor:color}} />{label}
                                                </span>
                                            ))}
                                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><span className="w-px h-3 bg-indigo-400 inline-block" />Hari ini</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* MEETINGS TAB */}
                                {tab==='MEETINGS'&&(
                                    <motion.div key="meetings" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><CalendarDays size={13} className="text-indigo-600" /></div>
                                                <h3 className="text-sm font-black text-slate-700">{t.meetingList}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black">{selected.meetings.length}</span>
                                            </div>
                                            <Button onClick={openNewMeeting} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-1.5"><Plus size={13} />{t.newMeeting}</Button>
                                        </div>
                                        {selected.meetings.length===0&&(
                                            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3"><CalendarDays size={22} className="text-slate-300" /></div>
                                                <p className="text-sm font-semibold text-slate-400">{t.noMeeting}</p>
                                            </div>
                                        )}
                                        <div className="relative">
                                            {selected.meetings.length>1&&<div className="absolute left-[22px] top-10 bottom-10 w-px bg-slate-100 z-0" />}
                                            <div className="space-y-3 relative z-10">
                                                {selected.meetings.map((m,idx) => {
                                                    const mc=MTG_STATUS[m.status]||MTG_STATUS.SCHEDULED
                                                    return (
                                                        <motion.div key={m.id} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:idx*0.05}} className="flex gap-3">
                                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border-2 ${m.status==='DONE'?'bg-emerald-50 border-emerald-200':m.status==='CANCELLED'?'bg-slate-100 border-slate-200':'bg-indigo-50 border-indigo-100'}`}>
                                                                <Calendar size={17} className={m.status==='DONE'?'text-emerald-600':m.status==='CANCELLED'?'text-slate-400':'text-indigo-600'} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                                                <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-50">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="font-bold text-sm text-slate-800 truncate">{m.title}</div>
                                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                            <span className="text-[10px] text-slate-400 font-medium">{fmtDT(m.date)}</span>
                                                                            {m.location&&<span className="text-[10px] text-slate-400 font-medium">· {m.location}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0 group">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${mc.color}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${mc.dot}`} />{mc.label}
                                                                        </span>
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => setMeetingPdfPreview(m)} className="w-7 h-7 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors" title="Preview Surat"><FileText size={12} /></button>
                                                                            <button onClick={() => openEditMeeting(m)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"><Edit size={12} /></button>
                                                                            <button onClick={() => deleteMeeting(m)} className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="px-4 py-3 space-y-2.5">
                                                                    {m.participants&&<div className="flex items-center gap-2 text-[11px] text-slate-500"><Users size={11} className="text-slate-300 shrink-0" /><span className="font-semibold">{m.participants}</span></div>}
                                                                    {m.link&&<a href={m.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-indigo-600 font-bold hover:underline w-fit"><Link2 size={11} />{m.link}</a>}
                                                                    {(m.agenda||m.resume||m.decisions||m.followUp)&&(
                                                                        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 space-y-3 mt-2">
                                                                            {m.agenda&&<div><p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Agenda / Poin Pembahasan</p><p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{m.agenda}</p></div>}
                                                                            {m.resume&&<div><p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.resume}</p><p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{m.resume}</p></div>}
                                                                            {m.decisions&&<div><p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.decisions}</p><p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{m.decisions}</p></div>}
                                                                            {m.followUp&&(
                                                                                <div>
                                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.followUp}</p>
                                                                                    <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{m.followUp}</p>
                                                                                    {(m.pic||m.deadline)&&(
                                                                                        <div className="flex items-center gap-2 mt-1.5">
                                                                                            {m.pic&&<span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg"><Users size={9} />{m.pic}</span>}
                                                                                            {m.deadline&&<span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg"><Calendar size={9} />{fmtDate(m.deadline)}</span>}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between pt-1">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {m.files.length===0
                                                                                ? <span className="text-[10px] text-slate-300 font-medium">{t.noFile}</span>
                                                                                : m.files.map(f => (
                                                                                    <a key={f.id} href={`${api()}${f.filePath}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all">
                                                                                        <Paperclip size={10} className="text-indigo-400 shrink-0" />
                                                                                        <span className="max-w-[150px] truncate">{f.fileName}</span>
                                                                                        <span className="text-slate-300 text-[8px]">({fmtSize(f.fileSize)})</span>
                                                                                        <span onClick={e=>{e.preventDefault();e.stopPropagation();deleteFile(f)}} className="w-4 h-4 rounded flex items-center justify-center hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-colors" title="Hapus"><Trash size={9} /></span>
                                                                                    </a>
                                                                                ))
                                                                            }
                                                                        </div>
                                                                        <label className="cursor-pointer ml-2">
                                                                            <input type="file" multiple className="hidden" onChange={e=>uploadFiles(m,e.target.files)} disabled={uploading} />
                                                                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-[10px] font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all ${uploading?'opacity-50':''}`}>
                                                                                {uploading?<Loader2 size={10} className="animate-spin" />:<UploadCloud size={10} />}{t.upload}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* PLANNING FORM MODAL */}
            <AnimatePresence>
                {modalOpen&&(
                    <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                        <motion.div initial={{opacity:0,scale:0.96,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:10}} transition={{duration:0.2}} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center"><ClipboardList size={16} className="text-white" /></div>
                                    <div><h2 className="text-base font-black text-slate-900">{editId?t.editPlan:t.newPlan}</h2><p className="text-xs text-slate-400 font-medium">{t.formSub}</p></div>
                                </div>
                                <button onClick={()=>setModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex gap-1">Judul Planning <span className="text-rose-500">*</span></label>
                                    <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="cth: Development Portal Pelanggan" className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Project (opsional)</label>
                                        <select value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all">
                                            <option value="">— Pilih Project —</option>
                                            {projects.map(p=><option key={p.id} value={p.id}>{p.number} — {p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sales Order (opsional)</label>
                                        <select value={form.salesOrderId} onChange={e=>setForm({...form,salesOrderId:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all">
                                            <option value="">— Pilih Sales Order —</option>
                                            {orders.map(o=><option key={o.id} value={o.id}>{o.number} — {o.subject}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal Mulai</label>
                                        <input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal Selesai</label>
                                        <input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deskripsi</label>
                                    <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-none" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{t.activities}</label>
                                        <Button type="button" variant="outline" size="sm" onClick={()=>setForm({...form,activities:[...form.activities,{...emptyActivity}]})} className="h-8 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold gap-1"><Plus size={11} />{t.addActivity}</Button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.activities.map((a,i) => (
                                            <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2.5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <input value={a.fase||''} onChange={e=>{const acts=[...form.activities];acts[i]={...a,fase:e.target.value};setForm({...form,activities:acts})}} placeholder="Fase" className="h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                    <input value={a.modul||''} onChange={e=>{const acts=[...form.activities];acts[i]={...a,modul:e.target.value};setForm({...form,activities:acts})}} placeholder="Modul" className="h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <input value={a.activity} onChange={e=>{const acts=[...form.activities];acts[i]={...a,activity:e.target.value};setForm({...form,activities:acts})}} placeholder="Aktivitas / Deliverable *" className="flex-1 h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                    <input value={a.pic||''} onChange={e=>{const acts=[...form.activities];acts[i]={...a,pic:e.target.value};setForm({...form,activities:acts})}} placeholder="PIC" className="w-28 h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                </div>
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <input type="date" value={a.startDate||''} onChange={e=>{const acts=[...form.activities];acts[i]={...a,startDate:e.target.value};setForm({...form,activities:acts})}} className="w-36 h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                    <input type="date" value={a.endDate||''} onChange={e=>{const acts=[...form.activities];acts[i]={...a,endDate:e.target.value};setForm({...form,activities:acts})}} className="w-36 h-9 rounded-lg bg-white border border-slate-200 font-medium text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 px-3 transition-all" />
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-slate-400 font-semibold">Progress</span>
                                                        <input type="number" min={0} max={100} value={a.progress} onChange={e=>{const acts=[...form.activities];acts[i]={...a,progress:Number(e.target.value)||0,status:Number(e.target.value)>=100?'DONE':Number(e.target.value)>0?'ONGOING':'PLANNED'};setForm({...form,activities:acts})}} className="w-16 h-9 rounded-lg bg-white border border-slate-200 font-bold text-[12px] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                                        <span className="text-[10px] text-slate-400 font-semibold">%</span>
                                                    </div>
                                                    <button type="button" onClick={()=>setForm({...form,activities:form.activities.filter((_,j)=>j!==i)})} className="w-9 h-9 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                                <button onClick={()=>setModalOpen(false)} className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors">Batal</button>
                                <Button onClick={handleSave} disabled={saving} className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 gap-2">
                                    {saving?<Loader2 size={14} className="animate-spin" />:<Save size={14} />}{t.save}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MEETING FORM MODAL */}
            <AnimatePresence>
                {(meetingModal&&selected)&&(
                    <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
                        <motion.div initial={{opacity:0,scale:0.96,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:10}} transition={{duration:0.2}} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20"><CalendarDays size={16} className="text-white" /></div>
                                    <div><h2 className="text-lg font-black text-slate-900">{newMeeting?t.newMeeting:t.editMeeting}</h2><p className="text-xs text-slate-500 font-medium">Worksheet Pencatatan Rapat & Notulen</p></div>
                                </div>
                                <button onClick={()=>setMeetingModal(null)} className="w-9 h-9 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="p-6 overflow-y-auto" style={{maxHeight:'calc(100vh - 180px)'}}>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* COLUMN 1: METADATA */}
                                    <div className="lg:col-span-4 space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex gap-1">Judul Rapat <span className="text-rose-500">*</span></label>
                                            <textarea value={meetingModal.title} onChange={e=>setMeetingModal({...meetingModal,title:e.target.value})} rows={2} placeholder="cth: Kick-off Meeting" className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-y" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal & Jam</label>
                                            <input type="datetime-local" value={meetingModal.date||''} onChange={e=>setMeetingModal({...meetingModal,date:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                                            <select value={meetingModal.status} onChange={e=>setMeetingModal({...meetingModal,status:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all">
                                                <option value="SCHEDULED">Terjadwal</option>
                                                <option value="DONE">Selesai</option>
                                                <option value="CANCELLED">Dibatalkan</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lokasi / Ruangan</label>
                                            <input value={meetingModal.location||''} onChange={e=>setMeetingModal({...meetingModal,location:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Link Online Meeting</label>
                                            <input value={meetingModal.link||''} onChange={e=>setMeetingModal({...meetingModal,link:e.target.value})} placeholder="https://meet.google.com/..." className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Peserta (pisahkan koma)</label>
                                            <textarea value={meetingModal.participants||''} onChange={e=>setMeetingModal({...meetingModal,participants:e.target.value})} rows={3} placeholder="Nama peserta..." className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-y" />
                                        </div>
                                    </div>

                                    {/* COLUMN 2: WORKSHEET (AGENDA, RESUME, DLL) */}
                                    <div className="lg:col-span-8 space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Agenda / Poin Pembahasan</label>
                                            <textarea value={meetingModal.agenda||''} onChange={e=>setMeetingModal({...meetingModal,agenda:e.target.value})} rows={4} placeholder="1. Pembahasan fitur A&#10;2. Persiapan dokumen B" className="w-full rounded-xl bg-indigo-50/30 border border-indigo-100 px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-y" />
                                        </div>
                                        {!newMeeting&&(
                                            <>
                                                {[{key:'resume',label:'Resume / Notulen Hasil Rapat',placeholder:'Ringkasan pembahasan dan catatan...',rows:6,color:'emerald'},{key:'decisions',label:'Keputusan / Hasil Kesepakatan',placeholder:'1. ...\n2. ...',rows:4,color:'sky'},{key:'followUp',label:'Tindak Lanjut (Follow Up)',placeholder:'Tugas selanjutnya...',rows:4,color:'amber'}].map(({key,label,placeholder,rows,color})=>(
                                                    <div key={key} className="space-y-1.5">
                                                        <label className={`text-[10px] font-black uppercase tracking-widest text-${color}-600`}>{label}</label>
                                                        <textarea value={(meetingModal as any)[key]||''} onChange={e=>setMeetingModal({...meetingModal,[key]:e.target.value})} rows={rows} placeholder={placeholder} className={`w-full rounded-xl bg-${color}-50/30 border border-${color}-100 px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-${color}-500/30 focus:border-${color}-400 transition-all resize-y`} />
                                                    </div>
                                                ))}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl border border-slate-100 bg-slate-50/50 mt-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">PIC Tindak Lanjut</label>
                                                        <input value={meetingModal.pic||''} onChange={e=>setMeetingModal({...meetingModal,pic:e.target.value})} className="w-full h-11 rounded-xl bg-white border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deadline</label>
                                                        <input type="date" value={(meetingModal.deadline||'').slice(0,10)} onChange={e=>setMeetingModal({...meetingModal,deadline:e.target.value})} className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                                <button onClick={()=>setMeetingModal(null)} className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors">Batal</button>
                                <Button onClick={saveMeeting} disabled={saving} className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 gap-2">
                                    {saving?<Loader2 size={14} className="animate-spin" />:<Save size={14} />}{newMeeting?t.schedule:t.save}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PDF PREVIEW MODAL */}
            <AnimatePresence>
                {pdfPreview && selected && (
                    <div className="fixed inset-0 z-[180] flex items-stretch bg-slate-900/70 backdrop-blur-sm">
                        {/* SIDEBAR ACTIONS */}
                        <div className="w-56 bg-slate-900 flex flex-col shrink-0">
                            <div className="p-5 border-b border-slate-800">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><FileDown size={15} className="text-white" /></div>
                                    <div>
                                        <p className="text-xs font-black text-white">Preview PDF</p>
                                        <p className="text-[9px] text-slate-500 font-medium">A4 Landscape</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <div className="rounded-xl bg-slate-800 p-3 space-y-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Dokumen</p>
                                    <p className="text-[11px] font-bold text-white leading-snug">{selected.title}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{selected.number}</p>
                                </div>
                                <div className="rounded-xl bg-slate-800 p-3 space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2">Konten PDF</p>
                                    {[
                                        { label: 'Header & Info Proyek', ok: true },
                                        { label: '4 Stat Summary Cards', ok: true },
                                        { label: `Tabel ${selected.activities.length} Aktivitas`, ok: true },
                                        { label: `Tabel ${selected.meetings.length} Rapat`, ok: selected.meetings.length > 0 },
                                        { label: 'Footer Halaman', ok: true },
                                    ].map(({ label, ok }) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                {ok && <Check size={8} className="text-white" />}
                                            </div>
                                            <span className={`text-[10px] font-medium ${ok ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-xl bg-slate-800 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Format</p>
                                    <p className="text-[10px] text-slate-400 font-medium">A4 Landscape · jsPDF + AutoTable</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 border-t border-slate-800">
                                <Button onClick={exportPDF} className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-black text-sm gap-2 shadow-lg shadow-indigo-600/30">
                                    <FileDown size={15} /> Export PDF
                                </Button>
                                <button onClick={() => setPdfPreview(false)} className="w-full h-9 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-colors">
                                    Tutup Preview
                                </button>
                            </div>
                        </div>

                        {/* PREVIEW AREA */}
                        <div className="flex-1 overflow-y-auto bg-slate-800 p-6">
                            <div className="max-w-5xl mx-auto">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">Preview Dokumen — Tampilan Aktual Mungkin Sedikit Berbeda</p>

                                {/* A4 PAPER MOCK */}
                                <div className="bg-white shadow-2xl rounded-xl overflow-hidden" style={{minHeight:'600px'}}>
                                    {/* HEADER BAND */}
                                    <div className={`px-8 py-4 flex items-center justify-between ${selected.status==='COMPLETED'?'bg-emerald-600':selected.status==='ONGOING'?'bg-amber-500':selected.status==='ON_HOLD'?'bg-orange-500':'bg-indigo-600'}`}>
                                        <div>
                                            <p className="text-white font-black text-base tracking-tight">Development Planning & Progress</p>
                                            <p className="text-white/60 text-[10px] font-medium mt-0.5">Diekspor: {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-black text-sm font-mono">{selected.number}</p>
                                            <p className="text-white/60 text-[10px] font-medium mt-0.5">{PLAN_STATUS[selected.status]?.label || selected.status}</p>
                                        </div>
                                    </div>

                                    <div className="px-8 py-5 space-y-5">
                                        {/* TITLE */}
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">{selected.title}</h2>
                                            {selected.description && <p className="text-sm text-slate-500 leading-relaxed">{selected.description}</p>}
                                            <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400 font-medium">
                                                {selected.project && <span>Project: <span className="text-slate-600 font-bold">{selected.project.number} — {selected.project.name}</span></span>}
                                                {selected.salesOrder && <span>SO: <span className="text-slate-600 font-bold">{selected.salesOrder.number}</span></span>}
                                                <span>Periode: <span className="text-slate-600 font-bold">{fmtDate(selected.startDate)} — {fmtDate(selected.endDate)}</span></span>
                                            </div>
                                        </div>

                                        {/* STAT MINI CARDS */}
                                        <div className="grid grid-cols-4 gap-3">
                                            {[
                                                { label:'AKTIVITAS', value:selected.activities.length, sub:`${selected.activities.filter(a=>a.status==='DONE').length} selesai`, bg:'bg-indigo-50', text:'text-indigo-700', sub2:'text-indigo-400' },
                                                { label:'RAPAT', value:`${selected.meetings.filter(m=>m.status==='DONE').length}/${selected.meetings.length}`, sub:'selesai', bg:'bg-emerald-50', text:'text-emerald-700', sub2:'text-emerald-400' },
                                                { label:'SISA HARI', value:remaining!==null?Math.abs(remaining):'—', sub:remaining!==null&&remaining<0?'hari terlambat':'hari tersisa', bg:remaining!==null&&remaining<0?'bg-rose-50':remaining!==null&&remaining<=7?'bg-amber-50':'bg-slate-50', text:remaining!==null&&remaining<0?'text-rose-700':remaining!==null&&remaining<=7?'text-amber-700':'text-slate-700', sub2:remaining!==null&&remaining<0?'text-rose-400':remaining!==null&&remaining<=7?'text-amber-400':'text-slate-400' },
                                                { label:'PROGRESS', value:`${selected.progress}%`, sub:'keseluruhan', bg:'bg-violet-50', text:'text-violet-700', sub2:'text-violet-400' },
                                            ].map(s => (
                                                <div key={s.label} className={`${s.bg} rounded-xl p-3.5`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${s.text} opacity-70`}>{s.label}</p>
                                                    <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
                                                    <p className={`text-[10px] font-semibold ${s.sub2} mt-0.5`}>{s.sub}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ACTIVITIES TABLE */}
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Daftar Aktivitas</p>
                                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                                <table className="w-full text-xs border-collapse">
                                                    <thead>
                                                        <tr className={`${selected.status==='COMPLETED'?'bg-emerald-600':selected.status==='ONGOING'?'bg-amber-500':selected.status==='ON_HOLD'?'bg-orange-500':'bg-indigo-600'}`}>
                                                            {['#','Fase','Modul','Aktivitas','PIC','Mulai','Selesai','Progress','Status'].map(h => (
                                                                <th key={h} className="px-3 py-2 text-white text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selected.activities.map((a, idx) => (
                                                            <tr key={idx} className={`border-b border-slate-50 ${idx%2===0?'bg-white':'bg-slate-50/60'}`}>
                                                                <td className="px-3 py-2 text-center text-slate-400 font-bold text-[10px]">{idx+1}</td>
                                                                <td className="px-3 py-2">
                                                                    {a.fase && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${FASE_COLORS[(([...new Set(selected.activities.map(x=>x.fase||''))].filter(Boolean)).indexOf(a.fase||'')) % FASE_COLORS.length]?.bg} ${FASE_COLORS[(([...new Set(selected.activities.map(x=>x.fase||''))].filter(Boolean)).indexOf(a.fase||'')) % FASE_COLORS.length]?.text}`}>{a.fase}</span>}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-600 text-[10px] font-medium">{a.modul || '—'}</td>
                                                                <td className="px-3 py-2 text-slate-800 font-bold text-[11px]">{a.activity}</td>
                                                                <td className="px-3 py-2 text-slate-500 text-[10px]">{a.pic || '—'}</td>
                                                                <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">{fmtDate(a.startDate)}</td>
                                                                <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">{fmtDate(a.endDate)}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                                            <div className="h-full rounded-full bg-indigo-500" style={{width:`${a.progress}%`}} />
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-slate-500 tabular-nums w-7">{a.progress}%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${ACT_STATUS[a.status]?.color||'bg-slate-100 text-slate-500'}`}>{ACT_STATUS[a.status]?.label||a.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {selected.activities.length === 0 && (
                                                            <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-300 text-xs italic">Belum ada aktivitas</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* MEETINGS TABLE */}
                                        {selected.meetings.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Daftar Rapat</p>
                                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                                    <table className="w-full text-xs border-collapse">
                                                        <thead>
                                                            <tr className="bg-sky-500">
                                                                {['#','Judul Rapat','Tanggal','Lokasi / Link','Peserta','Status','Resume'].map(h => (
                                                                    <th key={h} className="px-3 py-2 text-white text-left text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selected.meetings.map((m, idx) => (
                                                                <tr key={idx} className={`border-b border-slate-50 ${idx%2===0?'bg-white':'bg-slate-50/60'}`}>
                                                                    <td className="px-3 py-2 text-center text-slate-400 font-bold text-[10px]">{idx+1}</td>
                                                                    <td className="px-3 py-2 font-bold text-slate-800 text-[11px]">{m.title}</td>
                                                                    <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">{fmtDT(m.date)}</td>
                                                                    <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[120px] truncate">{m.location || m.link || '—'}</td>
                                                                    <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[120px] truncate">{m.participants || '—'}</td>
                                                                    <td className="px-3 py-2">
                                                                        <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border ${MTG_STATUS[m.status]?.color||'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                            <span className={`w-1 h-1 rounded-full ${MTG_STATUS[m.status]?.dot||'bg-slate-400'}`} />
                                                                            {MTG_STATUS[m.status]?.label||m.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[180px]">
                                                                        {m.resume ? <span className="line-clamp-2">{m.resume}</span> : <span className="text-slate-300 italic">—</span>}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* FOOTER */}
                                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                                            <p className="text-[9px] text-slate-300 font-medium">{selected.number} — {selected.title}</p>
                                            <p className="text-[9px] text-slate-300 font-medium">Hal 1</p>
                                        </div>
                                    </div>
                                </div>

                                {/* EXPORT BUTTON BOTTOM */}
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <button onClick={() => setPdfPreview(false)} className="h-10 px-6 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold hover:bg-slate-700 transition-colors">Tutup</button>
                                    <Button onClick={exportPDF} className="h-10 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-black text-sm gap-2 shadow-xl shadow-indigo-600/30">
                                        <FileDown size={16} /> Export & Download PDF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* SINGLE MEETING PDF PREVIEW MODAL */}
            <AnimatePresence>
                {meetingPdfPreview && selected && (
                    <div className="fixed inset-0 z-[180] flex items-stretch bg-slate-900/70 backdrop-blur-sm">
                        {/* SIDEBAR ACTIONS */}
                        <div className="w-56 bg-slate-900 flex flex-col shrink-0">
                            <div className="p-5 border-b border-slate-800">
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><FileDown size={15} className="text-white" /></div>
                                    <div>
                                        <p className="text-xs font-black text-white">Surat Rapat</p>
                                        <p className="text-[9px] text-slate-500 font-medium">A4 Portrait</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <div className="rounded-xl bg-slate-800 p-3 space-y-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Rapat</p>
                                    <p className="text-[11px] font-bold text-white leading-snug">{meetingPdfPreview.title}</p>
                                    <p className="text-[10px] text-slate-400">{fmtDate(meetingPdfPreview.date)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-800 p-3">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Format</p>
                                    <p className="text-[10px] text-slate-400 font-medium">A4 Portrait · jsPDF</p>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 border-t border-slate-800">
                                <Button onClick={() => exportSingleMeetingPDF(meetingPdfPreview)} className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 font-black text-sm gap-2 shadow-lg shadow-indigo-600/30">
                                    <FileDown size={15} /> Export PDF
                                </Button>
                                <button onClick={() => setMeetingPdfPreview(null)} className="w-full h-9 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-colors">
                                    Tutup Preview
                                </button>
                            </div>
                        </div>

                        {/* PREVIEW AREA */}
                        <div className="flex-1 overflow-y-auto bg-slate-800 p-6 flex justify-center">
                            <div className="w-[600px] shrink-0 bg-white shadow-2xl rounded-xl overflow-hidden my-auto" style={{minHeight:'800px'}}>
                                {/* HEADER BAND */}
                                <div className={`px-8 py-5 flex items-center justify-between ${meetingPdfPreview.status==='SCHEDULED'?'bg-indigo-600':'bg-emerald-600'}`}>
                                    <div>
                                        <p className="text-white font-black text-base tracking-tight">{meetingPdfPreview.status==='SCHEDULED'?'MEETING INVITATION':'MEETING MINUTES'}</p>
                                        <p className="text-white/60 text-[10px] font-medium mt-0.5">Hari ini</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-black text-sm">{selected.number}</p>
                                        <p className="text-white/60 text-[10px] font-medium mt-0.5">{MTG_STATUS[meetingPdfPreview.status]?.label||meetingPdfPreview.status}</p>
                                    </div>
                                </div>

                                <div className="px-8 py-6 space-y-6">
                                    {/* TITLE */}
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{meetingPdfPreview.title}</h2>
                                        <p className="text-xs text-slate-500 font-bold">Proyek: {selected.project?.name || selected.title}</p>
                                    </div>

                                    {/* INFO TABLE MOCK */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 w-32 border-r border-slate-100">Waktu</th>
                                                    <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">{fmtDT(meetingPdfPreview.date)}</td>
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 w-24 border-r border-slate-100">Status</th>
                                                    <td className="py-2.5 px-3 text-slate-600">{MTG_STATUS[meetingPdfPreview.status]?.label}</td>
                                                </tr>
                                                <tr className="border-b border-slate-100">
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 border-r border-slate-100">Lokasi / Link</th>
                                                    <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">{meetingPdfPreview.location || meetingPdfPreview.link || '—'}</td>
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 border-r border-slate-100">PIC</th>
                                                    <td className="py-2.5 px-3 text-slate-600">{meetingPdfPreview.pic || '—'}</td>
                                                </tr>
                                                <tr>
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 border-r border-slate-100">Peserta</th>
                                                    <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">{meetingPdfPreview.participants || '—'}</td>
                                                    <th className="bg-slate-50 py-2.5 px-3 font-bold text-slate-800 border-r border-slate-100">Deadline</th>
                                                    <td className="py-2.5 px-3 text-slate-600">{meetingPdfPreview.deadline ? fmtDate(meetingPdfPreview.deadline) : '—'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* SECTIONS */}
                                    {meetingPdfPreview.agenda && (
                                        <div className="border border-indigo-200 rounded-lg overflow-hidden">
                                            <div className="bg-indigo-600 text-white font-bold text-xs py-2 px-3">Agenda / Poin Pembahasan</div>
                                            <div className="p-3 text-xs text-slate-700 whitespace-pre-wrap">{meetingPdfPreview.agenda}</div>
                                        </div>
                                    )}
                                    {meetingPdfPreview.resume && (
                                        <div className="border border-emerald-200 rounded-lg overflow-hidden">
                                            <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3">Resume / Keputusan</div>
                                            <div className="p-3 text-xs text-slate-700 whitespace-pre-wrap">{meetingPdfPreview.resume}</div>
                                        </div>
                                    )}
                                    {meetingPdfPreview.followUp && (
                                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                                            <div className="bg-slate-700 text-white font-bold text-xs py-2 px-3">Tindak Lanjut (Follow Up)</div>
                                            <div className="p-3 text-xs text-slate-700 whitespace-pre-wrap">{meetingPdfPreview.followUp}</div>
                                        </div>
                                    )}

                                    {/* SIGNATURE */}
                                    <div className="flex justify-end pt-8">
                                        <div className="w-56 text-center space-y-1.5">
                                            <p className="text-xs text-slate-500 font-medium">Jakarta, {new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}</p>
                                            <p className="text-xs font-bold text-slate-700">{meetingPdfPreview.status==='SCHEDULED' ? 'PIC / Pengundang' : 'Pembuat Notulen'}</p>
                                            <div className="h-20 flex items-center justify-center my-1">
                                                <img src="/TTD Fix.png" alt="Signature" className="h-16 w-auto object-contain mix-blend-multiply" />
                                            </div>
                                            <div className="border-b border-slate-300 pb-1">
                                                <p className="text-sm font-black text-slate-900">{meetingPdfPreview.pic || 'Parwanto'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const ID = {
    title: 'Development Planning & Progress',
    subtitle: 'Perencanaan pekerjaan development mengacu Project / Sales Order — matrix schedule, rapat & progres',
    newPlan: 'Buat Planning Baru',
    searchPl: 'Cari planning...',
    loading: 'Memuat...',
    empty: 'Belum ada planning. Buat yang baru.',
    selectPlan: 'Pilih planning untuk lihat detail',
    progress: 'Progress',
    meetingsDone: 'rapat selesai',
    meetings: 'Rapat & Resume',
    matrix: 'Matrix Schedule',
    activity: 'Aktivitas',
    scheduleMatrix: 'Matriks Jadwal Kerja',
    legendPlanned: 'Planned',
    legendOngoing: 'Ongoing',
    legendDone: 'Selesai',
    noActivity: 'Belum ada aktivitas — edit planning & tambah aktivitas',
    meetingList: 'Jadwal Rapat',
    newMeeting: 'Jadwalkan Rapat',
    editMeeting: 'Edit Rapat & Resume',
    noMeeting: 'Belum ada rapat. Jadwalkan rapat pertama.',
    resume: 'Resume Hasil Rapat',
    decisions: 'Keputusan',
    followUp: 'Tindak Lanjut',
    noFile: 'Belum ada lampiran',
    upload: 'Upload File',
    editPlan: 'Edit Planning',
    deletePlan: 'Hapus',
    formSub: 'Hubungkan ke Project atau Sales Order',
    activities: 'Daftar Aktivitas (dari Start Hingga Go-Live)',
    addActivity: 'Tambah Aktivitas',
    save: 'Simpan',
    schedule: 'Jadwalkan',
}

const EN = {
    title: 'Development Planning & Progress',
    subtitle: 'Development planning referencing Project / Sales Order — schedule matrix, meetings & progress',
    newPlan: 'Create New Planning',
    searchPl: 'Search planning...',
    loading: 'Loading...',
    empty: 'No planning yet. Create one.',
    selectPlan: 'Select a planning to view details',
    progress: 'Progress',
    meetingsDone: 'meetings done',
    meetings: 'Meetings & Minutes',
    matrix: 'Schedule Matrix',
    activity: 'Activity',
    scheduleMatrix: 'Work schedule matrix',
    legendPlanned: 'Planned',
    legendOngoing: 'Ongoing',
    legendDone: 'Done',
    noActivity: 'No activities yet — edit planning & add activities',
    meetingList: 'Meeting Schedule',
    newMeeting: 'Schedule Meeting',
    editMeeting: 'Edit Meeting & Minutes',
    noMeeting: 'No meetings yet. Schedule the first one.',
    resume: 'Meeting Summary',
    decisions: 'Decisions',
    followUp: 'Follow Up',
    noFile: 'No attachments',
    upload: 'Upload File',
    editPlan: 'Edit Planning',
    deletePlan: 'Delete',
    formSub: 'Link to Project or Sales Order',
    activities: 'Activity List (Start to Go-Live)',
    addActivity: 'Add Activity',
    save: 'Save',
    schedule: 'Schedule',
}