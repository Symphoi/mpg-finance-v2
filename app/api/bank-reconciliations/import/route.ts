// app/api/bank-reconciliations/import/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

interface ImportRow {
  account_code:  string;
  period_start:  string;
  period_end:    string;
  bank_balance:  number;
  notes?:        string;
}

async function getBookBalance(accountCode: string, from: string, to: string): Promise<number> {
  const [row] = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN coa.account_type IN ('asset','expense') THEN ji.debit_amount - ji.credit_amount
                        ELSE ji.credit_amount - ji.debit_amount END), 0) AS balance
     FROM journal_items ji
     JOIN journal_entries je    ON ji.journal_code  = je.journal_code
     JOIN chart_of_accounts coa ON ji.account_code  = coa.account_code
     WHERE ji.account_code = ?
       AND je.status = 'posted'
       AND DATE(je.transaction_date) BETWEEN ? AND ?`,
    [accountCode, from, to],
  ) as any[];
  return Number(row?.balance ?? 0);
}

function parseCSV(text: string): ImportRow[] {
  const lines  = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Strip header row
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 4) continue;
    const [account_code, period_start, period_end, bank_balance_str, notes] = cols;
    if (!account_code || !period_start || !period_end) continue;
    rows.push({
      account_code,
      period_start,
      period_end,
      bank_balance: Number(bank_balance_str?.replace(/[^0-9.-]/g, '') ?? 0),
      notes: notes || undefined,
    });
  }
  return rows;
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return badRequest('File CSV wajib diupload');

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return badRequest('File kosong atau format tidak valid. Pastikan menggunakan template yang benar.');

    const results: { account_code: string; period: string; status: 'ok' | 'error'; message?: string }[] = [];
    let successCount = 0;

    for (const row of rows) {
      try {
        // Validate account exists
        const [acct] = await query(
          `SELECT account_code FROM bank_accounts WHERE account_code = ? LIMIT 1`,
          [row.account_code],
        ) as any[];
        if (!acct) {
          results.push({ account_code: row.account_code, period: `${row.period_start} - ${row.period_end}`, status: 'error', message: 'Kode akun tidak ditemukan' });
          continue;
        }

        const bookBalance = await getBookBalance(row.account_code, row.period_start, row.period_end);
        const difference  = row.bank_balance - bookBalance;
        const reconcCode  = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        await query(
          `INSERT INTO bank_reconciliations
             (reconciliation_code, bank_account_code, period_start, period_end, statement_date,
              bank_balance, book_balance, difference, ending_balance, status, notes, created_by, created_at, updated_at)
           VALUES (?,?,?,?,?, ?,?,?,?, 'draft', ?,?,NOW(),NOW())`,
          [reconcCode, row.account_code, row.period_start, row.period_end, row.period_end,
           row.bank_balance, bookBalance, difference, row.bank_balance,
           row.notes ?? null, user.user_code],
        );

        results.push({ account_code: row.account_code, period: `${row.period_start} - ${row.period_end}`, status: 'ok' });
        successCount++;
      } catch (rowErr: any) {
        results.push({ account_code: row.account_code, period: `${row.period_start} - ${row.period_end}`, status: 'error', message: rowErr?.message ?? 'Gagal' });
      }
    }

    return ok({ total: rows.length, success: successCount, failed: rows.length - successCount, results });
  } catch (err) {
    return serverError(err);
  }
});
