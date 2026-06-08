# Catatan Perubahan — MPG Finance v2
**Tanggal**: 2026-06-06 (Update: Audit Menyeluruh Semua Modul)

---

## Ringkasan Fitur yang Sedang Dikerjakan

Project ini adalah sistem keuangan (Finance ERP) berbasis Next.js 15 + MySQL. Fitur accounting, jurnal, dan laporan sedang dalam proses implementasi.

---

## File Baru (Untracked) yang Ditambahkan

| File | Fungsi |
|------|--------|
| `lib/accounting.ts` | Library utama accounting — journal entry, AR, AP, payment, inter-company, laporan |
| `components/Lineitemstable.tsx` | Komponen tabel line items untuk SO, PO, dan Reimburse |
| `components/Statusprogress.tsx` | Komponen visual progress status transaksi |
| `app/api/accounts-receivable/route.ts` | API untuk query AR (piutang) berdasarkan SO |
| `app/api/deliver-to-client/[do_code]/` | API aksi DO: `delivered` (konfirmasi terkirim + buat AR + COGS journal) dan `cancel` |
| `app/api/invoice-payment/detail/route.ts` | API detail invoice berdasarkan ar_code |
| `app/api/invoice-payment/list/route.ts` | API list invoice dengan pagination dan filter |
| `app/api/invoice-payment/pay/route.ts` | API proses pembayaran invoice: multi-invoice, upload bukti, intercompany detection |

---

## Alur Bisnis yang Sudah Diimplementasi

### 1. Delivery Order → Revenue Recognition
- SO dibuat → PO dibuat & diapprove → DO dibuat (status `shipping`)
- DO di-deliver → otomatis buat **AR (piutang)** + **Journal COGS** (harga pokok penjualan)
- Jika semua item SO sudah terkirim → SO status → `invoicing`

### 2. PO Approval → AP Creation
- PO diapprove SPV → status `approved_spv`
- PO diapprove Finance → otomatis buat **AP (hutang ke supplier)** + journal → status `approved`

### 3. Invoice Payment (Pembayaran Piutang)
- Multi-invoice selection dengan checkbox
- Upload bukti pembayaran wajib (PDF/JPG/PNG)
- **Intercompany detection**: jika bank account milik perusahaan berbeda → buat 2 journal entry terpisah
- Update status AR: `unpaid` → `partial` → `paid`
- Jika semua AR dari 1 SO sudah lunas → SO status → `completed`

### 4. Accounting Engine (`lib/accounting.ts`)
- **Journal Entry**: otomatis debit/credit berdasarkan `accounting_rules` di database
- **Cache**: transaction types & chart of accounts di-cache 5 menit
- **Laporan**: Trial Balance, Income Statement, Balance Sheet, General Ledger

---

## Status Flow Semua Modul (Actual Status di DB)

| Modul | Flow Status |
|-------|-------------|
| **SO** | `submitted` → `processing` → `invoicing` → `completed` |
| **PO** | `submitted` → `approved_spv` → `approved` → `paid` |
| **DO** | `shipping` → `delivered` (atau `cancelled`) |
| **AR** | `unpaid` → `partial` → `paid` |
| **AP** | `unpaid` → `partial` → `paid` |
| **CA** | `submitted` → `approved` → `active` → `partially_used` → `fully_used` |
| **Reimburse** | `submitted` → `approved` |

---

## Semua Bug yang Diperbaiki (Sesi 1 + Sesi 2)

### Sesi 1 — TypeScript Errors
| File | Bug | Perbaikan |
|------|-----|-----------|
| `components/Sidebar.tsx` | `FileInvoice` tidak ada di lucide-react | Diganti `FileCheck` |
| `app/(app)/approval-transactions/page.tsx` | `detailData.prev_po_total` possibly undefined | Ditambah `?? 0` |
| `app/lib/db.ts` | Type mismatch pada `pool.execute()` params | Cast explicit |
| `lib/accounting.ts` | `PaymentData` tidak ada field `allocations` | Field ditambahkan, `reference_code` optional |
| `app/api/invoice-payment/route.ts` | `queryOne` result tidak di-type | Ditambahkan `: any` |
| `app/api/invoice-payment/pay/route.ts` | `row` bertipe `unknown` saat iterate | Generic type + cast |
| `app/api/deliver-to-client/[do_code]/cancel/route.ts` | Status check `'shipped'` padahal DO dibuat dengan `'shipping'` | Dikoreksi ke `'shipping'` |

