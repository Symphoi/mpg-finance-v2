// app/api/chart-of-accounts/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url        = new URL(req.url);
    const page       = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit      = Math.min(200, parseInt(url.searchParams.get('limit') ?? '50'));
    const offset     = (page - 1) * limit;
    const search     = url.searchParams.get('search') ?? '';
    const type       = url.searchParams.get('type') ?? '';
    const category   = url.searchParams.get('category') ?? '';
    const isActive   = url.searchParams.get('is_active');
    const showAll    = url.searchParams.get('show_inactive') === 'true';

    const conds: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conds.push('(account_code LIKE ? OR account_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (type)     { conds.push('account_type=?');     params.push(type); }
    if (category) { conds.push('category=?');          params.push(category); }
    if (!showAll) { conds.push('is_active=1'); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM chart_of_accounts ${where} ORDER BY account_code ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM chart_of_accounts ${where}`, params),
    ]);

    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { account_code, account_name, account_type, parent_account_code, category, description } = await req.json();
    if (!account_code || !account_name || !account_type) return badRequest('account_code, account_name, account_type wajib');

    await query(
      `INSERT INTO chart_of_accounts (account_code,account_name,account_type,parent_account_code,category,description,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,NOW(),NOW())`,
      [account_code, account_name, account_type, parent_account_code??null, category??null, description??null]
    );
    return created({ account_code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { account_code, account_name, account_type, parent_account_code, category, description, is_active } = await req.json();
    if (!account_code) return badRequest('account_code wajib');
    await query(
      `UPDATE chart_of_accounts SET account_name=?,account_type=?,parent_account_code=?,category=?,description=?,is_active=?,updated_at=NOW() WHERE account_code=?`,
      [account_name, account_type, parent_account_code??null, category??null, description??null, is_active??1, account_code]
    );
    return ok({ account_code });
  } catch (err) { return serverError(err); }
});
