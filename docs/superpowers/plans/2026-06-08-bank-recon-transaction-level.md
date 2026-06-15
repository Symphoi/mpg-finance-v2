# Bank Reconciliation Transaction-Level with Auto-Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simple CSV import with transaction-level bank reconciliation that auto-matches bank statement lines against journal entries by reference number.

**Architecture:** A new `bank_recon_items` table stores individual bank and book-side transaction lines per reconciliation. The import endpoint parses a richer CSV format (one row per transaction), auto-matches via `reference_code` against `journal_entries`, then inserts unmatched book-side entries. A new GET-items endpoint serves the detail drawer. The frontend adds a sliding DetailDrawer with tabbed matched/unmatched views.

**Tech Stack:** Next.js 15 App Router, MySQL 8, TypeScript, `withAuth` HOC, `query()` from `@/app/lib/db`, response helpers from `@/app/lib/response`, design system classes (`.card`, `.tbl`, `.btn`, `.badge-*`), `formatRupiah`/`formatDate` from `@/lib/utils`

---

## File Map

| Action | File |
|--------|------|
| Modify | `app/api/bank-reconciliations/import/route.ts` |
| Create | `app/api/bank-reconciliations/[code]/items/route.ts` |
| Modify | `app/(app)/bank-reconciliations/page.tsx` |

---

## Task 1: Rewrite the import API with transaction-level logic

**Files:**
- Modify: `app/api/bank-reconciliations/import/route.ts`

This is the core backend change. It replaces the old 4-column CSV handler with the new 8-column format, creates the `bank_recon_items` table on first use, performs auto-matching, inserts unmatched book entries, and returns a richer summary response.

- [ ] **Step 1: Read the current file**

Read `app/api/bank-reconciliations/import/route.ts` in full to understand the current structure before overwriting.

- [ ] **Step 2: Write the new import route**

Replace the entire contents of `app/api/bank-reconciliations/import/route.ts` with:

```typescript
// app/api/bank-reconciliations/import/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

interface CsvRow {
  account_code:     string;
  period_start:     string;
  period_end:       string;
  transaction_date: string;
  reference_number: string;
  description:      string;
  debit_amount:     number;
  credit_amount:    number;
}

/** Ensure bank_recon_items table exists */
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS bank_recon_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reconciliation_code VARCHAR(50) NOT NULL,
      source ENUM('bank','book') NOT NULL,
      transaction_date DATE,
      reference_number VARCHAR(150),
      description TEXT,
      debit_amount DECIMAL(15,2) DEFAULT 0,
      credit_amount DECIMAL(15,2) DEFAULT 0,
      journal_code VARCHAR(50) DEFAULT NULL,
      match_status ENUM('matched','unmatched') DEFAULT 'unmatched',
      created_at DATETIME DEFAULT NOW(),
      INDEX idx_recon_code (reconciliation_code),
      INDEX idx_ref (reference_number)
    )
  `);
}

/** Parse CSV — header row is ignored, each data row maps to CsvRow */
function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 8) continue;
    const [account_code, period_start, period_end, transaction_date, reference_number, description, debit_str, credit_str] = cols;
    if (!account_code || !period_start || !period_end) continue;
    rows.push({
      account_code,
      period_start,
      period_end,
      transaction_date: transaction_date || period_start,
      reference_number: reference_number || '',
      description: description || '',
      debit_amount:  Number(debit_str?.replace(/[^0-9.-]/g, '')  || 0),
      credit_amount: Number(credit_str?.replace(/[^0-9.-]/g, '') || 0),
    });
  }
  return rows;
}

