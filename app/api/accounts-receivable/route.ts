// app/api/accounts-receivable/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const so_code         = searchParams.get('so_code');
  const ar_code         = searchParams.get('ar_code');
  const includePayments = searchParams.get('include_payments') === '1';

  if (ar_code) {
    const arData = await query(`
      SELECT ar_code, invoice_number, invoice_date, due_date, amount, outstanding_amount, status, so_code, description
      FROM accounts_receivable
      WHERE ar_code = ? AND is_deleted = FALSE
    `, [ar_code]);

    let payments: any[] = [];
    if (includePayments) {
      payments = await query(`
        SELECT p.payment_code, pa.amount, p.payment_date, p.payment_method,
               p.bank_name, p.account_number, p.reference_number, p.notes, p.status
        FROM payment_allocations pa
        JOIN payments p ON pa.payment_code = p.payment_code
        WHERE pa.ar_code = ?
        ORDER BY p.payment_date DESC
      `, [ar_code]);
    }

    const row = (arData as any[])[0] ?? null;
    return ok({ data: row ? { ...row, payments } : null });
  }

  if (!so_code) return ok({ data: [] });

  const data = await query(`
    SELECT ar_code, invoice_number, invoice_date, amount, outstanding_amount, status
    FROM accounts_receivable
    WHERE so_code = ? AND is_deleted = FALSE
    ORDER BY invoice_date DESC
  `, [so_code]);

  return ok({ data });
});
