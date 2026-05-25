// app/lib/response.ts — Standardized API response helpers
import { NextResponse } from 'next/server';

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json({ success: false, error: message, ...(errors ? { errors } : {}) }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[API Error]', err);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
