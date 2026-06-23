import { Suspense } from 'react';
import { query } from '@/app/lib/db';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  app_name:     'Finance',
  app_subtitle: 'v2.0 Management System',
  logo_url:     '',
  login_bg_url: '',
};

async function getSettings() {
  try {
    const rows = await query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('app_name','app_subtitle','logo_url','login_bg_url')`
    ) as { setting_key: string; setting_value: string }[];

    const map: Record<string, string> = {};
    for (const row of rows) map[row.setting_key] = row.setting_value ?? '';
    return { ...DEFAULTS, ...map };
  } catch {
    return DEFAULTS;
  }
}

export default async function LoginPage() {
  const site = await getSettings();
  return (
    <Suspense>
      <LoginForm site={site} />
    </Suspense>
  );
}
