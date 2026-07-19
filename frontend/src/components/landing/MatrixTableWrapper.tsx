"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function MatrixTableWrapper({ children }: { children: React.ReactNode }) {
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    if (!mounted) {
        return <div className="hidden md:block rounded-2xl border border-border overflow-hidden bg-card">{children}</div>
    }

    const isDark = resolvedTheme === 'dark' || theme === 'dark'

    return (
        <div className={`hidden md:block rounded-2xl border border-border overflow-hidden ${isDark ? 'bg-card' : 'bg-card'}`}>
            {children}
        </div>
    )
}
