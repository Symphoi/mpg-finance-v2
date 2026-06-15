// app/api/accounting-entries/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    // ── COA dropdown ──────────────────────────────────────────────────────
    if (action === 'accounts') {
      const accounts = await query(
        `SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE is_active=1 ORDER BY account_code`
      );
      return ok(accounts);
    }

    // ── Tarik dari Sistem ─────────────────────────────────────────────────
    if (action === 'pull') {
      const type = url.searchParams.get('type') ?? '';

      if (type === 'AR') {
        const rows = await query(
          `SELECT
             ar.ar_code, ar.invoice_number, ar.invoice_date, ar.amount,
             ar.tax_amount, ar.outstanding_amount, ar.status, ar.so_code,
             c.customer_name
           FROM accounts_receivable ar
           LEFT JOIN customers c ON ar.customer_code = c.customer_code
           WHERE ar.is_deleted = 0
             AND ar.ar_code NOT IN (
               SELECT source_ref FROM accounting_entries
               WHERE entry_type='AR' AND source_type='system' AND source_ref IS NOT NULL
             )
           ORDER BY ar.invoice_date DESC
           LIMIT 200`
        );
        return ok(rows);
      }

      if (type === 'AP') {
        const rows = await query(
          `SELECT
             po.po_code, po.total_amount, po.tax_amount, po.status, po.so_code,
             po.created_at, s.supplier_name,
             GROUP_CONCAT(poi.product_name SEPARATOR ', ') AS items
           FROM purchase_orders po
           LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
           LEFT JOIN purchase_order_items poi ON po.po_code = poi.po_code
           WHERE po.is_deleted = 0
             AND po.status IN ('approved','paid')
             AND po.po_code NOT IN (
               SELECT source_ref FROM accounting_entries
               WHERE entry_type='AP' AND source_type='system' AND source_ref IS NOT NULL
             )
           GROUP BY po.po_code
           ORDER BY po.created_at DESC
           LIMIT 200`
        );
        return ok(rows);
      }

      if (type === 'Bank') {
        return ok([]);
      }

      return badRequest('type wajib: AR | AP | Bank');
    }

    // ── List entries ──────────────────────────────────────────────────────
    const type   = url.searchParams.get('type')   ?? 'AR';
    const month  = url.searchParams.get('month')  ?? '';
    const status = url.searchParams.get('status') ?? '';
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(200, parseInt(url.searchParams.get('limit') ?? '100'));
    const offset = (page - 1) * limit;

    const conds: string[]    = ['ae.entry_type = ?'];
    const params: unknown[]  = [type];

    if (month) {
      conds.push('DATE_FORMAT(ae.entry_date, "%Y-%m") = ?');
      params.push(month);
    }
    if (status && status !== 'all') {
      conds.push('ae.status = ?');
      params.push(status);
    }

    const where = conds.join(' AND ');

    const [rows, count] = await Promise.all([
      query(
        `SELECT
           ae.*,
           dr.account_name AS dr_account_name,
           cr.account_name AS cr_account_name
         FROM accounting_entries ae
         LEFT JOIN chart_of_accounts dr ON ae.dr_account_code = dr.account_code
         LEFT JOIN chart_of_accounts cr ON ae.cr_account_code = cr.account_code
         WHERE ${where}
         ORDER BY ae.entry_date DESC, ae.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) AS total FROM accounting_entries ae WHERE ${where}`, params),
    ]);

    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { type, entries } = body as { type: string; entries: any[] };

    if (!type || !entries?.length) return badRequest('type dan entries wajib');
    if (!['AR','AP','Bank'].includes(type)) return badRequest('type harus AR | AP | Bank');

    const created_codes: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.entry_date) return badRequest(`entry_date wajib di baris ${i + 1}`);

      const entry_code = `AE-${type}-${Date.now()}-${i}`;
      await query(
        `INSERT INTO accounting_entries
           (entry_code,entry_type,source_type,source_ref,entry_date,description,reference,
            amount,dr_account_code,cr_account_code,status,meta,created_by,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,'draft',?,?,NOW(),NOW())`,
        [
          entry_code, type,
          e.source_type ?? 'manual',
          e.source_ref  ?? null,
          e.entry_date,
          e.description ?? null,
          e.reference   ?? null,
          Number(e.amount) || 0,
          e.dr_account_code ?? null,
          e.cr_account_code ?? null,
          JSON.stringify(e.meta ?? {}),
          user.user_code,
        ]
      );
      created_codes.push(entry_code);
    }

    return created({ count: created_codes.length, codes: created_codes });
  } catch (err) { return serverError(err); }
});

export const PATCH = withAuth(async (req: NextRequest) => {
  try {
    const { id, dr_account_code, cr_account_code } = await req.json();
    if (!id) return badRequest('id wajib');

    const [row] = await query(`SELECT status FROM accounting_entries WHERE id=?`, [id]) as any[];
    if (!row) return badRequest('Entry tidak ditemukan');
    if (row.status === 'posted') return badRequest('Entry sudah posted, tidak bisa diubah');

    await query(
      `UPDATE accounting_entries SET dr_account_code=?, cr_account_code=?, updated_at=NOW() WHERE id=?`,
      [dr_account_code ?? null, cr_account_code ?? null, id]
    );

    return ok({ updated: true });
  } catch (err) { return serverError(err); }
});

export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const id  = url.searchParams.get('id');
    if (!id) return badRequest('id wajib');

    const [row] = await query(`SELECT status FROM accounting_entries WHERE id=?`, [id]) as any[];
    if (!row) return badRequest('Entry tidak ditemukan');
    if (row.status === 'posted') return badRequest('Entry sudah posted, tidak bisa dihapus');

    await query(`DELETE FROM accounting_entries WHERE id=?`, [id]);
    return ok({ deleted: true });
  } catch (err) { return serverError(err); }
});
