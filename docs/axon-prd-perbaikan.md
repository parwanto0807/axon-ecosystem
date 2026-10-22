# PRD — Perbaikan Axon Ecosystem Portal

**Produk:** axon-ecosystem.id
**Dokumen:** Product Requirements Document (PRD) Perbaikan
**Versi:** 1.0
**Tanggal:** 23 Oktober 2026
**Basis temuan:** `axon-analysis-report.md` (audit teknis 23 Okt 2026)
**Prinsip utama:** **Zero Data Loss — tidak ada data yang dihapus, ditimpa, atau di-truncate dalam bentuk apa pun.**

---

## 1. Latar Belakang

Audit teknis menemukan bahwa Axon Ecosystem Portal sudah solid secara visual dan fungsional, namun memiliki gap pada:

- **Transport security** — HTTP tidak dialihkan ke HTTPS dan HSTS belum aktif.
- **HTTP security headers** — CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy belum ada.
- **Alur autentikasi** — belum ada lupa password, MFA, maupun proteksi brute force yang terverifikasi.
- **Metadata & aksesibilitas** — `lang` salah, tanpa OG image, robots/sitemap 404, skor a11y 88.
- **Performa halaman auth** — ±1 MB decoded asset dan cache header yang tidak tepat untuk halaman login.

Perbaikan ini **tidak boleh** mengorbankan data pengguna, data bisnis tenant, riwayat audit, maupun sesi yang sedang aktif.

---

## 2. Tujuan

### 2.1 Tujuan Bisnis
1. Meningkatkan kepercayaan enterprise terhadap portal (kesiapan audit ISO 27001 yang diklaim).
2. Menurunkan friction login (self-service reset password).
3. Meningkatkan visibilitas organik & kualitas share link.

### 2.2 Tujuan Teknis
1. 100% traffic melalui HTTPS dengan HSTS aktif.
2. Security header lengkap tanpa merusak analytics/asset.
3. Autentikasi tahan brute force + ada recovery mandiri.
4. Lighthouse accessibility ≥ 95, SEO tetap 100.
5. TTFB p75 < 800 ms untuk landing page.

### 2.3 Metrik Keberhasilan

| Metrik | Baseline | Target | Cara Ukur |
|---|---|---|---|
| HTTP → HTTPS redirect | 0% | 100% | `curl -I http://...` |
| Security headers terpasang | 0/5 | 5/5 | securityheaders.com / test otomatis |
| Login sukses (7 hari) | — | ≥ 98% | analytics auth |
| Reset password selesai | 0 | ≥ 80% dari yang mulai | funnel event |
| A11y score | 88 | ≥ 95 | Lighthouse CI |
| TTFB p75 landing | ~1.0 s | < 800 ms | RUM Cloudflare |
| Insiden kehilangan data | — | **0** | audit migrasi |
| Error rate API auth | — | < 0.5% | monitoring |

---

## 3. Prinsip & Batasan Wajib

### 3.1 Data Safety Rules (non-negotiable)

| # | Aturan |
|---|---|
| D1 | **Dilarang** `DROP`, `TRUNCATE`, `DELETE`, atau overwrite tabel/kolom/data existing. |
| D2 | Migrasi hanya **additive**: tambah tabel, tambah kolom nullable, tambah index. |
| D3 | Tidak ada rename/hapus kolom. Perubahan tipe data memakai kolom bayangan + dual-write. |
| D4 | Penghapusan logis memakai kolom `deleted_at` / `revoked_at`; **hard delete tidak diimplementasikan**. |
| D5 | Backfill harus **idempotent** dan bisa dijalankan ulang tanpa duplikasi. |
| D6 | Backup penuh + verifikasi restore **sebelum** migrasi produksi. |
| D7 | Row count & checksum tabel kritikal diverifikasi sebelum/sesudah migrasi. |
| D8 | Tidak ada password, token, atau PII mentah di log aplikasi. |
| D9 | Data lama tetap dapat dibaca aplikasi versi baru (backward compatible). |
| D10 | Token/sesi lama tidak dipaksa invalid; bila format cookie berubah, berlaku masa transisi dual-read. |

