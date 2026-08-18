"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import {
    CalendarDays, ChevronLeft, Save, Loader2, Link2, ExternalLink,
    MapPin, Users, FileText, CheckCircle2, Clock, Calendar,
    Paperclip, Trash2, UploadCloud, Eye, AlertCircle, ArrowLeft,
    Check, Sparkles, Download, Printer, X, Tag, ListOrdered
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── INTERFACES ────────────────────────────────────────────────────────────────

interface MeetingFile {
    id: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType?: string
    uploadedBy?: string
}

interface Meeting {
    id: string
    title: string
    date: string
    location?: string
    link?: string
    participants?: string
    agenda?: string
    resume?: string
    decisions?: string
    followUp?: string
    pic?: string
    deadline?: string
    status: string
    files: MeetingFile[]
}

interface Planning {
    id: string
    number: string
    title: string
    status: string
    project?: { number: string; name: string }
    salesOrder?: { number: string; subject: string; customer?: { name: string } }
    meetings: Meeting[]
}

// ─── UTILS & HELPERS ──────────────────────────────────────────────────────────

const api = () => process.env.NEXT_PUBLIC_API_URL

const toInputDT = (v?: string) => {
    if (!v) return ''
    try {
        const d = new Date(v)
        if (isNaN(d.getTime())) return ''
        const l = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        return l.toISOString().slice(0, 16)
    } catch {
        return ''
    }
}

const fmtDT = (d: string) => {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return d
    }
}

const fmtDate = (d?: string) => {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    } catch {
        return d
    }
}

const fmtSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── DICTIONARY ────────────────────────────────────────────────────────────────

const ID = {
    back: 'Kembali ke Development',
    breadcrumbDev: 'Development Planning',
    breadcrumbMtg: 'Jadwal & Notulen Rapat',
    headingNew: 'Jadwalkan Rapat Baru',
    headingEdit: 'Detail & Notulen Rapat',
    subtitle: 'Kelola jadwal, agenda pembahasan, notulen, keputusan rapat, dan berkas lampiran.',
    planLabel: 'Pilih Planning Proyek Terkait',
    planPlaceholder: '— Pilih planning proyek / sales order —',
    selectedPlan: 'Planning Terkait',
    title: 'Judul Rapat',
    titlePh: 'cth: Kick-off Meeting & Pembahasan Requirement Sistem',
    date: 'Tanggal & Waktu Rapat',
    status: 'Status Pelaksanaan',
    location: 'Lokasi / Ruangan Rapat',
    locationPh: 'cth: Ruang Meeting Utama / Kantor Lt. 2',
    link: 'Tautan Online Meeting (URL)',
    linkPh: 'https://meet.google.com/... atau Zoom link',
    openLink: 'Buka Link',
    participants: 'Daftar Peserta Rapat',
    participantsPh: 'Masukkan nama peserta dipisahkan koma atau baris baru (cth: Budi, Andi, Siska)',
    agenda: 'Agenda & Poin Pembahasan',
    agendaPh: '1. Pembahasan timeline delivery\n2. Review progress modul authentication\n3. Diskusi kendala integrasi API',
    resume: 'Resume & Catatan Hasil Rapat (Notulen)',
    resumePh: 'Tuliskan rangkuman jalannya rapat, poin penting yang didiskusikan, dan feedback dari peserta rapat di sini...',
    decisions: 'Keputusan & Hasil Kesepakatan',
    decisionsPh: '1. Fitur payment gateway menggunakan Midtrans\n2. Deploy staging dijadwalkan hari Jumat\n3. Penambahan form input dokumen disetujui',
    followUp: 'Tindak Lanjut & Action Items',
    followUpPh: 'Tugas nyata yang harus dikerjakan setelah rapat beserta langkah penanganannya...',
    pic: 'PIC Penanggung Jawab',
    picPh: 'cth: Andi Pratama',
    deadline: 'Target Selesai (Deadline)',
    attachments: 'Lampiran Berkas & Dokumen',
    attachmentsDesc: 'Unggah file materi presentasi, foto dokumentasi, atau dokumen pendukung.',
    dropFiles: 'Klik atau geser berkas ke area ini untuk mengunggah',
    uploadBtn: 'Unggah Berkas',
    noFiles: 'Belum ada berkas lampiran yang diunggah.',
    cancel: 'Batal',
    save: 'Simpan Perubahan',
    saving: 'Menyimpan...',
    saveSuccess: 'Data rapat dan notulen berhasil disimpan!',
    previewBtn: 'Preview Undangan / Notulen',
    downloadPdf: 'Unduh Dokumen PDF',
    errTitle: 'Judul rapat wajib diisi',
    errPlan: 'Pilih planning proyek terlebih dahulu',
    errDate: 'Tanggal dan waktu rapat wajib diisi',
    errGeneral: 'Terjadi kesalahan saat menyimpan data',
    addNumberedList: 'Template Penomoran',
    clearText: 'Bersihkan',
    statusScheduled: 'Terjadwal',
    statusDone: 'Selesai',
    statusCancelled: 'Dibatalkan',
    attendeeCount: 'Peserta',
    fileUploadedMsg: 'Berkas berhasil diunggah',
    fileDeletedMsg: 'Berkas berhasil dihapus',
    uploadLimitNotice: 'Maksimal 10 berkas sekaligus (Maks 20MB/berkas)'
}

