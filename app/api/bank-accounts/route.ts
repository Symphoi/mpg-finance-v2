// app/api/bank-accounts/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';

    const conditions = ['ba.is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conditions.push('(ba.bank_name LIKE ? OR ba.account_number LIKE ? OR ba.account_holder LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }

    const where = conditions.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT ba.*, c.name AS company_name FROM bank_accounts ba LEFT JOIN companies c ON ba.company_code = c.company_code WHERE ${where} ORDER BY ba.bank_name ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM bank_accounts ba WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { bank_name, account_number, account_holder, branch, currency='IDR', description } = await req.json();
    if (!bank_name || !account_number || !account_holder) return badRequest('bank_name, account_number, account_holder wajib diisi');
    const code = `BNK${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(`INSERT INTO bank_accounts (account_code,bank_name,account_number,account_holder,branch,currency,description,is_active,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,0,NOW(),NOW())`,
      [code,bank_name,account_number,account_holder,branch??null,currency,description??null]);
    return created({ account_code: code });
  } catch (err) { return serverError(err); }
});
