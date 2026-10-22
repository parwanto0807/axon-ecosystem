# E1 — Transport & Header Security: Implementasi

**Epic:** E1 (P0) — `axon-prd-perbaikan.md`
**Tanggal:** 23 Oktober 2026
**Status:** Selesai di level aplikasi. Sisa aksi ada di Cloudflare (lihat §4).

---

## 1. Perubahan Kode

| File | Perubahan |
|---|---|
| `frontend/security-headers.mjs` | **Baru.** Builder CSP + security headers + aturan cache, terpisah agar bisa diuji tanpa build. |
| `frontend/next.config.mjs` | Memakai builder header; `poweredByHeader: false`; aturan `Cache-Control: no-store` untuk `/login`, `/dashboard/*`, `/invoice-print`, `/api/auth/*`. |
| `frontend/src/proxy.ts` | Logika redirect HTTP→HTTPS + www→apex, **digabung** dengan proteksi NextAuth `/dashboard/*` yang sudah ada. |

Tidak ada perubahan pada database, API backend, atau data pengguna (sesuai prinsip Zero Data Loss).

### Pemetaan ke requirement

| Req | Status | Implementasi |
|---|---|---|
| E1.1 HTTP → HTTPS | ✅ (aplikasi) + perlu Cloudflare | `proxy.ts` cek `X-Forwarded-Proto`; `301` untuk GET/HEAD, `308` untuk metode lain. |
| E1.2 HSTS | ✅ | `Strict-Transport-Security: max-age=31536000; includeSubDomains` tanpa `preload`. |
| E1.3 Security headers | ✅ | CSP (Report-Only default), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy. |
| E1.4 Hapus `X-Powered-By` | ✅ | `poweredByHeader: false`. |
| E1.5 Cache halaman auth | ✅ | `Cache-Control: no-store, max-age=0, must-revalidate`. |
| E1.6 Konsolidasi www | ✅ (aplikasi) + perlu Cloudflare | `www.<apex>` → `301 https://<apex>/<path>`. |

---

## 2. Environment Variable

Tambahkan di environment produksi (jangan commit nilai rahasia):

| Variabel | Default | Keterangan |
|---|---|---|
| `AXON_CANONICAL_HOST` | `axon-ecosystem.id` | Domain apex kanonik. `www.` otomatis dianggap alias. |
| `AXON_SECURITY_REDIRECTS` | aktif di production | Set `off` untuk mematikan redirect transport tanpa rollback kode. |
| `CSP_MODE` | `report-only` | `report-only` → `enforce` setelah 7 hari tanpa pelanggaran kritis. `off` untuk mematikan CSP. |

Redirect **hanya** aktif saat `NODE_ENV=production` dan `Host` cocok dengan apex/www kanonik, sehingga `next dev` dan `next start` di `localhost` tidak terpengaruh.

---

## 3. Perilaku CSP

