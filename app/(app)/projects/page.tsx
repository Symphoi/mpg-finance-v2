'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Project { id: number; project_code: string; name: string; description: string; client_name: string; company_name: string; company_code: string; start_date: string; end_date: string; budget: number; status: string; created_at: string; }

const STATUS_COLOR: Record<string,string> = { active:'badge-green', completed:'badge-blue', on_hold:'badge-amber', cancelled:'badge-red' };
const STATUS_LABEL: Record<string,string> = { active:'Aktif', completed:'Selesai', on_hold:'Ditunda', cancelled:'Dibatalkan' };

export default function ProjectsPage() {
  const { data, meta, loading, setSearch, setPage, setParam, refetch } = usePaginated<Project>('/api/projects');
  const [search, setS] = useState('');
  const [companies, setCompanies] = useState<{company_code:string;name:string}[]>([]);
  const [modal, setModal] = useState<Project | 'new' | null>(null);
  const [form, setForm] = useState({ name:'', description:'', client_name:'', company_code:'', start_date:'', end_date:'', budget:'', status:'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/companies?limit=200', { credentials:'include' }).then(r=>r.json()).then(j=>{ if(j.success) setCompanies(j.data??[]); });
  }, []);

  const openEdit = (p: Project) => { setForm({ name:p.name, description:p.description??'', client_name:p.client_name??'', company_code:p.company_code??'', start_date:p.start_date?.split('T')[0]??'', end_date:p.end_date?.split('T')[0]??'', budget:p.budget?String(p.budget):'', status:p.status??'active' }); setModal(p); };
  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as Project), ...form, budget: form.budget ? Number(form.budget) : null } : { ...form, budget: form.budget ? Number(form.budget) : null };
      const res  = await fetch('/api/projects', { method: isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil disimpan'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Projects</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} project</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({name:'',description:'',client_name:'',company_code:'',start_date:'',end_date:'',budget:'',status:'active'});setModal('new');}}><Plus size={13}/> Tambah Project</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari project..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <select className="input" style={{width:'auto'}} onChange={(e)=>setParam('status',e.target.value)}><option value="all">Semua Status</option><option value="active">Aktif</option><option value="completed">Selesai</option><option value="on_hold">Ditunda</option></select>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Client</th><th>Perusahaan</th><th className="text-right">Budget</th><th>Mulai</th><th>Selesai</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={9} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((p)=>(
              <tr key={p.id}>
                <td><span className="tbl-mono">{p.project_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{p.name}</div></td>
                <td>{p.client_name||'-'}</td>
                <td>{p.company_name||'-'}</td>
                <td className="text-right">{p.budget ? formatRupiah(p.budget) : '-'}</td>
                <td style={{color:'var(--color-text-muted)'}}>{p.start_date ? formatDate(p.start_date) : '-'}</td>
                <td style={{color:'var(--color-text-muted)'}}>{p.end_date ? formatDate(p.end_date) : '-'}</td>
                <td><span className={`badge ${STATUS_COLOR[p.status]??'badge-gray'}`}>{STATUS_LABEL[p.status]??p.status}</span></td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Project':'Edit Project'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama Project *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Deskripsi</label><textarea className="input resize-none" rows={2} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Client</label><input className="input" value={form.client_name} onChange={(e)=>setForm(f=>({...f,client_name:e.target.value}))}/></div>
                <div><label className="input-label">Perusahaan</label><select className="input" value={form.company_code} onChange={(e)=>setForm(f=>({...f,company_code:e.target.value}))}><option value="">Pilih</option>{companies.map(c=><option key={c.company_code} value={c.company_code}>{c.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Tgl Mulai</label><input type="date" className="input" value={form.start_date} onChange={(e)=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
                <div><label className="input-label">Tgl Selesai</label><input type="date" className="input" value={form.end_date} onChange={(e)=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
              </div>
              <div><label className="input-label">Budget (Rp)</label><input type="number" className="input" min="0" value={form.budget} onChange={(e)=>setForm(f=>({...f,budget:e.target.value}))}/></div>
              <div><label className="input-label">Status</label><select className="input" value={form.status} onChange={(e)=>setForm(f=>({...f,status:e.target.value}))}><option value="active">Aktif</option><option value="completed">Selesai</option><option value="on_hold">Ditunda</option><option value="cancelled">Dibatalkan</option></select></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setModal(null)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
