# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Modul Executive Summary - Menu Laporan Keuangan
**Ringkasan Eksekutif berbasis data Neraca, Laba Rugi, dan Arus Kas**

| Atribut | Keterangan |
| :--- | :--- |
| **Nama Dokumen** | PRD - Modul Executive Summary Laporan Keuangan |
| **Versi** | 1.0 |
| **Tanggal Dibuat** | 31 Juli 2026 |
| **Status** | Draft untuk Review |
| **Modul Terkait** | Menu Laporan Keuangan (Financial Report) |
| **Pemilik Dokumen** | Product Manager / Business Analyst |

---

## 1. Latar Belakang
Saat ini menu Laporan Keuangan menyajikan Neraca, Laba Rugi, dan Arus Kas secara terpisah dalam format tabel yang detail. Format ini sangat berguna bagi tim akuntansi/finance untuk keperluan pencatatan dan audit, namun cukup menyulitkan bagi manajemen (Direksi, Owner, Kepala Divisi) yang membutuhkan gambaran cepat mengenai kondisi kesehatan keuangan perusahaan tanpa harus membaca puluhan baris akun satu per satu.

Modul Executive Summary hadir sebagai halaman ringkasan tingkat tinggi (*high-level overview*) yang mengolah data dari ketiga laporan tersebut menjadi informasi yang ringkas, visual, dan mudah diambil keputusan (*decision-ready*).

---

## 2. Tujuan
- **Kecepatan Pengambilan Keputusan**: Memberikan gambaran kondisi keuangan perusahaan dalam hitungan detik melalui highlight angka-angka kunci.
- **Visualisasi yang Mudah Dipahami**: Mengubah data tabular menjadi grafik, kartu metrik, dan indikator warna (*green/red flag*) agar mudah dibaca oleh non-finance.
- **Konsolidasi 3 Laporan**: Menyatukan insight dari Neraca, Laba Rugi, dan Arus Kas dalam satu tampilan yang saling berhubungan.
- **Deteksi Dini Masalah Keuangan**: Menampilkan indikator/rasio yang dapat memberi peringatan dini (*early warning*) atas potensi masalah likuiditas, profitabilitas, atau solvabilitas.

---

## 3. Ruang Lingkup (Scope)
Modul ini merupakan bagian dari menu "Laporan Keuangan" yang sudah ada, ditambahkan sebagai sub-menu baru bernama "Executive Summary". Modul ini bersifat *read-only* (tampilan/report), tidak melakukan input transaksi, dan datanya sepenuhnya bergantung pada data yang sudah tercatat pada modul Neraca, Laba Rugi, dan Arus Kas.

### Di luar cakupan (Out of Scope)
Modul ini tidak mencakup: input/edit jurnal akuntansi, proses tutup buku (*closing period*), export ke sistem pihak ketiga, serta proyeksi/forecast keuangan berbasis AI (dapat menjadi rencana pengembangan fase berikutnya).

---

## 4. Target Pengguna
| Role | Kebutuhan Utama |
| :--- | :--- |
| **Direktur / Owner** | Ringkasan cepat kondisi perusahaan, tanpa perlu membaca laporan detail |
| **Finance Manager / Controller** | Analisis rasio, tren, dan validasi kesehatan keuangan sebelum rapat |
| **Kepala Divisi / Manajer Operasional** | Memahami dampak kinerja divisi terhadap keuangan perusahaan secara umum |
| **Investor / Pemegang Saham** *(jika relevan)* | Gambaran performa dan pertumbuhan perusahaan dari waktu ke waktu |

---

## 5. Sumber Data & Referensi Laporan
Executive Summary tidak menyimpan data baru, melainkan menarik (*fetch*) dan mengagregasi data dari 3 laporan utama berikut:

| Sumber Laporan | Data yang Diambil | Kegunaan di Executive Summary |
| :--- | :--- | :--- |
| **Neraca (Balance Sheet)** | Total Aset, Liabilitas (Kewajiban), Ekuitas, Kas & Setara Kas, Piutang, Persediaan, Utang Jangka Pendek/Panjang | Menilai struktur permodalan, likuiditas, dan solvabilitas perusahaan |
| **Laba Rugi (Income Statement)** | Pendapatan (Revenue), HPP, Laba Kotor, Beban Operasional, Laba Bersih (Net Profit), EBITDA | Menilai profitabilitas dan efisiensi operasional |
| **Arus Kas (Cash Flow Statement)** | Arus Kas Operasi, Investasi, Pendanaan, Kas Awal & Akhir Periode | Menilai kemampuan perusahaan menghasilkan & mengelola kas riil |

