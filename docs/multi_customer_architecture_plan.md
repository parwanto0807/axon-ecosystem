# Rencana Implementasi: Arsitektur Multi-Customer & RBAC Multi-Assignment (IT-OSL)

Dokumen ini merinci arsitektur, skema database, aturan hak akses peran (*Role-Based Access Control*), dan alur antarmuka untuk mendukung sistem **Multi-Customer** pada modul Maintenance IT-OSL.

---

## 1. Ringkasan & Tujuan Arsitektur

Saat ini modul IT-OSL mencatat tiket, aset, PIC, dan lokasi secara global. Perubahan arsitektur ini bertujuan untuk:
1. **Isolasi Data per Customer / Klien**: Setiap customer memiliki daftar lokasi, PIC, aset, jadwal maintenance, dan tiket kendala tersendiri.
2. **Role-Based Access Control (RBAC)**:
   - **`SUPER_ADMIN` & `ADMIN`**: Memiliki akses penuh melihat, mengelola, dan memfilter seluruh data customer (*unrestricted global access*).
   - **`OPERASIONAL` (Teknisi / Staff)**: Hanya dapat melihat dan mengelola data customer yang **secara eksplisit ditugaskan** kepadanya.
3. **Multi-Assignment**: Satu teknisi operasional dapat ditugaskan untuk menangani **lebih dari satu customer** (relasi *many-to-many*).

---

## 2. Struktur Database & Skema Prisma

### A. Model Baru: `ItOslCustomer` & `ItOslUserCustomer`
```prisma
// Master Customer / Klien
model ItOslCustomer {
  id           String              @id @default(cuid())
  code         String              @unique // Contoh: CUST-001, MAJU-JAYA
  name         String              // Nama Perusahaan / Instansi
  companyType  String?             // Retail, Rumah Sakit, Kantor, Pabrik, dll.
  phone        String?             // Kontak Telepon Kantor / Hotline
  email        String?             // Email Resmi
  address      String?             @db.Text
  logo         String?             // URL Logo Perusahaan
  contractStart DateTime?
  contractEnd  DateTime?           // Masa berlaku kontrak SLA/Maintenance
  notes        String?             @db.Text
  isActive     Boolean             @default(true)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  // Relasi Data Terkait
  locations    ItOslLocation[]
  pics         ItOslPic[]
  assets       ItOslAsset[]
  tickets      ItOslTicket[]
  pmSchedules  ItOslPmSchedule[]
  assignedUsers ItOslUserCustomer[]
}

// Pivot Table Many-to-Many: Penugasan Teknisi Operasional ke Customer
model ItOslUserCustomer {
  id         String        @id @default(cuid())
  userId     String
  customerId String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  customer   ItOslCustomer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  assignedAt DateTime      @default(now())

  @@unique([userId, customerId])
  @@index([userId])
  @@index([customerId])
}
```

### B. Relasi Kolom `customerId` pada Model yang Sudah Ada
Kolom `customerId String?` ditambahkan ke model:
- `ItOslLocation` (`customerId` -> `ItOslCustomer`)
- `ItOslPic` (`customerId` -> `ItOslCustomer`)
- `ItOslAsset` (`customerId` -> `ItOslCustomer`)
- `ItOslTicket` (`customerId` -> `ItOslCustomer`)
- `ItOslPmSchedule` (`customerId` -> `ItOslCustomer`)

---

## 3. Aturan Otorisasi & Logika Backend

### A. Helper Otorisasi Data Customer (`getCustomerScope`)
Di backend (`backend/routes/it-osl.js`), dibuat helper untuk menyaring query secara otomatis:

```javascript
async function getCustomerScope(req) {
  const role = String(req.headers['x-user-role'] || '').toUpperCase();
  const userId = req.headers['x-user-id'];

  // Super Admin & Admin memiliki akses penuh ke semua customer
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return { isGlobal: true, allowedCustomerIds: null };
  }

  // User Operasional hanya mengakses customer yang ditugaskan
  const assignments = await prisma.itOslUserCustomer.findMany({
    where: { userId: String(userId) },
    select: { customerId: true }
  });
  
  const allowedCustomerIds = assignments.map(a => a.customerId);
  return { isGlobal: false, allowedCustomerIds };
}
```

