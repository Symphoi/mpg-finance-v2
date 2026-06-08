# Timesheet — MPG Finance v2
**Periode:** Mei 2026  
**Project:** Pengembangan Sistem Keuangan MPG Finance v2  
**Stack:** Next.js 15, TypeScript, MySQL 8, Tailwind CSS  

---

| No | Tanggal | Hari | Jam Mulai | Jam Selesai | Durasi | Deskripsi Pekerjaan |
|----|---------|------|-----------|-------------|--------|---------------------|
| 1  | 01 Mei 2026 | Jumat | 18:30 | 21:30 | 3,0 jam | Analisis kebutuhan sistem dan review codebase v1. Identifikasi bug kritikal: token auth disimpan di localStorage (XSS risk), upload endpoint 404, sidebar link broken, dan hardcoded data di dashboard. Buat daftar prioritas perbaikan. |
| 2  | 02 Mei 2026 | Sabtu | 19:00 | 22:00 | 3,0 jam | Setup project Next.js 15 App Router dari awal. Konfigurasi TypeScript strict mode, Tailwind CSS dengan design token (color, border, font), folder structure `app/(app)/`, `app/api/`, `lib/`, `components/`. |
| 3  | 04 Mei 2026 | Senin | 18:30 | 20:30 | 2,0 jam | Desain dan review database schema MySQL. Perbaikan tabel `journal_entries`, `journal_items`, `chart_of_accounts`. Setup koneksi pool di `app/lib/db.ts` dengan fix bug number-to-string conversion. |
| 4  | 05 Mei 2026 | Selasa | 18:30 | 21:00 | 2,5 jam | Implementasi sistem autentikasi: JWT disimpan di httpOnly cookie (migrasi dari localStorage), middleware `withAuth()` untuk proteksi semua API route, fungsi login/logout. |
| 5  | 06 Mei 2026 | Rabu | 19:00 | 22:30 | 3,5 jam | Build komponen Sidebar dengan collapse groups (Sales & Procurement, Cash Advance, Reimbursement, Akuntansi, Laporan, Master Data). Topbar dengan breadcrumb. Setup layout shell `app/(app)/layout.tsx`. |
| 6  | 07 Mei 2026 | Kamis | 18:30 | 21:30 | 3,0 jam | Implementasi API Sales Order: `GET /api/sales-orders` dengan pagination dan filter status, `POST` create dengan validasi. Standardisasi response format `{ success, data, meta }`. |
| 7  | 08 Mei 2026 | Jumat | 19:00 | 21:00 | 2,0 jam | Halaman Sales Order (`/salesorder`): tabel data dengan status badge, filter dropdown, tombol create. Implementasi `useApi()` custom hook untuk fetch data. |
| 8  | 09 Mei 2026 | Sabtu | 18:00 | 22:00 | 4,0 jam | Implementasi Purchase Order end-to-end: API route dengan `?action=dropdowns` (GET, menggantikan HTTP OPTIONS yang non-standard di v1), halaman list + form create dengan line items. |
| 9  | 11 Mei 2026 | Senin | 18:30 | 21:00 | 2,5 jam | Approval workflow Purchase Order: GET list PO pending approval, POST approve/reject dengan komentar, update status `submitted → approved_spv → approved_finance`. Badge status color-coded. |
| 10 | 12 Mei 2026 | Selasa | 19:00 | 21:30 | 2,5 jam | Modul Delivery Order: generate DO dari Sales Order yang sudah diapprove, update status `not_created → created → shipped → delivered`. Integrasi dengan status SO. |
| 11 | 13 Mei 2026 | Rabu | 18:30 | 22:00 | 3,5 jam | Invoice & Payment: generate invoice dari SO completed, halaman list invoice, fitur mark-paid, integrasi trigger otomatis jurnal akuntansi saat pembayaran dikonfirmasi. |
| 12 | 14 Mei 2026 | Kamis | 19:00 | 21:30 | 2,5 jam | Fix bug upload endpoint: rename `routes.js` → `route.ts` (Next.js App Router convention). Implementasi `POST /api/upload` untuk file attachment (bukti pembayaran, dokumen). |
| 13 | 15 Mei 2026 | Jumat | 18:30 | 20:30 | 2,0 jam | Numbering Sequences: sistem auto-generate kode dokumen per tipe transaksi (SO-YYYYMM-XXXX, PO, CA, dll). API `GET/POST /api/numbering-sequences`. |
| 14 | 18 Mei 2026 | Senin | 18:30 | 22:00 | 3,5 jam | Cash Advance modul lengkap: create CA dengan estimasi kebutuhan, approval flow (`submitted → approved → active`), settlement dengan bukti pengeluaran, update status otomatis `fully_used / partially_used → completed`. |
| 15 | 19 Mei 2026 | Selasa | 19:00 | 21:30 | 2,5 jam | Reimbursement modul: form create dengan multiple line items, upload bukti pengeluaran, halaman approval dengan detail rincian, flow `submitted → approved / rejected`. |
| 16 | 20 Mei 2026 | Rabu | 18:30 | 22:30 | 4,0 jam | Implementasi `lib/accounting.ts`: engine auto-jurnal untuk setiap tipe transaksi. Mapping debit/kredit otomatis: SO → AR, PO → AP, CA → Cash, Payment → Bank. Standardisasi akun per tipe reference. |
| 17 | 21 Mei 2026 | Kamis | 19:00 | 22:00 | 3,0 jam | Manual Journal: form input jurnal manual dengan multiple baris debit/kredit, validasi total debit = total kredit sebelum submit, preview sebelum posting, status `draft → posted`. |
| 18 | 22 Mei 2026 | Jumat | 18:30 | 21:30 | 3,0 jam | Bank Accounts & Rekonsiliasi: halaman saldo bank per akun, fitur rekonsiliasi transaksi bank vs jurnal, matching otomatis berdasarkan nominal dan tanggal, status `reconciled / unreconciled`. |
| 19 | 23 Mei 2026 | Sabtu | 18:00 | 23:00 | 5,0 jam | Trial Balance: query agregasi saldo per akun dari `journal_items`, grouping by `account_type`, filter periode dan perusahaan. Export ke format tabel. Backup database `backup-mpgfinance-23-may.sql`. |
| 20 | 25 Mei 2026 | Senin | 18:30 | 22:00 | 3,5 jam | General Ledger: detail mutasi per akun dengan saldo berjalan (running balance), filter by akun, tanggal, dan perusahaan. Tampilkan jurnal referensi (SO/PO/CA) sebagai source transaksi. |
| 21 | 26 Mei 2026 | Selasa | 19:00 | 22:30 | 3,5 jam | Income Statement: laporan laba rugi dengan grouping Pendapatan vs Beban, kalkulasi Net Income. Balance Sheet: neraca Aset vs Liabilitas + Ekuitas per periode. |
| 22 | 27 Mei 2026 | Rabu | 18:30 | 22:00 | 3,5 jam | Dashboard Konsolidasi: KPI cards (Total Aset, Liabilitas, Ekuitas, Laba Bersih), tabel Neraca dan Laba Rugi real-time dari query trial balance multi-company. Auto-refresh setiap 5 menit. |
| 23 | 28 Mei 2026 | Kamis | 19:00 | 23:00 | 4,0 jam | Intercompany modul: tracking piutang inter-company (akun 1150) dan hutang inter-company (akun 2150) antar entitas. Laporan posisi interco per perusahaan. Eliminasi otomatis dalam laporan konsolidasi. |
| 24 | 29 Mei 2026 | Jumat | 18:30 | 21:30 | 3,0 jam | Testing end-to-end seluruh flow transaksi: SO → Approval DO → Invoice → Payment → Jurnal → Trial Balance. Validasi angka di setiap step, pastikan jurnal otomatis terbentuk dengan benar. |
| 25 | 30 Mei 2026 | Sabtu | 18:00 | 22:00 | 4,0 jam | Bug fixing: perbaiki query neraca tidak balance (ekuitas belum include net income), fix filter company dashboard tidak diterapkan ke query eliminasi interco, fix design mismatch warna tema purple vs beige di dashboard. |
| 26 | 31 Mei 2026 | Minggu | 19:00 | 22:00 | 3,0 jam | Finalisasi: code cleanup, perbaiki komponen `Lineitemstable.tsx` dan `Statusprogress.tsx`, dokumentasi perubahan di `CATATAN-PERUBAHAN.md`, persiapan build production dan deployment ke server. |

