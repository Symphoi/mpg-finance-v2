'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
const searchParams = useSearchParams();
const redirect = searchParams.get('redirect') || '/dashboard';
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Selamat datang, ${json.data.name}!`);
      // Force full page reload to ensure middleware sees the cookie
      setTimeout(() => {
        window.location.replace(redirect);
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a3c 0%,#2d1060 60%,#1e1358 100%)' }}>
      <div className="w-full max-w-[400px] p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }}>M</div>
          <div>
            <div className="text-white font-bold text-[18px]">MPG Finance</div>
            <div className="text-white/40 text-[11px]">v2.0 Management System</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h1 className="text-[18px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>Masuk</h1>
          <p className="text-[12.5px] mb-5" style={{ color: 'var(--color-text-muted)' }}>Masukkan email dan password Anda</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email" className="input" placeholder="email@mpg.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoFocus
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} className="input"
                  placeholder="••••••••" style={{ paddingRight: 40 }}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Memproses...' : <><LogIn size={14} /> Masuk</>}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-[11px] mt-5">MPG Finance © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
