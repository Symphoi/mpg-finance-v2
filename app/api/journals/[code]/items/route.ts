// app/api/journals/[code]/items/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, notFound, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/api/journals/')[1]?.split('/items')[0];

    const items = await query(
      `SELECT
         ji.account_code,
         coa.account_name,
         ji.debit_amount,
         ji.credit_amount,
         ji.description
       FROM journal_items ji
       LEFT JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
       WHERE ji.journal_code = ?
       ORDER BY ji.debit_amount DESC`,
      [code],
    );

    if (!(items as any[]).length) return notFound('Jurnal tidak ditemukan atau tidak memiliki item');

    return ok(items);
  } catch (err) {
    return serverError(err);
  }
});
