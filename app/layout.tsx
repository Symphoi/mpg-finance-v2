// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { query } from '@/app/lib/db';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rows = await query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('app_name','app_subtitle')`
    ) as { setting_key: string; setting_value: string }[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.setting_key] = r.setting_value ?? '';
    const name = map.app_name || 'Finance';
    const sub  = map.app_subtitle || 'Management System';
    return { title: name, description: `${name} — ${sub}` };
  } catch {
    return { title: 'Finance', description: 'Finance Management System' };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
