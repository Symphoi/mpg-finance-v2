// app/api/companies/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;

    const [rows, count] = await Promise.all([
      query(`SELECT * FROM companies WHERE is_deleted=0 ORDER BY name ASC LIMIT ? OFFSET ?`, [limit, offset]),
      query(`SELECT COUNT(*) AS total FROM companies WHERE is_deleted=0`),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { name, legal_name, industry, address, city, phone, email, tax_id } = body;
    if (!name?.trim()) return badRequest('Nama perusahaan wajib diisi');
    const code = `COMP${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(`INSERT INTO companies (company_code,name,legal_name,industry,address,city,phone,email,tax_id,status,is_active,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'active',1,0,NOW(),NOW())`,
      [code,name,legal_name??name,industry??null,address??null,city??null,phone??null,email??null,tax_id??null]);
    return created({ company_code: code });
  } catch (err) { return serverError(err); }
});
