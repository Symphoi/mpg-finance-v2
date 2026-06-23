import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'mpg_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = pathname.startsWith('/login')
    || pathname.startsWith('/api/auth')
    || pathname === '/api/system-settings';

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  // cuma cek EXISTENCE, jangan verify
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};