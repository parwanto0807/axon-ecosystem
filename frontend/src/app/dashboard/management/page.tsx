"use client"

import { motion } from "framer-motion"
import { Box, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

const managementModules = [
    {
        id: 'products',
        name: 'Master Product',
        description: 'Manage your IT services, hardware inventory, and standard ERP product data.',
        icon: Box,
        path: '/dashboard/management/products',
        color: '#6366f1'
    },
    {
        id: 'customers',
        name: 'Master Customer',
        description: 'Maintain detailed records of your clients, business contacts, and tax information.',
        icon: Users,
        path: '/dashboard/management/customers',
        color: '#22d3ee'
    },
    {
        id: 'assets',
        name: 'Master Assets',
        description: 'Manage customer units (AC, IT) for maintenance tracking and automated scheduling.',
        icon: Box,
        path: '/dashboard/management/assets',
        color: '#f59e0b'
    }
]

export default function ManagementPage() {
    return (
        <div className="p-8">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-foreground mb-4 tracking-tighter uppercase">
                    Company <span className="text-primary">Management</span>
                </h1>
                <p className="text-muted-foreground font-medium max-w-2xl">
                    Centralized hub for managing your core business assets. Streamline your service delivery and client relationships with standard ERP modules.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {managementModules.map((module, idx) => (
                    <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Link href={module.path}>
                            <Card className="glass-card group cursor-pointer hover:neon-border border-border/50 transition-all duration-300 overflow-hidden h-full">
                                <CardContent className="p-10 relative">
                                    <div
                                        className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-3xl"
                                        style={{ backgroundColor: module.color }}
                                    />

                                    <div className="flex items-start justify-between mb-8">
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3"
                                            style={{ backgroundColor: `${module.color}20`, color: module.color }}
                                        >
                                            <module.icon size={32} />
                                        </div>
                                        <ArrowRight size={24} className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                                    </div>

                                    <h2 className="text-2xl font-black text-foreground mb-4 uppercase tracking-tight">{module.name}</h2>
                                    <p className="text-muted-foreground font-medium leading-relaxed">{module.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
