// app/api/manual-journals/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'accounts') {
      const accounts = await query(`SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE is_active=1 ORDER BY account_type, account_code`);
      return ok(accounts);
    }

    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const from   = url.searchParams.get('from') ?? '';
    const to     = url.searchParams.get('to') ?? '';

    const conds = ['1=1'];
    const params: unknown[] = [];
    if (search) { conds.push('(mj.journal_code LIKE ? OR mj.description LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
    if (status && status !== 'all') { conds.push('mj.status=?'); params.push(status); }
    if (from)  { conds.push('DATE(mj.transaction_date)>=?'); params.push(from); }
    if (to)    { conds.push('DATE(mj.transaction_date)<=?'); params.push(to); }

    const where = conds.join(' AND ');
    const [journals, count] = await Promise.all([
      query(`SELECT mj.* FROM manual_journals mj WHERE ${where} ORDER BY mj.transaction_date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM manual_journals mj WHERE ${where}`, params),
    ]);

    // Get items for each journal
    const codes = (journals as any[]).map((j: any) => j.journal_code);
    const items = codes.length
      ? await query(`SELECT * FROM journal_items WHERE journal_code IN (${codes.map(()=>'?').join(',')})`, codes)
      : [];

    const itemMap: Record<string, any[]> = {};
    for (const item of items as any[]) {
      if (!itemMap[item.journal_code]) itemMap[item.journal_code] = [];
      itemMap[item.journal_code].push(item);
    }

    const result = (journals as any[]).map((j: any) => ({ ...j, items: itemMap[j.journal_code] ?? [] }));
    return paginated(result, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { description, transaction_date, reference, items } = await req.json();
    if (!description || !transaction_date || !items?.length) return badRequest('description, transaction_date, items wajib');

    const totalDebit  = (items as any[]).reduce((s: number, i: any) => s + (Number(i.debit_amount) || 0), 0);
    const totalCredit = (items as any[]).reduce((s: number, i: any) => s + (Number(i.credit_amount) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) return badRequest(`Debit (${totalDebit}) harus sama dengan Credit (${totalCredit})`);

    const code = `JRN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    await query(
      `INSERT INTO manual_journals (journal_code,description,transaction_date,reference,total_amount,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,'draft',?,NOW(),NOW())`,
      [code, description, transaction_date, reference??null, totalDebit, user.user_code]
    );

    for (let idx = 0; idx < (items as any[]).length; idx++) {
      const item = (items as any[])[idx];
      const itemCode = `JNI-${Date.now()}-${idx + 1}`;
      await query(
        `INSERT INTO journal_items (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description,created_at) VALUES (?,?,?,?,?,?,NOW())`,
        [itemCode, code, item.account_code, item.debit_amount??0, item.credit_amount??0, item.description??null]
      );
    }

    return created({ journal_code: code, total: totalDebit });
  } catch (err) { return serverError(err); }
});
