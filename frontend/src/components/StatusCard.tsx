"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatusCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    color: string
    trend?: string
}

export function StatusCard({ label, value, icon: Icon, color, trend }: StatusCardProps) {
    return (
        <motion.div whileHover={{ y: -4 }}>
            <Card className="glass-card relative overflow-hidden group border-border/50">
                <CardContent className="p-6">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] transition-opacity group-hover:opacity-[0.07]">
                        <Icon size={80} style={{ color }} />
                    </div>

                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 rounded-2xl bg-primary/10">
                            <Icon size={24} style={{ color }} />
                        </div>
                        <span className="text-muted-foreground text-sm font-medium">{label}</span>
                    </div>

                    <div className="flex items-end justify-between relative z-10">
                        <h3 className="text-3xl font-bold text-foreground leading-none">{value}</h3>
                        {trend && (
                            <span className="text-emerald-400 text-sm font-semibold bg-emerald-400/10 px-2 py-1 rounded-lg">
                                {trend}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
