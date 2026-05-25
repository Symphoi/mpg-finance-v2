// app/api/reimbursement-categories/route.ts
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
    const showInactive = url.searchParams.get('show_inactive') === 'true';

    const conds = ['is_deleted=0'];
    const params: unknown[] = [];
    if (!showInactive) conds.push('is_active=1');
    if (search) { conds.push('(category_code LIKE ? OR name LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM reimbursement_categories WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM reimbursement_categories WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, description, max_amount } = await req.json();
    if (!name?.trim()) return badRequest('Nama wajib diisi');
    const code = `RC${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(
      `INSERT INTO reimbursement_categories (category_code,name,description,max_amount,is_active,is_deleted,created_at,updated_at) VALUES (?,?,?,?,1,0,NOW(),NOW())`,
      [code, name, description??null, max_amount??null]
    );
    return created({ category_code: code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { category_code, name, description, max_amount, is_active } = await req.json();
    if (!category_code) return badRequest('category_code wajib');
    await query(
      `UPDATE reimbursement_categories SET name=?,description=?,max_amount=?,is_active=?,updated_at=NOW() WHERE category_code=? AND is_deleted=0`,
      [name, description??null, max_amount??null, is_active??1, category_code]
    );
    return ok({ category_code });
  } catch (err) { return serverError(err); }
});
