'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Supplier { id: number; supplier_code: string; name: string; phone: string; email: string; address: string; city: string; contact_person: string; bank_name: string; account_number: string; created_at: string; }

export default function SuppliersPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<Supplier>('/api/suppliers');
  const [search, setS] = useState('');
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', city:'', contact_person:'', bank_name:'', account_number:'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(form) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Supplier ditambahkan'); setShowCreate(false); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Suppliers</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} supplier</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}><Plus size={13}/> Tambah Supplier</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari nama, email, kode..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Contact Person</th><th>Telepon</th><th>Email</th><th>Kota</th><th>Bank</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={9} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((s)=>(
              <tr key={s.id}>
                <td><span className="tbl-mono">{s.supplier_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{s.name}</div></td>
                <td>{s.contact_person||'-'}</td>
                <td>{s.phone||'-'}</td>
                <td>{s.email||'-'}</td>
                <td>{s.city||'-'}</td>
                <td>{s.bank_name ? <div><div className="text-[12px]">{s.bank_name}</div><div className="text-[11px] font-mono" style={{color:'var(--color-text-muted)'}}>{s.account_number}</div></div> : '-'}</td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(s.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(s)}><Eye size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination meta={meta} setPage={setPage} />
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Tambah Supplier</div><button onClick={()=>setShowCreate(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Contact Person</label><input className="input" value={form.contact_person} onChange={(e)=>setForm(f=>({...f,contact_person:e.target.value}))}/></div>
                <div><label className="input-label">Telepon</label><input className="input" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label className="input-label">Alamat</label><textarea className="input resize-none" rows={2} value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))}/></div>
              <div><label className="input-label">Kota</label><input className="input" value={form.city} onChange={(e)=>setForm(f=>({...f,city:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Nama Bank</label><input className="input" value={form.bank_name} onChange={(e)=>setForm(f=>({...f,bank_name:e.target.value}))}/></div>
                <div><label className="input-label">No. Rekening</label><input className="input" value={form.account_number} onChange={(e)=>setForm(f=>({...f,account_number:e.target.value}))}/></div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setShowCreate(false)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.3)'}} onClick={()=>setDetail(null)}>
          <div className="bg-white h-full w-[400px] shadow-xl p-5 overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Detail Supplier</div><button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(null)}><X size={14}/></button></div>
            {[['Kode',detail.supplier_code],['Nama',detail.name],['Contact',detail.contact_person||'-'],['Telepon',detail.phone||'-'],['Email',detail.email||'-'],['Kota',detail.city||'-'],['Bank',detail.bank_name||'-'],['No. Rek',detail.account_number||'-'],['Dibuat',formatDate(detail.created_at)]].map(([k,v])=>(
              <div key={k} className="flex gap-3 mb-3"><div className="text-[12px] w-24 flex-shrink-0" style={{color:'var(--color-text-muted)'}}>{k}</div><div className="text-[12.5px] font-medium" style={{color:'var(--color-text)'}}>{v}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
