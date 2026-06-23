// app/api/customers/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';

    const conditions = ['is_deleted = 0'];
    const params: unknown[] = [];
    
    if (search) { 
      conditions.push('(customer_name LIKE ? OR email LIKE ? OR customer_code LIKE ?)'); 
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM customers WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM customers WHERE ${where}`, params),
    ]);
    
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { 
    return serverError(err); 
  }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, phone, email, address, type = 'company', contact_person, tax_id } = await req.json();
    if (!name?.trim()) return badRequest('Nama wajib diisi');

    const code = `CUST${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(`INSERT INTO customers (customer_code, customer_name, phone, email, billing_address, shipping_address, customer_type, contact_person, tax_id, is_deleted, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,NOW(),NOW())`,
      [code, name, phone ?? null, email ?? null, address ?? null, address ?? null, type, contact_person ?? null, tax_id ?? null]);
    
    return created({ customer_code: code });
  } catch (err) { 
    return serverError(err); 
  }
});