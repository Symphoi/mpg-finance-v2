// app/api/invoice-payment/detail/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { queryOne } from '@/app/lib/db';
import { ok, notFound } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const ar_code = searchParams.get('ar_code');

  if (!ar_code) {
    return ok({ data: null });
  }

  const data = await queryOne(`
    SELECT 
      ar.ar_code,
      c.customer_name,
      ar.invoice_date,
      ar.due_date,
      ar.amount,
      ar.outstanding_amount,
      ar.status,
      ar.so_code,
      ar.description,
      ar.created_at,
      ar.invoice_number
    FROM accounts_receivable ar
    LEFT JOIN sales_orders so ON ar.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    WHERE ar.ar_code = ? AND ar.is_deleted = FALSE
  `, [ar_code]);

  if (!data) {
    return notFound('Invoice tidak ditemukan');
  }

  return ok({ data });
});