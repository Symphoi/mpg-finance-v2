// app/lib/auth.ts — MPG Finance v2
// Auth uses httpOnly cookie (not localStorage) — XSS safe
// All role/permission references use code strings, not integer ids
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET  = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';
const COOKIE_NAME = 'mpg_token';

export interface JwtPayload {
  user_code:   string;
  name:        string;
  email:       string;
  roles:       string[];   // role_codes e.g. ['ADMIN', 'ROLE-2026-0001']
  permissions: string[];   // permission_codes e.g. ['SALES_ORDER_CREATE']
  iat?:        number;
  exp?:        number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function withAuth(
  handler: (req: NextRequest, user: JwtPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user  = verifyToken(token);
    if (!user)  return NextResponse.json({ error: 'Token invalid or expired' }, { status: 401 });
    return handler(req, user);
  };
}

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   false,
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
}

/** Check permission by permission_code string (e.g. 'SALES_ORDER_CREATE') */
export function hasPermission(user: JwtPayload, permissionCode: string): boolean {
  return (
    user.roles.includes('ADMIN') ||
    user.permissions.includes(permissionCode)
  );
}

/** Check if user has a specific role by role_code */
export function hasRole(user: JwtPayload, roleCode: string): boolean {
  return user.roles.includes(roleCode);
}

export { COOKIE_NAME };
