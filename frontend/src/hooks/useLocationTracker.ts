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

    const userId = (session?.user as any)?.id
    const userRole = (session?.user as any)?.role

    // Super Admin is not tracked
    const shouldTrack = !!session && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN'

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
                    await fetch(`${API_BASE}/location-tracking`, {
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
                } catch {
                    // Silent — no error shown to user
                }
            },
            () => { /* GPS denied or unavailable — silent */ },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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

    useEffect(() => {
        if (!shouldTrack || !employeeId) return

        // Send first ping shortly after hook starts
        const initDelay = setTimeout(() => sendPing(false), 5000)

        // Auto ping every 30 minutes
        autoTimerRef.current = setInterval(() => sendPing(false), AUTO_INTERVAL_MS)

        // Poll for manual request every 1 minute
        pollTimerRef.current = setInterval(() => checkManualRequest(), POLL_INTERVAL_MS)

        return () => {
            clearTimeout(initDelay)
            if (autoTimerRef.current) clearInterval(autoTimerRef.current)
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldTrack, employeeId])
}
