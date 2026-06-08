/**
 * API tests — /api/purchase-orders
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

vi.mock('@/lib/accounting', () => ({
  createAP:               vi.fn().mockResolvedValue('AP-00001'),
  createPayment:          vi.fn().mockResolvedValue('PAY-00001'),
  getCompanyCodeFromBank: vi.fn().mockResolvedValue(''),
}));

import * as db from '@/app/lib/db';
import * as accounting from '@/lib/accounting';
import { GET, POST, PUT, PATCH } from '@/app/api/purchase-orders/route';

const mockQuery    = vi.mocked(db.query);
const mockQueryOne = vi.mocked(db.queryOne);

function makeGet(params = '') {
  return new Request(`http://localhost/api/purchase-orders${params}`, { method: 'GET' });
}

function makeFormDataReq(method: string, data: object) {
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  return new Request('http://localhost/api/purchase-orders', { method, body: fd });
}

function makePatch(body: object) {
  return new Request('http://localhost/api/purchase-orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/purchase-orders — list', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns paginated list with supplier info', async () => {
    // queryOne: COUNT → query: list → per PO: items, payments
    mockQueryOne.mockResolvedValueOnce({ total: 1 });

    mockQuery
      .mockResolvedValueOnce([{
        po_code: 'PO-00001', so_code: 'SO-001', supplier_code: 'SUP-001',
        supplier_name: 'CV Supplier', total_amount: 3_000_000,
        status: 'submitted', created_at: '2026-06-01',
      }])
      .mockResolvedValueOnce([{ po_item_code: 'POI-01', product_code: 'PROD-001' }]) // items
      .mockResolvedValueOnce([]);  // payments

    const res = await GET(makeGet('?page=1&limit=10') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].supplier_name).toBe('CV Supplier');
    expect(data.meta?.total).toBe(1);
  });

  it('returns empty list when no purchase orders', async () => {
    mockQueryOne.mockResolvedValueOnce({ total: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET(makeGet('?page=1&limit=10') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(0);
    expect(data.meta?.total).toBe(0);
  });

  it('returns suppliers list for endpoint=suppliers', async () => {
    mockQuery.mockResolvedValueOnce([
      { supplier_code: 'SUP-001', supplier_name: 'CV Supplier', phone: '021' },
      { supplier_code: 'SUP-002', supplier_name: 'PT Vendor', phone: '022' },
    ]);

    const res = await GET(makeGet('?endpoint=suppliers') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].supplier_name).toBe('CV Supplier');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/purchase-orders — detail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns PO with items, attachments, and payments', async () => {
    mockQueryOne.mockResolvedValueOnce({
      po_code: 'PO-00001', so_code: 'SO-001', supplier_code: 'SUP-001',
      supplier_name: 'CV Supplier', total_amount: 3_000_000, status: 'approved',
    });
    mockQuery
      .mockResolvedValueOnce([{ po_item_code: 'POI-01', product_code: 'PROD-001', quantity: 5 }]) // items
      .mockResolvedValueOnce([])  // attachments
      .mockResolvedValueOnce([]); // payments

    const res = await GET(makeGet('?po_code=PO-00001') as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.po_code).toBe('PO-00001');
    expect(data.data?.supplier_name).toBe('CV Supplier');
    expect(data.data?.items).toHaveLength(1);
  });

  it('returns 404 when PO not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    const res = await GET(makeGet('?po_code=PO-INVALID') as any);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/purchase-orders — validation', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects when supplier_code is missing', async () => {
    const res = await POST(makeFormDataReq('POST', {
      items: [{ product_code: 'P1', product_name: 'Item', quantity: 1, unit_price: 100 }],
    }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects when items array is empty', async () => {
    const res = await POST(makeFormDataReq('POST', {
      supplier_code: 'SUP-001',
      items: [],
    }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects when data field is missing', async () => {
    const fd = new FormData();
    const req = new Request('http://localhost/api/purchase-orders', { method: 'POST', body: fd });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/purchase-orders — payment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-set accounting mocks cleared by vi.resetAllMocks()
    vi.mocked(accounting.createPayment).mockResolvedValue('PAY-00001');
    vi.mocked(accounting.getCompanyCodeFromBank).mockResolvedValue('');
  });

  it('rejects payment when PO status is not approved', async () => {
    // queryOne #1: PO with status != 'approved'
    mockQueryOne.mockResolvedValueOnce({
      po_code: 'PO-00001', status: 'submitted', so_code: 'SO-001',
    });

    const res = await PUT(makeFormDataReq('PUT', {
      po_code: 'PO-00001',
      amount: 3_000_000,
      reference_number: 'TRF-001',
    }) as any);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/belum di-approve/i);
  });

  it('creates payment successfully for approved PO', async () => {
    // queryOne sequence:
    // [0] PO check (approved)
    // [1][2][3] getCompanyCodeFromPO local chain (PO→SO→project)
    // [4] existingAP
    mockQueryOne
      .mockResolvedValueOnce({ po_code: 'PO-00001', status: 'approved', so_code: 'SO-001' })
      .mockResolvedValueOnce({ so_code: 'SO-001' })
      .mockResolvedValueOnce({ project_code: 'PROJ-001' })
      .mockResolvedValueOnce({ company_code: 'COMP001' })
      .mockResolvedValueOnce({ ap_code: 'AP-00001' });

    // query: UPDATE purchase_orders status
    mockQuery.mockResolvedValue({ affectedRows: 1 });

    const res = await PUT(makeFormDataReq('PUT', {
      po_code: 'PO-00001',
      amount: 3_000_000,
      payment_date: '2026-06-08',
      reference_number: 'TRF-001',
    }) as any);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data?.payment_code).toBe('PAY-00001');
    expect(data.data?.ap_code).toBe('AP-00001');
  });

  it('rejects when required payment fields missing', async () => {
    // po_code missing → immediate 400
    const res = await PUT(makeFormDataReq('PUT', {
      amount: 3_000_000,
    }) as any);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/purchase-orders — status update', () => {
  beforeEach(() => vi.resetAllMocks());

  it('updates PO status to approved_spv', async () => {
    mockQueryOne.mockResolvedValueOnce({ po_code: 'PO-00001', status: 'submitted' });
    mockQuery.mockResolvedValue({ affectedRows: 1 });

    const res = await PATCH(makePatch({
      po_code: 'PO-00001',
      status: 'approved_spv',
    }) as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data?.status).toBe('approved_spv');
  });

  it('rejects invalid status value', async () => {
    const res = await PATCH(makePatch({
      po_code: 'PO-00001',
      status: 'invalid_status',
    }) as any);
    expect(res.status).toBe(400);
  });

  it('rejects when po_code is missing', async () => {
    const res = await PATCH(makePatch({ status: 'approved_spv' }) as any);
    expect(res.status).toBe(400);
  });
});
