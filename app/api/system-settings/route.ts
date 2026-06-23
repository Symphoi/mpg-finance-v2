// app/api/system-settings/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuth } from '@/app/lib/auth';
import { query } from '@/app/lib/db';
import { ok, serverError } from '@/app/lib/response';
import { NextResponse } from 'next/server';

const DEFAULTS: Record<string, { value: string; type: string; label: string }> = {
  app_name:      { value: 'Finance',              type: 'text',  label: 'Nama Aplikasi' },
  app_subtitle:  { value: 'v2.0 Management System',   type: 'text',  label: 'Subtitle' },
  logo_url:      { value: '',                          type: 'image', label: 'Logo' },
  login_bg_url:  { value: '',                          type: 'image', label: 'Background Login' },
  primary_color: { value: '#7c3aed',                  type: 'color', label: 'Warna Primary' },
  sidebar_color: { value: '#0f0a1e',                  type: 'color', label: 'Warna Sidebar' },
};

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      setting_key   VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT         DEFAULT NULL,
      setting_type  ENUM('text','color','image') DEFAULT 'text',
      label         VARCHAR(150),
      updated_by    VARCHAR(50),
      updated_at    DATETIME DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed defaults if table is empty
  for (const [key, def] of Object.entries(DEFAULTS)) {
    await query(
      `INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, label)
       VALUES (?, ?, ?, ?)`,
      [key, def.value, def.type, def.label]
    );
  }
}

function buildSettingsMap(rows: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, def] of Object.entries(DEFAULTS)) {
    map[key] = def.value;
  }
  for (const row of rows) {
    map[row.setting_key] = row.setting_value ?? '';
  }
  return map;
}

// GET — public, no auth required
export async function GET() {
  try {
    await ensureTable();
    const rows = await query(`SELECT setting_key, setting_value FROM system_settings`) as any[];
    return NextResponse.json(
      { success: true, data: buildSettingsMap(rows) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Gagal memuat settings' }, { status: 500 });
  }
}

// POST — requires auth
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureTable();
    const body = await req.json() as Record<string, string>;

    for (const [key, value] of Object.entries(body)) {
      if (!DEFAULTS[key]) continue; // ignore unknown keys
      await query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_by=VALUES(updated_by), updated_at=NOW()`,
        [key, value ?? '', user.user_code]
      );
    }

    const rows = await query(`SELECT setting_key, setting_value FROM system_settings`) as any[];
    return ok(buildSettingsMap(rows));
  } catch (err) {
    return serverError(err);
  }
});