### Sesi 2 — Logic & Runtime Bugs (Audit Menyeluruh)
| File | Bug | Perbaikan |
|------|-----|-----------|
| `app/api/numbering-sequences/route.ts` | Kolom `document_type`/`current_value` tidak ada di DB — tabel pakai `sequence_code`/`next_number` | Seluruh route dikoreksi |
| `app/api/cash-advances/route.ts` | Query numbering pakai kolom yang salah → CA code selalu `CA-YYYYMM-0001` duplikat | Fix ke `sequence_code='CA'` |
| `app/api/reimbursements/route.ts` | Query numbering pakai kolom yang salah → Reimb code duplikat | Fix ke `sequence_code='REIMB'` |
| `app/api/manual-journals/route.ts` | INSERT ke `journal_items` tanpa `journal_item_code` (NOT NULL, UNIQUE) → error DB | Ditambahkan `JNI-{timestamp}-{idx}` |
| `components/Statusprogress.tsx` — SO_STEPS | Status `ready_to_invoice`, `shipped`, `delivered` tidak ada di flow SO | Dikoreksi: `submitted→processing→invoicing→completed` |
| `components/Statusprogress.tsx` — PO_STEPS | `'approved_finance'` tidak ada di DB, status asli adalah `'approved'` | Dikoreksi ke `'approved'` |
| `components/Statusprogress.tsx` — DO_STEPS | `'created'` dan `'shipped'` tidak ada, DO mulai dari `'shipping'` | Dikoreksi ke `shipping→delivered` |
| `app/(app)/invoice-payment/page.tsx` | Baca `d.pagination` tapi data ada di `d.data.pagination` → pagination selalu tampil salah | Dikoreksi membaca dari `d.data.pagination` |

---

## Status TypeScript
Setelah semua perbaikan: **0 error** (`npx tsc --noEmit` clean)

---

## Sesi 3 — Audit Semua Modul (2026-06-06 lanjutan)

### Bug yang Diperbaiki Sesi 3

| File | Bug | Perbaikan |
|------|-----|-----------|
| `app/(app)/numbering-sequences/page.tsx` | Interface pakai `document_type`/`current_value`/`is_active` (tidak ada di DB) — PUT kirim field yang salah | Update interface ke `sequence_code`/`next_number`, update PUT body, update display, hapus kolom is_active |
| `app/(app)/salesorder/page.tsx` | STATUS_OPTIONS include `ready_to_invoice`, `shipped`, `delivered` (tidak ada di flow SO) | Dikoreksi: `submitted→processing→invoicing→completed→cancelled` |
| `lib/utils.ts` — SO_STATUS | Include `ready_to_invoice`, `shipped`, `delivered` yang tidak ada di DB | Dikoreksi sesuai alur asli |
| `lib/utils.ts` — PO_STATUS | Include `approved_finance` yang tidak ada di DB (status asli: `approved`) | Dikoreksi ke `approved` |
| `lib/utils.ts` — DO_STATUS | Include `not_created`, `created`, `shipped` yang tidak ada (DO mulai dari `shipping`) | Dikoreksi ke `shipping→delivered→cancelled` |
| `app/(app)/purchaseorder/page.tsx` — SO_STATUS lokal | Include `shipped`, `delivered` yang tidak ada | Dikoreksi ke `submitted→processing→invoicing→completed→cancelled` |
| `app/(app)/purchaseorder/page.tsx` — filter dropdown SO | Include `shipped`, `delivered` sebagai opsi filter | Dikoreksi ke status asli |

### Modul yang Sudah Diaudit & OK (Sesi 3)

