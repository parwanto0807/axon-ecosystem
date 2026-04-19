"use client"

import { SessionProvider } from "next-auth/react"
import { LanguageProvider } from "@/context/LanguageContext"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
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

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
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
