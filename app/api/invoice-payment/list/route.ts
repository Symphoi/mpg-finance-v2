// app/api/invoice-payment/list/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // ── Notification mode: return overdue + due-soon invoices (unpaid/partial) ──
  const notify = searchParams.get('notify') === '1';
  if (notify) {
    const notifLimit = parseInt(searchParams.get('limit') || '20');
    const rows: any = await query(`
      SELECT
        ar.ar_code,
        c.customer_name,
        ar.due_date,
        ar.outstanding_amount,
        ar.status,
        ar.so_code,
        COALESCE(comp.name, 'Tanpa Perusahaan') AS company_name,
        DATEDIFF(NOW(), ar.due_date)             AS overdue_days
      FROM accounts_receivable ar
      LEFT JOIN sales_orders so ON ar.so_code = so.so_code
      LEFT JOIN customers c ON so.customer_code = c.customer_code
      LEFT JOIN projects proj ON so.project_code = proj.project_code
      LEFT JOIN companies comp ON COALESCE(ar.company_code, proj.company_code) = comp.company_code
      WHERE ar.is_deleted = FALSE
        AND ar.status IN ('unpaid', 'partial')
        AND ar.due_date IS NOT NULL
        AND ar.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY ar.due_date ASC
      LIMIT ?
    `, [notifLimit]);
    return ok({ notifications: rows, count: rows.length });
  }

  const search       = searchParams.get('search') || '';
  const status       = searchParams.get('status') || '';
  const companyCode  = searchParams.get('company_code') || '';
  const from         = searchParams.get('from') || '';
  const to           = searchParams.get('to') || '';
  const page         = parseInt(searchParams.get('page') || '1');
  const limit        = parseInt(searchParams.get('limit') || '20');
  const offset       = (page - 1) * limit;

  let where = 'WHERE ar.is_deleted = FALSE';
  const params: any[] = [];

  if (search) {
    where += ' AND (ar.ar_code LIKE ? OR c.customer_name LIKE ? OR ar.so_code LIKE ? OR comp.name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (status && status !== 'all') {
    where += ' AND ar.status = ?';
    params.push(status);
  }

  if (companyCode) {
    where += ' AND COALESCE(ar.company_code, proj.company_code) = ?';
    params.push(companyCode);
  }

  if (from) {
    where += ' AND DATE(ar.invoice_date) >= ?';
    params.push(from);
  }

  if (to) {
    where += ' AND DATE(ar.invoice_date) <= ?';
    params.push(to);
  }

  const baseJoin = `
    FROM accounts_receivable ar
    LEFT JOIN sales_orders so ON ar.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    LEFT JOIN projects proj ON so.project_code = proj.project_code
    LEFT JOIN companies comp ON COALESCE(ar.company_code, proj.company_code) = comp.company_code
  `;

  const countResult: any = await query(
    `SELECT COUNT(*) as total ${baseJoin} ${where}`,
    params
  );
  const total = countResult[0]?.total || 0;

  const data = await query(`
    SELECT
      ar.ar_code,
      c.customer_name,
      ar.invoice_date,
      ar.due_date,
      ar.amount,
      ar.outstanding_amount,
      ar.status,
      ar.so_code,
      ar.description,
      ar.created_at,
      COALESCE(ar.company_code, proj.company_code) AS company_code,
      COALESCE(comp.name, 'Tanpa Perusahaan')      AS company_name,
      DATEDIFF(NOW(), ar.due_date)                 AS overdue_days
    ${baseJoin}
    ${where}
    ORDER BY ar.invoice_date DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return ok({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});