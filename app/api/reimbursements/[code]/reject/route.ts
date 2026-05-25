// app/api/reimbursements/[code]/reject/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const code = req.nextUrl.pathname.split('/').at(-2);
    const { rejection_reason } = await req.json();
    if (!code) return badRequest('Code tidak ditemukan');
    if (!rejection_reason?.trim()) return badRequest('Alasan penolakan wajib diisi');

    await query(
      `UPDATE reimbursements SET status='rejected', rejection_reason=?, approved_by_user_code=?, approved_by_user_name=?, approved_date=NOW(), updated_at=NOW() WHERE reimbursement_code=? AND is_deleted=0`,
      [rejection_reason, user.user_code, user.name, code]
    );

    return ok({ reimbursement_code: code, new_status: 'rejected' });
  } catch (err) {
    return serverError(err);
  }
});
