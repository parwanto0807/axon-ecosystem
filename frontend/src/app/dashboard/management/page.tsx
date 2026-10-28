"use client"

import { motion } from "framer-motion"
import { Box, Users, ArrowRight, LayoutGrid } from "lucide-react"
import Link from "next/link"

const managementModules = [
    {
        id: "products",
        name: "Products",
        description: "Manage product master data, pricing, variants and stock levels.",
        icon: Box,
        path: "/dashboard/management/products",
    },
    {
        id: "customers",
        name: "Customers",
        description: "Maintain client records, contacts and financial terms.",
        icon: Users,
        path: "/dashboard/management/customers",
    },
    {
        id: "assets",
        name: "Assets",
        description: "Track customer units and maintenance schedules.",
        icon: Box,
        path: "/dashboard/management/assets",
    },
    {
        id: "business-categories",
        name: "Business Categories",
        description: "Organize data across multiple business units.",
        icon: LayoutGrid,
        path: "/dashboard/management/business-categories",
    },
]

export default function ManagementPage() {
    return (
        <div className="p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1440px]">
                <header className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Management</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Centralized master data for your business operations
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {managementModules.map((module, idx) => (
                        <motion.div
                            key={module.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Link href={module.path} className="group block h-full">
                                <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors group-hover:text-primary">
                                            <module.icon size={17} />
                                        </div>
                                        <ArrowRight
                                            size={16}
                                            className="text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                                        />
                                    </div>
                                    <h2 className="text-sm font-medium text-foreground">{module.name}</h2>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        {module.description}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
