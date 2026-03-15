"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function MatrixTableWrapper({ children }: { children: React.ReactNode }) {
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="hidden md:block rounded-[3rem] border border-border shadow-xl overflow-hidden p-1 lg:p-4 bg-white transition-colors duration-300">{children}</div>
    }

    const isDark = resolvedTheme === 'dark' || theme === 'dark'

    return (
        <div className={`hidden md:block rounded-[3rem] border border-border shadow-xl overflow-hidden p-1 lg:p-4 transition-colors duration-300 ${isDark ? 'bg-slate-950 backdrop-blur-lg' : 'bg-white'
            }`}>
            {children}
        </div>
    )
}
