// app/api/ca-transactions/route.ts
// Records individual spending transactions under a cash advance
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const caCode = url.searchParams.get('ca_code') ?? '';
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;

    const conds: string[] = ['ct.is_deleted=0'];
    const params: unknown[] = [];
    if (caCode) { conds.push('ct.ca_code=?'); params.push(caCode); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`
        SELECT ct.*, ca.employee_name, ca.purpose AS ca_purpose
        FROM ca_transactions ct
        LEFT JOIN cash_advances ca ON ca.ca_code = ct.ca_code
        WHERE ${where}
        ORDER BY ct.transaction_date DESC LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM ca_transactions ct WHERE ${where}`, params),
    ]);

    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ca_code, transaction_date, description, amount, category, receipt_url } = await req.json();
    if (!ca_code || !description || !amount) return badRequest('ca_code, description, amount wajib');

    // Check CA exists and has enough remaining
    const [ca] = await query<any>(`SELECT * FROM cash_advances WHERE ca_code=? AND is_deleted=0`, [ca_code]);
    if (!ca) return badRequest('CA tidak ditemukan');
    if (Number(ca.remaining_amount) < Number(amount)) return badRequest(`Sisa CA (${ca.remaining_amount}) tidak cukup untuk transaksi ini (${amount})`);

    const txCode = `CATX-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    await query(
      `INSERT INTO ca_transactions (transaction_code,ca_code,transaction_date,description,amount,category,receipt_url,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,NOW(),NOW())`,
      [txCode, ca_code, transaction_date ?? new Date().toISOString().split('T')[0], description, amount, category ?? null, receipt_url ?? null]
    );

    // Update CA used_amount and remaining_amount
    const newUsed      = Number(ca.used_amount) + Number(amount);
    const newRemaining = Number(ca.total_amount) - newUsed;
    const newStatus    = newRemaining <= 0 ? 'fully_used' : 'partially_used';
    await query(
      `UPDATE cash_advances SET used_amount=?,remaining_amount=?,status=?,updated_at=NOW() WHERE ca_code=?`,
      [newUsed, Math.max(0, newRemaining), newStatus, ca_code]
    );

    return created({ transaction_code: txCode, remaining_amount: Math.max(0, newRemaining) });
  } catch (err) { return serverError(err); }
});
