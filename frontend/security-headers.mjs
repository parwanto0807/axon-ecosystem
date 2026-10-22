/**
 * Security header builder — Epic E1 (Transport & Header Security).
 *
 * Dipisahkan dari next.config.mjs supaya bisa diuji tanpa build Next.js
 * (lihat PRD §9 Test Plan: "header builder").
 *
 * Catatan CSP:
 * - `'unsafe-inline'` pada script-src/style-src masih diperlukan karena Next.js
 *   menyuntikkan inline bootstrap script dan aplikasi memakai inline style.
 *   Migrasi ke nonce-based CSP dibahas terpisah (follow-up E1).
 * - Cloudflare Insights diizinkan eksplisit agar RUM tidak putus (PRD E1.3).
 * - `upgrade-insecure-requests` hanya di production agar dev di http:// tidak rusak.
 */

export const CLOUDFLARE_INSIGHTS_SCRIPT = "https://static.cloudflareinsights.com";
export const CLOUDFLARE_INSIGHTS_COLLECT = "https://cloudflareinsights.com";

/** Host backend lokal yang dipakai next/image & axios saat development. */
const LOCAL_API = "http://localhost:5003";

/**
 * Mode CSP: "report-only" (default), "enforce", atau "off".
 * Default sengaja report-only — PRD E1.3 mewajibkan masa observasi 1 minggu.
 */
export function resolveCspMode(value = process.env.CSP_MODE) {
  const mode = (value ?? "report-only").trim().toLowerCase();
  return mode === "enforce" || mode === "off" ? mode : "report-only";
}

/**
 * Bangun nilai Content-Security-Policy.
 * @param {{ isDev?: boolean }} [options]
 */
export function buildCsp({ isDev = false } = {}) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      CLOUDFLARE_INSIGHTS_SCRIPT,
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      // Leaflet CSS dimuat dari unpkg (LiveMap).
      "https://unpkg.com",
    ],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      LOCAL_API,
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https:",
      CLOUDFLARE_INSIGHTS_COLLECT,
      LOCAL_API,
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // Google Maps embed + preview PDF lokal (blob:).
    "frame-src": ["'self'", "blob:", "https://maps.google.com", "https://www.google.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Cache-Control untuk halaman/endpoint yang tidak boleh di-cache (PRD E1.5). */
export const NO_STORE_VALUE = "no-store, max-age=0, must-revalidate";

/**
 * Header keamanan yang dipasang ke seluruh route.
 * @param {{ isDev?: boolean, cspMode?: string, enableHsts?: boolean }} [options]
 */
export function buildSecurityHeaders({
  isDev = false,
  cspMode = "report-only",
  enableHsts = !isDev,
} = {}) {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // camera & geolocation tetap diizinkan untuk origin sendiri karena dipakai
    // fitur presensi (face-api) dan location tracking.
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
    },
  ];

  if (cspMode !== "off") {
    headers.push({
      key:
        cspMode === "enforce"
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
      value: buildCsp({ isDev }),
    });
  }

  if (enableHsts) {
    // Belum memakai `preload` sesuai PRD E1.2 (tunggu semua subdomain HTTPS).
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}

/**
 * Aturan `headers()` lengkap untuk next.config.mjs.
 * Urutan penting: aturan no-store harus SETELAH header global agar
 * Cache-Control menimpa nilai default Next.js.
 */
export function buildHeaderRules({
  isDev = false,
  cspMode = "report-only",
  enableHsts = !isDev,
} = {}) {
  const noStore = { key: "Cache-Control", value: NO_STORE_VALUE };

  return [
    {
      source: "/:path*",
      headers: buildSecurityHeaders({ isDev, cspMode, enableHsts }),
    },
    // Halaman auth & area ber-sesi tidak boleh tersimpan di CDN/browser.
    { source: "/login", headers: [noStore] },
    { source: "/dashboard/:path*", headers: [noStore] },
    { source: "/invoice-print", headers: [noStore] },
    { source: "/api/auth/:path*", headers: [noStore] },
  ];
}
