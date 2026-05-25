// app/api/projects/route.ts
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';

    const conds = ['p.is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conds.push('(p.project_code LIKE ? OR p.name LIKE ? OR p.client_name LIKE ?)'); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (status && status !== 'all') { conds.push('p.status=?'); params.push(status); }

    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      query(`SELECT p.*, c.name AS company_name FROM projects p LEFT JOIN companies c ON c.company_code=p.company_code WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM projects p WHERE ${where}`, params),
    ]);
    return paginated(rows, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, description, client_name, company_code, start_date, end_date, budget, status='active' } = await req.json();
    if (!name?.trim()) return badRequest('Nama project wajib diisi');
    const code = `PROJ${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await query(
      `INSERT INTO projects (project_code,name,description,client_name,company_code,start_date,end_date,budget,status,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,NOW(),NOW())`,
      [code, name, description??null, client_name??null, company_code??null, start_date??null, end_date??null, budget??null, status]
    );
    return created({ project_code: code });
  } catch (err) { return serverError(err); }
});

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const { project_code, name, description, client_name, company_code, start_date, end_date, budget, status } = await req.json();
    if (!project_code) return badRequest('project_code wajib');
    await query(
      `UPDATE projects SET name=?,description=?,client_name=?,company_code=?,start_date=?,end_date=?,budget=?,status=?,updated_at=NOW() WHERE project_code=? AND is_deleted=0`,
      [name, description??null, client_name??null, company_code??null, start_date??null, end_date??null, budget??null, status, project_code]
    );
    return ok({ project_code });
  } catch (err) { return serverError(err); }
});
