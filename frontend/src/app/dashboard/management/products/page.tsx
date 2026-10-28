"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Box,
    Package,
    Tag,
    ChevronLeft,
    ChevronRight,
    X,
    Save,
    Info,
    Settings,
    Barcode,
    History,
    TrendingUp,
    TrendingDown,
    Clock,
    ImageIcon,
    Upload,
    Eye,
    AlertTriangle,
    DollarSign,
    Truck,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Category {
    id: string
    name: string
}

interface BusinessCategory {
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
    businessCategoryId: string | null
    businessCategory: BusinessCategory | null
    businessCategories: BusinessCategory[]
    image: string | null
    skus: ProductSKU[]
}

interface PriceHistory {
    id: string
    type: "PURCHASE" | "SALE"
    oldPrice: number
    newPrice: number
    changeReason: string | null
    createdAt: string
}

const inputClass =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const textareaClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"

function Field({
    label,
    required,
    children,
    className = "",
}: {
    label: string
    required?: boolean
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-muted-foreground">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            {children}
        </div>
    )
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
            {active ? "Active" : "Inactive"}
        </span>
    )
}

function Tabs<T extends string>({
    tabs,
    value,
    onChange,
}: {
    tabs: { value: T; label: string; icon?: React.ReactNode }[]
    value: T
    onChange: (value: T) => void
}) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    type="button"
                    onClick={() => onChange(tab.value)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                        value === tab.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

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
        setExpandedProducts((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>("")
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])

    useEffect(() => {
        fetchProducts()
        fetchBusinessCategories()
    }, [selectedBusinessCategoryId])

    const fetchBusinessCategories = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`)
            const data = await res.json()
            setBusinessCategories(data)
        } catch (error) {
            console.error("Error fetching business categories:", error)
        }
    }

    const fetchProducts = async () => {
        try {
            const url = selectedBusinessCategoryId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/products?businessCategoryId=${selectedBusinessCategoryId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/products`
            const res = await fetch(url)
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}`, { method: "DELETE" })
            fetchProducts()
        } catch (error) {
            console.error("Error deleting product:", error)
        }
    }

    const filteredProducts = Array.isArray(products)
        ? products.filter(
              (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.skus &&
                      p.skus.some(
                          (sku) =>
                              sku.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (sku.barcode && sku.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
                      )) ||
                  (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : []

    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/management">
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                                <ChevronLeft size={16} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">Products</h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Product catalog, pricing and stock levels
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleCreate} className="h-9 rounded-lg px-4 text-sm font-medium">
                        <Plus size={16} className="mr-1.5" />
                        New product
                    </Button>
                </header>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Search name, code or barcode"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={selectedBusinessCategoryId}
                        onChange={(e) => setSelectedBusinessCategoryId(e.target.value)}
                        className={`${inputClass} cursor-pointer sm:w-52`}
                    >
                        <option value="">All business units</option>
                        {businessCategories.map((biz) => (
                            <option key={biz.id} value={biz.id}>
                                {biz.name}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                        {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                    </span>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                                            <th className="w-10 px-3 py-2.5" />
                                            <th className="px-3 py-2.5 font-medium">Product</th>
                                            <th className="px-3 py-2.5 font-medium">Business unit</th>
                                            <th className="px-3 py-2.5 font-medium">Type</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Stock value</th>
                                            <th className="px-3 py-2.5 font-medium">Status</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredProducts.map((p) => {
                                            const isExpanded = expandedProducts.has(p.id)
                                            const totalStock = p.skus?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0
                                            const hasLowStock = p.skus?.some((s) => s.stock <= s.minStock)
                                            const stockValue =
                                                p.skus?.reduce(
                                                    (sum, s) => sum + (s.stock || 0) * (s.purchasePrice || 0),
                                                    0
                                                ) || 0

                                            return (
                                                <React.Fragment key={p.id}>
                                                    <tr
                                                        className={`group transition-colors ${
                                                            isExpanded ? "bg-muted/30" : "hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <td className="px-3 py-2.5 align-middle">
                                                            <button
                                                                onClick={() => toggleExpand(p.id)}
                                                                aria-label={isExpanded ? "Collapse variants" : "Expand variants"}
                                                                className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
                                                                    isExpanded ? "bg-muted text-foreground" : ""
                                                                }`}
                                                            >
                                                                <ChevronRight
                                                                    size={14}
                                                                    className="transition-transform"
                                                                    style={{
                                                                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                                                    }}
                                                                />
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() =>
                                                                        p.image &&
                                                                        setEnlargedImage(
                                                                            `${process.env.NEXT_PUBLIC_API_URL}${p.image}`
                                                                        )
                                                                    }
                                                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground ${
                                                                        p.image ? "cursor-zoom-in" : ""
                                                                    }`}
                                                                >
                                                                    {p.image ? (
                                                                        <img
                                                                            src={`${process.env.NEXT_PUBLIC_API_URL}${p.image}`}
                                                                            alt={p.name}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Box size={16} />
                                                                    )}
                                                                </button>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-foreground">
                                                                        {p.name}
                                                                    </p>
                                                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                                        {p.code}
                                                                        <span className="ml-2 font-sans">
                                                                            {p.skus?.length || 0} variant
                                                                            {(p.skus?.length || 0) !== 1 ? "s" : ""}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex flex-wrap gap-1">
                                                                {p.businessCategories && p.businessCategories.length > 0 ? (
                                                                    p.businessCategories.map((biz) => (
                                                                        <Badge
                                                                            key={biz.id}
                                                                            variant="outline"
                                                                            className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                                                        >
                                                                            {biz.name}
                                                                        </Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex flex-col items-start gap-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-border px-1.5 py-0 text-[10px] font-medium text-foreground"
                                                                >
                                                                    {p.type}
                                                                </Badge>
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                    <Tag size={10} />
                                                                    {p.category?.name || "Uncategorized"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {hasLowStock && (
                                                                    <span title="Low stock" className="text-amber-500">
                                                                        <AlertTriangle size={12} />
                                                                    </span>
                                                                )}
                                                                <span className="text-sm font-medium tabular-nums text-foreground">
                                                                    {totalStock.toLocaleString()}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {p.skus?.[0]?.unit?.name || "pcs"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-sm tabular-nums text-foreground">
                                                                Rp {stockValue.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <StatusPill active={!!p.skus?.some((s) => s.isActive)} />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Button
                                                                    onClick={() => handleView(p)}
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="View details"
                                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                >
                                                                    <Eye size={15} />
                                                                </Button>
                                                                <Button
                                                                    onClick={() => handleEdit(p)}
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Edit product"
                                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                >
                                                                    <Edit size={15} />
                                                                </Button>
                                                                <Button
                                                                    onClick={() => handleDelete(p.id)}
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Delete product"
                                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr className="bg-muted/20">
                                                            <td colSpan={8} className="px-3 pb-4 pt-0">
                                                                <div className="overflow-hidden rounded-lg border border-border bg-background">
                                                                    <table className="w-full text-left text-sm">
                                                                        <thead>
                                                                            <tr className="border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground">
                                                                                <th className="px-3 py-2 font-medium">Variant</th>
                                                                                <th className="px-3 py-2 text-right font-medium">
                                                                                    Sale price
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-medium">
                                                                                    Cost
                                                                                </th>
                                                                                <th className="px-3 py-2 text-right font-medium">
                                                                                    Stock
                                                                                </th>
                                                                                <th className="px-3 py-2 font-medium">Location</th>
                                                                                <th className="px-3 py-2 text-right font-medium">
                                                                                    Status
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-border">
                                                                            {(p.skus || []).map((sku, skuIdx) => (
                                                                                <tr key={sku.id || skuIdx}>
                                                                                    <td className="px-3 py-2">
                                                                                        <p className="font-mono text-[11px] text-muted-foreground">
                                                                                            {sku.code}
                                                                                        </p>
                                                                                        <p className="text-[13px] text-foreground">
                                                                                            {sku.name || (
                                                                                                <span className="italic text-muted-foreground">
                                                                                                    Unnamed variant
                                                                                                </span>
                                                                                            )}
                                                                                        </p>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                                                                        Rp{" "}
                                                                                        {(sku.salePrice || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                                                        Rp{" "}
                                                                                        {(sku.purchasePrice || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right">
                                                                                        <span
                                                                                            className={`tabular-nums ${
                                                                                                sku.stock <= sku.minStock
                                                                                                    ? "font-medium text-rose-600 dark:text-rose-400"
                                                                                                    : "text-foreground"
                                                                                            }`}
                                                                                        >
                                                                                            {sku.stock}
                                                                                        </span>{" "}
                                                                                        <span className="text-[11px] text-muted-foreground">
                                                                                            {sku.unit?.name || "pcs"}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-[11px] uppercase text-muted-foreground">
                                                                                        {sku.stockLocation || "—"}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right">
                                                                                        <StatusPill active={sku.isActive} />
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                    {(p.skus || []).length === 0 && (
                                                                        <p className="px-3 py-4 text-xs text-muted-foreground">
                                                                            No variants defined.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid grid-cols-1 gap-3 lg:hidden">
                            {filteredProducts.map((p) => {
                                const totalStock = p.skus?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0
                                const isExpanded = expandedProducts.has(p.id)
                                const stockValue =
                                    p.skus?.reduce((sum, s) => sum + (s.stock || 0) * (s.purchasePrice || 0), 0) || 0
                                return (
                                    <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                                        <div className="flex gap-3 p-3">
                                            <button
                                                onClick={() =>
                                                    p.image &&
                                                    setEnlargedImage(`${process.env.NEXT_PUBLIC_API_URL}${p.image}`)
                                                }
                                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground"
                                            >
                                                {p.image ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_API_URL}${p.image}`}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Box size={18} />
                                                )}
                                            </button>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                        {p.code}
                                                    </p>
                                                    <StatusPill active={!!p.skus?.some((s) => s.isActive)} />
                                                </div>
                                                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                    {p.type} · {p.category?.name || "Uncategorized"}
                                                </p>
                                                <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                                                    <span>
                                                        Stock{" "}
                                                        <span className="font-medium text-foreground">
                                                            {totalStock}
                                                        </span>
                                                    </span>
                                                    <span>
                                                        Value{" "}
                                                        <span className="font-medium text-foreground">
                                                            Rp {stockValue.toLocaleString()}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    onClick={() => handleView(p)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <Eye size={14} className="mr-1.5" /> View
                                                </Button>
                                                <Button
                                                    onClick={() => handleEdit(p)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit size={14} className="mr-1.5" /> Edit
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    onClick={() => toggleExpand(p.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Show variants"
                                                    className={`h-8 w-8 rounded-md ${
                                                        isExpanded
                                                            ? "bg-muted text-foreground"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                >
                                                    <Package size={14} />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(p.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden border-t border-border bg-muted/20"
                                                >
                                                    <div className="space-y-2 p-3">
                                                        {(p.skus || []).map((sku, sidx) => (
                                                            <div
                                                                key={sku.id || sidx}
                                                                className="rounded-lg border border-border bg-background p-2.5"
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className="font-mono text-[10px] text-muted-foreground">
                                                                            {sku.code}
                                                                        </p>
                                                                        <p className="truncate text-xs font-medium text-foreground">
                                                                            {sku.name || "Unnamed variant"}
                                                                        </p>
                                                                    </div>
                                                                    <span
                                                                        className={`flex-shrink-0 text-[11px] tabular-nums ${
                                                                            sku.stock <= sku.minStock
                                                                                ? "text-rose-600 dark:text-rose-400"
                                                                                : "text-muted-foreground"
                                                                        }`}
                                                                    >
                                                                        {sku.stock} {sku.unit?.name || "pcs"}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]">
                                                                    <span className="text-muted-foreground">
                                                                        Sale{" "}
                                                                        <span className="font-medium text-foreground">
                                                                            Rp {(sku.salePrice || 0).toLocaleString()}
                                                                        </span>
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        Cost{" "}
                                                                        <span className="font-medium text-foreground">
                                                                            Rp{" "}
                                                                            {(sku.purchasePrice || 0).toLocaleString()}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(p.skus || []).length === 0 && (
                                                            <p className="py-2 text-center text-xs text-muted-foreground">
                                                                No variants defined.
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Box size={22} />
                        </div>
                        <p className="text-sm font-medium text-foreground">No products found</p>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {searchQuery
                                ? "Try adjusting your search or filter to find what you are looking for."
                                : "Your catalog is empty. Add your first product to get started."}
                        </p>
                        <Button onClick={handleCreate} className="mt-5 h-9 rounded-lg px-4 text-sm font-medium">
                            <Plus size={16} className="mr-1.5" />
                            Add product
                        </Button>
                    </div>
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

            <ImageLightbox imageUrl={enlargedImage} onClose={() => setEnlargedImage(null)} />
        </div>
    )
}

function ProductViewModal({
    isOpen,
    onClose,
    product,
    onEnlargeImage,
}: {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    onEnlargeImage: (url: string) => void
}) {
    const [activeTab, setActiveTab] = useState<"DETAILS" | "HISTORY">("DETAILS")
    const [history, setHistory] = useState<PriceHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        if (product && activeTab === "HISTORY") {
            fetchHistory(product.id)
        }
    }, [product, activeTab])

    useEffect(() => {
        if (isOpen) setActiveTab("DETAILS")
    }, [isOpen])

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}/price-history`)
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
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
                                    {product.image ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL}${product.image}`}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Package size={16} />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-sm font-semibold text-foreground">{product.name}</h2>
                                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                                        {product.code}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:block">
                                    <Tabs
                                        value={activeTab}
                                        onChange={setActiveTab}
                                        tabs={[
                                            {
                                                value: "DETAILS",
                                                label: "Details",
                                                icon: <Info size={13} />,
                                            },
                                            {
                                                value: "HISTORY",
                                                label: "Price history",
                                                icon: <History size={13} />,
                                            },
                                        ]}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        </header>

                        <div className="border-b border-border p-2 sm:hidden">
                            <div className="grid grid-cols-2 gap-1">
                                {(["DETAILS", "HISTORY"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`h-8 rounded-md text-xs font-medium transition-colors ${
                                            activeTab === tab
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {tab === "DETAILS" ? "Details" : "Price history"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                            <AnimatePresence mode="wait">
                                {activeTab === "DETAILS" ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="grid grid-cols-1 gap-5 sm:grid-cols-[140px_1fr]"
                                    >
                                        <div className="space-y-3">
                                            <button
                                                onClick={() =>
                                                    product.image &&
                                                    onEnlargeImage(
                                                        `${process.env.NEXT_PUBLIC_API_URL}${product.image}`
                                                    )
                                                }
                                                className={`flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground ${
                                                    product.image ? "cursor-zoom-in" : ""
                                                }`}
                                            >
                                                {product.image ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_API_URL}${product.image}`}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <Package size={32} />
                                                )}
                                            </button>
                                            <div className="rounded-lg border border-border p-2.5 text-xs">
                                                <p className="text-muted-foreground">Type</p>
                                                <p className="mt-0.5 font-medium text-foreground">{product.type}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                                    {product.name}
                                                </h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                    <span>{product.brand || "No brand"}</span>
                                                    <span className="h-1 w-1 rounded-full bg-border" />
                                                    <span>{product.category?.name || "Uncategorized"}</span>
                                                </div>
                                                <div className="mt-2.5 flex flex-wrap gap-1">
                                                    {product.businessCategories &&
                                                    product.businessCategories.length > 0 ? (
                                                        product.businessCategories.map((biz) => (
                                                            <Badge
                                                                key={biz.id}
                                                                variant="outline"
                                                                className="border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                                                            >
                                                                {biz.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            No business unit
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="text-xs font-medium text-muted-foreground">
                                                    Variants ({product.skus?.length || 0})
                                                </h4>
                                                {product.skus && product.skus.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {product.skus.map((sku, index) => (
                                                            <div
                                                                key={sku.id || index}
                                                                className="rounded-lg border border-border p-3"
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex min-w-0 items-center gap-2">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="border-border bg-muted/50 px-1.5 py-0 font-mono text-[10px] font-medium text-muted-foreground"
                                                                        >
                                                                            {sku.code}
                                                                        </Badge>
                                                                        {sku.barcode && (
                                                                            <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex">
                                                                                <Barcode size={11} />
                                                                                {sku.barcode}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <StatusPill active={sku.isActive} />
                                                                </div>

                                                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            Sale price
                                                                        </p>
                                                                        <p className="text-sm font-medium tabular-nums text-foreground">
                                                                            Rp{" "}
                                                                            {(sku.salePrice || 0).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            Purchase price
                                                                        </p>
                                                                        <p className="text-sm font-medium tabular-nums text-foreground">
                                                                            Rp{" "}
                                                                            {(sku.purchasePrice || 0).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            Stock
                                                                        </p>
                                                                        <p
                                                                            className={`text-sm font-medium tabular-nums ${
                                                                                sku.stock <= sku.minStock
                                                                                    ? "text-rose-600 dark:text-rose-400"
                                                                                    : "text-foreground"
                                                                            }`}
                                                                        >
                                                                            {sku.stock}{" "}
                                                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                                                {sku.unit?.name || "pcs"}
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            Location
                                                                        </p>
                                                                        <p className="truncate text-sm font-medium uppercase text-foreground">
                                                                            {sku.stockLocation || "—"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {(sku.specifications || sku.usage) && (
                                                                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
                                                                        {sku.specifications && (
                                                                            <div>
                                                                                <p className="text-[10px] text-muted-foreground">
                                                                                    Specifications
                                                                                </p>
                                                                                <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                                                                                    {sku.specifications}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {sku.usage && (
                                                                            <div>
                                                                                <p className="text-[10px] text-muted-foreground">
                                                                                    Usage
                                                                                </p>
                                                                                <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                                                                                    {sku.usage}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground">
                                                        <Package size={24} />
                                                        <p className="mt-2 text-xs">No variants defined</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-foreground">Price history</h3>
                                            <span className="text-xs text-muted-foreground">
                                                {history.length} {history.length === 1 ? "entry" : "entries"}
                                            </span>
                                        </div>

                                        {loadingHistory ? (
                                            <div className="flex items-center justify-center py-16">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                            </div>
                                        ) : history.length > 0 ? (
                                            <div className="space-y-2">
                                                {history.map((log) => {
                                                    const isIncrease = log.newPrice > log.oldPrice
                                                    return (
                                                        <div
                                                            key={log.id}
                                                            className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                                                        log.type === "SALE"
                                                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                                                    }`}
                                                                >
                                                                    {log.type === "SALE" ? (
                                                                        <DollarSign size={16} />
                                                                    ) : (
                                                                        <Truck size={16} />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                        <span className="font-medium text-foreground">
                                                                            {log.type === "SALE" ? "Sale" : "Purchase"}
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Clock size={10} />
                                                                            {new Date(
                                                                                log.createdAt
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-0.5 flex items-center gap-2">
                                                                        <span className="text-sm font-medium tabular-nums text-foreground">
                                                                            Rp {log.newPrice.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[11px] text-muted-foreground line-through">
                                                                            Rp {log.oldPrice.toLocaleString()}
                                                                        </span>
                                                                        <span
                                                                            className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                                                                                isIncrease
                                                                                    ? "text-rose-600 dark:text-rose-400"
                                                                                    : "text-emerald-600 dark:text-emerald-400"
                                                                            }`}
                                                                        >
                                                                            {isIncrease ? (
                                                                                <TrendingUp size={11} />
                                                                            ) : (
                                                                                <TrendingDown size={11} />
                                                                            )}
                                                                            {Math.abs(
                                                                                ((log.newPrice - log.oldPrice) /
                                                                                    log.oldPrice) *
                                                                                    100
                                                                            ).toFixed(1)}
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="sm:text-right">
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    Reason
                                                                </p>
                                                                <p className="text-xs text-foreground">
                                                                    {log.changeReason || "System adjustment"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-muted-foreground">
                                                <History size={24} />
                                                <p className="mt-2 text-xs">No price history recorded</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <footer className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                Close
                            </Button>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function ImageLightbox({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
    return (
        <AnimatePresence>
            {imageUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 cursor-zoom-out bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
                        >
                            <X size={16} />
                        </Button>
                        <img
                            src={imageUrl}
                            alt="Enlarged product"
                            className="max-h-[85vh] max-w-[90vw] object-contain"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function ProductModal({
    isOpen,
    onClose,
    product,
    onSuccess,
    onEnlargeImage,
}: {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    onSuccess: () => void
    onEnlargeImage: (url: string) => void
}) {
    const [activeTab, setActiveTab] = useState<"DETAILS" | "HISTORY">("DETAILS")
    const [history, setHistory] = useState<PriceHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedSkuIndex, setSelectedSkuIndex] = useState(0)
    const [categories, setCategories] = useState<Category[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([])

    const getNewSku = (productCode?: string, index?: number, unitData?: Unit[]): ProductSKU => {
        const defaultUnitId =
            unitData?.find((u) => u.name.toLowerCase() === "pcs")?.id || (units.length > 0 ? units[0].id : "")
        const autoCode = productCode ? `${productCode}-SKU-${String((index || 0) + 1).padStart(3, "0")}` : ""
        return {
            code: autoCode,
            name: "",
            unitId: defaultUnitId,
            purchaseUnitId: defaultUnitId,
            purchasePrice: 0,
            salePrice: 0,
            stock: 0,
            minStock: 0,
            stockLocation: "",
            usage: "",
            specifications: "",
            barcode: autoCode,
            weight: 0,
            isActive: true,
        }
    }

    const [formData, setFormData] = useState<Partial<Product>>({
        code: "",
        name: "",
        brand: "",
        type: "GOODS",
        categoryId: "",
        businessCategoryId: "",
        skus: [],
    })

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (!isOpen) return
        setSelectedSkuIndex(0)
        setActiveTab("DETAILS")
        if (product) {
            setFormData({
                code: product.code,
                name: product.name,
                brand: product.brand || "",
                type: product.type,
                categoryId: product.categoryId || "",
                businessCategoryId: product.businessCategoryId || "",
                businessCategories: product.businessCategories || [],
                skus: product.skus ? [...product.skus] : [],
            })
            setImagePreview(product.image ? `${process.env.NEXT_PUBLIC_API_URL}${product.image}` : null)
            setImageFile(null)
        } else {
            const autoCode = `PROD-${Date.now().toString().slice(-6)}`
            setFormData({
                code: autoCode,
                name: "",
                brand: "",
                type: "GOODS",
                categoryId: categories[0]?.id || "",
                businessCategoryId: "",
                businessCategories: [],
                skus: [getNewSku(autoCode, 0)],
            })
            setImagePreview(null)
            setImageFile(null)
        }
    }, [isOpen, product])

    useEffect(() => {
        if (!isOpen || product || units.length === 0) return
        const defaultUnitId = units.find((u) => u.name.toLowerCase() === "pcs")?.id || units[0].id
        setFormData((prev) => {
            const skus = prev.skus || []
            if (skus.some((s) => s.unitId)) return prev
            return {
                ...prev,
                skus: skus.map((s) =>
                    s.unitId ? s : { ...s, unitId: defaultUnitId, purchaseUnitId: defaultUnitId }
                ),
            }
        })
    }, [isOpen, product, units])

    const fetchOptions = async () => {
        try {
            const [catRes, unitRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/units`),
            ])
            const [catData, unitData, bizData] = await Promise.all([
                catRes.json(),
                unitRes.json(),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business-categories`).then((r) => r.json()),
            ])
            setCategories(catData)
            setUnits(unitData)
            setBusinessCategories(bizData)
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}/price-history`)
            const data = await res.json()
            setHistory(data)
        } catch (error) {
            console.error("Error fetching price history:", error)
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        if (product && isOpen && activeTab === "HISTORY") {
            fetchHistory(product.id)
        }
    }, [product, isOpen, activeTab])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const skus = formData.skus || []
        if (!formData.name?.trim()) {
            alert("Product name is required")
            return
        }
        if (!formData.code?.trim()) {
            alert("Internal code is required")
            return
        }
        if (skus.length === 0) {
            alert("Add at least one SKU variant")
            return
        }
        if (skus.some((s) => !s.code?.trim() || !s.name?.trim())) {
            alert("Every SKU requires a variant name and code")
            return
        }
        if (!(formData.businessCategories || []).length) {
            alert("Select at least one business unit")
            return
        }

        const method = product ? "PUT" : "POST"
        const url = product
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/products/${product.id}`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/products`

        const formDataPayload = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (
                ["category", "unit", "purchaseUnit", "priceHistory", "businessCategory", "businessCategories"].includes(
                    key
                )
            )
                return
            if (key === "image" && imageFile) return
            if (key === "skus") {
                formDataPayload.append(key, JSON.stringify(value || []))
                return
            }
            if (value !== null && value !== undefined) {
                formDataPayload.append(key, value.toString())
            }
        })

        if (imageFile) {
            formDataPayload.append("image", imageFile)
        }

        const businessCategoryIds = formData.businessCategories?.map((b) => b.id).filter(Boolean) || []
        formDataPayload.append("businessCategoryIds", JSON.stringify(businessCategoryIds))

        try {
            const res = await fetch(url, {
                method,
                body: formDataPayload,
            })
            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                let errorData: { message?: string } = {}
                try {
                    errorData = await res.json()
                } catch {
                    errorData = { message: res.statusText || "Request failed" }
                }
                console.error("Save failed:", errorData)
                alert(`Error: ${errorData.message || "Unknown error"}`)
            }
        } catch (error) {
            console.error("Network error saving product:", error)
            alert("Network error. Please check your connection.")
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-2xl"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                                    <Settings size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {product ? "Edit product" : "New product"}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground">
                                        {product ? "Update product details" : "Add a product to your catalog"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {product && (
                                    <div className="hidden sm:block">
                                        <Tabs
                                            value={activeTab}
                                            onChange={setActiveTab}
                                            tabs={[
                                                {
                                                    value: "DETAILS",
                                                    label: "Details",
                                                    icon: <Info size={13} />,
                                                },
                                                {
                                                    value: "HISTORY",
                                                    label: "Price history",
                                                    icon: <History size={13} />,
                                                },
                                            ]}
                                        />
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        </header>

                        {product && (
                            <div className="border-b border-border p-2 sm:hidden">
                                <div className="grid grid-cols-2 gap-1">
                                    {(["DETAILS", "HISTORY"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`h-8 rounded-md text-xs font-medium transition-colors ${
                                                activeTab === tab
                                                    ? "bg-muted text-foreground"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {tab === "DETAILS" ? "Details" : "Price history"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                            <AnimatePresence mode="wait">
                                {activeTab === "DETAILS" ? (
                                    <motion.form
                                        id="product-form"
                                        key="details"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-6"
                                    >
                                        <section className="space-y-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    General information
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Basic identity and classification of the product
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
                                                <div className="space-y-1.5">
                                                    <span className="block text-xs font-medium text-muted-foreground">
                                                        Image
                                                    </span>
                                                    <input
                                                        id="product-image-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageChange}
                                                    />
                                                    <label
                                                        htmlFor="product-image-upload"
                                                        className="group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50"
                                                    >
                                                        {imagePreview ? (
                                                            <>
                                                                <img
                                                                    src={imagePreview}
                                                                    alt="Preview"
                                                                    className="h-full w-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            onEnlargeImage(imagePreview)
                                                                        }}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                                                                    >
                                                                        <Search size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            document
                                                                                .getElementById(
                                                                                    "product-image-upload"
                                                                                )
                                                                                ?.click()
                                                                        }}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                                                                    >
                                                                        <Upload size={15} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <ImageIcon size={22} />
                                                                <span className="text-[10px]">Upload</span>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <Field label="Internal code" required>
                                                        <input
                                                            required
                                                            value={formData.code || ""}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, code: e.target.value })
                                                            }
                                                            className={`${inputClass} font-mono uppercase`}
                                                        />
                                                    </Field>
                                                    <Field label="Product name" required>
                                                        <input
                                                            required
                                                            value={formData.name || ""}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, name: e.target.value })
                                                            }
                                                            placeholder="e.g. Server maintenance package"
                                                            className={inputClass}
                                                        />
                                                    </Field>
                                                    <Field label="Brand">
                                                        <input
                                                            value={formData.brand || ""}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, brand: e.target.value })
                                                            }
                                                            placeholder="e.g. Dell, Cisco"
                                                            className={inputClass}
                                                        />
                                                    </Field>
                                                    <Field label="Type" required>
                                                        <select
                                                            value={formData.type || "GOODS"}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, type: e.target.value })
                                                            }
                                                            className={`${inputClass} cursor-pointer`}
                                                        >
                                                            <option value="GOODS">Goods (stockable)</option>
                                                            <option value="SERVICE">Service (non-stock)</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Category" className="sm:col-span-2">
                                                        <select
                                                            value={formData.categoryId || ""}
                                                            onChange={(e) =>
                                                                setFormData({ ...formData, categoryId: e.target.value })
                                                            }
                                                            className={`${inputClass} cursor-pointer`}
                                                        >
                                                            <option value="">Select category</option>
                                                            {categories.map((cat) => (
                                                                <option key={cat.id} value={cat.id}>
                                                                    {cat.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                </div>
                                            </div>

                                            <Field label="Business units" required>
                                                <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                                                    {businessCategories.length === 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            No business units available
                                                        </span>
                                                    )}
                                                    {businessCategories.map((biz) => {
                                                        const isSelected = formData.businessCategories?.some(
                                                            (b) => b.id === biz.id
                                                        )
                                                        return (
                                                            <button
                                                                key={biz.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = formData.businessCategories || []
                                                                    const next = isSelected
                                                                        ? current.filter((b) => b.id !== biz.id)
                                                                        : [...current, biz]
                                                                    setFormData({ ...formData, businessCategories: next })
                                                                }}
                                                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                                                                    isSelected
                                                                        ? "border-primary bg-primary text-primary-foreground"
                                                                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                {isSelected && <Check size={11} />}
                                                                {biz.name}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </Field>
                                        </section>

                                        <section className="space-y-4 border-t border-border pt-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground">
                                                        Variants (SKUs)
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Pricing, stock and specification per variant
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const currentSkus = formData.skus || []
                                                        const newSku = getNewSku(
                                                            formData.code || "PROD",
                                                            currentSkus.length
                                                        )
                                                        const newSkus = [...currentSkus, newSku]
                                                        setFormData({ ...formData, skus: newSkus })
                                                        setSelectedSkuIndex(newSkus.length - 1)
                                                    }}
                                                    className="h-8 rounded-lg px-3 text-xs font-medium"
                                                >
                                                    <Plus size={14} className="mr-1" />
                                                    Add variant
                                                </Button>
                                            </div>

                                            {(formData.skus || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(formData.skus || []).map((sku, idx) => (
                                                        <div key={idx} className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedSkuIndex(idx)}
                                                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                                                    selectedSkuIndex === idx
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                {sku.name || sku.code || `SKU ${idx + 1}`}
                                                            </button>
                                                            {(formData.skus || []).length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = (formData.skus || []).filter(
                                                                            (_, i) => i !== idx
                                                                        )
                                                                        setFormData({ ...formData, skus: updated })
                                                                        setSelectedSkuIndex(
                                                                            Math.max(0, selectedSkuIndex - 1)
                                                                        )
                                                                    }}
                                                                    className="-ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-rose-600"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {(formData.skus || []).length > 0 &&
                                                (() => {
                                                    const sku = ((formData.skus || [])[selectedSkuIndex] ||
                                                        {}) as ProductSKU
                                                    const updateSku = (updates: Partial<ProductSKU>) => {
                                                        const updated = [...(formData.skus || [])]
                                                        updated[selectedSkuIndex] = {
                                                            ...updated[selectedSkuIndex],
                                                            ...updates,
                                                        } as ProductSKU
                                                        setFormData({ ...formData, skus: updated })
                                                    }
                                                    return (
                                                        <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
                                                            <Field label="Variant name" required>
                                                                <input
                                                                    required
                                                                    value={(sku as ProductSKU).name || ""}
                                                                    onChange={(e) =>
                                                                        updateSku({ name: e.target.value })
                                                                    }
                                                                    placeholder={`e.g. ${formData.name || "Switch hub"} 5 port`}
                                                                    className={inputClass}
                                                                />
                                                            </Field>

                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                                <Field label="SKU code" required>
                                                                    <input
                                                                        required
                                                                        value={sku.code || ""}
                                                                        onChange={(e) =>
                                                                            updateSku({
                                                                                code: e.target.value.toUpperCase(),
                                                                            })
                                                                        }
                                                                        placeholder="e.g. SKU-001-BLK-L"
                                                                        className={`${inputClass} font-mono uppercase`}
                                                                    />
                                                                </Field>
                                                                <Field label="Barcode / EAN">
                                                                    <input
                                                                        value={(sku as ProductSKU).barcode || ""}
                                                                        onChange={(e) =>
                                                                            updateSku({ barcode: e.target.value })
                                                                        }
                                                                        placeholder="Scan or enter barcode"
                                                                        className={`${inputClass} font-mono`}
                                                                    />
                                                                </Field>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                                                <Field label="Purchase price (Rp)">
                                                                    <input
                                                                        type="number"
                                                                        value={(sku as ProductSKU).purchasePrice ?? 0}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value)
                                                                            updateSku({
                                                                                purchasePrice: isNaN(v) ? 0 : v,
                                                                            })
                                                                        }}
                                                                        className={inputClass}
                                                                    />
                                                                </Field>
                                                                <Field label="Sale price (Rp)">
                                                                    <input
                                                                        type="number"
                                                                        value={(sku as ProductSKU).salePrice ?? 0}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value)
                                                                            updateSku({
                                                                                salePrice: isNaN(v) ? 0 : v,
                                                                            })
                                                                        }}
                                                                        className={inputClass}
                                                                    />
                                                                </Field>
                                                                <Field label="Base unit">
                                                                    <select
                                                                        value={(sku as ProductSKU).unitId || ""}
                                                                        onChange={(e) =>
                                                                            updateSku({ unitId: e.target.value })
                                                                        }
                                                                        className={`${inputClass} cursor-pointer`}
                                                                    >
                                                                        <option value="">Select unit</option>
                                                                        {units.map((u) => (
                                                                            <option key={u.id} value={u.id}>
                                                                                {u.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </Field>
                                                                <Field label="Purchase unit">
                                                                    <select
                                                                        value={
                                                                            (sku as ProductSKU).purchaseUnitId || ""
                                                                        }
                                                                        onChange={(e) =>
                                                                            updateSku({
                                                                                purchaseUnitId: e.target.value,
                                                                            })
                                                                        }
                                                                        className={`${inputClass} cursor-pointer`}
                                                                    >
                                                                        <option value="">Select unit</option>
                                                                        {units.map((u) => (
                                                                            <option key={u.id} value={u.id}>
                                                                                {u.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </Field>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                                                <Field label="Current stock">
                                                                    <input
                                                                        type="number"
                                                                        value={(sku as ProductSKU).stock ?? 0}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value)
                                                                            updateSku({
                                                                                stock: isNaN(v) ? 0 : v,
                                                                            })
                                                                        }}
                                                                        className={inputClass}
                                                                    />
                                                                </Field>
                                                                <Field label="Min. stock level">
                                                                    <input
                                                                        type="number"
                                                                        value={(sku as ProductSKU).minStock ?? 0}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value)
                                                                            updateSku({
                                                                                minStock: isNaN(v) ? 0 : v,
                                                                            })
                                                                        }}
                                                                        className={inputClass}
                                                                    />
                                                                </Field>
                                                                <Field label="Stock location">
                                                                    <input
                                                                        value={(sku as ProductSKU).stockLocation || ""}
                                                                        onChange={(e) =>
                                                                            updateSku({
                                                                                stockLocation: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder="e.g. Warehouse A-12"
                                                                        className={`${inputClass} uppercase`}
                                                                    />
                                                                </Field>
                                                                <Field label="Weight (kg)">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={(sku as ProductSKU).weight ?? 0}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value)
                                                                            updateSku({
                                                                                weight: isNaN(v) ? 0 : v,
                                                                            })
                                                                        }}
                                                                        className={inputClass}
                                                                    />
                                                                </Field>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                                <Field label="Specifications">
                                                                    <textarea
                                                                        rows={3}
                                                                        value={
                                                                            (sku as ProductSKU).specifications || ""
                                                                        }
                                                                        onChange={(e) =>
                                                                            updateSku({
                                                                                specifications: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder="Technical details..."
                                                                        className={textareaClass}
                                                                    />
                                                                </Field>
                                                                <Field label="Usage details">
                                                                    <textarea
                                                                        rows={3}
                                                                        value={(sku as ProductSKU).usage || ""}
                                                                        onChange={(e) =>
                                                                            updateSku({ usage: e.target.value })
                                                                        }
                                                                        placeholder="Standard operating procedures..."
                                                                        className={textareaClass}
                                                                    />
                                                                </Field>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                                                <div>
                                                                    <p className="text-xs font-medium text-foreground">
                                                                        Active variant
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        Show this variant in sales and inventory
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateSku({
                                                                            isActive: !(sku as ProductSKU).isActive,
                                                                        })
                                                                    }
                                                                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                                                                        (sku as ProductSKU).isActive
                                                                            ? "bg-primary"
                                                                            : "bg-muted-foreground/30"
                                                                    }`}
                                                                >
                                                                    <motion.span
                                                                        animate={{
                                                                            x: (sku as ProductSKU).isActive ? 22 : 2,
                                                                        }}
                                                                        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}

                                            {(formData.skus || []).length === 0 && (
                                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground">
                                                    <Package size={24} />
                                                    <p className="mt-2 text-xs">
                                                        Add a variant to define pricing and stock
                                                    </p>
                                                </div>
                                            )}
                                        </section>
                                    </motion.form>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-foreground">Price history</h3>
                                            <span className="text-xs text-muted-foreground">
                                                {history.length} {history.length === 1 ? "entry" : "entries"}
                                            </span>
                                        </div>

                                        {loadingHistory ? (
                                            <div className="flex items-center justify-center py-16">
                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                                            </div>
                                        ) : history.length > 0 ? (
                                            <div className="space-y-2">
                                                {history.map((log) => {
                                                    const isIncrease = log.newPrice > log.oldPrice
                                                    return (
                                                        <div
                                                            key={log.id}
                                                            className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                                                        log.type === "SALE"
                                                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                                                    }`}
                                                                >
                                                                    {log.type === "SALE" ? (
                                                                        <DollarSign size={16} />
                                                                    ) : (
                                                                        <Truck size={16} />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                        <span className="font-medium text-foreground">
                                                                            {log.type === "SALE" ? "Sale" : "Purchase"}
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Clock size={10} />
                                                                            {new Date(
                                                                                log.createdAt
                                                                            ).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-0.5 flex items-center gap-2">
                                                                        <span className="text-sm font-medium tabular-nums text-foreground">
                                                                            Rp {log.newPrice.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[11px] text-muted-foreground line-through">
                                                                            Rp {log.oldPrice.toLocaleString()}
                                                                        </span>
                                                                        <span
                                                                            className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                                                                                isIncrease
                                                                                    ? "text-rose-600 dark:text-rose-400"
                                                                                    : "text-emerald-600 dark:text-emerald-400"
                                                                            }`}
                                                                        >
                                                                            {isIncrease ? (
                                                                                <TrendingUp size={11} />
                                                                            ) : (
                                                                                <TrendingDown size={11} />
                                                                            )}
                                                                            {Math.abs(
                                                                                ((log.newPrice - log.oldPrice) /
                                                                                    log.oldPrice) *
                                                                                    100
                                                                            ).toFixed(1)}
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="sm:text-right">
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    Reason
                                                                </p>
                                                                <p className="text-xs text-foreground">
                                                                    {log.changeReason || "System adjustment"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-muted-foreground">
                                                <History size={24} />
                                                <p className="mt-2 text-xs">No price history recorded</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="h-9 rounded-lg px-4 text-sm font-medium"
                            >
                                Cancel
                            </Button>
                            {activeTab === "DETAILS" && (
                                <Button
                                    type="submit"
                                    form="product-form"
                                    className="h-9 rounded-lg px-4 text-sm font-medium"
                                >
                                    <Save size={15} className="mr-1.5" />
                                    {product ? "Save changes" : "Create product"}
                                </Button>
                            )}
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
