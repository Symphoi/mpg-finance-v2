// app/api/companies/logo/route.ts
// FIXED: This endpoint was called in v1 but didn't exist → 404. Now it exists.
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, badRequest, serverError } from '@/app/lib/response';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData    = await req.formData();
    const file        = formData.get('file') as File | null;
    const companyCode = formData.get('company_code') as string | null;

    if (!file || !companyCode) return badRequest('file dan company_code wajib');

    const allowed = ['image/jpeg','image/png','image/webp','image/svg+xml'];
    if (!allowed.includes(file.type)) return badRequest('Format tidak didukung. Gunakan JPG, PNG, WEBP, atau SVG');
    if (file.size > 5 * 1024 * 1024)  return badRequest('Ukuran logo max 5MB');

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext    = path.extname(file.name) || '.png';
    const fname  = `logo_${companyCode}_${Date.now()}${ext}`;
    const dir    = path.join(process.cwd(), 'public', 'uploads', 'logos');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fname), buffer);

    const logoUrl = `/uploads/logos/${fname}`;
    await query(`UPDATE companies SET logo_url=?, updated_at=NOW() WHERE company_code=?`, [logoUrl, companyCode]);

    return ok({ logo_url: logoUrl });
  } catch (err) { return serverError(err); }
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url  = new URL(req.url);
    const code = url.searchParams.get('company_code');
    if (!code) return badRequest('company_code wajib');
    const rows = await query<{ logo_url: string }>(`SELECT logo_url FROM companies WHERE company_code=? AND is_deleted=0`, [code]);
    return ok({ logo_url: (rows as any[])[0]?.logo_url ?? null });
  } catch (err) { return serverError(err); }
});
