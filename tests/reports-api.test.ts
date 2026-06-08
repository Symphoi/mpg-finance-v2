/**
 * API tests — /api/reports/{balance-sheet, income-statement, trial-balance, general-ledger}
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/db', () => ({
  query:    vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  withAuth: (handler: Function) => (req: any) => handler(req, { user_code: 'USR001' }),
}));

import * as db from '@/app/lib/db';
import { GET as getBalanceSheet }    from '@/app/api/reports/balance-sheet/route';
import { GET as getIncomeStatement } from '@/app/api/reports/income-statement/route';
import { GET as getTrialBalance }    from '@/app/api/reports/trial-balance/route';
import { GET as getGeneralLedger }   from '@/app/api/reports/general-ledger/route';

const mockQuery = vi.mocked(db.query);

function makeGet(path: string, params = '') {
  return new Request(`http://localhost/api/reports/${path}${params}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/balance-sheet', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calculates assets, liabilities, equity correctly', async () => {
    // query[0]: COA → query[1]: activity
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
        { account_code: '20101-00', account_name: 'Hutang Usaha', account_type: 'liability' },
        { account_code: '30000-00', account_name: 'Modal', account_type: 'equity' },
      ])
      .mockResolvedValueOnce([
        { account_code: '10010-00', total_debit: 10_000_000, total_credit: 2_000_000 },
        { account_code: '20101-00', total_debit: 0,          total_credit: 3_000_000 },
        { account_code: '30000-00', total_debit: 0,          total_credit: 5_000_000 },
      ]);

    const res = await getBalanceSheet(makeGet('balance-sheet', '?from=2026-06-01&to=2026-06-30') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.total_assets).toBe(8_000_000);       // 10M debit - 2M credit
    expect(data.data?.total_liabilities).toBe(3_000_000);   // 3M credit - 0 debit
    expect(data.data?.total_equity).toBe(5_000_000);
    expect(data.data?.assets).toHaveLength(1);
    expect(data.data?.liabilities).toHaveLength(1);
  });

  it('returns empty report with zero totals when no activity', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
      ])
      .mockResolvedValueOnce([]);  // no activity

    const res = await getBalanceSheet(makeGet('balance-sheet') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.total_assets).toBe(0);
    expect(data.data?.assets).toHaveLength(0); // filtered out (balance=0 AND debit=0)
  });

  it('returns from_date and to_date in response', async () => {
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const res = await getBalanceSheet(makeGet('balance-sheet', '?from=2026-01-01&to=2026-06-30') as any);
    const data = await res.json();
    expect(data.data?.from_date).toBe('2026-01-01');
    expect(data.data?.to_date).toBe('2026-06-30');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/income-statement', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calculates net_income = total_revenue - total_expense', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '40000-00', account_name: 'Pendapatan', account_type: 'revenue' },
        { account_code: '50000-00', account_name: 'HPP', account_type: 'expense' },
      ])
      .mockResolvedValueOnce([
        { account_code: '40000-00', total_debit: 0, total_credit: 20_000_000 },
        { account_code: '50000-00', total_debit: 12_000_000, total_credit: 0 },
      ]);

    const res = await getIncomeStatement(makeGet('income-statement', '?from=2026-06-01&to=2026-06-30') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.total_revenue).toBe(20_000_000);
    expect(data.data?.total_expense).toBe(12_000_000);
    expect(data.data?.net_income).toBe(8_000_000);
    expect(data.data?.revenues).toHaveLength(1);
    expect(data.data?.expenses).toHaveLength(1);
  });

  it('returns zero net_income when no revenue or expense activity', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '40000-00', account_name: 'Pendapatan', account_type: 'revenue' },
      ])
      .mockResolvedValueOnce([]);

    const res = await getIncomeStatement(makeGet('income-statement') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.net_income).toBe(0);
    expect(data.data?.revenues).toHaveLength(0); // balance=0 → filtered out
  });

  it('detects loss when expenses exceed revenue', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '40000-00', account_name: 'Pendapatan', account_type: 'revenue' },
        { account_code: '50000-00', account_name: 'Beban', account_type: 'expense' },
      ])
      .mockResolvedValueOnce([
        { account_code: '40000-00', total_debit: 0, total_credit: 5_000_000 },
        { account_code: '50000-00', total_debit: 8_000_000, total_credit: 0 },
      ]);

    const res = await getIncomeStatement(makeGet('income-statement', '?from=2026-06-01&to=2026-06-30') as any);
    const data = await res.json();
    expect(data.data?.net_income).toBe(-3_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/trial-balance', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns balanced trial balance (totalDebit = totalCredit)', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
        { account_code: '20101-00', account_name: 'Hutang', account_type: 'liability' },
      ])
      .mockResolvedValueOnce([
        { account_code: '10010-00', total_debit: 5_000_000, total_credit: 0 },
        { account_code: '20101-00', total_debit: 0, total_credit: 5_000_000 },
      ]);

    const res = await getTrialBalance(makeGet('trial-balance', '?from=2026-06-01&to=2026-06-30') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.total_debit).toBe(5_000_000);
    expect(data.data?.total_credit).toBe(5_000_000);
    expect(data.data?.is_balanced).toBe(true);
    expect(data.data?.rows).toHaveLength(2);
  });

  it('detects unbalanced trial balance', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
        { account_code: '20101-00', account_name: 'Hutang', account_type: 'liability' },
      ])
      .mockResolvedValueOnce([
        { account_code: '10010-00', total_debit: 7_000_000, total_credit: 0 },
        { account_code: '20101-00', total_debit: 0, total_credit: 5_000_000 },
      ]);

    const res = await getTrialBalance(makeGet('trial-balance', '?from=2026-06-01&to=2026-06-30') as any);
    const data = await res.json();
    expect(data.data?.is_balanced).toBe(false);
    expect(data.data?.total_debit).toBe(7_000_000);
    expect(data.data?.total_credit).toBe(5_000_000);
  });

  it('returns empty rows when no journal activity', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
      ])
      .mockResolvedValueOnce([]);  // no activity

    const res = await getTrialBalance(makeGet('trial-balance') as any);
    const data = await res.json();
    expect(data.data?.rows).toHaveLength(0);
    expect(data.data?.is_balanced).toBe(true); // 0 === 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/reports/general-ledger', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns accounts list when no account_code provided', async () => {
    mockQuery.mockResolvedValueOnce([
      { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
      { account_code: '20101-00', account_name: 'Hutang', account_type: 'liability' },
    ]);

    const res = await getGeneralLedger(makeGet('general-ledger') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.accounts).toHaveLength(2);
    expect(data.data?.rows).toHaveLength(0);
    expect(data.data?.account).toBeNull();
  });

  it('returns ledger rows with running balance when account_code provided', async () => {
    const accountsList = [
      { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
    ];
    const journalItems = [
      {
        journal_item_code: 'JI-01', debit_amount: 5_000_000, credit_amount: 0,
        description: 'Penerimaan', journal_code: 'JNL-001',
        transaction_date: '2026-06-01', journal_desc: 'Test journal',
        reference_type: 'payment', reference_code: 'PAY-001',
      },
      {
        journal_item_code: 'JI-02', debit_amount: 0, credit_amount: 2_000_000,
        description: 'Pengeluaran', journal_code: 'JNL-002',
        transaction_date: '2026-06-05', journal_desc: 'Test journal 2',
        reference_type: 'payment', reference_code: 'PAY-002',
      },
    ];

    mockQuery
      .mockResolvedValueOnce(accountsList)
      .mockResolvedValueOnce(journalItems);

    const res = await getGeneralLedger(makeGet('general-ledger', '?account_code=10010-00&from=2026-06-01&to=2026-06-30') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.rows).toHaveLength(2);
    expect(data.data?.rows[0].running_balance).toBe(5_000_000);
    expect(data.data?.rows[1].running_balance).toBe(3_000_000); // 5M - 2M
    expect(data.data?.total_debit).toBe(5_000_000);
    expect(data.data?.total_credit).toBe(2_000_000);
    expect(data.data?.ending_balance).toBe(3_000_000);
    expect(data.data?.account?.account_name).toBe('Kas');
  });

  it('returns from_date and to_date from period param', async () => {
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const res = await getGeneralLedger(makeGet('general-ledger', '?period=2026-06&account_code=10010-00') as any);
    const data = await res.json();
    expect(data.data?.from_date).toBe('2026-06-01');
    expect(data.data?.to_date).toBe('2026-06-30');
  });
});
