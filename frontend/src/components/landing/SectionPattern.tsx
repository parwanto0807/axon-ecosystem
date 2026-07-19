"use client"

interface SectionPatternProps {
    variant: "hexagon" | "diamond" | "wave" | "rings" | "grid" | "radial" | "crosshatch"
    fadeDir?: "right" | "center" | "both"
    dark?: boolean
}

export function SectionPattern({ variant, fadeDir = "right", dark = false }: SectionPatternProps) {
    const lineColor = dark ? "rgba(255,255,255,0.06)" : "rgba(16,185,129,0.08)"

    const patterns: Record<string, { defs: React.ReactNode; fill: string }> = {
        hexagon: {
            defs: (
                <pattern id="p-hex" width="80" height="92" patternUnits="userSpaceOnUse">
                    <path d="M40 0L80 23v46L40 92 0 69V23z" fill="none" stroke={lineColor} strokeWidth="0.6" />
                    <path d="M40 0L0 23l40 23 40-23z" fill="none" stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.5" />
                </pattern>
            ),
            fill: "url(#p-hex)"
        },
        diamond: {
            defs: (
                <pattern id="p-dia" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M50 0l50 50-50 50L0 50z" fill="none" stroke={lineColor} strokeWidth="0.7" />
                    <path d="M50 0L0 50l50 50 50-50z" fill="none" stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.4" />
                </pattern>
            ),
            fill: "url(#p-dia)"
        },
        wave: {
            defs: (
                <pattern id="p-wave" width="200" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0 20 Q 25 0, 50 20 T 100 20 T 150 20 T 200 20" fill="none" stroke={lineColor} strokeWidth="0.7" />
                    <path d="M0 20 Q 25 40, 50 20 T 100 20 T 150 20 T 200 20" fill="none" stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.4" />
                </pattern>
            ),
            fill: "url(#p-wave)"
        },
        rings: {
            defs: (
                <pattern id="p-ring" width="120" height="120" patternUnits="userSpaceOnUse">
                    <circle cx="60" cy="60" r="45" fill="none" stroke={lineColor} strokeWidth="0.6" />
                    <circle cx="60" cy="60" r="30" fill="none" stroke={lineColor} strokeWidth="0.5" strokeOpacity="0.5" />
                    <circle cx="60" cy="60" r="15" fill="none" stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.3" />
                </pattern>
            ),
            fill: "url(#p-ring)"
        },
        grid: {
            defs: (
                <pattern id="p-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <rect width="60" height="60" fill="none" stroke={lineColor} strokeWidth="0.5" />
                    <line x1="30" y1="0" x2="30" y2="60" stroke={lineColor} strokeWidth="0.3" strokeOpacity="0.4" />
                    <line x1="0" y1="30" x2="60" y2="30" stroke={lineColor} strokeWidth="0.3" strokeOpacity="0.4" />
                </pattern>
            ),
            fill: "url(#p-grid)"
        },
        radial: {
            defs: (
                <pattern id="p-rad" width="100" height="100" patternUnits="userSpaceOnUse">
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = (i * 30 * Math.PI) / 180
                        const x2 = 50 + 45 * Math.cos(angle)
                        const y2 = 50 + 45 * Math.sin(angle)
                        return <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.5" />
                    })}
                    <circle cx="50" cy="50" r="8" fill="none" stroke={lineColor} strokeWidth="0.5" />
                </pattern>
            ),
            fill: "url(#p-rad)"
        },
        crosshatch: {
            defs: (
                <pattern id="p-cross" width="40" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="40" y2="40" stroke={lineColor} strokeWidth="0.5" />
                    <line x1="40" y1="0" x2="0" y2="40" stroke={lineColor} strokeWidth="0.4" strokeOpacity="0.5" />
                </pattern>
            ),
            fill: "url(#p-cross)"
        },
    }

    const p = patterns[variant]

    const fadeGradId = `fade-${variant}`
    const fadeStops = fadeDir === "center"
        ? (
            <>
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="35%" stopColor="white" stopOpacity="0.6" />
                <stop offset="50%" stopColor="white" stopOpacity="0.15" />
                <stop offset="65%" stopColor="white" stopOpacity="0" />
            </>
        )
        : fadeDir === "both"
            ? (
                <>
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="25%" stopColor="white" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.15" />
                    <stop offset="75%" stopColor="white" stopOpacity="0" />
                </>
            )
            : (
                <>
                    <stop offset="0%" stopColor="white" stopOpacity="0.7" />
                    <stop offset="40%" stopColor="white" stopOpacity="0.15" />
                    <stop offset="60%" stopColor="white" stopOpacity="0" />
                </>
            )

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                {p.defs}
                <mask id={fadeGradId}>
                    <rect width="100%" height="100%" fill={`url(#${fadeGradId}g)`} />
                </mask>
                <linearGradient id={`${fadeGradId}g`} x1="1" y1="0" x2="0" y2="0">
                    {fadeStops}
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill={p.fill} mask={`url(#${fadeGradId})`} />
        </svg>
    )
}
