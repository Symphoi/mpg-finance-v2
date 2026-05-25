'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { Upload, X, Plus, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Project { project_code: string; name: string; }
interface BankAccount { account_code: string; bank_name: string; account_number: string; account_holder: string; }

export default function CACreatePage() {
  const router = useRouter();
  const [dropdowns, setDropdowns] = useState<{ projects: Project[]; bankAccounts: BankAccount[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employee_name: '', department: '', purpose: '',
    total_amount: '', project_code: '', bank_account_code: '', notes: '',
  });
  const [docs, setDocs] = useState<{ filename: string; url: string; size: number; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/cash-advances?action=dropdowns', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setDropdowns(j.data); });
  }, []);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'cash-advances');
      const res  = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDocs((d) => [...d, { filename: file.name, url: json.data.url, size: file.size, type: file.type }]);
      toast.success('File diupload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!form.employee_name.trim()) { toast.error('Nama karyawan wajib diisi'); return; }
    if (!form.purpose.trim())       { toast.error('Keperluan wajib diisi'); return; }
    if (!form.total_amount || Number(form.total_amount) <= 0) { toast.error('Total amount tidak valid'); return; }

    setSubmitting(true);
    try {
      const res  = await fetch('/api/cash-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          total_amount: Number(form.total_amount),
          document_urls: docs,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`CA berhasil dibuat: ${json.data.ca_code}`);
      router.push('/ca-transactions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat CA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[680px] space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn btn-outline btn-icon btn-sm" onClick={() => router.back()}><ArrowLeft size={14} /></button>
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Buat Cash Advance</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pengajuan uang muka baru</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>Informasi Pengaju</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Nama Karyawan *</label>
            <input className="input" placeholder="Nama lengkap" value={form.employee_name} onChange={(e) => setField('employee_name', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Department</label>
            <input className="input" placeholder="Nama department" value={form.department} onChange={(e) => setField('department', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="input-label">Keperluan / Tujuan *</label>
          <textarea className="input resize-none" rows={3} placeholder="Jelaskan keperluan cash advance..." value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Total Amount *</label>
            <input className="input" type="number" min="0" placeholder="0" value={form.total_amount} onChange={(e) => setField('total_amount', e.target.value)} />
            {form.total_amount && Number(form.total_amount) > 0 && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{formatRupiah(Number(form.total_amount))}</div>
            )}
          </div>
          <div>
            <label className="input-label">Project</label>
            <select className="input" value={form.project_code} onChange={(e) => setField('project_code', e.target.value)}>
              <option value="">Pilih project</option>
              {dropdowns?.projects.map((p) => <option key={p.project_code} value={p.project_code}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="input-label">Rekening Bank</label>
          <select className="input" value={form.bank_account_code} onChange={(e) => setField('bank_account_code', e.target.value)}>
            <option value="">Pilih rekening</option>
            {dropdowns?.bankAccounts.map((b) => (
              <option key={b.account_code} value={b.account_code}>
                {b.bank_name} - {b.account_number} ({b.account_holder})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Notes</label>
          <textarea className="input resize-none" rows={2} placeholder="Catatan tambahan..." value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </div>
      </div>

      {/* Upload dokumen */}
      <div className="card p-5">
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--color-text)' }}>Dokumen Pendukung</div>
        <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-purple-400"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
          <Upload size={20} style={{ color: 'var(--color-text-muted)' }} className="mb-2" />
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {uploading ? 'Mengupload...' : 'Klik untuk upload dokumen'}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PDF, JPG, PNG max 10MB</div>
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} disabled={uploading} />
        </label>

        {docs.length > 0 && (
          <div className="mt-3 space-y-2">
            {docs.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <FileText size={14} style={{ color: '#7c3aed' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{d.filename}</div>
                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{(d.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => setDocs((docs) => docs.filter((_, j) => j !== i))}>
                  <X size={13} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn btn-outline" onClick={() => router.back()}>Batal</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Ajukan Cash Advance'}
        </button>
      </div>
    </div>
  );
}