- `script-src` mengizinkan `'unsafe-inline'` (bootstrap Next.js) dan `https://static.cloudflareinsights.com`.
- `connect-src` mengizinkan `https://cloudflareinsights.com` (RUM) dan `https://` (API/tile/fetch eksternal).
- `style-src` mengizinkan `https://unpkg.com` (CSS Leaflet).
- `img-src` mengizinkan `https:`, `data:`, `blob:`, `http://localhost:5003`.
- `frame-src` mengizinkan Google Maps dan `blob:` (preview PDF).
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` mencegah clickjacking.
- `upgrade-insecure-requests` hanya di production.

**Deviasi dari PRD (disengaja):** PRD E1.3 menulis `camera=(), geolocation=()`. Nilai itu akan **mematikan** fitur presensi face-api dan location tracking. Implementasi memakai `camera=(self), geolocation=(self)` agar fitur tetap berjalan sementara origin lain tetap diblokir. Microphone tetap `()`.

---

## 4. Aksi di Cloudflare (wajib untuk E1.1/E1.2/E1.6 penuh)

1. **SSL/TLS → Overview:** mode minimal **Full (strict)**.
2. **SSL/TLS → Edge Certificates → Always Use HTTPS:** **ON** (edge-level, berlaku juga bila origin tidak menerima `X-Forwarded-Proto`).
3. **HSTS:** pilih **satu** sumber header.
   - Disarankan: biarkan aplikasi yang mengirim HSTS, **matikan** toggle HSTS Cloudflare agar tidak ada header ganda.
   - Jika ingin HSTS di level zone: matikan header dari aplikasi, lalu set Max-Age 12 bulan + Include subdomains, **tanpa** Preload.
4. **Rules → Redirect Rules:** buat rule `www` → apex
   - Jika `host` equals `www.axon-ecosystem.id` → Dynamic redirect `concat("https://axon-ecosystem.id", http.request.uri.path)`, status **301**, preserve query string.
   - Alternatif: hapus DNS record `www` (lebih berisiko untuk link lama) — tidak disarankan.
5. **Caching → Cache Rules (opsional, defense in depth):** bypass cache untuk `/login`, `/dashboard*`, `/api/auth/*`.
6. **Scrape Shield / Transform Rules:** pastikan tidak ada rule lain yang menimpa `Cache-Control` menjadi `s-maxage=31536000` untuk halaman HTML dinamis.

---

## 5. Verifikasi

### Otomatis (sudah dijalankan pada build production lokal)

| Uji | Hasil |
|---|---|
| `/login` → `Cache-Control: no-store` | ✅ |
| `/login` → tanpa `X-Powered-By` | ✅ |
| `/dashboard` tanpa sesi → `307 /login?callbackUrl=%2Fdashboard` | ✅ (auth lama tetap jalan) |
| `Host: www...` → `301 https://axon-ecosystem.id/login` | ✅ |
| `X-Forwarded-Proto: http` → `301 https://axon-ecosystem.id/...` | ✅ |
| `/_next/static/*` → `public, max-age=31536000, immutable` | ✅ (tidak tertimpa) |
| CSP terpasang sebagai `Report-Only` | ✅ |
| HSTS terpasang di production | ✅ |
| `npx tsc --noEmit` | ✅ |
| `next build` | ✅ |

### Setelah deploy

```bash
# 1. HTTP harus redirect
curl -I http://axon-ecosystem.id/login
# harap: 301 + Location: https://axon-ecosystem.id/login

# 2. www harus redirect ke apex
curl -I https://www.axon-ecosystem.id/
# harap: 301 + Location: https://axon-ecosystem.id/

# 3. Header keamanan
curl -sI https://axon-ecosystem.id/login | grep -Ei 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cache-control'

# 4. X-Powered-By harus hilang
curl -sI https://axon-ecosystem.id/ | grep -i powered-by   # tidak ada output

# 5. CDN tidak boleh meng-cache halaman auth
curl -sI https://axon-ecosystem.id/login | grep -i 'cf-cache-status'  # DYNAMIC/BYPASS, bukan HIT
```

Lalu buka DevTools → Console di `/`, `/login`, dan `/dashboard` untuk memastikan tidak ada pelanggaran CSP (`Report-Only` hanya memberi warning).

---

## 6. Rollback

| Skenario | Tindakan |
|---|---|
| CSP memblokir sesuatu | Set `CSP_MODE=off` lalu restart server (tanpa rebuild). |
| Redirect menyebabkan loop / host salah | Set `AXON_SECURITY_REDIRECTS=off` lalu restart server. |
| Perlu kembali ke perilaku lama | Revert 3 file di §1, deploy ulang. Tidak ada perubahan DB. |
| Cloudflare salah konfigurasi | Matikan Always Use HTTPS / Redirect Rule; aplikasi tetap menyajikan halaman via HTTPS langsung. |

---

## 7. Catatan & Follow-up

- **Next.js 16** mengganti konvensi `middleware.ts` menjadi `proxy.ts`. File lama `src/proxy.ts` (auth `withAuth`) dipertahankan fungsinya dan digabung, bukan dihapus.
- Cache `no-store` juga membuat Next.js tetap menyajikan HTML yang sudah diprerender dari cache internal (`x-nextjs-cache: HIT`), tetapi header ke browser/CDN tetap `no-store`. Ini aman karena `/login` tidak memuat state sesi.
- **Belum** memakai nonce-based CSP. Setelah `CSP_MODE=enforce` stabil, pertimbangkan migrasi ke nonce + `strict-dynamic` untuk menghapus `'unsafe-inline'`.
- Belum ada endpoint `report-uri`/`report-to`; pelanggaran CSP hanya terlihat di console. Jika ingin agregasi, tambahkan route kecil yang menerima laporan (tanpa menyimpan PII).
- `X-Robots-Tag: noindex` untuk `/login` dan metadata/SEO lain berada di **E3**, belum dikerjakan di E1.
- Dev server yang sedang berjalan perlu **restart** agar `next.config.mjs` dan `proxy.ts` baru aktif.
