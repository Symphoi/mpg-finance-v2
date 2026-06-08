/**
 * API tests — /api/sales-orders
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
import { GET, POST } from '@/app/api/sales-orders/route';

const mockQuery    = vi.mocked(db.query);
const mockQueryOne = vi.mocked(db.queryOne);

function makeGet(params = '') {
  return new Request(`http://localhost/api/sales-orders${params}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/sales-orders — list', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns paginated list with customer info', async () => {
    // queryOne: COUNT → query: list → per SO: queryOne(customer), query(items), queryOne(itemCount), queryOne(poCount)
    mockQueryOne
      .mockResolvedValueOnce({ total: 1 })                              // COUNT
      .mockResolvedValueOnce({ customer_name: 'PT Alpha', phone: '021' }) // customer
      .mockResolvedValueOnce({ count: 2 })                              // item_count
      .mockResolvedValueOnce({ count: 1 });                             // po_count

    mockQuery
      .mockResolvedValueOnce([{
        id: 1, so_code: 'SO-00001', customer_code: 'CUST-001', sales_code: 'SR-001',
        project_code: null, total_amount: 5_000_000, tax_amount: 0,
        tax_configuration: 'percentage', status: 'submitted', notes: null,
        created_at: '2026-06-01', updated_at: '2026-06-01',
      }])                                         // data list
      .mockResolvedValueOnce([                    // items per SO
        { so_item_code: 'SOI-01', product_code: 'PROD-001', quantity: 1, unit_price: 5_000_000 },
      ]);

    const res = await GET(makeGet('?page=1&limit=10') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].customer_name).toBe('PT Alpha');
    expect(data.data[0].po_count).toBe(1);
    expect(data.meta?.total).toBe(1);
  });

  it('returns empty list when no sales orders', async () => {
    mockQueryOne.mockResolvedValueOnce({ total: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET(makeGet('?page=1&limit=10') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(0);
    expect(data.meta?.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/sales-orders — detail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns SO with customer, items, and attachments', async () => {
    // queryOne: SO, customer, sales, project
    mockQueryOne
      .mockResolvedValueOnce({
        id: 1, so_code: 'SO-00001', customer_code: 'CUST-001',
        sales_code: 'SR-001', project_code: 'PROJ-001',
        total_amount: 5_000_000, status: 'submitted',
      })
      .mockResolvedValueOnce({ customer_code: 'CUST-001', customer_name: 'PT Beta', phone: '022', email: '', customer_type: 'company' })
      .mockResolvedValueOnce({ user_code: 'SR-001', name: 'Sales Rep', email: 'sr@example.com' })
      .mockResolvedValueOnce({ project_code: 'PROJ-001', name: 'Project Alpha' });

    mockQuery
      .mockResolvedValueOnce([{ so_item_code: 'SOI-01', product_code: 'PROD-001', quantity: 1 }]) // items
      .mockResolvedValueOnce([]);  // attachments

    const res = await GET(makeGet('?so_code=SO-00001') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.so_code).toBe('SO-00001');
    expect(data.data?.customer?.customer_name).toBe('PT Beta');
    expect(data.data?.project?.name).toBe('Project Alpha');
    expect(data.data?.items).toHaveLength(1);
  });

  it('returns 404 when SO not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    const res = await GET(makeGet('?so_code=SO-INVALID') as any);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/sales-orders — validation', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects when Content-Type is not multipart/form-data', async () => {
    const req = new Request('http://localhost/api/sales-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_code: 'CUST-001' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('rejects when customer_code is missing', async () => {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ items: [{ product_code: 'P1', product_name: 'Item', quantity: 1, unit_price: 100 }] }));
    const req = new Request('http://localhost/api/sales-orders', { method: 'POST', body: fd });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('rejects when items array is missing', async () => {
    const fd = new FormData();
    fd.append('data', JSON.stringify({ customer_code: 'CUST-001', items: [] }));
    const req = new Request('http://localhost/api/sales-orders', { method: 'POST', body: fd });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('rejects when data field is missing', async () => {
    const fd = new FormData();
    const req = new Request('http://localhost/api/sales-orders', { method: 'POST', body: fd });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