### 3.2 Definisi "Data"

Termasuk: akun user, data tenant/bisnis, transaksi, dokumen, riwayat audit, konfigurasi, file upload, dan metadata.

**Di luar cakupan larangan:** cache ephemeral (CDN cache, counter rate-limit di Redis) yang memang punya TTL dan bukan sumber kebenaran. TTL ini didokumentasikan terpisah dan tidak pernah menyentuh database utama.

### 3.3 Out of Scope
- Redesign visual menyeluruh.
- Perubahan model bisnis/harga.
- Migrasi database engine.
- Penghapusan fitur apa pun.
- Retensi/penghapusan log (hanya penambahan; arsip dingin dibahas terpisah dengan Legal).

---

## 4. Persona

| Persona | Kebutuhan |
|---|---|
| **Admin tenant** | Login aman, bisa reset password sendiri, tidak kehilangan data saat update. |
| **Staf operasional** | Login cepat, error jelas, bisa dipakai di HP. |
| **Tim Security/IT** | Header aman, audit trail utuh, bisa verifikasi kontrol. |
| **Manajemen** | Klaim kepatuhan akurat, brand tampil benar saat dibagikan. |
| **Tim Developer** | Perubahan bertahap, feature flag, rollback jelas. |

---

## 5. Scope Pekerjaan

### Epic Overview

| Epic | Nama | Prioritas | Estimasi |
|---|---|---|---|
| E1 | Transport & Header Security | P0 | 3–4 hari |
| E2 | Autentikasi & Recovery | P0 | 8–10 hari |
| E3 | Metadata, SEO & Brand Share | P1 | 2–3 hari |
| E4 | Aksesibilitas | P1 | 3–4 hari |
| E5 | Performa Halaman Auth | P2 | 3–5 hari |
| E6 | Observability & Runbook | P1 | 2–3 hari |

Total estimasi: **±5 minggu** (1 sprint cadangan untuk hardening & QA).

---

## 6. Requirements

### E1 — Transport & Header Security (P0)

**E1.1 Redirect HTTP → HTTPS**
- Semua request `http://` (apex & www) diarahkan `301` ke HTTPS pada path yang sama.
- Tidak ada halaman yang tersaji via HTTP, termasuk `/login`.
- **Acceptance:** `curl -I http://axon-ecosystem.id/login` → `301` + `Location: https://...`.

**E1.2 HSTS**
- Header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- `preload` **belum** diaktifkan sampai seluruh subdomain terverifikasi HTTPS.
- **Acceptance:** header muncul di semua response HTTPS; tidak ada mixed content.

