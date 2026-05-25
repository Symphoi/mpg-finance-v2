// app/api/cash-advances/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'dropdowns') {
      const [projects, bankAccounts] = await Promise.all([
        query(`SELECT project_code, name FROM projects WHERE is_deleted=0 ORDER BY name ASC`),
        query(`SELECT account_code, bank_name, account_number, account_holder FROM bank_accounts
               WHERE is_deleted=0 AND is_active=1 ORDER BY bank_name ASC`),
      ]);
      return ok({ projects, bankAccounts });
    }

    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';

    const conditions: string[] = ['is_deleted = 0'];
    const params: unknown[]    = [];

    if (search) {
      conditions.push('(ca_code LIKE ? OR employee_name LIKE ? OR purpose LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const where = conditions.join(' AND ');
    const [rows, countRows] = await Promise.all([
      query(`SELECT * FROM cash_advances WHERE ${where}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM cash_advances WHERE ${where}`, params),
    ]);

    return paginated(rows, Number((countRows as any[])[0]?.total ?? 0), page, limit);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { employee_name, department = '-', purpose, total_amount,
            project_code, bank_account_code, notes, document_urls } = body;

    if (!employee_name || !purpose || !total_amount) {
      return badRequest('employee_name, purpose, total_amount wajib diisi');
    }

    const seq = await queryOne<{ current_value: number }>(
      `SELECT * FROM numbering_sequences WHERE document_type='cash_advance' AND is_active=1 LIMIT 1`
    );
    const now     = new Date();
    const ym      = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
    const nextNum = (seq?.current_value ?? 0) + 1;
    const caCode  = `CA-${ym}-${String(nextNum).padStart(4, '0')}`;

    await query(`
      INSERT INTO cash_advances
        (ca_code, employee_name, department, purpose, total_amount, used_amount, remaining_amount,
         status, request_date, project_code, bank_account_code, notes, document_urls,
         created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,0,?,'submitted',?,?,?,?,?,?,NOW(),NOW())
    `, [caCode, employee_name, department, purpose, total_amount, total_amount,
        now.toISOString().split('T')[0], project_code ?? null,
        bank_account_code ?? null, notes ?? null,
        document_urls ? JSON.stringify(document_urls) : null, user.user_code]);

    if (seq) {
      await query(`UPDATE numbering_sequences SET current_value=? WHERE document_type='cash_advance'`, [nextNum]);
    }

    return created({ ca_code: caCode });
  } catch (err) {
    return serverError(err);
  }
});
