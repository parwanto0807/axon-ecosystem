# PRODUCT REQUIREMENT DOCUMENT (PRD)

**IT Operations & Incident Service Log — "IT-OSL"**

| | |
|---|---|
| **Nama Proyek** | IT Operations & Incident Service Log (IT-OSL) |
| **Modul** | Worklog Internal IT, Manajemen Insiden & Ticketing Engine |
| **Versi Dokumen** | 2.0.0 — Expanded & Build-Ready Spec |
| **Menggantikan** | v1.0.0 (Approved for Development) |
| **Pengguna Sasaran** | IT Field Engineer (operator lapangan), Lead/Manajemen (monitor & auditor) |
| **Status** | Draft for Review → target *Approved for Development* |
| **Zona Waktu Sistem** | Asia/Jakarta (WIB, UTC+7) — dikunci di level server |
| **Bahasa Antarmuka** | Bahasa Indonesia (primary), istilah teknis dipertahankan dalam bahasa Inggris |

---

## 0. Catatan Revisi dari v1.0

Bagian ini merangkum **apa yang diperbaiki dan ditambahkan** dibanding dokumen versi pertama. Gunakan sebagai changelog saat review dengan tim developer.

### 0.1 Kontradiksi yang diperbaiki

| # | Temuan di v1.0 | Dampak jika dibiarkan | Perbaikan di v2.0 |
|---|---|---|---|
| 1 | Status `CLOSED` ada di diagram alur, tetapi tidak ada di ENUM database (`NEW, PROG, PEND, DONE`) | Developer akan membangun alur yang tidak bisa disimpan | ENUM diperluas lengkap + tabel state machine formal (§3.2) |
| 2 | §5 mendefinisikan *Resolution Time* sebagai T2−T0 di diagram, tapi MTTR sebagai T2−T1 di teks | Angka KPI berbeda antar laporan, perdebatan saat penilaian kinerja | Dipisah tegas jadi 3 metrik berbeda dengan rumus eksplisit (§5.2) |
| 3 | FRT ditargetkan ≤15 menit, tapi *breach flag* Critical baru menyala di >30 menit | Ada zona abu-abu 15 menit yang tidak terpantau | SLA matrix per severity, target dan ambang breach disamakan (§5.3) |
| 4 | "Waktu Laporan" diisi manual oleh teknisi, tapi §5 mengklaim semua timestamp *server-side* dan anti-manipulasi | Teknisi bisa memundurkan waktu lapor agar FRT terlihat bagus — KPI tidak valid | Dipisah `reported_at` (klaim user, editable, terbatas) vs `created_at` (server, immutable). FRT dihitung dari `created_at` (§5.1) |
| 5 | Tujuan produk menyebut *"Knowledge Base & Service Ledger"* riwayat aset, tapi skema database tidak punya entitas `ASSETS` sama sekali | Riwayat kerusakan tidak bisa ditelusuri per perangkat — tujuan utama gagal | Tabel `ASSETS` + `asset_id` di tiket + halaman riwayat per aset (§4.7, §7) |
| 6 | MTTR "dikurangi durasi Pending", tapi tidak ada field yang merekam kapan pending mulai & selesai | Perhitungan MTTR tidak mungkin dilakukan | Tabel `TICKET_PENDINGS` merekam tiap siklus pending (§7.4) |
| 7 | `pending_reason` berupa kolom TEXT tunggal, padahal satu tiket bisa pending berkali-kali | Alasan pending sebelumnya tertimpa dan hilang | Dipindah ke tabel histori terpisah |
| 8 | Diklaim "terekam otomatis tanpa manipulasi", tapi tidak ada tabel audit | Tidak ada bukti jika data diubah belakangan | Tabel `AUDIT_LOGS` append-only (§7.6) |
| 9 | Tidak ada `assigned_to`, hanya `created_by` | Tidak bisa dipakai jika teknisi >1 orang atau ada shift | Field penugasan + riwayat pengalihan (§4.6) |
| 10 | Quick-Log dijanjikan "maksimal 30 detik", tapi memuat 7 field wajib | Teknisi tetap malas mencatat — masalah yang ingin dipecahkan justru terulang | Wajib dipangkas jadi 4 field, sisanya *progressive disclosure* + smart default (§4.2) |
| 11 | §9 menilai kehadiran dari log tiket, tapi tidak ada modul presensi/shift apa pun | Kebijakan tidak bisa ditegakkan sistem | Modul Daily Opening/Closing + Shift Handover (§4.10) |
| 12 | `ticket_number` contoh `TC-001` | Nomor habis di tiket ke-1000 dan bentrok antar tahun | Format `TCK-YYYYMM-NNNN` dengan reset bulanan (§7.7) |

### 0.2 Bagian baru yang ditambahkan

Ruang Lingkup & Batasan (§1.4) · Metrik Keberhasilan Produk (§1.5) · Autentikasi & Manajemen Akun (§4.1) · Verifikasi & Penutupan Tiket (§4.5) · Reopen & Tiket Berulang (§4.6) · Registri Aset + QR Code (§4.7) · Preventive Maintenance Checklist (§4.8) · Notifikasi & Eskalasi (§4.9) · Shift Handover (§4.10) · Pencarian & Filter (§4.11) · Mode Offline (§6.4) · Aksesibilitas (§6.5) · Non-Functional Requirements (§9) · Keamanan & Privasi Data (§9.3) · Roadmap Bertahap (§11) · Risiko & Mitigasi (§12) · Pertanyaan Terbuka (§13) · Glosarium (§14) · Acceptance Criteria (Lampiran A).

---

## 1. Ringkasan Eksekutif

### 1.1 Latar Belakang

Operasional IT on-site saat ini berjalan tanpa jejak terstruktur. Panggilan, pesan WhatsApp, dan komplain lisan ditangani langsung tanpa rekaman terpusat. Akibatnya:

- **Pekerjaan tidak terlihat.** Teknisi bisa bekerja keras seharian dan tetap dianggap tidak produktif, karena tidak ada buktinya.
- **Insiden tertahan menghilang.** Tiket yang menunggu sparepart atau vendor tidak pernah ditagih kembali sampai user komplain untuk kedua kalinya.
- **Riwayat perangkat hilang.** Tidak ada yang tahu bahwa switch di Lantai 2 sudah tiga kali bermasalah dalam enam bulan — sehingga keputusan ganti unit tak pernah diambil.
- **Evaluasi kinerja bersifat opini.** Tidak ada dasar angka untuk menilai teknisi, sehingga penilaian rawan bias dan konflik.

Perlu ditegaskan sejak awal: **masalah utamanya bukan ketiadaan aplikasi, melainkan ketiadaan kebiasaan mencatat.** Aplikasi presensi sebelumnya gagal bukan karena fiturnya kurang, melainkan karena mengisi data terasa seperti beban tambahan tanpa manfaat balik bagi penggunanya. Karena itu seluruh keputusan desain di dokumen ini tunduk pada satu prinsip:

> **Prinsip Desain Utama — "Mencatat harus lebih cepat daripada menjelaskan."**
> Jika mengisi tiket memakan waktu lebih lama daripada membalas WhatsApp "iya pak saya cek", fitur itu salah desain dan harus disederhanakan, bukan dipaksakan lewat aturan.

### 1.2 Tujuan Produk

| # | Tujuan | Wujud Konkret di Produk |
|---|---|---|
| G1 | **Pencatatan mandiri terstruktur** — satu pintu masuk untuk semua aduan | Quick-Log 4 field wajib, target selesai ≤20 detik |
| G2 | **Kendali & visibilitas jarak jauh** bagi pimpinan | Dashboard real-time, Kanban board, live activity feed |
| G3 | **Audit & penilaian kinerja objektif** | Timestamp server-side, audit log append-only, KPI otomatis |
| G4 | **Knowledge base & service ledger aset** | Registri aset dengan riwayat insiden dan akar masalah per perangkat |
| G5 | **Kesinambungan antar hari & antar shift** *(baru)* | Daily closing wajib + catatan serah terima |

