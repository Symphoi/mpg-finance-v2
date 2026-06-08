import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query, queryOne } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

async function createSettlementJournal(
  caCode: string,
  totalExpense: number,
  settCode: string,
  date: string,
  userName: string
) {
  try {
    // cash_advance rule: debit=1130 (Piutang CA Karyawan), credit=1110 (Kas)
    // For settlement: Debit Expense, Credit Piutang CA (reversal of the advance)
    const caRule: any = await queryOne(
      `SELECT debit_account_code FROM accounting_rules WHERE transaction_type='cash_advance' AND is_active=1 LIMIT 1`
    );
    const expRule: any = await queryOne(
      `SELECT debit_account_code FROM accounting_rules WHERE transaction_type='reimbursement' AND is_active=1 LIMIT 1`
    );

    const caAccount  = caRule?.debit_account_code  ?? '1130'; // Piutang Uang Muka Karyawan
    const expAccount = expRule?.debit_account_code ?? '5100'; // Beban Operasional

    const seq: any = await queryOne(
      `SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code='JNL' LIMIT 1`
    );
    const jnlNum = seq ? seq.next_number : 1;
    const jnlCode = seq
      ? `${seq.prefix}${String(jnlNum).padStart(5, '0')}`
      : `JNL-${String(jnlNum).padStart(5, '0')}`;
    const period = date.slice(0, 7);

    await query(
      `INSERT INTO journal_entries (journal_code,transaction_date,description,reference_type,reference_code,period_code,total_debit,total_credit,status,created_by)
       VALUES (?,?,?,?,?,?,?,?,'posted',?)`,
      [jnlCode, date, `CA Settlement: ${caCode} — ${settCode}`, 'cash_advance', settCode, period, totalExpense, totalExpense, userName]
    );

    const ts = Date.now();
    await query(
      `INSERT INTO journal_items (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description) VALUES (?,?,?,?,0,?)`,
      [`JNI-${ts}-1`, jnlCode, expAccount, totalExpense, `Beban dari CA ${caCode}`]
    );
    await query(
      `INSERT INTO journal_items (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description) VALUES (?,?,?,0,?,?)`,
      [`JNI-${ts}-2`, jnlCode, caAccount, totalExpense, `Penyelesaian CA ${caCode}`]
    );

    if (seq) {
      await query(`UPDATE numbering_sequences SET next_number=? WHERE sequence_code='JNL'`, [jnlNum + 1]);
    } else {
      await query(`INSERT INTO numbering_sequences (sequence_code,prefix,next_number) VALUES ('JNL','JNL-',2)`);
    }

    return jnlCode;
  } catch (err) {
    console.error('[CA Settlement Journal Error]', err);
    return null;
  }
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const caCode = url.searchParams.get('ca_code') ?? '';

    const conditions = ['cs.is_deleted=0'];
    const params: unknown[] = [];
    if (caCode) { conditions.push('cs.ca_code=?'); params.push(caCode); }
    const where = conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      query(`
        SELECT cs.*, ca.employee_name, ca.purpose, ca.total_amount AS ca_total,
               ca.used_amount, ca.remaining_amount, ca.status AS ca_status
        FROM ca_settlements cs
        LEFT JOIN cash_advances ca ON ca.ca_code = cs.ca_code
        WHERE ${where}
        ORDER BY cs.created_at DESC LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM ca_settlements cs WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ca_code, expense_items, remaining_action, notes, bank_account_code, attachment_url } = await req.json();
    if (!ca_code) return badRequest('ca_code wajib');
    if (!expense_items?.length) return badRequest('expense_items wajib diisi');

    const [caRow] = await query<any>(`SELECT * FROM cash_advances WHERE ca_code=? AND is_deleted=0`, [ca_code]);
    if (!caRow) return badRequest('CA tidak ditemukan');
    if (!['active','approved','partially_used'].includes(caRow.status)) {
      return badRequest('CA tidak dalam status yang bisa disettled');
    }

    const totalExpense = (expense_items as any[]).reduce((s: number, i: any) => s + Number(i.amount), 0);
    const usedAmount   = Number(caRow.used_amount) + totalExpense;
    const remaining    = Number(caRow.total_amount) - usedAmount;
    const settCode     = `SETT-${ca_code}-${Date.now()}`;
    const today        = new Date().toISOString().split('T')[0];

    // Mark CA as in_settlement while processing
    await query(`UPDATE cash_advances SET status='in_settlement', updated_at=NOW() WHERE ca_code=?`, [ca_code]);

    await query(`
      INSERT INTO ca_settlements
        (settlement_code, ca_code, total_expense, remaining_amount, remaining_action,
         notes, bank_account_code, attachment_url, settled_by, settled_by_code,
         settled_at, is_deleted, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),0,NOW(),NOW())
    `, [settCode, ca_code, totalExpense, remaining < 0 ? 0 : remaining,
        remaining_action ?? 'return', notes ?? null, bank_account_code ?? null,
        attachment_url ?? null, user.name, user.user_code]);

    for (const item of expense_items as any[]) {
      await query(`
        INSERT INTO ca_transactions
          (transaction_code, ca_code, transaction_date, description, amount,
           category, receipt_url, is_deleted, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,0,NOW(),NOW())
      `, [
        `CATX-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
        ca_code, item.date ?? today, item.description, item.amount,
        item.category ?? null, item.receipt_url ?? null,
      ]);
    }

    // Create journal entry for settlement
    const journalCode = await createSettlementJournal(ca_code, totalExpense, settCode, today, user.name);

    // Update CA to final status
    const newStatus = remaining <= 0 ? 'fully_used' : 'partially_used';
    await query(
      `UPDATE cash_advances SET used_amount=?, remaining_amount=?, status=?, updated_at=NOW() WHERE ca_code=?`,
      [usedAmount, Math.max(0, remaining), newStatus, ca_code]
    );

    return created({ settlement_code: settCode, total_expense: totalExpense, remaining, journal_code: journalCode });
  } catch (err) { return serverError(err); }
});
