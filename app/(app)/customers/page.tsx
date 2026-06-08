'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, Filter } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface Customer {
  id: number; customer_code: string; name: string; phone: string;
  email: string; address: string; city: string; type: string;
  contact_person: string; tax_id: string; created_at: string;
}

export default function CustomersPage() {
  const { data, meta, loading, setSearch, setPage } = usePaginated<Customer>('/api/customers');
  const [search, setS] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', city:'', type:'company', contact_person:'', tax_id:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/customers', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      setShowCreate(false);
      setForm({ name:'', phone:'', email:'', address:'', city:'', type:'company', contact_person:'', tax_id:'' });
      setSearch('');
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Customers</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} customer</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Tambah Customer</button>
      </div>

      <div className="card p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Cari nama, email, kode..."
              value={search} onChange={(e) => setS(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(search)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setSearch(search)}><Filter size={12} /> Cari</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Telepon</th><th>Email</th><th>Kota</th><th>Tipe</th><th>Dibuat</th><th></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((c) => (
                <tr key={c.id}>
                  <td><span className="tbl-mono">{c.customer_code}</span></td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{c.name}</div></td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.city || '-'}</td>
                  <td><span className={`badge ${c.type === 'government' ? 'badge-blue' : 'badge-purple'}`}>{c.type || '-'}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(c.created_at)}</td>
                  <td><button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(c)}><Eye size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Tambah Customer</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e) => setForm(f=>({...f,name:e.target.value}))} placeholder="Nama customer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Telepon</label><input className="input" value={form.phone} onChange={(e) => setForm(f=>({...f,phone:e.target.value}))} /></div>
                <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm(f=>({...f,email:e.target.value}))} /></div>
              </div>
              <div><label className="input-label">Alamat</label><textarea className="input resize-none" rows={2} value={form.address} onChange={(e) => setForm(f=>({...f,address:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Kota</label><input className="input" value={form.city} onChange={(e) => setForm(f=>({...f,city:e.target.value}))} /></div>
                <div>
                  <label className="input-label">Tipe</label>
                  <select className="input" value={form.type} onChange={(e) => setForm(f=>({...f,type:e.target.value}))}>
                    <option value="company">Company</option>
                    <option value="government">Government</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>
              <div><label className="input-label">NPWP</label><input className="input" value={form.tax_id} onChange={(e) => setForm(f=>({...f,tax_id:e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[400px] shadow-xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Detail Customer</div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            {[['Kode',detail.customer_code],['Nama',detail.name],['Telepon',detail.phone||'-'],['Email',detail.email||'-'],['Kota',detail.city||'-'],['Tipe',detail.type||'-'],['NPWP',detail.tax_id||'-'],['Dibuat',formatDate(detail.created_at)]].map(([k,v])=>(
              <div key={k} className="flex gap-3 mb-3">
                <div className="text-[12px] w-24 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
              </div>
            ))}
            {detail.address && (
              <div className="mb-3">
                <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Alamat</div>
                <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detail.address}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
