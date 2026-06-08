// app/api/bank-reconciliations/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const id     = url.searchParams.get('id');

    if (id) {
      const [rows] = await query(`SELECT * FROM bank_reconciliations WHERE id=?`, [id]) as any[];
      if (!rows) return ok(null);
      const items = await query(`SELECT * FROM bank_reconciliations WHERE id=?`, [id]);
      return ok({ ...rows, items });
    }

    const [rows, count] = await Promise.all([
      query(`SELECT br.*, ba.bank_name, ba.account_number FROM bank_reconciliations br
             LEFT JOIN bank_accounts ba ON ba.account_code=br.bank_account_code
             ORDER BY br.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]),
      query(`SELECT COUNT(*) AS total FROM bank_reconciliations`),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { account_code, period_start, period_end, bank_balance, book_balance, notes } = await req.json();
    if (!account_code || !period_start || !period_end) return badRequest('account_code, period_start, period_end wajib');

    const reconcCode = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const difference = Number(bank_balance ?? 0) - Number(book_balance ?? 0);
    await query(
      `INSERT INTO bank_reconciliations
        (reconciliation_code, bank_account_code, period_start, period_end, statement_date,
         bank_balance, book_balance, difference, ending_balance, status, notes, created_by, created_at, updated_at)
       VALUES (?,?,?,?,?, ?,?,?,?, 'draft', ?,?,NOW(),NOW())`,
      [reconcCode, account_code, period_start, period_end, period_end,
       bank_balance??0, book_balance??0, difference, bank_balance??0,
       notes??null, user.user_code]
    );
    return created({ difference });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { id, bank_balance, book_balance, notes, status } = await req.json();
    if (!id) return badRequest('id wajib');
    const difference = Number(bank_balance ?? 0) - Number(book_balance ?? 0);
    await query(
      `UPDATE bank_reconciliations SET bank_balance=?,book_balance=?,difference=?,notes=?,status=?,updated_at=NOW() WHERE id=?`,
      [bank_balance??0, book_balance??0, difference, notes??null, status??'draft', id]
    );
    return ok({ id, difference });
  } catch (err) { return serverError(err); }
});
