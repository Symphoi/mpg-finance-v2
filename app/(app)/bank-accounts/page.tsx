'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, Filter } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface BankAccount {
  id: number; account_code: string; bank_name: string; account_number: string;
  account_holder: string; branch: string; currency: string; description: string;
  is_active: number; created_at: string;
}

export default function BankAccountsPage() {
  const { data, meta, loading, setSearch, setPage } = usePaginated<BankAccount>('/api/bank-accounts');
  const [search, setS] = useState('');
  const [detail, setDetail] = useState<BankAccount | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ bank_name:'', account_number:'', account_holder:'', branch:'', currency:'IDR', description:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.bank_name || !form.account_number || !form.account_holder) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bank-accounts', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      setShowCreate(false);
      setForm({ bank_name:'', account_number:'', account_holder:'', branch:'', currency:'IDR', description:'' });
      setSearch('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan rekening');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Kas & Bank</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} rekening</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Tambah Rekening</button>
      </div>

      <div className="card p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Cari bank, nomor rekening..."
              value={search} onChange={(e) => setS(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(search)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setSearch(search)}><Filter size={12} /> Cari</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Bank</th><th>No. Rekening</th><th>Atas Nama</th><th>Cabang</th><th>Mata Uang</th><th>Status</th><th>Dibuat</th><th></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada rekening</td></tr>}
              {data.map((b) => (
                <tr key={b.id}>
                  <td><span className="tbl-mono">{b.account_code}</span></td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{b.bank_name}</div></td>
                  <td><span className="font-mono text-[12px]">{b.account_number}</span></td>
                  <td>{b.account_holder}</td>
                  <td>{b.branch || '-'}</td>
                  <td><span className="badge badge-blue">{b.currency || 'IDR'}</span></td>
                  <td><span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>{b.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(b.created_at)}</td>
                  <td><button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(b)}><Eye size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Tambah Rekening Bank</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="input-label">Nama Bank *</label><input className="input" value={form.bank_name} onChange={(e) => setForm(f=>({...f,bank_name:e.target.value}))} placeholder="BCA, Mandiri, BRI, dll" /></div>
              <div><label className="input-label">No. Rekening *</label><input className="input" value={form.account_number} onChange={(e) => setForm(f=>({...f,account_number:e.target.value}))} /></div>
              <div><label className="input-label">Atas Nama *</label><input className="input" value={form.account_holder} onChange={(e) => setForm(f=>({...f,account_holder:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Cabang</label><input className="input" value={form.branch} onChange={(e) => setForm(f=>({...f,branch:e.target.value}))} /></div>
                <div>
                  <label className="input-label">Mata Uang</label>
                  <select className="input" value={form.currency} onChange={(e) => setForm(f=>({...f,currency:e.target.value}))}>
                    <option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div><label className="input-label">Keterangan</label><input className="input" value={form.description} onChange={(e) => setForm(f=>({...f,description:e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
