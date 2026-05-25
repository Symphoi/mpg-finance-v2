// app/api/accounting-rules/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url  = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const txType = url.searchParams.get('transaction_type') ?? '';

    const conds = ['ar.is_active=1'];
    const params: unknown[] = [];
    if (search) { conds.push('(ar.rule_code LIKE ? OR ar.rule_name LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
    if (txType) { conds.push('ar.transaction_type=?'); params.push(txType); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`
        SELECT ar.*,
               d.account_name AS debit_account_name,
               c.account_name AS credit_account_name
        FROM accounting_rules ar
        LEFT JOIN chart_of_accounts d ON d.account_code=ar.debit_account_code
        LEFT JOIN chart_of_accounts c ON c.account_code=ar.credit_account_code
        WHERE ${where} ORDER BY ar.transaction_type, ar.rule_name LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM accounting_rules ar WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { rule_name, description, transaction_type, debit_account_code, credit_account_code } = await req.json();
    if (!rule_name || !transaction_type || !debit_account_code || !credit_account_code)
      return badRequest('rule_name, transaction_type, debit_account_code, credit_account_code wajib');
    const code = `RULE${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(
      `INSERT INTO accounting_rules (rule_code,rule_name,description,transaction_type,debit_account_code,credit_account_code,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,NOW(),NOW())`,
      [code, rule_name, description??null, transaction_type, debit_account_code, credit_account_code]
    );
    return created({ rule_code: code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { rule_code, rule_name, description, transaction_type, debit_account_code, credit_account_code, is_active } = await req.json();
    if (!rule_code) return badRequest('rule_code wajib');
    await query(
      `UPDATE accounting_rules SET rule_name=?,description=?,transaction_type=?,debit_account_code=?,credit_account_code=?,is_active=?,updated_at=NOW() WHERE rule_code=?`,
      [rule_name, description??null, transaction_type, debit_account_code, credit_account_code, is_active??1, rule_code]
    );
    return ok({ rule_code });
  } catch (err) { return serverError(err); }
});