/** Calculate book balance from journal_items for a given account + date range */
async function getBookBalance(accountCode: string, from: string, to: string): Promise<number> {
  const [row] = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN coa.account_type IN ('asset','expense')
                         THEN ji.debit_amount - ji.credit_amount
                         ELSE ji.credit_amount - ji.debit_amount END), 0) AS balance
     FROM journal_items ji
     JOIN journal_entries je  ON ji.journal_code  = je.journal_code
     JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
     WHERE ji.account_code = ?
       AND je.status = 'posted'
       AND DATE(je.transaction_date) BETWEEN ? AND ?`,
    [accountCode, from, to],
  ) as any[];
  return Number(row?.balance ?? 0);
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureTable();

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return badRequest('File CSV wajib diupload');

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return badRequest('File kosong atau format tidak valid. Pastikan menggunakan template yang benar.');

    // Group rows by account_code + period_start + period_end
    type GroupKey = string;
    const groups = new Map<GroupKey, CsvRow[]>();
    for (const row of rows) {
      const key = `${row.account_code}|${row.period_start}|${row.period_end}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    let totalBank     = 0;
    let totalMatched  = 0;
    let unmatchedBank = 0;
    let unmatchedBook = 0;
    let bankBalance   = 0;
    let bookBalance   = 0;
    let reconCode     = '';

    for (const [key, groupRows] of groups) {
      const { account_code, period_start, period_end } = groupRows[0];

      // Validate bank account exists
      const [acct] = await query(
        `SELECT account_code FROM bank_accounts WHERE account_code = ? LIMIT 1`,
        [account_code],
      ) as any[];
      if (!acct) continue;

      // Upsert bank_reconciliations header — use existing if already present for this account+period
      const [existing] = await query(
        `SELECT reconciliation_code FROM bank_reconciliations
         WHERE bank_account_code = ? AND period_start = ? AND period_end = ? LIMIT 1`,
        [account_code, period_start, period_end],
      ) as any[];

      reconCode = existing?.reconciliation_code
        ?? `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      if (!existing) {
        await query(
          `INSERT INTO bank_reconciliations
             (reconciliation_code, bank_account_code, period_start, period_end, statement_date,
              bank_balance, book_balance, difference, ending_balance, status, notes, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?, 0,0,0,0, 'draft', NULL, ?,NOW(),NOW())`,
          [reconCode, account_code, period_start, period_end, period_end, user.user_code],
        );
      }

      // Delete old bank items for this reconciliation (re-import = replace)
      await query(
        `DELETE FROM bank_recon_items WHERE reconciliation_code = ? AND source = 'bank'`,
        [reconCode],
      );

      // Insert bank-side items + auto-match
      const matchedJournalCodes = new Set<string>();

      for (const row of groupRows) {
        totalBank++;
        let journalCode: string | null   = null;
        let matchStatus: 'matched' | 'unmatched' = 'unmatched';

        if (row.reference_number) {
          const [match] = await query(
            `SELECT journal_code, reference_code, total_debit, total_credit, description
             FROM journal_entries
             WHERE reference_code = ? AND status = 'posted'
               AND DATE(transaction_date) BETWEEN ? AND ?
             LIMIT 1`,
            [row.reference_number, period_start, period_end],
          ) as any[];

          if (match) {
            journalCode = match.journal_code;
            matchStatus = 'matched';
            matchedJournalCodes.add(match.journal_code);
            totalMatched++;
          } else {
            unmatchedBank++;
          }
        } else {
          unmatchedBank++;
        }

        await query(
          `INSERT INTO bank_recon_items
             (reconciliation_code, source, transaction_date, reference_number, description,
              debit_amount, credit_amount, journal_code, match_status, created_at)
           VALUES (?, 'bank', ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [reconCode, row.transaction_date, row.reference_number, row.description,
           row.debit_amount, row.credit_amount, journalCode, matchStatus],
        );
      }

      // Book-side: insert unmatched journal entries (posted, in period, for account, not already matched)
      await query(
        `DELETE FROM bank_recon_items WHERE reconciliation_code = ? AND source = 'book'`,
        [reconCode],
      );

      const matchedCodesArr = Array.from(matchedJournalCodes);

      // Build exclusion clause dynamically
      let excludeClause = '';
      const excludeParams: string[] = [];
      if (matchedCodesArr.length > 0) {
        excludeClause = `AND je.journal_code NOT IN (${matchedCodesArr.map(() => '?').join(',')})`;
        excludeParams.push(...matchedCodesArr);
      }

      const bookItems = await query(
        `SELECT je.journal_code, je.reference_code, je.description,
                je.transaction_date, je.total_debit, je.total_credit
         FROM journal_entries je
         JOIN journal_items ji ON ji.journal_code = je.journal_code
         WHERE ji.account_code = ?
           AND je.status = 'posted'
           AND DATE(je.transaction_date) BETWEEN ? AND ?
           ${excludeClause}
         GROUP BY je.journal_code`,
        [account_code, period_start, period_end, ...excludeParams],
      ) as any[];

      for (const bk of bookItems) {
        unmatchedBook++;
        await query(
          `INSERT INTO bank_recon_items
             (reconciliation_code, source, transaction_date, reference_number, description,
              debit_amount, credit_amount, journal_code, match_status, created_at)
           VALUES (?, 'book', ?, ?, ?, ?, ?, ?, 'unmatched', NOW())`,
          [reconCode, bk.transaction_date, bk.reference_code ?? '', bk.description ?? '',
           bk.total_debit ?? 0, bk.total_credit ?? 0, bk.journal_code],
        );
      }

      // Recalculate totals
      bankBalance = groupRows.reduce((sum, r) => sum + r.debit_amount - r.credit_amount, 0);
      bookBalance = await getBookBalance(account_code, period_start, period_end);
      const difference = bankBalance - bookBalance;

      await query(
        `UPDATE bank_reconciliations
         SET bank_balance=?, book_balance=?, difference=?, ending_balance=?, updated_at=NOW()
         WHERE reconciliation_code=?`,
        [bankBalance, bookBalance, difference, bankBalance, reconCode],
      );
    }

    return ok({
      reconciliation_code: reconCode,
      total_bank:     totalBank,
      matched:        totalMatched,
      unmatched_bank: unmatchedBank,
      unmatched_book: unmatchedBook,
      bank_balance:   bankBalance,
      book_balance:   bookBalance,
      difference:     bankBalance - bookBalance,
    });
  } catch (err) {
    return serverError(err);
  }
});
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

