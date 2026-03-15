"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductCardProps {
    name: string
    description: string
    icon: LucideIcon
    color: string
    features: string[]
    delay?: number
}

export function ProductCard({ name, description, icon: Icon, color, features, delay = 0 }: ProductCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
        >
            <Card className="glass-card hover:neon-border transition-all duration-500 h-full border-border/50 overflow-hidden group">
                <CardContent className="p-8">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500"
                        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                    >
                        <Icon size={28} style={{ color }} />
                    </div>

                    <h3 className="text-2xl font-black text-foreground mb-4 uppercase tracking-tight">{name}</h3>
                    <p className="text-muted-foreground text-sm font-medium mb-8 leading-relaxed">
                        {description}
                    </p>

                    <div className="space-y-4">
                        {features.map((feature, i) => (
                            <div key={i} className="flex gap-4 group/item">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 group-hover/item:scale-150 transition-transform" style={{ backgroundColor: color }} />
                                <span className="text-[11px] font-bold text-muted-foreground/80 group-hover/item:text-foreground transition-colors leading-relaxed tracking-wide">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-6 border-t border-border/50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                        <span className="text-xs font-bold text-foreground uppercase tracking-widest">Learn More</span>
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
