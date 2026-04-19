"use client"

import { useState, useEffect } from "react"
import { useUIStore } from "@/store/uiStore"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const { setPWAInstallPromptActive, setShouldBlurBackground } = useUIStore()
    const { status } = useSession()
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        // 1. Device Detection & Redirection
        const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || (window.innerWidth <= 1024)

        if (isMobileOrTablet && pathname === "/" && status === "unauthenticated") {
            router.push("/login")
        }

        // 2. PWA Install Prompt handling
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault()
            setDeferredPrompt(e)
            
            // We no longer auto-trigger the blur/modal here to avoid annoying the user
            // Instead, we let the UI decide when to show the prompt based on 'isInstallable'
        }

        (window as any).addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        // 3. Handle successful installation
        const handleAppInstalled = () => {
            console.log("PWA was installed")
            setDeferredPrompt(null)
            setPWAInstallPromptActive(false)
            setShouldBlurBackground(false)
            
            // Attempt to close the window - best effort
            // Note: Browsers may block window.close() if the tab wasn't opened by script
            setTimeout(() => {
                window.close()
            }, 1000)
        }

        window.addEventListener("appinstalled", handleAppInstalled as any)

        // 4. Detect if already in standalone mode
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setDeferredPrompt(null)
            setPWAInstallPromptActive(false)
            setShouldBlurBackground(false)
        }

        return () => {
            (window as any).removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
            window.removeEventListener("appinstalled", handleAppInstalled as any)
        }
    }, [setPWAInstallPromptActive, setShouldBlurBackground])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === "accepted") {
            console.log("User accepted the PWA install")
            setDeferredPrompt(null)
        }
        
        setPWAInstallPromptActive(false)
        setShouldBlurBackground(false)
    }

    const handleDismiss = () => {
        setPWAInstallPromptActive(false)
        setShouldBlurBackground(false)
    }

    const showModal = () => {
        if (deferredPrompt) {
            setPWAInstallPromptActive(true)
            setShouldBlurBackground(true)
        }
    }

    return { 
        handleInstall, 
        handleDismiss, 
        showModal,
        isInstallable: !!deferredPrompt 
    }
}
