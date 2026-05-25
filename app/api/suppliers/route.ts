// app/api/suppliers/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const conditions = ['is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conditions.push('(name LIKE ? OR supplier_code LIKE ? OR email LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM suppliers WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM suppliers WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, phone, email, address, city, contact_person, bank_name, account_number } = await req.json();
    if (!name?.trim()) return badRequest('Nama wajib diisi');
    const code = `SUP${Math.random().toString(36).slice(2,5).toUpperCase()}`;
    await query(`INSERT INTO suppliers (supplier_code,name,phone,email,address,city,contact_person,bank_name,account_number,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,NOW(),NOW())`,
      [code,name,phone??null,email??null,address??null,city??null,contact_person??null,bank_name??null,account_number??null]);
    return created({ supplier_code: code });
  } catch (err) { return serverError(err); }
});
