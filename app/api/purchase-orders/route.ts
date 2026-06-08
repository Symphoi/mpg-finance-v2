// app/api/purchase-orders/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, notFound, serverError } from '@/app/lib/response';
import { createAP, createPayment, getCompanyCodeFromBank } from '@/lib/accounting';

async function getNextSequence(
  sequenceCode: string,
  customerCode?: string,
  projectCode?: string,
  companyCode?: string,
  salesCode?: string
) {
  const existing: any = await queryOne(
    'SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?',
    [sequenceCode]
  );
  if (!existing) {
    await query(
      'INSERT INTO numbering_sequences (sequence_code, prefix, next_number) VALUES (?, ?, ?)',
      [sequenceCode, `${sequenceCode}-`, 1]
    );
    return { code: `${sequenceCode}-00001` };
  }

  const next = existing.next_number + 1;
  const template = existing.prefix;

  const dynamicPrefix = template
    .replace('{customer}', customerCode || 'CUST')
    .replace('{project}', projectCode || 'PROJ')
    .replace('{company}', companyCode || 'COMP')
    .replace('{sales_rep}', salesCode || 'SR');

  const seq = String(existing.next_number).padStart(5, '0');
  const code = `${dynamicPrefix}${seq}`;

  await query('UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?', [next, sequenceCode]);

  return { code };
}

