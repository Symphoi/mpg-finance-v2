'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Eye, X, Pencil, Upload, Building } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Company { id: number; company_code: string; name: string; legal_name: string; industry: string; address: string; city: string; phone: string; email: string; tax_id: string; logo_url: string; status: string; is_active: number; created_at: string; }

export default function CompaniesPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<Company>('/api/companies');
  const [search, setS]     = useState('');
  const [detail, setDetail] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]    = useState({ name:'', legal_name:'', industry:'', address:'', city:'', phone:'', email:'', tax_id:'' });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const save = async () => {
    if (!form.name) { toast.error('Nama wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/companies', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(form) });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Perusahaan ditambahkan'); setShowCreate(false);
      setForm({ name:'', legal_name:'', industry:'', address:'', city:'', phone:'', email:'', tax_id:'' });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, companyCode: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('company_code', companyCode);
      const res  = await fetch('/api/companies/logo', { method:'POST', credentials:'include', body:fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Logo diperbarui');
      refetch();
      if (detail) setDetail({ ...detail, logo_url: json.data.logo_url });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload gagal'); }
    setUploadingLogo(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Companies</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} perusahaan</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}><Plus size={13}/> Tambah Perusahaan</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari perusahaan..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl">
          <thead><tr><th>Kode</th><th>Logo</th><th>Nama</th><th>Legal Name</th><th>Industri</th><th>Kota</th><th>Telepon</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={9} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada perusahaan</td></tr>}
            {data.map((c)=>(
              <tr key={c.id}>
                <td><span className="tbl-mono">{c.company_code}</span></td>
                <td>
                  {c.logo_url
                    ? <img src={c.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-contain border" style={{borderColor:'var(--color-border)'}}/>
                    : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'var(--color-bg)'}}><Building size={14} style={{color:'var(--color-text-muted)'}}/></div>}
                </td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{c.name}</div></td>
                <td><div className="text-[12px]">{c.legal_name||'-'}</div></td>
                <td>{c.industry||'-'}</td>
                <td>{c.city||'-'}</td>
                <td>{c.phone||'-'}</td>
                <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(c)}><Eye size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Tambah Perusahaan</div><button onClick={()=>setShowCreate(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama *</label><input className="input" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="input-label">Nama Legal</label><input className="input" value={form.legal_name} onChange={(e)=>setForm(f=>({...f,legal_name:e.target.value}))}/></div>
              <div><label className="input-label">Industri</label><input className="input" value={form.industry} onChange={(e)=>setForm(f=>({...f,industry:e.target.value}))} placeholder="Teknologi, Manufaktur, dll"/></div>
              <div><label className="input-label">Alamat</label><textarea className="input resize-none" rows={2} value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Kota</label><input className="input" value={form.city} onChange={(e)=>setForm(f=>({...f,city:e.target.value}))}/></div>
                <div><label className="input-label">Telepon</label><input className="input" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label className="input-label">NPWP</label><input className="input" value={form.tax_id} onChange={(e)=>setForm(f=>({...f,tax_id:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setShowCreate(false)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.3)'}} onClick={()=>setDetail(null)}>
          <div className="bg-white h-full w-[420px] shadow-xl overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'var(--color-border)'}}>
              <div className="font-bold text-[15px]">Detail Perusahaan</div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(null)}><X size={14}/></button>
            </div>
            <div className="p-5">
              {/* Logo section */}
              <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{background:'var(--color-bg)'}}>
                {detail.logo_url
                  ? <img src={detail.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-contain border" style={{borderColor:'var(--color-border)'}}/>
                  : <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{background:'var(--color-border)'}}><Building size={24} style={{color:'var(--color-text-muted)'}}/></div>
                }
                <div>
                  <div className="font-semibold text-[13px]" style={{color:'var(--color-text)'}}>{detail.name}</div>
                  <label className="mt-2 btn btn-outline btn-sm cursor-pointer flex items-center gap-1.5" style={{width:'fit-content'}}>
                    <Upload size={11}/> {uploadingLogo ? 'Uploading...' : 'Ganti Logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e)=>handleLogoUpload(e, detail.company_code)} disabled={uploadingLogo}/>
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                {[['Kode',detail.company_code],['Nama',detail.name],['Legal Name',detail.legal_name||'-'],['Industri',detail.industry||'-'],['NPWP',detail.tax_id||'-'],['Telepon',detail.phone||'-'],['Email',detail.email||'-'],['Kota',detail.city||'-'],['Status',detail.is_active?'Aktif':'Nonaktif'],['Dibuat',formatDate(detail.created_at)]].map(([k,v])=>(
                  <div key={k} className="flex gap-3"><div className="text-[12px] w-28 flex-shrink-0" style={{color:'var(--color-text-muted)'}}>{k}</div><div className="text-[12.5px] font-medium" style={{color:'var(--color-text)'}}>{v}</div></div>
                ))}
                {detail.address && <div><div className="text-[12px] mb-1" style={{color:'var(--color-text-muted)'}}>Alamat</div><div className="p-3 rounded-lg text-[12.5px]" style={{background:'var(--color-bg)'}}>{detail.address}</div></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
