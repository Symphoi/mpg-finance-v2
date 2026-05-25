// app/api/auth/login/route.ts — FIXED: uses role_code and permission_code not integer ids
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/app/lib/db';
import { signToken, setAuthCookie } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const user = await queryOne<{
      user_code: string; name: string; email: string; password_hash: string; status: string;
    }>(`SELECT user_code, name, email, password_hash, status FROM users WHERE email=? AND is_deleted=0 LIMIT 1`, [email]);

    if (!user || user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Email atau password salah' }, { status: 401 });
    }

    // Get roles using role_code (string), not integer id
    const roleRows = await query<{ role_code: string; name: string }>(
      `SELECT r.role_code, r.name
       FROM user_roles ur
       JOIN roles r ON r.role_code = ur.role_code AND r.is_deleted = 0
       WHERE ur.user_code = ? AND ur.is_deleted = 0`,
      [user.user_code]
    );

    // Get permissions using permission_code (string)
    const permRows = await query<{ permission_code: string }>(
      `SELECT DISTINCT p.permission_code
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.is_deleted = 0
       JOIN permissions p ON p.permission_code = rp.permission_code AND p.is_deleted = 0
       WHERE ur.user_code = ? AND ur.is_deleted = 0`,
      [user.user_code]
    );

    const roles       = (roleRows as any[]).map((r: any) => r.role_code);
    const roleNames   = (roleRows as any[]).map((r: any) => r.name);
    const permissions = (permRows as any[]).map((p: any) => p.permission_code);

    const token = signToken({
      user_code:   user.user_code,
      name:        user.name,
      email:       user.email,
      roles,
      permissions,
    });

    // Update last login
    await query(`UPDATE users SET last_login=NOW() WHERE user_code=?`, [user.user_code]);

    const res = NextResponse.json({
      success: true,
      data: {
        user_code:  user.user_code,
        name:       user.name,
        email:      user.email,
        roles,
        role_names: roleNames,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    console.error('[Login Error]', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