// Helper: ambil company_code dari PO
async function getCompanyCodeFromPO(po_code: string): Promise<string> {
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

// ============================== GET ==============================
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint');
  const poCode = searchParams.get('po_code');
  const soCode = searchParams.get('so_code');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  // ─── Suppliers ────────────────────────────────────────────────
  if (endpoint === 'suppliers') {
    const rows = await query(
      `SELECT supplier_code, supplier_name, contact_person, phone, email, bank_name, account_number
       FROM suppliers WHERE status = 'active' AND is_deleted = FALSE ORDER BY supplier_name`
    );
    return ok(rows);
  }

  // ─── Bank Accounts ─────────────────────────────────────────────
  if (endpoint === 'bank-accounts') {
    const rows = await query(
      `SELECT account_code, bank_name, account_number, account_holder, branch
       FROM bank_accounts WHERE is_active = 1 AND is_deleted = 0 ORDER BY bank_name`
    );
    return ok(rows);
  }

  // ─── PDF ──────────────────────────────────────────────────────
  if (endpoint === 'pdf') {
    if (!poCode) return badRequest('po_code required');
    const po: any = await queryOne(
      `SELECT po.*, s.supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
       WHERE po.po_code = ? AND po.is_deleted = FALSE`, [poCode]
    );
    if (!po) return notFound('PO tidak ditemukan');

    const items = await query('SELECT * FROM purchase_order_items WHERE po_code = ? AND is_deleted = FALSE', [poCode]);
    const payments = await query('SELECT * FROM purchase_order_payments WHERE po_code = ? AND is_deleted = FALSE', [poCode]);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PO ${po.po_code}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px}.header{border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px}
      .title{font-size:24px;font-weight:bold;text-align:center;margin:20px 0}
      table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;font-size:12px}
      th{background:#f5f5f5}.text-right{text-align:right}.total{font-weight:bold;font-size:14px}
      .footer{margin-top:50px;text-align:center;font-size:10px;color:#999}</style></head><body>
      <div class="header"><h1>PURCHASE ORDER</h1></div><div class="title">${po.po_code}</div>
      <table><tr><td><strong>Supplier:</strong></td><td>${po.supplier_name}</td><td><strong>Date:</strong></td><td>${po.created_at?.split('T')[0] || '-'}</td></tr>
      <tr><td><strong>SO:</strong></td><td>${po.so_code || '-'}</td><td><strong>Status:</strong></td><td>${po.status}</td></tr></table>
      <h3>Items</h3><table><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th class="text-right">Subtotal</th></tr>
      ${items.map((i: any) => `<tr><td>${i.product_name}<br><small>${i.product_code}</small></td><td>${i.quantity}</td><td>${Number(i.purchase_price).toLocaleString('id-ID')}</td><td class="text-right">${(i.quantity * i.purchase_price).toLocaleString('id-ID')}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">TOTAL</td><td class="text-right">${Number(po.total_amount).toLocaleString('id-ID')}</td></tr></table>
      ${payments.length > 0 ? `<h3>Payments</h3><table><tr><th>Code</th><th>Date</th><th>Method</th><th class="text-right">Amount</th></tr>${payments.map((p: any) => `<tr><td>${p.payment_code}</td><td>${p.payment_date}</td><td>${p.payment_method}</td><td class="text-right">${Number(p.amount).toLocaleString('id-ID')}</td></tr>`).join('')}</table>` : ''}
      </body></html>`;
    return ok({ pdf_base64: Buffer.from(html).toString('base64'), purchase_order: po, items, payments });
  }

  // ─── Detail ──────────────────────────────────────────────────
  if (poCode) {
    const po: any = await queryOne(
      `SELECT po.*, s.supplier_name, s.phone as supplier_phone, s.bank_name, s.account_number
       FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
       WHERE po.po_code = ? AND po.is_deleted = FALSE`, [poCode]
    );
    if (!po) return notFound('PO tidak ditemukan');

    const items = await query('SELECT * FROM purchase_order_items WHERE po_code = ? AND is_deleted = FALSE', [poCode]);
    const attachments = await query(`SELECT * FROM po_attachments WHERE reference_type='po' AND reference_code=? AND is_deleted=FALSE`, [poCode]);
    const payments = await query('SELECT * FROM purchase_order_payments WHERE po_code = ? AND is_deleted = FALSE', [poCode]);

    return ok({ ...po, items, attachments, payments });
  }

  // ─── List by SO ───────────────────────────────────────────────
  if (soCode) {
    const data: any[] = await query(
      `SELECT po.*, s.supplier_name,
        (SELECT COUNT(*) FROM purchase_order_items WHERE po_code=po.po_code AND is_deleted=FALSE) as item_count
       FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
       WHERE po.so_code = ? AND po.is_deleted = FALSE ORDER BY po.created_at DESC`, [soCode]
    );
    for (const po of data) {
      po.items = await query('SELECT * FROM purchase_order_items WHERE po_code = ? AND is_deleted = FALSE', [po.po_code]);
    }
    return ok(data);
  }

  // ─── List All ─────────────────────────────────────────────────
  let where = 'WHERE po.is_deleted = FALSE';
  const params: any[] = [];
  if (status && status !== 'all') { where += ' AND po.status = ?'; params.push(status); }
  if (search) {
    where += ' AND (po.po_code LIKE ? OR s.supplier_name LIKE ? OR po.so_code LIKE ?)';
    const s = `%${search}%`; params.push(s, s, s);
  }
  if (from) { where += ' AND DATE(po.created_at) >= ?'; params.push(from); }
  if (to)   { where += ' AND DATE(po.created_at) <= ?'; params.push(to); }

  const countResult: any = await queryOne(
    `SELECT COUNT(*) as total FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code ${where}`, params
  );
  const total = countResult?.total || 0;

  const data: any[] = await query(
    `SELECT po.*, s.supplier_name,
      (SELECT COUNT(*) FROM purchase_order_items WHERE po_code=po.po_code AND is_deleted=FALSE) as item_count
     FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
     ${where} ORDER BY po.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  for (const po of data) {
    po.items = await query('SELECT * FROM purchase_order_items WHERE po_code = ? AND is_deleted = FALSE', [po.po_code]);
    po.payments = await query('SELECT * FROM purchase_order_payments WHERE po_code = ? AND is_deleted = FALSE', [po.po_code]);
  }

  return paginated(data, total, page, limit);
});

// ============================== POST: Create PO ==============================
export const POST = withAuth(async (req: NextRequest, user: any) => {
  const formData = await req.formData();
  const dataField = formData.get('data');
  if (!dataField) return badRequest('Data is required');

  let poData: any;
  try { poData = JSON.parse(dataField as string); } catch { return badRequest('Invalid JSON'); }

  const {
    so_code = null, supplier_code, total_amount = 0,
    tax_amount = 0, tax_configuration = 'percentage',
    notes = null, items = []
  } = poData;

  if (!supplier_code) return badRequest('Supplier is required');
  if (!items?.length) return badRequest('Minimal 1 item');

  let customerCode = '';
  let projectCode = '';
  let companyCode = '';
  if (so_code) {
    const soData: any = await queryOne(
      'SELECT customer_code, project_code FROM sales_orders WHERE so_code = ? AND is_deleted = FALSE',
      [so_code]
    );
    if (soData) {
      customerCode = soData.customer_code || '';
      projectCode = soData.project_code || '';
      if (projectCode) {
        const proj: any = await queryOne(
          'SELECT company_code FROM projects WHERE project_code = ? AND is_deleted = FALSE',
          [projectCode]
        );
        companyCode = proj?.company_code || '';
      }
    }
  }
  const salesCode = user?.user_code || user?.code || '';

  const poCode = (await getNextSequence('PO', customerCode, projectCode, companyCode, salesCode)).code;
  const userCode = user?.user_code || user?.name || 'system';

  await query(
    `INSERT INTO purchase_orders (po_code, so_code, supplier_code, total_amount, tax_amount, tax_configuration, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
    [poCode, so_code, supplier_code, total_amount, tax_amount, tax_configuration, notes, userCode]
  );

  for (const item of items) {
    const poiCode = `POI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await query(
      `INSERT INTO purchase_order_items (po_item_code, po_code, product_code, product_name, quantity, purchase_price, supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [poiCode, poCode, item.product_code, item.product_name, item.quantity, item.unit_price, supplier_code]
    );
  }

  // Upload files
  const poFile = formData.get('po_document') as File | null;
  const otherFiles = formData.getAll('other_docs').filter(f => f instanceof File && f.size > 0) as File[];
  for (const file of [poFile, ...otherFiles]) {
    if (!file) continue;
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const ext = file.name.split('.').pop();
    const filename = `po_${timestamp}_${randomString}.${ext}`;
    const fs = require('fs/promises');
    const path = require('path');
    const dir = path.join(process.cwd(), 'public', 'uploads', 'purchase-orders');
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    await query(
      `INSERT INTO po_attachments (attachment_code, reference_type, reference_code, filename, original_filename, file_type, file_size, file_path)
       VALUES (?, 'po', ?, ?, ?, ?, ?, ?)`,
      [`ATT-${timestamp}-${randomString}`, poCode, filename, file.name, file.type, file.size, `/uploads/purchase-orders/${filename}`]
    );
  }

  if (so_code) {
    await query("UPDATE sales_orders SET status = 'processing' WHERE so_code = ? AND status = 'submitted'", [so_code]);
  }

  return created({ message: 'PO berhasil dibuat', po_code: poCode, data: { po_code: poCode, status: 'submitted' } });
});

// ============================== PUT: Payment ==============================
export const PUT = withAuth(async (req: NextRequest, user: any) => {
  const formData = await req.formData();
  const dataField = formData.get('data');
  
  if (!dataField) return badRequest('Payment data required');

  let paymentData: any;
  try { paymentData = JSON.parse(dataField as string); } catch { return badRequest('Invalid JSON'); }

  const { po_code, amount, payment_date, payment_method = 'transfer', bank_name, account_number, reference_number, notes, supplier_name, company_bank_code } = paymentData;
  if (!po_code || !amount || !reference_number) return badRequest('po_code, amount, reference_number wajib');

  const po: any = await queryOne('SELECT * FROM purchase_orders WHERE po_code = ? AND is_deleted = FALSE', [po_code]);
  if (!po) return notFound('PO tidak ditemukan');

  if (po.status !== 'approved') {
    return badRequest('PO belum di-approve oleh Finance, tidak bisa dibayar');
  }

  const companyCode     = await getCompanyCodeFromPO(po_code);
  const bankCompanyCode = company_bank_code ? await getCompanyCodeFromBank(company_bank_code) : '';

  // ✅ CARI AP yang sudah ada (dari saat PO approved)
  const existingAP: any = await queryOne(
    `SELECT ap_code FROM accounts_payable 
     WHERE po_code = ? AND status = 'unpaid' 
     ORDER BY created_at DESC LIMIT 1`,
    [po_code]
  );

  if (!existingAP) {
    return badRequest('AP tidak ditemukan. PO mungkin belum di-approve oleh Finance.');
  }

  // ✅ CREATE PAYMENT SAJA (tanpa createAP lagi)
  const paymentCode = await createPayment({
    reference_type: 'ap',
    reference_code: existingAP.ap_code,
    po_code,
    amount: Number(amount),
    payment_date,
    payment_method,
    bank_name,
    account_number,
    reference_number,
    notes,
    company_code:      companyCode,
    bank_company_code: bankCompanyCode || undefined,
  }, user);

  // Update status PO
  await query('UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE po_code = ?', ['paid', po_code]);

  // Upload files (sama seperti sebelumnya)
  const files = formData.getAll('files').filter(f => f instanceof File && f.size > 0) as File[];
  for (const file of files) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const ext = file.name.split('.').pop();
    const filename = `pay_${timestamp}_${randomString}.${ext}`;
    const fs = require('fs/promises');
    const path = require('path');
    const dir = path.join(process.cwd(), 'public', 'uploads', 'payments');
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    await query(
      `INSERT INTO po_attachments (attachment_code, reference_type, reference_code, filename, original_filename, file_type, file_size, file_path)
       VALUES (?, 'payment', ?, ?, ?, ?, ?, ?)`,
      [`PAYATT-${timestamp}-${randomString}`, paymentCode, filename, file.name, file.type, file.size, `/uploads/payments/${filename}`]
    );
  }

  return created({ message: 'Pembayaran berhasil', payment_code: paymentCode, ap_code: existingAP.ap_code });
});
// ============================== PATCH: Update Status ==============================
export const PATCH = withAuth(async (req: NextRequest, user: any) => {
  const body = await req.json();
  const { po_code, status, notes } = body;

  if (!po_code || !status) return badRequest('po_code dan status wajib');
  const valid = ['submitted', 'approved_spv', 'approved', 'rejected', 'paid', 'cancelled'];
  if (!valid.includes(status)) return badRequest('Status tidak valid');

  const po: any = await queryOne('SELECT * FROM purchase_orders WHERE po_code = ? AND is_deleted = FALSE', [po_code]);
  if (!po) return notFound('PO tidak ditemukan');

  const userCode = user?.user_code || user?.name || 'system';

  if (status === 'approved_spv') {
    await query('UPDATE purchase_orders SET status=?, approved_by_spv=?, updated_at=NOW() WHERE po_code=?', [status, userCode, po_code]);
  } else if (status === 'approved') {
    await query('UPDATE purchase_orders SET status=?, approved_by_finance=?, updated_at=NOW() WHERE po_code=?', [status, userCode, po_code]);
  } else if (status === 'rejected') {
    const reason = notes || '';
    await query(
      `UPDATE purchase_orders SET status='rejected', notes=CONCAT(IFNULL(notes,''),' | Rejected: ',?), updated_at=NOW() WHERE po_code=?`,
      [reason, po_code]
    );
    if (po.so_code) {
      const other: any = await queryOne(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE so_code=? AND is_deleted=0 AND status NOT IN ('rejected','cancelled')`,
        [po.so_code]
      );
      if (other?.count === 0) {
        await query("UPDATE sales_orders SET status='submitted' WHERE so_code=? AND is_deleted=0", [po.so_code]);
      }
    }
  } else {
    await query('UPDATE purchase_orders SET status=?, updated_at=NOW() WHERE po_code=?', [status, po_code]);
  }

  return ok({ message: `PO ${po_code} updated to ${status}`, po_code, status });
});