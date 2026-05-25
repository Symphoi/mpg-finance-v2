'use client';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center px-6">
        <div className="text-[72px] font-bold leading-none mb-4" style={{
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          404
        </div>
        <h1 className="text-[22px] font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Halaman tidak ditemukan
        </h1>
        <p className="text-[13px] mb-8 max-w-[360px] mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="btn btn-outline"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <Link href="/dashboard" className="btn btn-primary">
            <Home size={14} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
