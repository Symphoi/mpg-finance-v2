import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, badRequest, notFound, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/returns')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const returns = await query(
      `SELECT * FROM commodity_returns WHERE investment_code = ? ORDER BY return_date DESC`,
      [code],
    );
    return ok(returns);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/returns')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const { return_date, amount, notes } = await req.json();
    if (!return_date || !amount) return badRequest('return_date dan amount wajib');

    const [inv] = await query(
      `SELECT * FROM commodity_investments WHERE investment_code = ?`, [code],
    ) as any[];
    if (!inv)                      return notFound('Investasi tidak ditemukan');
    if (inv.status === 'cancelled') return badRequest('Investasi sudah dibatalkan');

    const rand        = Math.random().toString(36).slice(2, 8).toUpperCase();
    const return_code = `RET-${new Date().getFullYear()}-${rand}`;

    await query(
      `INSERT INTO commodity_returns (return_code, investment_code, return_date, amount, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [return_code, code, return_date, amount, notes || null, user.user_code],
    );

    const newTotal = Number(inv.total_return) + Number(amount);
    await query(
      `UPDATE commodity_investments SET total_return = ?, updated_at = NOW() WHERE investment_code = ?`,
      [newTotal, code],
    );

    return created({ return_code, total_return: newTotal });
  } catch (err) { return serverError(err); }
});