Run:
```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && npx tsc --noEmit 2>&1 | head -40
```
Expected: no output (zero errors). If errors appear, fix types before continuing.

- [ ] **Step 4: Commit**

```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && git add app/api/bank-reconciliations/import/route.ts && git commit -m "feat: rewrite bank recon import with transaction-level auto-matching"
```

---

## Task 2: Create GET-items endpoint

**Files:**
- Create: `app/api/bank-reconciliations/[code]/items/route.ts`

This endpoint returns all `bank_recon_items` for a given `reconciliation_code`, ordered by source/status/date so the frontend tabs can filter client-side.

- [ ] **Step 1: Ensure the directory exists and check for conflicts**

Run:
```bash
ls "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2/app/api/bank-reconciliations/" 2>/dev/null
```
Expected output: shows `import/` and `route.ts`. A `[code]/` directory should NOT yet exist.

- [ ] **Step 2: Create the directory and file**

Create file `app/api/bank-reconciliations/[code]/items/route.ts` with:

```typescript
// app/api/bank-reconciliations/[code]/items/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Extract code from URL: /api/bank-reconciliations/<code>/items
    const code = req.url.split('/bank-reconciliations/')[1]?.split('/items')[0];
    if (!code) return ok([]);

    const items = await query(
      `SELECT * FROM bank_recon_items
       WHERE reconciliation_code = ?
       ORDER BY source, match_status, transaction_date`,
      [code],
    );

    return ok(items);
  } catch (err) {
    return serverError(err);
  }
});
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

Run:
```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && npx tsc --noEmit 2>&1 | head -40
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && git add "app/api/bank-reconciliations/[code]/items/route.ts" && git commit -m "feat: add GET items endpoint for bank recon detail drawer"
```

---

## Task 3: Rewrite the bank reconciliations frontend page

**Files:**
- Modify: `app/(app)/bank-reconciliations/page.tsx`

This is the largest change. It updates `downloadTemplate()`, enriches the import modal with new column info + richer result summary, replaces the Eye button with a "Lihat Detail" button, and adds a `DetailDrawer` slide panel with three tabs.

- [ ] **Step 1: Read the current file**

Read `app/(app)/bank-reconciliations/page.tsx` in full to understand all current state variables and components.

- [ ] **Step 2: Write the complete updated page**

Replace the entire file with:

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Eye, X, Upload, Download, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Recon {
  id: number;
  reconciliation_code: string;
  bank_account_code: string;
  bank_name: string;
  account_number: string;
  period_start: string;
  period_end: string;
  bank_balance: number;
  book_balance: number;
  difference: number;
  status: string;
  notes: string;
  created_by: string;
  created_at: string;
}

interface Bank { account_code: string; bank_name: string; account_number: string; }

interface ReconItem {
  id: number;
  reconciliation_code: string;
  source: 'bank' | 'book';
  transaction_date: string;
  reference_number: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  journal_code: string | null;
  match_status: 'matched' | 'unmatched';
}

interface ImportSummary {
  reconciliation_code: string;
  total_bank: number;
  matched: number;
  unmatched_bank: number;
  unmatched_book: number;
  bank_balance: number;
  book_balance: number;
  difference: number;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:       { label: 'Draft',       cls: 'badge-amber' },
  reconciled:  { label: 'Reconciled',  cls: 'badge-green' },
  unreconciled:{ label: 'Selisih',     cls: 'badge-red'   },
};

function downloadTemplate() {
  const header  = 'account_code,period_start,period_end,transaction_date,reference_number,description,debit_amount,credit_amount';
  const row1    = '10020-00,2026-05-01,2026-05-31,2026-05-03,INV-2026-001,Pembayaran Invoice PT ABC,5000000,0';
  const row2    = '10020-00,2026-05-01,2026-05-31,2026-05-07,PO-2026-045,Bayar Vendor XYZ,0,2500000';
  const csv     = [header, row1, row2].join('\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url; a.download = 'template-rekonsiliasi-bank.csv';
  a.click(); URL.revokeObjectURL(url);
}

/* ─── DetailDrawer ─────────────────────────────────────────────────────────── */
function DetailDrawer({ rec, onClose }: { rec: Recon; onClose: () => void }) {
  const [items, setItems]   = useState<ReconItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'matched' | 'unmatched_bank' | 'unmatched_book'>('matched');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bank-reconciliations/${rec.reconciliation_code}/items`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data ?? []); })
      .finally(() => setLoading(false));
  }, [rec.reconciliation_code]);

  const matched       = items.filter(i => i.match_status === 'matched');
  const unmatchedBank = items.filter(i => i.source === 'bank'  && i.match_status === 'unmatched');
  const unmatchedBook = items.filter(i => i.source === 'book'  && i.match_status === 'unmatched');

  const tabs: { key: typeof tab; label: string; count: number; color: string }[] = [
    { key: 'matched',       label: 'Matched',         count: matched.length,       color: '#059669' },
    { key: 'unmatched_bank',label: 'Unmatched Bank',  count: unmatchedBank.length, color: '#d97706' },
    { key: 'unmatched_book',label: 'Unmatched Buku',  count: unmatchedBook.length, color: '#dc2626' },
  ];

  const activeRows = tab === 'matched' ? matched : tab === 'unmatched_bank' ? unmatchedBank : unmatchedBook;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: 580, borderLeft: '1px solid var(--color-border-soft)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--color-text)' }}>
              {rec.reconciliation_code}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {rec.bank_name || rec.bank_account_code}
              {rec.account_number && <span className="font-mono ml-1">· {rec.account_number}</span>}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(rec.period_start)} — {formatDate(rec.period_end)}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Balance summary strip */}
        <div className="flex gap-0 px-5 py-3" style={{ background: '#F5F4FF', borderBottom: '1px solid var(--color-border-soft)' }}>
          {[
            { label: 'Saldo Bank', value: formatRupiah(rec.bank_balance), color: 'var(--color-text)' },
            { label: 'Saldo Buku', value: formatRupiah(rec.book_balance), color: 'var(--color-text)' },
            { label: 'Selisih',    value: rec.difference === 0 ? 'Seimbang ✓' : formatRupiah(Math.abs(rec.difference)), color: rec.difference === 0 ? '#059669' : '#dc2626' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center">
              <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1" style={{ borderBottom: '1px solid var(--color-border-soft)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors"
              style={{
                color:       tab === t.key ? t.color : 'var(--color-text-muted)',
                background:  tab === t.key ? '#fff' : 'transparent',
                borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              }}
            >
              {t.label}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ background: tab === t.key ? t.color + '22' : '#F0F0F0', color: tab === t.key ? t.color : '#888' }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : activeRows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              Tidak ada data
            </div>
          ) : (
            <table className="tbl" style={{ fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Ref</th>
                  <th>Deskripsi</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Kredit</th>
                  {tab === 'matched'        && <th>Journal</th>}
                  {tab === 'unmatched_bank' && <th>Status</th>}
                  {tab === 'unmatched_book' && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {activeRows.map(item => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.transaction_date)}</td>
                    <td>
                      <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.reference_number || '—'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '—'}
                    </td>
                    <td className="text-right tbl-mono">
                      {item.debit_amount > 0 ? formatRupiah(item.debit_amount) : '—'}
                    </td>
                    <td className="text-right tbl-mono">
                      {item.credit_amount > 0 ? formatRupiah(item.credit_amount) : '—'}
                    </td>
                    {tab === 'matched' && (
                      <td>
                        <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-primary)' }}>
                          {item.journal_code || '—'}
                        </span>
                      </td>
                    )}
                    {tab === 'unmatched_bank' && (
                      <td>
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>Tidak ditemukan di jurnal</span>
                      </td>
                    )}
                    {tab === 'unmatched_book' && (
                      <td>
                        <span className="badge badge-red" style={{ fontSize: 10 }}>Tidak ada di bank statement</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function BankReconciliationsPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<Recon>('/api/bank-reconciliations');
  const [banks, setBanks]             = useState<Bank[]>([]);
  const [detail, setDetail]           = useState<Recon | null>(null);
  const [drawerRec, setDrawerRec]     = useState<Recon | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [form, setForm]               = useState({ account_code: '', period_start: '', period_end: '', bank_balance: '', notes: '' });
  const [bookBalance, setBookBalance] = useState<number | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [confirming, setConfirming]   = useState<number | null>(null);
  const [importFile, setImportFile]   = useState<File | null>(null);
  const [importing, setImporting]     = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/bank-accounts?limit=100', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (j.success) setBanks(j.data ?? []); });
  }, []);

  // Auto-fetch book balance when account + both dates are filled
  useEffect(() => {
    const { account_code, period_start, period_end } = form;
    if (!account_code || !period_start || !period_end) { setBookBalance(null); return; }
    setLoadingBook(true);
    fetch(`/api/bank-reconciliations?action=book_balance&account_code=${account_code}&from=${period_start}&to=${period_end}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setBookBalance(Number(j.data.balance)); })
      .finally(() => setLoadingBook(false));
  }, [form.account_code, form.period_start, form.period_end]);

  const bankBalance = Number(form.bank_balance || 0);
  const difference  = bookBalance != null ? bankBalance - bookBalance : null;

  const save = async () => {
    if (!form.account_code || !form.period_start || !form.period_end) { toast.error('Akun, periode awal, dan akhir wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/bank-reconciliations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, bank_balance: bankBalance, book_balance: bookBalance }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Rekonsiliasi dibuat');
      setShowCreate(false);
      setForm({ account_code: '', period_start: '', period_end: '', bank_balance: '', notes: '' });
      setBookBalance(null);
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const confirm = async (rec: Recon) => {
    setConfirming(rec.id);
    try {
      const newStatus = rec.difference === 0 ? 'reconciled' : 'unreconciled';
      const res = await fetch('/api/bank-reconciliations', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, bank_balance: rec.bank_balance, book_balance: rec.book_balance, notes: rec.notes, status: newStatus }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(newStatus === 'reconciled' ? 'Rekonsiliasi dikonfirmasi ✓' : 'Ditandai sebagai Selisih');
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setConfirming(null);
  };

  const handleImport = async () => {
    if (!importFile) { toast.error('Pilih file CSV terlebih dahulu'); return; }
    setImporting(true);
    setImportSummary(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/bank-reconciliations/import', { method: 'POST', credentials: 'include', body: fd });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      setImportSummary(j.data);
      if (j.data.total_bank > 0) refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal import'); }
    setImporting(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Rekonsiliasi Bank</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} rekonsiliasi</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
            <Download size={13} /> Template
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowImport(true); setImportSummary(null); setImportFile(null); }}>
            <Upload size={13} /> Import CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Buat Rekonsiliasi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Periode</th>
                <th className="text-right">Saldo Bank</th>
                <th className="text-right">Saldo Buku</th>
                <th className="text-right">Selisih</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Belum ada rekonsiliasi</td></tr>}
              {data.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{r.bank_name || r.bank_account_code}</div>
                    {r.account_number && <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{r.account_number}</div>}
                  </td>
                  <td><div className="text-[12px]">{formatDate(r.period_start)} — {formatDate(r.period_end)}</div></td>
                  <td className="text-right tbl-mono">{formatRupiah(r.bank_balance)}</td>
                  <td className="text-right tbl-mono">{formatRupiah(r.book_balance)}</td>
                  <td className="text-right">
                    <span style={{ color: r.difference === 0 ? '#059669' : '#dc2626', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(r.difference))} ${r.difference > 0 ? '(lebih)' : '(kurang)'}`}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_LABEL[r.status]?.cls ?? 'badge-gray'}`}>
                      {STATUS_LABEL[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{formatDate(r.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setDrawerRec(r)}
                        title="Lihat Detail Transaksi"
                      >
                        <Eye size={12} /> Lihat Detail
                      </button>
                      {r.status === 'draft' && (
                        <button
                          className={`btn btn-sm ${r.difference === 0 ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => confirm(r)}
                          disabled={confirming === r.id}
                          title={r.difference === 0 ? 'Konfirmasi Reconciled' : 'Tandai Selisih'}
                        >
                          {confirming === r.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : r.difference === 0 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          {r.difference === 0 ? 'Konfirmasi' : 'Selisih'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Buat Rekonsiliasi Bank</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="input-label">Rekening Bank *</label>
                <select className="input" value={form.account_code} onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))}>
                  <option value="">Pilih rekening</option>
                  {banks.map(b => <option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Periode Awal *</label>
                  <input type="date" className="input" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Periode Akhir *</label>
                  <input type="date" className="input" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="input-label">Saldo Bank (dari mutasi rekening)</label>
                <input type="number" className="input" min="0" placeholder="0" value={form.bank_balance} onChange={e => setForm(f => ({ ...f, bank_balance: e.target.value }))} />
              </div>

              {/* Auto book balance */}
              <div className="p-3 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #EAE8FF' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-primary)' }}>Saldo Buku (dari jurnal)</span>
                  {loadingBook
                    ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    : bookBalance != null
                      ? <span className="text-[13px] font-bold tbl-mono" style={{ color: 'var(--color-primary)' }}>{formatRupiah(bookBalance)}</span>
                      : <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Pilih akun & periode</span>
                  }
                </div>
              </div>

              {/* Difference preview */}
              {difference != null && form.bank_balance !== '' && (
                <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: difference === 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${difference === 0 ? '#a7f3d0' : '#fecaca'}` }}>
                  <span className="text-[12.5px] font-semibold" style={{ color: difference === 0 ? '#059669' : '#dc2626' }}>Selisih</span>
                  <span className="text-[13px] font-bold" style={{ color: difference === 0 ? '#059669' : '#dc2626' }}>
                    {difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(difference))} ${difference > 0 ? '(Bank lebih)' : '(Buku lebih)'}`}
                  </span>
                </div>
              )}

              <div>
                <label className="input-label">Catatan</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Import Rekonsiliasi Bank</div>
              <button onClick={() => setShowImport(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            {/* Format info — updated columns */}
            <div className="p-3 rounded-xl mb-4" style={{ background: '#F5F3FF', border: '1px solid #EAE8FF' }}>
              <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Format CSV (8 kolom per transaksi)</div>
              <code className="text-[10px]" style={{ color: 'var(--color-text-secondary)', display: 'block', lineHeight: 1.9 }}>
                account_code, period_start, period_end, transaction_date,<br />
                reference_number, description, debit_amount, credit_amount
              </code>
              <div className="text-[10.5px] mt-2 space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <div>• Satu baris = satu transaksi bank statement</div>
                <div>• Baris dengan akun + periode sama akan digabung jadi 1 rekonsiliasi</div>
                <div>• Auto-match berdasarkan <strong>reference_number</strong> ke kode referensi jurnal</div>
                <div>• Gunakan tombol <strong>Template</strong> untuk download contoh file</div>
              </div>
            </div>

            {/* File picker */}
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer"
              style={{ border: '2px dashed #DDD6FE', padding: '24px 16px', background: importFile ? '#F5F3FF' : '#FAFAFF' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={20} style={{ color: 'var(--color-primary)' }} />
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>
                {importFile ? importFile.name : 'Klik untuk pilih file CSV'}
              </span>
              {importFile && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{(importFile.size / 1024).toFixed(1)} KB</span>}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Import result summary */}
            {importSummary && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #EAE8FF' }}>
                <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  {importSummary.total_bank} transaksi diimport
                </div>
                <div className="flex gap-3 flex-wrap">
                  <span className="badge badge-green" style={{ fontSize: 11 }}>
                    ✓ {importSummary.matched} matched
                  </span>
                  {importSummary.unmatched_bank > 0 && (
                    <span className="badge badge-amber" style={{ fontSize: 11 }}>
                      {importSummary.unmatched_bank} unmatched bank
                    </span>
                  )}
                  {importSummary.unmatched_book > 0 && (
                    <span className="badge badge-red" style={{ fontSize: 11 }}>
                      {importSummary.unmatched_book} unmatched buku
                    </span>
                  )}
                </div>
                <div className="mt-2 pt-2 flex gap-4 text-[11px]" style={{ borderTop: '1px solid #EAE8FF', color: 'var(--color-text-muted)' }}>
                  <span>Saldo Bank: <strong style={{ color: 'var(--color-text)' }}>{formatRupiah(importSummary.bank_balance)}</strong></span>
                  <span>Saldo Buku: <strong style={{ color: 'var(--color-text)' }}>{formatRupiah(importSummary.book_balance)}</strong></span>
                  <span style={{ color: importSummary.difference === 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                    {importSummary.difference === 0 ? 'Seimbang ✓' : `Selisih ${formatRupiah(Math.abs(importSummary.difference))}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4 justify-between">
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}><Download size={12} /> Template</button>
              <div className="flex gap-2">
                <button className="btn btn-outline" onClick={() => setShowImport(false)}>Tutup</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing || !importFile}>
                  {importing ? <><Loader2 size={12} className="animate-spin" /> Mengimport...</> : <><Upload size={12} /> Import</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal (simple summary, kept for backwards compat) ────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-[15px]">Detail Rekonsiliasi</div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{detail.reconciliation_code}</div>
              </div>
              <button onClick={() => setDetail(null)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-2 text-[13px]">
              {([
                ['Bank',         detail.bank_name || detail.bank_account_code],
                ['No. Rekening', detail.account_number || '—'],
                ['Periode',      `${formatDate(detail.period_start)} — ${formatDate(detail.period_end)}`],
                ['Saldo Bank',   formatRupiah(detail.bank_balance)],
                ['Saldo Buku',   formatRupiah(detail.book_balance)],
                ['Selisih',      detail.difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(detail.difference))} ${detail.difference > 0 ? '(Bank lebih)' : '(Buku lebih)'}`],
                ['Status',       STATUS_LABEL[detail.status]?.label ?? detail.status],
                ['Dibuat',       formatDate(detail.created_at)],
                ['Catatan',      detail.notes || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span className="font-medium text-right" style={{ color: k === 'Selisih' ? (detail.difference === 0 ? '#059669' : '#dc2626') : 'var(--color-text)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {drawerRec && (
        <DetailDrawer rec={drawerRec} onClose={() => setDrawerRec(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

Run:
```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && npx tsc --noEmit 2>&1 | head -60
```
Expected: no output (zero type errors).

- [ ] **Step 4: Commit**

```bash
cd "/home/mata/Documents/Claude-Ai/Finance/mpg-finance-v2 (2)/mpg-v2" && git add "app/(app)/bank-reconciliations/page.tsx" && git commit -m "feat: add DetailDrawer and richer import summary to bank recon page"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `bank_recon_items` table creation via `CREATE TABLE IF NOT EXISTS` at import time — Task 1
- [x] New CSV template (8 columns) — Task 1 + Task 3 `downloadTemplate()`
- [x] Group rows by `account_code + period_start + period_end` → 1 reconciliation — Task 1
- [x] Insert bank-side items with auto-match via `reference_code` — Task 1
- [x] Insert unmatched book-side items — Task 1
- [x] Totals calculation (bank_balance, book_balance, difference) — Task 1
- [x] Import response JSON with `total_bank`, `matched`, `unmatched_bank`, `unmatched_book`, balances — Task 1
- [x] GET items endpoint `/api/bank-reconciliations/[code]/items` — Task 2
- [x] Code extraction from URL via `split` — Task 2
- [x] Download Template updated — Task 3
- [x] Import modal format info card updated — Task 3
- [x] Richer import summary with matched/unmatched badges — Task 3
- [x] "Lihat Detail" button in table row — Task 3
- [x] DetailDrawer (580px, fixed right) with header, balance strip, tabs — Task 3
- [x] Three tabs: Matched, Unmatched Bank, Unmatched Buku — Task 3
- [x] Per-tab table columns as specified — Task 3

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:**
- `ReconItem` interface matches DB columns (id, reconciliation_code, source, transaction_date, reference_number, description, debit_amount, credit_amount, journal_code, match_status)
- `ImportSummary` interface matches the response JSON shape from Task 1
- `withAuth` signature used correctly (both `(req, user)` and `(req)` forms)
- `query()` import from `@/app/lib/db` consistent across all files
