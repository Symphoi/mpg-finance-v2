// app/api/deliver-to-client/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, notFound } from '@/app/lib/response';

// ============================================================
// TYPES
// ============================================================

interface SOItem {
  so_item_code: string;
  product_code: string;
  product_name: string;
  so_qty: number;
  unit_price: number;
}

interface POStockItem {
  po_item_code: string;
  po_code: string;
  product_code: string;
  product_name: string;
  po_qty: number;
  purchase_price: number;
  supplier_name: string;
  used_qty: number;
}

interface AvailableStockItem {
  product_code: string;
  product_name: string;
  so_qty: number;
  unit_price: number;
  so_item_code: string;
  total_available: number;
  remaining_to_ship: number;
  po_items: {
    po_item_code: string;
    po_code: string;
    supplier_name: string;
    available_qty: number;
    purchase_price: number;
  }[];
}

// ============================================================
// HELPER: Generate DO Code
// ============================================================
async function generateDOCode(): Promise<string> {
  const seq: any = await queryOne(
    'SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?',
    ['DO']
  );
  
  if (!seq) {
    await query(
      'INSERT INTO numbering_sequences (sequence_code, prefix, next_number) VALUES (?, ?, ?)',
      ['DO', 'DO/', 1]
    );
    return `DO/00001`;
  }
  
  const next = seq.next_number + 1;
  const seqNum = String(seq.next_number).padStart(5, '0');
  const code = `${seq.prefix}${seqNum}`;
  
  await query('UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?', [next, 'DO']);
  
  return code;
}

// ============================================================
// HELPER: Get available stock from PO for SO
// ============================================================
async function getAvailableStock(so_code: string): Promise<AvailableStockItem[]> {
  // Ambil SO items dengan JOIN ke products (jika perlu)
  const soItems = await query(`
    SELECT soi.so_item_code, soi.product_code, soi.product_name, soi.quantity as so_qty, soi.unit_price
    FROM sales_order_items soi
    WHERE soi.so_code = ? AND soi.is_deleted = FALSE
  `, [so_code]) as SOItem[];
  
  // Ambil PO items dengan JOIN ke suppliers untuk supplier_name
  const poItems = await query(`
    SELECT 
      poi.po_item_code,
      poi.po_code,
      poi.product_code,
      poi.product_name,
      poi.quantity as po_qty,
      poi.purchase_price,
      s.supplier_name,
      COALESCE(SUM(doi.quantity), 0) as used_qty
    FROM purchase_order_items poi
    JOIN purchase_orders po ON poi.po_code = po.po_code
    LEFT JOIN suppliers s ON po.supplier_code = s.supplier_code
    LEFT JOIN delivery_order_items doi ON poi.po_item_code = doi.po_item_code
    WHERE po.so_code = ? 
      AND po.status = 'paid'
      AND po.is_deleted = FALSE
      AND poi.is_deleted = FALSE
    GROUP BY poi.po_item_code, poi.po_code, poi.product_code, poi.product_name, poi.quantity, poi.purchase_price, s.supplier_name
    HAVING (poi.quantity - COALESCE(SUM(doi.quantity), 0)) > 0
  `, [so_code]) as POStockItem[];
  
  // Ambil existing DO untuk menghitung delivered qty
  const existingDOs = await query(`
    SELECT doi.product_code, SUM(doi.quantity) as delivered_qty
    FROM delivery_orders d
    JOIN delivery_order_items doi ON d.do_code = doi.do_code
    WHERE d.so_code = ? AND d.is_deleted = FALSE AND d.status != 'cancelled'
    GROUP BY doi.product_code
  `, [so_code]) as { product_code: string; delivered_qty: number }[];
  
  const deliveredMap = new Map<string, number>();
  for (const d of existingDOs) {
    deliveredMap.set(d.product_code, d.delivered_qty);
  }
  
  const result: AvailableStockItem[] = [];
  
  for (const soItem of soItems) {
    const availablePOs = poItems.filter(pi => pi.product_code === soItem.product_code);
    const totalAvailable = availablePOs.reduce((sum, pi) => sum + (pi.po_qty - pi.used_qty), 0);
    const deliveredQty = deliveredMap.get(soItem.product_code) || 0;
    const remainingToShip = soItem.so_qty - deliveredQty;
    
    result.push({
      product_code: soItem.product_code,
      product_name: soItem.product_name,
      so_qty: soItem.so_qty,
      unit_price: soItem.unit_price,
      so_item_code: soItem.so_item_code,
      total_available: totalAvailable,
      remaining_to_ship: remainingToShip,
      po_items: availablePOs.map(pi => ({
        po_item_code: pi.po_item_code,
        po_code: pi.po_code,
        supplier_name: pi.supplier_name,
        available_qty: pi.po_qty - pi.used_qty,
        purchase_price: pi.purchase_price
      }))
    });
  }
  
  return result;
}

