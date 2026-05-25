// app/api/reimbursements/[code]/approve/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const code = req.nextUrl.pathname.split('/').at(-2);
    if (!code) return badRequest('Code tidak ditemukan');

    const [rows] = await query(`SELECT status FROM reimbursements WHERE reimbursement_code=? AND is_deleted=0`, [code]) as any[];
    if (!rows) return badRequest('Reimbursement tidak ditemukan');
    if (rows.status !== 'submitted') return badRequest('Hanya bisa approve reimbursement yang submitted');

    await query(
      `UPDATE reimbursements SET status='approved', approved_by_user_code=?, approved_by_user_name=?, approved_date=NOW(), updated_at=NOW() WHERE reimbursement_code=?`,
      [user.user_code, user.name, code]
    );

    return ok({ reimbursement_code: code, new_status: 'approved' });
  } catch (err) {
    return serverError(err);
  }
});