**E1.3 Security Headers**
- `Content-Security-Policy` (mulai `Report-Only` 1 minggu, lalu enforce).
- `X-Frame-Options: DENY` + `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- CSP harus mengizinkan Cloudflare Insights & asset `/_next/*` agar analytics tidak putus.
- **Acceptance:** tidak ada pelanggaran CSP kritis di console; semua halaman utama render normal.

**E1.4 Hapus Information Disclosure**
- Hapus `X-Powered-By: Next.js`.

**E1.5 Cache Header Halaman Auth**
- `/login`, `/api/auth/*`, dan halaman ber-sesi: `Cache-Control: no-store`.
- Asset statis hashed tetap immutable.
- **Acceptance:** response `/login` tidak mengandung `s-maxage`; `cf-cache-status` bukan HIT.

**E1.6 Konsolidasi Domain**
- `www` → apex (atau sebaliknya) dengan `301` permanen, satu arah saja.
- **Acceptance:** hanya satu hostname yang menyajikan 200.

---

### E2 — Autentikasi & Recovery (P0)

**E2.1 Form Login Non-Destruktif & Aman**
- Ubah form menjadi `method="POST"` + hidden CSRF token, tetap di-intercept client.
- Tanpa JS: submit tetap aman dan tidak menaruh password di URL.
- **Acceptance:** submit dengan JS dimatikan tidak menghasilkan query string berisi password.

**E2.2 Rate Limiting & Lockout**
- Limit per IP + per akun (contoh: 5 gagal/15 menit → delay progresif; 10 gagal → lock sementara 15 menit).
- Counter disimpan di Redis dengan TTL (bukan tabel user).
- Pesan error generik (tidak membocorkan email terdaftar).
- **Acceptance:** percobaan ke-6 mendapat `429`; akun valid tidak terkunci permanen; admin bisa unblock.

**E2.3 Lupa Password (self-service)**
- Link "Lupa password?" di halaman login.
- Alur: input email → kirim token sekali pakai (masa berlaku 30 menit) → halaman set password baru → konfirmasi.
- Token disimpan **hashed**, dengan kolom `used_at`, `expires_at`, `revoked_at` (**tidak dihapus**).
- Respons selalu sama ("jika email terdaftar, link dikirim") untuk mencegah enumerasi.
- **Acceptance:** alur end-to-end berhasil; token tidak bisa dipakai 2×; token expired ditolak; tidak ada baris yang dihapus.

**E2.4 Keamanan Sesi**
- Sesi lama tetap valid saat rilis (tidak ada forced logout massal).
- Perubahan cookie (jika ada) memakai masa transisi dual-read.
- **Acceptance:** user yang login sebelum deploy tetap bisa lanjut tanpa login ulang.

**E2.5 MFA (Fase 2, opsional untuk rilis ini)**
- TOTP opsional untuk role admin, bisa diaktifkan per user.
- Tidak memaksa seluruh user sekaligus.
- **Acceptance:** user tanpa MFA tetap bisa login; enrollment tidak menghapus kredensial lama.

**E2.6 Audit Log Auth (append-only)**
- Catat login sukses/gagal, reset password, perubahan kredensial.
- Tidak menyimpan password/token mentah.
- **Acceptance:** event tercatat; tidak ada operasi update/delete pada tabel audit.

---

### E3 — Metadata, SEO & Brand Share (P1)

**E3.1 Bahasa**
- `lang="id"` pada seluruh halaman berbahasa Indonesia.

**E3.2 Metadata**
- Title per halaman (`Beranda`, `Masuk`), description Bahasa Indonesia yang relevan.
- Canonical untuk setiap halaman publik.

**E3.3 Open Graph & Twitter Card**
- `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:type`.
- `twitter:card=summary_large_image`.
- **Acceptance:** preview WhatsApp/LinkedIn menampilkan gambar & judul benar.

**E3.4 robots.txt & sitemap.xml**
- `robots.txt` valid; sitemap berisi halaman publik.
- `/login` diberi `noindex` namun tetap crawlable untuk kebutuhan internal? → **`noindex, nofollow`**.
- **Acceptance:** kedua endpoint 200 dengan content-type benar.

**E3.5 Brand Consistency**
- `theme_color` manifest disamakan dengan warna brand.
- Title login tidak identik dengan beranda.

---

### E4 — Aksesibilitas (P1)

**E4.1 Kontras Warna**
- Semua teks memenuhi WCAG AA (4.5:1 normal, 3:1 large).

**E4.2 Struktur Heading**
- Tidak ada lompatan level (FAQ `H4` → `H3`).
- Satu `H1` per halaman.

**E4.3 Landmark**
- Tambah `<main>`, `<nav>`, `<footer>` semantik; skip-link ke konten.

**E4.4 Target Sentuh**
- Target minimal 24×24 px efektif dengan spacing memadai.

**E4.5 Form**
- `aria-label`/`<label>` eksplisit, pesan error terhubung `aria-describedby`, fokus terlihat.
- Tombol show/hide password.

**Acceptance:** Lighthouse a11y ≥ 95; uji keyboard-only menyelesaikan alur login + reset.

---

### E5 — Performa Halaman Auth (P2)

**E5.1 Pisahkan Bundle Marketing**
- Halaman login tidak memuat seluruh komponen landing.
- Target decoded JS+CSS halaman login < 500 KB.

**E5.2 Optimasi Loading**
- Prefetch `/login` dibatasi (hanya saat idle/hover).
- Font `display: swap`, subset latin.

**E5.3 Cache Tuning**
- HTML dinamis: `no-store` atau `private, max-age=0, must-revalidate`.
- Static asset: `immutable, max-age=31536000`.

**Acceptance:** LCP login < 2.0 s pada 4G cepat; tidak ada penurunan skor SEO/a11y.

---

### E6 — Observability & Runbook (P1)

**E6.1 Monitoring**
- Alert untuk lonjakan 401/429/500, error CSP, dan kegagalan kirim email reset.
- Dashboard: login success rate, reset funnel, TTFB p75.

**E6.2 Logging Aman**
- Redaksi field `password`, `token`, `authorization`, `cookie`.
- Structured log + request ID.

**E6.3 Runbook**
- Prosedur rollback per epic, prosedur unblock akun, prosedur verifikasi pasca-deploy.
- Kontak eskalasi.

---

## 7. Rencana Migrasi Non-Destruktif

### 7.1 Pendekatan: Expand → Backfill → Switch → (tanpa Contract)

| Fase | Aksi | Dampak Data |
|---|---|---|
| Expand | Tambah tabel `password_reset_tokens`, kolom `audit_events`, index baru | Tidak ada perubahan data lama |
| Backfill | Isi kolom baru dengan nilai default/derivasi, batch 1000, idempotent | Hanya menulis kolom baru |
| Switch | Aplikasi mulai membaca kolom/tabel baru (feature flag) | Data lama tetap utuh |
| Contract | **Tidak dilakukan** | — |

### 7.2 Checklist Data Safety

- [ ] Backup penuh + snapshot sebelum migrasi.
- [ ] Restore backup di staging dan verifikasi.
- [ ] Catat row count & checksum tabel kritikal (users, tenants, transaksi, audit).
- [ ] Dry-run migrasi di salinan produksi.
- [ ] Migrasi hanya `CREATE TABLE`, `ADD COLUMN NULL`, `CREATE INDEX`.
- [ ] Tidak ada statement destruktif di file migrasi (review 2 orang).
- [ ] Verifikasi pasca-migrasi: row count identik, checksum identik.
- [ ] Simpan salinan backup minimal 30 hari (**tanpa menghapus backup lama**).
- [ ] Rollback = matikan feature flag + revert kode; **bukan** drop tabel.

### 7.3 Larangan Teknis

```
DILARANG di semua migrasi:
  DROP TABLE / DROP COLUMN
  TRUNCATE
  DELETE FROM <tabel user/bisnis/audit>
  ALTER COLUMN ... TYPE (tanpa kolom bayangan)
  RENAME COLUMN (langsung)
```

---

## 8. Rollout Plan

| Tahap | Isi | Gate |
|---|---|---|
| **S0 — Persiapan** | Backup, staging mirror, feature flag, monitoring dasar | Restore test lulus |
| **S1 — Transport** | HTTPS redirect, HSTS, headers (CSP report-only), no-store auth | 0 pelanggaran CSP kritis 7 hari |
| **S2 — Auth** | POST form, rate limit, lupa password, audit log | Funnel reset berhasil di staging |
| **S3 — A11y & SEO** | Kontras, heading, landmark, metadata, OG, robots/sitemap | Lighthouse a11y ≥95 |
| **S4 — Performa** | Split bundle, cache tuning, prefetch | LCP <2 s |
| **S5 — Enforce** | CSP enforce, matikan flag lama | Monitoring stabil 7 hari |

Semua perubahan dibungkus **feature flag** dan dirilis bertahap (10% → 50% → 100%).

**Rollback:** matikan flag → revert deploy → header/redirect dikembalikan. Tidak ada operasi database destruktif yang perlu dibatalkan.

---

## 9. Test Plan

| Jenis | Cakupan |
|---|---|
| Unit | Validasi token reset, rate limiter, header builder |
| Integration | Alur reset password, login sukses/gagal, lockout |
| E2E | Login, lupa password, reset, login ulang; keyboard-only |
| Security | Header scan, CSP report, uji submit tanpa JS, enumerasi email |
| Regression | Semua halaman publik + auth tetap render; sesi lama valid |
| Data | Row count & checksum sebelum/sesudah; uji idempotensi backfill |
| Performance | Lighthouse CI, RUM TTFB, LCP login |
| Accessibility | axe + uji screen reader + keyboard |

**Definition of Done:** semua acceptance criteria terpenuhi, tidak ada data hilang, monitoring hijau 7 hari.

---

## 10. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| CSP memblokir analytics/asset | Data RUM hilang sementara | Report-Only dulu, allowlist eksplisit |
| HSTS salah konfigurasi | Subdomain lama tidak bisa diakses | Tanpa `preload`, max-age bertahap |
| Rate limit mengunci user sah | Keluhan support | Lockout sementara + unblock admin + monitoring 429 |
| Email reset masuk spam | Funnel gagal | SPF/DKIM/DMARC + fallback kontak support |
| Migrasi gagal | Downtime | Dry-run, backup terverifikasi, migrasi additive |
| Feature flag bocor ke production | Perilaku tak terduga | Default off, audit flag sebelum rilis |
| Klaim ISO/biometric tidak akurat | Risiko legal/reputasi | Verifikasi bersama Legal sebelum publikasi |

---

## 11. Dependensi

- Akses Cloudflare (redirect, HSTS, Transform Rules).
- Penyedia email transaksional + domain authentication.
- Redis untuk rate limiting.
- Akses staging yang mencerminkan produksi.
- Persetujuan Security/Legal untuk klaim kepatuhan.

---

## 12. Timeline (estimasi)

| Minggu | Fokus |
|---|---|
| 1 | S0 persiapan + E1 transport/header |
| 2 | E2 form POST, rate limit, audit log |
| 3 | E2 lupa password + E6 observability |
| 4 | E3 SEO + E4 aksesibilitas |
| 5 | E5 performa + regression + hardening |
| 6 (buffer) | Enforce CSP, monitoring, serah terima |

---

## 13. Open Questions

1. Apakah portal harus tetap bisa diakses via `www` untuk kompatibilitas link lama?
2. Siapa pemilik mailbox `no-reply@` dan apakah DKIM sudah aktif?
3. Apakah MFA masuk rilis ini atau fase berikutnya?
4. Apakah klaim "ISO 27001 Certified" sudah tersertifikasi atau masih in-progress?
5. Apakah ada kebijakan retensi log dari Legal (tanpa menghapus data, hanya arsip)?

---

## 14. Lampiran — Checklist UAT

**Transport**
- [ ] `http://` → 301 HTTPS di semua path
- [ ] HSTS terpasang
- [ ] 5 security header ada
- [ ] `X-Powered-By` hilang
- [ ] `/login` `no-store`

**Auth**
- [ ] Login normal berhasil
- [ ] Submit tanpa JS aman (tanpa password di URL)
- [ ] Gagal 6× → 429 + pesan generik
- [ ] Lupa password end-to-end
- [ ] Token sekali pakai & expired ditolak
- [ ] Sesi lama tetap valid
- [ ] Audit event tercatat

**SEO/A11y**
- [ ] `lang=id`
- [ ] OG image tampil di preview
- [ ] robots & sitemap 200
- [ ] Lighthouse a11y ≥95
- [ ] Navigasi keyboard penuh

**Data**
- [ ] Row count identik
- [ ] Checksum identik
- [ ] Tidak ada statement destruktif
- [ ] Backup terverifikasi
- [ ] Rollback diuji di staging

---

**Persetujuan**

| Peran | Nama | Tanggal |
|---|---|---|
| Product Owner | | |
| Tech Lead | | |
| Security | | |
| QA Lead | | |
