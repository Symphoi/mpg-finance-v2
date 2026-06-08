// app/api/bank-reconciliations/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

// Calculate book balance from journal_items for a given account + date range
async function getBookBalance(accountCode: string, from: string, to: string): Promise<number> {
  const [row] = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN coa.account_type IN ('asset','expense') THEN ji.debit_amount - ji.credit_amount
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

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const id     = url.searchParams.get('id');

    // ── ?action=book_balance — auto-fetch saldo buku dari jurnal ──────────
    if (url.searchParams.get('action') === 'book_balance') {
      const accountCode = url.searchParams.get('account_code') ?? '';
      const from        = url.searchParams.get('from') ?? '';
      const to          = url.searchParams.get('to')   ?? '';
      if (!accountCode || !from || !to) return badRequest('account_code, from, to wajib');
      const balance = await getBookBalance(accountCode, from, to);
      return ok({ balance });
    }

    // ── GET by id — detail rekonsiliasi ───────────────────────────────────
    if (id) {
      const [row] = await query(
        `SELECT br.*, ba.bank_name, ba.account_number
         FROM bank_reconciliations br
         LEFT JOIN bank_accounts ba ON ba.account_code = br.bank_account_code
         WHERE br.id = ?`,
        [id],
      ) as any[];
      if (!row) return ok(null);
      return ok(row);
    }

    // ── GET list ──────────────────────────────────────────────────────────
    const [rows, count] = await Promise.all([
      query(
        `SELECT br.*, ba.bank_name, ba.account_number
         FROM bank_reconciliations br
         LEFT JOIN bank_accounts ba ON ba.account_code = br.bank_account_code
         ORDER BY br.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      ),
      query(`SELECT COUNT(*) AS total FROM bank_reconciliations`),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { account_code, period_start, period_end, bank_balance, book_balance, notes } = await req.json();
    if (!account_code || !period_start || !period_end) return badRequest('account_code, period_start, period_end wajib');

    // Auto-calculate book balance from journal if not provided
    const finalBookBalance = book_balance != null
      ? Number(book_balance)
      : await getBookBalance(account_code, period_start, period_end);

    const reconcCode = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const difference = Number(bank_balance ?? 0) - finalBookBalance;

    await query(
      `INSERT INTO bank_reconciliations
         (reconciliation_code, bank_account_code, period_start, period_end, statement_date,
          bank_balance, book_balance, difference, ending_balance, status, notes, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?, ?,?,?,?, 'draft', ?,?,NOW(),NOW())`,
      [reconcCode, account_code, period_start, period_end, period_end,
       bank_balance ?? 0, finalBookBalance, difference, bank_balance ?? 0,
       notes ?? null, user.user_code],
    );
    return created({ reconciliation_code: reconcCode, book_balance: finalBookBalance, difference });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { id, bank_balance, book_balance, notes, status } = await req.json();
    if (!id) return badRequest('id wajib');
    const difference = Number(bank_balance ?? 0) - Number(book_balance ?? 0);
    await query(
      `UPDATE bank_reconciliations
       SET bank_balance=?, book_balance=?, difference=?, notes=?, status=?, updated_at=NOW()
       WHERE id=?`,
      [bank_balance ?? 0, book_balance ?? 0, difference, notes ?? null, status ?? 'draft', id],
    );
    return ok({ id, difference });
  } catch (err) { return serverError(err); }
});
