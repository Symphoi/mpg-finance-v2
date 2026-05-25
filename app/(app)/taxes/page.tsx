'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Tax { id: number; tax_code: string; name: string; rate: number; tax_type: string; description: string; is_active: number; created_at: string; }

export default function TaxesPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<Tax>('/api/taxes', { show_inactive: 'true' });
  const [search, setS] = useState('');
  const [modal, setModal] = useState<Tax | 'new' | null>(null);
  const [form, setForm] = useState({ name:'', rate:'', tax_type:'percentage', description:'' });
  const [saving, setSaving] = useState(false);

  const openEdit = (t: Tax) => { setForm({ name: t.name, rate: String(t.rate), tax_type: t.tax_type, description: t.description ?? '' }); setModal(t); };
  const openNew  = () => { setForm({ name:'', rate:'', tax_type:'percentage', description:'' }); setModal('new'); };

  const save = async () => {
    if (!form.name || !form.rate) { toast.error('Nama dan rate wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as Tax), ...form, rate: Number(form.rate) } : { ...form, rate: Number(form.rate) };
      const res  = await fetch('/api/taxes', { method: isEdit ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(isEdit ? 'Tax diperbarui' : 'Tax ditambahkan');
      setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Taxes</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} tax type</p></div>
        <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={13}/> Tambah Tax</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari tax..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Rate</th><th>Tipe</th><th>Deskripsi</th><th>Status</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={8} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((t)=>(
              <tr key={t.id}>
                <td><span className="tbl-mono">{t.tax_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{t.name}</div></td>
                <td><span className="font-semibold" style={{color:'#7c3aed'}}>{t.rate}%</span></td>
                <td><span className="badge badge-blue">{t.tax_type}</span></td>
                <td><div className="max-w-[200px] truncate text-[12px]">{t.description||'-'}</div></td>
                <td><span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}>{t.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(t.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(t)}><Pencil size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--color-border-soft)'}}>
          <div className="text-[12px]" style={{color:'var(--color-text-muted)'}}>{meta.total} data</div>
          <div className="pagination">
            <button className="page-btn" disabled={meta.page<=1} onClick={()=>setPage(meta.page-1)}><ChevronLeft size={13}/></button>
            <button className="page-btn" disabled={meta.page>=meta.totalPages} onClick={()=>setPage(meta.page+1)}><ChevronRight size={13}/></button>
          </div>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Tax':'Edit Tax'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nama tax"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Rate (%) *</label><input type="number" className="input" min="0" max="100" step="0.1" value={form.rate} onChange={(e)=>setForm(f=>({...f,rate:e.target.value}))}/></div>
                <div><label className="input-label">Tipe</label><select className="input" value={form.tax_type} onChange={(e)=>setForm(f=>({...f,tax_type:e.target.value}))}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></div>
              </div>
              <div><label className="input-label">Deskripsi</label><input className="input" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
