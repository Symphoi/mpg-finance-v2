'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PCat { id: number; category_code: string; name: string; description: string; created_at: string; }

export default function ProductCategoriesPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<PCat>('/api/product-categories');
  const [search, setS] = useState('');
  const [modal, setModal] = useState<PCat | 'new' | null>(null);
  const [form, setForm] = useState({ name:'', description:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as PCat), ...form } : form;
      const res  = await fetch('/api/product-categories', { method: isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[800px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Product Categories</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} kategori</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',description:''});setModal('new');}}><Plus size={13}/> Tambah</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Deskripsi</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={5} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((c)=>(
              <tr key={c.id}>
                <td><span className="tbl-mono">{c.category_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{c.name}</div></td>
                <td><div className="max-w-[250px] truncate text-[12px]">{c.description||'-'}</div></td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(c.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>{setForm({name:c.name,description:c.description??''});setModal(c);}}><Pencil size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--color-border-soft)'}}>
          <div className="text-[12px]" style={{color:'var(--color-text-muted)'}}>{meta.total} data</div>
          <div className="pagination"><button className="page-btn" disabled={meta.page<=1} onClick={()=>setPage(meta.page-1)}><ChevronLeft size={13}/></button><button className="page-btn" disabled={meta.page>=meta.totalPages} onClick={()=>setPage(meta.page+1)}><ChevronRight size={13}/></button></div>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Kategori':'Edit Kategori'}</div><button onClick={()=>setModal(null)}><X size={15}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Deskripsi</label><textarea className="input resize-none" rows={2} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
