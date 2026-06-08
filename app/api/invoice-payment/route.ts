// app/api/invoice-payment/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, badRequest, notFound } from '@/app/lib/response';
import { createPayment } from '@/lib/accounting';

// ==================== POST: Single or Multiple Payment ====================
export const POST = withAuth(async (req: NextRequest, user: any) => {
  const body = await req.json();
  
  // Multiple invoice payment (allocations)
  if (body.allocations && Array.isArray(body.allocations) && body.allocations.length > 0) {
    const { allocations, payment_date, payment_method, bank_name, account_number, reference_number, notes } = body;
    
    if (!payment_date) return badRequest('payment_date wajib diisi');
    if (!reference_number) return badRequest('reference_number wajib diisi');
    
    const totalAmount = allocations.reduce((sum: number, a: any) => sum + a.amount, 0);
    
    for (const alloc of allocations) {
      const ar: any = await queryOne(`
        SELECT ar.*, c.customer_name 
        FROM accounts_receivable ar
        LEFT JOIN sales_orders so ON ar.so_code = so.so_code
        LEFT JOIN customers c ON so.customer_code = c.customer_code
        WHERE ar.ar_code = ? AND ar.status != 'paid'
      `, [alloc.ar_code]);
      
      if (!ar) {
        return badRequest(`Invoice ${alloc.ar_code} tidak ditemukan atau sudah lunas`);
      }
      
      if (alloc.amount > ar.outstanding_amount) {
        return badRequest(`Pembayaran untuk ${alloc.ar_code} melebihi sisa piutang (${ar.outstanding_amount})`);
      }
    }
    
    const paymentCode = await createPayment({
      reference_type: 'ar',
      allocations: allocations,
      amount: totalAmount,
      payment_date: payment_date,
      payment_method: payment_method || 'transfer',
      bank_name: bank_name,
      account_number: account_number,
      reference_number: reference_number,
      notes: notes || `Pembayaran untuk ${allocations.length} invoice`,
    }, user);
    
    // Update SO status ke completed jika semua invoice sudah lunas
    for (const alloc of allocations) {
      const ar: any = await queryOne(`SELECT so_code FROM accounts_receivable WHERE ar_code = ?`, [alloc.ar_code]);
      if (ar?.so_code) {
        const pendingInvoices: any = await queryOne(`
          SELECT COUNT(*) as pending
          FROM accounts_receivable
          WHERE so_code = ? AND status != 'paid'
        `, [ar.so_code]);

        if (pendingInvoices?.pending === 0) {
          await query(`
            UPDATE sales_orders
            SET status = 'completed', updated_at = NOW()
            WHERE so_code = ?
          `, [ar.so_code]);
        }
      }
    }
    
    return ok({
      message: 'Pembayaran berhasil',
      data: { payment_code: paymentCode, total_amount: totalAmount, allocations }
    });
  }
  
  // Single invoice payment (backward compatible)
  const { ar_code, amount, payment_date, payment_method, bank_name, account_number, reference_number, notes } = body;
  
  if (!ar_code) return badRequest('ar_code wajib diisi');
  if (!amount || amount <= 0) return badRequest('amount harus > 0');
  if (!payment_date) return badRequest('payment_date wajib diisi');
  if (!reference_number) return badRequest('reference_number wajib diisi');
  
  const ar: any = await queryOne(`
    SELECT ar.*, c.customer_name, ar.so_code
    FROM accounts_receivable ar
    LEFT JOIN sales_orders so ON ar.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    WHERE ar.ar_code = ? AND ar.status != 'paid'
  `, [ar_code]);
  
  if (!ar) return notFound('Invoice tidak ditemukan atau sudah lunas');
  
  if (amount > ar.outstanding_amount) {
    return badRequest(`Jumlah pembayaran melebihi sisa piutang (${ar.outstanding_amount})`);
  }
  
  const paymentCode = await createPayment({
    reference_type: 'ar',
    reference_code: ar_code,
    amount: amount,
    payment_date: payment_date,
    payment_method: payment_method || 'transfer',
    bank_name: bank_name,
    account_number: account_number,
    reference_number: reference_number,
    notes: notes || `Pembayaran invoice ${ar_code}`,
  }, user);
  
  // Update SO status ke completed jika semua invoice sudah lunas
  if (ar.so_code) {
    const pendingInvoices: any = await queryOne(`
      SELECT COUNT(*) as pending
      FROM accounts_receivable
      WHERE so_code = ? AND status != 'paid'
    `, [ar.so_code]);

    if (pendingInvoices?.pending === 0) {
      await query(`
        UPDATE sales_orders 
        SET status = 'completed', updated_at = NOW()
        WHERE so_code = ?
      `, [ar.so_code]);
    }
  }
  
  return ok({
    message: 'Pembayaran berhasil',
    data: {
      payment_code: paymentCode,
      ar_code,
      amount_paid: amount,
      remaining: ar.outstanding_amount - amount
    }
  });
});

// ==================== GET: Group by SO ====================
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  let where = 'WHERE so.is_deleted = FALSE';
  const params: any[] = [];

  if (search) {
    where += ' AND (so.so_code LIKE ? OR c.customer_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status && status !== 'all') {
    where += ' AND so.status = ?';
    params.push(status);
  }

  const data = await query(`
    SELECT 
      so.so_code,
      c.customer_name,
      so.total_amount as so_total,
      so.status as so_status,
      so.created_at,
      COALESCE(SUM(ar.amount), 0) as total_invoiced,
      COALESCE(SUM(ar.amount - ar.outstanding_amount), 0) as total_paid,
      COALESCE(SUM(ar.outstanding_amount), 0) as total_outstanding,
      COUNT(ar.ar_code) as invoice_count,
      GROUP_CONCAT(DISTINCT ar.ar_code SEPARATOR ', ') as invoice_codes,
      GROUP_CONCAT(DISTINCT ar.status SEPARATOR ', ') as invoice_statuses
    FROM sales_orders so
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    LEFT JOIN accounts_receivable ar ON ar.so_code = so.so_code
    ${where}
    GROUP BY so.so_code, c.customer_name, so.total_amount, so.status, so.created_at
    ORDER BY so.created_at DESC
  `, params);

  // ✅ Pastikan data adalah array
  return ok({ data: data || [] });
});