/**
 * API tests — /api/manual-journals
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
import { POST, GET } from '@/app/api/manual-journals/route';

const mockQuery    = vi.mocked(db.query);

function makePost(body: object) {
  return new Request('http://localhost/api/manual-journals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGet(params = '') {
  return new Request(`http://localhost/api/manual-journals${params}`, { method: 'GET' });
}

describe('POST /api/manual-journals', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates journal when debit = credit', async () => {
    mockQuery.mockResolvedValue({ affectedRows: 1 });

    const res = await POST(makePost({
      description: 'Test jurnal manual',
      transaction_date: '2026-06-08',
      reference: 'REF-001',
      items: [
        { account_code: '10010-00', debit_amount: 500_000, credit_amount: 0 },
        { account_code: '20000-00', debit_amount: 0, credit_amount: 500_000 },
      ],
    }) as any);

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.data?.journal_code).toMatch(/^JRN-/);
    expect(data.data?.total).toBe(500_000);
  });

  it('rejects when debit ≠ credit', async () => {
    const res = await POST(makePost({
      description: 'Tidak balance',
      transaction_date: '2026-06-08',
      items: [
        { account_code: '10010-00', debit_amount: 500_000, credit_amount: 0 },
        { account_code: '20000-00', debit_amount: 0, credit_amount: 300_000 },
      ],
    }) as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy(); // badRequest() uses `error` key
  });

  it('rejects when required fields missing', async () => {
    const res = await POST(makePost({ description: 'No date or items' }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects when items array is empty', async () => {
    const res = await POST(makePost({
      description: 'Empty items',
      transaction_date: '2026-06-08',
      items: [],
    }) as any);
    expect(res.status).toBe(400);
  });

  it('handles multiple balanced line items (3 lines)', async () => {
    mockQuery.mockResolvedValue({ affectedRows: 1 });

    const res = await POST(makePost({
      description: 'Multi-line jurnal',
      transaction_date: '2026-06-08',
      items: [
        { account_code: '10010-00', debit_amount: 1_000_000, credit_amount: 0 },
        { account_code: '20101-00', debit_amount: 0, credit_amount: 700_000 },
        { account_code: '20200-00', debit_amount: 0, credit_amount: 300_000 },
      ],
    }) as any);

    expect(res.status).toBe(201);
  });
});

describe('GET /api/manual-journals', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns accounts list when action=accounts', async () => {
    mockQuery.mockResolvedValueOnce([
      { account_code: '10010-00', account_name: 'Kas', account_type: 'asset' },
      { account_code: '20000-00', account_name: 'Hutang', account_type: 'liability' },
    ]);

    const res = await GET(makeGet('?action=accounts') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].account_code).toBe('10010-00');
  });

  it('returns paginated journal list', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { journal_code: 'JRN-2026-001', description: 'Test', transaction_date: '2026-06-08', status: 'draft' },
      ])
      .mockResolvedValueOnce([{ total: 1 }])  // count
      .mockResolvedValueOnce([]);              // journal items

    const res = await GET(makeGet('?page=1&limit=20') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.meta?.total).toBe(1); // paginated() uses meta.total
  });

  it('returns empty list when no journals exist', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    const res = await GET(makeGet('?page=1&limit=20') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(0);
    expect(data.meta?.total).toBe(0);
  });
});