> **Catatan:** Seluruh data harus bersumber dari periode yang sudah difinalisasi (*posted/locked*) agar angka pada Executive Summary konsisten dengan laporan detail, guna menghindari selisih data (*data mismatch*) antara ringkasan dan laporan sumber.

---

## 6. Struktur Konten Executive Summary

### 6.1 Header & Filter Periode
Bagian paling atas halaman berisi filter yang mengontrol seluruh konten di bawahnya.
- **Filter Periode**: Bulanan, Kuartalan, Tahunan, atau Custom Range
- **Filter Perbandingan**: Periode ini vs Periode sebelumnya (MoM/QoQ/YoY), atau vs Anggaran (Budget)
- **Filter Entitas/Cabang**: (Jika perusahaan memiliki multi-cabang atau multi-entitas)
- **Tombol "Export"**: (PDF/Excel) untuk kebutuhan presentasi ke manajemen

*Penjelasan*: Filter ini penting karena Executive Summary akan sering digunakan sebagai bahan rapat rutin (mingguan/bulanan), sehingga pengguna perlu fleksibilitas membandingkan performa antar periode tanpa membuka laporan detail satu per satu.

### 6.2 Kartu Ringkasan Kinerja Utama (Key Highlight Cards)
Menampilkan 4-6 kartu metrik paling penting dalam bentuk angka besar, dilengkapi indikator naik/turun (panah hijau/merah) dibanding periode sebelumnya.

| Kartu Metrik | Sumber Laporan | Penjelasan |
| :--- | :--- | :--- |
| **Total Pendapatan (Revenue)** | Laba Rugi | Total penjualan/pendapatan pada periode berjalan |
| **Laba Bersih (Net Profit)** | Laba Rugi | Hasil akhir setelah dikurangi seluruh beban dan pajak |
| **Total Aset** | Neraca | Total kekayaan yang dimiliki perusahaan |
| **Kas & Setara Kas** | Neraca / Arus Kas | Saldo kas yang tersedia saat ini, indikator likuiditas sesaat |
| **Arus Kas Operasi Bersih** | Arus Kas | Kas riil yang dihasilkan dari aktivitas bisnis utama |
| **Total Liabilitas (Utang)** | Neraca | Total kewajiban perusahaan kepada pihak ketiga |

*Penjelasan*: Kartu ini dirancang agar dapat dibaca dalam waktu kurang dari 10 detik. Prinsipnya adalah "angka besar, konteks jelas" — setiap kartu wajib menampilkan nilai, persentase perubahan, dan panah tren agar user langsung tahu apakah kondisi membaik atau memburuk.

### 6.3 Ringkasan Neraca (Balance Sheet Summary)
- Grafik komposisi Aset: Aset Lancar vs Aset Tidak Lancar (*donut chart*)
- Grafik komposisi Pendanaan: Liabilitas vs Ekuitas (*stacked bar/donut chart*)
- Ringkasan 5 akun aset & liabilitas terbesar (*top contributors*)
- **Working Capital (Modal Kerja)** = Aset Lancar - Liabilitas Jangka Pendek

*Penjelasan*: Bagian ini menjawab pertanyaan "Seberapa sehat struktur keuangan perusahaan?". Komposisi aset dan sumber pendanaan (utang vs modal sendiri) menunjukkan seberapa besar ketergantungan perusahaan terhadap pihak ketiga (kreditur) dibanding modal sendiri.

### 6.4 Ringkasan Laba Rugi (Income Statement Summary)
- Grafik tren Pendapatan vs Laba Bersih selama 6-12 periode terakhir (*line/bar chart*)
- Waterfall chart: Pendapatan → HPP → Laba Kotor → Beban Operasional → Laba Bersih
- Margin Laba Kotor (*Gross Profit Margin*) dan Margin Laba Bersih (*Net Profit Margin*)
- Perbandingan Realisasi vs Anggaran (Budget), jika tersedia

*Penjelasan*: Waterfall chart sangat efektif untuk menunjukkan "ke mana perginya" pendapatan perusahaan sebelum menjadi laba bersih, sehingga manajemen dapat langsung melihat komponen beban mana yang paling signifikan menggerus profit.

