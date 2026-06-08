# MPG Finance v2 — Manual Test Book

> Jalankan setiap skenario secara berurutan. Centang ✅ jika lulus, tulis ❌ + catatan jika gagal.

---

## 1. SALES ORDER (SO)

### 1.1 Buat SO Baru
**Langkah:**
1. Buka `/salesorder` → klik **Buat SO**
2. Pilih Customer, Sales Rep, Proyek
3. Tambah minimal 1 item produk
4. Klik **Submit**

**Expected:**
- SO muncul di list dengan status `submitted`
- SO code terbuat otomatis (format `SO/...`)
- Item produk tersimpan

---

### 1.2 Filter SO berdasarkan status
**Langkah:**
1. Di `/salesorder` pilih filter status `submitted`

**Expected:**
- Hanya SO berstatus `submitted` yang muncul
- Tidak ada error di console

---

### 1.3 Lihat Detail SO
**Langkah:**
1. Klik salah satu SO di list

**Expected:**
- Modal detail terbuka
- Menampilkan nama customer, total, items, status

---

## 2. PURCHASE ORDER (PO) & APPROVAL

### 2.1 Buat PO dari SO
**Langkah:**
1. Buka `/purchaseorder` → klik **Buat PO**
2. Pilih SO yang sudah ada
3. Pilih supplier, isi item dan harga beli
4. Submit

**Expected:**
- PO terbuat dengan status `submitted`
- PO muncul di list approval `/approval-transactions`

---

### 2.2 Approval SPV
**Langkah:**
1. Buka `/approval-transactions`
2. Cari PO dengan status `submitted`
3. Klik **Approve** (sebagai SPV)

**Expected:**
- Status PO berubah menjadi `approved_spv`
- Kolom **Approver SPV** menampilkan **nama** (bukan user_code)

---

### 2.3 Approval Finance
**Langkah:**
1. Di PO yang sudah `approved_spv`
2. Klik **Approve** (sebagai Finance)

**Expected:**
- Status PO berubah menjadi `approved`
- AP (Accounts Payable) terbuat otomatis
- Kolom **Approver Finance** menampilkan **nama**

**Cek DB:**
```sql
SELECT ap_code, supplier_name, amount, company_code
FROM accounts_payable
ORDER BY created_at DESC LIMIT 3;
```
- `company_code` harus terisi (bukan NULL)

---

### 2.4 Reject PO
**Langkah:**
1. Pilih PO status `submitted`
2. Klik **Reject** → isi alasan penolakan
3. Submit

**Expected:**
- Status PO menjadi `rejected`
- Alasan tersimpan di field notes
- Jika tidak ada PO lain untuk SO tersebut, SO kembali ke status `submitted`

---

## 3. PEMBAYARAN PO (Normal — 1 Company)

### 3.1 Bayar PO dengan bank perusahaan yang sama
**Langkah:**
1. Buka `/purchaseorder` → pilih PO yang sudah `approved`
2. Klik **Bayar**
3. Pilih bank yang company-nya **sama** dengan company project
4. Submit pembayaran

**Expected:**
- Payment tersimpan di `purchase_order_payments`
- **1 journal entry** terbuat (bukan 2)
- Journal: DR Hutang Usaha / CR Bank

**Cek DB:**
```sql
-- Cek payment terbaru
SELECT payment_code, po_code, amount, bank_name
FROM purchase_order_payments ORDER BY created_at DESC LIMIT 1;

-- Cek journal (harus 1)
SELECT je.journal_code, je.company_code, je.description
FROM journal_entries je
WHERE je.reference_code = 'PAY00XXX'   -- ganti dengan payment_code
ORDER BY je.journal_code;

-- Cek items journal
SELECT ji.account_code, coa.account_name, ji.debit_amount, ji.credit_amount
FROM journal_items ji
JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
WHERE ji.journal_code = 'JNL0XXXX';   -- ganti journal_code
```

---

## 4. PEMBAYARAN PO (Intercompany — 2 Company)

### 4.1 Bayar PO dengan bank perusahaan yang BERBEDA
**Langkah:**
1. Pilih PO yang sudah `approved` (misal company project = PT Mata Pensil)
2. Klik **Bayar**
3. Pilih bank yang company-nya **berbeda** (misal bank PT Sinergi Aero)
4. Submit

**Expected:**
- Payment tersimpan
- **2 journal entry** terbuat
- Muncul badge/warning "Intercompany" di UI
- JNL pertama (PO company): DR 20101-00 Hutang Usaha / CR 2150 Hutang Interco
- JNL kedua (Bank company): DR 1150 Piutang Interco / CR 10020-00 Bank

**Cek DB:**
```sql
SELECT je.journal_code, comp.name AS company, je.description
FROM journal_entries je
LEFT JOIN companies comp ON je.company_code = comp.company_code
WHERE je.reference_code = 'PAY0XXXX'
ORDER BY je.journal_code;

SELECT ji.journal_code, ji.account_code, coa.account_name,
       ji.debit_amount, ji.credit_amount
FROM journal_items ji
JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
WHERE ji.journal_code IN ('JNL0XXX1', 'JNL0XXX2')
ORDER BY ji.journal_code, ji.id;
```