const EN: typeof ID = {
    back: 'Back to Development',
    breadcrumbDev: 'Development Planning',
    breadcrumbMtg: 'Meeting Schedule & Minutes',
    headingNew: 'Schedule New Meeting',
    headingEdit: 'Meeting Details & Minutes',
    subtitle: 'Manage meeting schedule, agenda, discussion notes, decisions, and file attachments.',
    planLabel: 'Select Associated Project Planning',
    planPlaceholder: '— Select project planning / sales order —',
    selectedPlan: 'Associated Planning',
    title: 'Meeting Title',
    titlePh: 'e.g. Kick-off Meeting & System Requirement Review',
    date: 'Meeting Date & Time',
    status: 'Execution Status',
    location: 'Meeting Room / Location',
    locationPh: 'e.g. Main Conference Room / 2nd Floor',
    link: 'Online Meeting Link (URL)',
    linkPh: 'https://meet.google.com/... or Zoom link',
    openLink: 'Open Link',
    participants: 'Meeting Participants / Attendees',
    participantsPh: 'Enter participant names separated by comma or new lines (e.g. John, Alex, Sarah)',
    agenda: 'Agenda & Discussion Points',
    agendaPh: '1. Project timeline delivery discussion\n2. Authentication module progress review\n3. API integration challenges',
    resume: 'Meeting Summary & Minutes',
    resumePh: 'Write detailed meeting proceedings, discussion highlights, and participant feedback here...',
    decisions: 'Decisions & Key Agreements',
    decisionsPh: '1. Payment gateway agreed to use Midtrans\n2. Staging deployment scheduled for Friday\n3. Document upload form addition approved',
    followUp: 'Follow-Up & Action Items',
    followUpPh: 'Actionable tasks that need to be completed after the meeting and their resolution steps...',
    pic: 'Person In Charge (PIC)',
    picPh: 'e.g. Alex Henderson',
    deadline: 'Target Deadline',
    attachments: 'File Attachments & Documents',
    attachmentsDesc: 'Upload presentation slides, documentation photos, or reference files.',
    dropFiles: 'Click or drop files here to upload',
    uploadBtn: 'Upload Files',
    noFiles: 'No file attachments uploaded yet.',
    cancel: 'Cancel',
    save: 'Save Changes',
    saving: 'Saving...',
    saveSuccess: 'Meeting details and minutes saved successfully!',
    previewBtn: 'Preview Invitation / Minutes',
    downloadPdf: 'Download PDF Document',
    errTitle: 'Meeting title is required',
    errPlan: 'Please select a project planning first',
    errDate: 'Meeting date and time is required',
    errGeneral: 'An error occurred while saving',
    addNumberedList: 'Numbering Template',
    clearText: 'Clear',
    statusScheduled: 'Scheduled',
    statusDone: 'Completed',
    statusCancelled: 'Cancelled',
    attendeeCount: 'Attendees',
    fileUploadedMsg: 'File uploaded successfully',
    fileDeletedMsg: 'File deleted successfully',
    uploadLimitNotice: 'Max 10 files at once (Up to 20MB/file)'
}