| Halaman | Status |
|---------|--------|
| `dashboard/page.tsx` | ✅ Correct — balance sheet, income statement, intercompany elimination semua benar |
| `ca-settlement/page.tsx` | ✅ Correct — usePaginated, CA status, form validasi |
| `manual-journals/page.tsx` | ✅ Correct — balanced check, COA dropdown, detail drawer |
| `ca-approval/page.tsx` | ✅ Correct — approve/reject flow, usePaginated |
| `reimburse-approval/page.tsx` | ✅ Correct — status filter, approve/reject API call |
| `reimburse-create/page.tsx` | ✅ Correct — form validasi, upload dokumen, API POST |
| `ca-transactions/page.tsx` | ✅ Correct — CA_STATUS, progress bar, usePaginated |
| `approval-transactions/page.tsx` | ✅ Correct — PO_STATUS (dari utils, sudah diperbaiki), status filter |
| `bank-accounts/page.tsx` | ✅ Correct — CRUD rekening bank |
| `accounting-rules/page.tsx` | ✅ Correct — CRUD accounting rules, COA dropdown |

---

## Status TypeScript
Setelah semua perbaikan Sesi 1+2+3: **0 error** (`npx tsc --noEmit` clean)

---

## Sesi 4 — Peningkatan & Fitur Baru (2026-06-06)

### Fitur Baru

#### 1. Journal Otomatis CA Settlement (`app/api/ca-settlement/route.ts`)
- Saat CA di-settle, otomatis buat journal entry:
  - **Debit** akun Beban (5100, dari rule `reimbursement`)
  - **Credit** akun Piutang CA Karyawan (1130, dari rule `cash_advance`)
- CA status diset ke `in_settlement` selama proses, lalu ke `fully_used` atau `partially_used`
- Journal code di-generate dari `numbering_sequences WHERE sequence_code='JNL'`
- Response dikembalikan: `{ settlement_code, total_expense, remaining, journal_code }`

#### 2. Journal Otomatis Reimburse Approval (`app/api/reimbursements/[code]/approve/route.ts`)
- Saat reimburse diapprove, otomatis buat journal entry:
  - **Debit** akun Beban (5100, dari rule `reimbursement`)
  - **Credit** akun Kas/Hutang (dari `credit_account_code` rule `reimbursement`)
- Response dikembalikan: `{ reimbursement_code, new_status: 'approved', journal_code }`
- Bug fix: `query()` first row diganti `queryOne()` untuk dapat data reimburse

#### 3. API Trial Balance (`app/api/reports/trial-balance/route.ts`) — **FILE BARU**
- GET dengan params: `from`, `to`, `period`, `company`
- Query semua akun COA, JOIN `journal_items` + `journal_entries` (status `posted`) di rentang tanggal
- Response: `{ from_date, to_date, rows: [{account_code, account_name, account_type, total_debit, total_credit, balance}], total_debit, total_credit, is_balanced }`
- Filter: hanya akun dengan aktivitas (non-zero)

#### 4. API General Ledger (`app/api/reports/general-ledger/route.ts`) — **FILE BARU**
- GET dengan params: `from`, `to`, `period`, `account_code`
- Tanpa `account_code`: return daftar akun COA saja
- Dengan `account_code`: return semua `journal_items` akun tersebut dalam rentang, dengan `running_balance`
- Response: `{ accounts, account, from_date, to_date, rows, total_debit, total_credit, ending_balance }`

#### 5. Halaman Trial Balance (`app/(app)/trial-balance/page.tsx`) — **FILE BARU**
- Filter periode (bulan atau custom range)
- Grup akun per tipe: Aset, Liabilitas, Ekuitas, Pendapatan, Beban
- Color-coded per tipe, subtotal per grup
- Badge balance status (Seimbang / Tidak Seimbang)
- Print/PDF via `window.print()` + `@media print { .no-print { display: none } }`
- Grand total row di baris bawah

