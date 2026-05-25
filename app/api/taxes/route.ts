// app/api/taxes/route.ts
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
    if (!showInactive) { conds.push('is_active=1'); }
    if (search) { conds.push('(tax_code LIKE ? OR name LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT * FROM tax_types WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM tax_types WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, rate, description, tax_type = 'percentage' } = await req.json();
    if (!name || rate === undefined) return badRequest('name dan rate wajib');
    const code = `TAX${Math.random().toString(36).slice(2,5).toUpperCase()}`;
    await query(
      `INSERT INTO tax_types (tax_code,name,rate,tax_type,description,is_active,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,1,0,NOW(),NOW())`,
      [code, name, rate, tax_type, description??null]
    );
    return created({ tax_code: code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { tax_code, name, rate, description, is_active } = await req.json();
    if (!tax_code) return badRequest('tax_code wajib');
    await query(
      `UPDATE tax_types SET name=?,rate=?,description=?,is_active=?,updated_at=NOW() WHERE tax_code=? AND is_deleted=0`,
      [name, rate, description??null, is_active??1, tax_code]
    );
    return ok({ tax_code });
  } catch (err) { return serverError(err); }
});
