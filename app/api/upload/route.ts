// app/api/upload/route.ts
// FIXED: was named routes.js in v1 — Next.js App Router requires route.js/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const folder   = (formData.get('folder') as string) ?? 'uploads';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'File type not allowed. Use JPG, PNG, WEBP, or PDF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Max 10MB' }, { status: 400 });
    }

    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const ext      = path.extname(file.name) || '.bin';
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2,10)}${ext}`;
    const dir      = path.join(process.cwd(), 'public', 'uploads', folder);

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), buffer);

    const url = `/uploads/${folder}/${safeName}`;
    return NextResponse.json({ success: true, data: { url, filename: file.name, size: file.size } });
  } catch (err) {
    console.error('[Upload Error]', err);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
});
