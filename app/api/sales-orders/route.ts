// app/api/sales-orders/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, notFound, serverError } from '@/app/lib/response';

// SO status from DB: submitted | processing | ready_to_invoice | shipped | delivered | completed | cancelled
const VALID_STATUS = ['submitted','processing','ready_to_invoice','shipped','delivered','completed','cancelled'];

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const from   = url.searchParams.get('from') ?? '';
    const to     = url.searchParams.get('to') ?? '';
    const project= url.searchParams.get('project') ?? '';

    // Build WHERE
    const conditions: string[] = ['so.is_deleted = 0'];
    const params: unknown[]    = [];

    if (search) {
      conditions.push('(so.so_code LIKE ? OR so.customer_name LIKE ? OR so.invoice_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && VALID_STATUS.includes(status)) {
      conditions.push('so.status = ?');
      params.push(status);
    }
    if (from) { conditions.push('DATE(so.created_at) >= ?'); params.push(from); }
    if (to)   { conditions.push('DATE(so.created_at) <= ?'); params.push(to); }
    if (project) { conditions.push('so.project_code = ?'); params.push(project); }

    const where = conditions.join(' AND ');

    const [rows, countRows] = await Promise.all([
      query(`
        SELECT
          so.id, so.so_code, so.customer_name, so.customer_code, so.customer_phone,
          so.sales_rep, so.total_amount, so.tax_amount, so.shipping_cost,
          so.status, so.accounting_status, so.invoice_number, so.invoice_date,
          so.project_code, so.tax_configuration, so.customer_type,
          so.notes, so.created_at, so.updated_at,
          so.ar_code, so.due_date,
          (SELECT COUNT(*) FROM sales_order_items WHERE so_code = so.so_code AND is_deleted = 0) AS item_count,
          (SELECT COUNT(*) FROM purchase_orders WHERE so_code = so.so_code AND is_deleted = 0) AS po_count
        FROM sales_orders so
        WHERE ${where}
        ORDER BY so.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),

      query(`SELECT COUNT(*) AS total FROM sales_orders so WHERE ${where}`, params),
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
      customer_code, customer_name, customer_phone, customer_email,
      billing_address, shipping_address, sales_rep, sales_order_doc,
      items, tax_amount = 0, shipping_cost = 0, notes = '',
      project_code, tax_configuration = 'included', customer_type = 'company',
    } = body;

    if (!customer_name || !items?.length) {
      return badRequest('customer_name dan items wajib diisi');
    }

    // Generate SO code via numbering sequence
    const seq = await queryOne<{ current_value: number; prefix: string; format: string }>(
      `SELECT * FROM numbering_sequences WHERE document_type = 'sales_order' AND is_active = 1 LIMIT 1`
    );

    const now      = new Date();
    const year     = now.getFullYear();
    const nextNum  = (seq?.current_value ?? 0) + 1;
    const soCode   = `SO-${year}-${String(nextNum).padStart(4, '0')}`;

    const totalAmount = (items as any[]).reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
    const arCode   = `AR${nextNum + 1000}`;
    const invNum   = `INV${nextNum}`;

    await query(`
      INSERT INTO sales_orders
        (so_code, customer_code, customer_name, customer_phone, customer_email,
         billing_address, shipping_address, sales_rep, sales_order_doc,
         total_amount, tax_amount, shipping_cost, status,
         notes, project_code, tax_configuration, customer_type,
         ar_code, invoice_number, invoice_date, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'submitted',?,?,?,?,?,?,NOW(),NOW(),NOW())
    `, [soCode, customer_code ?? null, customer_name, customer_phone ?? null,
        customer_email ?? null, billing_address ?? null, shipping_address ?? null,
        sales_rep ?? user.name, sales_order_doc ?? null,
        totalAmount, tax_amount, shipping_cost,
        notes, project_code ?? null, tax_configuration, customer_type,
        arCode, invNum]);

    // Insert items
    for (const item of items as any[]) {
      await query(`
        INSERT INTO sales_order_items
          (so_item_code, so_code, product_name, product_code, quantity, unit_price, subtotal, created_at)
        VALUES (?,?,?,?,?,?,?,NOW())
      `, [
        `SOI-${soCode}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
        soCode, item.product_name, item.product_code ?? null,
        item.quantity, item.unit_price, item.quantity * item.unit_price,
      ]);
    }

    // Update numbering sequence
    if (seq) {
      await query(`UPDATE numbering_sequences SET current_value = ? WHERE document_type = 'sales_order'`, [nextNum]);
    }

    return created({ so_code: soCode, total_amount: totalAmount });
  } catch (err) {
    return serverError(err);
  }
});
