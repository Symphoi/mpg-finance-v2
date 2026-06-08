// app/api/reports/intercompany/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to   = searchParams.get('to')   || '';

  let dateFilter = '';
  const params: any[] = [];

  if (from) { dateFilter += ' AND je.transaction_date >= ?'; params.push(from); }
  if (to)   { dateFilter += ' AND je.transaction_date <= ?'; params.push(to); }

  // ── 1. Balance per company untuk akun interco (1150 = Piutang, 2150 = Hutang) ──
  const balances: any[] = await query(`
    SELECT
      je.company_code,
      comp.name AS company_name,
      ji.account_code,
      coa.account_name,
      coa.account_type,
      SUM(ji.debit_amount)  AS total_debit,
      SUM(ji.credit_amount) AS total_credit,
      CASE
        WHEN coa.account_type = 'asset'     THEN SUM(ji.debit_amount)  - SUM(ji.credit_amount)
        WHEN coa.account_type = 'liability' THEN SUM(ji.credit_amount) - SUM(ji.debit_amount)
        ELSE 0
      END AS balance
    FROM journal_items ji
    JOIN journal_entries je ON ji.journal_code = je.journal_code
    JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
    LEFT JOIN companies comp ON je.company_code = comp.company_code
    WHERE ji.account_code IN ('1150', '2150')
      AND je.status != 'cancelled'
      ${dateFilter}
    GROUP BY je.company_code, comp.name, ji.account_code, coa.account_name, coa.account_type
    ORDER BY comp.name, ji.account_code
  `, params);

  // ── 2. Transaksi interco terbaru ──
  const transactions: any[] = await query(`
    SELECT
      je.journal_code,
      je.transaction_date,
      je.description,
      je.reference_type,
      je.reference_code,
      je.company_code,
      comp.name AS company_name,
      je.total_debit AS total_amount
    FROM journal_entries je
    JOIN journal_items ji ON je.journal_code = ji.journal_code
    LEFT JOIN companies comp ON je.company_code = comp.company_code
    WHERE ji.account_code IN ('1150', '2150')
      AND je.status != 'cancelled'
      ${dateFilter}
    GROUP BY je.journal_code, je.transaction_date, je.description, je.reference_type,
             je.reference_code, je.company_code, comp.name, je.total_debit
    ORDER BY je.transaction_date DESC
    LIMIT 50
  `, params);

  // ── 3. Build per-company summary ──
  const companyMap: Record<string, {
    company_code: string;
    company_name: string;
    piutang_interco: number;
    hutang_interco: number;
    net_position: number;
  }> = {};

  for (const row of balances) {
    const key = row.company_code || 'UNKNOWN';
    if (!companyMap[key]) {
      companyMap[key] = {
        company_code: row.company_code,
        company_name: row.company_name || 'Tidak Diketahui',
        piutang_interco: 0,
        hutang_interco: 0,
        net_position: 0,
      };
    }
    if (row.account_code === '1150') companyMap[key].piutang_interco = Number(row.balance);
    if (row.account_code === '2150') companyMap[key].hutang_interco  = Number(row.balance);
  }

  const companySummary = Object.values(companyMap).map(c => ({
    ...c,
    net_position: c.piutang_interco - c.hutang_interco,
  }));

  const totalPiutang = companySummary.reduce((s, c) => s + c.piutang_interco, 0);
  const totalHutang  = companySummary.reduce((s, c) => s + c.hutang_interco,  0);

  return ok({
    summary: {
      total_piutang_interco: totalPiutang,
      total_hutang_interco:  totalHutang,
      net: totalPiutang - totalHutang,
    },
    companies: companySummary,
    transactions,
    from_date: from || null,
    to_date:   to   || null,
  });
  } catch (err) {
    return serverError(err);
  }
});
