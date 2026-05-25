// app/api/approval-transactions/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { po_code, action, rejection_reason, approval_notes } = await req.json();
    if (!po_code || !action) return badRequest('po_code dan action wajib diisi');

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Determine current status
    const [poRows] = await query(`SELECT status, approval_level FROM purchase_orders WHERE po_code=? AND is_deleted=0`, [po_code]) as any[];
    if (!poRows) return badRequest('PO tidak ditemukan');

    const currentStatus = poRows.status;
    const approvalLevel = poRows.approval_level;

    if (action === 'approve') {
      let newStatus = '';
      let updateFields = '';
      let params: unknown[] = [];

      if (currentStatus === 'submitted') {
        newStatus = 'approved_spv';
        updateFields = 'status=?, approved_by_spv=?, approved_date_spv=?, updated_at=NOW()';
        params = [newStatus, user.name, dateStr, po_code];
      } else if (currentStatus === 'approved_spv') {
        newStatus = 'approved_finance';
        updateFields = 'status=?, approved_by_finance=?, approved_date_finance=?, approval_level=?, updated_at=NOW()';
        params = [newStatus, user.name, dateStr, 'finance', po_code];
      } else {
        return badRequest(`PO status "${currentStatus}" tidak bisa diapprove`);
      }

      await query(`UPDATE purchase_orders SET ${updateFields} WHERE po_code=?`, params);
      return ok({ po_code, new_status: newStatus });
    }

    if (action === 'reject') {
      if (!rejection_reason?.trim()) return badRequest('Alasan penolakan wajib diisi');
      await query(
        `UPDATE purchase_orders SET status='rejected', rejection_reason=?, updated_at=NOW() WHERE po_code=?`,
        [rejection_reason, po_code]
      );
      return ok({ po_code, new_status: 'rejected' });
    }

    if (action === 'mark_paid') {
      if (currentStatus !== 'approved_finance') return badRequest('PO harus approved finance sebelum dibayar');
      await query(
        `UPDATE purchase_orders SET status='paid', updated_at=NOW() WHERE po_code=?`,
        [po_code]
      );
      return ok({ po_code, new_status: 'paid' });
    }

    return badRequest('Action tidak dikenal. Gunakan: approve, reject, mark_paid');
  } catch (err) {
    return serverError(err);
  }
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url  = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') ?? 'submitted';

    const conditions = ['po.is_deleted=0'];
    const params: unknown[] = [];
    if (status) { conditions.push('po.status=?'); params.push(status); }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT po.*, (SELECT COUNT(*) FROM purchase_order_items WHERE po_code=po.po_code AND is_deleted=0) AS item_count
             FROM purchase_orders po WHERE ${where} ORDER BY po.created_at ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM purchase_orders po WHERE ${where}`, params),
    ]);

    return ok(rows, { total: Number((count as any[])[0]?.total ?? 0), page, limit });
  } catch (err) {
    return serverError(err);
  }
});
