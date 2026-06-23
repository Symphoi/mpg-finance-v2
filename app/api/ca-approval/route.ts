// app/api/ca-approval/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, paginated, badRequest, serverError } from '@/app/lib/response';

async function createCADisbursementJournal(caCode: string, amount: number, userName: string) {
  const rule: any = await queryOne(
    `SELECT debit_account_code, credit_account_code FROM accounting_rules WHERE transaction_type='cash_advance' AND is_active=1 LIMIT 1`
  );
  const caAccount   = rule?.debit_account_code  ?? '1130';
  const cashAccount = rule?.credit_account_code ?? '1110';

  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq: any = await queryOne(`SELECT next_number FROM numbering_sequences WHERE sequence_code='JNL' LIMIT 1`);
  const nextNum   = seq?.next_number ?? 1;
  const jnlCode   = `JNL-${ym}-${String(nextNum).padStart(4, '0')}`;

  await query(
    `INSERT INTO journal_entries (journal_code, transaction_date, description, reference_type, reference_code, total_debit, total_credit, status, created_by)
     VALUES (?, NOW(), ?, 'cash_advance', ?, ?, ?, 'posted', ?)`,
    [jnlCode, `CA Disbursement — ${caCode}`, caCode, amount, amount, userName]
  );

  const ts = Date.now();
  await query(
    `INSERT INTO journal_items (journal_item_code, journal_code, account_code, description, debit_amount, credit_amount)
     VALUES (?,?,?,?,?,0),(?,?,?,?,0,?)`,
    [
      `JNI-${ts}-1`, jnlCode, caAccount,   `CA Disbursement ${caCode}`, amount,
      `JNI-${ts}-2`, jnlCode, cashAccount, `CA Disbursement ${caCode}`, amount,
    ]
  );

  if (seq) {
    await query(`UPDATE numbering_sequences SET next_number=next_number+1 WHERE sequence_code='JNL'`);
  } else {
    await query(
      `INSERT INTO numbering_sequences (sequence_code, prefix, next_number, description) VALUES ('JNL','JNL',2,'Journal Entry')
       ON DUPLICATE KEY UPDATE next_number=next_number+1`
    );
  }

  return jnlCode;
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') ?? 'submitted';

    const conditions = ['is_deleted=0'];
    const params: unknown[] = [];
    if (status) { conditions.push('status=?'); params.push(status); }
    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM cash_advances WHERE ${where} ORDER BY created_at ASC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM cash_advances WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ca_code, action, rejection_reason } = await req.json();
    if (!ca_code || !action) return badRequest('ca_code dan action wajib');

    if (action === 'approve') {
      await query(
        `UPDATE cash_advances SET status='approved', approved_by=?, approved_date=NOW(), updated_at=NOW() WHERE ca_code=? AND is_deleted=0`,
        [user.name, ca_code]
      );
      return ok({ ca_code, new_status: 'approved' });
    }

    if (action === 'reject') {
      if (!rejection_reason?.trim()) return badRequest('Alasan penolakan wajib');
      await query(
        `UPDATE cash_advances SET status='rejected', rejection_reason=?, updated_at=NOW() WHERE ca_code=? AND is_deleted=0`,
        [rejection_reason, ca_code]
      );
      return ok({ ca_code, new_status: 'rejected' });
    }

    if (action === 'activate') {
      const ca: any = await queryOne(
        `SELECT total_amount FROM cash_advances WHERE ca_code=? AND status='approved' AND is_deleted=0`,
        [ca_code]
      );
      if (!ca) return badRequest('CA tidak ditemukan atau status bukan approved');

      await query(
        `UPDATE cash_advances SET status='active', updated_at=NOW() WHERE ca_code=? AND status='approved' AND is_deleted=0`,
        [ca_code]
      );

      const jnlCode = await createCADisbursementJournal(ca_code, Number(ca.total_amount), user.name);
      return ok({ ca_code, new_status: 'active', journal_code: jnlCode });
    }

    return badRequest('Action tidak valid. Gunakan: approve, reject, activate');
  } catch (err) { return serverError(err); }
});
