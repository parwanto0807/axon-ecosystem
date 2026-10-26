"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { LanguageProvider } from "@/context/LanguageContext"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { PWAInstallPrompt } from "./PWAInstallPrompt"
import { PWAFloatingButton } from "./PWAFloatingButton"
import { usePWA } from "@/hooks/usePWA"
import { useUIStore } from "@/store/uiStore"

function PWALogic() {
    usePWA()
    return (
        <>
            <PWAInstallPrompt />
            <PWAFloatingButton />
        </>
    )
}

function GlobalBlurWrapper({ children }: { children: React.ReactNode }) {
    const { shouldBlurBackground } = useUIStore()
    return (
        <div className={`transition-all duration-700 ease-in-out ${shouldBlurBackground ? "blur-[15px] opacity-20 pointer-events-none scale-[0.98]" : ""}`}>
            {children}
        </div>
    )
}

function ActivityPulse() {
    const { data: session } = useSession()
    const userId = session?.user?.id

    useEffect(() => {
        if (!userId) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        if (!apiUrl) return

        const sessionPulseKey = `axon_pulse_${userId}`
        if (sessionStorage.getItem(sessionPulseKey)) return

        let cancelled = false

        const recordPulse = async () => {
            try {
                const res = await fetch(`${apiUrl}/api/auth/activity-pulse`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                })
                if (res.ok && !cancelled) {
                    sessionStorage.setItem(sessionPulseKey, 'true')
                }
            } catch {
                // API unreachable (e.g. backend offline) — non-critical, ignore
            }
        }

        recordPulse()

        return () => { cancelled = true }
    }, [userId])

    return null
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <ActivityPulse />
                <LanguageProvider>
                    <PWALogic />
                    <GlobalBlurWrapper>
                        {children}
                    </GlobalBlurWrapper>
                </LanguageProvider>
            </SessionProvider>
        </QueryClientProvider>
    )
}
