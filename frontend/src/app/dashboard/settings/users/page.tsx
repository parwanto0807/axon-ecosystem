"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Users, 
    Search, 
    MoreHorizontal, 
    Edit3, 
    Trash2, 
    ShieldCheck,
    Building2,
    Mail,
    X,
    Check,
    Loader2
} from "lucide-react"
import { useSession } from "next-auth/react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "OPERATIONAL"]
const DEPARTMENTS = ["SALES", "LOGISTIC", "FINANCE", "HR", "NONE"]

export default function UserManagementPage() {
    const { data: session } = useSession()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingUser, setEditingUser] = useState<any>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "OPERATIONAL",
        department: "NONE"
    })
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const userRole = (session?.user as any)?.role

    useEffect(() => {
        if (session && userRole) {
            if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
                window.location.href = "/dashboard"
                return
            }
            fetchUsers()
        }
    }, [session, userRole])

    const fetchUsers = async () => {
        if (!userRole) return
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: { 'x-user-role': userRole }
            })
            if (!res.ok) {
                const error = await res.json()
                alert(error.message || "Gagal mengambil data user")
                setUsers([])
                setLoading(false)
                return
            }
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error("Failed to fetch users", e)
            setUsers([]) // Ensure it's an array even on error
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userRole) return
        setIsSaving(true)
        try {
            const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole
                },
                body: JSON.stringify({
                    name: editingUser.name,
                    role: editingUser.role,
                    department: editingUser.department
                })
            })
            if (res.ok) {
                fetchUsers()
                setIsEditModalOpen(false)
            }
        } catch (e) {
            console.error("Update failed", e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userRole) return
        setIsSaving(true)
        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-role': userRole
                },
                body: JSON.stringify(newUser)
            })
            if (res.ok) {
                fetchUsers()
                setIsCreateModalOpen(false)
                setNewUser({
                    name: "",
                    email: "",
                    password: "",
                    role: "OPERATIONAL",
                    department: "NONE"
                })
            } else {
                const err = await res.json()
                alert(err.message || "Gagal membuat user")
            }
        } catch (e) {
            console.error("Creation failed", e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Hapus user ini? Tindakan ini tidak bisa dibatalkan.")) return
        if (!userRole) return
        try {
            const res = await fetch(`${API_BASE}/users/${id}`, { 
                method: 'DELETE',
                headers: { 'x-user-role': userRole }
            })
            if (res.ok) fetchUsers()
        } catch (e) {
            console.error("Delete failed", e)
        }
    }

    const filteredUsers = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen pb-24 md:pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Users className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase">MANAJEMEN USER</h1>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[3.25rem]">Pengaturan Role & Akses</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:py-3 bg-indigo-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    + TAMBAH USER BARU
                </button>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text"
                        placeholder="Cari user berdasarkan nama atau email..."
                        className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-slate-50 rounded-xl md:rounded-2xl border-none text-xs font-bold outline-none ring-indigo-500/10 focus:ring-2"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-8">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-bottom border-slate-100">
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Info</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Departemen</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={4} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat data...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-slate-300">User tidak ditemukan</td></tr>
                        ) : filteredUsers.map((user) => (
                            <motion.tr 
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={user.id} 
                                className="hover:bg-slate-50/50 transition-colors group"
                            >
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{user.name || 'No Name'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Mail size={10} className="text-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className={user.role === 'SUPER_ADMIN' ? 'text-amber-500' : 'text-indigo-500'} />
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                                            user.role === 'SUPER_ADMIN' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                                            {user.department || 'NONE'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setEditingUser(user)
                                                setIsEditModalOpen(true)
                                            }}
                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        {(session?.user as any)?.id !== user.id && (
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col divide-y divide-slate-50">
                    {loading ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat data...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-slate-300">User tidak ditemukan</div>
                    ) : filteredUsers.map((user) => (
                        <div key={user.id} className="p-5 flex flex-col gap-4 active:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                        {user.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{user.name || 'No Name'}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <Mail size={10} className="text-slate-300" />
                                            <p className="text-[10px] font-bold text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                    user.role === 'SUPER_ADMIN' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    {user.role}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <Building2 size={12} className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                                        {user.department || 'NONE'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setEditingUser(user)
                                            setIsEditModalOpen(true)
                                        }}
                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    {(session?.user as any)?.id !== user.id && (
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="p-2.5 bg-slate-50 text-slate-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'} bg-slate-900/40 backdrop-blur-sm`}>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute inset-0"
                        />
                        <motion.div 
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative bg-white w-full max-w-md overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2rem] max-h-[90vh]' : 'rounded-[2rem] shadow-2xl'}`}
                        >
                            {isMobile && (
                                <div className="w-full h-8 flex items-center justify-center shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                                </div>
                            )}
                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <Edit3 size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Edit Akses User</h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingUser?.email}</p>
                                        </div>
                                    </div>
                                    {!isMobile && (
                                        <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                        <input 
                                            type="text"
                                            value={editingUser?.name || ''}
                                            onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Utama</label>
                                        <select 
                                            value={editingUser?.role || ''}
                                            onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penempatan Departemen</label>
                                        <select 
                                            value={editingUser?.department || ''}
                                            onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                        >
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        SIMPAN PERUBAHAN
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'} bg-slate-900/40 backdrop-blur-sm`}>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0"
                        />
                        <motion.div 
                            initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={`relative bg-white w-full max-w-md overflow-hidden flex flex-col ${isMobile ? 'rounded-t-[2rem] max-h-[90vh]' : 'rounded-[2rem] shadow-2xl'}`}
                        >
                            {isMobile && (
                                <div className="w-full h-8 flex items-center justify-center shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                                </div>
                            )}
                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight text-green-700 uppercase">Tambah User Baru</h2>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Input Data Kredensial</p>
                                        </div>
                                    </div>
                                    {!isMobile && (
                                        <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                        <input 
                                            type="text"
                                            placeholder="Masukkan nama..."
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <input 
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <input 
                                            type="password"
                                            placeholder="••••••••"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-bold focus:ring-2 ring-indigo-500/10 outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                                            <select 
                                                value={newUser.role}
                                                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                                className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                            >
                                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departemen</label>
                                            <select 
                                                value={newUser.department}
                                                onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                                                className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none text-sm font-black focus:ring-2 ring-indigo-500/10 outline-none appearance-none"
                                            >
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full py-4 mt-4 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-green-600/20 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        BUAT USER SEKARANG
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
