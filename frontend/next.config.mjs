import withPWAInit from "@ducanh2912/next-pwa";
import { buildHeaderRules, resolveCspMode } from "./security-headers.mjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP default report-only; ubah lewat env CSP_MODE=enforce setelah masa
 * observasi (PRD E1.3). HSTS hanya dikirim di production.
 */
const cspMode = resolveCspMode();

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'solusiit.id',
      },
    ],
  },
  async headers() {
    return buildHeaderRules({ isDev, cspMode });
  },
};

export default withPWA(nextConfig);