### 1.3 Manfaat Balik untuk Teknisi *(bagian baru — kunci adopsi)*

Agar aplikasi tidak dirasakan sebagai alat pengawasan sepihak, sistem **harus** memberi keuntungan langsung yang dirasakan teknisi:

1. **Laporan harian otomatis.** Satu ketukan menghasilkan teks rapi siap tempel ke grup manajemen — menggantikan pekerjaan menyusun laporan manual tiap sore.
2. **Bukti kerja saat dipersalahkan.** Ketika user mengklaim "IT tidak pernah datang", teknisi punya log berstempel waktu dan foto.
3. **Pembelaan atas keterlambatan.** Status Pending dengan alasan "menunggu approval anggaran" memindahkan tanggung jawab keterlambatan ke pihak yang tepat.
4. **Bank solusi pribadi.** Pencarian riwayat "printer Gudang" memunculkan cara perbaikan yang dulu berhasil — tidak perlu mengulang diagnosis dari nol.
5. **Dasar pengajuan barang.** Data "RJ45 habis 40 pcs bulan ini" jauh lebih kuat daripada permintaan lisan.

Poin-poin ini wajib dikomunikasikan saat sosialisasi, dan poin 1 & 4 wajib masuk MVP.

### 1.4 Ruang Lingkup

**Termasuk (In Scope)**
- Pencatatan, pelacakan, dan penutupan insiden IT internal
- Registri aset IT dan riwayat servisnya
- Checklist preventive maintenance terjadwal
- Dashboard monitoring & KPI teknisi
- Ekspor laporan harian/bulanan (teks, PDF, Excel)
- Penanda kehadiran berbasis aktivitas (opening/closing log)

**Tidak Termasuk (Out of Scope — v1)**
- Portal mandiri untuk end-user melapor sendiri *(dipertimbangkan di Fase 3)*
- Integrasi langsung WhatsApp Business API *(Fase 3)*
- Manajemen inventaris/stok gudang penuh dengan nilai rupiah dan pembelian
- Penggajian, absensi HR formal, atau perhitungan lembur
- Manajemen kontrak & penagihan vendor
- Remote desktop / remote monitoring perangkat
- Aplikasi native iOS/Android *(v1 = PWA responsif)*

### 1.5 Metrik Keberhasilan Produk

Produk dinilai berhasil bila, **90 hari** setelah go-live:

| Metrik | Baseline | Target |
|---|---|---|
| Kepatuhan pencatatan (insiden tercatat ÷ estimasi insiden nyata) | ~0% | ≥ 85% |
| Rata-rata waktu pengisian Quick-Log | — | ≤ 30 detik (p90) |
| Tiket "mengambang" di akhir hari (In Progress tanpa keterangan) | — | ≤ 5% |
| Tiket Critical yang melewati SLA respon | tidak terukur | ≤ 10% |
| Aset dengan minimal 1 riwayat servis tercatat | 0 | ≥ 70% aset kritikal |
| Laporan harian dikirim lewat fitur ekspor (bukan ketik manual) | 0% | ≥ 90% hari kerja |

Jika kepatuhan pencatatan di bawah 60% setelah 30 hari, **hentikan penambahan fitur** dan lakukan penyederhanaan form — bukan penambahan sanksi.

---

## 2. Persona Pengguna & Matriks Hak Akses

### 2.1 Persona

**P1 — Rian, IT Field Engineer (operator utama)**
Bergerak terus antar lantai, sering sambil membawa tas peralatan. Menerima aduan lewat WhatsApp, telepon, dan orang yang mencegat di koridor. Mengisi data dengan satu tangan, sambil berdiri, kadang di ruang server yang minim sinyal dan gelap. **Kebutuhan:** form pendek, tombol besar, default cerdas, bisa jalan offline, tidak perlu mengetik kalimat panjang.

**P2 — Bu Dita, Lead / IT Manager (pemantau)**
Tidak berada di lokasi klien. Ingin tahu dalam 10 detik: apa yang sedang berjalan, apa yang macet, dan apakah ada yang perlu keputusan dia. **Kebutuhan:** dashboard sekali lihat, notifikasi hanya untuk hal penting, rekap otomatis, ekspor untuk lampiran kontrak maintenance.

**P3 — Pak Hendra, Direktur / Klien (pembaca laporan)** *(baru)*
Hanya membuka aplikasi sesekali, atau bahkan tidak sama sekali — cukup menerima PDF bulanan. **Kebutuhan:** ringkasan yang bisa dipahami non-teknis, akses read-only.

### 2.2 Matriks Hak Akses

| Kemampuan | Engineer | Lead / Admin | Viewer (Klien) |
|---|:---:|:---:|:---:|
| Membuat tiket | ✅ | ✅ | ❌ |
| Mengubah status tiket yang ditugaskan padanya | ✅ | ✅ | ❌ |
| Mengubah status tiket teknisi lain | ❌ | ✅ | ❌ |
| Mengisi analisa & penyelesaian | ✅ | ✅ | ❌ |
| Menutup tiket (CLOSED) | ⚠️ otomatis saja | ✅ | ❌ |
| Membuka kembali tiket (REOPEN) | ⚠️ ≤24 jam | ✅ | ❌ |
| Membatalkan / menandai duplikat | ❌ | ✅ | ❌ |
| Melihat semua tiket | ⚠️ hanya miliknya + lokasinya | ✅ | ⚠️ read-only, tanpa nama teknisi |
| Dashboard KPI & performa teknisi | ⚠️ hanya statistik dirinya | ✅ | ⚠️ agregat saja |
| Ekspor laporan | ⚠️ harian saja | ✅ semua | ⚠️ bulanan saja |
| Kelola master data (lokasi, kategori, aset, SLA) | ❌ | ✅ | ❌ |
| Kelola pengguna & reset password | ❌ | ✅ | ❌ |
| Melihat audit log | ❌ | ✅ | ❌ |
| Menghapus data | ❌ | ❌ *(tidak ada hard delete)* | ❌ |

> **Catatan penting:** tidak ada peran yang boleh menghapus tiket secara permanen. Pembatalan dilakukan lewat status `CANCELLED` dengan alasan tertulis. Ini menjaga integritas audit.

### 2.3 Kebutuhan Perangkat

| Peran | Perangkat utama | Implikasi desain |
|---|---|---|
| Engineer | Ponsel Android kelas menengah, layar 6", satu tangan | Mobile-first, target sentuh ≥48px, offline-capable |
| Lead | Laptop/desktop 1366×768 ke atas, tablet sesekali | Layout padat informasi, keyboard shortcut |
| Viewer | Apa saja, sering hanya PDF | Ekspor harus mandiri tanpa perlu login |

---

## 3. Siklus Hidup Insiden

### 3.1 Diagram Alur

```
                    [ Aduan / Temuan Masuk ]
          (WhatsApp · Telepon · Tatap Muka · Inspeksi Mandiri)
                              │
                              ▼
                    ┌───────────────────┐
                    │   STATUS: NEW     │ ← created_at (server, immutable)
                    └─────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    [Mulai Dikerjakan]  [Duplikat/Salah]  [Batal oleh Pelapor]
            │                 │                 │
            ▼                 ▼                 ▼
   ┌────────────────┐   ┌───────────┐   ┌─────────────┐
   │ IN PROGRESS    │   │ DUPLICATE │   │  CANCELLED  │
   └───┬────────┬───┘   └───────────┘   └─────────────┘
       │        │         (terminal)        (terminal)
       │        └──────────────┐
       │                       │
       ▼                       ▼
┌─────────────┐        ┌────────────────┐
│   PENDING   │ ◄────► │    RESOLVED    │ ← wajib: root cause,
└─────────────┘        └───────┬────────┘   tindakan, kondisi aset
  (bisa kembali                │
   ke In Progress)             │  verifikasi / auto-close 2×24 jam
                               ▼
                      ┌─────────────────┐
                      │     CLOSED      │ ← arsip, read-only
                      └────────┬────────┘
                               │
                       [Masalah kambuh]
                               │
                               ▼
                      ┌─────────────────┐
                      │    REOPENED     │ → kembali ke IN PROGRESS
                      └─────────────────┘     (tiket anak, terhubung
                                                ke tiket induk)
```

