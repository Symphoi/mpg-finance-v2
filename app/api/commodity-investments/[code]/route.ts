import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, notFound, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const [inv] = await query(`
      SELECT ci.*, p.project_name
      FROM commodity_investments ci
      LEFT JOIN projects p ON ci.project_code = p.project_code
      WHERE ci.investment_code = ?
    `, [code]) as any[];

    if (!inv) return notFound('Investasi tidak ditemukan');

    const returns = await query(
      `SELECT * FROM commodity_returns WHERE investment_code = ? ORDER BY return_date DESC`,
      [code],
    );

    return ok({ ...inv, returns });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/commodity-investments/')[1]?.split('/')[0] ?? '';
    if (!code) return notFound('Kode investasi tidak ditemukan');

    const [inv] = await query(
      `SELECT * FROM commodity_investments WHERE investment_code = ?`, [code],
    ) as any[];
    if (!inv) return notFound('Investasi tidak ditemukan');

    const body = await req.json();
    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.status && ['active', 'completed', 'cancelled'].includes(body.status)) {
      updates.push('status = ?'); params.push(body.status);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?'); params.push(body.notes);
    }

    if (updates.length === 0) return badRequest('Tidak ada field yang diupdate');

    updates.push('updated_at = NOW()');
    params.push(code);

    await query(
      `UPDATE commodity_investments SET ${updates.join(', ')} WHERE investment_code = ?`,
      params,
    );

    return ok({ investment_code: code });
  } catch (err) { return serverError(err); }
});