### B. Penerapan pada Query Data (Tickets, Assets, PIC, Locations)
- Jika `isGlobal === true` dan parameter `customerId` dikirim: filter `where.customerId = req.query.customerId`.
- Jika `isGlobal === false`:
  - Jika user meminta `customerId` tertentu yang masuk dalam `allowedCustomerIds`: filter `where.customerId = req.query.customerId`.
  - Jika tidak ada query spesifik: filter `where.customerId = { in: allowedCustomerIds }`.
  - Jika user mencoba mengakses data customer di luar haknya: kembalikan `403 Forbidden`.

---

## 4. Rencana Implementasi Antarmuka (Frontend)

### A. Halaman Master Customer (`/dashboard/maintenance/it-osl/customers`)
1. **Daftar Customer**:
   - Card/Tabel berisi: Nama Customer, Kode, Tipe Perusahaan, Kontak, Masa Kontrak, Jumlah Aset, Jumlah Tiket Aktif.
   - Badge daftar teknisi operasional yang ditugaskan (*assigned technicians*).
2. **Form Tambah / Edit Customer**:
   - Field: Nama, Kode, Kategori, Telepon, Email, Alamat, Logo, Masa Kontrak.
   - **Multi-Select Teknisi Operasional**: Checklist nama-nama user operasional yang berhak menangani customer ini.
3. **Detail Customer**:
   - Tab navigasi: Overview, Aset Customer, PIC Customer, Lokasi Cabang, Tiket Aktif, dan Riwayat Maintenance.

### B. Global Customer Switcher (Header / Toolbar)
- Dropdown di bagian atas halaman (Header atau Floating Nav):
  - **Super Admin**: Pilihan `Semua Customer (All)` + daftar semua customer aktif.
  - **Operasional**: Hanya daftar customer yang ditugaskan kepadanya.
- Saat customer dipilih, seluruh halaman (Tiket, Aset, PIC, Jadwal) otomatis memuat data customer yang sedang aktif.

### C. Cascading Dropdown pada Form Input
- **Form Tiket Baru**:
  1. Pilih Customer (otomatis terpilih jika switcher aktif).
  2. Dropdown PIC, Lokasi, dan Aset otomatis difilter hanya menampilkan data milik customer tersebut.
- **Form Aset Baru**:
  1. Pilih Customer.
  2. Dropdown Lokasi dan PIC otomatis difilter sesuai customer tersebut.

---

## 5. Rencana Tahapan Eksekusi (Phase by Phase)

### 🔹 Fase 1: Database & Skema Prisma
- Update `backend/prisma/schema.prisma` dengan model `ItOslCustomer`, `ItOslUserCustomer`, serta relasi `customerId`.
- Jalankan migrasi `npx prisma db push` dan generate Prisma Client.

### 🔹 Fase 2: Backend API Endpoints & RBAC Scoping
- Buat endpoint CRUD Customer (`GET /api/it-osl/customers`, `POST`, `PUT`, `DELETE`).
- Buat endpoint penugasan teknisi (`POST /api/it-osl/customers/:id/assign-technicians`).
- Terapkan `getCustomerScope` pada endpoint Tiket, Aset, PIC, Lokasi, dan Preventive Maintenance.

### 🔹 Fase 3: Halaman Master Customer & Penugasan Teknisi
- Buat halaman `/dashboard/maintenance/it-osl/customers/page.tsx` dengan UI modern, responsif mobile, modal penugasan teknisi, dan pencarian.
- Tambahkan navigasi menu Customer pada sidebar & bottom navigation.

### 🔹 Fase 4: Global Customer Switcher & Cascading Forms
- Pasang Customer Context / Global Switcher di header IT-OSL.
- Sinkronisasi filter otomatis pada halaman Tiket, Aset, PIC, dan Lokasi.
- Update modal form Tambah Tiket & Tambah Aset dengan validasi relasi customer.

---

## 6. Rencana Pengujian & Verifikasi

1. **Pengujian Hak Akses Super Admin**:
   - Verifikasi Super Admin dapat melihat seluruh customer dan menugaskan teknisi operasional.
2. **Pengujian Hak Akses Teknisi Operasional**:
   - Login sebagai User Operasional A (ditugaskan ke Customer 1 & 2).
   - Pastikan User Operasional A **tidak dapat** melihat aset, tiket, atau PIC milik Customer 3.
3. **Pengujian Multi-Assignment**:
   - Pastikan 1 customer dapat ditugaskan ke beberapa teknisi, dan 1 teknisi dapat mengelola beberapa customer.
4. **Pengujian Validasi Form Cascading**:
   - Pastikan saat memilih Customer A pada form tiket, daftar PIC dan Aset yang muncul hanya milik Customer A.