---

## Rekapitulasi

| Minggu | Tanggal | Total Jam |
|--------|---------|-----------|
| Minggu 1 | 01 – 04 Mei | 8,0 jam |
| Minggu 2 | 05 – 09 Mei | 15,0 jam |
| Minggu 3 | 11 – 15 Mei | 13,0 jam |
| Minggu 4 | 18 – 22 Mei | 16,0 jam |
| Minggu 5 | 23 – 27 Mei | 16,0 jam |
| Minggu 6 | 28 – 31 Mei | 14,0 jam |
| **TOTAL** | **Mei 2026** | **82,0 jam** |

---

## Ringkasan Pekerjaan

| Modul | Jam |
|-------|-----|
| Setup & Arsitektur | 8,0 jam |
| Auth & Middleware | 2,5 jam |
| Sales & Purchase Order | 9,0 jam |
| Approval & Delivery | 5,0 jam |
| Cash Advance & Reimbursement | 6,0 jam |
| Accounting Engine & Manual Journal | 7,0 jam |
| Bank & Rekonsiliasi | 3,0 jam |
| Laporan (TB, GL, IS, BS) | 10,5 jam |
| Dashboard Konsolidasi | 3,5 jam |
| Intercompany & Eliminasi | 4,0 jam |
| Testing & Bug Fix | 7,0 jam |
| Deployment & Finalisasi | 6,5 jam |
| Upload & Numbering | 4,5 jam |
| Sidebar & UI Components | 5,5 jam |
| **Total** | **82,0 jam** |
