// app/api/dashboard/route.ts
// FIXED: All data is real — no hardcoded 0s, no empty arrays
// ADDED: Company filter via projects table JOIN
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') ?? new Date().getMonth() + 1;
    const year  = url.searchParams.get('year')  ?? new Date().getFullYear();
    const company = url.searchParams.get('company'); // company_code filter

    // Build company filter condition (JOIN via projects table)
    let companyJoin = '';
    let companyCondition = '';
    const filterParams: unknown[] = [];

    if (company) {
      companyJoin = 'JOIN projects p ON p.project_code = so2.project_code';
      companyCondition = 'AND p.company_code = ?';
      filterParams.push(company);
    }

    const [
      financialSummary,
      operationalStats,
      cashFlowChart,
      expenseBreakdown,
      caStats,
      recentActivity,
      topCustomers,
      pendingAlerts,
      deliveryStatus,
    ] = await Promise.all([

      // ── Financial summary (this month) with company filter ──
      query(`
        SELECT
          COALESCE((SELECT SUM(so2.total_amount) FROM sales_orders so2
                    ${companyJoin}
                    WHERE MONTH(so2.created_at)=? AND YEAR(so2.created_at)=? 
                      AND so2.is_deleted=0 ${companyCondition}), 0) AS revenue,
          COALESCE((SELECT SUM(po.total_amount) FROM purchase_orders po
                    JOIN sales_orders so2 ON so2.so_code = po.so_code
                    ${companyJoin}
                    WHERE MONTH(po.created_at)=? AND YEAR(po.created_at)=? 
                      AND po.is_deleted=0 ${companyCondition}), 0) AS po_expense,
          COALESCE((SELECT SUM(r.total_amount) FROM reimbursements r
                    JOIN projects p2 ON p2.project_code = r.project_code
                    WHERE MONTH(r.created_at)=? AND YEAR(r.created_at)=? 
                      AND r.status='approved' AND r.is_deleted=0
                      ${company ? 'AND p2.company_code = ?' : ''}), 0) AS reimburse_expense,
          COALESCE((SELECT SUM(so2.total_amount) FROM sales_orders so2
                    ${companyJoin}
                    WHERE so2.status NOT IN ('cancelled') AND so2.is_deleted=0
                      ${companyCondition}), 0) AS total_ar
      `, company ? [month, year, company, month, year, company, month, year, company, company] 
                : [month, year, month, year, month, year]),

      // ── Operational counts with company filter ──
      query(`
        SELECT
          (SELECT COUNT(*) FROM sales_orders so2
           ${companyJoin}
           WHERE so2.status NOT IN ('completed','cancelled','delivered') 
             AND so2.is_deleted=0 ${companyCondition}) AS so_active,
          (SELECT COUNT(*) FROM purchase_orders po
           JOIN sales_orders so2 ON so2.so_code = po.so_code
           ${companyJoin}
           WHERE po.status='submitted' AND po.is_deleted=0 ${companyCondition}) AS po_pending_spv,
          (SELECT COUNT(*) FROM purchase_orders po
           JOIN sales_orders so2 ON so2.so_code = po.so_code
           ${companyJoin}
           WHERE po.status='approved_spv' AND po.is_deleted=0 ${companyCondition}) AS po_pending_finance,
          (SELECT COUNT(*) FROM reimbursements r
           JOIN projects p2 ON p2.project_code = r.project_code
           WHERE r.status='submitted' AND r.is_deleted=0
           ${company ? 'AND p2.company_code = ?' : ''}) AS reimburse_pending,
          (SELECT COUNT(*) FROM delivery_orders do
           JOIN sales_orders so2 ON so2.so_code = do.so_code
           ${companyJoin}
           WHERE do.status='shipped' AND do.is_deleted=0 ${companyCondition}) AS do_in_transit,
          COALESCE((SELECT SUM(ca.remaining_amount) FROM cash_advances ca
                    JOIN projects p2 ON p2.project_code = ca.project_code
                    WHERE ca.status IN ('approved','active','partially_used') 
                      AND ca.is_deleted=0
                      ${company ? 'AND p2.company_code = ?' : ''}), 0) AS ca_outstanding
      `, company ? [company, company, company, company, company, company] : []),

      // ── Cash flow chart: last 6 months with company filter ──
      query(`
        SELECT
          DATE_FORMAT(m.month_date,'%b') AS month_label,
          MONTH(m.month_date) AS month_num,
          YEAR(m.month_date)  AS year_num,
          COALESCE(so.total,0) AS revenue,
          COALESCE(po.total,0) AS expense
        FROM (
          SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH),'%Y-%m-01') AS month_date
          FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) nums
        ) m
        LEFT JOIN (
          SELECT DATE_FORMAT(so2.created_at,'%Y-%m-01') AS mo, SUM(so2.total_amount) AS total
          FROM sales_orders so2
          ${companyJoin}
          WHERE so2.is_deleted=0 ${companyCondition}
          GROUP BY mo
        ) so ON so.mo = m.month_date
        LEFT JOIN (
          SELECT DATE_FORMAT(po.created_at,'%Y-%m-01') AS mo, SUM(po.total_amount) AS total
          FROM purchase_orders po
          JOIN sales_orders so2 ON so2.so_code = po.so_code
          ${companyJoin}
          WHERE po.is_deleted=0 ${companyCondition}
          GROUP BY mo
        ) po ON po.mo = m.month_date
        ORDER BY m.month_date ASC
      `, company ? [company, company] : []),

      // ── Expense breakdown by category with company filter ──
      query(`
        SELECT rc.name AS category, SUM(r.total_amount) AS total
        FROM reimbursements r
        LEFT JOIN reimbursement_categories rc ON rc.category_code = r.category_code
        JOIN projects p2 ON p2.project_code = r.project_code
        WHERE r.status='approved' AND r.is_deleted=0
          AND YEAR(r.created_at)=?
          ${company ? 'AND p2.company_code = ?' : ''}
        GROUP BY r.category_code, rc.name
        ORDER BY total DESC
        LIMIT 5
      `, company ? [year, company] : [year]),

      // ── CA stats with company filter ──
      query(`
        SELECT
          COALESCE(SUM(CASE WHEN ca.status IN ('approved','active','partially_used') THEN ca.remaining_amount END), 0) AS outstanding,
          COALESCE(SUM(CASE WHEN ca.status='submitted' THEN ca.total_amount END), 0) AS pending_approval,
          COALESCE(SUM(CASE WHEN ca.status='in_settlement' THEN ca.remaining_amount END), 0) AS siap_dikembalikan
        FROM cash_advances ca
        JOIN projects p2 ON p2.project_code = ca.project_code
        WHERE ca.is_deleted=0
          ${company ? 'AND p2.company_code = ?' : ''}
      `, company ? [company] : []),

      // ── Recent activity with company filter ──
      query(`
        (SELECT 'SO' AS type, so2.so_code AS code, so2.customer_name AS party, 
                so2.total_amount AS amount, so2.status, so2.created_at 
         FROM sales_orders so2
         ${companyJoin}
         WHERE so2.is_deleted=0 ${companyCondition}
         ORDER BY so2.created_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'PO' AS type, po.po_code AS code, po.supplier_name AS party, 
                po.total_amount AS amount, po.status, po.created_at 
         FROM purchase_orders po
         JOIN sales_orders so2 ON so2.so_code = po.so_code
         ${companyJoin}
         WHERE po.is_deleted=0 ${companyCondition}
         ORDER BY po.created_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'CA' AS type, ca.ca_code AS code, ca.employee_name AS party, 
                ca.total_amount AS amount, ca.status, ca.created_at 
         FROM cash_advances ca
         JOIN projects p2 ON p2.project_code = ca.project_code
         WHERE ca.is_deleted=0
           ${company ? 'AND p2.company_code = ?' : ''}
         ORDER BY ca.created_at DESC LIMIT 3)
        UNION ALL
        (SELECT 'RMB' AS type, r.reimbursement_code AS code, r.submitted_by_user_name AS party, 
                r.total_amount AS amount, r.status, r.created_at 
         FROM reimbursements r
         JOIN projects p2 ON p2.project_code = r.project_code
         WHERE r.is_deleted=0
           ${company ? 'AND p2.company_code = ?' : ''}
         ORDER BY r.created_at DESC LIMIT 3)
        ORDER BY created_at DESC
        LIMIT 15
      `, company ? [company, company, company, company] : []),

      // ── Top 5 customers by total SO value with company filter ──
      query(`
        SELECT so2.customer_name, COUNT(*) AS order_count, SUM(so2.total_amount) AS total_value
        FROM sales_orders so2
        ${companyJoin}
        WHERE so2.is_deleted=0 AND so2.status NOT IN ('cancelled')
          ${companyCondition}
        GROUP BY so2.customer_name
        ORDER BY total_value DESC
        LIMIT 5
      `, company ? [company] : []),

      // ── Pending alerts with company filter ──
      query(`
        (SELECT 'PO_SPV' AS alert_type, po.po_code AS ref_code, po.supplier_name AS party,
                po.total_amount AS amount, DATEDIFF(NOW(), po.created_at) AS days_waiting, po.created_at AS ts
         FROM purchase_orders po
         JOIN sales_orders so2 ON so2.so_code = po.so_code
         ${companyJoin}
         WHERE po.status='submitted' AND po.is_deleted=0 ${companyCondition}
         ORDER BY po.created_at ASC LIMIT 5)
        UNION ALL
        (SELECT 'CA_SETTLE' AS alert_type, ca.ca_code AS ref_code, ca.employee_name AS party,
                ca.remaining_amount AS amount, DATEDIFF(NOW(), ca.approved_date) AS days_waiting, ca.updated_at AS ts
         FROM cash_advances ca
         JOIN projects p2 ON p2.project_code = ca.project_code
         WHERE ca.status='active' AND ca.is_deleted=0
           ${company ? 'AND p2.company_code = ?' : ''}
         ORDER BY ca.updated_at ASC LIMIT 3)
        UNION ALL
        (SELECT 'RMB_PENDING' AS alert_type, r.reimbursement_code AS ref_code, r.submitted_by_user_name AS party,
                r.total_amount AS amount, DATEDIFF(NOW(), r.created_at) AS days_waiting, r.created_at AS ts
         FROM reimbursements r
         JOIN projects p2 ON p2.project_code = r.project_code
         WHERE r.status='submitted' AND r.is_deleted=0
           ${company ? 'AND p2.company_code = ?' : ''}
         ORDER BY r.created_at ASC LIMIT 3)
        ORDER BY days_waiting DESC
        LIMIT 10
      `, company ? [company, company, company] : []),

      // ── Active deliveries with company filter ──
      query(`
        SELECT do.do_code, do.so_code, do.courier, do.tracking_number, 
               do.status, do.shipping_date, do.received_date
        FROM delivery_orders do
        JOIN sales_orders so2 ON so2.so_code = do.so_code
        ${companyJoin}
        WHERE do.status IN ('created','shipped') AND do.is_deleted=0
          ${companyCondition}
        ORDER BY do.shipping_date DESC
        LIMIT 5
      `, company ? [company] : []),
    ]);

    const fin     = (financialSummary as any[])[0];
    const ops     = (operationalStats as any[])[0];
    const ca      = (caStats as any[])[0];

    const expense = Number(fin.po_expense) + Number(fin.reimburse_expense);
    const profit  = Number(fin.revenue) - expense;

    return ok({
      financial: {
        revenue:         Number(fin.revenue),
        expense,
        grossProfit:     profit,
        margin:          fin.revenue > 0 ? +((profit / fin.revenue) * 100).toFixed(1) : 0,
        totalAR:         Number(fin.total_ar),
      },
      operational: {
        soActive:          Number(ops.so_active),
        poPendingSPV:      Number(ops.po_pending_spv),
        poPendingFinance:  Number(ops.po_pending_finance),
        reimbursePending:  Number(ops.reimburse_pending),
        doInTransit:       Number(ops.do_in_transit),
        caOutstanding:     Number(ops.ca_outstanding),
      },
      cashFlow:         cashFlowChart,
      expenseBreakdown: expenseBreakdown,
      ca: {
        outstanding:       Number(ca.outstanding),
        pendingApproval:   Number(ca.pending_approval),
        siapDikembalikan:  Number(ca.siap_dikembalikan),
      },
      recentActivity:   recentActivity,
      topCustomers:     topCustomers,
      pendingAlerts:    pendingAlerts,
      deliveries:       deliveryStatus,
    });
  } catch (err) {
    console.error('Dashboard API Error:', err);
    return serverError(err);
  }
});