### 6.5 Ringkasan Arus Kas (Cash Flow Summary)
- Grafik arus kas masuk vs keluar per kategori: Operasi, Investasi, Pendanaan
- Tren Saldo Kas Awal → Kas Akhir per periode (untuk melihat pola kas sepanjang waktu)
- **Free Cash Flow** = Arus Kas Operasi - Belanja Modal (Capex)
- Indikator peringatan jika Arus Kas Operasi bernilai negatif dalam 2 periode berturut-turut

*Penjelasan*: Laba akuntansi (*accrual*) tidak selalu sama dengan kas riil di tangan. Bagian ini penting untuk memastikan perusahaan tidak mengalami "profit tapi kas kosong" (*profitable but cash-poor*), yang merupakan salah satu penyebab umum kegagalan bisnis.

### 6.6 Rasio Keuangan Utama (Key Financial Ratios)
Rasio-rasio ini dihitung otomatis dari gabungan data ketiga laporan, ditampilkan dengan indikator status (Baik/Waspada/Kritis) berbasis threshold yang dapat dikonfigurasi.

| Kategori | Rasio | Formula | Insight |
| :--- | :--- | :--- | :--- |
| **Likuiditas** | Current Ratio | Aset Lancar / Liabilitas Lancar | Kemampuan bayar utang jangka pendek |
| **Likuiditas** | Quick Ratio | (Aset Lancar - Persediaan) / Liabilitas Lancar | Likuiditas tanpa mengandalkan persediaan |
| **Profitabilitas** | Net Profit Margin | Laba Bersih / Pendapatan | Efisiensi menghasilkan laba dari penjualan |
| **Profitabilitas** | ROA | Laba Bersih / Total Aset | Efektivitas penggunaan aset menghasilkan laba |
| **Profitabilitas** | ROE | Laba Bersih / Total Ekuitas | Imbal hasil bagi pemilik modal |
| **Solvabilitas** | Debt to Equity Ratio | Total Liabilitas / Total Ekuitas | Tingkat ketergantungan pada utang |
| **Efisiensi Kas** | Cash Conversion | Arus Kas Operasi / Laba Bersih | Kualitas laba (apakah didukung kas riil) |

*Penjelasan*: Rasio adalah bahasa universal keuangan yang memungkinkan perbandingan antar periode maupun antar perusahaan. Status indikator (misalnya Current Ratio < 1 = "Waspada") membantu user awam memahami makna angka tanpa perlu latar belakang akuntansi.

### 6.7 Insight & Rekomendasi Otomatis (Narrative Insight)
Sebuah panel berbasis *rule-based logic* (bukan opini bebas) yang menampilkan 3-5 poin catatan otomatis berdasarkan perubahan data signifikan, contoh:
- *"Laba bersih naik 12% dibanding bulan lalu, didorong oleh kenaikan pendapatan sebesar 8%."*
- *"Current Ratio turun menjadi 0.9, berada di bawah batas aman 1.0 - perlu perhatian pada likuiditas."*
- *"Arus kas operasi negatif selama 2 bulan berturut-turut, meski laba bersih positif."*

*Penjelasan*: Fitur ini mengubah data pasif menjadi insight aktif, sehingga user tidak perlu menginterpretasikan grafik sendiri. Logika dibuat berbasis aturan (*rule-based*) berdasarkan threshold, bukan AI generatif, agar keakuratan dan konsistensi datanya terjaga dan dapat dipertanggungjawabkan secara audit.

### 6.8 Drill-Down ke Laporan Detail
Setiap grafik/kartu pada Executive Summary dapat diklik untuk langsung menuju halaman laporan detail terkait (Neraca, Laba Rugi, atau Arus Kas) dengan filter periode yang sama otomatis terbawa.

*Penjelasan*: Ini menjaga konsistensi navigasi dan mempercepat user yang ingin menelusuri lebih dalam sebuah angka tanpa perlu mengatur ulang filter dari awal.

---

## 7. Functional Requirements

| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| **FR-01** | Sistem menampilkan filter periode (bulan/kuartal/tahun/custom) yang mengontrol seluruh konten halaman | Must Have |
| **FR-02** | Sistem menampilkan kartu ringkasan (*highlight cards*) minimal 6 metrik utama beserta persentase perubahan | Must Have |
| **FR-03** | Sistem menampilkan grafik komposisi Neraca (aset & pendanaan) | Must Have |
| **FR-04** | Sistem menampilkan grafik tren & waterfall Laba Rugi | Must Have |
| **FR-05** | Sistem menampilkan grafik arus kas per kategori (operasi/investasi/pendanaan) | Must Have |
| **FR-06** | Sistem menghitung dan menampilkan rasio keuangan utama otomatis beserta status indikator | Must Have |
| **FR-07** | Sistem menampilkan panel insight otomatis berbasis rule/threshold | Should Have |
| **FR-08** | Setiap komponen visual dapat di-drill-down ke laporan detail terkait | Should Have |
| **FR-09** | Sistem menyediakan fitur export Executive Summary ke PDF/Excel | Should Have |
| **FR-10** | Sistem mendukung filter perbandingan antar entitas/cabang (multi-entity) | Could Have |

---

## 8. Non-Functional Requirements

| Aspek | Kebutuhan |
| :--- | :--- |
| **Performa** | Halaman harus dapat memuat data (*load*) dalam waktu maksimal 3 detik untuk periode 1 tahun data |
| **Akurasi Data** | Angka pada Executive Summary harus 100% konsisten dengan laporan sumber (Neraca/Laba Rugi/Arus Kas) |
| **Keamanan (Security)** | Akses modul dibatasi berdasarkan role/hak akses pengguna (*role-based access control*) |
| **Kompatibilitas** | Tampilan responsif dan dapat diakses melalui desktop maupun tablet |
| **Auditability** | Setiap angka ringkasan harus dapat ditelusuri (*traceable*) kembali ke sumber datanya |

---

## 9. Alur Pengguna (User Flow)
1. User login dan membuka menu "Laporan Keuangan"
2. User memilih sub-menu "Executive Summary"
3. Sistem menampilkan data default (periode berjalan, dibandingkan periode sebelumnya)
4. User dapat mengubah filter periode/pembanding/entitas sesuai kebutuhan
5. Sistem memperbarui seluruh kartu, grafik, rasio, dan insight secara otomatis
6. User dapat klik salah satu grafik/kartu untuk melihat detail laporan terkait
7. User dapat melakukan export halaman ke PDF/Excel untuk bahan presentasi

---

## 10. Kriteria Penerimaan (Acceptance Criteria)

| No | Skenario | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| **1** | User memilih periode "Bulan Ini" | Seluruh kartu, grafik, dan rasio menampilkan data bulan berjalan, dibandingkan bulan sebelumnya |
| **2** | Data pada salah satu laporan sumber belum final/posted | Sistem menampilkan notifikasi bahwa data masih sementara (draft) dan dapat berubah |
| **3** | User klik kartu "Total Pendapatan" | Sistem mengarahkan ke halaman Laba Rugi detail dengan filter periode yang sama |
| **4** | Current Ratio di bawah 1.0 | Sistem menampilkan indikator warna merah/kuning dan insight peringatan otomatis |
| **5** | User klik tombol Export | Sistem menghasilkan file PDF/Excel yang sesuai tampilan layar |

---

## 11. Rencana Pengembangan (Roadmap Fase)

| Fase | Cakupan |
| :--- | :--- |
| **Fase 1 (MVP)** | Highlight cards, ringkasan Neraca/Laba Rugi/Arus Kas, filter periode dasar |
| **Fase 2** | Rasio keuangan otomatis, drill-down ke laporan detail, export PDF/Excel |
| **Fase 3** | Insight otomatis (*rule-based*), perbandingan multi-entitas/cabang |
| **Fase 4 (Opsional)** | Proyeksi & forecast berbasis tren historis (analitik lanjutan) |

---

## 12. Lampiran: Daftar Istilah

| Istilah | Penjelasan |
| :--- | :--- |
| **Neraca (Balance Sheet)** | Laporan posisi keuangan yang menunjukkan Aset, Liabilitas, dan Ekuitas pada suatu tanggal tertentu |
| **Laba Rugi (Income Statement)** | Laporan yang menunjukkan pendapatan, beban, dan laba/rugi selama satu periode |
| **Arus Kas (Cash Flow Statement)** | Laporan yang menunjukkan pergerakan kas masuk dan keluar selama satu periode |
| **MoM / QoQ / YoY** | Month over Month / Quarter over Quarter / Year over Year — perbandingan periode berjalan dengan periode sebelumnya |
| **Drill-down** | Kemampuan untuk masuk ke level data yang lebih detail dari sebuah ringkasan |
| **Rule-based** | Logika otomatis berdasarkan aturan/ambang batas (*threshold*) yang telah ditentukan, bukan berdasarkan opini bebas |