### 3.2 Tabel State Machine (acuan implementasi)

| Dari | Ke | Siapa | Syarat wajib | Timestamp yang direkam |
|---|---|---|---|---|
| — | NEW | Engineer, Lead | 4 field wajib Quick-Log | `created_at` |
| NEW | IN_PROGRESS | Pemegang tiket | — (satu ketukan) | `acknowledged_at` |
| NEW | DUPLICATE | Lead | Tautan ke tiket induk | `closed_at` |
| NEW | CANCELLED | Lead | Alasan pembatalan (teks) | `closed_at` |
| IN_PROGRESS | PENDING | Pemegang tiket | Alasan + estimasi tindak lanjut | `pending_started_at` |
| IN_PROGRESS | RESOLVED | Pemegang tiket | Root cause, tindakan, kondisi aset | `resolved_at` |
| PENDING | IN_PROGRESS | Pemegang tiket | — | `pending_ended_at` |
| PENDING | CANCELLED | Lead | Alasan | `closed_at` |
| RESOLVED | CLOSED | Lead, atau sistem setelah 2×24 jam | — | `closed_at` |
| RESOLVED | IN_PROGRESS | Lead, atau pemegang tiket ≤24 jam | Alasan penolakan hasil | `reopened_at` |
| CLOSED | *(terkunci)* | — | Hanya bisa dibuat tiket baru bertaut | — |

**Aturan tambahan:**
- Status `CLOSED`, `CANCELLED`, dan `DUPLICATE` bersifat **terminal dan read-only**. Perubahan setelahnya hanya mungkin lewat tiket baru yang ditautkan.
- Satu tiket boleh masuk `PENDING` berkali-kali; tiap siklus direkam terpisah.
- Transisi mundur yang tidak ada di tabel di atas **harus ditolak sistem**, bukan sekadar disembunyikan di UI.

---

## 4. Spesifikasi Fungsional

### 4.1 Modul Autentikasi & Akun *(baru)*

| Aspek | Ketentuan |
|---|---|
| Metode login | Username/email + password |
| Sesi | Token berlaku 30 hari di perangkat terpercaya; teknisi **tidak** dipaksa login ulang tiap hari |
| Keamanan perangkat | Opsi PIN 6 digit / biometrik untuk membuka aplikasi yang sudah login |
| Password | Minimal 8 karakter, wajib ganti saat login pertama, disimpan sebagai hash bcrypt/argon2 |
| Percobaan gagal | Kunci sementara 15 menit setelah 5 kali gagal |
| Reset password | Hanya oleh Lead/Admin, tercatat di audit log |
| Akun nonaktif | Dinonaktifkan, tidak dihapus — agar riwayat tiket tetap punya penanggung jawab |

> **Desain kritikal:** jangan pernah memaksa login ulang di tengah pengisian form. Draft harus tersimpan lokal.

### 4.2 Modul Quick-Log — Pencatatan Cepat

**Target: terisi dalam ≤20 detik, maksimal 4 ketukan + 1 kali mengetik.**

#### Field Wajib (tampil langsung di layar pertama)

| Field | Komponen | Aturan | Default / Bantuan |
|---|---|---|---|
| **Uraian Singkat** | Single-line text + tombol mikrofon | Wajib, 5–150 karakter | Fokus otomatis saat form terbuka. Mendukung *voice-to-text*. Contoh: "PC Kasir 2 blue screen saat restart" |
| **Lokasi / Unit** | Dropdown + pencarian + **scan QR** | Wajib | 5 lokasi terakhir dipakai muncul paling atas. Scan QR di aset langsung mengisi lokasi + aset sekaligus |
| **Kategori Masalah** | Dropdown hierarki 2 tingkat | Wajib | Tebakan otomatis dari kata kunci uraian (mis. "wifi" → Jaringan & Internet). Tetap bisa dikoreksi |
| **Urgensi (Severity)** | 3 tombol berwarna besar | Wajib | Default **Medium** (kuning) — sudah terpilih, tinggal ubah bila perlu |

#### Field Opsional (tersembunyi di balik tombol "Detail lainnya")

| Field | Komponen | Aturan | Default |
|---|---|---|---|
| Waktu Laporan | Datetime picker | Tidak boleh > waktu sekarang; tidak boleh < 24 jam lalu tanpa alasan | Default: **sekarang**. Chip pintasan: `15 mnt lalu` · `30 mnt lalu` · `1 jam lalu` |
| Kanal Laporan | Chip pilih satu | — | Default: kanal yang terakhir dipakai. Pilihan: WhatsApp · Telepon · Tatap Muka · Inspeksi Mandiri · Email · Sistem Monitoring |
| Nama Pelapor | Autocomplete dari riwayat | Min 2 karakter bila diisi | Riwayat nama yang pernah diinput. Kosongkan bila temuan sendiri |
| Aset Terkait | Pencarian aset / scan QR | — | Terisi otomatis bila lokasi dipilih lewat QR |
| Foto Kondisi Awal | Kamera / galeri, maks 3 | ≤5MB per foto, kompresi otomatis sisi klien | — |

#### Kategori Masalah (master data — dapat dikelola Admin)

| Kelompok | Sub-kategori |
|---|---|
| **1. Hardware & PC** | PC/Desktop · Laptop · Monitor · Printer · Scanner · UPS · Periferal |
| **2. Jaringan & Internet** | Wi-Fi · Kabel LAN · Router/Mikrotik · Switch · ISP Down · VPN |
| **3. Security & Akses** | CCTV · NVR/DVR · Barrier Gate · RFID/Fingerprint · Door Lock · Alarm |
| **4. Software & Aplikasi** | Sistem Operasi · MS Office · Email · ERP/Aplikasi Internal · Antivirus · Lisensi |
| **5. Infrastruktur & Listrik** | Jalur Kabel · Kelistrikan IT · Rak Server · Pendingin Ruangan · Grounding |
| **6. Permintaan Layanan** *(baru)* | Instalasi Baru · Pemindahan Perangkat · Permintaan Akses · Peminjaman Alat |

> **Mengapa kelompok 6 ditambahkan:** tidak semua pekerjaan IT adalah "insiden". Memaksa permintaan instalasi dicatat sebagai *masalah* membuat statistik kerusakan menggelembung dan MTTR terdistorsi. Tiket kelompok 6 ditandai `ticket_type = REQUEST` dan **dikecualikan dari perhitungan MTTR insiden**.

#### Definisi Severity

| Level | Warna | Kriteria | Contoh |
|---|---|---|---|
| **Low** | Hijau | Tidak mengganggu operasional, bisa dijadwalkan | Permintaan instal software, rapikan kabel |
| **Medium** | Kuning | Mengganggu individu/unit kecil, ada alternatif kerja | Satu PC lambat, printer satu unit macet |
| **Critical** | Merah | Operasional berhenti total atau menyangkut keamanan & keselamatan | Internet utama putus, server down, barrier gate macet menahan antrean, CCTV mati total |

> **Anti-inflasi severity:** jika >40% tiket dalam sebulan ditandai Critical, dashboard menampilkan peringatan kalibrasi ke Lead. Severity yang selalu merah membuat sistem prioritas tidak ada artinya.

#### Fitur Pendukung Kecepatan

