// app/api/sales-orders/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, notFound, serverError } from '@/app/lib/response';

// Helper: Generate number sequence
async function getNextSequence(
  sequenceCode: string,
  companyCode: string | null,
  projectCode: string | null,
  salesCode: string | null,
  customerCode: string | null
) {
  try {
    const existingSequence: any = await queryOne(
      'SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?',
      [sequenceCode]
    );

    if (!existingSequence) {
      // Fallback: auto-create sequence
      await query(
        'INSERT INTO numbering_sequences (sequence_code, prefix, next_number) VALUES (?, ?, ?)',
        [sequenceCode, `${sequenceCode}-`, 1]
      );
      return {
        number: 1,
        prefix: `${sequenceCode}-`,
        code: `${sequenceCode}-00001`
      };
    }

    const currentNumber = existingSequence.next_number;
    const template = existingSequence.prefix;

    const dynamicPrefix = template
      .replace('{company}', companyCode || 'CS')
      .replace('{project}', projectCode || 'PROJ')
      .replace('{sales_rep}', salesCode || 'SR')
      .replace('{customer}', customerCode || 'CUST');

    const nextNumber = currentNumber + 1;

    await query(
      'UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?',
      [nextNumber, sequenceCode]
    );

    return {
      number: currentNumber,
      prefix: dynamicPrefix,
      code: `${dynamicPrefix}${String(currentNumber).padStart(5, '0')}`
    };
  } catch (error: any) {
    throw error;
  }
}