#### 6. Halaman General Ledger (`app/(app)/general-ledger/page.tsx`) — **FILE BARU**
- Dropdown pilih akun COA (dari API)
- Filter periode
- Kolom running balance
- Badge tipe referensi (SO, PO, CA, Reimburse, dll.)
- Kartu ending balance berwarna ungu
- Print/PDF support

### UX & Quality Improvements

#### 7. Konfirmasi Modal CA Approval (`app/(app)/ca-approval/page.tsx`)
- Tombol approve sekarang membuka modal konfirmasi dulu (sebelumnya langsung approve)
- Modal menampilkan: kode CA, nama karyawan, jumlah, tombol konfirmasi hijau

#### 8. Konfirmasi Modal Reimburse Approval (`app/(app)/reimburse-approval/page.tsx`)
- Tombol approve sekarang membuka modal konfirmasi dulu
- Modal menampilkan: kode, judul, diajukan oleh, jumlah, info "journal akan dibuat otomatis"
- Toast success menampilkan journal code dari response API

#### 9. Error Handling Bank Accounts (`app/(app)/bank-accounts/page.tsx`)
- `catch {}` diganti `catch (err) { toast.error(...) }` agar error tidak hilang diam-diam

#### 10. `useDebounce` Hook (`hooks/useApi.ts`)
- Hook baru `useDebounce<T>(value, delay=400)` untuk debounce input search
- Menghindari request berlebihan saat user mengetik

#### 11. Debounced Search di Sales Order (`app/(app)/salesorder/page.tsx`)
- Search input kini menggunakan `useDebounce` (delay 400ms) sebelum trigger fetch
- Mengurangi load server saat pengguna mengetik cepat

#### 12. Warning Jatuh Tempo AR (`app/(app)/invoice-payment/page.tsx`)
- Di kolom due_date, ditambahkan badge peringatan:
  - **Merah** "X hari telat" jika sudah lewat jatuh tempo dan belum dibayar
  - **Kuning** "X hari lagi" jika jatuh tempo dalam 7 hari ke depan dan belum dibayar

#### 13. Sidebar Laporan (`components/Sidebar.tsx`)
- Ditambahkan section **Laporan** dengan dua sub-menu:
  - Trial Balance → `/trial-balance`
  - General Ledger → `/general-ledger`

---

## Status TypeScript
Setelah semua perbaikan Sesi 1+2+3+4: **0 error** (`npx tsc --noEmit` clean)

---

## Sesi 5 — Semua Improvement Selesai (2026-06-06)

### Bug Critical yang Diperbaiki

#### 1. CA Activation Journal (`app/api/ca-approval/route.ts`)
- Sebelumnya: action `activate` hanya update status, tidak buat journal → uang keluar tidak tercatat
- Sekarang: saat CA diaktifkan, otomatis buat journal:
  - **Debit** 1130 (Piutang CA Karyawan)
  - **Credit** 1110 (Kas)
- Ambil akun dari accounting rule `cash_advance` yang sudah ada di DB
- Response: `{ ca_code, new_status: 'active', journal_code }`

### Fitur Baru

#### 2. Income Statement API (`app/api/reports/income-statement/route.ts`) — FILE BARU
- GET dengan params: `from`, `to`, `period`
- Filter akun `account_type IN ('revenue','expense')` dengan aktivitas
- Revenue balance = credit − debit; Expense balance = debit − credit
- Response: `{ from_date, to_date, revenues, expenses, total_revenue, total_expense, net_income }`

#### 3. Balance Sheet API (`app/api/reports/balance-sheet/route.ts`) — FILE BARU
- GET dengan params: `from`, `to`, `period`
- Query semua tipe akun (asset, liability, equity, revenue, expense)
- Hitung net_income dari revenue/expense lalu masukkan ke sisi ekuitas
- Validasi: `is_balanced = |Aset − (Liabilitas + Ekuitas + Net Income)| < 1`
- Response: `{ assets, liabilities, equity, total_assets, total_liabilities, total_equity, net_income, is_balanced }`