| Journal | Account | Debit | Credit |
|---------|---------|-------|--------|
| JNL (PO co) | 20101-00 Hutang Usaha | ✓ | — |
| JNL (PO co) | 2150 Hutang Interco | — | ✓ |
| JNL (Bank co) | 1150 Piutang Interco | ✓ | — |
| JNL (Bank co) | 10020-00 Bank | — | ✓ |

---

## 5. INVOICE PAYMENT (AR)

### 5.1 Bayar Invoice Customer
**Langkah:**
1. Buka `/invoice-payment`
2. Pilih invoice yang belum lunas
3. Isi jumlah pembayaran
4. Submit

**Expected:**
- AR outstanding berkurang
- Status AR berubah ke `partial` atau `paid`
- Journal entry terbuat: DR Bank / CR Piutang Usaha

**Cek DB:**
```sql
SELECT ar_code, customer_name, amount, outstanding_amount, status, company_code
FROM accounts_receivable
ORDER BY created_at DESC LIMIT 3;
```
- `company_code` harus terisi

---

### 5.2 Filter Invoice berdasarkan Company
**Langkah:**
1. Di `/invoice-payment` pilih dropdown company
2. Pilih salah satu company

**Expected:**
- Hanya invoice milik company tersebut yang tampil

---

## 6. DELIVER TO CLIENT

### 6.1 Buat Delivery Order
**Langkah:**
1. Buka `/deliver-to-client`
2. Pilih SO yang sudah approved
3. Isi detail pengiriman
4. Submit

**Expected:**
- DO terbuat dengan status sesuai
- COGS journal terbuat otomatis (jika ada harga pokok)

---

## 7. INTERCOMPANY REPORT

### 7.1 Lihat Halaman Intercompany
**Langkah:**
1. Buka `/intercompany`

**Expected:**
- KPI cards tampil: Piutang Interco, Hutang Interco, Net Posisi Grup
- Jika Net ≠ 0 → muncul **warning imbalance** (kotak kuning/merah)
- Tabel per-company menampilkan breakdown saldo
- List transaksi interco terbaru tampil

---

### 7.2 Filter tanggal
**Langkah:**
1. Di `/intercompany` isi filter **Dari** dan **Sampai**
2. Klik filter

**Expected:**
- Data berubah sesuai rentang tanggal

---

### 7.3 Export CSV
**Langkah:**
1. Di `/intercompany` klik tombol **Export CSV**

**Expected:**
- File CSV terdownload berisi data intercompany

---

## 8. MANUAL JOURNAL

### 8.1 Buat Journal yang Balance
**Langkah:**
1. Buka `/manual-journals`
2. Klik **Buat Jurnal**
3. Isi deskripsi, tanggal
4. Tambah 2 baris:
   - Baris 1: Debit 1.000.000 di akun kas
   - Baris 2: Credit 1.000.000 di akun modal
5. Submit

**Expected:**
- Journal tersimpan dengan status `draft`
- Journal code terbuat (format `JRN-YYYY-XXXXXX`)
- Items tersimpan di `journal_items`

---

### 8.2 Tolak Journal yang Tidak Balance
**Langkah:**
1. Buat journal dengan Debit 1.000.000 dan Credit 500.000 (tidak balance)
2. Submit

**Expected:**
- Error "Debit harus sama dengan Credit"
- Journal **tidak** tersimpan

---

## 9. BANK RECONCILIATION

### 9.1 Buat Rekonsiliasi Baru
**Langkah:**
1. Buka `/bank-reconciliation`
2. Klik **Buat Rekonsiliasi**
3. Pilih akun bank, isi periode, saldo bank, saldo buku
4. Submit

**Expected:**
- Rekonsiliasi tersimpan
- `difference` = saldo bank − saldo buku dihitung otomatis
- Status `draft`

---

### 9.2 Update ke Completed
**Langkah:**
1. Buka rekonsiliasi yang ada
2. Ubah status ke `completed`
3. Save

**Expected:**
- Status berubah ke `completed`

---

## 10. CHART OF ACCOUNTS

### 10.1 Lihat Daftar Akun
**Langkah:**
1. Buka `/chart-of-account`

**Expected:**
- List akun tampil dengan account_code, account_name, account_type
- Pagination berjalan

---

## 11. DASHBOARD

### 11.1 Cek Summary Dashboard
**Langkah:**
1. Buka `/dashboard`

**Expected:**
- KPI cards tampil (Total SO, Total PO, AR outstanding, AP outstanding)
- Tidak ada error 500 di console/network

---

## CHECKLIST RINGKAS

| # | Fitur | Status | Catatan |
|---|-------|--------|---------|
| 1 | Buat SO | ⬜ | |
| 2 | Approval SPV (tampil nama) | ⬜ | |
| 3 | Approval Finance (tampil nama) | ⬜ | |
| 4 | Reject PO | ⬜ | |
| 5 | Bayar PO — Normal (1 journal) | ⬜ | |
| 6 | Bayar PO — Interco (2 journal) | ⬜ | |
| 7 | Cek company_code di journal tidak NULL | ⬜ | |
| 8 | Invoice Payment AR | ⬜ | |
| 9 | Intercompany Report — saldo balance | ⬜ | |
| 10 | Intercompany Report — warning imbalance | ⬜ | |
| 11 | Manual Journal — balanced | ⬜ | |
| 12 | Manual Journal — tolak unbalanced | ⬜ | |
| 13 | Bank Reconciliation — buat baru | ⬜ | |
| 14 | Dashboard tampil normal | ⬜ | |
