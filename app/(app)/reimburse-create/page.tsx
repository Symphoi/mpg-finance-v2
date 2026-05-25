'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { Upload, X, Plus, Trash2, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface DropData {
  categories: { category_code: string; name: string }[];
  projects:   { project_code: string; name: string }[];
  bankAccounts: { account_code: string; bank_name: string; account_number: string; account_holder: string }[];
}
interface Item { item_date: string; description: string; amount: string; attachment_path: string; }

export default function ReimburseCreatePage() {
  const router = useRouter();
  const [drops, setDrops]       = useState<DropData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading]   = useState(false);

  const [form, setForm] = useState({
    title: '', notes: '', category_code: '', project_code: '', bank_account_code: '', company_id: '',
  });
  const [items, setItems] = useState<Item[]>([
    { item_date: new Date().toISOString().split('T')[0], description: '', amount: '', attachment_path: '' }
  ]);
  const [supportDocs, setSupportDocs] = useState<{ filename: string; url: string }[]>([]);

  useEffect(() => {
    fetch('/api/reimbursements?action=dropdowns', { credentials: 'include' })
      .then((r) => r.json()).then((j) => { if (j.success) setDrops(j.data); });
  }, []);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setItem  = (i: number, k: keyof Item, v: string) =>
    setItems((items) => items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem    = () => setItems((i) => [...i, { item_date: new Date().toISOString().split('T')[0], description: '', amount: '', attachment_path: '' }]);
  const removeItem = (i: number) => setItems((it) => it.filter((_, j) => j !== i));

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'reimbursements');
      const res  = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSupportDocs((d) => [...d, { filename: file.name, url: json.data.url }]);
      toast.success('Dokumen diupload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim())           { toast.error('Judul wajib diisi'); return; }
    if (items.length === 0)           { toast.error('Minimal 1 item'); return; }
    if (items.some((i) => !i.description.trim() || !i.amount)) { toast.error('Semua item harus diisi'); return; }

    setSubmitting(true);
    try {
      const res  = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
          supporting_documents: supportDocs,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Reimbursement dibuat: ${json.data.reimbursement_code}`);
      router.push('/reimburse-approval');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[720px] space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn btn-outline btn-icon btn-sm" onClick={() => router.back()}><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Buat Reimbursement</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pengajuan penggantian biaya</p>
        </div>
      </div>

      {/* Header form */}
      <div className="card p-5 space-y-4">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Informasi Reimbursement</div>
        <div>
          <label className="input-label">Judul *</label>
          <input className="input" placeholder="Judul reimbursement..." value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Kategori</label>
            <select className="input" value={form.category_code} onChange={(e) => setField('category_code', e.target.value)}>
              <option value="">Pilih kategori</option>
              {drops?.categories.map((c) => <option key={c.category_code} value={c.category_code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Project</label>
            <select className="input" value={form.project_code} onChange={(e) => setField('project_code', e.target.value)}>
              <option value="">Pilih project</option>
              {drops?.projects.map((p) => <option key={p.project_code} value={p.project_code}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="input-label">Rekening Tujuan</label>
          <select className="input" value={form.bank_account_code} onChange={(e) => setField('bank_account_code', e.target.value)}>
            <option value="">Pilih rekening</option>
            {drops?.bankAccounts.map((b) => (
              <option key={b.account_code} value={b.account_code}>
                {b.bank_name} - {b.account_number} ({b.account_holder})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Notes / Keterangan Transfer</label>
          <textarea className="input resize-none" rows={2} placeholder="Catatan untuk transfer..." value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </div>
      </div>

      {/* Item list */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Item Pengeluaran</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Total: {formatRupiah(totalAmount)}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={addItem}><Plus size={12} /> Tambah Item</button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="p-3.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Item #{i + 1}</div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="input-label">Tanggal</label>
                  <input type="date" className="input" value={item.item_date} onChange={(e) => setItem(i, 'item_date', e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Jumlah (Rp)</label>
                  <input type="number" className="input" min="0" placeholder="0" value={item.amount} onChange={(e) => setItem(i, 'amount', e.target.value)} />
                  {item.amount && Number(item.amount) > 0 && (
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatRupiah(Number(item.amount))}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="input-label">Deskripsi</label>
                <input className="input" placeholder="Deskripsi pengeluaran..." value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
          <div className="text-[12.5px] font-semibold" style={{ color: '#7c3aed' }}>Total Reimbursement</div>
          <div className="text-[16px] font-bold" style={{ color: '#7c3aed' }}>{formatRupiah(totalAmount)}</div>
        </div>
      </div>

      {/* Dokumen pendukung */}
      <div className="card p-5">
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text)' }}>Dokumen Pendukung</div>
        <label className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed cursor-pointer hover:border-purple-400 transition-all"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
          <Upload size={18} style={{ color: 'var(--color-text-muted)' }} className="mb-1.5" />
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {uploading ? 'Mengupload...' : 'Upload bukti / nota / invoice'}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PDF, JPG, PNG max 10MB</div>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUploadDoc} disabled={uploading} />
        </label>
        {supportDocs.map((d, i) => (
          <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border mt-2 text-[12px]" style={{ borderColor: 'var(--color-border)' }}>
            <FileText size={13} style={{ color: '#7c3aed' }} />
            <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{d.filename}</span>
            <button onClick={() => setSupportDocs((d) => d.filter((_, j) => j !== i))}><X size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn btn-outline" onClick={() => router.back()}>Batal</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Ajukan Reimbursement'}
        </button>
      </div>
    </div>
  );
}
