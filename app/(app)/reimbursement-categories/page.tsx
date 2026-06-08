'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Search, Pencil, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface RCat { id: number; category_code: string; name: string; description: string; max_amount: number; is_active: number; created_at: string; }

export default function ReimbursementCategoriesPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<RCat>('/api/reimbursement-categories', { show_inactive: 'true' });
  const [search, setS] = useState('');
  const [modal, setModal] = useState<RCat | 'new' | null>(null);
  const [form, setForm] = useState({ name:'', description:'', max_amount:'', is_active:'1' });
  const [saving, setSaving] = useState(false);

  const openEdit = (c: RCat) => { setForm({ name:c.name, description:c.description??'', max_amount:c.max_amount?String(c.max_amount):'', is_active:String(c.is_active) }); setModal(c); };
  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as RCat), ...form, max_amount: form.max_amount ? Number(form.max_amount) : null, is_active: Number(form.is_active) } : { ...form, max_amount: form.max_amount ? Number(form.max_amount) : null };
      const res  = await fetch('/api/reimbursement-categories', { method: isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil disimpan'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Reimburse Categories</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} kategori</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',description:'',max_amount:'',is_active:'1'});setModal('new');}}><Plus size={13}/> Tambah</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari kategori..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Deskripsi</th><th className="text-right">Max Amount</th><th>Status</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={7} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((c)=>(
              <tr key={c.id}>
                <td><span className="tbl-mono">{c.category_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{c.name}</div></td>
                <td><div className="max-w-[200px] truncate text-[12px]">{c.description||'-'}</div></td>
                <td className="text-right">{c.max_amount ? formatRupiah(c.max_amount) : '-'}</td>
                <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(c.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(c)}><Pencil size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination meta={meta} setPage={setPage} />
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Kategori':'Edit Kategori'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Deskripsi</label><textarea className="input resize-none" rows={2} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <div><label className="input-label">Max Amount (Rp)</label><input type="number" className="input" min="0" placeholder="Kosongkan jika tidak ada limit" value={form.max_amount} onChange={(e)=>setForm(f=>({...f,max_amount:e.target.value}))}/></div>
              {modal !== 'new' && <div><label className="input-label">Status</label><select className="input" value={form.is_active} onChange={(e)=>setForm(f=>({...f,is_active:e.target.value}))}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></div>}
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
