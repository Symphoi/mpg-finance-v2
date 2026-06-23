/**
 * Unit tests — lib/accounting.ts
 * DB fully mocked, no MySQL connection needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DB module BEFORE any imports that use it ────────────────────────────
vi.mock('@/app/lib/db', () => ({
  query:    vi.fn(),
  queryOne: vi.fn(),
}));

// ── Imports (vi.mock is hoisted, so mocks are active by the time these run) ──
import * as db from '@/app/lib/db';
import {
  getAccountingRule,
  getCompanyCodeFromPO,
  getCompanyCodeFromBank,
  clearAccountingCache,
  createPayment,
  createAR,
  createAP,
} from '@/lib/accounting';

// ── Typed mock helpers ────────────────────────────────────────────────────────
const mockQuery    = vi.mocked(db.query);
const mockQueryOne = vi.mocked(db.queryOne);

// ── Shared constants ──────────────────────────────────────────────────────────
const MOCK_USER = { user_code: 'USR001', name: 'Test User' };

const ALL_TYPES = [
  'payment_out','payment_in','invoice','cogs','ap','ar','sale','purchase',
  'inter_co_send','inter_co_receive','payment_out_interco',
].map(code => ({ type_code: code, type_name: code }));

// ─────────────────────────────────────────────────────────────────────────────
describe('getAccountingRule', () => {
  beforeEach(() => {
    vi.resetAllMocks();  // clears call history AND return value queue
    clearAccountingCache();
  });

  it('returns correct debit/credit accounts for a valid type', async () => {
    // No companyCode passed → company-specific queryOne is SKIPPED → only 1 queryOne call
    mockQuery.mockResolvedValueOnce(ALL_TYPES);
    mockQueryOne.mockResolvedValueOnce({
      debit_account_code: '10010-00',
      credit_account_code: '40000-00',
      tax_account_code: null,
    });

    const rule = await getAccountingRule('payment_out');
    expect(rule.debit_account_code).toBe('10010-00');
    expect(rule.credit_account_code).toBe('40000-00');
  });

  it('throws for an invalid transaction type', async () => {
    mockQuery.mockResolvedValueOnce(ALL_TYPES);
    await expect(getAccountingRule('invalid_type')).rejects.toThrow(
      'Invalid transaction type: invalid_type'
    );
  });

  it('prefers company-specific rule over global rule', async () => {
    mockQuery.mockResolvedValueOnce(ALL_TYPES);
    mockQueryOne.mockResolvedValueOnce({
      debit_account_code: '20101-COMP',
      credit_account_code: '10020-COMP',
      tax_account_code: null,
    });

    const rule = await getAccountingRule('payment_out', 'COMP001');
    expect(rule.debit_account_code).toBe('20101-COMP');
  });

  it('throws when no global rule found', async () => {
    // No companyCode → only global queryOne is called, returns null
    mockQuery.mockResolvedValueOnce(ALL_TYPES);
    mockQueryOne.mockResolvedValueOnce(null);

    await expect(getAccountingRule('payment_out')).rejects.toThrow(
      'Accounting rule not found for: payment_out'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getCompanyCodeFromPO', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAccountingCache();
  });

  it('resolves company from PO → SO → project chain', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ so_code: 'SO-001' })
      .mockResolvedValueOnce({ project_code: 'PROJ-001' })
      .mockResolvedValueOnce({ company_code: 'COMP001' });

    expect(await getCompanyCodeFromPO('PO-001')).toBe('COMP001');
  });

  it('returns empty string when PO not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    expect(await getCompanyCodeFromPO('PO-UNKNOWN')).toBe('');
  });

  it('returns empty string when SO has no project', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ so_code: 'SO-001' })
      .mockResolvedValueOnce({ project_code: null });

    expect(await getCompanyCodeFromPO('PO-001')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getCompanyCodeFromBank', () => {
  beforeEach(() => { vi.resetAllMocks(); clearAccountingCache(); });

  it('returns company_code for a known bank account', async () => {
    mockQueryOne.mockResolvedValueOnce({ company_code: 'COMP_BANK' });
    expect(await getCompanyCodeFromBank('BNK001')).toBe('COMP_BANK');
  });

  it('returns empty string when bank account not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    expect(await getCompanyCodeFromBank('BNK-NONE')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('createPayment — normal (non-intercompany)', () => {
  beforeEach(() => { vi.resetAllMocks(); clearAccountingCache(); });

  it('creates exactly 1 journal entry when bank and PO are same company', async () => {
    // query call order:
    // [0] UPDATE numbering (PAY) [1] INSERT payment [2] UPDATE AP
    // [3] getTransactionTypes    [4..] JNL writes + audit
    mockQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce(ALL_TYPES)
      .mockResolvedValue({ affectedRows: 1 });

    // queryOne order: generateCode(PAY), company rule, global rule, generateCode(JNL)
    mockQueryOne
      .mockResolvedValueOnce({ next_number: 1, prefix: 'PAY-' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ debit_account_code: '20101-00', credit_account_code: '10020-00', tax_account_code: null })
      .mockResolvedValueOnce({ next_number: 1, prefix: 'JNL-' });

    const code = await createPayment({
      reference_type: 'ap',
      reference_code: 'AP-001',
      amount: 1_000_000,
      payment_date: '2026-06-08',
      payment_method: 'transfer',
      bank_name: 'BCA',
      company_code: 'COMP001',
      bank_company_code: 'COMP001', // same → NOT interco
    }, MOCK_USER);

    expect(code).toMatch(/^PAY/);

    const journalInserts = mockQuery.mock.calls.filter(
      ([sql]: any) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(journalInserts).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('createPayment — intercompany', () => {
  beforeEach(() => { vi.resetAllMocks(); clearAccountingCache(); });

  it('creates 2 journal entries when bank company ≠ PO company', async () => {
    mockQuery
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE numbering PAY
      .mockResolvedValueOnce({ affectedRows: 1 }) // INSERT payment
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE AP
      .mockResolvedValueOnce(ALL_TYPES)            // getTransactionTypes (cached after)
      .mockResolvedValue({ affectedRows: 1 });     // JNL1 + JNL2 writes + audit

    // queryOne: PAY code, rule1-company, rule1-global, JNL1 code,
    //           rule2-company, rule2-global, JNL2 code
    mockQueryOne
      .mockResolvedValueOnce({ next_number: 1, prefix: 'PAY-' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ debit_account_code: '20101-00', credit_account_code: '2150',    tax_account_code: null })
      .mockResolvedValueOnce({ next_number: 1, prefix: 'JNL-' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ debit_account_code: '1150',    credit_account_code: '10020-00', tax_account_code: null })
      .mockResolvedValueOnce({ next_number: 2, prefix: 'JNL-' });

    await createPayment({
      reference_type: 'ap',
      reference_code: 'AP-001',
      amount: 2_500_000,
      payment_date: '2026-06-08',
      payment_method: 'transfer',
      bank_name: 'BCA',
      company_code: 'COMP_PO',
      bank_company_code: 'COMP_BANK', // DIFFERENT → interco
    }, MOCK_USER);

    const journalInserts = mockQuery.mock.calls.filter(
      ([sql]: any) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(journalInserts).toHaveLength(2);

    // company_code is at index 6 in the INSERT params array
    expect(journalInserts[0][1][6]).toBe('COMP_PO');
    expect(journalInserts[1][1][6]).toBe('COMP_BANK');
  });

  it('creates only 1 journal for AR payment even if companies differ', async () => {
    mockQuery
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE accounts_receivable
      .mockResolvedValueOnce(ALL_TYPES)
      .mockResolvedValue({ affectedRows: 1 });

    mockQueryOne
      .mockResolvedValueOnce({ next_number: 1, prefix: 'PAY-' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ debit_account_code: '10020-00', credit_account_code: '10300-00', tax_account_code: null })
      .mockResolvedValueOnce({ next_number: 1, prefix: 'JNL-' });

    await createPayment({
      reference_type: 'ar',     // AR: interco rule does NOT apply
      reference_code: 'AR-001',
      amount: 500_000,
      payment_date: '2026-06-08',
      payment_method: 'transfer',
      bank_name: 'Mandiri',
      company_code: 'COMP001',
      bank_company_code: 'COMP002',
    }, MOCK_USER);

    const journalInserts = mockQuery.mock.calls.filter(
      ([sql]: any) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(journalInserts).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('createAR', () => {
  beforeEach(() => { vi.resetAllMocks(); clearAccountingCache(); });

  it('inserts AR record with correct company_code', async () => {
    mockQuery.mockResolvedValue({ affectedRows: 1 });
    mockQueryOne.mockResolvedValueOnce({ next_number: 1, prefix: 'AR-' });

    await createAR({
      customer_name: 'PT Test',
      invoice_date: '2026-06-08',
      due_date: '2026-07-08',
      amount: 5_000_000,
      tax_amount: 0,
      so_code: 'SO-001',
      invoice_number: 'INV-001',
      description: 'Test AR',
      company_code: 'COMP_AR',
    }, MOCK_USER);

    const arInsert = mockQuery.mock.calls.find(
      ([sql]: any) => typeof sql === 'string' && sql.includes('INSERT INTO accounts_receivable')
    );
    expect(arInsert).toBeDefined();
    // company_code is the 10th param (index 9) in INSERT accounts_receivable
    expect(arInsert![1]).toContain('COMP_AR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('createAP', () => {
  beforeEach(() => { vi.resetAllMocks(); clearAccountingCache(); });

  it('inserts AP record with correct company_code', async () => {
    mockQuery.mockResolvedValue({ affectedRows: 1 });
    mockQueryOne.mockResolvedValueOnce({ next_number: 1, prefix: 'AP-' });

    await createAP({
      supplier_name: 'CV Supplier',
      invoice_date: '2026-06-08',
      amount: 3_000_000,
      tax_amount: 0,
      po_code: 'PO-001',
      invoice_number: 'INV-AP-001',
      description: 'Test AP',
      company_code: 'COMP_AP',
    }, MOCK_USER);

    const apInsert = mockQuery.mock.calls.find(
      ([sql]: any) => typeof sql === 'string' && sql.includes('INSERT INTO accounts_payable')
    );
    expect(apInsert).toBeDefined();
    expect(apInsert![1]).toContain('COMP_AP');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Intercompany detection logic', () => {
  it('is NOT interco when bank_company_code is undefined', () => {
    const p = { company_code: 'COMP001', bank_company_code: undefined };
    const isInterco = p.bank_company_code && p.company_code && p.bank_company_code !== p.company_code;
    expect(isInterco).toBeFalsy();
  });

  it('is NOT interco when both companies are the same', () => {
    const p = { company_code: 'COMP001', bank_company_code: 'COMP001' };
    const isInterco = p.bank_company_code && p.company_code && p.bank_company_code !== p.company_code;
    expect(isInterco).toBeFalsy();
  });

  it('IS interco when companies differ', () => {
    const p = { company_code: 'COMP001', bank_company_code: 'COMP002' };
    const isInterco = p.bank_company_code && p.company_code && p.bank_company_code !== p.company_code;
    expect(isInterco).toBeTruthy();
  });
});
