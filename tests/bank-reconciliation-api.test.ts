/**
 * API tests — /api/bank-reconciliations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/db', () => ({
  query:    vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  withAuth: (handler: Function) =>
    (req: any) => handler(req, { user_code: 'USR001', name: 'Test User' }),
}));

import * as db from '@/app/lib/db';
import { GET, POST, PUT } from '@/app/api/bank-reconciliations/route';

const mockQuery = vi.mocked(db.query);

function makeRequest(method: string, body?: object, params = '') {
  return new Request(`http://localhost/api/bank-reconciliations${params}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/bank-reconciliations', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns paginated list with bank info', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          id: 1,
          reconciliation_code: 'REC-2026-001',
          bank_account_code: 'BNK001',
          period_start: '2026-06-01',
          period_end: '2026-06-30',
          bank_balance: 10_000_000,
          book_balance: 10_000_000,
          difference: 0,
          status: 'draft',
          bank_name: 'BCA',
          account_number: '123-456-789',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = await GET(makeRequest('GET', undefined, '?page=1&limit=20') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].bank_name).toBe('BCA');
    expect(data.meta?.total).toBe(1);
  });

  it('returns empty list when no reconciliations', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    const res = await GET(makeRequest('GET', undefined, '?page=1&limit=20') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(0);
  });
});

describe('POST /api/bank-reconciliations', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates reconciliation with zero difference when balanced', async () => {
    mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

    const res = await POST(makeRequest('POST', {
      account_code: 'BNK001',
      period_start: '2026-06-01',
      period_end: '2026-06-30',
      bank_balance: 10_000_000,
      book_balance: 10_000_000,
      notes: 'Balance check',
    }) as any);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data?.difference).toBe(0);
  });

  it('creates reconciliation with non-zero difference when not balanced', async () => {
    mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

    const res = await POST(makeRequest('POST', {
      account_code: 'BNK001',
      period_start: '2026-06-01',
      period_end: '2026-06-30',
      bank_balance: 10_500_000,
      book_balance: 10_000_000,
    }) as any);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data?.difference).toBe(500_000);
  });

  it('rejects when required fields missing', async () => {
    const res = await POST(makeRequest('POST', { account_code: 'BNK001' }) as any);
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/bank-reconciliations', () => {
  beforeEach(() => vi.resetAllMocks());

  it('updates reconciliation and recalculates difference', async () => {
    mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

    const res = await PUT(makeRequest('PUT', {
      id: 1,
      bank_balance: 12_000_000,
      book_balance: 11_500_000,
      notes: 'Updated',
      status: 'completed',
    }) as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.difference).toBe(500_000);
  });

  it('rejects when id is missing', async () => {
    const res = await PUT(makeRequest('PUT', { bank_balance: 5_000_000 }) as any);
    expect(res.status).toBe(400);
  });
});
