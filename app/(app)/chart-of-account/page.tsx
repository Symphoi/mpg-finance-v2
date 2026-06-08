'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { Plus, Search, Pencil, X, Filter } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface COA { id: number; account_code: string; account_name: string; account_type: string; parent_account_code: string; category: string; description: string; is_active: number; }

const TYPES = ['asset','liability','equity','income','expense','cost_of_sales'];
const TYPE_COLOR: Record<string,string> = { asset:'badge-blue', liability:'badge-red', equity:'badge-purple', income:'badge-green', expense:'badge-amber', cost_of_sales:'badge-amber' };
const TYPE_LABEL: Record<string,string> = { asset:'Aset', liability:'Liabilitas', equity:'Ekuitas', income:'Pendapatan', expense:'Beban', cost_of_sales:'HPP' };

export default function ChartOfAccountPage() {
  const { data, meta, loading, setSearch, setPage, setParam, refetch } = usePaginated<COA>('/api/chart-of-accounts', { show_inactive:'true', limit:'50' });
  const [search, setS]   = useState('');
  const [modal, setModal] = useState<COA | 'new' | null>(null);
  const [form, setForm]  = useState({ account_code:'', account_name:'', account_type:'asset', parent_account_code:'', category:'', description:'', is_active:'1' });
  const [saving, setSaving] = useState(false);

  const openEdit = (c: COA) => { setForm({ account_code:c.account_code, account_name:c.account_name, account_type:c.account_type, parent_account_code:c.parent_account_code??'', category:c.category??'', description:c.description??'', is_active:String(c.is_active) }); setModal(c); };

  const save = async () => {
    if (!form.account_code || !form.account_name) { toast.error('Kode dan nama akun wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const res  = await fetch('/api/chart-of-accounts', {
        method: isEdit ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ ...form, is_active: Number(form.is_active) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil disimpan'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Chart of Account</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} akun</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({account_code:'',account_name:'',account_type:'asset',parent_account_code:'',category:'',description:'',is_active:'1'});setModal('new');}}><Plus size={13}/> Tambah Akun</button>
      </div>
      <div className="card p-3 flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari kode atau nama akun..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <select className="input" style={{width:'auto'}} onChange={(e)=>setParam('type',e.target.value)}>
          <option value="">Semua Tipe</option>
          {TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]??t}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}><Filter size={12}/> Filter</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl">
          <thead><tr><th>Kode Akun</th><th>Nama Akun</th><th>Tipe</th><th>Parent</th><th>Kategori</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={7} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((c)=>(
              <tr key={c.id}>
                <td><span className="tbl-mono">{c.account_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{c.account_name}</div>{c.description&&<div className="text-[11px] truncate max-w-[200px]" style={{color:'var(--color-text-muted)'}}>{c.description}</div>}</td>
                <td><span className={`badge ${TYPE_COLOR[c.account_type]??'badge-gray'}`}>{TYPE_LABEL[c.account_type]??c.account_type}</span></td>
                <td><span className="font-mono text-[11.5px]">{c.parent_account_code||'-'}</span></td>
                <td>{c.category||'-'}</td>
                <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active?'Aktif':'Nonaktif'}</span></td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(c)}><Pencil size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination meta={meta} setPage={setPage} />
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Akun':'Edit Akun'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Kode Akun *</label><input className="input font-mono" value={form.account_code} onChange={(e)=>setForm(f=>({...f,account_code:e.target.value}))} disabled={modal!=='new'}/></div>
                <div><label className="input-label">Tipe Akun *</label><select className="input" value={form.account_type} onChange={(e)=>setForm(f=>({...f,account_type:e.target.value}))}>{TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]??t}</option>)}</select></div>
              </div>
              <div><label className="input-label">Nama Akun *</label><input className="input" value={form.account_name} onChange={(e)=>setForm(f=>({...f,account_name:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Parent Account</label><input className="input font-mono" value={form.parent_account_code} onChange={(e)=>setForm(f=>({...f,parent_account_code:e.target.value}))} placeholder="Kode akun parent"/></div>
                <div><label className="input-label">Kategori</label><input className="input" value={form.category} onChange={(e)=>setForm(f=>({...f,category:e.target.value}))}/></div>
              </div>
              <div><label className="input-label">Deskripsi</label><input className="input" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
              {modal!=='new' && <div><label className="input-label">Status</label><select className="input" value={form.is_active} onChange={(e)=>setForm(f=>({...f,is_active:e.target.value}))}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></div>}
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
