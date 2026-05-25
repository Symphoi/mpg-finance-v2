// app/api/invoice-payment/[code]/mark-paid/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const parts  = req.nextUrl.pathname.split('/');
    const soCode = parts[parts.length - 2];
    if (!soCode) return badRequest('SO code tidak ditemukan');

    await query(
      `UPDATE sales_orders SET status='completed', accounting_status='paid', updated_at=NOW() WHERE so_code=? AND is_deleted=0`,
      [soCode]
    );
    return ok({ so_code: soCode, new_status: 'completed' });
  } catch (err) { return serverError(err); }
});
