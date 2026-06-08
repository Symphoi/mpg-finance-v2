/**
 * API tests — /api/invoice-payment/pay
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

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir:     vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/accounting', () => ({
  createJournalEntry: vi.fn().mockResolvedValue(undefined),
}));

import * as db from '@/app/lib/db';
import { POST } from '@/app/api/invoice-payment/pay/route';

const mockQuery    = vi.mocked(db.query);
const mockQueryOne = vi.mocked(db.queryOne);

function makeFormData(paymentData: object, includeFile = false) {
  const fd = new FormData();
  fd.append('data', JSON.stringify(paymentData));
  if (includeFile) {
    const blob = new Blob(['receipt pdf content'], { type: 'application/pdf' });
    fd.append('files', new File([blob], 'receipt.pdf', { type: 'application/pdf' }));
  }
  return new Request('http://localhost/api/invoice-payment/pay', { method: 'POST', body: fd });
}

function makeRaw() {
  // No 'data' field at all
  const fd = new FormData();
  return new Request('http://localhost/api/invoice-payment/pay', { method: 'POST', body: fd });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/invoice-payment/pay — validation', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects when data field is missing', async () => {
    const res = await POST(makeRaw() as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it('rejects when allocations is empty', async () => {
    const res = await POST(makeFormData({
      allocations: [],
      payment_date: '2026-06-08',
      reference_number: 'TRF-001',
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/minimal 1 invoice/i);
  });

  it('rejects when payment_date is missing', async () => {
    const res = await POST(makeFormData({
      allocations: [{ ar_code: 'AR-001', amount: 1_000_000 }],
      reference_number: 'TRF-001',
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/payment_date/i);
  });

  it('rejects when reference_number is missing', async () => {
    const res = await POST(makeFormData({
      allocations: [{ ar_code: 'AR-001', amount: 1_000_000 }],
      payment_date: '2026-06-08',
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/reference_number/i);
  });

  it('rejects when no proof-of-payment file is uploaded', async () => {
    const res = await POST(makeFormData({
      allocations: [{ ar_code: 'AR-001', amount: 1_000_000 }],
      payment_date: '2026-06-08',
      reference_number: 'TRF-001',
    }, false) as any);  // no file
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/bukti pembayaran/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/invoice-payment/pay — success', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates payment and returns payment_code (non-interco)', async () => {
    // queryOne sequence:
    // [0] bank account → company_code
    // [1] AR validation (outstanding check)
    // [2] PAY sequence
    // [3] full AR data (in allocation loop) — same company as bank → non-interco
    // [4] COUNT pending invoices (for SO status update)
    mockQueryOne
      .mockResolvedValueOnce({ company_code: 'COMP001' })
      .mockResolvedValueOnce({ ar_code: 'AR-001', outstanding_amount: 1_500_000, status: 'unpaid' })
      .mockResolvedValueOnce({ next_number: 1, prefix: 'PAY/' })
      .mockResolvedValueOnce({
        ar_code: 'AR-001', outstanding_amount: 1_500_000, status: 'unpaid',
        resolved_company_code: 'COMP001', customer_name: 'PT Test', so_code: 'SO-001',
      })
      .mockResolvedValueOnce({ pending: 0 });

    // query sequence:
    // [0] UPDATE numbering_sequences (PAY)
    // [1] INSERT payments
    // [2] UPDATE accounts_receivable
    // [3] INSERT payment_allocations
    // [4] INSERT payment_attachments
    // [5] SELECT DISTINCT so_code
    // [6] UPDATE sales_orders (pending=0 → completed)
    mockQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ so_code: 'SO-001' }])
      .mockResolvedValue({ affectedRows: 1 });

    const res = await POST(makeFormData({
      bank_account_code: 'BNK-001',
      allocations: [{ ar_code: 'AR-001', amount: 1_500_000 }],
      payment_date: '2026-06-08',
      payment_method: 'transfer',
      reference_number: 'TRF-2026-001',
      notes: 'Test payment',
    }, true) as any);  // include file

    expect(res.status).toBe(200);
    const body = await res.json();
    // ok({ message, data: { payment_code, ... } }) → body.data = { message, data: { ... } }
    const result = body.data?.data;
    expect(result?.payment_code).toMatch(/^PAY\//);
    expect(result?.total_amount).toBe(1_500_000);
    expect(result?.allocations_count).toBe(1);
    expect(result?.attachments).toBe(1);
  });
});
