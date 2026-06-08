// app/api/numbering-sequences/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const search = url.searchParams.get('search') ?? '';
    const conds  = ['1=1'];
    const params: unknown[] = [];
    if (search) { conds.push('(sequence_code LIKE ? OR prefix LIKE ? OR description LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    const rows = await query(`SELECT * FROM numbering_sequences WHERE ${conds.join(' AND ')} ORDER BY sequence_code ASC`, params);
    return ok(rows);
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { sequence_code, next_number, prefix } = await req.json();
    if (!sequence_code) return badRequest('sequence_code wajib');
    await query(
      `UPDATE numbering_sequences SET next_number=?,prefix=?,updated_at=NOW() WHERE sequence_code=?`,
      [next_number, prefix, sequence_code]
    );
    return ok({ sequence_code });
  } catch (err) { return serverError(err); }
});