// ============================================================
// GET /api/deliver-to-client
// ============================================================
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const doCode = searchParams.get('do_code');
  const soCode = searchParams.get('so_code');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const action = searchParams.get('action');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;
  
  // Available stock
  if (action === 'available-stock' && soCode) {
    const stock = await getAvailableStock(soCode);
    return ok(stock);
  }
  
  // Detail DO
  if (doCode) {
    const doData = await queryOne(`
      SELECT d.*, c.customer_name, c.customer_code
      FROM delivery_orders d
      LEFT JOIN sales_orders so ON d.so_code = so.so_code
      LEFT JOIN customers c ON so.customer_code = c.customer_code
      WHERE d.do_code = ? AND d.is_deleted = FALSE
    `, [doCode]);
    
    if (!doData) return notFound('DO tidak ditemukan');
    
    const items = await query(`
      SELECT doi.*
      FROM delivery_order_items doi
      WHERE doi.do_code = ?
    `, [doCode]);
    
    return ok({ ...doData, items });
  }
  
  // List DO
  let where = 'WHERE d.is_deleted = FALSE';
  const params: any[] = [];
  
  if (status && status !== 'all') {
    where += ' AND d.status = ?';
    params.push(status);
  }
  
  if (search) {
    where += ' AND (d.do_code LIKE ? OR d.so_code LIKE ? OR c.customer_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  
  if (soCode) {
    where += ' AND d.so_code = ?';
    params.push(soCode);
  }
  
  const countResult: any = await queryOne(`
    SELECT COUNT(*) as total 
    FROM delivery_orders d
    LEFT JOIN sales_orders so ON d.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    ${where}
  `, params);
  const total = countResult?.total || 0;
  
  const data = await query(`
    SELECT d.*, c.customer_name,
      (SELECT COUNT(*) FROM delivery_order_items WHERE do_code = d.do_code) as item_count
    FROM delivery_orders d
    LEFT JOIN sales_orders so ON d.so_code = so.so_code
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    ${where}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  
  return paginated(data, total, page, limit);
});

// ============================================================
// POST /api/deliver-to-client
// ============================================================
export const POST = withAuth(async (req: NextRequest, user: any) => {
  const body = await req.json();
  const { so_code, items, courier, tracking_number, shipping_date, shipping_cost, notes } = body;
  
  if (!so_code) return badRequest('so_code wajib diisi');
  if (!items || !Array.isArray(items) || items.length === 0) {
    return badRequest('Minimal 1 item untuk dikirim');
  }
  if (!courier) return badRequest('Kurir wajib diisi');
  if (!tracking_number) return badRequest('Nomor resi wajib diisi');
  
  // Ambil SO dengan JOIN ke customers
  const so: any = await queryOne(`
    SELECT so.*, c.customer_name, c.customer_code
    FROM sales_orders so
    LEFT JOIN customers c ON so.customer_code = c.customer_code
    WHERE so.so_code = ? AND so.is_deleted = FALSE
  `, [so_code]);
  
  if (!so) return notFound('SO tidak ditemukan');
  if (so.status === 'cancelled') return badRequest('SO sudah dibatalkan');
  
  // Validasi items & hitung total
  let totalAmount = 0;
  const deliveryItems: any[] = [];
  
  for (const item of items) {
    const soItem: any = await queryOne(`
      SELECT so_item_code, product_code, product_name, quantity as so_qty, unit_price
      FROM sales_order_items
      WHERE so_code = ? AND product_code = ? AND is_deleted = FALSE
    `, [so_code, item.product_code]);
    
    if (!soItem) {
      return badRequest(`Product ${item.product_code} tidak ditemukan di SO`);
    }
    
    const totalQty = item.po_items.reduce((sum: number, pi: any) => sum + pi.quantity, 0);
    
    if (totalQty <= 0) {
      return badRequest(`Quantity untuk ${soItem.product_name} harus > 0`);
    }
    
    // Cek remaining qty
    const alreadyDelivered: any = await queryOne(`
      SELECT COALESCE(SUM(doi.quantity), 0) as delivered
      FROM delivery_orders d
      JOIN delivery_order_items doi ON d.do_code = doi.do_code
      WHERE d.so_code = ? AND doi.product_code = ? AND d.is_deleted = FALSE AND d.status != 'cancelled'
    `, [so_code, item.product_code]);
    
    const remaining = soItem.so_qty - (alreadyDelivered?.delivered || 0);
    
    if (totalQty > remaining) {
      return badRequest(`Quantity ${soItem.product_name} melebihi sisa (${remaining})`);
    }
    
    for (const poItem of item.po_items) {
      const poi: any = await queryOne(`
        SELECT poi.*, po.status as po_status, po.po_code
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.po_code = po.po_code
        WHERE poi.po_item_code = ? AND poi.is_deleted = FALSE
      `, [poItem.po_item_code]);
      
      if (!poi) {
        return badRequest(`PO item ${poItem.po_item_code} tidak ditemukan`);
      }
      
      if (poi.po_status !== 'paid') {
        return badRequest(`PO ${poi.po_code} belum paid, tidak bisa digunakan untuk DO`);
      }
      
      const usedQty: any = await queryOne(`
        SELECT COALESCE(SUM(quantity), 0) as used
        FROM delivery_order_items
        WHERE po_item_code = ?
      `, [poItem.po_item_code]);
      
      const poRemaining = poi.quantity - (usedQty?.used || 0);
      
      if (poItem.quantity > poRemaining) {
        return badRequest(`Stok PO ${poi.po_code} untuk ${poi.product_name} sisa ${poRemaining}`);
      }
      
      const itemSubtotal = poItem.quantity * soItem.unit_price;
      totalAmount += itemSubtotal;
      
      deliveryItems.push({
        so_item_code: soItem.so_item_code,
        po_item_code: poItem.po_item_code,
        product_code: poi.product_code,
        product_name: poi.product_name,
        quantity: poItem.quantity,
        unit_price: soItem.unit_price,
        purchase_price: poi.purchase_price,
        subtotal: itemSubtotal,
        cogs_amount: poItem.quantity * poi.purchase_price
      });
    }
  }
  
  const doCode = await generateDOCode();
  
  // ✅ STATUS 'shipping' (bukan 'shipped')
  await query(`
    INSERT INTO delivery_orders (
      do_code, so_code, courier, tracking_number, 
      shipping_date, shipping_cost, total_amount, notes, 
      status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'shipping', ?)
  `, [
    doCode, so_code, courier, tracking_number,
    shipping_date || new Date().toISOString().split('T')[0],
    shipping_cost || 0,
    totalAmount,
    notes || null,
    user.user_code || user.name || 'system'
  ]);
  
  for (const item of deliveryItems) {
    await query(`
      INSERT INTO delivery_order_items (
        do_code, so_item_code, po_item_code, product_code, product_name,
        quantity, unit_price, purchase_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      doCode, item.so_item_code, item.po_item_code, item.product_code, item.product_name,
      item.quantity, item.unit_price, item.purchase_price
    ]);
  }
  
  // Update SO status ke processing jika masih submitted
  if (so.status === 'submitted') {
    await query(`
      UPDATE sales_orders SET status = 'processing', updated_at = NOW()
      WHERE so_code = ?
    `, [so_code]);
  }
  
  return created({
    message: 'Delivery Order berhasil dibuat',
    data: {
      do_code: doCode,
      total_amount: totalAmount,
      status: 'shipping'
    }
  });
});
