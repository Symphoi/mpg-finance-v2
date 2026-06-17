// app/api/bank-reconciliations/[code]/items/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, notFound, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const code = req.url.split('/api/bank-reconciliations/')[1]?.split('/items')[0] ?? '';
    if (!code) return notFound('Kode rekonsiliasi tidak ditemukan');

    const items = await query(
      `SELECT id, source, transaction_date, reference_number, description,
              debit_amount, credit_amount, journal_code, match_status
       FROM bank_recon_items
       WHERE reconciliation_code = ?
       ORDER BY source, match_status, transaction_date`,
      [code],
    ) as any[];

    const matched       = items.filter(i => i.source === 'bank' && i.match_status === 'matched');
    const unmatched_bank = items.filter(i => i.source === 'bank' && i.match_status === 'unmatched');
    const unmatched_book = items.filter(i => i.source === 'book' && i.match_status === 'unmatched');

    return ok({ matched, unmatched_bank, unmatched_book });
  } catch (err) {
    return serverError(err);
  }
});
