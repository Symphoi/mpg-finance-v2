// app/api/deliver-to-client/[code]/received/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const parts   = req.nextUrl.pathname.split('/');
    const doCode  = parts[parts.length - 2];
    if (!doCode) return badRequest('DO code tidak ditemukan');

    const [doRow] = await query<any>(`SELECT * FROM delivery_orders WHERE do_code=? AND is_deleted=0`, [doCode]);
    if (!doRow) return badRequest('DO tidak ditemukan');

    await query(
      `UPDATE delivery_orders SET status='delivered', received_date=NOW(), updated_at=NOW() WHERE do_code=?`,
      [doCode]
    );

    // Update SO status to delivered
    await query(`UPDATE sales_orders SET status='delivered', updated_at=NOW() WHERE so_code=?`, [doRow.so_code]);

    return ok({ do_code: doCode, so_code: doRow.so_code, new_status: 'delivered' });
  } catch (err) { return serverError(err); }
});
