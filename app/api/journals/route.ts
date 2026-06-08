// app/api/journals/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, paginated, serverError } from '@/app/lib/response';

const REF_TYPE_LABEL: Record<string, string> = {
  payment:            'Pembayaran Invoice',
  payment_in_interco: 'Pembayaran Interco',
  ar_to_interco:      'AR → Interco',
  po:                 'Purchase Order',
  so:                 'Sales Order',
  ar:                 'Piutang (AR)',
  ap:                 'Hutang (AP)',
  ca:                 'Cash Advance',
  ca_settlement:      'Settlement CA',
  reimbursement:      'Reimbursement',
  manual:             'Manual Journal',
};

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url     = new URL(req.url);
    const page    = Math.max(1, parseInt(url.searchParams.get('page')    ?? '1'));
    const limit   = Math.min(100, parseInt(url.searchParams.get('limit') ?? '25'));
    const offset  = (page - 1) * limit;
    const search  = url.searchParams.get('search')  ?? '';
    const source  = url.searchParams.get('source')  ?? '';   // MANUAL | SYSTEM | ''
    const from    = url.searchParams.get('from')    ?? '';
    const to      = url.searchParams.get('to')      ?? '';
    const company = url.searchParams.get('company') ?? '';

    // ── Build WHERE clauses per source ──────────────────────────────────────
    const sysConds:  string[] = [];
    const manConds:  string[] = [];
    const sysParams: unknown[] = [];
    const manParams: unknown[] = [];

    if (search) {
      sysConds.push('(je.journal_code LIKE ? OR je.description LIKE ? OR je.reference_code LIKE ?)');
      sysParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      manConds.push('(mj.journal_code LIKE ? OR mj.description LIKE ?)');
      manParams.push(`%${search}%`, `%${search}%`);
    }
    if (from) {
      sysConds.push('DATE(je.transaction_date) >= ?');  sysParams.push(from);
      manConds.push('DATE(mj.transaction_date) >= ?');  manParams.push(from);
    }
    if (to) {
      sysConds.push('DATE(je.transaction_date) <= ?');  sysParams.push(to);
      manConds.push('DATE(mj.transaction_date) <= ?');  manParams.push(to);
    }
    if (company) {
      sysConds.push('je.company_code = ?');             sysParams.push(company);
      // manual journals tidak punya company_code, skip
    }

    const sysWhere = sysConds.length ? `AND ${sysConds.join(' AND ')}` : '';
    const manWhere = manConds.length ? `AND ${manConds.join(' AND ')}` : '';

    // Skip SYSTEM if source = MANUAL and vice versa
    const includeSys = source !== 'MANUAL';
    const includeMan = source !== 'SYSTEM';

    // ── Build UNION query ──────────────────────────────────────────────────
    const parts: string[] = [];
    const allParams: unknown[] = [];

    if (includeSys) {
      parts.push(`
        SELECT
          je.journal_code,
          je.transaction_date,
          je.description,
          'SYSTEM'                        AS source,
          COALESCE(je.reference_type, '') AS ref_type,
          COALESCE(je.reference_code, '') AS ref_code,
          COALESCE(je.company_code,   '') AS company_code,
          COALESCE(je.total_debit,  0)    AS total_debit,
          COALESCE(je.total_credit, 0)    AS total_credit,
          je.status,
          COALESCE(u.name, je.created_by, 'System') AS created_by_name,
          COALESCE(je.created_by, '')     AS created_by_code,
          je.created_at
        FROM journal_entries je
        LEFT JOIN users u ON je.created_by = u.user_code
        WHERE 1=1 ${sysWhere}
      `);
      allParams.push(...sysParams);
    }

    if (includeMan) {
      parts.push(`
        SELECT
          mj.journal_code,
          mj.transaction_date,
          mj.description,
          'MANUAL'                        AS source,
          'manual'                        AS ref_type,
          COALESCE(mj.reference, '')      AS ref_code,
          ''                              AS company_code,
          COALESCE(mj.total_amount, 0)    AS total_debit,
          COALESCE(mj.total_amount, 0)    AS total_credit,
          mj.status,
          COALESCE(u.name, mj.created_by, 'Unknown') AS created_by_name,
          COALESCE(mj.created_by, '')     AS created_by_code,
          mj.created_at
        FROM manual_journals mj
        LEFT JOIN users u ON mj.created_by = u.user_code
        WHERE 1=1 ${manWhere}
      `);
      allParams.push(...manParams);
    }

    if (parts.length === 0) {
      return paginated([], 0, page, limit);
    }

    const unionSQL = parts.join(' UNION ALL ');

    const [rows, countRows] = await Promise.all([
      query(
        `SELECT * FROM (${unionSQL}) AS j ORDER BY j.transaction_date DESC, j.created_at DESC LIMIT ? OFFSET ?`,
        [...allParams, limit, offset],
      ),
      query(
        `SELECT COUNT(*) AS total FROM (${unionSQL}) AS j`,
        allParams,
      ),
    ]);

    // Attach label
    const data = (rows as any[]).map(r => ({
      ...r,
      ref_type_label: REF_TYPE_LABEL[r.ref_type] ?? r.ref_type ?? '—',
    }));

    return paginated(data, Number((countRows as any[])[0]?.total ?? 0), page, limit);
  } catch (err) {
    return serverError(err);
  }
});
