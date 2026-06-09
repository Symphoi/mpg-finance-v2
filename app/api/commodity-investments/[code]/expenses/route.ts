import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, badRequest, notFound, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/expenses')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const expenses = await query(
      `SELECT * FROM commodity_expenses WHERE investment_code = ? ORDER BY expense_date DESC`,
      [code],
    );
    return ok(expenses);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/expenses')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const { expense_date, description, amount, notes } = await req.json();
    if (!expense_date || !description || !amount) {
      return badRequest('expense_date, description, dan amount wajib');
    }

    const [inv] = await query(
      `SELECT * FROM commodity_investments WHERE investment_code = ?`, [code],
    ) as any[];
    if (!inv)                       return notFound('Investasi tidak ditemukan');
    if (inv.status === 'cancelled') return badRequest('Investasi sudah dibatalkan');

    const rand         = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expense_code = `EXP-${new Date().getFullYear()}-${rand}`;

    await query(
      `INSERT INTO commodity_expenses (expense_code, investment_code, expense_date, description, amount, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [expense_code, code, expense_date, description, amount, notes || null, user.user_code],
    );

    return created({ expense_code });
  } catch (err) { return serverError(err); }
});
