'use client';
import { useEffect, useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Seq { sequence_code: string; prefix: string; next_number: number; description: string; updated_at: string; }

const DOC_LABEL: Record<string,string> = {
  SO:'Sales Order', PO:'Purchase Order', INV:'Invoice', PAY:'Payment',
  CA:'Cash Advance', REIMB:'Reimbursement', AR:'Accounts Receivable',
  AP:'Accounts Payable', JNL:'Manual Journal',
};

export default function NumberingSequencesPage() {
  const [data, setData]     = useState<Seq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Seq | null>(null);
  const [form, setForm]     = useState({ prefix:'', next_number:'' });
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

  const openEdit = (s: Seq) => { setForm({ prefix: s.prefix??'', next_number: String(s.next_number??1) }); setEditing(s); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res  = await fetch('/api/numbering-sequences', {
        method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ sequence_code: editing.sequence_code, prefix: form.prefix, next_number: Number(form.next_number) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Numbering sequence diperbarui');
      setEditing(null); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const nextNum = (s: Seq) => `${s.prefix ?? ''}${String(s.next_number ?? 1).padStart(4, '0')}`;

  return (
    <div className="space-y-4 max-w-[800px]">
      <div>
        <h1 className="text-[19px] font-bold" style={{color:'var(--color-text)'}}>Numbering Sequences</h1>
        <p className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>Konfigurasi format nomor dokumen</p>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Deskripsi</th><th>Prefix</th><th>Nomor Berikutnya</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8" style={{color:'var(--color-text-muted)'}}>Memuat...</td></tr>}
              {data.map((s) => (
                <tr key={s.sequence_code}>
                  <td><span className="font-mono font-semibold text-[13px]" style={{color:'#7c3aed'}}>{s.sequence_code}</span></td>
                  <td>
                    <div className="font-medium" style={{color:'var(--color-text)'}}>{DOC_LABEL[s.sequence_code] ?? s.description}</div>
                  </td>
                  <td><span className="font-mono text-[13px]">{s.prefix || '-'}</span></td>
                  <td>
                    <span className="font-mono text-[12px] px-2 py-0.5 rounded" style={{background:'#f5f3ff', color:'#7c3aed'}}>
                      {nextNum(s)}
                    </span>
                  </td>
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
                <div className="text-[12px] mt-0.5" style={{color:'var(--color-text-muted)'}}>{DOC_LABEL[editing.sequence_code] ?? editing.description} ({editing.sequence_code})</div>
              </div>
              <button onClick={()=>setEditing(null)}><X size={15} style={{color:'var(--color-text-muted)'}}/></button>
            </div>
            <div className="space-y-3">
              <div><label className="input-label">Prefix</label><input className="input font-mono" value={form.prefix} onChange={(e)=>setForm(f=>({...f,prefix:e.target.value}))} placeholder="SO-2025-"/></div>
              <div>
                <label className="input-label">Next Number (nomor yang akan digunakan berikutnya)</label>
                <input type="number" className="input" min="1" value={form.next_number} onChange={(e)=>setForm(f=>({...f,next_number:e.target.value}))}/>
                <div className="text-[11px] mt-1" style={{color:'var(--color-text-muted)'}}>
                  Preview: <span className="font-mono font-semibold" style={{color:'#7c3aed'}}>{form.prefix}{String(Number(form.next_number)||1).padStart(4,'0')}</span>
                </div>
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
