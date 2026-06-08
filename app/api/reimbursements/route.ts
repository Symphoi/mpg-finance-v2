// app/api/reimbursements/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'dropdowns') {
      const [categories, projects, bankAccounts] = await Promise.all([
        query(`SELECT category_code, name FROM reimbursement_categories WHERE is_deleted=0 ORDER BY name`),
        query(`SELECT project_code, name FROM projects WHERE is_deleted=0 ORDER BY name`),
        query(`SELECT account_code, bank_name, account_number, account_holder FROM bank_accounts
               WHERE is_deleted=0 AND is_active=1 ORDER BY bank_name`),
      ]);
      return ok({ categories, projects, bankAccounts });
    }

    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';

    const conditions: string[] = ['r.is_deleted = 0'];
    const params: unknown[]    = [];

    if (search) {
      conditions.push('(r.reimbursement_code LIKE ? OR r.title LIKE ? OR r.submitted_by_user_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { conditions.push('r.status = ?'); params.push(status); }

    const where = conditions.join(' AND ');
    const [rows, countRows] = await Promise.all([
      query(`
        SELECT r.*, rc.name AS category_name,
               (SELECT COUNT(*) FROM reimbursement_items ri WHERE ri.reimbursement_code=r.reimbursement_code AND ri.is_deleted=0) AS item_count
        FROM reimbursements r
        LEFT JOIN reimbursement_categories rc ON rc.category_code = r.category_code
        WHERE ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM reimbursements r WHERE ${where}`, params),
    ]);

    return paginated(rows, Number((countRows as any[])[0]?.total ?? 0), page, limit);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { title, notes, category_code, project_code, bank_account_code,
            items, supporting_documents, company_id } = body;

    if (!title || !items?.length) return badRequest('title dan items wajib diisi');

    const seq: any = await queryOne(
      `SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = 'REIMB' LIMIT 1`
    );
    const now     = new Date();
    const year    = now.getFullYear();
    const nextNum = seq ? seq.next_number : 1;
    const reimCode = `REIMB-${year}-${String(nextNum).padStart(4, '0')}`;

    const totalAmount = (items as any[]).reduce((s: number, i: any) => s + Number(i.amount), 0);

    await query(`
      INSERT INTO reimbursements
        (reimbursement_code, title, notes, submitted_by_user_name,
         created_by_user_code, created_by_user_name,
         category_code, project_code, total_amount, status,
         submitted_date, submitted_time, bank_account_code,
         supporting_documents, company_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,'submitted',?,?,?,?,?,NOW(),NOW())
    `, [reimCode, title, notes ?? null, user.name,
        user.user_code, user.name,
        category_code ?? null, project_code ?? null, totalAmount,
        now.toISOString().split('T')[0],
        now.toTimeString().split(' ')[0],
        bank_account_code ?? null,
        supporting_documents ? JSON.stringify(supporting_documents) : null,
        company_id ?? null]);

    for (const item of items as any[]) {
      await query(`
        INSERT INTO reimbursement_items
          (item_code, reimbursement_code, item_date, description, amount, attachment_path, created_at)
        VALUES (?,?,?,?,?,?,NOW())
      `, [
        `RI-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
        reimCode, item.item_date, item.description,
        item.amount, item.attachment_path ?? null,
      ]);
    }

    if (seq) {
      await query(`UPDATE numbering_sequences SET next_number=? WHERE sequence_code='REIMB'`, [nextNum + 1]);
    } else {
      await query(`INSERT INTO numbering_sequences (sequence_code, prefix, next_number, description) VALUES ('REIMB','REIMB',2,'Reimbursement')`);
    }

    return created({ reimbursement_code: reimCode, total_amount: totalAmount });
  } catch (err) {
    return serverError(err);
  }
});
