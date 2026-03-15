"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Box,
    Package,
    Tag,
    DollarSign,
    ChevronLeft,
    X,
    Save,
    Info,
    Warehouse,
    Truck,
    Settings,
    Barcode,
    Weight,
    AlertTriangle,
    History,
    TrendingUp,
    TrendingDown,
    Clock,
    ImageIcon,
    Upload,
    Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface Category {
    id: string
    name: string
}

interface ProductSKU {
    id?: string
    code: string
    name: string
    unitId: string
    unit?: Unit
    purchaseUnitId: string | null
    purchaseUnit?: Unit | null
    purchasePrice: number
    salePrice: number
    stock: number
    minStock: number
    stockLocation: string | null
    usage: string | null
    specifications: string | null
    barcode: string | null
    weight: number | null
    isActive: boolean
}

interface Unit {
    id: string
    name: string
}

interface Product {
    id: string
    code: string
    name: string
    brand: string | null
    type: string
    categoryId: string | null
    category: Category | null
    image: string | null
    skus: ProductSKU[]
}

interface PriceHistory {
    id: string
    type: 'PURCHASE' | 'SALE'
    oldPrice: number
    newPrice: number
    changeReason: string | null
    createdAt: string
}

// --- Custom Tooltip Component ---
const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}>
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-xl z-[100] whitespace-nowrap pointer-events-none"
                    >
                        {text}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

    const toggleExpand = (id: string) => {
        setExpandedProducts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/products')
            const data = await res.json()
            setProducts(data)
        } catch (error) {
            console.error("Error fetching products:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEditingProduct(null)
        setIsModalOpen(true)
    }

    const handleView = (product: Product) => {
        setViewingProduct(product)
        setIsViewModalOpen(true)
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return
        try {
            await fetch(`http://localhost:5000/api/products/${id}`, { method: 'DELETE' })
            fetchProducts()
        } catch (error) {
            console.error("Error deleting product:", error)
        }
    }

    const filteredProducts = Array.isArray(products) ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.skus && p.skus.some(sku =>
            sku.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sku.barcode && sku.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
        )) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : []

    return (
        <div className="p-4 md:p-8 min-h-screen bg-white">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4 md:gap-5">
                    <Link href="/dashboard/management">
                        <Button variant="ghost" size="icon" className="rounded-xl border border-border h-10 w-10">
                            <ChevronLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                            Master <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Product</span>
                        </h1>
                        <p className="text-[10px] md:text-[11px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">Directory</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative group flex-1 sm:flex-initial">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-indigo-600 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all uppercase font-semibold tracking-tight shadow-sm placeholder:lowercase placeholder:font-normal"
                        />
                    </div>
                    <Tooltip text="Create New Item">
                        <Button
                            onClick={handleCreate}
                            className="rounded-xl font-bold shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-600/30 active:scale-95 px-6 py-6 sm:py-2 transition-all border border-indigo-500/50 w-full sm:w-auto"
                        >
                            <Plus size={16} className="mr-2" />
                            New Product
                        </Button>
                    </Tooltip>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="space-y-6">
                        {/* --- DESKTOP TABLE VIEW --- */}
                        <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 bg-slate-50/80">
                                        <th className="px-5 py-4 font-bold w-10"></th>
                                        <th className="px-5 py-4 font-bold">Product / SKU</th>
                                        <th className="px-5 py-4 font-bold">Type &amp; Category</th>
                                        <th className="px-5 py-4 text-right font-bold">Total Stock</th>
                                        <th className="px-5 py-4 text-right font-bold">Stock Value</th>
                                        <th className="px-5 py-4 text-center font-bold">Low Stock</th>
                                        <th className="px-5 py-4 text-center font-bold">Status</th>
                                        <th className="px-5 py-4 text-right font-bold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((p, idx) => {
                                        const isExpanded = expandedProducts.has(p.id);
                                        const totalStock = p.skus?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;
                                        const hasLowStock = p.skus?.some(s => s.stock <= s.minStock);
                                        return (
                                            <React.Fragment key={p.id}>
                                                {/* ── PARENT PRODUCT ROW ── */}
                                                <motion.tr
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className={`group transition-colors border-b border-slate-100 ${isExpanded ? 'bg-indigo-50/60 border-indigo-100' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {/* Expand toggle */}
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() => toggleExpand(p.id)}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isExpanded
                                                                ? 'bg-indigo-100 text-indigo-600 rotate-90'
                                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                                                }`}
                                                        >
                                                            <ChevronLeft size={14} className="-rotate-90 transition-transform" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                                                        </button>
                                                    </td>
                                                    {/* Product info */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                onClick={() => p.image && setEnlargedImage(`http://localhost:5000${p.image}`)}
                                                                className={`w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 overflow-hidden border border-indigo-100 flex-shrink-0 ${p.image ? 'cursor-zoom-in hover:scale-105 transition-all' : ''
                                                                    }`}
                                                            >
                                                                {p.image ? (
                                                                    <img src={`http://localhost:5000${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Box size={18} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black tracking-widest text-indigo-600 uppercase">{p.code}</p>
                                                                <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
                                                                <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                                                                    {p.skus?.length || 0} SKU{(p.skus?.length || 0) !== 1 ? 's' : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 border-slate-200 text-slate-600 px-2">
                                                                {p.type}
                                                            </Badge>
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                                                <Tag size={10} className="text-indigo-400" />
                                                                {p.category?.name || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <p className="font-bold text-slate-800 text-base tracking-tight">
                                                            {totalStock.toLocaleString()}
                                                            <span className="text-[10px] font-semibold text-slate-400 ml-1">
                                                                {p.skus?.[0]?.unit?.name || 'pcs'}
                                                            </span>
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        {(() => {
                                                            const stockValue = p.skus?.reduce((sum, s) => sum + ((s.stock || 0) * (s.purchasePrice || 0)), 0) || 0;
                                                            return (
                                                                <>
                                                                    <p className="font-semibold text-slate-700 text-sm">
                                                                        Rp {stockValue.toLocaleString()}
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">at cost</p>
                                                                </>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {hasLowStock ? (
                                                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                                <AlertTriangle size={9} /> Low
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                                OK
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {p.skus?.some(s => s.isActive) ? (
                                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Button onClick={() => handleView(p)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50">
                                                                <Eye size={14} />
                                                            </Button>
                                                            <Button onClick={() => handleEdit(p)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50">
                                                                <Edit size={14} />
                                                            </Button>
                                                            <Button onClick={() => handleDelete(p.id)} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </motion.tr>

                                                {/* ── CHILD SKU ROWS ── */}
                                                {isExpanded && (p.skus || []).map((sku, skuIdx) => (
                                                    <motion.tr
                                                        key={sku.id || skuIdx}
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: skuIdx * 0.02 }}
                                                        className="bg-indigo-50/30 border-b border-indigo-100/60 hover:bg-indigo-50/60 transition-colors"
                                                    >
                                                        <td className="px-4 py-3" />
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-4 border-l-2 border-b-2 border-indigo-200 rounded-bl-md h-3.5 -mt-3.5 mr-1" />
                                                                <div>
                                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{sku.code}</p>
                                                                    <p className="text-[12px] font-semibold text-slate-700 leading-tight">{sku.name || <span className="italic text-slate-400">No name</span>}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest">SKU</span>
                                                        </td>
                                                        <td className="py-3 pr-4 text-right">
                                                            <p className="font-bold text-emerald-700 text-sm">Rp {sku.salePrice?.toLocaleString()}</p>
                                                        </td>
                                                        <td className="py-3 pr-4 text-right">
                                                            <p className="font-semibold text-amber-700 text-sm">Rp {sku.purchasePrice?.toLocaleString()}</p>
                                                        </td>
                                                        <td className="py-3 pr-4 text-center">
                                                            <Badge className={`rounded-lg text-[10px] font-semibold px-2 py-0.5 shadow-none border ${sku.stock <= sku.minStock
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}>
                                                                {sku.stock} {sku.unitId}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 pr-4 text-center">
                                                            {sku.isActive ? 'Active' : 'Inactive'}
                                                        </td>
                                                        <td />
                                                    </motion.tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* --- MOBILE CARD VIEW --- */}
                        <div className="lg:hidden grid grid-cols-1 gap-4">
                            {filteredProducts.map((p, idx) => {
                                const totalStock = p.skus?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;
                                const isExpanded = expandedProducts.has(p.id);
                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                                    >
                                        <div className="p-4 flex gap-4">
                                            <div
                                                onClick={() => p.image && setEnlargedImage(`http://localhost:5000${p.image}`)}
                                                className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center p-1"
                                            >
                                                {p.image ? (
                                                    <img src={`http://localhost:5000${p.image}`} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Box size={24} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest truncate">{p.code}</p>
                                                    <Badge className="text-[8px] font-bold px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200 h-4">{p.type}</Badge>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5">{p.name}</h3>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Stock</p>
                                                        <p className="text-xs font-black text-slate-700">{totalStock} <span className="opacity-60 font-medium">{p.skus?.[0]?.unit?.name || 'pcs'}</span></p>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100" />
                                                    <div>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Variants</p>
                                                        <p className="text-xs font-black text-slate-700">{p.skus?.length || 0}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleView(p)}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-white border border-slate-200 text-emerald-600 px-3 text-[10px] font-bold uppercase tracking-wider"
                                                >
                                                    <Eye size={12} className="mr-1.5" /> View
                                                </Button>
                                                <Button
                                                    onClick={() => handleEdit(p)}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-white border border-slate-200 text-indigo-600 px-3 text-[10px] font-bold uppercase tracking-wider"
                                                >
                                                    <Edit size={12} className="mr-1.5" /> Edit
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => toggleExpand(p.id)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}
                                                >
                                                    <Package size={14} className={isExpanded ? 'animate-pulse' : ''} />
                                                </button>
                                                <Button
                                                    onClick={() => handleDelete(p.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Mobile SKU Detail Expansion */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-indigo-50/30"
                                                >
                                                    <div className="p-4 space-y-3">
                                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">SKU Variations</p>
                                                        {(p.skus || []).map((sku, sidx) => (
                                                            <div key={sidx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <p className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em]">{sku.code}</p>
                                                                        <p className="text-[11px] font-bold text-slate-800">{sku.name || 'Standard variant'}</p>
                                                                    </div>
                                                                    <Badge className={`text-[8px] px-1.5 h-4 border-emerald-100 bg-emerald-50 text-emerald-600`}>
                                                                        {sku.stock} {sku.unitId}
                                                                    </Badge>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                                                                    <div>
                                                                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Sale</p>
                                                                        <p className="text-[10px] font-black text-slate-700">Rp {sku.salePrice.toLocaleString()}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Cost</p>
                                                                        <p className="text-[10px] font-black text-slate-700">Rp {sku.purchasePrice.toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <Card className="glass-card border-dashed py-24 border-2 border-border/50">
                        <CardContent className="flex flex-col items-center justify-center">
                            <Box size={80} className="text-muted-foreground mb-6 opacity-10 animate-pulse" />
                            <p className="text-2xl font-black text-foreground mb-2 tracking-tight uppercase">No Products Found</p>
                            <p className="text-muted-foreground font-medium mb-10 max-w-sm text-center">Your ERP Master Directory is empty. Click below to add your first product or service.</p>
                            <Button
                                onClick={handleCreate}
                                className="rounded-2xl font-black bg-indigo-600 text-white px-10 py-6 text-lg shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all"
                            >
                                <Plus size={24} className="mr-3" />
                                Add Product
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            <ProductViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                product={viewingProduct}
                onEnlargeImage={(url) => setEnlargedImage(url)}
            />

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={editingProduct}
                onSuccess={fetchProducts}
                onEnlargeImage={setEnlargedImage}
            />

            <ImageLightbox
                imageUrl={enlargedImage}
                onClose={() => setEnlargedImage(null)}
            />
        </div>
    )
}

function ProductViewModal({ isOpen, onClose, product, onEnlargeImage }: { isOpen: boolean, onClose: () => void, product: Product | null, onEnlargeImage: (url: string) => void }) {
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS')
    const [history, setHistory] = useState<PriceHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        if (product && activeTab === 'HISTORY') {
            fetchHistory(product.id)
        }
    }, [product, activeTab])

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true)
        try {
            const res = await fetch(`http://localhost:5000/api/products/${id}/price-history`)
            const data = await res.json()
            setHistory(data)
        } catch (error) {
            console.error("Error fetching price history:", error)
        } finally {
            setLoadingHistory(false)
        }
    }

    if (!product) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-card border border-border shadow-2xl md:rounded-[2.5rem] overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col mx-2 md:mx-0"
                    >
                        <header className="p-5 md:p-8 border-b border-border bg-white shadow-sm relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm">
                                        <Eye size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                            Product Details
                                        </h2>
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Master Data Insight</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="hidden md:flex items-center gap-2 bg-white p-1 rounded-2xl border border-border/50">
                                        <Button
                                            onClick={() => setActiveTab('DETAILS')}
                                            variant={activeTab === 'DETAILS' ? 'secondary' : 'ghost'}
                                            type="button"
                                            className={`rounded-xl px-5 font-semibold text-[11px] uppercase tracking-wider h-9 transition-all ${activeTab === 'DETAILS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            <Info size={14} className="mr-1.5" />
                                            Details
                                        </Button>
                                        <Button
                                            onClick={() => setActiveTab('HISTORY')}
                                            variant={activeTab === 'HISTORY' ? 'secondary' : 'ghost'}
                                            type="button"
                                            className={`rounded-xl px-5 font-semibold text-[11px] uppercase tracking-wider h-9 transition-all ${activeTab === 'HISTORY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-100' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            <History size={14} className="mr-1.5" />
                                            Price History
                                        </Button>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2">
                                        <X size={20} />
                                    </Button>
                                </div>
                            </div>

                            {/* Mobile Tabs */}
                            <div className="flex md:hidden items-center gap-2 mt-4 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <Button
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`flex-1 rounded-lg h-10 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DETAILS' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'bg-transparent text-slate-400'}`}
                                >
                                    Details
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('HISTORY')}
                                    className={`flex-1 rounded-lg h-10 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'bg-transparent text-slate-400'}`}
                                >
                                    History
                                </Button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'DETAILS' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-10"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-10">
                                            {/* Left Column: Image & Basic Info */}
                                            <div className="md:col-span-1 space-y-6">
                                                <div
                                                    onClick={() => product.image && onEnlargeImage(`http://localhost:5000${product.image}`)}
                                                    className={`aspect-square rounded-[2rem] bg-indigo-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group relative ${product.image ? 'cursor-zoom-in' : ''}`}
                                                >
                                                    {product.image ? (
                                                        <>
                                                            <img src={`http://localhost:5000${product.image}`} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Search size={32} className="text-white drop-shadow-lg" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <Package size={48} className="text-indigo-200" />
                                                    )}
                                                </div>
                                                <div className="mt-6 space-y-3">
                                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                                                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
                                                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border-slate-200 bg-white text-slate-600 shadow-none">{product.type}</Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 space-y-8">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{product.code}</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-black tracking-tight mb-2">{product.name}</h3>
                                                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                        <span className="flex items-center gap-1.5"><Tag size={14} className="text-emerald-500" /> {product.brand || 'Generic Brand'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span>{product.category?.name || 'Uncategorized'}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Product Variants (SKUs)
                                                    </h4>

                                                    {product.skus && product.skus.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {product.skus.map((sku, index) => (
                                                                <div key={index} className="p-5 md:p-6 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm space-y-6">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 px-3 py-1 rounded-lg font-bold text-xs shadow-none">
                                                                                {sku.code}
                                                                            </Badge>
                                                                            {sku.barcode && (
                                                                                <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 text-slate-500 bg-slate-50 h-6 px-2 shadow-none">
                                                                                    <Barcode size={12} className="mr-1.5" /> {sku.barcode}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {sku.isActive ? (
                                                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-none uppercase">Active</Badge>
                                                                            ) : (
                                                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-border text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-none uppercase">Inactive</Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Sale Price</p>
                                                                            <p className="text-base font-black text-slate-900 tracking-tight">Rp {sku.salePrice.toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Purchase Price</p>
                                                                            <p className="text-base font-black text-slate-400 tracking-tight">Rp {sku.purchasePrice.toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Stock Level</p>
                                                                            <p className={`text-base font-black tracking-tight ${sku.stock <= sku.minStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                                {sku.stock} <span className="text-[10px] font-bold opacity-60 ml-0.5">{sku.unit?.name || 'pcs'}</span>
                                                                            </p>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Location</p>
                                                                            <p className="text-sm font-bold text-slate-700 uppercase tracking-tight truncate">{sku.stockLocation || 'N/A'}</p>
                                                                        </div>
                                                                    </div>

                                                                    {(sku.specifications || sku.usage) && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                                            {sku.specifications && (
                                                                                <div className="space-y-2">
                                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Specifications</p>
                                                                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{sku.specifications}</p>
                                                                                </div>
                                                                            )}
                                                                            {sku.usage && (
                                                                                <div className="space-y-2">
                                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Usage Details</p>
                                                                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{sku.usage}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center bg-slate-50/30">
                                                            <Package size={40} className="text-slate-300 mb-3" />
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No SKU variants defined</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <TrendingUp size={20} className="text-emerald-500" />
                                                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Price Evolution</h3>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-black border-border shadow-sm">
                                                TOTAL LOGS: {history.length}
                                            </Badge>
                                        </div>

                                        {loadingHistory ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Retrieving audit trail...</p>
                                            </div>
                                        ) : history.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4">
                                                {history.map((log, idx) => {
                                                    const isIncrease = log.newPrice > log.oldPrice
                                                    return (
                                                        <div key={log.id} className="p-4 md:p-6 bg-card border border-border/50 rounded-3xl shadow-sm hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group">
                                                            <div className="flex items-center gap-4 md:gap-6">
                                                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${log.type === 'SALE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                                    {log.type === 'SALE' ? <DollarSign size={24} className="md:size-7" /> : <Truck size={24} className="md:size-7" />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <Badge className={`text-[9px] font-black tracking-widest border-0 ${log.type === 'SALE' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                                            {log.type}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                                                            <Clock size={12} /> {new Date(log.createdAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <p className="text-xl md:text-2xl font-black text-foreground">Rp {log.newPrice.toLocaleString()}</p>
                                                                        <div className={`flex items-center gap-1 text-[10px] font-black ${isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                            {isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                                            {Math.abs(((log.newPrice - log.oldPrice) / log.oldPrice) * 100).toFixed(1)}%
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-border/50 w-full sm:w-auto">
                                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Audit Reason</p>
                                                                <p className="text-xs font-bold text-foreground/80 tracking-tight">{log.changeReason || 'System Adjustment'}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-24 opacity-20 border-2 border-dashed border-border rounded-3xl">
                                                <History size={80} className="mb-4" />
                                                <p className="text-xl font-black uppercase tracking-[0.2em]">Zero Activity Recorded</p>
                                                <p className="text-xs font-bold mt-2">Historical price data will appear here once adjustments are made.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <footer className="p-5 md:p-8 border-t border-border flex items-center justify-end bg-secondary/10">
                            <Button
                                onClick={onClose}
                                className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 px-12 h-12 active:scale-95 transition-all text-xs uppercase tracking-widest w-full md:w-auto"
                            >
                                Dismiss Details
                            </Button>
                        </footer>
                    </motion.div>
                </div >
            )
            }
        </AnimatePresence >
    )
}

function ImageLightbox({ imageUrl, onClose }: { imageUrl: string | null, onClose: () => void }) {
    return (
        <AnimatePresence>
            {imageUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl cursor-zoom-out"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative max-w-full max-h-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50 bg-card"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute top-6 right-6 z-10 rounded-full bg-background/20 backdrop-blur-md hover:bg-rose-500 hover:text-white transition-all w-12 h-12 shadow-lg"
                        >
                            <X size={24} />
                        </Button>
                        <img
                            src={imageUrl}
                            alt="Enlarged Product"
                            className="max-w-[90vw] max-h-[85vh] object-contain pointer-events-none p-2"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function ProductModal({ isOpen, onClose, product, onSuccess, onEnlargeImage }: { isOpen: boolean, onClose: () => void, product: Product | null, onSuccess: () => void, onEnlargeImage: (url: string) => void }) {
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS')
    const [history, setHistory] = useState<PriceHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedSkuIndex, setSelectedSkuIndex] = useState(0)
    const [categories, setCategories] = useState<Category[]>([])
    const [units, setUnits] = useState<Unit[]>([])

    const getNewSku = (productCode?: string, index?: number, unitData?: Unit[]): ProductSKU => {
        const defaultUnitId = unitData?.find(u => u.name.toLowerCase() === 'pcs')?.id || (units.length > 0 ? units[0].id : '');
        const autoCode = productCode ? `${productCode}-SKU-${String((index || 0) + 1).padStart(3, '0')}` : '';
        return {
            code: autoCode,
            name: '',
            unitId: defaultUnitId,
            purchaseUnitId: defaultUnitId,
            purchasePrice: 0,
            salePrice: 0,
            stock: 0,
            minStock: 0,
            stockLocation: '',
            usage: '',
            specifications: '',
            barcode: autoCode,
            weight: 0,
            isActive: true
        };
    };

    const [formData, setFormData] = useState<Partial<Product>>({
        code: '',
        name: '',
        brand: '',
        type: 'GOODS',
        categoryId: '',
        skus: []
    })

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (product) {
            setFormData({
                code: product.code,
                name: product.name,
                brand: product.brand || '',
                type: product.type,
                categoryId: product.categoryId || '',
                skus: product.skus ? [...product.skus] : []
            });
            setImagePreview(product.image ? `http://localhost:5000${product.image}` : null);
            setActiveTab('DETAILS');
        } else {
            const autoCode = `PROD-${Date.now().toString().slice(-6)}`;
            setFormData({
                code: autoCode,
                name: '',
                brand: '',
                type: 'GOODS',
                categoryId: categories[0]?.id || '',
                skus: [getNewSku(autoCode, 0)]
            });
            setImagePreview(null);
            setImageFile(null);
        }
    }, [product, units, categories])

    const fetchOptions = async () => {
        try {
            const [catRes, unitRes] = await Promise.all([
                fetch('http://localhost:5000/api/categories'),
                fetch('http://localhost:5000/api/units')
            ])
            const [catData, unitData] = await Promise.all([
                catRes.json(),
                unitRes.json()
            ])
            setCategories(catData)
            setUnits(unitData)

            // No longer setting default unit here as it's handled in the useEffect for product
        } catch (error) {
            console.error("Error fetching options:", error)
        }
    }



    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true)
        try {
            const res = await fetch(`http://localhost:5000/api/products/${id}/price-history`)
            const data = await res.json()
            setHistory(data)
        } catch (error) {
            console.error("Error fetching price history:", error)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const method = product ? 'PUT' : 'POST'
        const url = product
            ? `http://localhost:5000/api/products/${product.id}`
            : 'http://localhost:5000/api/products'

        const formDataPayload = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (['category', 'unit', 'purchaseUnit', 'priceHistory'].includes(key)) return;
            if (key === 'image' && imageFile) return;
            if (key === 'skus') {
                formDataPayload.append(key, JSON.stringify(value));
                return;
            }
            if (value !== null && value !== undefined) {
                formDataPayload.append(key, value.toString());
            }
        });

        if (imageFile) {
            formDataPayload.append('image', imageFile);
        }

        try {
            console.log("Submitting formData...");
            const res = await fetch(url, {
                method,
                body: formDataPayload
            })
            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                const errorData = await res.json();
                console.error("Update failed:", errorData);
                alert(`Error: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Network error saving product:", error);
            alert("Network error. Please check your connection.");
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-white border border-border shadow-2xl md:rounded-[2.5rem] overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col mx-2 md:mx-0"
                    >
                        <header className="p-5 md:p-8 border-b border-slate-200 bg-white shadow-sm relative z-10">
                            <div className="flex items-center justify-between relative">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                            {product ? 'Edit' : 'Create'} Product
                                        </h2>
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Master Data Entry</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {product && (
                                        <div className="hidden md:flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                            <Button
                                                onClick={() => setActiveTab('DETAILS')}
                                                variant={activeTab === 'DETAILS' ? 'secondary' : 'ghost'}
                                                type="button"
                                                className={`rounded-lg px-5 font-semibold text-[11px] uppercase tracking-wider h-9 transition-all ${activeTab === 'DETAILS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm hover:bg-indigo-100' : 'text-slate-500 hover:text-slate-900'}`}
                                            >
                                                <Info size={14} className="mr-1.5" />
                                                Details
                                            </Button>
                                            <Button
                                                onClick={() => setActiveTab('HISTORY')}
                                                variant={activeTab === 'HISTORY' ? 'secondary' : 'ghost'}
                                                type="button"
                                                className={`rounded-lg px-5 font-semibold text-[11px] uppercase tracking-wider h-9 transition-all ${activeTab === 'HISTORY' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm hover:bg-indigo-100' : 'text-slate-500 hover:text-slate-900'}`}
                                            >
                                                <History size={14} className="mr-1.5" />
                                                Price History
                                            </Button>
                                        </div>
                                    )}
                                    <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2">
                                        <X size={20} />
                                    </Button>
                                </div>
                            </div>
                            {/* Mobile Tabs */}
                            {product && (
                                <div className="flex md:hidden items-center gap-2 mt-4 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <Button
                                        onClick={() => setActiveTab('DETAILS')}
                                        className={`flex-1 rounded-lg h-10 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DETAILS' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'bg-transparent text-slate-400'}`}
                                    >
                                        Details
                                    </Button>
                                    <Button
                                        onClick={() => setActiveTab('HISTORY')}
                                        className={`flex-1 rounded-lg h-10 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'bg-transparent text-slate-400'}`}
                                    >
                                        History
                                    </Button>
                                </div>
                            )}
                        </header>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'DETAILS' ? (
                                    <motion.form
                                        key="details"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-10"
                                    >
                                        {/* SECTION: BASIC INFO */}
                                        <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Info size={18} />
                                                    <h3 className="text-sm font-bold uppercase tracking-widest">General Information</h3>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="md:col-span-1 space-y-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 inline-block mb-1">Product Image</span>
                                                    <input
                                                        id="product-image-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageChange}
                                                    />
                                                    <label
                                                        htmlFor="product-image-upload"
                                                        className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all cursor-pointer bg-secondary/20 flex flex-col items-center justify-center overflow-hidden group relative block w-full"
                                                    >
                                                        {imagePreview ? (
                                                            <>
                                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onEnlargeImage(imagePreview);
                                                                        }}
                                                                        className="rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40"
                                                                    >
                                                                        <Search size={20} />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            document.getElementById('product-image-upload')?.click();
                                                                        }}
                                                                        className="rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40"
                                                                    >
                                                                        <Upload size={20} />
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                                                                <ImageIcon size={32} />
                                                                <p className="text-[8px] font-black uppercase tracking-tighter">Click to Upload</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Internal Code <span className="text-rose-500">*</span></label>
                                                        <input
                                                            required
                                                            value={formData.code}
                                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none uppercase transition-all shadow-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Product Name <span className="text-rose-500">*</span></label>
                                                        <input
                                                            required
                                                            value={formData.name}
                                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                            placeholder="e.g. Server Maintenance Package"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Brand</label>
                                                        <input
                                                            value={formData.brand || ''}
                                                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                                            placeholder="e.g. Dell, Cisco"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none uppercase transition-all shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Type <span className="text-rose-500">*</span></label>
                                                        <select
                                                            value={formData.type}
                                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                        >
                                                            <option value="GOODS">GOODS (STOCKABLE)</option>
                                                            <option value="SERVICE">SERVICE (NON-STOCK)</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Category</label>
                                                        <select
                                                            value={formData.categoryId || ''}
                                                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                        >
                                                            <option value="">Select Category</option>
                                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                        </select>
                                                    </div>

                                                </div>
                                            </div>
                                        </section>

                                        {/* SECTION: SKU VARIANTS */}
                                        <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Package size={18} />
                                                    <h3 className="text-sm font-bold uppercase tracking-widest">Product Variants (SKUs)</h3>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        const currentSkus = formData.skus || [];
                                                        const newSku = getNewSku(formData.code || 'PROD', currentSkus.length);
                                                        const newSkus = [...currentSkus, newSku];
                                                        setFormData({ ...formData, skus: newSkus });
                                                        setSelectedSkuIndex(newSkus.length - 1);
                                                    }}
                                                    className="text-[10px] font-bold uppercase tracking-widest h-8 px-3 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Plus size={14} className="mr-1.5" /> Add Variant
                                                </Button>
                                            </div>

                                            {/* SKU Tab Selector */}
                                            {(formData.skus || []).length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {(formData.skus || []).map((sku, idx) => (
                                                        <div key={idx} className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedSkuIndex(idx)}
                                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${selectedSkuIndex === idx
                                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                    }`}
                                                            >
                                                                {sku.name || sku.code || `SKU ${idx + 1}`}
                                                            </button>
                                                            {(formData.skus || []).length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = (formData.skus || []).filter((_, i) => i !== idx);
                                                                        setFormData({ ...formData, skus: updated });
                                                                        setSelectedSkuIndex(Math.max(0, selectedSkuIndex - 1));
                                                                    }}
                                                                    className="w-5 h-5 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* SKU Form Fields */}
                                            {(formData.skus || []).length > 0 && (() => {
                                                const sku = (formData.skus || [])[selectedSkuIndex] || {};
                                                const updateSku = (updates: Partial<ProductSKU>) => {
                                                    const updated = [...(formData.skus || [])];
                                                    updated[selectedSkuIndex] = { ...updated[selectedSkuIndex], ...updates } as ProductSKU;
                                                    setFormData({ ...formData, skus: updated });
                                                };
                                                return (
                                                    <div className="space-y-6">
                                                        {/* SKU Name */}
                                                        <div className="space-y-2">
                                                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Variant Name <span className="text-rose-500">*</span></label>
                                                            <input
                                                                required
                                                                value={(sku as ProductSKU).name || ''}
                                                                onChange={e => updateSku({ name: e.target.value })}
                                                                placeholder={`e.g. ${formData.name || 'SWITCH HUB'} 5 PORT`}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                            />
                                                        </div>

                                                        {/* SKU Code & Barcode */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">SKU Code <span className="text-rose-500">*</span></label>
                                                                <input
                                                                    required
                                                                    value={sku.code || ''}
                                                                    onChange={e => updateSku({ code: e.target.value.toUpperCase() })}
                                                                    placeholder="e.g. SKU-001-BLK-L"
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none uppercase tracking-wider transition-all shadow-sm font-mono"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Barcode / EAN</label>
                                                                <input
                                                                    value={(sku as ProductSKU).barcode || ''}
                                                                    onChange={e => updateSku({ barcode: e.target.value })}
                                                                    placeholder="Scan or enter barcode"
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono tracking-widest transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Pricing */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Purchase Price (Rp)</label>
                                                                <input type="number" value={(sku as ProductSKU).purchasePrice ?? 0} onChange={e => { const v = parseFloat(e.target.value); updateSku({ purchasePrice: isNaN(v) ? 0 : v }); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Sale Price (Rp)</label>
                                                                <input type="number" value={(sku as ProductSKU).salePrice ?? 0} onChange={e => { const v = parseFloat(e.target.value); updateSku({ salePrice: isNaN(v) ? 0 : v }); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm text-indigo-700" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Base Unit</label>
                                                                <select value={(sku as ProductSKU).unitId || ''} onChange={e => updateSku({ unitId: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm">
                                                                    <option value="">Select Unit</option>
                                                                    {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Purchase Unit</label>
                                                                <select value={(sku as ProductSKU).purchaseUnitId || ''} onChange={e => updateSku({ purchaseUnitId: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm">
                                                                    <option value="">Select Unit</option>
                                                                    {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Inventory */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Current Stock</label>
                                                                <input type="number" value={(sku as ProductSKU).stock ?? 0} onChange={e => { const v = parseFloat(e.target.value); updateSku({ stock: isNaN(v) ? 0 : v }); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 ml-1">Min. Stock Level</label>
                                                                <input type="number" value={(sku as ProductSKU).minStock ?? 0} onChange={e => { const v = parseFloat(e.target.value); updateSku({ minStock: isNaN(v) ? 0 : v }); }} className="w-full bg-rose-50/50 border border-rose-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-rose-600 transition-all shadow-sm" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Stock Location</label>
                                                                <input value={(sku as ProductSKU).stockLocation || ''} onChange={e => updateSku({ stockLocation: e.target.value })} placeholder="e.g. WAREHOUSE A-12" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none uppercase transition-all shadow-sm" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Weight (KG)</label>
                                                                <input type="number" step="0.01" value={(sku as ProductSKU).weight ?? 0} onChange={e => { const v = parseFloat(e.target.value); updateSku({ weight: isNaN(v) ? 0 : v }); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                                                            </div>
                                                        </div>

                                                        {/* Specs & Usage */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Specifications</label>
                                                                <textarea rows={3} value={(sku as ProductSKU).specifications || ''} onChange={e => updateSku({ specifications: e.target.value })} placeholder="Technical details..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all shadow-sm" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Usage Details</label>
                                                                <textarea rows={3} value={(sku as ProductSKU).usage || ''} onChange={e => updateSku({ usage: e.target.value })} placeholder="Standard operating procedures..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all shadow-sm" />
                                                            </div>
                                                        </div>

                                                        {/* Active Status */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2.5 h-2.5 rounded-full ${(sku as ProductSKU).isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                                                <div>
                                                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-900">Variant Active Status</p>
                                                                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Toggle this SKU's visibility in sales & inventory</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSku({ isActive: !(sku as ProductSKU).isActive })}
                                                                className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-sm ${(sku as ProductSKU).isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                            >
                                                                <motion.div
                                                                    animate={{ x: (sku as ProductSKU).isActive ? 28 : 4 }}
                                                                    className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center"
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {(formData.skus || []).length === 0 && (
                                                <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50/30">
                                                    <Package size={40} className="text-slate-300 mb-3" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Click "Add Variant" to add your first SKU</p>
                                                </div>
                                            )}
                                        </section>
                                    </motion.form>

                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8 h-full min-h-[400px]"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-sm">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Price Change Audit Trail</h3>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Historical Trends & Adjustments</p>
                                                </div>
                                            </div>
                                        </div>


                                        {loadingHistory ? (
                                            <div className="flex items-center justify-center py-20">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                            </div>
                                        ) : history.length > 0 ? (
                                            <div className="space-y-4">
                                                {history.map((log, idx) => {
                                                    const isIncrease = log.newPrice > log.oldPrice
                                                    return (
                                                        <motion.div
                                                            key={log.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="glass-card p-6 border border-border/50 rounded-2xl group hover:border-primary/30 transition-all shadow-sm"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-5">
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${log.type === 'SALE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                                                        {log.type === 'SALE' ? <DollarSign size={24} /> : <Truck size={24} />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${log.type === 'SALE' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                                                                                {log.type} PRICE
                                                                            </Badge>
                                                                            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                                                                                <Clock size={12} />
                                                                                {new Date(log.createdAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <p className="text-sm font-medium text-slate-400 dark:text-zinc-500 line-through decoration-slate-300 dark:decoration-zinc-600">Rp {log.oldPrice.toLocaleString()}</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">Rp {log.newPrice.toLocaleString()}</p>
                                                                                <Badge className={`rounded-md text-[10px] font-bold tracking-tight px-1.5 py-0.5 ${isIncrease ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                                                                    {isIncrease ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                                                                    {Math.abs(((log.newPrice - log.oldPrice) / log.oldPrice) * 100).toFixed(1)}%
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em] mb-1">Reason</p>
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{log.changeReason || 'No Reason Provided'}</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                                <History size={64} className="mb-4 text-slate-300 dark:text-zinc-700" />
                                                <p className="text-lg font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">No Price History Found</p>
                                                <p className="text-sm font-medium text-slate-400 dark:text-zinc-500 mt-2">Adjust prices in the details tab to see historical tracking.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <footer className="p-4 md:p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                            <Button variant="ghost" onClick={onClose} className="rounded-xl font-semibold px-8 hover:bg-slate-100 text-slate-600 transition-colors w-full sm:w-auto h-12 sm:h-auto order-2 sm:order-1">Cancel</Button>
                            {activeTab === 'DETAILS' && (
                                <Button
                                    onClick={handleSubmit}
                                    className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 px-8 transition-all w-full sm:w-auto h-12 sm:h-auto order-1 sm:order-2"
                                >
                                    <Save size={18} className="mr-2" />
                                    {product ? 'Update' : 'Save'} Product
                                </Button>
                            )}
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
