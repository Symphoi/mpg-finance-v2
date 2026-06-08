// app/api/approval-transactions/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, paginated, badRequest, notFound, serverError } from '@/app/lib/response';
import { createAP, getCompanyCodeFromPO } from '@/lib/accounting';

// ============================== GET ==============================
export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const poCode = url.searchParams.get('po_code');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status') ?? '';
  const search = url.searchParams.get('search') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  // ============================== DETAIL ==============================
  if (poCode) {
    const po: any = await queryOne(`
      SELECT po.*,
        s.supplier_name, s.phone as supplier_phone,
        so.total_amount as so_total,
        c.customer_name,
        p.name as project_name,
        u.name as created_by_name,
        uspv.name    as approved_by_spv_name,
        ufin.name    as approved_by_finance_name,
        (SELECT COUNT(*) FROM sales_order_items WHERE so_code = po.so_code AND is_deleted = FALSE) as so_items,
        (SELECT COALESCE(SUM(quantity), 0) FROM sales_order_items WHERE so_code = po.so_code AND is_deleted = FALSE) as so_qty,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_code = po.po_code AND is_deleted = FALSE) as po_items,
        (SELECT COALESCE(SUM(quantity), 0) FROM purchase_order_items WHERE po_code = po.po_code AND is_deleted = FALSE) as po_qty,
        COALESCE((
          SELECT SUM(p2.total_amount)
          FROM purchase_orders p2
          WHERE p2.so_code = po.so_code
            AND p2.po_code != po.po_code
            AND p2.is_deleted = FALSE
            AND p2.status NOT IN ('rejected','cancelled')
        ), 0) as prev_po_total,
        COALESCE((
          SELECT COUNT(*)
          FROM purchase_orders p2
          WHERE p2.so_code = po.so_code
            AND p2.po_code != po.po_code
            AND p2.is_deleted = FALSE
            AND p2.status NOT IN ('rejected','cancelled')
        ), 0) as prev_po_count,
        COALESCE((
          SELECT COUNT(*)
          FROM purchase_order_items poi2
          JOIN purchase_orders p2 ON poi2.po_code = p2.po_code
          WHERE p2.so_code = po.so_code
            AND p2.po_code != po.po_code
            AND p2.is_deleted = FALSE
            AND p2.status NOT IN ('rejected','cancelled')
            AND poi2.is_deleted = FALSE
        ), 0) as prev_po_items,
        DATEDIFF(NOW(), po.created_at) as aging_days
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
      LEFT JOIN sales_orders so ON po.so_code = so.so_code
      LEFT JOIN customers c ON so.customer_code = c.customer_code
      LEFT JOIN projects p ON so.project_code = p.project_code
      LEFT JOIN users u    ON po.created_by       = u.user_code
      LEFT JOIN users uspv ON po.approved_by_spv     = uspv.user_code
      LEFT JOIN users ufin ON po.approved_by_finance  = ufin.user_code
      WHERE po.po_code = ? AND po.is_deleted = FALSE
    `, [poCode]);

    if (!po) return notFound('PO tidak ditemukan');

    const items: any[] = await query(`
      SELECT 
        poi.product_code,
        poi.product_name,
        poi.quantity,
        poi.purchase_price,
        soi.unit_price as so_price,
        (soi.unit_price - poi.purchase_price) as margin,
        CASE WHEN soi.unit_price > 0 
          THEN ROUND((soi.unit_price - poi.purchase_price) / soi.unit_price * 100, 1)
          ELSE 0 
        END as margin_percent
      FROM purchase_order_items poi
      LEFT JOIN sales_order_items soi 
        ON poi.product_code = soi.product_code 
        AND soi.so_code = ?
        AND soi.is_deleted = FALSE
      WHERE poi.po_code = ? AND poi.is_deleted = FALSE
      ORDER BY poi.id ASC
    `, [po.so_code, poCode]);

    const attachments = await query(`
      SELECT * FROM po_attachments 
      WHERE reference_type = 'po' AND reference_code = ? AND is_deleted = FALSE
    `, [poCode]);

    return ok({ ...po, items, attachments });
  }

  // ============================== LIST ==============================
  const params: any[] = [];
  let where = 'WHERE po.is_deleted = FALSE';

  if (status && status !== 'all') { 
    where += ' AND po.status = ?'; 
    params.push(status); 
  }
  
  if (search) {
    where += ' AND (po.po_code LIKE ? OR s.supplier_name LIKE ? OR po.so_code LIKE ? OR c.customer_name LIKE ?)';
    const s = `%${search}%`; params.push(s, s, s, s);
  }
  if (from) { where += ' AND DATE(po.created_at) >= ?'; params.push(from); }
  if (to)   { where += ' AND DATE(po.created_at) <= ?'; params.push(to); }

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT po.*, 
        s.supplier_name,
        so.total_amount as so_total,
        c.customer_name,
        p.name as project_name,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_code=po.po_code AND is_deleted=FALSE) AS item_count,
        DATEDIFF(NOW(), po.created_at) as aging_days
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
       LEFT JOIN sales_orders so ON po.so_code = so.so_code
       LEFT JOIN customers c ON so.customer_code = c.customer_code
       LEFT JOIN projects p ON so.project_code = p.project_code
       LEFT JOIN users u ON po.created_by = u.user_code
       ${where} ORDER BY po.created_at ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code LEFT JOIN sales_orders so ON po.so_code = so.so_code LEFT JOIN customers c ON so.customer_code = c.customer_code LEFT JOIN projects p ON so.project_code = p.project_code LEFT JOIN users u ON po.created_by = u.user_code ${where}`, params),
  ]);

  const total = Number((countResult as any[])[0]?.total ?? 0);
  return paginated(rows as any[], total, page, limit);
});

// ============================== POST: Approve / Reject ==============================
export const POST = withAuth(async (req: NextRequest, user: any) => {
  const { po_code, action, rejection_reason } = await req.json();
  if (!po_code || !action) return badRequest('po_code dan action wajib diisi');

  // Ambil data PO lengkap dengan supplier_name
  const po: any = await queryOne(
    `SELECT po.*, s.supplier_name 
     FROM purchase_orders po
     LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
     WHERE po.po_code = ? AND po.is_deleted = FALSE`,
    [po_code]
  );
  if (!po) return notFound('PO tidak ditemukan');

  const currentStatus = po.status;
  const userCode = user?.user_code || user?.name || 'system';
  const userName = user?.name || 'System';

  // ============================== APPROVE ==============================
  if (action === 'approve') {
    let newStatus = '';
    let updateField = '';

    if (currentStatus === 'submitted') {
      newStatus = 'approved_spv';
      updateField = 'approved_by_spv';
    } 
    else if (currentStatus === 'approved_spv') {
      newStatus = 'approved';
      updateField = 'approved_by_finance';
      
      const companyCode = await getCompanyCodeFromPO(po_code);
      
      const apCode = await createAP({
        supplier_name: po.supplier_name,
        invoice_date: new Date().toISOString().split('T')[0],
        amount: po.total_amount,
        tax_amount: po.tax_amount || 0,
        po_code: po.po_code,
        invoice_number: `INV-${po.po_code}`,
        description: `PO ${po.po_code} approved by Finance via approval page`,
        company_code: companyCode,
      }, user);
      
    } 
    else {
      return badRequest(`PO status "${currentStatus}" tidak bisa diapprove`);
    }

    await query(
      `UPDATE purchase_orders SET status=?, ${updateField}=?, updated_at=NOW() WHERE po_code=?`,
      [newStatus, userCode, po_code]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'approve', 'purchase_order', ?, ?, ?)`,
      [`AUD-${Date.now()}`, userCode, userName, po_code, `PO ${po_code}`, `Approved: ${currentStatus} → ${newStatus}`]
    );

    return ok({ po_code, new_status: newStatus });
  }

  // ============================== REJECT ==============================
  if (action === 'reject') {
    if (!rejection_reason?.trim()) return badRequest('Alasan penolakan wajib diisi');

    await query(
      `UPDATE purchase_orders SET status='rejected', notes=CONCAT(IFNULL(notes,''),' | Rejected: ',?), updated_at=NOW() WHERE po_code=?`,
      [rejection_reason, po_code]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'reject', 'purchase_order', ?, ?, ?)`,
      [`AUD-${Date.now()}`, userCode, userName, po_code, `PO ${po_code}`, `Rejected: ${rejection_reason}`]
    );

    // Jika tidak ada PO lain untuk SO ini, balikin SO ke status 'submitted'
    if (po.so_code) {
      const other: any = await queryOne(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE so_code=? AND is_deleted=FALSE AND status NOT IN ('rejected','cancelled')`,
        [po.so_code]
      );
      if (other?.count === 0) {
        await query("UPDATE sales_orders SET status='submitted' WHERE so_code=? AND is_deleted=FALSE", [po.so_code]);
      }
    }

    return ok({ po_code, new_status: 'rejected' });
  }

  return badRequest('Action tidak dikenal. Gunakan: approve, reject');
});