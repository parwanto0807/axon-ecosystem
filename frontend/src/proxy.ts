import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

/**
 * Proxy (Next.js 16, sebelumnya "middleware") — keamanan + auth.
 *
 * Tanggung jawab:
 *  - E1.1 Redirect HTTP → HTTPS.
 *  - E1.6 Konsolidasi www → apex (satu arah).
 *  - Proteksi /dashboard/* dengan NextAuth (perilaku lama dipertahankan).
 *
 * Redirect hanya aktif di production dan hanya untuk hostname yang
 * dikonfigurasi, sehingga `next dev` / `next start` di localhost aman.
 *
 * Feature flag:
 *  - AXON_SECURITY_REDIRECTS=off  → matikan seluruh redirect transport.
 *  - AXON_CANONICAL_HOST=domain   → domain apex kanonik.
 */

const CANONICAL_HOST = (
  process.env.AXON_CANONICAL_HOST || "axon-ecosystem.id"
).trim().toLowerCase();

const WWW_HOST = `www.${CANONICAL_HOST}`;

const REDIRECTS_ENABLED =
  process.env.AXON_SECURITY_REDIRECTS !== "off" &&
  process.env.NODE_ENV === "production";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

function normalizeHost(value: string | null): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/:\d+$/, "");
}

function resolveProto(request: NextRequest): string {
  // Cloudflare meneruskan skema visitor lewat X-Forwarded-Proto.
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim().toLowerCase();
  return request.nextUrl.protocol.replace(":", "").toLowerCase();
}

/**
 * Kembalikan response redirect bila request perlu dipindah ke
 * https://<apex>, atau null bila tidak.
 */
function securityRedirect(request: NextRequest): NextResponse | null {
  if (!REDIRECTS_ENABLED) return null;

  const host = normalizeHost(
    request.headers.get("host") || request.nextUrl.hostname,
  );

  if (host !== CANONICAL_HOST && host !== WWW_HOST) return null;

  const needsHttps = resolveProto(request) !== "https";
  const needsApex = host === WWW_HOST;

  if (!needsHttps && !needsApex) return null;

  // Bangun URL absolut tanpa membawa port internal (mis. :3999) atau host www.
  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    `https://${CANONICAL_HOST}`,
  );

  // 301 untuk GET/HEAD (sesuai acceptance PRD E1.1); 308 untuk metode lain
  // agar body & method tidak hilang saat redirect.
  const isReadOnly = request.method === "GET" || request.method === "HEAD";
  return NextResponse.redirect(target, isReadOnly ? 301 : 308);
}

function isProtectedPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const redirect = securityRedirect(request);
  if (redirect) return redirect;

  if (isProtectedPath(request.nextUrl.pathname)) {
    // withAuth mengharapkan NextRequestWithAuth (menambahkan properti `nextauth`);
    // proxy ini tidak membaca `nextauth`, jadi cast aman dan perilaku tetap sama.
    return authMiddleware(
      request as Parameters<typeof authMiddleware>[0],
      event,
    );
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Jalankan untuk semua route kecuali aset statis Next, file PWA, dan
   * file publik yang tidak perlu redirect.
   */
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|favicon.svg|icons/|manifest.json|sw.js|workbox-|swe-worker).*)",
  ],
};
