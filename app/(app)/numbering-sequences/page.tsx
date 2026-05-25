'use client';
import { useEffect, useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Seq { id: number; document_type: string; prefix: string; current_value: number; is_active: number; updated_at: string; }

const DOC_LABEL: Record<string,string> = {
  sales_order:'Sales Order', purchase_order:'Purchase Order', delivery_order:'Delivery Order',
  cash_advance:'Cash Advance', reimbursement:'Reimbursement', manual_journal:'Manual Journal',
};

export default function NumberingSequencesPage() {
  const [data, setData]     = useState<Seq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Seq | null>(null);
  const [form, setForm]     = useState({ prefix:'', current_value:'', is_active:'1' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/numbering-sequences', { credentials:'include' });
      const json = await res.json();
      if (json.success) setData(json.data ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = (s: Seq) => { setForm({ prefix: s.prefix??'', current_value: String(s.current_value??0), is_active: String(s.is_active??1) }); setEditing(s); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res  = await fetch('/api/numbering-sequences', {
        method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ document_type: editing.document_type, prefix: form.prefix, current_value: Number(form.current_value), is_active: Number(form.is_active) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Numbering sequence diperbarui');
      setEditing(null); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const nextNum = (s: Seq) => `${s.prefix ?? ''}${String((s.current_value ?? 0) + 1).padStart(4, '0')}`;

  return (
    <div className="space-y-4 max-w-[800px]">
      <div>
        <h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Numbering Sequences</h1>
        <p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>Konfigurasi format nomor dokumen</p>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead><tr><th>Tipe Dokumen</th><th>Prefix</th><th>Current Number</th><th>Nomor Berikutnya</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
              {data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-medium" style={{color:'var(--color-text)'}}>{DOC_LABEL[s.document_type] ?? s.document_type}</div>
                    <div className="text-[11px] font-mono" style={{color:'var(--color-text-muted)'}}>{s.document_type}</div>
                  </td>
                  <td><span className="font-mono text-[13px] font-semibold" style={{color:'#7c3aed'}}>{s.prefix || '-'}</span></td>
                  <td><span className="font-mono">{s.current_value ?? 0}</span></td>
                  <td>
                    <span className="font-mono text-[12px] px-2 py-0.5 rounded" style={{background:'#f5f3ff', color:'#7c3aed'}}>
                      {nextNum(s)}
                    </span>
                  </td>
                  <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td><button className="btn btn-outline btn-icon btn-sm" onClick={()=>openEdit(s)}><Pencil size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-[15px]">Edit Numbering</div>
                <div className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{DOC_LABEL[editing.document_type] ?? editing.document_type}</div>
              </div>
              <button onClick={()=>setEditing(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button>
            </div>
            <div className="space-y-3">
              <div><label className="input-label">Prefix</label><input className="input font-mono" value={form.prefix} onChange={(e)=>setForm(f=>({...f,prefix:e.target.value}))} placeholder="SO-2025-"/></div>
              <div>
                <label className="input-label">Current Value (angka terakhir yang dipakai)</label>
                <input type="number" className="input" min="0" value={form.current_value} onChange={(e)=>setForm(f=>({...f,current_value:e.target.value}))}/>
                <div className="text-[11px] mt-1" style={{color:'var(--color-text-muted)'}}>
                  Nomor berikutnya: <span className="font-mono font-semibold" style={{color:'#7c3aed'}}>{form.prefix}{String((Number(form.current_value)||0)+1).padStart(4,'0')}</span>
                </div>
              </div>
              <div>
                <label className="input-label">Status</label>
                <select className="input" value={form.is_active} onChange={(e)=>setForm(f=>({...f,is_active:e.target.value}))}>
                  <option value="1">Aktif</option><option value="0">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={()=>setEditing(null)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
