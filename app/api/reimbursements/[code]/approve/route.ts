import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

async function createReimburseJournal(
  code: string,
  totalAmount: number,
  userName: string
) {
  try {
    // reimbursement rule: Debit expense (5100), Credit Kas/Bank (1110)
    const rule: any = await queryOne(
      `SELECT debit_account_code, credit_account_code FROM accounting_rules WHERE transaction_type='reimbursement' AND is_active=1 LIMIT 1`
    );
    const expAccount  = rule?.debit_account_code  ?? '5100'; // Beban Reimburse
    const cashAccount = rule?.credit_account_code ?? '2110'; // Hutang Reimburse (liability)

    const seq: any = await queryOne(
      `SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code='JNL' LIMIT 1`
    );
    const jnlNum = seq ? seq.next_number : 1;
    const jnlCode = seq
      ? `${seq.prefix}${String(jnlNum).padStart(5, '0')}`
      : `JNL-${String(jnlNum).padStart(5, '0')}`;
    const today  = new Date().toISOString().split('T')[0];
    const period = today.slice(0, 7);

    await query(
      `INSERT INTO journal_entries (journal_code,transaction_date,description,reference_type,reference_code,period_code,total_debit,total_credit,status,created_by)
       VALUES (?,?,?,?,?,?,?,?,'posted',?)`,
      [jnlCode, today, `Reimbursement Disetujui: ${code}`, 'reimbursement', code, period, totalAmount, totalAmount, userName]
    );

    const ts = Date.now();
    await query(
      `INSERT INTO journal_items (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description) VALUES (?,?,?,?,0,?)`,
      [`JNI-${ts}-1`, jnlCode, expAccount, totalAmount, `Beban Reimburse ${code}`]
    );
    await query(
      `INSERT INTO journal_items (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description) VALUES (?,?,?,0,?,?)`,
      [`JNI-${ts}-2`, jnlCode, cashAccount, totalAmount, `Hutang Reimburse ${code}`]
    );

    if (seq) {
      await query(`UPDATE numbering_sequences SET next_number=? WHERE sequence_code='JNL'`, [jnlNum + 1]);
    } else {
      await query(`INSERT INTO numbering_sequences (sequence_code,prefix,next_number) VALUES ('JNL','JNL-',2)`);
    }

    return jnlCode;
  } catch (err) {
    console.error('[Reimburse Journal Error]', err);
    return null;
  }
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const code = req.nextUrl.pathname.split('/').at(-2);
    if (!code) return badRequest('Code tidak ditemukan');

    const reimburse: any = await queryOne(
      `SELECT status, total_amount FROM reimbursements WHERE reimbursement_code=? AND is_deleted=0`,
      [code]
    );
    if (!reimburse) return badRequest('Reimbursement tidak ditemukan');
    if (reimburse.status !== 'submitted') return badRequest('Hanya bisa approve reimbursement yang submitted');

    await query(
      `UPDATE reimbursements SET status='approved', approved_by_user_code=?, approved_by_user_name=?, approved_date=NOW(), updated_at=NOW() WHERE reimbursement_code=?`,
      [user.user_code, user.name, code]
    );

    const journalCode = await createReimburseJournal(code, Number(reimburse.total_amount), user.name);

    return ok({ reimbursement_code: code, new_status: 'approved', journal_code: journalCode });
  } catch (err) {
    return serverError(err);
  }
});