// GET: List & Detail
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const soCode = searchParams.get('so_code');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // === DETAIL by SO_CODE ===
    if (soCode) {
      const decodedSoCode = decodeURIComponent(soCode);

      const soResult: any = await queryOne(`
        SELECT 
          so.id,
          so.so_code,
          so.customer_code,
          so.sales_code,
          so.project_code,
          so.total_amount,
          so.tax_amount,
          so.tax_configuration,
          so.status,
          so.notes,
          so.is_deleted,
          so.created_at,
          so.updated_at
        FROM sales_orders so 
        WHERE so.so_code = ? AND so.is_deleted = FALSE
      `, [decodedSoCode]);

      if (!soResult) {
        return notFound('Sales order tidak ditemukan');
      }

      // Get customer info
      let customerInfo = null;
      if (soResult.customer_code) {
        customerInfo = await queryOne(
          'SELECT customer_code, customer_name, phone, email, customer_type FROM customers WHERE customer_code = ?',
          [soResult.customer_code]
        );
      }

      // Get sales info
      let salesInfo = null;
      if (soResult.sales_code) {
        salesInfo = await queryOne(
          'SELECT user_code, name, email FROM users WHERE user_code = ?',
          [soResult.sales_code]
        );
      }

      // Get project info
      let projectInfo = null;
      if (soResult.project_code) {
        projectInfo = await queryOne(
          'SELECT project_code, name FROM projects WHERE project_code = ? AND is_deleted = FALSE',
          [soResult.project_code]
        );
      }

      // Get items
      const items: any[] = await query(`
        SELECT 
          id, so_item_code, product_code, product_name,
          quantity, unit_price, subtotal
        FROM sales_order_items 
        WHERE so_code = ? AND is_deleted = FALSE
      `, [decodedSoCode]);

      // Get attachments
      const attachments: any[] = await query(`
        SELECT 
          id, attachment_code, filename, original_filename,
          file_type, file_size, file_path, uploaded_at
        FROM sales_order_attachments 
        WHERE so_code = ? AND is_deleted = FALSE
      `, [decodedSoCode]);

      return ok({
        ...soResult,
        customer: customerInfo,
        sales: salesInfo,
        project: projectInfo,
        items,
        attachments
      });
    }

    // === LIST ===
    let whereClause = 'WHERE so.is_deleted = FALSE';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND so.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (so.so_code LIKE ? OR so.customer_code LIKE ? OR so.sales_code LIKE ? OR so.project_code LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (from) {
      whereClause += ' AND DATE(so.created_at) >= ?';
      params.push(from);
    }

    if (to) {
      whereClause += ' AND DATE(so.created_at) <= ?';
      params.push(to);
    }

    // Count total
    const countResult: any = await queryOne(`
      SELECT COUNT(*) as total FROM sales_orders so ${whereClause}
    `, params);
    const total = countResult?.total || 0;

    // Get data
    const data: any[] = await query(`
      SELECT 
        so.id,
        so.so_code,
        so.customer_code,
        so.sales_code,
        so.project_code,
        so.total_amount,
        so.tax_amount,
        so.tax_configuration,
        so.status,
        so.notes,
        so.created_at,
        so.updated_at
      FROM sales_orders so 
      ${whereClause}
      ORDER BY so.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Attach customer & sales info
    for (const so of data) {
      if (so.customer_code) {
        const cust: any = await queryOne(
          'SELECT customer_name, phone FROM customers WHERE customer_code = ?',
          [so.customer_code]
        );
        so.customer_name = cust?.customer_name || so.customer_code;
        so.customer_phone = cust?.phone || '-';
      } else {
        so.customer_name = '-';
        so.phone = '-';
      }
const items = await query(
    'SELECT so_item_code, product_code, product_name, quantity, unit_price, subtotal FROM sales_order_items WHERE so_code = ? AND is_deleted = FALSE',
    [so.so_code]
  );
  so.items = items;

        // Count items
  const itemCount: any = await queryOne(
    'SELECT COUNT(*) as count FROM sales_order_items WHERE so_code = ? AND is_deleted = FALSE',
    [so.so_code]
  );
  so.item_count = itemCount?.count || 0;

  // ✅ Count PO
  const poCount: any = await queryOne(
    'SELECT COUNT(*) as count FROM purchase_orders WHERE so_code = ? AND is_deleted = FALSE',
    [so.so_code]
  );

  so.po_count = poCount?.count || 0;
    }

    return paginated(data, total, page, limit);
  } catch (error: any) {
    return serverError('Gagal mengambil data sales order');
  }
});

// POST: Create Sales Order
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const user: any = (req as any).user || {};

    const contentType = req.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return badRequest('Content-Type must be multipart/form-data');
    }

    const formData = await req.formData();

    const dataField = formData.get('data');
    if (!dataField) {
      return badRequest('Sales order data is required');
    }

    let soData: any;
    try {
      soData = JSON.parse(dataField as string);
    } catch {
      return badRequest('Invalid JSON data format');
    }

    // Validasi
    const errors: string[] = [];
    if (!soData.customer_code?.trim()) errors.push('Customer is required');
    if (!soData.items || soData.items.length === 0) errors.push('Minimal 1 item');

    const validItems = soData.items?.filter(
      (item: any) => item.product_code && item.product_name && item.quantity > 0 && item.unit_price > 0
    );
    if (!validItems || validItems.length === 0) {
      errors.push('At least one valid item is required');
    }

    if (errors.length > 0) {
      return badRequest(errors.join(', '));
    }

    // Validasi file
    const salesOrderFile = formData.get('sales_order_doc') as File | null;
    if (!salesOrderFile || salesOrderFile.size === 0) {
      return badRequest('Sales Order Document is required');
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(salesOrderFile.type)) {
      return badRequest('Invalid file type');
    }

    const maxSize = 10 * 1024 * 1024;
    if (salesOrderFile.size > maxSize) {
      return badRequest('File size too large. Maximum 10MB allowed');
    }

    // Extract data
    const {
      customer_code,
      sales_code = null,
      project_code = null,
      total_amount = 0,
      tax_amount = 0,
      tax_configuration = 'percentage',
      notes = null,
      items = []
    } = soData;

    // ✅ Truncate tax_configuration
    const safeTaxConfig = String(tax_configuration).substring(0, 20);

    // Generate SO code
    const sequence = await getNextSequence('SO', null, project_code, sales_code, customer_code);
    const soCode = sequence.code;

    // ✅ Insert sales order (hanya field yang ada di tabel final)
    await query(`
      INSERT INTO sales_orders 
      (so_code, customer_code, sales_code, project_code, 
       total_amount, tax_amount, tax_configuration, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
    `, [
      soCode,
      customer_code,
      sales_code,
      project_code,
      total_amount || 0,
      tax_amount || 0,
      safeTaxConfig,
      notes
    ]);

    // Insert items
    for (const item of validItems) {
      const itemCode = `SOI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await query(`
        INSERT INTO sales_order_items 
        (so_item_code, so_code, product_code, product_name, quantity, unit_price, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        itemCode,
        soCode,
        item.product_code,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.subtotal || (item.quantity * item.unit_price)
      ]);
    }

    // Recompute total_amount from inserted items
    const computedTotal = validItems.reduce((s: number, it: any) => s + (it.quantity * it.unit_price), 0);
    await query(
      `UPDATE sales_orders SET total_amount=?, updated_at=NOW() WHERE so_code=?`,
      [computedTotal, soCode]
    );

    // Upload files
    const otherFiles = formData.getAll('other_docs').filter(
      (file) => file instanceof File && file.size > 0
    ) as File[];

    const allFiles = [salesOrderFile, ...otherFiles];
    const uploadedFiles: any[] = [];

    for (const file of allFiles) {
      if (file && file.size > 0) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 9);
        const cleanSoCode = soCode.replace(/[\/\\:*?"<>|]/g, '_');
        const cleanOriginalName = file.name.replace(/[\/\\:*?"<>|]/g, '_');
        const fileExtension = cleanOriginalName.split('.').pop();
        const filename = `so_${cleanSoCode}_${timestamp}_${randomString}.${fileExtension}`;

        const fs = require('fs/promises');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sales-orders');
        await fs.mkdir(uploadDir, { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadDir, filename), buffer);

        const attachmentCode = `ATT-${timestamp}-${randomString}`;
        await query(`
          INSERT INTO sales_order_attachments 
          (attachment_code, so_code, filename, original_filename, file_type, file_size, file_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          attachmentCode, soCode, filename, cleanOriginalName,
          file.type, file.size, `/uploads/sales-orders/${filename}`
        ]);

        uploadedFiles.push({
          attachment_code: attachmentCode,
          original_name: cleanOriginalName,
          saved_name: filename,
          size: file.size,
          type: file.type
        });
      }
    }

    // Audit log
    const userCode = user?.user_code || user?.code || 'system';
    const userName = user?.name || 'System';

    await query(`
      INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
      VALUES (?, ?, ?, 'create', 'sales_order', ?, ?, ?)
    `, [
      `AUD-${Date.now()}`,
      userCode,
      userName,
      soCode,
      `Sales Order ${soCode}`,
      `Created with ${uploadedFiles.length} files, ${validItems.length} items`
    ]);

    return created({
      message: 'Sales order berhasil dibuat',
      so_code: soCode,
      data: {
        so_code: soCode,
        customer_code,
        total_amount,
        status: 'submitted',
        files_uploaded: uploadedFiles.length,
        items_count: validItems.length
      }
    });
  } catch (error: any) {
    return serverError(error.message || 'Internal server error');
  }
});