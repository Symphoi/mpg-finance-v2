// app/api/dashboard/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const periodCode = searchParams.get('period')
      || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const companyCode = searchParams.get('company');

    // ── Build date range ────────────────────────────────────────────────────
    let startDate: string;
    let endDate: string;

    if (fromDate && toDate) {
      startDate = fromDate;
      endDate = toDate;
    } else {
      const [year, month] = periodCode.split('-').map(Number);
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = new Date(year, month, 0).toISOString().split('T')[0];
    }

    // ── Build company filter ─────────────────────────────────────────────────
    const baseParams: unknown[] = [startDate, endDate];
    const companyParams: unknown[] = companyCode ? [companyCode] : [];
    const companyWhere = companyCode ? 'AND je.company_code = ?' : '';

    // ── 1. Trial balance ─────────────────────────────────────────────────────
    const trialBalance: any[] = await query(
      `
      SELECT
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.parent_account_code,
        je.company_code,
        COALESCE(SUM(ji.debit_amount),  0) AS total_debit,
        COALESCE(SUM(ji.credit_amount), 0) AS total_credit,
        CASE
          WHEN coa.account_type IN ('asset', 'expense') THEN
            COALESCE(SUM(ji.debit_amount), 0) - COALESCE(SUM(ji.credit_amount), 0)
          WHEN coa.account_type IN ('liability', 'equity', 'revenue') THEN
            COALESCE(SUM(ji.credit_amount), 0) - COALESCE(SUM(ji.debit_amount), 0)
          ELSE
            COALESCE(SUM(ji.debit_amount), 0) - COALESCE(SUM(ji.credit_amount), 0)
        END AS balance
      FROM journal_items ji
      JOIN journal_entries       je  ON ji.journal_code  = je.journal_code
      JOIN chart_of_accounts     coa ON ji.account_code  = coa.account_code
      WHERE je.status = 'posted'
        AND je.transaction_date BETWEEN ? AND ?
        ${companyWhere}
      GROUP BY
        coa.account_code, coa.account_name, coa.account_type,
        coa.parent_account_code, je.company_code
      HAVING balance != 0
      ORDER BY coa.account_code
      `,
      [...baseParams, ...companyParams],
    );

    // ── 2. Intercompany elimination ──────────────────────────────────────────
    // Interco transactions are identified by account codes 1150 (Piutang) & 2150 (Hutang)
    const [elimRow]: any[] = await query(
      `
      SELECT
        COALESCE(SUM(CASE
          WHEN ji.account_code = '1150' THEN ji.debit_amount - ji.credit_amount
          ELSE 0
        END), 0) AS total_interco_debit,
        COALESCE(SUM(CASE
          WHEN ji.account_code = '2150' THEN ji.credit_amount - ji.debit_amount
          ELSE 0
        END), 0) AS total_interco_credit
      FROM journal_items ji
      JOIN journal_entries je ON ji.journal_code = je.journal_code
      WHERE ji.account_code IN ('1150', '2150')
        AND je.status != 'cancelled'
        AND je.transaction_date BETWEEN ? AND ?
        ${companyWhere}
      `,
      [...baseParams, ...companyParams],
    );

    // ── 3. Split balance sheet / income statement ────────────────────────────
    const balanceSheet    = trialBalance.filter(r => ['asset', 'liability', 'equity'].includes(r.account_type));
    const incomeStatement = trialBalance.filter(r => ['revenue', 'expense'].includes(r.account_type));

    // ── 4. Interco elimination amounts ───────────────────────────────────────
    const elimDebit  = Number(elimRow?.total_interco_debit  ?? 0);
    const elimCredit = Number(elimRow?.total_interco_credit ?? 0);

    // Interco elimination (remove 1150 & 2150) only applies to consolidated view.
    // Single-company view shows their own interco accounts as-is.
    const isConsolidated = !companyCode;
    const INTERCO_ACCOUNTS = ['1150', '2150'];
    const balanceSheetNet = isConsolidated
      ? balanceSheet.filter(r => !INTERCO_ACCOUNTS.includes(r.account_code))
      : balanceSheet;

    // ── 5. Totals (after elimination) ────────────────────────────────────────
    const sum = (rows: any[], type: string) =>
      rows.filter(r => r.account_type === type).reduce((s, r) => s + Number(r.balance ?? 0), 0);

    const totalAssets      = sum(balanceSheetNet, 'asset');
    const totalLiabilities = sum(balanceSheetNet, 'liability');
    const totalEquity      = sum(balanceSheetNet, 'equity');
    const totalRevenue     = sum(incomeStatement, 'revenue');
    const totalExpense     = sum(incomeStatement, 'expense');
    const netIncome        = totalRevenue - totalExpense;

    // ── 6. Companies list ────────────────────────────────────────────────────
    const companies: any[] = await query(
      `SELECT company_code, name FROM companies WHERE is_active = 1 ORDER BY name`,
    );

    return ok({
      period: periodCode,
      from_date: fromDate ?? null,
      to_date: toDate ?? null,
      company_code: companyCode ?? 'ALL',
      companies: companies ?? [],
      balance_sheet: {
        data: balanceSheetNet,
        total_assets:      totalAssets,
        total_liabilities: totalLiabilities,
        total_equity:      totalEquity,
        net_income:        netIncome,
      },
      income_statement: {
        data: incomeStatement,
        total_revenue: totalRevenue,
        total_expense: totalExpense,
        net_income:    netIncome,
      },
      intercompany_elimination: {
        total_debit:  elimDebit,
        total_credit: elimCredit,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return serverError(error);
  }
});