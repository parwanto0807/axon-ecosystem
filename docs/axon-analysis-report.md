# Analisis Teknis — axon-ecosystem.id

**Tanggal:** 23 Oktober 2026
**Metode:** inspeksi langsung via browser (Chromium), Lighthouse, network capture, dan HTTP header check. Read-only, tanpa percobaan login.

---

## 1. Ringkasan

| Aspek | Nilai | Catatan |
|---|---|---|
| Stack | Next.js (App Router) + React + NextAuth | Cloudflare di depan origin |
| Lighthouse Accessibility | **88 / 100** | Contrast, heading order, landmark, target size |
| Lighthouse Best Practices | **100 / 100** | Tapi ada gap keamanan yang tidak terdeteksi Lighthouse |
| Lighthouse SEO | **100 / 100** | Skor bagus, tapi metadata masih lemah |
| Transfer halaman home | ~394 KB (32 request) | Dekoded ~1 MB |
| TTFB (cold, browser) | ~1,04 s | Warm fetch dari server: 112–197 ms |
| CLS | 0 | Bagus |
| Console errors | 0 | Bersih |

**Kesan umum:** app rapi secara visual dan teknis dasar (Next.js modern, TLS, cookie aman, tanpa error). Kelemahan utamanya bukan di UI, tapi di **hardening** (HTTPS tidak dipaksa, security headers kosong) dan **alur autentikasi** (tanpa lupa password/MFA, form GET).

---

## 2. Stack & Infrastruktur

- **Framework:** Next.js App Router (`/_next/static/...`, `?_rsc=`, `__NEXT_DATA__` tidak ada → App Router)
- **Auth:** NextAuth dengan provider **Credentials saja**
  - `/api/auth/providers` → `credentials`
  - `/api/auth/csrf` → mengembalikan token, set cookie `__Secure-next-auth.callback-url` (HttpOnly, Secure, SameSite=Lax) ✔
  - `/api/auth/session` → `{}` saat belum login ✔
- **CDN:** Cloudflare (SIN edge) + Cloudflare Insights RUM (`beacon.min.js`, `cdn-cgi/rum`)
- **CSS:** 2 file, ~118 KB transfer, pola utility mirip Tailwind
- **Font:** 2 file woff2 self-hosted (~80 KB decoded)
- **Gambar:** **0 tag `<img>`** — semua visual pakai CSS/SVG (bagus untuk performa)
- **PWA:** `manifest.json` valid, icon 192 & 512 tersedia ✔
- **Region edge:** Singapore (`cf-ray ...-SIN`)

---

## 3. Struktur Halaman

- `/` → landing page marketing **one-page** (nav Produk/Solusi/Harga/Tentang/FAQ = anchor)
- `/login` → portal login (panel marketing kiri + form kanan)
- Hanya 2 route publik yang ditautkan; tidak ada halaman legal (privacy/terms) yang bisa ditemukan
- `robots.txt` → **404**
- `sitemap.xml` → **404**
- Halaman 404 custom? Tidak; Next.js default

---

## 4. Performa

**Home (cold load):**
- 17 request script (code-splitting Next.js), 5 CSS/font
- Total transfer 394 KB; decoded ~1 MB
- TTFB 1.042 ms → DCL 1.554 ms → Load 1.914 ms
- CLS **0** ✔
- Tidak ada render-blocking image ✔

**Temuan:**
- HTML dikirim dengan `cache-control: s-maxage=31536000` **tetapi** `cf-cache-status: DYNAMIC` → HTML sebenarnya **tidak pernah di-cache di edge**. Setiap request masuk origin (~1 s cold).
- `/login` memuat bundle + panel marketing penuh: decoded ~1 MB hanya untuk halaman login.
- Home melakukan **prefetch `/login`** 4× (`?_rsc=...`) → wajar untuk Next.js, tapi menambah request di landing page.
- Warm fetch dari server 112–197 ms → masalah latency terutama di cold start/origin, bukan bandwidth.

---

## 5. SEO & Metadata

| Item | Status |
|---|---|
| `<html lang>` | ⚠️ `en` — padahal seluruh konten Indonesia |
| Title | `Axon Ecosystem Portal` (sama untuk `/` dan `/login`) |
| Meta description | ⚠️ `"Central monitoring and control hub for Axon applications"` — bahasa Inggris & tidak cocok dengan copy marketing |
| Open Graph / Twitter Card | ❌ Tidak ada (og:image, og:title, dll.) |
| Canonical | ❌ Tidak ada |
| robots.txt | ❌ 404 |
| sitemap.xml | ❌ 404 |
| Manifest theme_color | ⚠️ `#4f46e5` (indigo) — brand aktual teal/hijau |
| Login page | ⚠️ Ikut terindeks (tidak ada `noindex`) |

Dampak: preview saat dibagikan di WhatsApp/LinkedIn akan polos, dan mesin pencari melihat sinyal bahasa yang salah.

---

## 6. Aksesibilitas — 88/100

**Lolos:** heading utama jelas, form punya `autocomplete` benar (`username` / `current-password`), kontras sebagian besar baik, tanpa error console.