- **Template Cepat** — 5 masalah tersering ditampilkan sebagai chip di atas form. Sekali ketuk langsung mengisi kategori, severity, dan uraian awal.
- **Draft otomatis** — form yang belum selesai tersimpan lokal; bila aplikasi tertutup, muncul tawaran "Lanjutkan catatan tadi?"
- **Buat & langsung kerjakan** — tombol sekunder "Simpan & Kerjakan Sekarang" yang langsung melompati status NEW ke IN_PROGRESS dalam satu aksi.
- **Deteksi duplikat** — bila ada tiket aktif dengan lokasi + kategori sama dalam 2 jam terakhir, tampilkan pengingat halus: "Ada tiket serupa (TCK-…). Lanjut buat baru atau tambahkan ke tiket itu?"

### 4.3 Modul Progress & Kontrol Pending

#### Saat beralih ke PENDING

| Field | Komponen | Wajib | Keterangan |
|---|---|---|---|
| Alasan Tertahan | Pilih satu | ✅ | • Menunggu sparepart<br>• Menunggu approval anggaran<br>• Koordinasi vendor pihak ketiga (ISP/teknisi luar)<br>• Menunggu jendela maintenance<br>• Menunggu konfirmasi/kehadiran user<br>• Lainnya (wajib isi teks) |
| Penanggung Jawab Eksternal | Teks singkat | ⚠️ wajib bila vendor/approval | Nama pihak & kontak. Menentukan **siapa** yang menahan, bukan sekadar apa |
| Estimasi Tindak Lanjut | Datetime picker | ✅ | Harus > waktu sekarang. Pintasan: `Besok pagi` · `+3 hari` · `Senin depan` |
| Catatan | Teks bebas | ❌ | Konteks tambahan |

#### Perilaku Sistem terhadap Tiket Pending

- Tag kuning di dashboard untuk pending > 24 jam; tag **oranye berkedip** untuk > 72 jam.
- **Pengingat otomatis** ke teknisi di H-1 dari estimasi tindak lanjut, dan pada hari-H.
- Bila estimasi tindak lanjut terlewat tanpa pembaruan, tiket masuk daftar **"Janji Terlewat"** di dashboard Lead.
- Durasi pending **tidak dihitung** dalam MTTR, tetapi dilaporkan terpisah sebagai *Waiting Time* — agar hambatan non-teknis (vendor lambat, approval macet) terlihat oleh manajemen, bukan tersembunyi dalam angka kinerja teknisi.

> Ini penting secara kultural: pending yang jujur harus **menguntungkan** teknisi, bukan menghukumnya. Jika pending dihitung sebagai keterlambatan pribadi, teknisi akan menghindari status ini dan membiarkan tiket mengambang di In Progress.

### 4.4 Modul Analisa & Penyelesaian

Form terbuka saat teknisi menekan **"Tandai Selesai"**. Data di sini mengunci tiket menjadi dokumen resmi dan menjadi isi knowledge base.

| Field | Komponen | Wajib | Standar Pengisian |
|---|---|---|---|
| **Akar Masalah** | Textarea, min 15 karakter | ✅ | Mengapa masalah terjadi. Contoh: *"Port RJ45 korosi akibat kelembapan tinggi, pin 4–5 putus"*. Ditolak bila hanya berisi kata seperti "error", "rusak", "sudah normal" |
| **Tindakan Perbaikan** | Textarea, min 15 karakter | ✅ | Langkah konkret. Contoh: *"Crimping ulang jack modular Cat6, uji via LAN tester, bandwidth 1Gbps normal"* |
| **Penggantian Suku Cadang** | Tag input berulang (nama + qty + satuan) | ❌ | Contoh: `Konektor RJ45 × 4 pcs`, `Adaptor 12V 2A × 1 unit`. Autocomplete dari riwayat pemakaian |
| **Status Akhir Aset** | Segmented button | ✅ | • **Normal Sempurna**<br>• **Normal Sementara** → wajib isi rencana tindak lanjut<br>• **Rusak Total (rekomendasi afkir)** → otomatis membuat tiket follow-up pengadaan |
| **Bukti Dokumentasi** | Kamera / unggah, maks 5 | ⚠️ wajib untuk Critical | Foto kondisi setelah perbaikan atau tangkapan layar normal |
| **Kategori Solusi** *(baru)* | Pilih satu | ✅ | Perbaikan · Penggantian Komponen · Konfigurasi Ulang · Reset/Restart · Eskalasi ke Vendor · Edukasi User · Tidak Ditemukan Masalah |
| **Bisa Dicegah?** *(baru)* | Ya / Tidak / Tidak yakin | ✅ | Bila "Ya", sarankan menambah item ke checklist preventive maintenance |

**Bantuan pengisian:**
- Saat mengetik akar masalah, sistem menampilkan **solusi terdahulu** pada aset atau kategori yang sama — teknisi bisa menyalinnya dengan satu ketukan lalu menyesuaikan.
- Snippet tersimpan: teknisi bisa menyimpan tindakan yang sering diulang sebagai template pribadi.

### 4.5 Verifikasi & Penutupan Tiket *(baru)*

Tiket `RESOLVED` belum berarti selesai secara administratif.

| Jalur | Mekanisme |
|---|---|
| **Penutupan oleh Lead** | Lead meninjau isian analisa. Bila memadai → `CLOSED`. Bila tidak → dikembalikan ke `IN_PROGRESS` dengan catatan perbaikan |
| **Auto-close** | Tiket `RESOLVED` yang tidak disanggah dalam **2×24 jam kerja** otomatis menjadi `CLOSED` |
| **Sanggahan pelapor** *(Fase 3)* | Pelapor menerima tautan konfirmasi; bila menyatakan belum beres, tiket otomatis reopen |

Setelah `CLOSED`, seluruh field terkunci. Koreksi hanya dimungkinkan lewat catatan tambahan (`ticket_notes`) yang tercatat di audit log — isi asli tidak pernah ditimpa.

### 4.6 Penugasan, Pengalihan & Reopen *(baru)*

- **Penugasan.** Secara default tiket ditugaskan ke pembuatnya. Lead dapat mengalihkan ke teknisi lain; setiap pengalihan tercatat beserta alasan.
- **Pengalihan shift.** Tiket aktif yang belum selesai di akhir shift dapat dialihkan lewat modul Serah Terima (§4.10).
- **Reopen.** Bila masalah yang sama kambuh pada aset yang sama dalam **7 hari**, sistem menawarkan untuk membuat **tiket bertaut** (`parent_ticket_id`), bukan tiket lepas. Ini memungkinkan deteksi *recurring failure*.
- **Indikator masalah berulang.** Aset dengan ≥3 tiket pada kategori sama dalam 90 hari diberi lencana **"Sering Bermasalah"** di registri aset, dengan saran evaluasi penggantian unit.

### 4.7 Registri Aset & QR Code *(baru — memenuhi tujuan G4)*

Tanpa entitas aset, tujuan "service ledger" pada v1.0 tidak mungkin tercapai. Modul ini menutup celah tersebut.

**Data aset:** kode aset · nama · jenis · merek/model · nomor seri · lokasi · tanggal perolehan · masa garansi · status (Aktif / Perbaikan / Afkir) · penanggung jawab.

**Fitur:**
- **Label QR** — dicetak dan ditempel di setiap perangkat. Scan dari Quick-Log langsung mengisi lokasi + aset, memangkas 2 field sekaligus. Ini adalah penghemat waktu terbesar di lapangan.
- **Halaman Riwayat Aset** — linimasa seluruh tiket pada perangkat tersebut, total biaya sparepart, dan frekuensi kerusakan.
- **Peringatan garansi** — sebelum melakukan perbaikan mandiri, sistem mengingatkan bila perangkat masih bergaransi.
- **Impor massal** — unggah CSV untuk pendataan awal; tidak realistis meminta teknisi mengetik ratusan aset satu per satu.

