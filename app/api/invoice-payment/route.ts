// app/api/invoice-payment/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { paginated, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';

    const conditions = ['is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conditions.push('(so_code LIKE ? OR invoice_number LIKE ? OR customer_name LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (status) { conditions.push('status=?'); params.push(status); }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM sales_orders WHERE ${where} ORDER BY invoice_date DESC, created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM sales_orders WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});
