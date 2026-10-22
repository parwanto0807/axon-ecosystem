"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Menampilkan dokumen A4 (lebar tetap 794px) agar selalu muat di layar,
 * termasuk di HP. Dokumen di-scale turun secara proporsional, bukan dipaksa
 * wrap — sehingga layout cetak tidak berubah.
 */
export function PdfPreview({
    children,
    width = 794,
    className = "",
}: {
    children: ReactNode
    width?: number
    className?: string
}) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [height, setHeight] = useState<number | undefined>(undefined)

    useEffect(() => {
        const wrap = wrapRef.current
        const inner = innerRef.current
        if (!wrap || !inner) return

        const update = () => {
            const available = wrap.clientWidth
            if (!available) return
            const next = Math.min(1, available / width)
            setScale(next)
            setHeight(inner.scrollHeight * next)
        }

        update()
        const ro = new ResizeObserver(update)
        ro.observe(wrap)
        ro.observe(inner)
        window.addEventListener("resize", update)

        return () => {
            ro.disconnect()
            window.removeEventListener("resize", update)
        }
    }, [width])

    return (
        <div ref={wrapRef} className={`w-full flex justify-center overflow-hidden ${className}`}>
            <div style={{ width: width * scale, height }}>
                <div
                    ref={innerRef}
                    style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                    {children}
                </div>
            </div>
        </div>
    )
}
