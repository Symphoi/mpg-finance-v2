'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Eye, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Journal { id: number; journal_code: string; description: string; transaction_date: string; reference: string; total_amount: number; status: string; created_by: string; items: JItem[]; }
interface JItem   { account_code: string; account_name?: string; debit_amount: number; credit_amount: number; description: string; }
interface COA     { account_code: string; account_name: string; account_type: string; }

export default function ManualJournalsPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<Journal>('/api/manual-journals');
  const [coas, setCoas]       = useState<COA[]>([]);
  const [detail, setDetail]   = useState<Journal | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]       = useState({ description:'', transaction_date: new Date().toISOString().split('T')[0], reference:'' });
  const [items, setItems]     = useState<{account_code:string;debit_amount:string;credit_amount:string;description:string}[]>([
    { account_code:'', debit_amount:'', credit_amount:'', description:'' },
    { account_code:'', debit_amount:'', credit_amount:'', description:'' },
  ]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/manual-journals?action=accounts', { credentials:'include' }).then(r=>r.json()).then(j=>{ if(j.success) setCoas(j.data??[]); });
  }, []);

  const addItem    = () => setItems(i=>[...i,{ account_code:'', debit_amount:'', credit_amount:'', description:'' }]);
  const removeItem = (i: number) => setItems(it=>it.filter((_,j)=>j!==i));
  const setItem    = (i: number, k: string, v: string) => setItems(it=>it.map((x,j)=>j===i?{...x,[k]:v}:x));

  const totalDebit  = items.reduce((s,i)=>s+(Number(i.debit_amount)||0),0);
  const totalCredit = items.reduce((s,i)=>s+(Number(i.credit_amount)||0),0);
  const balanced    = Math.abs(totalDebit-totalCredit)<0.01;

  const save = async () => {
    if (!form.description) { toast.error('Deskripsi wajib'); return; }
    if (items.some(i=>!i.account_code)) { toast.error('Semua item harus pilih akun'); return; }
    if (!balanced) { toast.error(`Debit (${formatRupiah(totalDebit)}) ≠ Credit (${formatRupiah(totalCredit)})`); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/manual-journals', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ ...form, items: items.map(i=>({ ...i, debit_amount:Number(i.debit_amount)||0, credit_amount:Number(i.credit_amount)||0 })) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(`Journal ${j.data.journal_code} dibuat`);
      setShowCreate(false);
      setForm({ description:'', transaction_date:new Date().toISOString().split('T')[0], reference:'' });
      setItems([{account_code:'',debit_amount:'',credit_amount:'',description:''},{account_code:'',debit_amount:'',credit_amount:'',description:''}]);
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div><h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Manual Journal</h1><p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{meta.total} journal</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}><Plus size={13}/> Buat Journal</button>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper"><table className="tbl">
          <thead><tr><th>Kode</th><th>Deskripsi</th><th>Referensi</th><th className="text-right">Total</th><th>Status</th><th>Tgl Transaksi</th><th>Dibuat Oleh</th><th></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
            {!loading && data.length===0 && <tr><td colSpan={8} className="text-center py-10" style={{color:'var(--color-text-muted)'}}>Tidak ada data</td></tr>}
            {data.map((j)=>(
              <tr key={j.id}>
                <td><span className="tbl-mono">{j.journal_code}</span></td>
                <td><div className="max-w-[220px] truncate font-medium" style={{color:'var(--color-text)'}}>{j.description}</div></td>
                <td>{j.reference||'-'}</td>
                <td className="text-right font-semibold">{formatRupiah(j.total_amount)}</td>
                <td><span className={`badge ${j.status==='posted'?'badge-green':j.status==='draft'?'badge-amber':'badge-gray'}`}>{j.status}</span></td>
                <td style={{color:'var(--color-text-muted)'}}>{formatDate(j.transaction_date)}</td>
                <td>{j.created_by||'-'}</td>
                <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(j)}><Eye size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between px-4 py-3" style={{borderTop:'1px solid var(--color-border-soft)'}}>
          <div className="text-[12px]" style={{color:'var(--color-text-muted)'}}>{meta.total > 0 ? `${((meta.page-1)*meta.limit)+1}–${Math.min(meta.page*meta.limit,meta.total)} dari ${meta.total}` : '0 data'}</div>
          <div className="pagination"><button className="page-btn" disabled={meta.page<=1} onClick={()=>setPage(meta.page-1)}><ChevronLeft size={13}/></button><button className="page-btn" disabled={meta.page>=meta.totalPages} onClick={()=>setPage(meta.page+1)}><ChevronRight size={13}/></button></div>
        </div>
      </div>

      {/* Create Journal Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'var(--color-border)'}}>
              <div className="font-bold text-[15px]">Buat Manual Journal</div>
              <button onClick={()=>setShowCreate(false)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="input-label">Deskripsi *</label><input className="input" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} placeholder="Deskripsi journal entry"/></div>
                <div><label className="input-label">Tanggal Transaksi</label><input type="date" className="input" value={form.transaction_date} onChange={(e)=>setForm(f=>({...f,transaction_date:e.target.value}))}/></div>
                <div><label className="input-label">Referensi</label><input className="input" value={form.reference} onChange={(e)=>setForm(f=>({...f,reference:e.target.value}))} placeholder="No. referensi (opsional)"/></div>
              </div>

              {/* Journal lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-bold" style={{color:'var(--color-text)'}}>Journal Lines</div>
                  <button className="btn btn-outline btn-sm" onClick={addItem}><Plus size={11}/> Tambah Baris</button>
                </div>
                <div className="rounded-xl overflow-hidden border" style={{borderColor:'var(--color-border)'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr style={{background:'#fafaff'}}><th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--color-text-muted)',fontWeight:600}}>Akun</th><th style={{padding:'8px 12px',textAlign:'right',fontSize:11,color:'var(--color-text-muted)',fontWeight:600}}>Debit</th><th style={{padding:'8px 12px',textAlign:'right',fontSize:11,color:'var(--color-text-muted)',fontWeight:600}}>Credit</th><th style={{padding:'8px 12px',fontSize:11,color:'var(--color-text-muted)',fontWeight:600}}>Keterangan</th><th style={{width:32}}/></tr></thead>
                    <tbody>
                      {items.map((item,i)=>(
                        <tr key={i} style={{borderTop:'1px solid var(--color-border-soft)'}}>
                          <td style={{padding:'6px 8px'}}>
                            <select className="input" style={{fontSize:12}} value={item.account_code} onChange={(e)=>setItem(i,'account_code',e.target.value)}>
                              <option value="">Pilih akun</option>
                              {coas.map(c=><option key={c.account_code} value={c.account_code}>{c.account_code} — {c.account_name}</option>)}
                            </select>
                          </td>
                          <td style={{padding:'6px 8px'}}><input type="number" className="input" style={{textAlign:'right',fontSize:12}} min="0" placeholder="0" value={item.debit_amount} onChange={(e)=>setItem(i,'debit_amount',e.target.value)}/></td>
                          <td style={{padding:'6px 8px'}}><input type="number" className="input" style={{textAlign:'right',fontSize:12}} min="0" placeholder="0" value={item.credit_amount} onChange={(e)=>setItem(i,'credit_amount',e.target.value)}/></td>
                          <td style={{padding:'6px 8px'}}><input className="input" style={{fontSize:12}} placeholder="Keterangan" value={item.description} onChange={(e)=>setItem(i,'description',e.target.value)}/></td>
                          <td style={{padding:'6px 8px'}}>{items.length>2&&<button onClick={()=>removeItem(i)}><Trash2 size={12} style={{color:'#dc2626'}}/></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:'2px solid var(--color-border)',background:'#fafaff'}}>
                        <td style={{padding:'8px 12px',fontWeight:600,fontSize:12}}>Total</td>
                        <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,fontSize:13,color:'#7c3aed'}}>{formatRupiah(totalDebit)}</td>
                        <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,fontSize:13,color:'#4f46e5'}}>{formatRupiah(totalCredit)}</td>
                        <td colSpan={2} style={{padding:'8px 12px'}}>
                          {balanced
                            ? <span className="badge badge-green">Balanced ✓</span>
                            : <span className="badge badge-red">Selisih: {formatRupiah(Math.abs(totalDebit-totalCredit))}</span>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t" style={{borderColor:'var(--color-border)'}}>
              <button className="btn btn-outline" onClick={()=>setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving||!balanced}>{saving?'Menyimpan...':'Simpan Journal'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{background:'rgba(0,0,0,0.3)'}} onClick={()=>setDetail(null)}>
          <div className="bg-white h-full w-[520px] shadow-xl overflow-y-auto p-5" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div><div className="font-bold text-[15px]">Detail Journal</div><div className="font-mono text-[12px] mt-0.5" style={{color:'#7c3aed'}}>{detail.journal_code}</div></div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={()=>setDetail(null)}><X size={14}/></button>
            </div>
            {[['Deskripsi',detail.description],['Referensi',detail.reference||'-'],['Total',formatRupiah(detail.total_amount)],['Status',detail.status],['Tgl Transaksi',formatDate(detail.transaction_date)],['Dibuat Oleh',detail.created_by||'-']].map(([k,v])=>(
              <div key={k} className="flex gap-3 mb-3"><div className="text-[12px] w-28 flex-shrink-0" style={{color:'var(--color-text-muted)'}}>{k}</div><div className="text-[12.5px] font-medium" style={{color:'var(--color-text)'}}>{v}</div></div>
            ))}
            {detail.items?.length > 0 && (
              <div className="mt-4">
                <div className="text-[12.5px] font-bold mb-2" style={{color:'var(--color-text)'}}>Journal Lines</div>
                <div className="rounded-xl overflow-hidden border" style={{borderColor:'var(--color-border)'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr style={{background:'#fafaff'}}><th style={{padding:'7px 10px',textAlign:'left',fontSize:10.5,color:'var(--color-text-muted)',fontWeight:600}}>Akun</th><th style={{padding:'7px 10px',textAlign:'right',fontSize:10.5,color:'var(--color-text-muted)',fontWeight:600}}>Debit</th><th style={{padding:'7px 10px',textAlign:'right',fontSize:10.5,color:'var(--color-text-muted)',fontWeight:600}}>Credit</th></tr></thead>
                    <tbody>
                      {detail.items.map((item,i)=>(
                        <tr key={i} style={{borderTop:'1px solid var(--color-border-soft)'}}>
                          <td style={{padding:'7px 10px',fontSize:12}}><div className="font-mono text-[11px]" style={{color:'#7c3aed'}}>{item.account_code}</div>{item.description&&<div style={{color:'var(--color-text-muted)',fontSize:11}}>{item.description}</div>}</td>
                          <td style={{padding:'7px 10px',textAlign:'right',fontSize:12,fontWeight:item.debit_amount>0?600:400,color:item.debit_amount>0?'#7c3aed':'var(--color-text-muted)'}}>{item.debit_amount>0?formatRupiah(item.debit_amount):'-'}</td>
                          <td style={{padding:'7px 10px',textAlign:'right',fontSize:12,fontWeight:item.credit_amount>0?600:400,color:item.credit_amount>0?'#4f46e5':'var(--color-text-muted)'}}>{item.credit_amount>0?formatRupiah(item.credit_amount):'-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
