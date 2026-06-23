// app/api/deliver-to-client/[do_code]/delivered/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, badRequest, notFound } from '@/app/lib/response';
import { createAR, getCompanyCodeFromSO } from '@/lib/accounting';

export const PATCH = withAuth(async (req: NextRequest, user: any) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const do_code = decodeURIComponent(pathParts[pathParts.length - 2]);
  
  const body = await req.json();
  const { delivered_date, delivered_by, notes } = body;
  
  if (!do_code) return badRequest('do_code required');
  if (!delivered_date) return badRequest('delivered_date required');
  if (!delivered_by?.trim()) return badRequest('delivered_by required');
  
  // Ambil data DO dengan JOIN ke customers
  const doData: any = await queryOne(`
    SELECT d.*, so.customer_code, c.customer_name, so.status as so_status
    FROM delivery_orders d
    LEFT JOIN sales_orders so ON d.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    WHERE d.do_code = ? AND d.is_deleted = FALSE
  `, [do_code]);
  
  if (!doData) return notFound(`DO ${do_code} tidak ditemukan`);
  
  if (doData.status !== 'shipping') {
    return badRequest(`DO status ${doData.status}, tidak bisa di-deliver`);
  }
  
  if (doData.ar_code) {
    return badRequest(`DO sudah diproses, invoice sudah dibuat`);
  }
  
  if (!doData.total_amount || doData.total_amount <= 0) {
    return badRequest(`DO ${do_code} memiliki total_amount 0, tidak bisa dibuat invoice`);
  }
  
  const companyCode = await getCompanyCodeFromSO(doData.so_code);
  
  // 1. Create AR (Invoice + Revenue)
  const arCode = await createAR({
    customer_code: doData.customer_code,
    customer_name: doData.customer_name,
    invoice_date: delivered_date,
    amount: doData.total_amount,
    so_code: doData.so_code,
    description: `INV untuk DO ${do_code}`,
    company_code: companyCode,
  }, user);
  
  // 2. Update DO status
  await query(`
    UPDATE delivery_orders 
    SET status = 'delivered', 
        ar_code = ?,
        delivered_date = ?, 
        delivered_by = ?,
        notes = CONCAT(IFNULL(notes, ''), ' | Delivered: ', ?),
        updated_by = ?
    WHERE do_code = ?
  `, [arCode, delivered_date, delivered_by, notes || '', user.user_code || user.name, do_code]);
  
  // 4. Cek apakah semua item di SO sudah terkirim
  const remainingItems = await query(`
    SELECT soi.so_item_code, 
           soi.quantity as ordered_qty,
           COALESCE(SUM(doi.quantity), 0) as delivered_qty,
           (soi.quantity - COALESCE(SUM(doi.quantity), 0)) as remaining_qty
    FROM sales_order_items soi
    LEFT JOIN delivery_orders d ON d.so_code = soi.so_code 
        AND d.status = 'delivered' 
        AND d.is_deleted = FALSE
    LEFT JOIN delivery_order_items doi ON d.do_code = doi.do_code 
        AND doi.so_item_code = soi.so_item_code
    WHERE soi.so_code = ? AND soi.is_deleted = FALSE
    GROUP BY soi.so_item_code
    HAVING remaining_qty > 0
  `, [doData.so_code]);
  
  // 5. Jika semua item sudah terkirim, update SO ke 'invoicing'
  if (remainingItems.length === 0) {
    await query(`
      UPDATE sales_orders
      SET status = 'invoicing', updated_at = NOW()
      WHERE so_code = ?
    `, [doData.so_code]);
  }
  
  return ok({
    message: 'DO telah di-deliver, revenue & COGS telah diakui',
    data: {
      do_code,
      ar_code: arCode,
      status: 'delivered',
      delivered_date,
      delivered_by,
      total_revenue: doData.total_amount,
      all_items_delivered: remainingItems.length === 0
    }
  });
});