> **Catatan implementasi bertahap:** jangan jadikan `asset_id` wajib di MVP. Registri aset diisi bertahap seiring pemakaian — tiket yang lokasinya sudah benar tetap berguna meski asetnya belum terdaftar. Memaksa pendataan aset lengkap sebelum go-live adalah penyebab umum gagalnya proyek seperti ini.

### 4.8 Preventive Maintenance Checklist *(baru)*

Sistem v1.0 sepenuhnya reaktif — hanya mencatat setelah ada kerusakan. Padahal sebagian besar waktu teknisi on-site terpakai untuk pemeriksaan rutin yang, bila tidak tercatat, terlihat seperti menganggur.

- **Jadwal berulang** — harian, mingguan, atau bulanan (contoh: cek suhu ruang server & rekaman CCTV tiap pagi; bersihkan filter UPS tiap bulan).
- **Checklist terpandu** — daftar item dengan status Normal / Perlu Perhatian / Bermasalah.
- **Eskalasi otomatis** — item "Bermasalah" langsung membuat tiket insiden dengan kategori terisi.
- **Kontribusi ke KPI** — checklist yang tuntas dihitung sebagai aktivitas produktif, terpisah dari volume tiket insiden.

### 4.9 Notifikasi & Eskalasi *(baru)*

| Pemicu | Penerima | Kanal | Waktu |
|---|---|---|---|
| Tiket Critical dibuat | Lead | Push + dalam aplikasi | Seketika |
| Critical belum direspon | Teknisi, lalu Lead | Push | 15 mnt → eskalasi ke Lead di 30 mnt |
| Pending melewati estimasi | Teknisi pemegang | Push | Pada hari-H |
| Pending > 72 jam | Lead | Dalam aplikasi | Harian |
| Rekap harian siap | Teknisi | Push | 16:30 WIB |
| Ada tiket mengambang jelang pulang | Teknisi | Push | 16:00 WIB |
| Ringkasan mingguan | Lead | Email | Senin 08:00 |

**Aturan anti-spam:** notifikasi non-Critical digabung maksimal sekali per jam. Jam senyap 21:00–06:00 kecuali Critical. Notifikasi yang terlalu sering adalah penyebab utama pengguna mematikan notifikasi sama sekali — dan setelah itu, eskalasi tidak lagi berfungsi.

### 4.10 Opening, Closing & Serah Terima Shift *(baru — menopang §10)*

Kebijakan pada v1.0 menilai kehadiran dari aktivitas tiket, namun tidak ada modul yang menjalankannya. Modul ini melengkapinya.

- **Opening Log** — saat membuka aplikasi pertama kali di hari kerja, teknisi menekan "Mulai Bertugas". Tercatat sebagai jejak kehadiran berbasis aktivitas, tanpa perlu aplikasi absensi terpisah.
- **Closing Checklist** — pukul 16:00 muncul pengingat berisi daftar tiket yang masih mengambang, dengan aksi cepat: `Selesaikan` · `Pending` · `Lanjut besok`.
- **Catatan Serah Terima** — ringkasan singkat kondisi akhir hari untuk teknisi shift berikutnya atau untuk diri sendiri esok pagi.
- **Rekap otomatis** — setelah closing, sistem menghasilkan teks laporan harian siap tempel.

### 4.11 Pencarian & Filter *(baru)*

- Pencarian teks penuh pada uraian, akar masalah, dan tindakan perbaikan.
- Filter gabungan: status · severity · kategori · lokasi · aset · teknisi · rentang tanggal.
- Filter tersimpan (mis. "Pending saya", "Critical bulan ini").
- Setiap hasil pencarian dapat langsung diekspor.

---

## 5. SLA & Metrik Kinerja

### 5.1 Sumber Waktu

| Penanda | Sumber | Dapat diubah? | Kegunaan |
|---|---|---|---|
| `created_at` | **Server** | Tidak pernah | Titik nol untuk seluruh perhitungan SLA |
| `reported_at` | Input pengguna | Ya, terbatas | Konteks kapan user sebenarnya mengadu |
| `acknowledged_at` | **Server** | Tidak | Awal penanganan |
| `pending_started_at` / `pending_ended_at` | **Server** | Tidak | Menghitung waktu tunggu |
| `resolved_at` | **Server** | Tidak | Akhir pengerjaan teknis |
| `closed_at` | **Server** | Tidak | Akhir administratif |

> **Perbaikan penting dari v1.0.** Pada v1.0, "Waktu Laporan" diisi manual namun dipakai sebagai T0 untuk menghitung FRT. Artinya teknisi dapat memundurkan waktu lapor agar terlihat responsif — dan seluruh klaim "anti-manipulasi" menjadi tidak berdasar. Pada v2.0, **FRT dihitung dari `created_at` (server)**, sementara `reported_at` hanya konteks. Selisih besar antara keduanya (>2 jam) justru ditandai sebagai *indikator keterlambatan pencatatan*, bukan disembunyikan.

### 5.2 Rumus Metrik

```
FRT (First Response Time)     = acknowledged_at − created_at
Logging Lag                   = created_at − reported_at        (indikator disiplin catat)
Waiting Time                  = Σ (pending_ended_at − pending_started_at)
MTTR (Mean Time To Resolve)   = (resolved_at − acknowledged_at) − Waiting Time
Total Lead Time               = closed_at − created_at          (yang dirasakan user)
```

**Aturan penting:**
- Seluruh durasi dihitung dalam **jam kerja**, bukan jam kalender. Tiket yang masuk pukul 16:55 dan dikerjakan pukul 08:05 esok harinya memiliki FRT ≈ 10 menit, bukan 16 jam.
- Tiket bertipe `REQUEST` dikeluarkan dari perhitungan MTTR insiden.
- Metrik agregat hanya ditampilkan bila jumlah sampel ≥10 tiket; di bawah itu, angka rata-rata menyesatkan.

### 5.3 Matriks SLA per Severity

| Severity | Target Respon | Target Selesai | Ambang Breach (notifikasi) |
|---|---|---|---|
| **Critical** | ≤ 15 menit | ≤ 4 jam kerja | Respon > 15 mnt → merah seketika |
| **Medium** | ≤ 60 menit | ≤ 1 hari kerja | Respon > 60 mnt → kuning |
| **Low** | ≤ 4 jam kerja | ≤ 3 hari kerja | Respon > 4 jam → abu-abu |

**Kalender kerja** (dapat dikonfigurasi Admin): Senin–Jumat 08:00–17:00 WIB, Sabtu 08:00–12:00, hari libur nasional dikecualikan. Tiket Critical di luar jam kerja mengikuti aturan siaga terpisah.

### 5.4 Dasbor Kinerja

Ditampilkan: volume tiket selesai per periode · kepatuhan SLA (%) · MTTR per kategori · tingkat tiket berulang · rasio pencatatan telat · distribusi waktu tunggu per penyebab (vendor/approval/sparepart).

> **Peringatan penggunaan KPI.** Metrik di sini dirancang untuk memperbaiki proses, bukan untuk memeringkat manusia. Menjadikan "volume tiket selesai" sebagai target individual mendorong perilaku buruk: memecah satu pekerjaan menjadi banyak tiket kecil, atau menghindari pekerjaan sulit yang memakan waktu. Gunakan angka-angka ini sebagai bahan percakapan, dan selalu baca berdampingan dengan kompleksitas pekerjaan.

---

## 6. Panduan UI/UX

### 6.1 Mobile — Tampilan Teknisi

- **FAB "+"** permanen di kanan bawah, dalam jangkauan ibu jari, membuka Quick-Log tanpa navigasi.
- **Tab cerdas:** `Aktif` · `Tertahan` · `Selesai`, dengan lencana angka pada masing-masing.
- **Aksi satu ketuk** langsung pada kartu tiket, tanpa perlu membuka detail:
  - 🟢 **Kerjakan Sekarang** — hijau, lebar penuh
  - 🔵 **Tandai Selesai** — biru
  - ⚪ **Tunda (Pending)** — abu-abu