const STATUS_CONFIG: Record<string, { labelId: string; labelEn: string; bg: string; text: string; border: string; dot: string; icon: any }> = {
    SCHEDULED: {
        labelId: 'Terjadwal',
        labelEn: 'Scheduled',
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
        icon: Clock
    },
    DONE: {
        labelId: 'Selesai',
        labelEn: 'Completed',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2
    },
    CANCELLED: {
        labelId: 'Dibatalkan',
        labelEn: 'Cancelled',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        icon: AlertCircle
    }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = params?.id as string
    const isNew = id === 'new'

    const { data: session } = useSession()
    const { lang } = useLanguage()
    const t = lang === 'ID' ? ID : EN
    const userRole = (session?.user as any)?.role
    const userName = session?.user?.name || ''

    const [plans, setPlans] = useState<Planning[]>([])
    const [selectedPlan, setSelectedPlan] = useState<Planning | null>(null)
    const [existingFiles, setExistingFiles] = useState<MeetingFile[]>([])
    const [uploadingFiles, setUploadingFiles] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [form, setForm] = useState({
        planningId: '',
        title: '',
        date: toInputDT(new Date().toISOString()),
        status: 'SCHEDULED',
        location: '',
        link: '',
        participants: '',
        agenda: '',
        resume: '',
        decisions: '',
        followUp: '',
        pic: '',
        deadline: ''
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [previewModalOpen, setPreviewModalOpen] = useState(false)

    // Show toast helper
    const triggerToast = (type: 'success' | 'error', text: string) => {
        setToastMessage({ type, text })
        setTimeout(() => setToastMessage(null), 4000)
    }

    // Load plannings and meeting data
    useEffect(() => {
        let isMounted = true
        ;(async () => {
            try {
                const res = await fetch(`${api()}/api/development-plannings`, {
                    headers: { 'x-user-role': userRole || '' }
                })
                const list: Planning[] = await res.json()
                if (!isMounted) return

                const validList = Array.isArray(list) ? list : []
                setPlans(validList)

                if (!isNew && id) {
                    const parent = validList.find(p => p.meetings?.some(m => m.id === id))
                    const meeting = parent?.meetings?.find(m => m.id === id) || validList.flatMap(p => p.meetings || []).find(m => m.id === id)

                    if (meeting) {
                        setSelectedPlan(parent || null)
                        setExistingFiles(meeting.files || [])
                        setForm({
                            planningId: parent?.id || '',
                            title: meeting.title || '',
                            date: toInputDT(meeting.date),
                            status: meeting.status || 'SCHEDULED',
                            location: meeting.location || '',
                            link: meeting.link || '',
                            participants: meeting.participants || '',
                            agenda: meeting.agenda || '',
                            resume: meeting.resume || '',
                            decisions: meeting.decisions || '',
                            followUp: meeting.followUp || '',
                            pic: meeting.pic || '',
                            deadline: meeting.deadline ? toInputDT(meeting.deadline).slice(0, 10) : ''
                        })
                    } else {
                        setError('Data rapat tidak ditemukan.')
                    }
                } else if (isNew && validList.length > 0) {
                    const prePlanningId = searchParams.get('planning')
                    const defaultPlan = prePlanningId ? validList.find(p => p.id === prePlanningId) || validList[0] : validList[0]
                    setSelectedPlan(defaultPlan)
                    setForm(f => ({
                        ...f,
                        planningId: defaultPlan.id,
                        pic: userName || ''
                    }))
                }
            } catch (err: any) {
                if (isMounted) setError(err.message || t.errGeneral)
            } finally {
                if (isMounted) setLoading(false)
            }
        })()

        return () => {
            isMounted = false
        }
    }, [id, isNew, userRole, userName, searchParams, t.errGeneral])

    // Update parent plan when form.planningId changes
    const handlePlanChange = (planId: string) => {
        const found = plans.find(p => p.id === planId) || null
        setSelectedPlan(found)
        setForm(f => ({ ...f, planningId: planId }))
    }

    const setField = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    // Save Meeting
    const handleSave = async () => {
        if (!form.title.trim()) {
            setError(t.errTitle)
            triggerToast('error', t.errTitle)
            return
        }
        if (isNew && !form.planningId) {
            setError(t.errPlan)
            triggerToast('error', t.errPlan)
            return
        }
        if (!form.date) {
            setError(t.errDate)
            triggerToast('error', t.errDate)
            return
        }

        setSaving(true)
        setError('')

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-user-role': userRole || '',
                'x-user-name': userName || ''
            }

            let savedId = id

            if (isNew) {
                const res = await fetch(`${api()}/api/development-plannings/${form.planningId}/meetings`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        title: form.title,
                        date: form.date,
                        location: form.location,
                        link: form.link,
                        participants: form.participants,
                        agenda: form.agenda,
                        resume: form.resume,
                        decisions: form.decisions,
                        followUp: form.followUp,
                        pic: form.pic,
                        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
                        status: form.status
                    })
                })
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    throw new Error(errData.message || t.errGeneral)
                }
                const createdMeeting = await res.json()
                savedId = createdMeeting.id
                triggerToast('success', t.saveSuccess)
                setTimeout(() => {
                    router.push(`/dashboard/development/meetings/${savedId}`)
                }, 600)
            } else {
                const res = await fetch(`${api()}/api/development-meetings/${id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        planningId: form.planningId || selectedPlan?.id,
                        title: form.title,
                        date: form.date,
                        location: form.location,
                        link: form.link,
                        participants: form.participants,
                        agenda: form.agenda,
                        resume: form.resume,
                        decisions: form.decisions,
                        followUp: form.followUp,
                        pic: form.pic,
                        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
                        status: form.status
                    })
                })
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    throw new Error(errData.message || t.errGeneral)
                }
                const updatedMeeting = await res.json()
                const parent = plans.find(p => p.id === form.planningId)
                if (parent) setSelectedPlan(parent)
                triggerToast('success', t.saveSuccess)
            }
        } catch (err: any) {
            setError(err.message || t.errGeneral)
            triggerToast('error', err.message || t.errGeneral)
        } finally {
            setSaving(false)
        }
    }

    // Keyboard shortcut (Ctrl+S or Cmd+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [form, isNew])

    // File Upload Handler
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || isNew) return
        setUploadingFiles(true)
        try {
            const formData = new FormData()
            for (let i = 0; i < Math.min(files.length, 10); i++) {
                formData.append('files', files[i])
            }
            const res = await fetch(`${api()}/api/development-meetings/${id}/files`, {
                method: 'POST',
                headers: {
                    'x-user-role': userRole || '',
                    'x-user-name': userName || ''
                },
                body: formData
            })
            if (res.ok) {
                const uploaded = await res.json()
                setExistingFiles(prev => [...prev, ...uploaded])
                triggerToast('success', t.fileUploadedMsg)
            } else {
                const err = await res.json().catch(() => ({}))
                triggerToast('error', err.message || 'Gagal mengunggah berkas')
            }
        } catch (err: any) {
            triggerToast('error', err.message || 'Gagal mengunggah berkas')
        } finally {
            setUploadingFiles(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // File Delete Handler
    const handleDeleteFile = async (fileId: string) => {
        if (!confirm('Hapus berkas lampiran ini?')) return
        try {
            const res = await fetch(`${api()}/api/development-meetings/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'x-user-role': userRole || '' }
            })
            if (res.ok) {
                setExistingFiles(prev => prev.filter(f => f.id !== fileId))
                triggerToast('success', t.fileDeletedMsg)
            } else {
                triggerToast('error', 'Gagal menghapus berkas')
            }
        } catch {
            triggerToast('error', 'Gagal menghapus berkas')
        }
    }

    // Template numbering helper for textareas
    const applyNumberedTemplate = (field: 'agenda' | 'resume' | 'decisions' | 'followUp') => {
        const currentVal = form[field]
        if (!currentVal.trim()) {
            setField(field, '1. \n2. \n3. ')
        } else {
            const lines = currentVal.split('\n')
            const numbered = lines.map((line, idx) => {
                const clean = line.replace(/^\d+\.\s*/, '')
                return `${idx + 1}. ${clean}`
            }).join('\n')
            setField(field, numbered)
        }
    }

    // Generate PDF Export
    const handleExportPDF = useCallback(async () => {
        try {
            const jsPDFModule = await import('jspdf')
            const autoTableModule = await import('jspdf-autotable')
            const jsPDF = jsPDFModule.default
            const autoTable = (autoTableModule as any).default

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const pageW = doc.internal.pageSize.getWidth()
            const pageH = doc.internal.pageSize.getHeight()
            const isUndangan = form.status === 'SCHEDULED'

            const C = {
                indigo: [99, 102, 241] as [number, number, number],
                emerald: [16, 185, 129] as [number, number, number],
                slate50: [248, 250, 252] as [number, number, number],
                slate100: [241, 245, 249] as [number, number, number],
                slate300: [203, 213, 225] as [number, number, number],
                slate500: [100, 116, 139] as [number, number, number],
                slate700: [51, 65, 85] as [number, number, number],
                slate900: [15, 23, 42] as [number, number, number],
                white: [255, 255, 255] as [number, number, number]
            }

            const mainColor = isUndangan ? C.indigo : C.emerald

            // Header banner
            doc.setFillColor(...mainColor)
            doc.rect(0, 0, pageW, 26, 'F')

            doc.setTextColor(...C.white)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.text(isUndangan ? 'SURAT UNDANGAN RAPAT' : 'NOTULEN HASIL RAPAT', 14, 13)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.text(selectedPlan ? `${selectedPlan.number} — ${selectedPlan.title}` : 'Axon Development Ecosystem', 14, 20)

            const statusText = STATUS_CONFIG[form.status]?.labelId || form.status
            doc.text(`Status: ${statusText}`, pageW - 14, 15, { align: 'right' })
            doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageW - 14, 20, { align: 'right' })

            // Title
            let y = 35
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(13)
            doc.setTextColor(...C.slate900)
            const splitTitle = doc.splitTextToSize(form.title || 'Tanpa Judul Rapat', pageW - 28)
            doc.text(splitTitle, 14, y)
            y += splitTitle.length * 6 + 4

            // Metadata Table
            autoTable(doc, {
                startY: y,
                margin: { left: 14, right: 14 },
                body: [
                    ['Tanggal & Waktu', fmtDT(form.date), 'Status', statusText],
                    ['Lokasi / Ruangan', form.location || '—', 'Link Online', form.link || '—'],
                    ['PIC Penanggung Jawab', form.pic || '—', 'Target Deadline', form.deadline ? fmtDate(form.deadline) : '—'],
                    ['Daftar Peserta', { content: form.participants || '—', colSpan: 3 }]
                ],
                styles: { fontSize: 8.5, cellPadding: 3, textColor: C.slate700, lineColor: C.slate100, lineWidth: 0.3 },
                columnStyles: {
                    0: { cellWidth: 38, fontStyle: 'bold', fillColor: C.slate50 },
                    1: { cellWidth: 55 },
                    2: { cellWidth: 38, fontStyle: 'bold', fillColor: C.slate50 },
                    3: { cellWidth: 'auto' }
                }
            })

            y = (doc as any).lastAutoTable?.finalY + 8

            // Section Builder
            const addSection = (title: string, content?: string) => {
                if (!content || !content.trim()) return
                if (y + 25 > pageH - 20) {
                    doc.addPage()
                    y = 15
                }
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(10)
                doc.setTextColor(...mainColor)
                doc.text(title, 14, y)
                y += 5

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8.5)
                doc.setTextColor(...C.slate700)
                const split = doc.splitTextToSize(content, pageW - 28)
                doc.text(split, 14, y)
                y += split.length * 4.5 + 8
            }

            addSection('1. AGENDA & POIN PEMBAHASAN', form.agenda)
            addSection('2. RESUME & CATATAN NOTULEN', form.resume)
            addSection('3. KEPUTUSAN & KESEPAKATAN', form.decisions)
            addSection('4. TINDAK LANJUT & ACTION ITEMS', form.followUp)

            // Signature block
            if (y + 40 > pageH - 15) {
                doc.addPage()
                y = 20
            }
            y += 6
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.setTextColor(...C.slate500)
            doc.text('Dibuat / Diverifikasi oleh:', pageW - 60, y)
            y += 20
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...C.slate900)
            doc.text(form.pic || userName || 'Parwanto', pageW - 60, y)

            // Footer per page
            const totalPages = (doc as any).internal.getNumberOfPages()
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i)
                doc.setFontSize(7.5)
                doc.setTextColor(...C.slate300)
                doc.text(`Axon Development Ecosystem — ${form.title || 'Meeting Minutes'}`, 14, pageH - 6)
                doc.text(`Halaman ${i} dari ${totalPages}`, pageW - 14, pageH - 6, { align: 'right' })
            }

            doc.save(`Notulen - ${form.title || 'Meeting'}.pdf`)
            triggerToast('success', 'PDF berhasil diunduh!')
        } catch (err: any) {
            triggerToast('error', 'Gagal membuat PDF: ' + err.message)
        }
    }, [form, selectedPlan, userName])

    // Parse participants into array for chip display
    const participantList = form.participants
        ? form.participants
            .split(/[\n,]+/)
            .map(p => p.trim())
            .filter(Boolean)
        : []

    const currentStatusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.SCHEDULED
    const StatusIcon = currentStatusConfig.icon

    return (
        <div className="min-h-screen bg-slate-50/60 pb-24">
            {/* ─── TOAST NOTIFICATION ─── */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
                        toastMessage.type === 'success'
                            ? 'bg-emerald-950/90 text-emerald-100 border-emerald-700/60 shadow-emerald-950/20'
                            : 'bg-rose-950/90 text-rose-100 border-rose-700/60 shadow-rose-950/20'
                    }`}>
                        {toastMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertCircle size={18} className="text-rose-400 shrink-0" />}
                        <p className="text-xs font-semibold">{toastMessage.text}</p>
                    </div>
                </div>
            )}

            {/* ─── TOP HEADER BAR ─── */}
            <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/development?planning=${form.planningId || selectedPlan?.id || ''}&tab=MEETINGS`)}
                            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                            title={t.back}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                <span>{t.breadcrumbDev}</span>
                                <span>/</span>
                                <span className="text-indigo-600 font-semibold">{t.breadcrumbMtg}</span>
                            </div>
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                {isNew ? t.headingNew : (form.title || t.headingEdit)}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!isNew && (
                            <Button
                                variant="outline"
                                onClick={() => setPreviewModalOpen(true)}
                                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 gap-1.5"
                            >
                                <Eye size={14} className="text-indigo-600" />
                                {t.previewBtn}
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 gap-2"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{saving ? t.saving : t.save}</span>
                            <span className="hidden md:inline-block text-[9px] font-normal opacity-70 bg-white/20 px-1.5 py-0.5 rounded">Ctrl+S</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
                {loading ? (
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
                        <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-500">Memuat data rapat & notulen...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ── PARENT PLANNING CONTEXT BANNER ── */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                    {isNew ? t.planLabel : t.selectedPlan}
                                </span>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <select
                                        value={form.planningId}
                                        onChange={e => handlePlanChange(e.target.value)}
                                        className="w-full sm:max-w-md rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 font-bold text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                    >
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.number} — {p.title} {p.project?.name ? `(${p.project.name})` : ''}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {selectedPlan?.project?.name && (
                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700">
                                                Proyek: {selectedPlan.project.name}
                                            </span>
                                        )}
                                        {selectedPlan?.salesOrder?.customer?.name && (
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700">
                                                Customer: {selectedPlan.salesOrder.customer.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Selector Pills */}
                            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 self-start md:self-center">
                                {Object.entries(STATUS_CONFIG).map(([stKey, cfg]) => {
                                    const active = form.status === stKey
                                    const Icon = cfg.icon
                                    return (
                                        <button
                                            key={stKey}
                                            type="button"
                                            onClick={() => setField('status', stKey)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                active
                                                    ? `${cfg.bg} ${cfg.text} ${cfg.border} border shadow-xs`
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                            <span>{lang === 'ID' ? cfg.labelId : cfg.labelEn}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── 2-COLUMN RESPONSIVE LAYOUT ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* ══════════════════════════════════════════════════════
                                LEFT COLUMN: NOTULEN & POIN PEMBAHASAN (7-8 cols)
                                ══════════════════════════════════════════════════════ */}
                            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                                {/* CARD 1: AGENDA PEMBAHASAN */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                                <ListOrdered size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.agenda}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Topik bahasan atau susunan acara rapat</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => applyNumberedTemplate('agenda')}
                                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 text-[10px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                        >
                                            <Sparkles size={11} />
                                            {t.addNumberedList}
                                        </button>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <textarea
                                            value={form.agenda}
                                            onChange={e => setField('agenda', e.target.value)}
                                            placeholder={t.agendaPh}
                                            rows={4}
                                            className="w-full min-h-[130px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-3 text-sm text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all overflow-y-auto resize-y"
                                        />
                                        <div className="flex justify-end mt-1.5 text-[10px] text-slate-400 font-medium">
                                            {form.agenda ? `${form.agenda.split('\n').filter(Boolean).length} baris` : '0 poin'}
                                        </div>
                                    </div>
                                </div>

                                {/* CARD 2: RESUME / CATATAN NOTULEN (UTAMA) */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-violet-50/40 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                                                <FileText size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.resume}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Uraian hasil diskusi, paparan & masukan dari peserta</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 text-[9px] font-black uppercase tracking-wider">
                                            Paling Penting
                                        </span>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <textarea
                                            value={form.resume}
                                            onChange={e => setField('resume', e.target.value)}
                                            placeholder={t.resumePh}
                                            rows={8}
                                            className="w-full min-h-[220px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-3.5 text-sm text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all overflow-y-auto resize-y"
                                        />
                                        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 font-medium">
                                            <span>Format teks bebas & mendukung baris baru</span>
                                            <span>{form.resume.length} karakter</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CARD 3: KEPUTUSAN & KESEPAKATAN */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border-b border-emerald-100/60 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                <CheckCircle2 size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">{t.decisions}</h3>
                                                <p className="text-[10px] text-emerald-700/80 font-medium">Poin kesepakatan final atau keputusan resmi</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => applyNumberedTemplate('decisions')}
                                            className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                        >
                                            <Sparkles size={11} />
                                            {t.addNumberedList}
                                        </button>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <textarea
                                            value={form.decisions}
                                            onChange={e => setField('decisions', e.target.value)}
                                            placeholder={t.decisionsPh}
                                            rows={4}
                                            className="w-full min-h-[130px] rounded-xl bg-emerald-50/20 border border-emerald-200/70 px-4 py-3 text-sm text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all overflow-y-auto resize-y"
                                        />
                                    </div>
                                </div>

                                {/* CARD 4: TINDAK LANJUT & ACTION ITEMS */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                                <Clock size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.followUp}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Tugas kelanjutan beserta penanggung jawab & target waktu</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5 space-y-4">
                                        <textarea
                                            value={form.followUp}
                                            onChange={e => setField('followUp', e.target.value)}
                                            placeholder={t.followUpPh}
                                            rows={3}
                                            className="w-full min-h-[110px] rounded-xl bg-slate-50/50 border border-slate-200 px-4 py-3 text-sm text-slate-800 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 focus:bg-white transition-all overflow-y-auto resize-y"
                                        />

                                        {/* Action Owner & Deadline Row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                                    <Users size={11} className="text-indigo-600" />
                                                    {t.pic}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.pic}
                                                    onChange={e => setField('pic', e.target.value)}
                                                    placeholder={t.picPh}
                                                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                                    <Calendar size={11} className="text-indigo-600" />
                                                    {t.deadline}
                                                </label>
                                                <input
                                                    type="date"
                                                    value={form.deadline}
                                                    onChange={e => setField('deadline', e.target.value)}
                                                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ══════════════════════════════════════════════════════
                                RIGHT COLUMN: METADATA, ATTENDEES & ATTACHMENTS (4-5 cols)
                                ══════════════════════════════════════════════════════ */}
                            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                                {/* CARD 1: INFORMASI JADWAL & LOKASI */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                            <CalendarDays size={15} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Detail Jadwal & Lokasi</h3>
                                            <p className="text-[10px] text-slate-500 font-medium">Waktu dan media pelaksanaan rapat</p>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5 space-y-4">
                                        {/* Meeting Title */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                {t.title} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={e => setField('title', e.target.value)}
                                                placeholder={t.titlePh}
                                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                            />
                                        </div>

                                        {/* Date & Time */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                {t.date} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={form.date}
                                                onChange={e => setField('date', e.target.value)}
                                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 font-bold text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                            />
                                        </div>

                                        {/* Physical Location */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                <MapPin size={11} className="text-indigo-600" />
                                                {t.location}
                                            </label>
                                            <input
                                                type="text"
                                                value={form.location}
                                                onChange={e => setField('location', e.target.value)}
                                                placeholder={t.locationPh}
                                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                            />
                                        </div>

                                        {/* Online Link */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                    <Link2 size={11} className="text-indigo-600" />
                                                    {t.link}
                                                </label>
                                                {form.link && (
                                                    <a
                                                        href={form.link.startsWith('http') ? form.link : `https://${form.link}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                                                    >
                                                        {t.openLink} <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={form.link}
                                                onChange={e => setField('link', e.target.value)}
                                                placeholder={t.linkPh}
                                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* CARD 2: PESERTA RAPAT */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                                                <Users size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.participants}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Daftar nama hadirin / undangan</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                                            {participantList.length} {t.attendeeCount}
                                        </span>
                                    </div>
                                    <div className="p-4 sm:p-5 space-y-3">
                                        <textarea
                                            value={form.participants}
                                            onChange={e => setField('participants', e.target.value)}
                                            placeholder={t.participantsPh}
                                            rows={3}
                                            className="w-full min-h-[90px] rounded-xl bg-slate-50/50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 focus:bg-white transition-all overflow-y-auto resize-y"
                                        />

                                        {/* Tag Chips Preview */}
                                        {participantList.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {participantList.map((name, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60"
                                                    >
                                                        <Tag size={10} className="text-slate-400" />
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CARD 3: LAMPIRAN BERKAS & DOKUMEN */}
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                                <Paperclip size={15} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.attachments}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium">Materi slide, berkas notulen, atau foto</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
                                            {existingFiles.length}
                                        </span>
                                    </div>

                                    <div className="p-4 sm:p-5 space-y-4">
                                        {isNew ? (
                                            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                                                <UploadCloud size={24} className="text-slate-400 mx-auto mb-1.5" />
                                                <p className="text-xs font-semibold text-slate-600">Simpan rapat terlebih dahulu</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Setelah rapat tersimpan, Anda dapat melampirkan file materi di sini.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Upload Drag & Drop Zone */}
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-2xl p-4 text-center cursor-pointer transition-all group"
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        multiple
                                                        onChange={e => handleFileUpload(e.target.files)}
                                                        className="hidden"
                                                    />
                                                    {uploadingFiles ? (
                                                        <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs font-bold py-1">
                                                            <Loader2 size={16} className="animate-spin" />
                                                            <span>Mengunggah berkas...</span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <UploadCloud size={24} className="text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mx-auto mb-1" />
                                                            <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{t.dropFiles}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">{t.uploadLimitNotice}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Uploaded File List */}
                                                {existingFiles.length === 0 ? (
                                                    <p className="text-center text-xs text-slate-400 font-medium py-2">{t.noFiles}</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {existingFiles.map(file => (
                                                            <div
                                                                key={file.id}
                                                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/70 transition-colors group"
                                                            >
                                                                <a
                                                                    href={`${api()}${file.filePath}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-2.5 min-w-0 flex-1"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                                        <FileText size={13} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                                            {file.fileName}
                                                                        </p>
                                                                        <p className="text-[9px] text-slate-400 font-medium">
                                                                            {fmtSize(file.fileSize)} {file.uploadedBy ? `• oleh ${file.uploadedBy}` : ''}
                                                                        </p>
                                                                    </div>
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteFile(file.id)}
                                                                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                                                                    title="Hapus berkas"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error box */}
                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── STICKY BOTTOM ACTION BAR ─── */}
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md border-t border-slate-200/80 py-3 shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${currentStatusConfig.bg} ${currentStatusConfig.text} ${currentStatusConfig.border}`}>
                            <StatusIcon size={12} />
                            {lang === 'ID' ? currentStatusConfig.labelId : currentStatusConfig.labelEn}
                        </span>
                        <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
                            {isNew ? 'Menyiapkan rapat baru' : (form.title || 'Edit Notulen')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/development?planning=${form.planningId || selectedPlan?.id || ''}&tab=MEETINGS`)}
                            className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
                        >
                            {t.cancel}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-indigo-600/20"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{saving ? t.saving : t.save}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── MODAL PREVIEW SURAT / NOTULEN PDF ─── */}
            {previewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Preview Dokumen Undangan & Notulen</h2>
                                    <p className="text-[10px] text-slate-400">{form.title || 'Meeting Minutes'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewModalOpen(false)}
                                className="w-8 h-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Document Body (Scrollable Sheet) */}
                        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-slate-100/60 flex-1">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                                {/* Header banner style */}
                                <div className={`p-4 rounded-xl text-white flex items-center justify-between ${
                                    form.status === 'SCHEDULED' ? 'bg-indigo-600' : 'bg-emerald-600'
                                }`}>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider opacity-80">
                                            {form.status === 'SCHEDULED' ? 'SURAT UNDANGAN RAPAT' : 'NOTULEN HASIL RAPAT'}
                                        </p>
                                        <h3 className="text-base font-black mt-0.5">{form.title || '—'}</h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-lg bg-white/20 text-xs font-black">
                                        {STATUS_CONFIG[form.status]?.labelId || form.status}
                                    </span>
                                </div>

                                {/* Meta Table */}
                                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                                    <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                                        <div className="p-3 bg-slate-50"><span className="text-slate-400 font-bold block text-[10px] uppercase">Waktu</span><span className="font-bold text-slate-800">{fmtDT(form.date)}</span></div>
                                        <div className="p-3 bg-slate-50"><span className="text-slate-400 font-bold block text-[10px] uppercase">Lokasi / Tautan</span><span className="font-bold text-slate-800">{form.location || form.link || '—'}</span></div>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                                        <div className="p-3"><span className="text-slate-400 font-bold block text-[10px] uppercase">PIC / Penanggung Jawab</span><span className="font-bold text-slate-800">{form.pic || '—'}</span></div>
                                        <div className="p-3"><span className="text-slate-400 font-bold block text-[10px] uppercase">Target Selesai</span><span className="font-bold text-slate-800">{form.deadline ? fmtDate(form.deadline) : '—'}</span></div>
                                    </div>
                                    {form.participants && (
                                        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Peserta Rapat</span>
                                            <span className="font-medium text-slate-700">{form.participants}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Agenda */}
                                {form.agenda && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider">1. Agenda & Poin Pembahasan</h4>
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {form.agenda}
                                        </div>
                                    </div>
                                )}

                                {/* Resume */}
                                {form.resume && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-violet-700 uppercase tracking-wider">2. Resume & Catatan Notulen</h4>
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {form.resume}
                                        </div>
                                    </div>
                                )}

                                {/* Decisions */}
                                {form.decisions && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider">3. Keputusan & Kesepakatan</h4>
                                        <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/70 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                            {form.decisions}
                                        </div>
                                    </div>
                                )}

                                {/* Follow Up */}
                                {form.followUp && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider">4. Tindak Lanjut & Action Items</h4>
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {form.followUp}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <Button
                                variant="outline"
                                onClick={() => setPreviewModalOpen(false)}
                                className="h-9 rounded-xl border-slate-200 text-xs font-bold"
                            >
                                Tutup
                            </Button>
                            <Button
                                onClick={handleExportPDF}
                                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-indigo-600/20"
                            >
                                <Download size={14} />
                                {t.downloadPdf}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}