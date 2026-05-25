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
    if (search) { conds.push('(document_type LIKE ? OR prefix LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }
    const rows = await query(`SELECT * FROM numbering_sequences WHERE ${conds.join(' AND ')} ORDER BY document_type ASC`, params);
    return ok(rows);
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { document_type, current_value, prefix, is_active } = await req.json();
    if (!document_type) return badRequest('document_type wajib');
    await query(
      `UPDATE numbering_sequences SET current_value=?,prefix=?,is_active=?,updated_at=NOW() WHERE document_type=?`,
      [current_value, prefix, is_active??1, document_type]
    );
    return ok({ document_type });
  } catch (err) { return serverError(err); }
});
