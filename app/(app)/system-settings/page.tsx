'use client';
import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Upload, RotateCcw, Save, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface FormState {
  app_name:      string;
  app_subtitle:  string;
  logo_url:      string;
  login_bg_url:  string;
  primary_color: string;
  sidebar_color: string;
}

const DEFAULTS: FormState = {
  app_name:      'Finance',
  app_subtitle:  'v2.0 Management System',
  logo_url:      '',
  login_bg_url:  '',
  primary_color: '#7c3aed',
  sidebar_color: '#0f0a1e',
};

export default function SystemSettingsPage() {
  const { settings, reload } = useSettings();
  const [form, setForm]       = useState<FormState>(DEFAULTS);
  const [saving, setSaving]   = useState(false);
  const logoRef               = useRef<HTMLInputElement>(null);
  const bgRef                 = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg,   setUploadingBg]   = useState(false);

  useEffect(() => {
    setForm({
      app_name:      settings.app_name,
      app_subtitle:  settings.app_subtitle,
      logo_url:      settings.logo_url,
      login_bg_url:  settings.login_bg_url,
      primary_color: settings.primary_color,
      sidebar_color: settings.sidebar_color,
    });
  }, [settings]);

  const set = (key: keyof FormState, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const uploadFile = async (
    file: File,
    key: 'logo_url' | 'login_bg_url',
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'system');
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
      const j   = await res.json();
      if (!j.success) { toast.error(j.error); return; }
      set(key, j.data.url);
      toast.success('File diupload');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.success) { toast.error(j.error); return; }
      await reload();
      toast.success('Settings disimpan');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setForm(DEFAULTS);
    toast.info('Form direset ke default — klik Simpan untuk apply');
  };

  return (
    <div className="space-y-6 max-w-[720px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>System Settings</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Konfigurasi nama, logo, tampilan login, dan warna tema aplikasi
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={resetDefaults}>
            <RotateCcw size={13} /> Reset Default
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Section 1 — Branding */}
      <div className="card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>Branding</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Nama Aplikasi</label>
            <input className="input w-full" value={form.app_name}
              onChange={e => set('app_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Subtitle</label>
            <input className="input w-full" value={form.app_subtitle}
              onChange={e => set('app_subtitle', e.target.value)} />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Logo</label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="w-14 h-14 rounded-[12px] flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: form.logo_url ? '#f1f5f9' : 'linear-gradient(135deg,#a855f7,#6366f1)' }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-white font-bold text-xl">{(form.app_name?.[0] ?? 'M').toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 space-y-2">
              <input className="input w-full" placeholder="URL logo (https://... atau /uploads/...)"
                value={form.logo_url} onChange={e => set('logo_url', e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" disabled={uploadingLogo}
                  onClick={() => logoRef.current?.click()}>
                  <Upload size={12} /> {uploadingLogo ? 'Uploading...' : 'Upload Gambar'}
                </button>
                {form.logo_url && (
                  <button className="btn btn-outline btn-sm" onClick={() => set('logo_url', '')}>
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'logo_url', setUploadingLogo); e.target.value = ''; }} />
        </div>
      </div>

      {/* Section 2 — Background Login */}
      <div className="card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>Halaman Login</h2>

        <div className="space-y-2">
          <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Background Login</label>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="w-32 h-20 rounded-[8px] flex-shrink-0 overflow-hidden border"
              style={{
                borderColor: 'var(--color-border)',
                background: form.login_bg_url
                  ? `url(${form.login_bg_url}) center/cover`
                  : 'linear-gradient(135deg,#1a0a3c 0%,#2d1060 60%,#1e1358 100%)',
              }}>
              {!form.login_bg_url && (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={20} className="text-white/30" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input className="input w-full" placeholder="URL background (https://... atau /uploads/...)"
                value={form.login_bg_url} onChange={e => set('login_bg_url', e.target.value)} />
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" disabled={uploadingBg}
                  onClick={() => bgRef.current?.click()}>
                  <Upload size={12} /> {uploadingBg ? 'Uploading...' : 'Upload Gambar'}
                </button>
                {form.login_bg_url && (
                  <button className="btn btn-outline btn-sm" onClick={() => set('login_bg_url', '')}>
                    Hapus (pakai default)
                  </button>
                )}
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Jika kosong, akan menggunakan gradient ungu default.
              </p>
            </div>
          </div>
          <input ref={bgRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'login_bg_url', setUploadingBg); e.target.value = ''; }} />
        </div>
      </div>

      {/* Section 3 — Warna Tema */}
      <div className="card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>Warna Tema</h2>
        <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          Perubahan warna berlaku di seluruh aplikasi setelah disimpan.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Warna Primary
              <span className="ml-1 font-normal">(tombol, badge, aksen)</span>
            </label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0.5"
                style={{ background: 'none' }} />
              <input className="input flex-1 font-mono" placeholder="#7c3aed"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)} />
            </div>
            <div className="h-6 rounded-[6px]" style={{ background: form.primary_color }} />
          </div>

          {/* Sidebar Color */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Warna Sidebar
              <span className="ml-1 font-normal">(background sidebar)</span>
            </label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.sidebar_color}
                onChange={e => set('sidebar_color', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0.5"
                style={{ background: 'none' }} />
              <input className="input flex-1 font-mono" placeholder="#0f0a1e"
                value={form.sidebar_color}
                onChange={e => set('sidebar_color', e.target.value)} />
            </div>
            <div className="h-6 rounded-[6px]" style={{ background: form.sidebar_color }} />
          </div>
        </div>
      </div>

      {/* Live Preview note */}
      <p className="text-[11px] text-center pb-4" style={{ color: 'var(--color-text-muted)' }}>
        Setelah simpan, CSS variables diupdate otomatis — tidak perlu refresh halaman.
      </p>
    </div>
  );
}
