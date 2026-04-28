"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`
const AUTO_INTERVAL_MS = 30 * 60 * 1000   // 30 minutes auto ping
const POLL_INTERVAL_MS = 60 * 1000        // 1 minute — check for manual ping request

/**
 * Silent background location tracker.
 * - Resolves the linked employeeId from the logged-in userId
 * - Auto-sends GPS every 30 minutes (backend validates work hours)
 * - Polls every 1 minute for Super Admin manual ping request
 * - No UI shown to the employee — fully silent
 */
export function useLocationTracker() {
    const { data: session } = useSession()
    const [employeeId, setEmployeeId] = useState<string | null>(null)
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastPingRef = useRef<number>(0)

    const userId = (session?.user as any)?.id
    const userRole = (session?.user as any)?.role

    // Hanya melacak role OPERATIONAL secara eksklusif
    const shouldTrack = !!session && userRole === 'OPERATIONAL'

    // Resolve the linked employee for this user
    useEffect(() => {
        if (!userId || !shouldTrack) return
        
        fetch(`${API_BASE}/hr/employees/by-user/${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.id) setEmployeeId(data.id)
            })
            .catch(() => {})
    }, [userId, shouldTrack])

    const sendPing = (isManual: boolean = false) => {
        if (!employeeId || !navigator.geolocation) return

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await fetch(`${API_BASE}/location-tracking`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId,
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            isManual
                        })
                    })
                    const data = await res.json()
                    if (data.blocked) {
                        console.warn('[LocationTracker] Ping blocked by server:', data.reason)
                    } else {
                        console.log('[LocationTracker] Ping sent successfully')
                    }
                } catch (e) {
                    console.error('[LocationTracker] Error sending ping:', e)
                }
            },
            (err) => { 
                console.error('[LocationTracker] GPS error:', err.message)
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
    }

    const checkManualRequest = async () => {
        if (!employeeId) return
        try {
            const res = await fetch(`${API_BASE}/location-tracking/check-request/${employeeId}`)
            if (!res.ok) return
            const data = await res.json()
            if (data.pingRequested) {
                sendPing(true)
            }
        } catch {
            // Silent
        }
    }

    const pingAndSchedule = () => {
        lastPingRef.current = Date.now()
        sendPing(false)
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
        autoTimerRef.current = setTimeout(pingAndSchedule, AUTO_INTERVAL_MS)
    }

    useEffect(() => {
        if (!shouldTrack || !employeeId) return

        // 1. Initial Ping on mount (1 second delay)
        const initDelay = setTimeout(() => pingAndSchedule(), 1000)

        // 2. Poll for manual request every 1 minute
        pollTimerRef.current = setInterval(() => checkManualRequest(), POLL_INTERVAL_MS)

        // 3. Handle App Visibility (Resumed from minimize/background)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const timeSinceLastPing = Date.now() - lastPingRef.current
                
                // Jika aplikasi dibuka ulang dan sudah lewat 5 menit dari ping terakhir, 
                // kirim ping sekarang juga dan reset timer 30 menit.
                // (Cooldown 5 menit mencegah spam jika user keluar-masuk aplikasi dengan cepat)
                if (timeSinceLastPing > 5 * 60 * 1000) {
                    console.log('[LocationTracker] App opened, resetting 30m timer and sending ping.')
                    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
                    pingAndSchedule()
                }
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearTimeout(initDelay)
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldTrack, employeeId])
}
