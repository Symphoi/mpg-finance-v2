  import { cookies } from 'next/headers';
  import { redirect } from 'next/navigation';
  import { verifyToken, COOKIE_NAME } from '@/app/lib/auth';

  import Sidebar from '@/components/Sidebar';
  import Topbar from '@/components/Topbar';
  import { SettingsProvider } from '@/contexts/SettingsContext';

  export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token || !verifyToken(token)) {
      redirect('/login');
    }

    return (
      <SettingsProvider>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Topbar />
            <main className="page-body">{children}</main>
          </div>
        </div>
      </SettingsProvider>
    );
  }