**Gagal:**
1. **Color contrast** — beberapa teks abu/sekunder di atas background terang tidak memenuhi rasio 4.5:1.
2. **Heading order** — di home ada lompatan `H2 → H4` (mis. section "Masih Ragu?" langsung ke pertanyaan FAQ `H4`).
3. **Landmark** — tidak ada elemen `<main>`; screen reader tidak bisa lompat ke konten utama.
4. **Target size** — beberapa tombol/link kecil (<24×24 px atau jarak antar-target kurang).

**Catatan login:**
- Hanya 2 input; label terlihat ada, tapi tidak ada `aria-label` eksplisit.
- Tidak ada tombol "show password".
- `lang="en"` membuat screen reader melafalkan teks Indonesia dengan fonetik Inggris.

---

## 7. Keamanan

### Prioritas tinggi

1. **HTTP tidak dialihkan ke HTTPS** ⚠️
   `http://axon-ecosystem.id/` mengembalikan **200 + halaman penuh**, bukan redirect 301. Artinya user yang mengetik `axon-ecosystem.id` tanpa `https://` bisa mengirim kredensial lewat koneksi plaintext (form action relatif `/login`).

2. **Tidak ada HSTS** ⚠️
   Tidak ada header `Strict-Transport-Security`, jadi browser tidak dipaksa pakai HTTPS pada kunjungan berikutnya.

3. **Security headers kosong** ⚠️
   Tidak ada: `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Portal login tanpa CSP/XFO lebih rentan clickjacking & XSS injection.

4. **Form login `method="GET"`, `action="/login"`, tanpa hidden CSRF token** ⚠️
   Kalau JavaScript gagal dimuat/diblokir, submit form akan mengirim **password di query string** (`/login?email=...&password=...`), yang bisa tersimpan di history, log server, dan Referer. Saat JS aktif, NextAuth tetap memakai POST + CSRF, jadi ini masalah *progressive enhancement*, bukan kebocoran langsung.

5. **Halaman auth di-cache 1 tahun di header** ⚠️
   `/login` mengirim `s-maxage=31536000`. Saat ini Cloudflare menandainya DYNAMIC (tidak di-cache), tapi kalau ada perubahan rule CDN, HTML berisi state auth bisa tersaji ke user lain. Halaman auth seharusnya `no-store`.

### Prioritas sedang

6. `X-Powered-By: Next.js` — information disclosure (kecil).
7. `www` dan non-`www` dua-duanya 200 tanpa redirect → duplikasi konten + potensi masalah cookie/SEO.
8. Tidak ada halaman `security.txt` (opsional).
9. Klaim **"ISO 27001 Certified"** dan **"AXON BIOMETRIC SECURITY V2.4"** di UI perlu dipastikan akurat — dari luar tidak terlihat adanya MFA/biometrik pada alur login.
10. **Rate limiting / lockout** tidak bisa diverifikasi dari luar; wajib dipastikan ada di sisi API.

### Yang sudah benar ✔
- TLS valid
- Cookie NextAuth: `__Secure-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`
- CSRF endpoint aktif
- Tidak ada secret/API key yang terlihat di bundle publik
- Tidak ada mixed content
- Tidak ada error console

---

## 8. UX Autentikasi

- ❌ Tidak ada **"Lupa password"**
- ❌ Tidak ada **"Ingat saya"**
- ❌ Tidak ada **registrasi/request access**
- ❌ Tidak ada link kontak/support di halaman login
- ⚠️ Placeholder email `nama@axon.com` — user eksternal bisa bingung
- ⚠️ Panel kiri memuat seluruh copy marketing → login terasa berat
- ✔️ Pesan "Akses hanya untuk personel yang berwenang" jelas
- ✔️ Dua kolom (branding + form) rapi dan konsisten

---

## 9. Rekomendasi Berurutan

**P0 — segera**
1. Cloudflare: aktifkan *Always Use HTTPS* + HSTS (`max-age=31536000; includeSubDomains; preload` setelah yakin).
2. Tambah security headers (CSP, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy) via `next.config` atau Cloudflare Transform Rules.
3. Ubah cache header `/login` & `/api/*` menjadi `no-store`.
4. Form login: `method="POST"` + hidden CSRF + tetap intercept di client.
5. Pastikan rate limiting + lockout di endpoint credentials.

**P1 — sprint berikut**
6. Alur **lupa password** (email reset) dan opsi MFA.
7. `lang="id"`, meta description Indonesia, canonical, OG/Twitter image.
8. `robots.txt` + `sitemap.xml`, `noindex` untuk `/login`.
9. Perbaiki kontras, tambah `<main>`, rapikan heading FAQ (`H3`).
10. Redirect `www` → apex (atau sebaliknya) secara permanen.

**P2 — polish**
11. Kurangi JS di halaman login (pisahkan layout marketing).
12. Hapus `X-Powered-By`.
13. Samakan `theme_color` manifest dengan brand.
14. Audit klaim ISO/biometric agar sesuai kenyataan.

---

## 10. Batasan Analisis

- Tidak ada percobaan login/brute force — temuan auth murni dari struktur publik.
- Rate limiting, MFA backend, dan kontrol server tidak bisa dipastikan dari luar.
- Tidak ada pengujian beban, penetration test, atau audit kode sumber.
- Skor Lighthouse hanya mengukur a11y/SEO/best-practices, bukan performance (performance diukur manual via Navigation Timing).
