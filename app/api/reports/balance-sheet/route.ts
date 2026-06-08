import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const from   = url.searchParams.get('from') ?? '';
    const to     = url.searchParams.get('to') ?? '';
    const period = url.searchParams.get('period') ?? '';

    let dateFrom = from;
    let dateTo   = to;
    if (!dateFrom && period) {
      dateFrom = `${period}-01`;
      const [y, m] = period.split('-').map(Number);
      dateTo = `${period}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    }
    if (!dateFrom) {
      const now = new Date();
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      dateTo   = now.toISOString().split('T')[0];
    }

    const coa: any[] = await query(
      `SELECT account_code, account_name, account_type FROM chart_of_accounts
       WHERE account_type IN ('asset','liability','equity','revenue','expense') AND is_active=1
       ORDER BY account_code`,
      []
    );

    const activity: any[] = await query(
      `SELECT ji.account_code,
              SUM(ji.debit_amount)  AS total_debit,
              SUM(ji.credit_amount) AS total_credit
       FROM journal_items ji
       JOIN journal_entries je ON je.journal_code = ji.journal_code AND je.status='posted'
       WHERE je.transaction_date BETWEEN ? AND ?
       GROUP BY ji.account_code`,
      [dateFrom, dateTo]
    );

    const actMap = Object.fromEntries(activity.map((r: any) => [r.account_code, r]));

    const rows = coa.map((acc: any) => {
      const a  = actMap[acc.account_code];
      const d  = Number(a?.total_debit  ?? 0);
      const cr = Number(a?.total_credit ?? 0);
      // Normal balances: asset/expense = debit; liability/equity/revenue = credit
      const balance = ['asset', 'expense'].includes(acc.account_type) ? d - cr : cr - d;
      return { ...acc, total_debit: d, total_credit: cr, balance };
    });

    const assets      = rows.filter((r: any) => r.account_type === 'asset'     && (r.balance !== 0 || r.total_debit !== 0));
    const liabilities = rows.filter((r: any) => r.account_type === 'liability' && (r.balance !== 0 || r.total_credit !== 0));
    const equity      = rows.filter((r: any) => r.account_type === 'equity'    && (r.balance !== 0 || r.total_credit !== 0));
    const revenues    = rows.filter((r: any) => r.account_type === 'revenue');
    const expenses    = rows.filter((r: any) => r.account_type === 'expense');

    const total_assets      = assets.reduce((s: number, r: any) => s + r.balance, 0);
    const total_liabilities = liabilities.reduce((s: number, r: any) => s + r.balance, 0);
    const total_equity      = equity.reduce((s: number, r: any) => s + r.balance, 0);
    const total_revenue     = revenues.reduce((s: number, r: any) => s + (r.total_credit - r.total_debit), 0);
    const total_expense     = expenses.reduce((s: number, r: any) => s + (r.total_debit  - r.total_credit), 0);
    const net_income        = total_revenue - total_expense;
    const is_balanced       = Math.abs(total_assets - (total_liabilities + total_equity + net_income)) < 1;

    return ok({
      from_date: dateFrom, to_date: dateTo,
      assets, liabilities, equity,
      total_assets, total_liabilities, total_equity,
      net_income, is_balanced,
    });
  } catch (err) { return serverError(err); }
});