- **Geser kartu** untuk aksi cepat: geser kanan = kerjakan, geser kiri = tunda.
- **Undo 5 detik** setelah setiap perubahan status — mencegah frustrasi akibat salah ketuk saat terburu-buru.
- **Target sentuh minimal 48×48px**, jarak antar tombol ≥8px.
- **Mode gelap** wajib tersedia — teknisi sering bekerja di ruang server dan area remang.

### 6.2 Dashboard — Tampilan Lead

- **Kartu KPI:** Tiket Hari Ini · Sedang Dikerjakan · Tertahan · Rata-rata Respon · **Melewati SLA** *(baru)*.
- **Kanban board:** New → In Progress → Pending → Resolved, kartu dapat diseret.
- **Live activity feed** kronologis: *"09:15 — Rian memulai perbaikan CCTV Pos 1"*, *"10:02 — Tiket printer gudang ditandai selesai"*.
- **Peta panas lokasi** *(baru)* — memperlihatkan titik yang paling sering bermasalah.
- **Papan perhatian** *(baru)* — satu blok berisi hal yang butuh keputusan Lead: melewati SLA, janji pending terlewat, rekomendasi afkir, tiket berulang.

### 6.3 Prinsip Bahasa & Nada

- Gunakan bahasa Indonesia lugas, hindari jargon sistem di antarmuka teknisi.
- Pesan kesalahan menjelaskan **jalan keluar**, bukan menyalahkan. Bukan *"Input tidak valid"*, melainkan *"Uraian minimal 5 karakter, contoh: 'Printer gudang tidak menyala'"*.
- Nada netral dan tidak menghakimi. Hindari kata bernuansa sanksi seperti "Anda terlambat" di antarmuka harian.

### 6.4 Mode Offline *(baru — kebutuhan wajib)*

Ruang server, basement, dan pos gate kerap tanpa sinyal. Bila aplikasi gagal di titik-titik ini, pencatatan akan ditinggalkan.

- Tiket dapat dibuat dan diperbarui sepenuhnya secara offline, tersimpan di antrean lokal.
- Sinkronisasi otomatis saat koneksi kembali, dengan indikator status yang jelas: `Tersinkron` / `Menunggu kirim (3)`.
- Timestamp offline ditandai khusus dan direkonsiliasi di server (waktu perangkat disimpan sebagai `client_time`, tapi urutan otoritatif tetap milik server).
- Foto diantre terpisah dan diunggah belakangan agar tiket teks tidak tertahan oleh unggahan besar.
- Konflik diselesaikan dengan aturan: perubahan status terbaru menang, isi teks digabung sebagai catatan.

### 6.5 Aksesibilitas & Performa

- Kontras warna memenuhi WCAG AA (rasio ≥4.5:1).
- Severity tidak boleh dibedakan **hanya** lewat warna — sertakan ikon dan label teks (penting bagi pengguna buta warna).
- Ukuran font dapat mengikuti pengaturan sistem.
- Layar daftar tiket termuat < 2 detik pada jaringan 3G.
- Ukuran bundel awal PWA < 500KB.

---

## 7. Skema Data

### 7.1 TICKETS

```
┌────────────────────────────────────────────────────────┐
│                        TICKETS                         │
├────────────────────────────────────────────────────────┤
│ id                   UUID, PK                          │
│ ticket_number        VARCHAR(20), UNIQUE               │
│ ticket_type          ENUM(INCIDENT, REQUEST, PM)       │
│ summary              VARCHAR(150), NOT NULL            │
│ reporter_name        VARCHAR(100), NULL                │
│ report_channel       ENUM(...), NULL                   │
│ location_id          FK → LOCATIONS.id                 │
│ asset_id             FK → ASSETS.id, NULL              │
│ category_id          FK → CATEGORIES.id                │
│ severity             ENUM(LOW, MEDIUM, CRITICAL)       │
│ status               ENUM(NEW, IN_PROGRESS, PENDING,   │
│                           RESOLVED, CLOSED,            │
│                           CANCELLED, DUPLICATE)        │
│ root_cause           TEXT, NULL                        │
│ corrective_action    TEXT, NULL                        │
│ solution_category    ENUM(...), NULL                   │
│ asset_condition      ENUM(NORMAL, TEMPORARY, BROKEN)   │
│ is_preventable       BOOLEAN, NULL                     │
│ parent_ticket_id     FK → TICKETS.id, NULL             │
│ assigned_to          FK → USERS.id                     │
│ created_by           FK → USERS.id                     │
│ reported_at          TIMESTAMPTZ, NULL   (klaim user)  │
│ created_at           TIMESTAMPTZ, NOT NULL (server)    │
│ acknowledged_at      TIMESTAMPTZ, NULL                 │
│ resolved_at          TIMESTAMPTZ, NULL                 │
│ closed_at            TIMESTAMPTZ, NULL                 │
│ reopened_count       INT, DEFAULT 0                    │
│ total_pending_sec    INT, DEFAULT 0  (denormalisasi)   │
│ updated_at           TIMESTAMPTZ                       │
└────────────────────────────────────────────────────────┘
```

**Indeks yang disarankan:** `(status, severity)`, `(assigned_to, status)`, `(asset_id, created_at)`, `(location_id, created_at)`, indeks full-text pada `summary + root_cause + corrective_action`.

### 7.2 Relasi Antar Entitas

```
USERS ──1:N──> TICKETS ──1:N──> TICKET_ATTACHMENTS
                  │
                  ├──1:N──> TICKET_PENDINGS
                  ├──1:N──> TICKET_PARTS
                  ├──1:N──> TICKET_NOTES
                  ├──1:N──> AUDIT_LOGS
                  ├──N:1──> LOCATIONS
                  ├──N:1──> CATEGORIES  (self-referencing hierarchy)
                  └──N:1──> ASSETS ──N:1──> LOCATIONS

PM_SCHEDULES ──1:N──> PM_EXECUTIONS ──1:N──> PM_CHECK_ITEMS
```

### 7.3 ASSETS *(baru)*

`id` · `asset_code` (unik, dicetak di QR) · `name` · `asset_type` · `brand_model` · `serial_number` · `location_id` · `purchase_date` · `warranty_until` · `status` (ACTIVE / IN_REPAIR / RETIRED) · `pic_user_id` · `notes` · `created_at`

### 7.4 TICKET_PENDINGS *(baru — memungkinkan MTTR dihitung)*

`id` · `ticket_id` · `reason` (ENUM) · `external_party` · `notes` · `expected_resume_at` · `started_at` · `ended_at` · `created_by`

### 7.5 TICKET_PARTS *(baru)*

`id` · `ticket_id` · `part_name` · `quantity` · `unit` · `notes`
→ Menjadi dasar rekap "Perangkat Diganti" pada laporan harian dan pengajuan restock.

### 7.6 AUDIT_LOGS *(baru — menopang klaim anti-manipulasi)*

`id` · `entity_type` · `entity_id` · `action` · `field_name` · `old_value` · `new_value` · `actor_user_id` · `ip_address` · `user_agent` · `created_at`

Bersifat **append-only**. Tidak ada UPDATE maupun DELETE pada tabel ini, ditegakkan di level hak akses database — bukan hanya di level aplikasi.

### 7.7 Aturan Penomoran Tiket

Format: **`TCK-YYYYMM-NNNN`** — contoh `TCK-202609-0042`.
Urutan direset tiap bulan, dibuat di sisi server dengan penguncian transaksional untuk mencegah tabrakan nomor saat dua tiket dibuat bersamaan (termasuk saat sinkronisasi offline massal).

### 7.8 Kebijakan Retensi Data

