'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Eye, X } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Recon { id: number; account_code: string; bank_name: string; account_number: string; period_start: string; period_end: string; bank_balance: number; book_balance: number; difference: number; status: string; notes: string; created_by: string; created_at: string; }
interface Bank  { account_code: string; bank_name: string; account_number: string; }

export default function BankReconciliationsPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<Recon>('/api/bank-reconciliations');
  const [banks, setBanks]       = useState<Bank[]>([]);
  const [detail, setDetail]     = useState<Recon | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]         = useState({ account_code:'', period_start:'', period_end:'', bank_balance:'', book_balance:'', notes:'' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch('/api/bank-accounts?limit=100', { credentials:'include' }).then(r=>r.json()).then(j=>{ if(j.success) setBanks(j.data??[]); });
  }, []);

  const difference = Number(form.bank_balance||0) - Number(form.book_balance||0);

  const save = async () => {
    if (!form.account_code || !form.period_start || !form.period_end) { toast.error('Akun, periode awal, dan akhir wajib'); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/bank-reconciliations', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ ...form, bank_balance:Number(form.bank_balance)||0, book_balance:Number(form.book_balance)||0 }) });
      const j    = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Rekonsiliasi dibuat'); setShowCreate(false);
      setForm({ account_code:'', period_start:'', period_end:'', bank_balance:'', book_balance:'', notes:'' });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Rekonsiliasi Bank</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} rekonsiliasi</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}><Plus size={13}/> Buat Rekonsiliasi</button>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl">
          <thead><tr><th>Bank</th><th>Periode</th><th className="text-right">Saldo Bank</th><th className="text-right">Saldo Buku</th><th className="text-right">Selisih</th><th>Status</th><th>Dibuat</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={8} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Belum ada rekonsiliasi</td></tr>}
            {data.map((r)=>(
              <tr key={r.id}>
                <td>
                  <div className="font-medium" style={{color:'var(--color-text)'}}>{r.bank_name||r.account_code}</div>
                  {r.account_number && <div className="text-[11px] font-mono" style={{color:'var(--color-text-muted)'}}>{r.account_number}</div>}
                </td>
                <td><div className="text-[12px]">{formatDate(r.period_start)} — {formatDate(r.period_end)}</div></td>
                <td className="text-right">{formatRupiah(r.bank_balance)}</td>
                <td className="text-right">{formatRupiah(r.book_balance)}</td>
                <td className="text-right">
                  <span style={{color: r.difference===0 ? '#059669' : '#dc2626', fontWeight:600}}>{formatRupiah(Math.abs(r.difference))}{r.difference!==0 && (r.difference>0 ? ' (lebih)' : ' (kurang)')}</span>
                </td>
                <td><span className={`badge ${r.status==='reconciled'?'badge-green':r.status==='draft'?'badge-amber':'badge-gray'}`}>{r.status}</span></td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(r.created_at)}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(r)}><Eye size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4"><div className="font-bold text-[15px]">Buat Rekonsiliasi Bank</div><button onClick={()=>setShowCreate(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button></div>
            <div className="space-y-3">
              <div><label className="input-label">Rekening Bank *</label><select className="input" value={form.account_code} onChange={(e)=>setForm(f=>({...f,account_code:e.target.value}))}><option value="">Pilih rekening</option>{banks.map(b=><option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Periode Awal *</label><input type="date" className="input" value={form.period_start} onChange={(e)=>setForm(f=>({...f,period_start:e.target.value}))}/></div>
                <div><label className="input-label">Periode Akhir *</label><input type="date" className="input" value={form.period_end} onChange={(e)=>setForm(f=>({...f,period_end:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="input-label">Saldo Bank (Rp)</label><input type="number" className="input" min="0" value={form.bank_balance} onChange={(e)=>setForm(f=>({...f,bank_balance:e.target.value}))}/></div>
                <div><label className="input-label">Saldo Buku (Rp)</label><input type="number" className="input" min="0" value={form.book_balance} onChange={(e)=>setForm(f=>({...f,book_balance:e.target.value}))}/></div>
              </div>
              {(form.bank_balance || form.book_balance) && (
                <div className="p-3 rounded-xl flex items-center justify-between" style={{background: difference===0?'#ecfdf5':'#fef2f2', border:`1px solid ${difference===0?'#a7f3d0':'#fecaca'}`}}>
                  <span className="text-[12.5px] font-semibold" style={{color:difference===0?'#059669':'#dc2626'}}>Selisih</span>
                  <span className="text-[13px] font-bold" style={{color:difference===0?'#059669':'#dc2626'}}>{formatRupiah(Math.abs(difference))} {difference===0?'(Balanced ✓)':difference>0?'(Bank lebih)':'(Buku lebih)'}</span>
                </div>
              )}
              <div><label className="input-label">Catatan</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={(e)=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            </div>
            <div className="flex gap-2 mt-5 justify-end"><button className="btn btn-outline" onClick={()=>setShowCreate(false)}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
