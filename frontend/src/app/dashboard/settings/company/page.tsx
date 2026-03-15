"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
    Building2, Phone, Mail, Globe, MapPin, CreditCard,
    Upload, Save, RefreshCw, CheckCircle2, AlertCircle,
    Hash, Landmark, FileText, Camera, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"

interface CompanyProfile {
    id: string
    name: string
    legalName: string | null
    taxId: string | null
    address: string | null
    city: string | null
    province: string | null
    postalCode: string | null
    country: string
    phone: string | null
    fax: string | null
    email: string | null
    website: string | null
    industry: string | null
    logo: string | null
    bankName: string | null
    bankAccount: string | null
    bankHolder: string | null
    updatedAt: string
}

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType, title: string, subtitle: string }) => (
    <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
        </div>
        <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{title}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{subtitle}</p>
        </div>
    </div>
)

const Field = ({ label, required, children }: { label: string, required?: boolean, children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {children}
    </div>
)

const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300 placeholder:font-normal"

export default function CompanySettingsPage() {
    const [form, setForm] = useState<Partial<CompanyProfile>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role

    useEffect(() => {
        if (session && userRole) {
            if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
                window.location.href = "/dashboard"
                return
            }
            fetchProfile()
        }
    }, [session, userRole])

    const fetchProfile = async () => {
        if (!userRole) return
        try {
            const res = await fetch('http://localhost:5000/api/company', {
                headers: { 'x-user-role': userRole }
            })
            const data = await res.json()
            setForm(data)
            if (data.logo) setLogoPreview(`http://localhost:5000${data.logo}`)
        } catch { showToast('error', 'Failed to load company profile') }
        finally { setLoading(false) }
    }

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLogoFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setLogoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = new FormData()
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'logo' || k === 'updatedAt' || k === 'id') return
                if (v !== null && v !== undefined) payload.append(k, String(v))
            })
            if (logoFile) payload.append('logo', logoFile)

            const res = await fetch('http://localhost:5000/api/company', { 
                method: 'PUT', 
                headers: { 'x-user-role': userRole },
                body: payload 
            })
            if (res.ok) {
                const updated = await res.json()
                setForm(updated)
                if (updated.logo) setLogoPreview(`http://localhost:5000${updated.logo}`)
                setLogoFile(null)
                showToast('success', 'Company profile saved successfully')
            } else {
                const err = await res.json()
                showToast('error', err.message || 'Failed to save')
            }
        } catch { showToast('error', 'Network error') }
        finally { setSaving(false) }
    }

    const set = (field: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }))

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 bg-slate-50/30 min-h-screen pb-24 md:pb-8">
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border ${toast.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                >
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.message}
                </motion.div>
            )}

            {/* Page Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">COMPANY PROFILE</h1>
                            <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Business Identity & Legal Information</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button type="button" variant="outline" onClick={fetchProfile} className="flex-1 md:flex-none rounded-xl text-slate-600 border-slate-200 h-11 md:h-10 px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                        <RefreshCw size={14} className="mr-2" /> RELOAD
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving} className="flex-[2] md:flex-none rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 md:h-10 px-6 text-[10px] md:text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                        <Save size={14} className="mr-2" /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </Button>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* LOGO + IDENTITY */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100 shadow-sm">
                    <SectionHeader icon={Building2} title="Company Identity" subtitle="Primary business details and logo" />
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Logo Upload */}
                        <div className="flex flex-col items-center gap-3 flex-shrink-0 w-full md:w-auto">
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-inner"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-xl p-2" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-indigo-400">
                                        <Camera size={32} className="opacity-60" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload Logo</span>
                                    </div>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            {logoPreview && (
                                <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null) }}
                                    className="text-[10px] font-semibold text-rose-500 flex items-center gap-1 hover:text-rose-700 uppercase tracking-wider">
                                    <X size={10} /> Remove
                                </button>
                            )}
                            <div className="flex items-center gap-1 text-slate-400">
                                <Upload size={10} />
                                <span className="text-[9px] uppercase tracking-wider">PNG/JPG/WEBP</span>
                            </div>
                        </div>

                        {/* Identity Fields */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label="Company / Brand Name" required>
                                <input value={form.name || ''} onChange={set('name')} required placeholder="e.g. Axon Ecosystem" className={inputClass} />
                            </Field>
                            <Field label="Legal Entity Name">
                                <input value={form.legalName || ''} onChange={set('legalName')} placeholder="e.g. PT. Axon Ekosistem Digital" className={inputClass} />
                            </Field>
                            <Field label="Industry / Business Sector">
                                <select value={form.industry || ''} onChange={set('industry')} className={inputClass}>
                                    <option value="">Select Industry</option>
                                    <option>Technology & Software</option>
                                    <option>Manufacturing</option>
                                    <option>Trading & Distribution</option>
                                    <option>Construction</option>
                                    <option>Retail</option>
                                    <option>Services</option>
                                    <option>Healthcare</option>
                                    <option>Education</option>
                                    <option>Finance & Banking</option>
                                    <option>Logistics & Transportation</option>
                                    <option>Other</option>
                                </select>
                            </Field>
                            <Field label="Tax ID (NPWP)">
                                <div className="relative">
                                    <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={form.taxId || ''} onChange={set('taxId')} placeholder="00.000.000.0-000.000" className={inputClass + " pl-9"} />
                                </div>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ADDRESS */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100 shadow-sm">
                    <SectionHeader icon={MapPin} title="Address & Location" subtitle="Physical and mailing address" />
                    <div className="grid grid-cols-1 gap-5">
                        <Field label="Street Address">
                            <textarea value={form.address || ''} onChange={set('address')} rows={2}
                                placeholder="Jl. Sudirman No. 1, Gedung Axon Tower Lt. 20"
                                className={inputClass + " resize-none"} />
                        </Field>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Field label="City">
                                <input value={form.city || ''} onChange={set('city')} placeholder="Jakarta Selatan" className={inputClass} />
                            </Field>
                            <Field label="Province">
                                <input value={form.province || ''} onChange={set('province')} placeholder="DKI Jakarta" className={inputClass} />
                            </Field>
                            <Field label="Postal Code">
                                <input value={form.postalCode || ''} onChange={set('postalCode')} placeholder="12190" className={inputClass} />
                            </Field>
                            <Field label="Country">
                                <input value={form.country || 'Indonesia'} onChange={set('country')} placeholder="Indonesia" className={inputClass} />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* CONTACT */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100 shadow-sm">
                    <SectionHeader icon={Phone} title="Contact Information" subtitle="Phone, email and web presence" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Primary Phone">
                            <div className="relative">
                                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={form.phone || ''} onChange={set('phone')} placeholder="+62 21 5555 1234" className={inputClass + " pl-9"} />
                            </div>
                        </Field>
                        <Field label="Fax">
                            <div className="relative">
                                <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={form.fax || ''} onChange={set('fax')} placeholder="+62 21 5555 5678" className={inputClass + " pl-9"} />
                            </div>
                        </Field>
                        <Field label="Email Address">
                            <div className="relative">
                                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="email" value={form.email || ''} onChange={set('email')} placeholder="info@axonecosystem.com" className={inputClass + " pl-9"} />
                            </div>
                        </Field>
                        <Field label="Website">
                            <div className="relative">
                                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={form.website || ''} onChange={set('website')} placeholder="https://www.axonecosystem.com" className={inputClass + " pl-9"} />
                            </div>
                        </Field>
                    </div>
                </div>

                {/* BANK */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100 shadow-sm">
                    <SectionHeader icon={Landmark} title="Bank Account" subtitle="For invoices and payment documents" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        <Field label="Bank Name">
                            <div className="relative">
                                <Landmark size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select value={form.bankName || ''} onChange={set('bankName')} className={inputClass + " pl-9"}>
                                    <option value="">Select Bank</option>
                                    <option>Bank BCA</option>
                                    <option>Bank Mandiri</option>
                                    <option>Bank BNI</option>
                                    <option>Bank BRI</option>
                                    <option>Bank BTN</option>
                                    <option>Bank CIMB Niaga</option>
                                    <option>Bank Permata</option>
                                    <option>Bank Danamon</option>
                                    <option>Bank Panin</option>
                                    <option>Bank OCBC</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </Field>
                        <Field label="Account Number">
                            <div className="relative">
                                <CreditCard size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={form.bankAccount || ''} onChange={set('bankAccount')} placeholder="1234567890" className={inputClass + " pl-9 font-mono tracking-widest"} />
                            </div>
                        </Field>
                        <Field label="Account Holder Name">
                            <input value={form.bankHolder || ''} onChange={set('bankHolder')} placeholder="PT. Axon Ekosistem Digital" className={inputClass} />
                        </Field>
                    </div>
                </div>

                {/* Footer save button */}
                <div className="flex justify-end pb-6">
                    <Button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20">
                        <Save size={15} className="mr-2" /> {saving ? 'Saving...' : 'Save All Changes'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
