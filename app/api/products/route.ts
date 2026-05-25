// app/api/products/route.ts
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
    const category = url.searchParams.get('category') ?? '';

    const conditions = ['p.is_deleted=0'];
    const params: unknown[] = [];
    if (search)   { conditions.push('(p.name LIKE ? OR p.product_code LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
    if (category) { conditions.push('p.category_code=?'); params.push(category); }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON pc.category_code=p.category_code WHERE ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, description, category_code, unit, base_price } = await req.json();
    if (!name?.trim()) return badRequest('Nama produk wajib diisi');
    const code = `PRD${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(`INSERT INTO products (product_code,name,description,category_code,unit,base_price,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,0,NOW(),NOW())`,
      [code,name,description??null,category_code??null,unit??'pcs',base_price??0]);
    return created({ product_code: code });
  } catch (err) { return serverError(err); }
});
