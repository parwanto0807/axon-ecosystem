"use client"

import { useEffect, useRef } from "react"

type EmpMarker = {
    id: string
    name: string
    position: string | null
    latestPing: {
        latitude: number
        longitude: number
        accuracy: number | null
        reportedAt: string
        isManual: boolean
    } | null
}

interface LiveMapProps {
    employees: EmpMarker[]
    selectedId: string | null
    onSelect: (id: string) => void
}

function timeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Baru saja'
    if (diffMin < 60) return `${diffMin} menit lalu`
    return `${Math.floor(diffMin / 60)} jam lalu`
}

export default function LiveMap({ employees, selectedId, onSelect }: LiveMapProps) {
    const mapRef = useRef<any>(null)
    const markersRef = useRef<Record<string, any>>({})
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (typeof window === 'undefined' || !containerRef.current) return

        // Inject Leaflet CSS once
        if (!document.querySelector('#leaflet-css')) {
            const link = document.createElement('link')
            link.id = 'leaflet-css'
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            document.head.appendChild(link)
        }

        // Guard: if container already has a Leaflet map, destroy it first
        const container = containerRef.current as any
        if (container._leaflet_id) {
            mapRef.current?.remove()
            mapRef.current = null
        }

        import('leaflet').then(L => {
            if (!containerRef.current) return

            // Double-check after async import
            const c = containerRef.current as any
            if (c._leaflet_id) return

            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
            })

            const map = L.map(containerRef.current!, {
                center: [-2.5, 118],
                zoom: 5,
                zoomControl: true,
                attributionControl: false
            })

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map)

            mapRef.current = map
        })

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [])

    // Update markers when employees change
    useEffect(() => {
        if (!mapRef.current) return
        import('leaflet').then(L => {
            const map = mapRef.current

            // Remove old markers
            Object.values(markersRef.current).forEach((m: any) => m.remove())
            markersRef.current = {}

            const bounds: [number, number][] = []

            employees.forEach(emp => {
                if (!emp.latestPing) return
                const { latitude: lat, longitude: lng, reportedAt, isManual } = emp.latestPing

                const isSelected = emp.id === selectedId
                const diffMin = (Date.now() - new Date(reportedAt).getTime()) / 60000
                const statusColor = diffMin <= 35 ? '#10b981' : diffMin <= 90 ? '#f59e0b' : '#ef4444'

                const iconHtml = `
                    <div style="
                        position: relative;
                        width: 40px;
                        height: 40px;
                    ">
                        <div style="
                            position: absolute;
                            inset: 0;
                            background: ${isSelected ? '#4f46e5' : statusColor};
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            border: 3px solid white;
                        "></div>
                        <div style="
                            position: absolute;
                            inset: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 900;
                            font-size: 13px;
                            color: white;
                            transform: rotate(0deg);
                            padding-bottom: 4px;
                        ">${emp.name[0]}</div>
                        ${isManual ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid white;"></div>' : ''}
                    </div>
                `

                const icon = L.divIcon({
                    html: iconHtml,
                    className: '',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
                    popupAnchor: [0, -44]
                })

                const marker = L.marker([lat, lng], { icon })
                    .addTo(map)
                    .bindPopup(`
                        <div style="font-family: system-ui; min-width: 150px; padding: 4px;">
                            <p style="font-weight: 900; font-size: 13px; margin: 0 0 4px 0; text-transform: uppercase;">${emp.name}</p>
                            <p style="font-size: 10px; color: #64748b; margin: 0 0 6px 0;">${emp.position || 'Staff'}</p>
                            <p style="font-size: 10px; font-weight: 700; color: ${statusColor};">📍 ${timeAgo(reportedAt)}</p>
                            ${isManual ? '<p style="font-size:9px;color:#ef4444;margin-top:4px;">🔴 Manual Request</p>' : '<p style="font-size:9px;color:#6366f1;margin-top:4px;">🔵 Auto Tracking</p>'}
                        </div>
                    `)

                marker.on('click', () => onSelect(emp.id))
                markersRef.current[emp.id] = marker
                bounds.push([lat, lng])
            })

            // Fit map to show all markers
            if (bounds.length > 0) {
                if (bounds.length === 1) {
                    map.setView(bounds[0], 14)
                } else {
                    map.fitBounds(bounds, { padding: [60, 60] })
                }
            }
        })
    }, [employees, selectedId, onSelect])

    // Fly to selected employee only when selectedId CHANGED
    const lastSelectedId = useRef<string | null>(null)
    useEffect(() => {
        if (!mapRef.current || !selectedId) {
            lastSelectedId.current = selectedId
            return
        }

        // Only fly if selection actually changed
        if (selectedId !== lastSelectedId.current) {
            const emp = employees.find(e => e.id === selectedId)
            if (emp?.latestPing) {
                mapRef.current.flyTo(
                    [emp.latestPing.latitude, emp.latestPing.longitude],
                    15,
                    { duration: 1.2 }
                )
                markersRef.current[selectedId]?.openPopup()
            }
        }
        
        lastSelectedId.current = selectedId
    }, [selectedId, employees])

    return (
        <div
            ref={containerRef}
            className="w-full h-full"
            style={{ zIndex: 0 }}
        />
    )
}
