import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url     = new URL(req.url);
    const from    = url.searchParams.get('from') ?? '';
    const to      = url.searchParams.get('to') ?? '';
    const period  = url.searchParams.get('period') ?? '';
    const company = url.searchParams.get('company') ?? '';

    // Build date range
    let dateFrom = from;
    let dateTo   = to;
    if (!dateFrom && period) {
      dateFrom = `${period}-01`;
      const [y, m] = period.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      dateTo = `${period}-${String(lastDay).padStart(2, '0')}`;
    }
    if (!dateFrom) {
      const now = new Date();
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      dateTo   = now.toISOString().split('T')[0];
    }

    // Get all COA accounts
    const coaRows: any[] = await query(
      `SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE is_active=1 ORDER BY account_code`,
      []
    );

    // Get journal item totals in range
    const dateParams: unknown[] = [dateFrom, dateTo];
    const companyJoin = company
      ? `JOIN journal_entries je2 ON je2.journal_code = ji.journal_code AND je2.status='posted'`
      : `JOIN journal_entries je2 ON je2.journal_code = ji.journal_code AND je2.status='posted'`;

    const debitRows: any[] = await query(
      `SELECT ji.account_code,
              SUM(ji.debit_amount)  AS total_debit,
              SUM(ji.credit_amount) AS total_credit
       FROM journal_items ji
       ${companyJoin}
       WHERE je2.transaction_date BETWEEN ? AND ?
       GROUP BY ji.account_code`,
      dateParams
    );

    const debitMap: Record<string, { debit: number; credit: number }> = {};
    for (const r of debitRows) {
      debitMap[r.account_code] = {
        debit:  Number(r.total_debit)  || 0,
        credit: Number(r.total_credit) || 0,
      };
    }

    const rows = coaRows
      .map((coa: any) => {
        const d = debitMap[coa.account_code] ?? { debit: 0, credit: 0 };
        return {
          account_code: coa.account_code,
          account_name: coa.account_name,
          account_type: coa.account_type,
          total_debit:  d.debit,
          total_credit: d.credit,
          balance:      d.debit - d.credit,
        };
      })
      .filter((r: any) => r.total_debit !== 0 || r.total_credit !== 0);

    const totalDebit  = rows.reduce((s, r) => s + r.total_debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.total_credit, 0);

    return ok({
      from_date: dateFrom,
      to_date:   dateTo,
      rows,
      total_debit:  totalDebit,
      total_credit: totalCredit,
      is_balanced:  Math.abs(totalDebit - totalCredit) < 1,
    });
  } catch (err) {
    return serverError(err);
  }
});