| Data | Retensi | Setelahnya |
|---|---|---|
| Tiket aktif & closed | 3 tahun | Diarsipkan (dingin) |
| Foto lampiran | 1 tahun resolusi penuh | Dikompresi menjadi thumbnail |
| Audit log | 5 tahun | Arsip beku |
| Draft lokal | 7 hari | Dibuang otomatis |

---

## 8. Rekapitulasi & Pelaporan

### 8.1 Laporan Harian Otomatis (satu ketukan → siap tempel)

```
📋 LAPORAN HARIAN IT SUPPORT
📅 Jumat, 18 September 2026
👤 Teknisi: Rian S.
─────────────────────────────
• Total insiden ditangani : 6
• Selesai                 : 5
• Masih tertahan          : 1
• Rata-rata waktu respon  : 12 menit

🔧 RINGKASAN PEKERJAAN
1. [Selesai] Jaringan — Wi-Fi Lantai 2 putus
   → Access point hang, direstart & firmware diperbarui
2. [Selesai] Hardware — PC Kasir 2 blue screen
   → RAM slot 1 longgar, dipasang ulang & uji memtest
3. [Selesai] CCTV — Kamera Pos Gate buram
   → Lensa dibersihkan, fokus disetel ulang
4. [Selesai] Printer Gudang tidak menarik kertas
   → Roller aus dibersihkan, uji cetak normal
5. [Selesai] Instalasi ulang Office di PC Finance
6. [PENDING] Switch Lantai 3 — menunggu adaptor pengganti
   ⏳ Estimasi lanjut: Senin, 21 Sep 2026
   👤 Menunggu: Vendor NetSolusi (Pak Budi)

🔩 SUKU CADANG TERPAKAI
• Jack RJ45 — 2 pcs
• Patch cord 1m — 1 pcs

⚠️ PERLU PERHATIAN
• Switch Lantai 3 sudah 3× bermasalah dalam 90 hari
  → Disarankan evaluasi penggantian unit
```

Tersedia tombol **Salin** dan **Bagikan ke WhatsApp**. Dapat dijadwalkan otomatis setiap pukul 16:30.

### 8.2 Laporan Bulanan (PDF / Excel)

**Isi PDF:** halaman sampul dengan periode dan nama klien · ringkasan eksekutif (grafik volume, kepatuhan SLA, distribusi kategori) · tabel seluruh tiket bernomor rapi · rekap suku cadang · daftar aset bermasalah berulang · rekomendasi untuk periode berikutnya · lampiran foto (opsional).

**Excel:** data mentah lengkap per baris tiket untuk pengolahan lanjutan, dengan kolom yang sudah siap pivot.

Format ini dirancang agar langsung dapat dilampirkan sebagai bukti pertanggungjawaban kontrak *maintenance* tanpa perlu diolah ulang.

---

## 9. Kebutuhan Non-Fungsional *(baru)*

### 9.1 Performa

| Aspek | Target |
|---|---|
| Waktu muat daftar tiket | < 2 detik (jaringan 3G) |
| Waktu simpan Quick-Log | < 1 detik (online), seketika (offline) |
| Muat dashboard 500 tiket | < 3 detik |
| Ketersediaan sistem | ≥ 99% jam kerja |
| Pengguna serentak | 20 (skala awal), dapat diskalakan ke 100 |

### 9.2 Kompatibilitas

- PWA responsif: Chrome/Edge/Safari versi terakhir dan satu versi sebelumnya.
- Android 9+ dan iOS 14+.
- Dapat dipasang ke layar utama (*add to home screen*) dengan ikon dan splash screen.

### 9.3 Keamanan & Privasi

- Seluruh lalu lintas via HTTPS/TLS 1.2+.
- Kredensial disimpan sebagai hash (argon2id atau bcrypt cost ≥12).
- Otorisasi diperiksa **di sisi server** untuk setiap permintaan — menyembunyikan tombol di UI bukanlah kontrol akses.
- Perlindungan terhadap SQL injection, XSS, dan CSRF sebagai persyaratan dasar.
- **Privasi foto:** dokumentasi dapat memuat wajah, layar berisi data, atau tata letak area aman. Lampiran tidak boleh dapat diakses lewat URL publik — wajib melalui *signed URL* berbatas waktu.
- Data pelapor (nama, unit) diperlakukan sebagai data pribadi; ekspor untuk pihak eksternal menyembunyikan kolom ini secara default.
- Pencadangan otomatis harian, disimpan 30 hari, dan **wajib diuji pemulihannya minimal sekali per kuartal** — cadangan yang belum pernah diuji belum tentu cadangan.

### 9.4 Pemeliharaan

- Kode dan skema berversi, migrasi database terdokumentasi.
- Endpoint pemeriksaan kesehatan sistem.
- Pencatatan galat terpusat dengan peringatan bila laju galat melonjak.
- Dokumentasi API bila ada rencana integrasi lanjutan.

---

## 10. Kebijakan Operasional (SOP Penegakan)

Agar aplikasi ini tidak bernasib sama seperti aplikasi presensi sebelumnya, kebijakan berikut diberlakukan — **disertai penyeimbang agar tetap adil.**

### 10.1 Aturan

1. **"No Ticket, No Work."** Pekerjaan yang diklaim dikerjakan tetapi tidak tercatat dianggap tidak terjadi.
2. **Validasi kehadiran lewat aktivitas.** Kehadiran hari kerja dinilai sah dari adanya jejak pergerakan tiket (dibuat, diperbarui, atau diselesaikan), bukan semata absen masuk/pulang.
3. **Closing wajib.** Sebelum meninggalkan lokasi klien, seluruh tiket hari itu harus diperbarui. Tidak boleh ada tiket mengambang di status In Progress tanpa keterangan Pending yang jelas.
4. **Pending harus jujur.** Tiket yang benar-benar tertahan wajib ditandai Pending dengan alasan dan estimasi — bukan dibiarkan di In Progress.

### 10.2 Penyeimbang — Kewajiban Sistem & Manajemen *(baru)*

Kebijakan di atas hanya adil bila sistem memenuhi kewajibannya. **Aturan ini tidak berlaku apabila:**

| Kondisi | Konsekuensi |
|---|---|
| Aplikasi tidak dapat diakses / error | Pencatatan susulan diizinkan tanpa sanksi, ditandai sistem |
| Pengisian Quick-Log rata-rata > 60 detik | Kewajiban ditangguhkan sampai form disederhanakan |
| Tidak ada sinyal dan mode offline gagal | Dicatat sebagai kendala sistem, bukan kelalaian teknisi |
| Tiket pending karena approval manajemen | Durasi tidak dibebankan ke KPI teknisi |

Selain itu:
- **Masa tenggang 30 hari** setelah go-live: kebijakan bersifat edukatif, belum ada sanksi. Fokus pada pembentukan kebiasaan.
- **Pencatatan susulan diizinkan** hingga H+1 dengan penanda `Logging Lag` — lebih baik data telat daripada tidak ada data sama sekali. Memblokir input telat akan membuat pekerjaan yang terlewat hilang selamanya dari catatan.
- **Evaluasi dua arah.** Bila kepatuhan rendah, tinjau dulu apakah aplikasinya merepotkan, sebelum menyimpulkan tekniknya yang tidak disiplin.

### 10.3 Rencana Adopsi

| Tahap | Durasi | Kegiatan |
|---|---|---|
| Persiapan | 1 minggu | Isi master data lokasi & kategori, cetak label QR aset kritikal |
| Pelatihan | 2 hari | Praktik langsung, bukan presentasi. Setiap teknisi membuat 5 tiket nyata |
| Pendampingan | 2 minggu | Paralel dengan cara lama, koreksi harian |
| Penuh | Minggu ke-4 | Cara lama dihentikan |
| Evaluasi | Hari ke-30, 60, 90 | Tinjau metrik §1.5 dan sederhanakan bila perlu |

---

## 11. Roadmap Bertahap

