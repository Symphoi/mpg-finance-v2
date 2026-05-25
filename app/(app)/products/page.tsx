'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Product { id: number; product_code: string; name: string; description: string; category_code: string; category_name: string; unit: string; base_price: number; created_at: string; }

export default function ProductsPage() {
  const { data, meta, loading, setSearch, setPage, setParam, refetch } = usePaginated<Product>('/api/products');
  const [search, setS]   = useState('');
  const [cats, setCats]  = useState<{category_code:string;name:string}[]>([]);
  const [modal, setModal] = useState<Product | 'new' | null>(null);
  const [form, setForm]  = useState({ name:'', description:'', category_code:'', unit:'pcs', base_price:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/product-categories?limit=200', { credentials:'include' })
      .then(r=>r.json()).then(j=>{ if(j.success) setCats(j.data??[]); });
  }, []);

  const openEdit = (p: Product) => { setForm({ name:p.name, description:p.description??'', category_code:p.category_code??'', unit:p.unit??'pcs', base_price:String(p.base_price??'') }); setModal(p); };
  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as Product), ...form, base_price: Number(form.base_price)||0 } : { ...form, base_price: Number(form.base_price)||0 };
      const res  = await fetch('/api/products', { method: isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil disimpan'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Products</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} produk</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',description:'',category_code:'',unit:'pcs',base_price:''});setModal('new');}}><Plus size={13}/> Tambah Produk</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari produk..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <select className="input" style={{width:'auto'}} onChange={(e)=>setParam('category',e.target.value)}>
          <option value="">Semua Kategori</option>
          {cats.map(c=><option key={c.category_code} value={c.category_code}>{c.name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th className="text-right">Harga Dasar</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={7} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((p)=>(
              <tr key={p.id}>
                <td><span className="tbl-mono">{p.product_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{p.name}</div>{p.description&&<div className="text-[11px] truncate max-w-[200px]" style={{color:'var(--color-text-muted)'}}>{p.description}</div>}</td>
                <td>{p.category_name||'-'}</td>
                <td>{p.unit}</td>
                <td className="text-right font-semibold">{p.base_price ? formatRupiah(p.base_price) : '-'}</td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(p.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(p)}><Pencil size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--color-border-soft)'}}>
          <div className="text-[12px]" style={{color:'var(--color-text-muted)'}}>{meta.total > 0 ? `${((meta.page-1)*meta.limit)+1}–${Math.min(meta.page*meta.limit,meta.total)} dari ${meta.total}` : '0 data'}</div>
          <div className="pagination"><button className="page-btn" disabled={meta.page<=1} onClick={()=>setPage(meta.page-1)}><ChevronLeft size={13}/></button><button className="page-btn" disabled={meta.page>=meta.totalPages} onClick={()=>setPage(meta.page+1)}><ChevronRight size={13}/></button></div>
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Produk':'Edit Produk'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Deskripsi</label><textarea className="input resize-none" rows={2} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Kategori</label><select className="input" value={form.category_code} onChange={(e)=>setForm(f=>({...f,category_code:e.target.value}))}><option value="">Pilih</option>{cats.map(c=><option key={c.category_code} value={c.category_code}>{c.name}</option>)}</select></div>
                <div><label className="input-label">Satuan</label><input className="input" value={form.unit} onChange={(e)=>setForm(f=>({...f,unit:e.target.value}))} placeholder="pcs, kg, liter..."/></div>
              </div>
              <div><label className="input-label">Harga Dasar (Rp)</label><input type="number" className="input" min="0" value={form.base_price} onChange={(e)=>setForm(f=>({...f,base_price:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
