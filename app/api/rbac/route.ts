// app/api/rbac/route.ts — FIXED: all relations use code not integer id
import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, created, paginated, badRequest, serverError } from '@/app/lib/response';
import bcrypt from 'bcryptjs';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const url    = new URL(req.url);
    const type   = url.searchParams.get('type') ?? 'users';
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit  = Math.min(100, parseInt(url.searchParams.get('limit') ?? '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') ?? '';

    if (type === 'roles') {
      const roles = await query(`
        SELECT r.role_code, r.name, r.description, r.is_system_role,
               COUNT(ur.user_code) AS user_count
        FROM roles r
        LEFT JOIN user_roles ur ON ur.role_code = r.role_code AND ur.is_deleted = 0
        WHERE r.is_deleted = 0
        GROUP BY r.role_code ORDER BY r.name
      `);
      return ok(roles);
    }

    if (type === 'permissions') {
      const perms = await query(`
        SELECT permission_code, name, description, category, module, action
        FROM permissions WHERE is_deleted = 0 ORDER BY category, module, action
      `);
      return ok(perms);
    }

    if (type === 'role_permissions') {
      const roleCode = url.searchParams.get('role_code');
      if (!roleCode) return badRequest('role_code wajib');
      const perms = await query(`
        SELECT p.permission_code, p.name, p.category, p.module, p.action
        FROM role_permissions rp
        JOIN permissions p ON p.permission_code = rp.permission_code AND p.is_deleted = 0
        WHERE rp.role_code = ? AND rp.is_deleted = 0
      `, [roleCode]);
      return ok(perms);
    }

    // Default: users with their roles
    const conds = ['u.is_deleted=0'];
    const params: unknown[] = [];
    if (search) { conds.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`,`%${search}%`); }

    const where = conds.join(' AND ');
    const [users, count] = await Promise.all([
      query(`
        SELECT u.user_code, u.name, u.email, u.department, u.position, u.status, u.created_at,
               GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ', ') AS roles,
               GROUP_CONCAT(ur.role_code ORDER BY r.name SEPARATOR ',') AS role_codes
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_code = u.user_code AND ur.is_deleted = 0
        LEFT JOIN roles r ON r.role_code = ur.role_code AND r.is_deleted = 0
        WHERE ${where}
        GROUP BY u.user_code ORDER BY u.created_at DESC LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      query(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params),
    ]);
    return paginated(users, Number((count as any[])[0]?.total ?? 0), page, limit);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { action, ...body } = await req.json();

    if (action === 'create_user') {
      const { name, email, password, role_codes = [] } = body;
      if (!name || !email || !password) return badRequest('name, email, password wajib');
      if (password.length < 6) return badRequest('Password minimal 6 karakter');

      const existing = await query(`SELECT user_code FROM users WHERE email=? AND is_deleted=0`, [email]);
      if ((existing as any[]).length) return badRequest('Email sudah digunakan');

      const hash    = await bcrypt.hash(password, 10);
      const code    = `USR${Date.now().toString().slice(-6)}`;
      const now     = new Date().toISOString().split('T')[0];

      await query(
        `INSERT INTO users (user_code,name,email,password_hash,status,is_deleted,created_by,created_at,updated_at) VALUES (?,?,?,?,'active',0,?,NOW(),NOW())`,
        [code, name, email, hash, user.user_code]
      );

      // Assign roles using role_code (not integer id)
      for (const roleCode of role_codes as string[]) {
        const urCode = `UR-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        await query(
          `INSERT INTO user_roles (user_role_code,user_code,role_code,is_deleted,created_at,created_by,updated_at) VALUES (?,?,?,0,NOW(),?,NOW())`,
          [urCode, code, roleCode, user.user_code]
        );
      }
      return created({ user_code: code });
    }

    if (action === 'create_role') {
      const { name, description, permission_codes = [] } = body;
      if (!name) return badRequest('Nama role wajib');
      const roleCode = `ROLE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      await query(
        `INSERT INTO roles (role_code,name,description,is_system_role,is_deleted,created_by,created_at,updated_at) VALUES (?,?,?,0,0,?,NOW(),NOW())`,
        [roleCode, name, description??null, user.user_code]
      );
      for (const permCode of permission_codes as string[]) {
        const rpCode = `${roleCode}_${permCode}`;
        await query(
          `INSERT INTO role_permissions (role_permission_code,role_code,permission_code,is_deleted,created_at,created_by,updated_at) VALUES (?,?,?,0,NOW(),?,NOW())`,
          [rpCode, roleCode, permCode, user.user_code]
        );
      }
      return created({ role_code: roleCode });
    }

    if (action === 'update_role_permissions') {
      const { role_code, permission_codes = [] } = body;
      if (!role_code) return badRequest('role_code wajib');
      // Soft delete existing
      await query(`UPDATE role_permissions SET is_deleted=1,updated_at=NOW() WHERE role_code=?`, [role_code]);
      // Re-insert
      for (const permCode of permission_codes as string[]) {
        const rpCode = `${role_code}_${permCode}`;
        await query(
          `INSERT INTO role_permissions (role_permission_code,role_code,permission_code,is_deleted,created_at,created_by,updated_at) VALUES (?,?,?,0,NOW(),?,NOW())
           ON DUPLICATE KEY UPDATE is_deleted=0,updated_at=NOW()`,
          [rpCode, role_code, permCode, user.user_code]
        );
      }
      return ok({ role_code, updated: permission_codes.length });
    }

    if (action === 'assign_role') {
      const { user_code, role_code } = body;
      if (!user_code || !role_code) return badRequest('user_code dan role_code wajib');
      const urCode = `UR-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      await query(
        `INSERT INTO user_roles (user_role_code,user_code,role_code,is_deleted,created_at,created_by,updated_at) VALUES (?,?,?,0,NOW(),?,NOW())
         ON DUPLICATE KEY UPDATE is_deleted=0,updated_at=NOW()`,
        [urCode, user_code, role_code, user.user_code]
      );
      return ok({ user_code, role_code });
    }

    if (action === 'remove_role') {
      const { user_code, role_code } = body;
      await query(`UPDATE user_roles SET is_deleted=1,updated_at=NOW() WHERE user_code=? AND role_code=?`, [user_code, role_code]);
      return ok({ user_code, role_code });
    }

    if (action === 'toggle_status') {
      const { user_code, status } = body;
      await query(`UPDATE users SET status=?,updated_by=?,updated_at=NOW() WHERE user_code=?`, [status, user.user_code, user_code]);
      return ok({ user_code, status });
    }

    if (action === 'reset_password') {
      const { user_code, new_password } = body;
      if (!new_password || new_password.length < 6) return badRequest('Password minimal 6 karakter');
      const hash = await bcrypt.hash(new_password, 10);
      await query(`UPDATE users SET password_hash=?,updated_by=?,updated_at=NOW() WHERE user_code=?`, [hash, user.user_code, user_code]);
      return ok({ user_code });
    }

    return badRequest('Action tidak dikenal');
  } catch (err) { return serverError(err); }
});