### Fase 1 — MVP (wajib untuk go-live)
Autentikasi · Quick-Log · alur status penuh · modul pending · form penyelesaian · daftar & filter tiket · dashboard KPI dasar · laporan harian teks · master data lokasi & kategori · mode offline · audit log.

### Fase 2 — Kelengkapan Operasional (+4–6 minggu)
Registri aset + QR code · riwayat per aset · preventive maintenance checklist · ekspor PDF/Excel bulanan · notifikasi push & eskalasi · Kanban board · modul serah terima shift · deteksi tiket berulang.

### Fase 3 — Pengembangan Lanjut
Portal mandiri end-user · integrasi WhatsApp Business API · konfirmasi kepuasan pelapor · analitik prediktif (perkiraan kerusakan berikutnya) · manajemen stok sparepart · multi-klien / multi-site · aplikasi native.

> **Saran pelaksanaan:** jangan menunggu Fase 2 selesai untuk merilis. Nilai terbesar produk ini adalah terbentuknya kebiasaan mencatat, dan kebiasaan hanya terbentuk lewat pemakaian nyata. Rilis MVP lebih awal, lalu perbaiki berdasarkan keluhan nyata di lapangan.

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| Teknisi enggan mencatat (terulangnya kegagalan aplikasi presensi) | Tinggi | **Tinggi** | Form ≤20 detik, manfaat balik nyata (§1.3), masa tenggang, evaluasi dua arah |
| Mengisi tiket "asal ada" agar lolos aturan | Tinggi | Sedang | Validasi panjang minimum, penolakan jawaban kosong, tinjauan kualitas oleh Lead |
| Master data aset tidak pernah selesai diisi | Sedang | Tinggi | `asset_id` tidak wajib; impor CSV; isi bertahap sambil jalan |
| Sinyal buruk di area kerja | Tinggi | Tinggi | Mode offline wajib di MVP |
| KPI dipakai menghukum → data dimanipulasi | **Tinggi** | Sedang | Waiting time dipisah, tidak ada peringkat individu publik, §5.4 |
| Inflasi severity (semua ditandai Critical) | Sedang | Sedang | Definisi jelas, peringatan kalibrasi otomatis |
| Beban notifikasi berlebih → notifikasi dimatikan | Sedang | Sedang | Penggabungan, jam senyap, hanya Critical yang mengganggu |
| Foto memakan kuota & penyimpanan | Sedang | Tinggi | Kompresi sisi klien, batas 5MB, unggah tertunda, retensi 1 tahun |
| Lingkup melebar sebelum MVP rilis | Sedang | Sedang | Out of scope ditegaskan di §1.4, roadmap bertahap |

---

## 13. Pertanyaan Terbuka (perlu keputusan sebelum development)

1. **Jumlah teknisi.** Sistem ini dirancang untuk operator tunggal atau tim? Bila tim, perlu diperjelas aturan penugasan dan visibilitas antar teknisi.
2. **Multi-lokasi klien.** Apakah satu instalasi melayani beberapa klien sekaligus? Ini berdampak besar pada arsitektur (perlu `tenant_id` sejak awal — sulit ditambahkan belakangan).
3. **Siapa yang menutup tiket?** Apakah auto-close 2×24 jam dapat diterima, atau Lead wajib meninjau setiap tiket?
4. **Jam siaga.** Bagaimana perlakuan SLA untuk insiden Critical di luar jam kerja dan hari libur?
5. **Hosting.** Server lokal di kantor klien atau cloud? Berdampak pada strategi cadangan, akses jarak jauh, dan biaya.
6. **Kepemilikan data.** Bila kontrak maintenance berakhir, data menjadi milik siapa dan bagaimana diserahkan?
7. **Anggaran & tenggat.** Menentukan apakah Fase 1 dan 2 dapat digabung atau harus dipisah.

---

## 14. Glosarium

| Istilah | Arti |
|---|---|
| **FRT** | *First Response Time* — jeda dari tiket tercatat sampai mulai dikerjakan |
| **MTTR** | *Mean Time To Resolve* — rata-rata durasi pengerjaan, tanpa menghitung waktu tunggu |
| **SLA** | *Service Level Agreement* — target waktu layanan yang disepakati |
| **Breach** | Pelanggaran target SLA |
| **Severity** | Tingkat keparahan dampak insiden terhadap operasional |
| **Pending** | Status tiket yang tertahan oleh faktor di luar kendali teknisi |
| **PM** | *Preventive Maintenance* — pemeriksaan rutin terjadwal |
| **PWA** | *Progressive Web App* — aplikasi web yang dapat dipasang seperti aplikasi ponsel |
| **Waiting Time** | Akumulasi durasi tiket berstatus Pending |
| **Logging Lag** | Selisih antara waktu kejadian nyata dan waktu pencatatan |

---

## Lampiran A — Contoh Acceptance Criteria

Format *Given–When–Then* untuk dipakai tim QA.

**AC-01 — Quick-Log tidak boleh lambat**
> **Diberikan** teknisi berada di daftar tiket, **ketika** ia menekan FAB, mengisi uraian, memilih lokasi dan kategori, lalu menyimpan, **maka** tiket tersimpan dalam < 1 detik dan seluruh proses dapat diselesaikan dalam ≤ 20 detik oleh pengguna terlatih.

**AC-02 — Timestamp tidak dapat dimanipulasi**
> **Diberikan** jam perangkat diubah mundur 3 jam, **ketika** teknisi membuat tiket, **maka** `created_at` tetap mengikuti waktu server, dan `client_time` yang menyimpang tercatat di audit log.

**AC-03 — Offline tetap berfungsi**
> **Diberikan** perangkat dalam mode pesawat, **ketika** teknisi membuat 3 tiket dan mengubah 1 status, **maka** seluruh perubahan tersimpan lokal, indikator menampilkan "Menunggu kirim (4)", dan tersinkron otomatis tanpa duplikasi saat koneksi pulih.

**AC-04 — Penyelesaian tidak boleh asal**
> **Diberikan** teknisi membuka form penyelesaian, **ketika** ia mengisi akar masalah dengan "rusak" (5 karakter), **maka** sistem menolak dan menampilkan pesan disertai contoh pengisian yang benar.

**AC-05 — MTTR mengecualikan waktu tunggu**
> **Diberikan** tiket direspon pukul 09:00, pending pukul 10:00–15:00, lalu selesai pukul 16:00, **maka** MTTR tercatat 2 jam dan Waiting Time 5 jam.

**AC-06 — Tiket terkunci setelah closed**
> **Diberikan** tiket berstatus CLOSED, **ketika** teknisi mencoba mengubah isinya lewat API langsung, **maka** server menolak dengan kode 403 dan upaya tersebut tercatat di audit log.

**AC-07 — Eskalasi Critical berjalan**
> **Diberikan** tiket Critical dibuat pukul 09:00 dan belum direspon, **maka** teknisi menerima notifikasi pukul 09:15 dan Lead menerima eskalasi pukul 09:30.

---

## Lampiran B — Daftar Periksa Kesiapan Go-Live

**Data:** master lokasi terisi · master kategori terisi · akun pengguna dibuat · aset kritikal terdaftar & berlabel QR · kalender kerja & hari libur dikonfigurasi

**Teknis:** cadangan otomatis aktif & sudah diuji pulih · HTTPS aktif · pemantauan galat aktif · uji beban 20 pengguna serentak lolos · uji offline lolos

**Manusia:** teknisi sudah pelatihan praktik · Lead paham cara baca dashboard · SOP tertulis dibagikan · jalur bantuan bila aplikasi bermasalah ditetapkan · tanggal evaluasi 30/60/90 hari dijadwalkan

---

*Dokumen ini adalah revisi dari PRD v1.0.0. Bagian bertanda "(baru)" merupakan tambahan. Seluruh pertanyaan pada §13 sebaiknya dijawab sebelum status dokumen dinaikkan menjadi "Approved for Development".*
