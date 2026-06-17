// app/api/bank-reconciliations/import/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

const CREATE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS bank_recon_items (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    reconciliation_code VARCHAR(50) NOT NULL,
    source           ENUM('bank','book') NOT NULL,
    transaction_date DATE,
    reference_number VARCHAR(150),
    description      TEXT,
    debit_amount     DECIMAL(15,2) DEFAULT 0,
    credit_amount    DECIMAL(15,2) DEFAULT 0,
    journal_code     VARCHAR(50)   DEFAULT NULL,
    match_status     ENUM('matched','unmatched') DEFAULT 'unmatched',
    created_at       DATETIME DEFAULT NOW(),
    INDEX idx_recon_code (reconciliation_code),
    INDEX idx_source     (source),
    INDEX idx_match      (match_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

interface CSVRow {
  account_code:    string;
  period_start:    string;
  period_end:      string;
  transaction_date: string;
  reference_number: string;
  description:     string;
  debit_amount:    number;
  credit_amount:   number;
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) continue;
    const [account_code, period_start, period_end, transaction_date, reference_number, description, debit_str = '0', credit_str = '0'] = cols;
    if (!account_code || !period_start || !period_end || !transaction_date) continue;
    rows.push({
      account_code, period_start, period_end, transaction_date,
      reference_number: reference_number || '',
      description: description || '',
      debit_amount:  Number(debit_str.replace(/[^0-9.-]/g, '')  || 0),
      credit_amount: Number(credit_str.replace(/[^0-9.-]/g, '') || 0),
    });
  }
  return rows;
}

async function getBookBalance(accountCode: string, from: string, to: string): Promise<number> {
  const [row] = await query(
    `SELECT COALESCE(SUM(
       CASE WHEN coa.account_type IN ('asset','expense')
            THEN ji.debit_amount - ji.credit_amount
            ELSE ji.credit_amount - ji.debit_amount END
     ), 0) AS balance
     FROM journal_items ji
     JOIN journal_entries   je  ON ji.journal_code  = je.journal_code
     JOIN chart_of_accounts coa ON ji.account_code  = coa.account_code
     WHERE ji.account_code = ? AND je.status = 'posted'
       AND DATE(je.transaction_date) BETWEEN ? AND ?`,
    [accountCode, from, to],
  ) as any[];
  return Number(row?.balance ?? 0);
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await query(CREATE_ITEMS_TABLE);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return badRequest('File CSV wajib diupload');

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return badRequest('File kosong atau format tidak valid');

    // Group rows by account_code + period_start + period_end
    const groups = new Map<string, CSVRow[]>();
    for (const row of rows) {
      const key = `${row.account_code}|${row.period_start}|${row.period_end}`;
      const arr = groups.get(key) ?? [];
      arr.push(row);
      groups.set(key, arr);
    }

    const results: {
      account_code: string; period: string; reconciliation_code: string;
      matched: number; unmatched_bank: number; unmatched_book: number;
      status: 'ok' | 'error'; message?: string;
    }[] = [];
    let successCount = 0;

    for (const [, groupRows] of groups) {
      const { account_code, period_start, period_end } = groupRows[0];
      const periodLabel = `${period_start} — ${period_end}`;

      try {
        // Validate account exists
        const [acct] = await query(
          `SELECT account_code FROM bank_accounts WHERE account_code = ? LIMIT 1`,
          [account_code],
        ) as any[];
        if (!acct) {
          results.push({ account_code, period: periodLabel, reconciliation_code: '', matched: 0, unmatched_bank: 0, unmatched_book: 0, status: 'error', message: 'Kode akun tidak ditemukan di bank_accounts' });
          continue;
        }

        const bankBalance  = groupRows.reduce((s, r) => s + r.debit_amount - r.credit_amount, 0);
        const bookBalance  = await getBookBalance(account_code, period_start, period_end);
        const difference   = bankBalance - bookBalance;
        const reconcCode   = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        // Insert reconciliation header
        await query(
          `INSERT INTO bank_reconciliations
             (reconciliation_code, bank_account_code, period_start, period_end, statement_date,
              bank_balance, book_balance, difference, ending_balance, status, notes, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,'draft',NULL,?,NOW(),NOW())`,
          [reconcCode, account_code, period_start, period_end, period_end,
           bankBalance, bookBalance, difference, bankBalance, user.user_code],
        );

        // Insert bank-side items from CSV
        for (const r of groupRows) {
          await query(
            `INSERT INTO bank_recon_items
               (reconciliation_code, source, transaction_date, reference_number, description, debit_amount, credit_amount, match_status)
             VALUES (?, 'bank', ?, ?, ?, ?, ?, 'unmatched')`,
            [reconcCode, r.transaction_date, r.reference_number, r.description, r.debit_amount, r.credit_amount],
          );
        }

        // Auto-match bank items with journal entries by reference_code
        await query(
          `UPDATE bank_recon_items bri
           JOIN journal_entries je
             ON je.reference_code = bri.reference_number
            AND je.status         = 'posted'
            AND DATE(je.transaction_date) BETWEEN ? AND ?
           SET bri.match_status = 'matched',
               bri.journal_code = je.journal_code
           WHERE bri.reconciliation_code = ?
             AND bri.source              = 'bank'
             AND bri.reference_number   != ''`,
          [period_start, period_end, reconcCode],
        );

        // Insert book-side items: journal entries in period not matched
        await query(
          `INSERT INTO bank_recon_items
             (reconciliation_code, source, transaction_date, reference_number, description, debit_amount, credit_amount, journal_code, match_status)
           SELECT ?, 'book', DATE(je.transaction_date), je.reference_code, je.description,
                  SUM(ji.debit_amount), SUM(ji.credit_amount), je.journal_code, 'unmatched'
           FROM journal_entries je
           JOIN journal_items ji ON je.journal_code = ji.journal_code
           WHERE ji.account_code = ?
             AND je.status       = 'posted'
             AND DATE(je.transaction_date) BETWEEN ? AND ?
             AND (je.reference_code IS NULL OR je.reference_code = ''
               OR je.reference_code NOT IN (
                 SELECT reference_number FROM bank_recon_items
                 WHERE reconciliation_code = ? AND source = 'bank' AND match_status = 'matched'
                   AND reference_number IS NOT NULL AND reference_number != ''
               ))
           GROUP BY je.journal_code`,
          [reconcCode, account_code, period_start, period_end, reconcCode],
        );

        // Count results
        const counts = await query(
          `SELECT source, match_status, COUNT(*) AS cnt
           FROM bank_recon_items WHERE reconciliation_code = ?
           GROUP BY source, match_status`,
          [reconcCode],
        ) as any[];

        let matched = 0, unmatched_bank = 0, unmatched_book = 0;
        for (const c of counts) {
          if (c.source === 'bank'  && c.match_status === 'matched')   matched      += Number(c.cnt);
          if (c.source === 'bank'  && c.match_status === 'unmatched') unmatched_bank += Number(c.cnt);
          if (c.source === 'book'  && c.match_status === 'unmatched') unmatched_book += Number(c.cnt);
        }

        results.push({ account_code, period: periodLabel, reconciliation_code: reconcCode, matched, unmatched_bank, unmatched_book, status: 'ok' });
        successCount++;
      } catch (rowErr: any) {
        results.push({ account_code, period: periodLabel, reconciliation_code: '', matched: 0, unmatched_bank: 0, unmatched_book: 0, status: 'error', message: rowErr?.message ?? 'Gagal' });
      }
    }

    return ok({ total: groups.size, success: successCount, failed: groups.size - successCount, results });
  } catch (err) {
    return serverError(err);
  }
});
