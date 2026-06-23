// app/api/invoice-payment/pay/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, badRequest } from '@/app/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';


async function generatePaymentCode(): Promise<string> {
  const seq: any = await queryOne(
    'SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?',
    ['PAY']
  );
  
  if (!seq) {
    await query(
      'INSERT INTO numbering_sequences (sequence_code, prefix, next_number) VALUES (?, ?, ?)',
      ['PAY', 'PAY/', 1]
    );
    return `PAY/00001`;
  }
  
  const next = seq.next_number + 1;
  const seqNum = String(seq.next_number).padStart(5, '0');
  const code = `${seq.prefix}${seqNum}`;
  
  await query('UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?', [next, 'PAY']);
  
  return code;
}

export const POST = withAuth(async (req: NextRequest, user: any) => {
  // Handle FormData (karena ada upload file)
  const formData = await req.formData();
  const dataField = formData.get('data');
  
  if (!dataField) return badRequest('Data tidak ditemukan');
  
  let paymentData;
  try {
    paymentData = JSON.parse(dataField as string);
  } catch {
    return badRequest('Invalid JSON data');
  }
  
  const { allocations, payment_date, payment_method, bank_account_code, bank_name, account_number, reference_number, notes } = paymentData;
  const files = formData.getAll('files').filter(f => f instanceof File && f.size > 0) as File[];

  // Validasi input
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return badRequest('Pilih minimal 1 invoice');
  }

  if (!payment_date) return badRequest('payment_date wajib diisi');
  if (!reference_number) return badRequest('reference_number wajib diisi');
  
  // Validasi upload file WAJIB
  if (files.length === 0) {
    return badRequest('Upload minimal 1 bukti pembayaran');
  }

  // Ambil company_code dari bank account yang dipilih
  let bankCompanyCode = null;
  if (bank_account_code) {
    const bankAccount: any = await queryOne(
      'SELECT company_code FROM bank_accounts WHERE account_code = ?',
      [bank_account_code]
    );
    bankCompanyCode = bankAccount?.company_code;
  }

  // Validasi setiap invoice
  for (const alloc of allocations) {
    const ar: any = await queryOne(
      'SELECT * FROM accounts_receivable WHERE ar_code = ? AND status != "paid"',
      [alloc.ar_code]
    );
    if (!ar) return badRequest(`Invoice ${alloc.ar_code} tidak ditemukan atau sudah lunas`);
    if (alloc.amount > ar.outstanding_amount) {
      return badRequest(`Pembayaran untuk ${alloc.ar_code} melebihi sisa piutang (${ar.outstanding_amount})`);
    }
  }

  // Upload files
  const uploadedFiles = [];
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
  await mkdir(uploadDir, { recursive: true });

  for (const file of files) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const ext = file.name.split('.').pop();
    const filename = `payment_${timestamp}_${randomString}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    uploadedFiles.push({
      original_name: file.name,
      filename,
      path: `/uploads/payments/${filename}`,
      size: file.size
    });
  }

  // Generate payment code
  const paymentCode = await generatePaymentCode();
  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  // Insert ke payments
  await query(`
    INSERT INTO payments 
    (payment_code, payment_date, payment_method, bank_name, account_number, 
     reference_number, amount, notes, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
  `, [
    paymentCode,
    payment_date,
    payment_method || 'transfer',
    bank_name || null,
    account_number || null,
    reference_number,
    totalAmount,
    notes || null,
    user.user_code || user.name || 'system'
  ]);

  // Proses setiap allocation
  for (const alloc of allocations) {
    // Ambil data AR lengkap — resolve company via AR.company_code atau SO→project→company
    const ar: any = await queryOne(`
      SELECT ar.*, c.customer_name,
        COALESCE(ar.company_code, proj.company_code) AS resolved_company_code,
        COALESCE(comp.name, '') AS invoice_company_name
      FROM accounts_receivable ar
      LEFT JOIN sales_orders so ON ar.so_code = so.so_code
      LEFT JOIN customers c ON so.customer_code = c.customer_code
      LEFT JOIN projects proj ON so.project_code = proj.project_code
      LEFT JOIN companies comp ON COALESCE(ar.company_code, proj.company_code) = comp.company_code
      WHERE ar.ar_code = ? AND ar.status != 'paid'
    `, [alloc.ar_code]);

    if (!ar) {
      throw new Error(`Invoice ${alloc.ar_code} tidak ditemukan atau sudah lunas`);
    }

    const invoiceCompanyCode = ar.resolved_company_code;

    // INTERCOMPANY DETECTION
    if (bankCompanyCode && invoiceCompanyCode && bankCompanyCode !== invoiceCompanyCode) {
      // Update AR di perusahaan pemilik invoice
      await query(`
        UPDATE accounts_receivable
        SET outstanding_amount = outstanding_amount - ?,
            status = IF(outstanding_amount - ? <= 0, 'paid', 'partial')
        WHERE ar_code = ?
      `, [alloc.amount, alloc.amount, alloc.ar_code]);

      // 4. Insert ke payment_allocations
      await query(`
        INSERT INTO payment_allocations (payment_code, ar_code, amount)
        VALUES (?, ?, ?)
      `, [paymentCode, alloc.ar_code, alloc.amount]);

    } else {
      // Non-intercompany (normal)
      await query(`
        UPDATE accounts_receivable
        SET outstanding_amount = outstanding_amount - ?,
            status = IF(outstanding_amount - ? <= 0, 'paid', 'partial')
        WHERE ar_code = ?
      `, [alloc.amount, alloc.amount, alloc.ar_code]);

      await query(`
        INSERT INTO payment_allocations (payment_code, ar_code, amount)
        VALUES (?, ?, ?)
      `, [paymentCode, alloc.ar_code, alloc.amount]);

    }
  }

  // Simpan attachment ke tabel payment_attachments
  for (const file of uploadedFiles) {
    await query(`
      INSERT INTO payment_attachments (payment_code, filename, original_filename, file_path, file_size)
      VALUES (?, ?, ?, ?, ?)
    `, [paymentCode, file.filename, file.original_name, file.path, file.size]);
  }

  // Update SO status ke completed jika semua invoice sudah lunas
  const arCodes = allocations.map((a: any) => a.ar_code);
  const soCodes = await query<{ so_code: string }>(`
    SELECT DISTINCT so_code FROM accounts_receivable
    WHERE ar_code IN (${arCodes.map(() => '?').join(',')})
  `, arCodes);

  for (const row of soCodes) {
    if (row.so_code) {
      const pendingInvoices: any = await queryOne(`
        SELECT COUNT(*) as pending
        FROM accounts_receivable
        WHERE so_code = ? AND status != 'paid'
      `, [row.so_code]);

      if (pendingInvoices?.pending === 0) {
        await query(`
          UPDATE sales_orders
          SET status = 'completed', updated_at = NOW()
          WHERE so_code = ?
        `, [row.so_code]);
      }
    }
  }

  return ok({
    message: 'Pembayaran berhasil',
    data: {
      payment_code: paymentCode,
      total_amount: totalAmount,
      allocations_count: allocations.length,
      attachments: uploadedFiles.length
    }
  });
});