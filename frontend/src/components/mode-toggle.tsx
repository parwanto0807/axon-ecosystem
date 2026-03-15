"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 bg-background/50 backdrop-blur-sm border border-border/50"
            >
                <Sun className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        )
    }

    const currentTheme = theme === "system" ? resolvedTheme : theme
    const isDark = currentTheme === "dark"

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="rounded-full w-10 h-10 bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-accent hover:text-accent-foreground transition-all"
        >
            {isDark ? (
                <Moon className="h-[1.2rem] w-[1.2rem] transition-transform duration-300 rotate-0" />
            ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] transition-transform duration-300 rotate-0" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
