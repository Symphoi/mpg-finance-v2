// lib/accounting.ts
import { query, queryOne } from '@/app/lib/db';

// ============================================================
// COGS JOURNAL untuk Delivery Order
// ============================================================

export async function createCOGSJournal(
  data: {
    do_code: string;
    so_code: string;
    total_cogs: number;
    transaction_date: string;
    company_code?: string;
    description?: string;
  },
  user: { user_code?: string; name?: string }
): Promise<string | null> {
  if (data.total_cogs <= 0) {
    console.log(`⚠️ COGS amount is 0 for DO ${data.do_code}, skipping journal`);
    return null;
  }

  try {
    const rule = await getAccountingRule('cogs', data.company_code);
    if (!rule) {
      console.error(`❌ Accounting rule 'cogs' not found`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to get accounting rule for cogs:`, error);
    return null;
  }

  const journalCode = await createJournalEntry({
    transaction_date: data.transaction_date,
    description: data.description || `COGS untuk DO ${data.do_code} (SO: ${data.so_code})`,
    reference_type: 'delivery_order',
    reference_code: data.do_code,
    total_amount: data.total_cogs,
    transaction_type: 'cogs',
    company_code: data.company_code,
  }, user);

  console.log(`✅ COGS Journal created for DO ${data.do_code}: ${journalCode}, amount: ${data.total_cogs}`);
  
  return journalCode;
}

// ============================================================
// TRANSACTION TYPES — Cache dari Database
// ============================================================

let transactionTypesCache: { code: string; name: string }[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function getTransactionTypes(): Promise<{ code: string; name: string }[]> {
  const now = Date.now();
  if (transactionTypesCache.length > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return transactionTypesCache;
  }

  const rows: any[] = await query(
    `SELECT type_code, type_name FROM transaction_types WHERE is_active = TRUE ORDER BY type_code`
  );
  transactionTypesCache = rows.map(r => ({ code: r.type_code, name: r.type_name }));
  cacheTimestamp = now;
  return transactionTypesCache;
}

async function isValidTransactionType(typeCode: string): Promise<boolean> {
  const types = await getTransactionTypes();
  return types.some(t => t.code === typeCode);
}

// ============================================================
// CHART OF ACCOUNTS — Cache per Company
// ============================================================

let coaCache: Record<string, { codes: string[]; timestamp: number }> = {};

async function getCOAForCompany(companyCode: string): Promise<string[]> {
  const now = Date.now();
  if (coaCache[companyCode] && now - coaCache[companyCode].timestamp < CACHE_DURATION) {
    return coaCache[companyCode].codes;
  }

  const rows: any[] = await query(
    `SELECT account_code FROM chart_of_accounts 
     WHERE company_code = ? AND is_active = TRUE 
     ORDER BY account_code`,
    [companyCode]
  );
  const codes = rows.map(r => r.account_code);
  coaCache[companyCode] = { codes, timestamp: now };
  return codes;
}

async function validateAccount(accountCode: string, companyCode: string): Promise<boolean> {
  const codes = await getCOAForCompany(companyCode);
  return codes.includes(accountCode);
}

export function clearAccountingCache() {
  transactionTypesCache = [];
  cacheTimestamp = 0;
  coaCache = {};
}

// ============================================================
// GET ACCOUNTING RULE
// ============================================================

interface AccountingRule {
  debit_account_code: string;
  credit_account_code: string;
  tax_account_code?: string | null;
}

export async function getAccountingRule(
  transactionType: string,
  companyCode?: string
): Promise<AccountingRule> {
  if (!(await isValidTransactionType(transactionType))) {
    throw new Error(`Invalid transaction type: ${transactionType}`);
  }

  // 1. Cari rules spesifik company
  if (companyCode) {
    const companyRule: any = await queryOne(`
      SELECT debit_account_code, credit_account_code, tax_account_code
      FROM accounting_rules 
      WHERE transaction_type = ? AND company_code = ? AND is_active = TRUE
      LIMIT 1
    `, [transactionType, companyCode]);

    if (companyRule) {
      return {
        debit_account_code: companyRule.debit_account_code,
        credit_account_code: companyRule.credit_account_code,
        tax_account_code: companyRule.tax_account_code || null,
      };
    }
  }

  // 2. Fallback: global rules
  const globalRule: any = await queryOne(`
    SELECT debit_account_code, credit_account_code, tax_account_code
    FROM accounting_rules 
    WHERE transaction_type = ? AND company_code IS NULL AND is_active = TRUE
    LIMIT 1
  `, [transactionType]);

  if (!globalRule) {
    throw new Error(`Accounting rule not found for: ${transactionType}`);
  }

  return {
    debit_account_code: globalRule.debit_account_code,
    credit_account_code: globalRule.credit_account_code,
    tax_account_code: globalRule.tax_account_code || null,
  };
}

// ============================================================
// HELPER: Company Code dari berbagai sumber
// ============================================================

export async function getCompanyCodeFromPO(po_code: string): Promise<string> {
  const po: any = await queryOne(
    `SELECT po.so_code FROM purchase_orders po WHERE po.po_code = ?`,
    [po_code]
  );
  if (!po?.so_code) return '';

  const so: any = await queryOne(
    `SELECT project_code FROM sales_orders WHERE so_code = ?`,
    [po.so_code]
  );
  if (!so?.project_code) return '';

  const proj: any = await queryOne(
    `SELECT company_code FROM projects WHERE project_code = ?`,
    [so.project_code]
  );
  return proj?.company_code || '';
}

export async function getCompanyCodeFromBank(bankAccountCode: string): Promise<string> {
  const bank: any = await queryOne(
    `SELECT company_code FROM bank_accounts WHERE account_code = ?`,
    [bankAccountCode]
  );
  return bank?.company_code || '';
}

// ============================================================
// GENERATE CODE
// ============================================================

async function generateCode(prefix: string): Promise<string> {
  const seq: any = await queryOne(
    'SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?',
    [prefix]
  );

  if (!seq) {
    await query(
      'INSERT INTO numbering_sequences (sequence_code, prefix, next_number) VALUES (?, ?, ?)',
      [prefix, `${prefix}-`, 1]
    );
    return `${prefix}-00001`;
  }

  const next = seq.next_number + 1;
  await query('UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?', [next, prefix]);
  return `${seq.prefix}${String(seq.next_number).padStart(5, '0')}`;
}

// ============================================================
// AUDIT LOG
// ============================================================

async function auditLog(
  userCode: string,
  userName: string,
  action: string,
  resourceType: string,
  resourceCode: string,
  notes: string
) {
  try {
    await query(`
      INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `AUD-${Date.now()}`,
      userCode || 'system',
      userName || 'System',
      action,
      resourceType,
      resourceCode,
      `${resourceType} ${resourceCode}`,
      notes,
    ]);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ============================================================
// JOURNAL ENTRY
// ============================================================

interface JournalEntry {
  transaction_date: string;
  description: string;
  reference_type: string;
  reference_code: string;
  total_amount: number;
  transaction_type: string;
  tax_amount?: number;
  tax_account_code?: string;
  company_code?: string;
}

export async function createJournalEntry(
  entry: JournalEntry,
  user: { user_code?: string; name?: string }
) {
  const rule = await getAccountingRule(entry.transaction_type, entry.company_code);
  const journalCode = await generateCode('JNL');
  const periodCode = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const taxAmount = entry.tax_amount || 0;
  const baseAmount = entry.total_amount - taxAmount;
  const taxAccountCode = entry.tax_account_code || rule.tax_account_code;

  // Journal Header
  await query(`
    INSERT INTO journal_entries
    (journal_code, transaction_date, description, reference_type, reference_code, period_code, company_code, total_debit, total_credit, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?)
  `, [
    journalCode,
    entry.transaction_date,
    entry.description,
    entry.reference_type,
    entry.reference_code,
    periodCode,
    entry.company_code || null,
    entry.total_amount,
    entry.total_amount,
    user.name || 'System',
  ]);

  // Debit: Base Amount
  if (baseAmount > 0) {
    const itemCode1 = `JNI-${Date.now()}-1`;
    await query(`
      INSERT INTO journal_items 
      (journal_item_code, journal_code, account_code, debit_amount, credit_amount, description)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [itemCode1, journalCode, rule.debit_account_code, baseAmount, entry.description]);
  }

  // Debit: Tax
  if (taxAmount > 0 && taxAccountCode) {
    const itemCode2 = `JNI-${Date.now()}-2`;
    await query(`
      INSERT INTO journal_items 
      (journal_item_code, journal_code, account_code, debit_amount, credit_amount, description)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [itemCode2, journalCode, taxAccountCode, taxAmount, `PPN - ${entry.description}`]);
  }

  // Credit: Total
  const itemCode3 = `JNI-${Date.now()}-3`;
  await query(`
    INSERT INTO journal_items 
    (journal_item_code, journal_code, account_code, debit_amount, credit_amount, description)
    VALUES (?, ?, ?, 0, ?, ?)
  `, [itemCode3, journalCode, rule.credit_account_code, entry.total_amount, entry.description]);

  return journalCode;
}

// ============================================================
// ACCOUNTS RECEIVABLE (AR)
// ============================================================

interface AReceivable {
  customer_code: string;
  customer_name: string;
  invoice_date: string;
  amount: number;
  tax_amount?: number;
  so_code?: string;
  description?: string;
  company_code?: string;
}

export async function createAR(
  ar: AReceivable,
  user: { user_code?: string; name?: string }
) {
  const arCode = await generateCode('AR');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const taxAmount = ar.tax_amount || 0;

  await query(`
    INSERT INTO accounts_receivable
    (ar_code, customer_code, invoice_number, invoice_date, due_date, amount, tax_amount, outstanding_amount, so_code, company_code, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)
  `, [
    arCode,
    ar.customer_code,
    arCode,
    ar.invoice_date,
    dueDate,
    ar.amount,
    taxAmount,
    ar.amount,
    ar.so_code || null,
    ar.company_code || null,
    ar.description || null,
  ]);

  await createJournalEntry({
    transaction_date: ar.invoice_date,
    description: `AR ${arCode} - ${ar.customer_name}`,
    reference_type: 'ar_invoice',
    reference_code: arCode,
    total_amount: ar.amount,
    transaction_type: 'sale',
    tax_amount: taxAmount,
    company_code: ar.company_code,
  }, user);

  await auditLog(
    user.user_code || 'system',
    user.name || 'System',
    'create',
    'ar_invoice',
    arCode,
    `AR ${arCode}: ${ar.customer_name} - ${ar.amount}`
  );

  return arCode;
}

// ============================================================
// ACCOUNTS PAYABLE (AP)
// ============================================================

interface APayable {
  supplier_name: string;
  invoice_date: string;
  amount: number;
  tax_amount?: number;
  po_code?: string;
  invoice_number?: string;
  description?: string;
  company_code?: string;
}

export async function createAP(
  ap: APayable,
  user: { user_code?: string; name?: string }
) {
  const apCode = await generateCode('AP');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const taxAmount = ap.tax_amount || 0;
  const invoiceNumber = `${ap.invoice_number || 'INV'}-${apCode}`;

  await query(`
    INSERT INTO accounts_payable
    (ap_code, supplier_name, invoice_number, invoice_date, due_date, amount, tax_amount, outstanding_amount, po_code, company_code, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)
  `, [
    apCode,
    ap.supplier_name,
    invoiceNumber,
    ap.invoice_date,
    dueDate,
    ap.amount,
    taxAmount,
    ap.amount,
    ap.po_code || null,
    ap.company_code || null,
    ap.description || null,
  ]);

  await createJournalEntry({
    transaction_date: ap.invoice_date,
    description: `AP ${apCode} - ${ap.supplier_name}`,
    reference_type: 'ap_invoice',
    reference_code: apCode,
    total_amount: ap.amount,
    transaction_type: 'purchase',
    tax_amount: taxAmount,
    company_code: ap.company_code,
  }, user);

  await auditLog(
    user.user_code || 'system',
    user.name || 'System',
    'create',
    'ap_invoice',
    apCode,
    `AP ${apCode}: ${ap.supplier_name} - ${ap.amount}`
  );

  return apCode;
}

// ============================================================
// PAYMENT (IN/OUT)
// ============================================================

interface PaymentData {
  reference_type: 'ar' | 'ap';
  reference_code?: string;
  allocations?: { ar_code: string; amount: number }[];
  po_code?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  bank_name?: string;
  account_number?: string;
  reference_number?: string;
  notes?: string;
  company_code?: string;
  bank_company_code?: string;
}

export async function createPayment(
  payment: PaymentData,
  user: { user_code?: string; name?: string }
) {
  const paymentCode = await generateCode('PAY');
  const transactionType = payment.reference_type === 'ar' ? 'payment_in' : 'payment_out';

  await query(`
    INSERT INTO purchase_order_payments 
    (payment_code, po_code, amount, payment_date, payment_method, bank_name, account_number, reference_number, notes, supplier_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')
  `, [
    paymentCode,
    payment.po_code || null,
    payment.amount,
    payment.payment_date,
    payment.payment_method,
    payment.bank_name,
    payment.account_number,
    payment.reference_number,
    payment.notes,
    '',
  ]);

  if (payment.reference_type === 'ar') {
    await query(`
      UPDATE accounts_receivable 
      SET outstanding_amount = outstanding_amount - ?, 
          status = IF(outstanding_amount - ? <= 0, 'paid', 'partial') 
      WHERE ar_code = ?
    `, [payment.amount, payment.amount, payment.reference_code]);
  } else {
    await query(`
      UPDATE accounts_payable 
      SET outstanding_amount = outstanding_amount - ?, 
          status = IF(outstanding_amount - ? <= 0, 'paid', 'partial') 
      WHERE ap_code = ?
    `, [payment.amount, payment.amount, payment.reference_code]);
  }

  const isIntercompany = payment.bank_company_code &&
    payment.company_code &&
    payment.bank_company_code !== payment.company_code;

  if (isIntercompany && payment.reference_type === 'ap') {
    // PO company: DR Hutang Usaha / CR Hutang Interco (2150)
    await createJournalEntry({
      transaction_date: payment.payment_date,
      description: `Pembayaran interco ${paymentCode} — AP ke ${payment.bank_company_code}`,
      reference_type: 'payment',
      reference_code: paymentCode,
      total_amount: payment.amount,
      transaction_type: 'payment_out_interco',
      company_code: payment.company_code,
    }, user);
    // Bank company: DR Piutang Interco (1150) / CR Bank
    await createJournalEntry({
      transaction_date: payment.payment_date,
      description: `Pembayaran interco ${paymentCode} — bayar atas nama ${payment.company_code}`,
      reference_type: 'payment',
      reference_code: paymentCode,
      total_amount: payment.amount,
      transaction_type: 'inter_co_send',
      company_code: payment.bank_company_code,
    }, user);
  } else {
    await createJournalEntry({
      transaction_date: payment.payment_date,
      description: `Payment ${paymentCode} - ${payment.reference_type} ${payment.reference_code}`,
      reference_type: 'payment',
      reference_code: paymentCode,
      total_amount: payment.amount,
      transaction_type: transactionType,
      company_code: payment.company_code,
    }, user);
  }

  await auditLog(
    user.user_code || 'system',
    user.name || 'System',
    'pay',
    'payment',
    paymentCode,
    `Payment ${paymentCode}: ${payment.reference_type} ${payment.reference_code} - ${payment.amount}`
  );

  return paymentCode;
}

// ============================================================
// INTER-COMPANY JOURNAL
// ============================================================

interface InterCompanyEntry {
  from_company: string;
  to_company: string;
  amount: number;
  description: string;
  transaction_date: string;
  reference_type: string;
  reference_code: string;
}

export async function createInterCompanyJournal(
  entry: InterCompanyEntry,
  user: { user_code?: string; name?: string }
) {
  const { from_company, to_company } = entry;

  // Company pengirim (yang bayarin)
  await createJournalEntry({
    transaction_date: entry.transaction_date,
    description: `Inter-Co Send: ${entry.description} (to ${to_company})`,
    reference_type: entry.reference_type,
    reference_code: entry.reference_code,
    total_amount: entry.amount,
    transaction_type: 'inter_co_send',
    company_code: from_company,
  }, user);

  // Company penerima (yang punya PO)
  await createJournalEntry({
    transaction_date: entry.transaction_date,
    description: `Inter-Co Receive: ${entry.description} (from ${from_company})`,
    reference_type: entry.reference_type,
    reference_code: entry.reference_code,
    total_amount: entry.amount,
    transaction_type: 'inter_co_receive',
    company_code: to_company,
  }, user);

  await auditLog(
    user.user_code || 'system',
    user.name || 'System',
    'inter_co',
    'inter_company',
    entry.reference_code,
    `Inter-Co: ${from_company} → ${to_company} - ${entry.amount}`
  );
}

// ============================================================
// REPORT HELPERS
// ============================================================

export async function getCOA(companyCode?: string) {
  let where = 'WHERE is_active = TRUE';
  const params: any[] = [];
  if (companyCode) {
    where += ' AND company_code = ?';
    params.push(companyCode);
  }
  return await query(
    `SELECT * FROM chart_of_accounts ${where} ORDER BY account_code`,
    params
  );
}

export async function getTrialBalance(companyCode?: string, periodCode?: string) {
  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (companyCode) {
    where += ' AND coa.company_code = ?';
    params.push(companyCode);
  }
  if (periodCode) {
    where += ' AND je.period_code = ?';
    params.push(periodCode);
  }

  return await query(`
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      coa.company_code,
      coa.parent_account_code,
      SUM(ji.debit_amount) as total_debit,
      SUM(ji.credit_amount) as total_credit,
      SUM(ji.debit_amount) - SUM(ji.credit_amount) as balance
    FROM journal_items ji
    JOIN journal_entries je ON ji.journal_code = je.journal_code
    JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
    ${where}
    GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.company_code, coa.parent_account_code
    ORDER BY coa.account_code
  `, params);
}

export async function getIncomeStatement(companyCode?: string, periodCode?: string) {
  const data = await getTrialBalance(companyCode, periodCode);
  return data.filter(
    (row: any) => row.account_type === 'revenue' || row.account_type === 'expense'
  );
}
export async function calculateCOGSFromDO(do_code: string): Promise<number> {
    console.log('🔍 calculateCOGSFromDO called for:', do_code);

  const result: any = await queryOne(`
    SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_cogs
    FROM delivery_order_items
    WHERE do_code = ?
  `, [do_code]);
    console.log('🔍 calculateCOGSFromDO result:', result);

  return result?.total_cogs || 0;
}

export async function getBalanceSheet(companyCode?: string) {
  const data = await getTrialBalance(companyCode);
  return data.filter(
    (row: any) =>
      row.account_type === 'asset' ||
      row.account_type === 'liability' ||
      row.account_type === 'equity'
  );
}
export async function getCompanyCodeFromSO(so_code: string): Promise<string> {
  const so: any = await queryOne(
    `SELECT project_code FROM sales_orders WHERE so_code = ? AND is_deleted = FALSE`,
    [so_code]
  );
  if (!so?.project_code) return '';
  
  const proj: any = await queryOne(
    `SELECT company_code FROM projects WHERE project_code = ? AND is_deleted = FALSE`,
    [so.project_code]
  );
  return proj?.company_code || '';
}


export async function getGeneralLedger(
  accountCode: string,
  companyCode?: string,
  fromDate?: string,
  toDate?: string
) {
  let where = 'WHERE coa.account_code = ?';
  const params: any[] = [accountCode];

  if (companyCode) {
    where += ' AND coa.company_code = ?';
    params.push(companyCode);
  }
  if (fromDate) {
    where += ' AND je.transaction_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    where += ' AND je.transaction_date <= ?';
    params.push(toDate);
  }

  return await query(`
    SELECT 
      je.journal_code,
      je.transaction_date,
      je.description,
      je.reference_type,
      je.reference_code,
      ji.debit_amount,
      ji.credit_amount
    FROM journal_items ji
    JOIN journal_entries je ON ji.journal_code = je.journal_code
    JOIN chart_of_accounts coa ON ji.account_code = coa.account_code
    ${where}
    ORDER BY je.transaction_date ASC, je.journal_code ASC
  `, params);
}