import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url          = new URL(req.url);
    const from         = url.searchParams.get('from') ?? '';
    const to           = url.searchParams.get('to') ?? '';
    const period       = url.searchParams.get('period') ?? '';
    const accountCode  = url.searchParams.get('account_code') ?? '';

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

    // Get COA list for dropdown
    const accounts: any[] = await query(
      `SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE is_active=1 ORDER BY account_code`
    );

    if (!accountCode) {
      return ok({ accounts, rows: [], account: null, from_date: dateFrom, to_date: dateTo, running_balance: 0 });
    }

    const account: any = accounts.find(a => a.account_code === accountCode);

    // Get all journal items for this account in range
    const rows: any[] = await query(
      `SELECT ji.journal_item_code, ji.debit_amount, ji.credit_amount, ji.description AS item_desc,
              je.journal_code, je.transaction_date, je.description AS journal_desc,
              je.reference_type, je.reference_code
       FROM journal_items ji
       JOIN journal_entries je ON je.journal_code = ji.journal_code AND je.status = 'posted'
       WHERE ji.account_code = ?
         AND je.transaction_date BETWEEN ? AND ?
       ORDER BY je.transaction_date ASC, je.journal_code ASC`,
      [accountCode, dateFrom, dateTo]
    );

    let balance = 0;
    const ledgerRows = rows.map((r: any) => {
      const debit  = Number(r.debit_amount)  || 0;
      const credit = Number(r.credit_amount) || 0;
      balance += debit - credit;
      return {
        journal_code:     r.journal_code,
        transaction_date: r.transaction_date,
        description:      r.item_desc || r.journal_desc,
        reference_type:   r.reference_type,
        reference_code:   r.reference_code,
        debit_amount:     debit,
        credit_amount:    credit,
        running_balance:  balance,
      };
    });

    const totalDebit  = rows.reduce((s, r) => s + (Number(r.debit_amount)  || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (Number(r.credit_amount) || 0), 0);

    return ok({
      accounts,
      account,
      from_date: dateFrom,
      to_date:   dateTo,
      rows:      ledgerRows,
      total_debit:  totalDebit,
      total_credit: totalCredit,
      ending_balance: balance,
    });
  } catch (err) {
    return serverError(err);
  }
});
