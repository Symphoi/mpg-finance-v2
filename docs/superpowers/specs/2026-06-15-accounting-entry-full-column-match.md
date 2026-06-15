# Accounting Entry — Full Column Match Design

**Date:** 2026-06-15  
**Status:** Approved

## Context

Modul Accounting Entry sudah dibangun dengan 3 tab (AR/AP/Bank). Setelah dibandingkan langsung dengan file Excel client (`AR MPG 2026.xlsx`, `AP MPG.xlsx`, `Bank IMT-BCA.xlsx`), ditemukan bahwa beberapa kolom penting belum ada di grid maupun di import parser. Tujuan revisi ini: **100% match dengan kolom Excel client**, sambil tetap populate data dari sistem yang sudah ada (accounts_receivable, purchase_orders) untuk kolom-kolom yang bisa diambil dari DB.

---

## 1. Kolom Per Tab (Final)

### AR Tab — match sheet `SALES`

| Kolom Grid | Sumber (Import Excel) | Sumber (Tarik dari Sistem) | Field di meta JSON |
|---|---|---|---|
| No SO | Col A | so_code dari AR join SO | `so_code` |
| Customer | Col B | customer_name via join | `customer_name` |
| No NPWP | Col C | ❌ tidak ada di DB | `npwp` |
| Item | Col D | ❌ tidak ada di AR/SO | `item` |
| PO No. | Col E | ❌ tidak ada di AR | `po_no` |
| Tgl Invoice | Col F (Date Invoice) | invoice_date | — (entry_date) |
| No Invoice | Col G (Invoice) | invoice_number | — (reference) |
| NILAI KONTRAK | Col J | ❌ tidak ada di DB | `nilai_kontrak` |
| DPP | Col K | amount (approx) | `dpp` |
| DPP LAINNYA | Col L | ❌ tidak ada di DB | `dpp_lainnya` |
| PPN Bendaharawan | Col M | ❌ tidak ada di DB | `ppn_bendaharawan` |
| PPN | Col N | tax_amount (approx) | `ppn` |
| PPh 23 | Col O | ❌ tidak ada di DB | `pph_23` |
| PPh 22 | Col P | ❌ tidak ada di DB | `pph_22` |
| PIUTANG | Col Q | outstanding_amount | `piutang` |
| No Faktur | Col T | ❌ tidak ada di DB | `no_faktur` |
| Dr Akun | — | — | dr_account_code |
| Cr Akun | — | — | cr_account_code |
| Status | — | — | status |

### AP Tab — match sheet `PURCHASES`

| Kolom Grid | Sumber (Import Excel) | Sumber (Tarik dari Sistem) | Field di meta JSON |
|---|---|---|---|
| Code | Col A | ❌ tidak ada di PO | `code` |
| Supplier | Col B | supplier_name via join | `supplier_name` |
| Item | Col C | product_name via join | `item` |
| Tgl | Col G (Date Inv.) | created_at | — (entry_date) |
| Sales Order | Col E | so_code | `so_code` |
| PO No. | Col F | po_code | `po_no` |
| No Invoice | Col H (Invoice) | — | — (reference) |
| Amount | Col I | total_amount | — (amount) |
| VAT | Col J | tax_amount (approx) | `vat` |
| PPH 23 | Col K | ❌ tidak ada di DB | `pph_23` |
| A/P | Col L | total_amount | `ap_amount` |
| Status | Col O | status | `ap_status` |
| Dr Akun | — | — | dr_account_code |
| Cr Akun | — | — | cr_account_code |

### Bank Tab — match sheet `BCA`

| Kolom Grid | Sumber (Import Excel) | Field di meta JSON |
|---|---|---|
| Tanggal | Col A (Date) | — (entry_date) |
| Vouc. No | Col B | — (reference) |
| Project | Col C | `project` |
| AC No. | Col D | `ac_lawan` |
| Description | Col E | — (description) |
| Transaction | Col F | `transaction_category` |
| Ref. | Col G | `ref` |
| Masuk | Col H (In) | `amount_in` |
| Keluar | Col I (Out) | `amount_out` |
| Dr Akun | — | dr_account_code |
| Cr Akun | — | cr_account_code |
| Status | — | status |

---

## 2. Import Parser Updates

### AR Parser (sheet `SALES`)
Tambah capture untuk:
- `nilai_kontrak` → col J (index 9)
- `dpp_lainnya` → col L (index 11)  
- `ppn_bendaharawan` → col M (index 12)
- `npwp` → col C (index 2)
- `item` → col D (index 3)
- `po_no` → col E (index 4)
- `no_faktur` → col T (index 19)

### AP Parser (sheet `PURCHASES`)
Tambah capture untuk:
- `code` → col A (index 0)
- `so_code` → col E (index 4)
- `po_no` → col F (index 5)
- `ap_status` → col O (index 14)

### Bank Parser (sheet `BCA`)
Tambah capture untuk:
- `transaction_category` → col F (index 5, "Transaction")
- `ref` → col G (index 6, "Ref.")

Header BCA ada di row 6 (0-based index 5) dengan raw:true. Data mulai index 6.

---

## 3. TAB_CONFIG Updates (Export & Template)

Update `headers` dan `toRow` di `TAB_CONFIG` untuk semua 3 tab sesuai kolom final di atas.

---

## 4. "Tarik dari Sistem" — Data yang Bisa Diambil

### AR (dari `accounts_receivable` + join):
```sql
SELECT ar.ar_code, ar.invoice_number, ar.invoice_date, ar.amount AS dpp,
       ar.tax_amount AS ppn, ar.outstanding_amount AS piutang, 
       ar.status, ar.so_code, c.customer_name
FROM accounts_receivable ar
LEFT JOIN customers c ON ar.customer_code = c.customer_code
```
Kolom yang tidak bisa diisi otomatis: npwp, item, po_no, nilai_kontrak, dpp_lainnya, ppn_bendaharawan, pph_23, pph_22, no_faktur → **biarkan kosong, user isi manual**

### AP (dari `purchase_orders` + join):
```sql
SELECT po.po_code, po.so_code, po.total_amount, po.tax_amount,
       po.status, po.created_at, s.supplier_name,
       GROUP_CONCAT(poi.product_name SEPARATOR ', ') AS items
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
LEFT JOIN purchase_order_items poi ON po.po_code = poi.po_code
WHERE po.status IN ('approved','paid')
```
Kolom yang tidak bisa diisi otomatis: code, pph_23 → **biarkan kosong**

---

## 5. Files yang Berubah

| File | Perubahan |
|------|-----------|
| `app/(app)/accounting-entry/page.tsx` | Tambah kolom di AR/AP/Bank grid + new row form |
| `app/api/accounting-entries/import/route.ts` | Parser AR/AP/Bank capture field tambahan |
| `app/api/accounting-entries/route.ts` | Update pull query AP (so_code, po_code, status) |

---

## 6. Verifikasi

1. `npm run build` — tidak ada TypeScript error
2. Import `AR MPG 2026.xlsx` → cek kolom NILAI KONTRAK, DPP LAINNYA, PPN Bendaharawan, No Faktur terisi
3. Import `AP MPG.xlsx` → cek kolom PO No., Status terisi
4. Import `Bank IMT-BCA.xlsx` → cek kolom Transaction terisi
5. Tarik dari Sistem (AR) → customer_name, invoice_number, amount, outstanding_amount terisi; kolom lain kosong
6. Template download → header sesuai kolom final
7. Export → semua kolom ikut terekspor
