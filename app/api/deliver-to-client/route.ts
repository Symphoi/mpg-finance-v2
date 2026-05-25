// app/api/deliver-to-client/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') ?? '';
    const soCode = url.searchParams.get('so_code') ?? '';

    const conditions = ['is_deleted=0'];
    const params: unknown[] = [];
    if (status) { conditions.push('status=?'); params.push(status); }
    if (soCode) { conditions.push('so_code=?'); params.push(soCode); }
    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM delivery_orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM delivery_orders WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { so_code, courier, tracking_number, shipping_date, receiver_name, shipping_address, notes } = await req.json();
    if (!so_code || !courier || !shipping_date) return badRequest('so_code, courier, shipping_date wajib');

    const seq = await queryOne<{ current_value: number }>(`SELECT * FROM numbering_sequences WHERE document_type='delivery_order' AND is_active=1 LIMIT 1`);
    const nextNum = (seq?.current_value ?? 0) + 1;
    const doCode  = `DO-${new Date().getFullYear()}-${String(nextNum).padStart(4,'0')}`;

    await query(`
      INSERT INTO delivery_orders
        (do_code, so_code, courier, tracking_number, status, shipping_date,
         receiver_name, shipping_address, notes, created_by, is_deleted, created_at, updated_at)
      VALUES (?,?,'${courier}',?,?,?,?,?,?,?,0,NOW(),NOW())
    `, [doCode, so_code, tracking_number??null, 'created', shipping_date, receiver_name??null, shipping_address??null, notes??null, user.user_code]);

    // Update SO status to shipped
    await query(`UPDATE sales_orders SET status='shipped', updated_at=NOW() WHERE so_code=?`, [so_code]);

    if (seq) await query(`UPDATE numbering_sequences SET current_value=? WHERE document_type='delivery_order'`, [nextNum]);

    return created({ do_code: doCode });
  } catch (err) { return serverError(err); }
});
