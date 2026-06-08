/**
 * API tests — /api/reports/intercompany
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
import { GET } from '@/app/api/reports/intercompany/route';

const mockQuery = vi.mocked(db.query);

function makeGet(params = '') {
  return new Request(`http://localhost/api/reports/intercompany${params}`, { method: 'GET' });
}

describe('GET /api/reports/intercompany', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns zero totals when no interco transactions', async () => {
    mockQuery
      .mockResolvedValueOnce([]) // balances
      .mockResolvedValueOnce([]); // transactions

    const res = await GET(makeGet() as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.summary.total_piutang_interco).toBe(0);
    expect(data.data?.summary.total_hutang_interco).toBe(0);
    expect(data.data?.summary.net).toBe(0);
  });

  it('calculates correct piutang and hutang per company', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { company_code: 'COMP001', company_name: 'PT A', account_code: '1150', account_type: 'asset',     balance: 5_000_000 },
        { company_code: 'COMP002', company_name: 'PT B', account_code: '2150', account_type: 'liability', balance: 5_000_000 },
      ])
      .mockResolvedValueOnce([]);

    const res = await GET(makeGet() as any);
    const data = await res.json();

    expect(data.data?.summary.total_piutang_interco).toBe(5_000_000);
    expect(data.data?.summary.total_hutang_interco).toBe(5_000_000);
    expect(data.data?.summary.net).toBe(0);
    expect(data.data?.companies).toHaveLength(2);
  });

  it('reports non-zero net when interco is imbalanced', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { company_code: 'COMP001', company_name: 'PT A', account_code: '1150', account_type: 'asset',     balance: 8_000_000 },
        { company_code: 'COMP002', company_name: 'PT B', account_code: '2150', account_type: 'liability', balance: 5_000_000 },
      ])
      .mockResolvedValueOnce([]);

    const res = await GET(makeGet() as any);
    const data = await res.json();
    expect(data.data?.summary.net).toBe(3_000_000); // 8jt - 5jt
  });

  it('includes recent transactions', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          journal_code: 'JNL00005',
          transaction_date: '2026-06-08',
          description: 'Pembayaran interco PAY00003',
          company_code: 'COMP001',
          company_name: 'PT A',
          total_amount: 2_500_000,
        },
      ]);

    const res = await GET(makeGet() as any);
    const data = await res.json();
    expect(data.data?.transactions).toHaveLength(1);
    expect(data.data?.transactions[0].journal_code).toBe('JNL00005');
  });

  it('passes date range params and returns them in response', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(makeGet('?from=2026-06-01&to=2026-06-30') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.from_date).toBe('2026-06-01');
    expect(data.data?.to_date).toBe('2026-06-30');
  });
});
