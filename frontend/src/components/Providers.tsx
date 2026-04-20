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
    
    useEffect(() => {
        // Record activity once per browser session (tab open until closed)
        const recordPulse = async () => {
            if (session?.user?.id) {
                const sessionPulseKey = `axon_pulse_${session.user.id}`;
                const hasPulsed = sessionStorage.getItem(sessionPulseKey);
                
                if (!hasPulsed) {
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/activity-pulse`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: (session.user as any).id })
                        });
                        sessionStorage.setItem(sessionPulseKey, 'true');
                    } catch (e) {
                        console.error("[Pulse] Failed", e);
                    }
                }
            }
        };
        
        recordPulse();
    }, [session]);
    
    return null;
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
