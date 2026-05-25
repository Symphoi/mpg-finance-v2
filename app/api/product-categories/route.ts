// app/api/product-categories/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';

    const conds = ['is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conds.push('(category_code LIKE ? OR name LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM product_categories WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM product_categories WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, description } = await req.json();
    if (!name?.trim()) return badRequest('Nama wajib diisi');
    const code = `PC${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(
      `INSERT INTO product_categories (category_code,name,description,is_deleted,created_at,updated_at) VALUES (?,?,?,0,NOW(),NOW())`,
      [code, name, description??null]
    );
    return created({ category_code: code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { category_code, name, description } = await req.json();
    if (!category_code) return badRequest('category_code wajib');
    await query(`UPDATE product_categories SET name=?,description=?,updated_at=NOW() WHERE category_code=? AND is_deleted=0`, [name, description??null, category_code]);
    return ok({ category_code });
  } catch (err) { return serverError(err); }
});
