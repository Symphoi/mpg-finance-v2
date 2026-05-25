// app/api/purchase-orders/route.ts
// FIXED: removed OPTIONS method hack from v1. Dropdowns via proper GET ?action=dropdowns
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

const VALID_STATUS = ['submitted','approved_spv','approved_finance','paid','rejected'];

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    // Dropdown data for create form — was OPTIONS in v1 (WRONG), now proper GET
    if (action === 'dropdowns') {
      const [salesOrders, suppliers, bankAccounts] = await Promise.all([
        query(`SELECT so_code, customer_name, total_amount, status FROM sales_orders
               WHERE is_deleted=0 AND status NOT IN ('cancelled','completed')
               ORDER BY created_at DESC LIMIT 200`),
        query(`SELECT supplier_code, name, contact_person, bank_name, account_number
               FROM suppliers WHERE is_deleted=0 ORDER BY name ASC`),
        query(`SELECT account_code, bank_name, account_number, account_holder
               FROM bank_accounts WHERE is_deleted=0 AND is_active=1 ORDER BY bank_name ASC`),
      ]);
      return ok({ salesOrders, suppliers, bankAccounts });
    }

    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const from   = url.searchParams.get('from') ?? '';
    const to     = url.searchParams.get('to') ?? '';

    const conditions: string[] = ['po.is_deleted = 0'];
    const params: unknown[]    = [];

    if (search) {
      conditions.push('(po.po_code LIKE ? OR po.supplier_name LIKE ? OR po.so_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && VALID_STATUS.includes(status)) {
      conditions.push('po.status = ?'); params.push(status);
    }
    if (from) { conditions.push('DATE(po.created_at) >= ?'); params.push(from); }
    if (to)   { conditions.push('DATE(po.created_at) <= ?'); params.push(to); }

    const where = conditions.join(' AND ');

    const [rows, countRows] = await Promise.all([
      query(`
        SELECT
          po.id, po.po_code, po.supplier_name, po.supplier_code,
          po.so_code, po.total_amount, po.status, po.do_status,
          po.priority, po.days_waiting, po.submitted_by, po.date,
          po.approved_by_spv, po.approved_by_finance,
          po.approved_date_spv, po.approved_date_finance,
          po.rejection_reason, po.payment_proof, po.created_at,
          po.supplier_invoice_number, po.attachment_url, po.attachment_filename,
          (SELECT COUNT(*) FROM purchase_order_items WHERE po_code=po.po_code AND is_deleted=0) AS item_count
        FROM purchase_orders po
        WHERE ${where}
        ORDER BY po.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM purchase_orders po WHERE ${where}`, params),
    ]);

    const total = (countRows as any[])[0]?.total ?? 0;
    return paginated(rows, Number(total), page, limit);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const {
      so_code, supplier_code, supplier_name, supplier_contact, supplier_bank,
      items, notes = '', priority = 'medium', customer_ref,
      attachment_url, attachment_filename, attachment_notes,
    } = body;

    if (!supplier_name || !so_code || !items?.length) {
      return badRequest('supplier_name, so_code, dan items wajib diisi');
    }

    const seq = await queryOne<{ current_value: number }>(
      `SELECT * FROM numbering_sequences WHERE document_type = 'purchase_order' AND is_active = 1 LIMIT 1`
    );
    const nextNum = (seq?.current_value ?? 0) + 1;
    const poCode  = `PO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

    const totalAmount = (items as any[]).reduce(
      (s: number, i: any) => s + (i.quantity * i.purchase_price), 0
    );
    const now = new Date();

    await query(`
      INSERT INTO purchase_orders
        (po_code, supplier_code, supplier_name, supplier_contact, supplier_bank,
         so_code, total_amount, status, notes, date, submitted_by,
         submitted_date, submitted_time, priority, customer_ref,
         attachment_url, attachment_filename, attachment_notes, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,'submitted',?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [
      poCode, supplier_code ?? null, supplier_name, supplier_contact ?? null, supplier_bank ?? null,
      so_code, totalAmount, notes,
      now.toISOString().split('T')[0], user.name,
      now.toISOString().split('T')[0],
      now.toTimeString().split(' ')[0],
      priority, customer_ref ?? null,
      attachment_url ?? null, attachment_filename ?? null, attachment_notes ?? null,
      user.user_code,
    ]);

    for (const item of items as any[]) {
      await query(`
        INSERT INTO purchase_order_items
          (po_item_code, po_code, product_name, product_code, quantity, purchase_price, supplier, notes, created_at)
        VALUES (?,?,?,?,?,?,?,?,NOW())
      `, [
        `POI-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
        poCode, item.product_name, item.product_code ?? null,
        item.quantity, item.purchase_price,
        supplier_name, item.notes ?? null,
      ]);
    }

    if (seq) {
      await query(`UPDATE numbering_sequences SET current_value=? WHERE document_type='purchase_order'`, [nextNum]);
    }

    return created({ po_code: poCode, total_amount: totalAmount });
  } catch (err) {
    return serverError(err);
  }
});
