// app/api/ca-approval/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') ?? 'submitted';

    const conditions = ['is_deleted=0'];
    const params: unknown[] = [];
    if (status) { conditions.push('status=?'); params.push(status); }
    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM cash_advances WHERE ${where} ORDER BY created_at ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM cash_advances WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ca_code, action, rejection_reason } = await req.json();
    if (!ca_code || !action) return badRequest('ca_code dan action wajib');

    if (action === 'approve') {
      await query(
        `UPDATE cash_advances SET status='approved', approved_by=?, approved_by_code=?, approved_date=NOW(), updated_at=NOW() WHERE ca_code=? AND is_deleted=0`,
        [user.name, user.user_code, ca_code]
      );
      return ok({ ca_code, new_status: 'approved' });
    }

    if (action === 'reject') {
      if (!rejection_reason?.trim()) return badRequest('Alasan penolakan wajib');
      await query(
        `UPDATE cash_advances SET status='rejected', rejection_reason=?, updated_at=NOW() WHERE ca_code=? AND is_deleted=0`,
        [rejection_reason, ca_code]
      );
      return ok({ ca_code, new_status: 'rejected' });
    }

    if (action === 'activate') {
      await query(
        `UPDATE cash_advances SET status='active', updated_at=NOW() WHERE ca_code=? AND status='approved' AND is_deleted=0`,
        [ca_code]
      );
      return ok({ ca_code, new_status: 'active' });
    }

    return badRequest('Action tidak valid. Gunakan: approve, reject, activate');
  } catch (err) { return serverError(err); }
});
