'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { Plus, Search, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Rule { id: number; rule_code: string; rule_name: string; description: string; transaction_type: string; debit_account_code: string; debit_account_name: string; credit_account_code: string; credit_account_name: string; is_active: number; }
interface COA  { account_code: string; account_name: string; account_type: string; }

const TX_TYPES = ['sales_order','purchase_order','cash_advance','reimbursement','manual_journal','payment','receipt'];

export default function AccountingRulesPage() {
  const { data, meta, loading, setSearch, setPage, refetch } = usePaginated<Rule>('/api/accounting-rules');
  const [search, setS]   = useState('');
  const [coas, setCoas]  = useState<COA[]>([]);
  const [modal, setModal] = useState<Rule | 'new' | null>(null);
  const [form, setForm]  = useState({ rule_name:'', description:'', transaction_type:'sales_order', debit_account_code:'', credit_account_code:'', is_active:'1' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/chart-of-accounts?limit=200', { credentials:'include' }).then(r=>r.json()).then(j=>{ if(j.success) setCoas(j.data??[]); });
  }, []);

  const openEdit = (r: Rule) => { setForm({ rule_name:r.rule_name, description:r.description??'', transaction_type:r.transaction_type, debit_account_code:r.debit_account_code, credit_account_code:r.credit_account_code, is_active:String(r.is_active) }); setModal(r); };

  const save = async () => {
    if (!form.rule_name || !form.debit_account_code || !form.credit_account_code) { toast.error('Rule name, debit, dan credit akun wajib'); return; }
    setSaving(true);
    try {
      const isEdit = modal !== 'new';
      const body = isEdit ? { ...(modal as Rule), ...form, is_active:Number(form.is_active) } : { ...form };
      const res  = await fetch('/api/accounting-rules', { method:isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Berhasil disimpan'); setModal(null); refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Accounting Rules</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} rules</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setForm({rule_name:'',description:'',transaction_type:'sales_order',debit_account_code:'',credit_account_code:'',is_active:'1'});setModal('new');}}><Plus size={13}/> Tambah Rule</button>
      </div>
      <div className="card p-3 flex gap-2">
        <div className="flex-1 relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/><input className="input" style={{paddingLeft:32}} placeholder="Cari rule..." value={search} onChange={(e)=>setS(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&setSearch(search)}/></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setSearch(search)}>Cari</button>
      </div>
      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl">
          <thead><tr><th>Kode</th><th>Nama Rule</th><th>Tipe Transaksi</th><th>Debit</th><th>Credit</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={7} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((r)=>(
              <tr key={r.id}>
                <td><span className="tbl-mono">{r.rule_code}</span></td>
                <td><div className="font-medium" style={{color:'var(--color-text)'}}>{r.rule_name}</div>{r.description&&<div className="text-[11px]" style={{color:'var(--color-text-muted)'}}>{r.description}</div>}</td>
                <td><span className="badge badge-blue">{r.transaction_type.replace(/_/g,' ')}</span></td>
                <td>
                  <div className="font-mono text-[11.5px]" style={{color:'#7c3aed'}}>{r.debit_account_code}</div>
                  <div className="text-[11px]" style={{color:'var(--color-text-muted)'}}>{r.debit_account_name}</div>
                </td>
                <td>
                  <div className="font-mono text-[11.5px]" style={{color:'#4f46e5'}}>{r.credit_account_code}</div>
                  <div className="text-[11px]" style={{color:'var(--color-text-muted)'}}>{r.credit_account_name}</div>
                </td>
                <td><span className={`badge ${r.is_active ? 'badge-green' : 'badge-gray'}`}>{r.is_active?'Aktif':'Nonaktif'}</span></td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(r)}><Pencil size={12}/></button></td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">{modal==='new'?'Tambah Rule':'Edit Rule'}</div><button onClick={()=>setModal(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Nama Rule *</label><input className="input" value={form.rule_name} onChange={(e)=>setForm(f=>({...f,rule_name:e.target.value}))}/></div>
              <div><label className="input-label">Tipe Transaksi *</label><select className="input" value={form.transaction_type} onChange={(e)=>setForm(f=>({...f,transaction_type:e.target.value}))}>{TX_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div>
              <div>
                <label className="input-label">Akun Debit *</label>
                <select className="input" value={form.debit_account_code} onChange={(e)=>setForm(f=>({...f,debit_account_code:e.target.value}))}>
                  <option value="">Pilih akun</option>
                  {coas.map(c=><option key={c.account_code} value={c.account_code}>{c.account_code} — {c.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Akun Credit *</label>
                <select className="input" value={form.credit_account_code} onChange={(e)=>setForm(f=>({...f,credit_account_code:e.target.value}))}>
                  <option value="">Pilih akun</option>
                  {coas.map(c=><option key={c.account_code} value={c.account_code}>{c.account_code} — {c.account_name}</option>)}
                </select>
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
