// app/api/accounting-entries/post/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { ids } = await req.json() as { ids: number[] };
    if (!ids?.length) return badRequest('ids wajib');

    const placeholders = ids.map(() => '?').join(',');
    const entries = await query(
      `SELECT * FROM accounting_entries WHERE id IN (${placeholders}) AND status='draft'`,
      ids
    ) as any[];

    if (!entries.length) return badRequest('Tidak ada entry draft yang valid');

    const missing = entries.filter((e: any) => !e.dr_account_code || !e.cr_account_code);
    if (missing.length) {
      return badRequest(`${missing.length} entry belum memiliki Dr/Cr akun lengkap`);
    }

    const results: { entry_code: string; journal_code: string }[] = [];

    for (const entry of entries) {
      const year         = new Date(entry.entry_date).getFullYear();
      const ts           = Date.now().toString().slice(-7);
      const journal_code = `JRN-${year}-${ts}-${entry.id}`;
      const amount       = String(entry.amount);

      await query(
        `INSERT INTO manual_journals
           (journal_code,description,transaction_date,reference,total_amount,status,created_by,created_at,updated_at)
         VALUES (?,?,?,?,?,'posted',?,NOW(),NOW())`,
        [
          journal_code,
          entry.description || `${entry.entry_type} Entry — ${entry.entry_code}`,
          entry.entry_date,
          entry.reference || null,
          amount,
          user.user_code,
        ]
      );

      await query(
        `INSERT INTO journal_items
           (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description,created_at)
         VALUES (?,?,?,?,?,?,NOW())`,
        [`JNI-${ts}-${entry.id}-DR`, journal_code, entry.dr_account_code, amount, '0', entry.description || null]
      );

      await query(
        `INSERT INTO journal_items
           (journal_item_code,journal_code,account_code,debit_amount,credit_amount,description,created_at)
         VALUES (?,?,?,?,?,?,NOW())`,
        [`JNI-${ts}-${entry.id}-CR`, journal_code, entry.cr_account_code, '0', amount, entry.description || null]
      );

      await query(
        `UPDATE accounting_entries SET status='posted', journal_code=?, updated_at=NOW() WHERE id=?`,
        [journal_code, entry.id]
      );

      results.push({ entry_code: entry.entry_code, journal_code });
    }

    return ok({ posted: results.length, journals: results });
  } catch (err) { return serverError(err); }
});
