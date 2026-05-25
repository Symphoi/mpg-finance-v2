// app/api/ca-settlement/route.ts
// FIXED: In v1 this was ca-refund/page.tsx calling ca-settlement API — naming was inconsistent
// Now: page is /ca-settlement, API is /api/ca-settlement, component is CASettlementPage ✓
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
    const caCode = url.searchParams.get('ca_code') ?? '';

    const conditions = ['cs.is_deleted=0'];
    const params: unknown[] = [];
    if (caCode) { conditions.push('cs.ca_code=?'); params.push(caCode); }
    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      query(`
        SELECT cs.*, ca.employee_name, ca.purpose, ca.total_amount AS ca_total,
               ca.used_amount, ca.remaining_amount, ca.status AS ca_status
        FROM ca_settlements cs
        LEFT JOIN cash_advances ca ON ca.ca_code = cs.ca_code
        WHERE ${where}
        ORDER BY cs.created_at DESC LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM ca_settlements cs WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ca_code, expense_items, remaining_action, notes, bank_account_code, attachment_url } = await req.json();
    if (!ca_code) return badRequest('ca_code wajib');
    if (!expense_items?.length) return badRequest('expense_items wajib diisi');

    // Get current CA
    const [caRow] = await query<any>(`SELECT * FROM cash_advances WHERE ca_code=? AND is_deleted=0`, [ca_code]);
    if (!caRow) return badRequest('CA tidak ditemukan');
    if (!['active','approved','partially_used'].includes(caRow.status)) return badRequest('CA tidak dalam status yang bisa disettled');

    const totalExpense  = (expense_items as any[]).reduce((s: number, i: any) => s + Number(i.amount), 0);
    const usedAmount    = Number(caRow.used_amount) + totalExpense;
    const remaining     = Number(caRow.total_amount) - usedAmount;
    const settCode      = `SETT-${ca_code}-${Date.now()}`;

    await query(`
      INSERT INTO ca_settlements
        (settlement_code, ca_code, total_expense, remaining_amount, remaining_action,
         notes, bank_account_code, attachment_url, settled_by, settled_by_code,
         settled_at, is_deleted, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),0,NOW(),NOW())
    `, [settCode, ca_code, totalExpense, remaining < 0 ? 0 : remaining,
        remaining_action ?? 'return', notes ?? null, bank_account_code ?? null,
        attachment_url ?? null, user.name, user.user_code]);

    // Insert expense items
    for (const item of expense_items as any[]) {
      await query(`
        INSERT INTO ca_transactions
          (transaction_code, ca_code, transaction_date, description, amount,
           category, receipt_url, is_deleted, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,0,NOW(),NOW())
      `, [
        `CATX-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
        ca_code, item.date ?? new Date().toISOString().split('T')[0],
        item.description, item.amount,
        item.category ?? null, item.receipt_url ?? null,
      ]);
    }

    // Update CA status & amounts
    const newStatus = remaining <= 0 ? 'fully_used' : 'partially_used';
    await query(
      `UPDATE cash_advances SET used_amount=?, remaining_amount=?, status=?, updated_at=NOW() WHERE ca_code=?`,
      [usedAmount, Math.max(0, remaining), newStatus, ca_code]
    );

    return created({ settlement_code: settCode, total_expense: totalExpense, remaining });
  } catch (err) { return serverError(err); }
});
