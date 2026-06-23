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
             c.customer_name, c.tax_id AS npwp,
             so.total_amount AS nilai_kontrak,
             GROUP_CONCAT(DISTINCT soi.product_name ORDER BY soi.id SEPARATOR ', ') AS items,
             MIN(po.po_code) AS po_code
           FROM accounts_receivable ar
           LEFT JOIN customers c ON ar.customer_code = c.customer_code
           LEFT JOIN sales_orders so ON ar.so_code = so.so_code
           LEFT JOIN sales_order_items soi ON ar.so_code = soi.so_code AND soi.is_deleted = 0
           LEFT JOIN purchase_orders po ON ar.so_code = po.so_code AND po.is_deleted = 0
           WHERE ar.is_deleted = 0
             AND ar.ar_code NOT IN (
               SELECT source_ref FROM accounting_entries
               WHERE entry_type='AR' AND source_type='system' AND source_ref IS NOT NULL
             )
           GROUP BY ar.ar_code, ar.invoice_number, ar.invoice_date, ar.amount,
                    ar.tax_amount, ar.outstanding_amount, ar.status, ar.so_code,
                    c.customer_name, c.tax_id, so.total_amount
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

// ── Sync Meta — refresh meta for existing draft system-pulled entries ──────────
export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { type } = await req.json() as { type: string };
    if (!['AR', 'AP'].includes(type)) return badRequest('type harus AR atau AP');

    if (type === 'AR') {
      const entries = await query(
        `SELECT ae.id, ae.source_ref FROM accounting_entries ae
         WHERE ae.entry_type='AR' AND ae.source_type='system'
           AND ae.status='draft' AND ae.source_ref IS NOT NULL`
      ) as any[];

      if (!entries.length) return ok({ updated: 0 });

      const arCodes = entries.map((e: any) => e.source_ref);
      const arRows = await query(
        `SELECT
           ar.ar_code, ar.invoice_number, ar.invoice_date, ar.amount,
           ar.tax_amount, ar.outstanding_amount, ar.so_code,
           c.customer_name, c.tax_id AS npwp,
           so.total_amount AS nilai_kontrak,
           GROUP_CONCAT(DISTINCT soi.product_name ORDER BY soi.id SEPARATOR ', ') AS items,
           MIN(po.po_code) AS po_code
         FROM accounts_receivable ar
         LEFT JOIN customers c ON ar.customer_code = c.customer_code
         LEFT JOIN sales_orders so ON ar.so_code = so.so_code
         LEFT JOIN sales_order_items soi ON ar.so_code = soi.so_code AND soi.is_deleted = 0
         LEFT JOIN purchase_orders po ON ar.so_code = po.so_code AND po.is_deleted = 0
         WHERE ar.ar_code IN (${arCodes.map(() => '?').join(',')})
         GROUP BY ar.ar_code, ar.invoice_number, ar.invoice_date, ar.amount,
                  ar.tax_amount, ar.outstanding_amount, ar.so_code,
                  c.customer_name, c.tax_id, so.total_amount`,
        arCodes
      ) as any[];

      const arMap = new Map(arRows.map((r: any) => [r.ar_code, r]));

      let updated = 0;
      for (const entry of entries) {
        const row = arMap.get(entry.source_ref);
        if (!row) continue;
        const dpp          = Number(row.amount) || 0;
        const nilaiKontrak = Number(row.nilai_kontrak) || dpp;
        const ppn          = Math.max(0, nilaiKontrak - dpp);
        const meta = {
          so_code:         row.so_code          ?? '',
          customer_name:   row.customer_name     ?? '',
          npwp:            row.npwp              ?? '',
          item:            row.items             ?? '',
          po_no:           row.po_code           ?? '',
          invoice_no:      row.invoice_number    ?? '',
          nilai_kontrak:   nilaiKontrak,
          dpp,
          dpp_lainnya:     0,
          ppn_bendaharawan: 0,
          ppn,
          pph_23:          0,
          pph_22:          0,
          piutang:         Number(row.outstanding_amount) || 0,
          no_faktur:       '',
        };
        await query(
          `UPDATE accounting_entries SET meta=?, updated_at=NOW() WHERE id=?`,
          [JSON.stringify(meta), entry.id]
        );
        updated++;
      }
      return ok({ updated });
    }

    if (type === 'AP') {
      const entries = await query(
        `SELECT ae.id, ae.source_ref FROM accounting_entries ae
         WHERE ae.entry_type='AP' AND ae.source_type='system'
           AND ae.status='draft' AND ae.source_ref IS NOT NULL`
      ) as any[];

      if (!entries.length) return ok({ updated: 0 });

      const poCodes = entries.map((e: any) => e.source_ref);
      const poRows = await query(
        `SELECT po.po_code, po.total_amount, po.tax_amount, po.status, po.so_code,
                s.supplier_name,
                GROUP_CONCAT(poi.product_name SEPARATOR ', ') AS items
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
         LEFT JOIN purchase_order_items poi ON po.po_code = poi.po_code
         WHERE po.po_code IN (${poCodes.map(() => '?').join(',')})
         GROUP BY po.po_code`,
        poCodes
      ) as any[];

      const poMap = new Map(poRows.map((r: any) => [r.po_code, r]));

      let updated = 0;
      for (const entry of entries) {
        const row = poMap.get(entry.source_ref);
        if (!row) continue;
        const apTotal = Number(row.total_amount) || 0;
        const apVat   = Number(row.tax_amount)   || 0;
        const apDpp   = apTotal - apVat;
        const meta = {
          supplier_name: row.supplier_name ?? '',
          item:          row.items         ?? '',
          so_code:       row.so_code       ?? '',
          po_no:         row.po_code       ?? '',
          invoice_no:    '',
          vat:           apVat,
          pph_23:        0,
          ap_amount:     apTotal,
          ap_status:     row.status        ?? '',
        };
        await query(
          `UPDATE accounting_entries SET amount=?, meta=?, updated_at=NOW() WHERE id=?`,
          [apDpp, JSON.stringify(meta), entry.id]
        );
        updated++;
      }
      return ok({ updated });
    }

    return badRequest('type tidak valid');
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