#### 4. Income Statement page (`app/(app)/income-statement/page.tsx`) — FILE BARU
- Filter periode (bulan atau custom range)
- Card KPI: Laba/Rugi Bersih (hijau/merah), Total Pendapatan (ungu), Total Beban (amber)
- Margin % otomatis
- Tabel dua seksi: Pendapatan dan Beban, dengan grand total baris gelap
- Export CSV + Print/PDF

#### 5. Balance Sheet page (`app/(app)/balance-sheet/page.tsx`) — FILE BARU
- Filter periode
- Badge balance status (Seimbang / Tidak Seimbang)
- KPI row: Total Aset, Liabilitas, Ekuitas
- Layout dua kolom: Aset (kiri) vs Liabilitas + Ekuitas (kanan)
- Baris Laba/Rugi Berjalan di sisi kanan sebelum grand total
- Export CSV + Print/PDF

#### 6. Sidebar Laporan — Income Statement & Balance Sheet (`components/Sidebar.tsx`)
- Ditambahkan dua sub-menu baru di seksi Laporan:
  - Income Statement → `/income-statement`
  - Balance Sheet → `/balance-sheet`

#### 7. Export CSV — Trial Balance (`app/(app)/trial-balance/page.tsx`)
- Tombol "Export CSV" muncul setelah data dimuat
- Download file `trial-balance-{periode}.csv`

#### 8. Export CSV — General Ledger (`app/(app)/general-ledger/page.tsx`)
- Tombol "Export CSV" muncul saat ada akun terpilih dan ada baris data
- Download file `gl-{kode_akun}-{periode}.csv`

#### 9. Dashboard Auto-Refresh (`app/(app)/dashboard/page.tsx`)
- Auto-refresh setiap 5 menit via `setInterval`
- Indicator waktu terakhir diperbarui di sebelah tombol Refresh: "Diperbarui HH:MM"
- Cleanup `clearInterval` saat component unmount

#### 10. Debounced Search — Delivery Order (`app/(app)/deliver-to-client/page.tsx`)
- Sebelumnya: `setSearch` dipanggil langsung di `handleSearch` → request setiap karakter
- Sekarang: `useDebounce(searchLocal, 400)` → request hanya setelah 400ms berhenti mengetik

#### 11. Debounced Search — CA Transactions (`app/(app)/ca-transactions/page.tsx`)
- Sebelumnya: trigger search hanya saat Enter / klik tombol Filter
- Sekarang: `useDebounce(search, 400)` → auto-search saat mengetik, tombol Filter dihapus

#### 12. Debounced Search — Purchase Order (`app/(app)/purchaseorder/page.tsx`)
- Sebelumnya: `setPOSearch` dipanggil langsung saat input change
- Sekarang: `useDebounce(poSearch, 400)` via `debouncedPOSearch` useEffect

#### 13. Invoice Detail — Payment History (`app/(app)/invoice-payment/page.tsx`)
- `fetchDetail` sebelumnya memanggil endpoint yang salah (`/api/accounts-receivable?so_code=arCode`)
- Sekarang: parallel fetch ke `/api/invoice-payment/detail?ar_code=X` + `/api/accounts-receivable?ar_code=X&include_payments=1`
- Detail drawer menampilkan riwayat pembayaran: jumlah, tanggal, metode, bank, referensi

#### 14. AR API — Support Payment History (`app/api/accounts-receivable/route.ts`)
- Ditambahkan query by `ar_code` (sebelumnya hanya by `so_code`)
- Saat `include_payments=1`: JOIN ke tabel `payments` untuk riwayat bayar per AR

---

## Status TypeScript
Setelah semua perbaikan Sesi 1+2+3+4+5: **0 error** (`npx tsc --noEmit` clean)

---

## Yang Perlu Dilanjutkan (TODO)

- [ ] Server-side pagination untuk daftar SO di purchaseorder page (saat ini `limit=200` client-side)
- [ ] Export ke Excel native (saat ini CSV; Excel bisa buka CSV langsung)
- [ ] Notifikasi in-app saat ada invoice jatuh tempo (saat ini hanya warning di tabel)
