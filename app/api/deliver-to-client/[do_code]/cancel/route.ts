import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, badRequest, notFound } from '@/app/lib/response';

export const PATCH = withAuth(async (req: NextRequest, user: any) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const do_code = pathParts[pathParts.length - 2];
  
  const doData: any = await queryOne(`
    SELECT * FROM delivery_orders 
    WHERE do_code = ? AND is_deleted = FALSE
  `, [do_code]);
  
  if (!doData) return notFound('DO tidak ditemukan');
  
  if (doData.status !== 'shipping') {
    return badRequest(`DO status ${doData.status}, tidak bisa dibatalkan`);
  }
  
  if (doData.ar_code) {
    return badRequest(`DO sudah memiliki invoice, tidak bisa dibatalkan`);
  }
  
  await query(`
    UPDATE delivery_orders 
    SET status = 'cancelled', 
        is_deleted = TRUE,
        updated_by = ?
    WHERE do_code = ?
  `, [user.user_code || user.name, do_code]);
  
  const activeDOs: any = await queryOne(`
    SELECT COUNT(*) as active 
    FROM delivery_orders 
    WHERE so_code = ? AND status != 'cancelled' AND is_deleted = FALSE
  `, [doData.so_code]);
  
  if (activeDOs?.active === 0) {
    await query(`
      UPDATE sales_orders 
      SET status = 'submitted', updated_at = NOW()
      WHERE so_code = ?
    `, [doData.so_code]);
  }
  
  return ok({
    message: 'DO dibatalkan',
    data: { do_code, status: 'cancelled' }
  });
});