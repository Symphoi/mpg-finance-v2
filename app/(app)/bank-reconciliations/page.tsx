'use client';
import { useState, useEffect, useRef } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, Eye, X, Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Recon {
  id: number;
  reconciliation_code: string;
  bank_account_code: string;
  bank_name: string;
  account_number: string;
  period_start: string;
  period_end: string;
  bank_balance: number;
  book_balance: number;
  difference: number;
  status: string;
  notes: string;
  created_by: string;
  created_at: string;
}

interface Bank { account_code: string; bank_name: string; account_number: string; }

interface ReconItem {
  id: number;
  source: 'bank' | 'book';
  transaction_date: string;
  reference_number: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  journal_code: string | null;
  match_status: 'matched' | 'unmatched';
}

interface ImportGroupResult {
  account_code: string;
  period: string;
  reconciliation_code: string;
  matched: number;
  unmatched_bank: number;
  unmatched_book: number;
  status: 'ok' | 'error';
  message?: string;
}

interface ImportResponse {
  total: number;
  success: number;
  failed: number;
  results: ImportGroupResult[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:        { label: 'Draft',       cls: 'badge-amber' },
  reconciled:   { label: 'Reconciled',  cls: 'badge-green' },
  unreconciled: { label: 'Selisih',     cls: 'badge-red'   },
};

function downloadTemplate() {
  const header = 'account_code,period_start,period_end,transaction_date,reference_number,description,debit_amount,credit_amount';
  const row1   = '10020-00,2026-05-01,2026-05-31,2026-05-03,INV-2026-001,Pembayaran Invoice PT ABC,5000000,0';
  const row2   = '10020-00,2026-05-01,2026-05-31,2026-05-07,PO-2026-045,Bayar Vendor XYZ,0,2500000';
  const csv    = [header, row1, row2].join('\n');
  const blob   = new Blob([csv], { type: 'text/csv' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url; a.download = 'template-rekonsiliasi-bank.csv';
  a.click(); URL.revokeObjectURL(url);
}

/* ─── DetailDrawer ──────────────────────────────────────────────────────────── */
function DetailDrawer({ rec, onClose }: { rec: Recon; onClose: () => void }) {
  const [items, setItems]     = useState<{ matched: ReconItem[]; unmatched_bank: ReconItem[]; unmatched_book: ReconItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'matched' | 'unmatched_bank' | 'unmatched_book'>('matched');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bank-reconciliations/${rec.reconciliation_code}/items`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data ?? null); })
      .finally(() => setLoading(false));
  }, [rec.reconciliation_code]);

  const matched       = items?.matched       ?? [];
  const unmatchedBank = items?.unmatched_bank ?? [];
  const unmatchedBook = items?.unmatched_book ?? [];

  const tabs: { key: typeof tab; label: string; count: number; color: string }[] = [
    { key: 'matched',        label: 'Matched',        count: matched.length,       color: '#059669' },
    { key: 'unmatched_bank', label: 'Unmatched Bank', count: unmatchedBank.length, color: '#d97706' },
    { key: 'unmatched_book', label: 'Unmatched Buku', count: unmatchedBook.length, color: '#dc2626' },
  ];

  const activeRows = tab === 'matched' ? matched : tab === 'unmatched_bank' ? unmatchedBank : unmatchedBook;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: 580, borderLeft: '1px solid var(--color-border-soft)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--color-text)' }}>
              {rec.reconciliation_code}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {rec.bank_name || rec.bank_account_code}
              {rec.account_number && <span className="font-mono ml-1">· {rec.account_number}</span>}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(rec.period_start)} — {formatDate(rec.period_end)}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Balance summary strip */}
        <div className="flex px-5 py-3" style={{ background: '#F5F4FF', borderBottom: '1px solid var(--color-border-soft)' }}>
          {[
            { label: 'Saldo Bank', value: formatRupiah(rec.bank_balance), color: 'var(--color-text)' },
            { label: 'Saldo Buku', value: formatRupiah(rec.book_balance), color: 'var(--color-text)' },
            { label: 'Selisih',    value: rec.difference === 0 ? 'Seimbang ✓' : formatRupiah(Math.abs(rec.difference)), color: rec.difference === 0 ? '#059669' : '#dc2626' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 text-center">
              <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1" style={{ borderBottom: '1px solid var(--color-border-soft)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors"
              style={{
                color:        tab === t.key ? t.color : 'var(--color-text-muted)',
                background:   tab === t.key ? '#fff' : 'transparent',
                borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              }}
            >
              {t.label}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ background: tab === t.key ? t.color + '22' : '#F0F0F0', color: tab === t.key ? t.color : '#888' }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : activeRows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              Tidak ada data
            </div>
          ) : (
            <table className="tbl" style={{ fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Ref</th>
                  <th>Deskripsi</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Kredit</th>
                  <th>{tab === 'matched' ? 'Journal' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map(item => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.transaction_date)}</td>
                    <td>
                      <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.reference_number || '—'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '—'}
                    </td>
                    <td className="text-right tbl-mono">
                      {item.debit_amount > 0 ? formatRupiah(item.debit_amount) : '—'}
                    </td>
                    <td className="text-right tbl-mono">
                      {item.credit_amount > 0 ? formatRupiah(item.credit_amount) : '—'}
                    </td>
                    <td>
                      {tab === 'matched' && (
                        <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-primary)' }}>
                          {item.journal_code || '—'}
                        </span>
                      )}
                      {tab === 'unmatched_bank' && (
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>Tidak ada di jurnal</span>
                      )}
                      {tab === 'unmatched_book' && (
                        <span className="badge badge-red" style={{ fontSize: 10 }}>Tidak ada di bank</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function BankReconciliationsPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<Recon>('/api/bank-reconciliations');
  const [banks, setBanks]               = useState<Bank[]>([]);
  const [detail, setDetail]             = useState<Recon | null>(null);
  const [drawerRec, setDrawerRec]       = useState<Recon | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [form, setForm]                 = useState({ account_code: '', period_start: '', period_end: '', bank_balance: '', notes: '' });
  const [bookBalance, setBookBalance]   = useState<number | null>(null);
  const [loadingBook, setLoadingBook]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirming, setConfirming]     = useState<number | null>(null);
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/bank-accounts?limit=100', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (j.success) setBanks(j.data ?? []); });
  }, []);

  useEffect(() => {
    const { account_code, period_start, period_end } = form;
    if (!account_code || !period_start || !period_end) { setBookBalance(null); return; }
    setLoadingBook(true);
    fetch(`/api/bank-reconciliations?action=book_balance&account_code=${account_code}&from=${period_start}&to=${period_end}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setBookBalance(Number(j.data.balance)); })
      .finally(() => setLoadingBook(false));
  }, [form.account_code, form.period_start, form.period_end]);

  const bankBalance = Number(form.bank_balance || 0);
  const difference  = bookBalance != null ? bankBalance - bookBalance : null;

  const save = async () => {
    if (!form.account_code || !form.period_start || !form.period_end) { toast.error('Akun, periode awal, dan akhir wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/bank-reconciliations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, bank_balance: bankBalance, book_balance: bookBalance }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Rekonsiliasi dibuat');
      setShowCreate(false);
      setForm({ account_code: '', period_start: '', period_end: '', bank_balance: '', notes: '' });
      setBookBalance(null);
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const confirm = async (rec: Recon) => {
    setConfirming(rec.id);
    try {
      const newStatus = rec.difference === 0 ? 'reconciled' : 'unreconciled';
      const res = await fetch('/api/bank-reconciliations', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, bank_balance: rec.bank_balance, book_balance: rec.book_balance, notes: rec.notes, status: newStatus }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(newStatus === 'reconciled' ? 'Rekonsiliasi dikonfirmasi ✓' : 'Ditandai sebagai Selisih');
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setConfirming(null);
  };

  const handleImport = async () => {
    if (!importFile) { toast.error('Pilih file CSV terlebih dahulu'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/bank-reconciliations/import', { method: 'POST', credentials: 'include', body: fd });
      const j   = await res.json();
      if (!j.success) throw new Error(j.error);
      setImportResult(j.data);
      if (j.data.success > 0) refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal import'); }
    setImporting(false);
  };

  return (
    <div className="space-y-4 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Rekonsiliasi Bank</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} rekonsiliasi</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
            <Download size={13} /> Template
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}>
            <Upload size={13} /> Import CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Buat Rekonsiliasi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Periode</th>
                <th className="text-right">Saldo Bank</th>
                <th className="text-right">Saldo Buku</th>
                <th className="text-right">Selisih</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Belum ada rekonsiliasi</td></tr>}
              {data.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{r.bank_name || r.bank_account_code}</div>
                    {r.account_number && <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{r.account_number}</div>}
                  </td>
                  <td><div className="text-[12px]">{formatDate(r.period_start)} — {formatDate(r.period_end)}</div></td>
                  <td className="text-right tbl-mono">{formatRupiah(r.bank_balance)}</td>
                  <td className="text-right tbl-mono">{formatRupiah(r.book_balance)}</td>
                  <td className="text-right">
                    <span style={{ color: r.difference === 0 ? '#059669' : '#dc2626', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(r.difference))} ${r.difference > 0 ? '(lebih)' : '(kurang)'}`}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_LABEL[r.status]?.cls ?? 'badge-gray'}`}>
                      {STATUS_LABEL[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{formatDate(r.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setDrawerRec(r)}
                        title="Lihat Detail Transaksi"
                      >
                        <Eye size={12} /> Lihat Detail
                      </button>
                      {r.status === 'draft' && (
                        <button
                          className={`btn btn-sm ${r.difference === 0 ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => confirm(r)}
                          disabled={confirming === r.id}
                        >
                          {confirming === r.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : r.difference === 0 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          {r.difference === 0 ? 'Konfirmasi' : 'Selisih'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Buat Rekonsiliasi Bank</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="input-label">Rekening Bank *</label>
                <select className="input" value={form.account_code} onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))}>
                  <option value="">Pilih rekening</option>
                  {banks.map(b => <option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Periode Awal *</label>
                  <input type="date" className="input" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Periode Akhir *</label>
                  <input type="date" className="input" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="input-label">Saldo Bank (dari mutasi rekening)</label>
                <input type="number" className="input" min="0" placeholder="0" value={form.bank_balance} onChange={e => setForm(f => ({ ...f, bank_balance: e.target.value }))} />
              </div>

              <div className="p-3 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #EAE8FF' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-primary)' }}>Saldo Buku (dari jurnal)</span>
                  {loadingBook
                    ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    : bookBalance != null
                      ? <span className="text-[13px] font-bold tbl-mono" style={{ color: 'var(--color-primary)' }}>{formatRupiah(bookBalance)}</span>
                      : <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Pilih akun & periode</span>
                  }
                </div>
              </div>

              {difference != null && form.bank_balance !== '' && (
                <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: difference === 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${difference === 0 ? '#a7f3d0' : '#fecaca'}` }}>
                  <span className="text-[12.5px] font-semibold" style={{ color: difference === 0 ? '#059669' : '#dc2626' }}>Selisih</span>
                  <span className="text-[13px] font-bold" style={{ color: difference === 0 ? '#059669' : '#dc2626' }}>
                    {difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(difference))} ${difference > 0 ? '(Bank lebih)' : '(Buku lebih)'}`}
                  </span>
                </div>
              )}

              <div>
                <label className="input-label">Catatan</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Import Rekonsiliasi Bank</div>
              <button onClick={() => setShowImport(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="p-3 rounded-xl mb-4" style={{ background: '#F5F3FF', border: '1px solid #EAE8FF' }}>
              <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Format CSV (8 kolom per transaksi)</div>
              <code className="text-[10px]" style={{ color: 'var(--color-text-secondary)', display: 'block', lineHeight: 1.9 }}>
                account_code, period_start, period_end, transaction_date,<br />
                reference_number, description, debit_amount, credit_amount
              </code>
              <div className="text-[10.5px] mt-2 space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <div>• Satu baris = satu transaksi bank statement</div>
                <div>• Auto-match berdasarkan <strong>reference_number</strong> ke kode referensi jurnal</div>
                <div>• Gunakan tombol <strong>Template</strong> untuk download contoh file</div>
              </div>
            </div>

            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer"
              style={{ border: '2px dashed #DDD6FE', padding: '24px 16px', background: importFile ? '#F5F3FF' : '#FAFAFF' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={20} style={{ color: 'var(--color-primary)' }} />
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>
                {importFile ? importFile.name : 'Klik untuk pilih file CSV'}
              </span>
              {importFile && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{(importFile.size / 1024).toFixed(1)} KB</span>}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
            </div>

            {importResult && (
              <div className="mt-3 p-3 rounded-xl space-y-2" style={{ background: '#F9FAFB', border: '1px solid #EAE8FF' }}>
                <div className="flex gap-3 text-[12px] font-semibold">
                  <span style={{ color: '#059669' }}>✓ {importResult.success} rekonsiliasi dibuat</span>
                  {importResult.failed > 0 && <span style={{ color: '#dc2626' }}>✗ {importResult.failed} gagal</span>}
                </div>
                {importResult.results.map((r, i) => (
                  <div key={i} className="text-[11px] pt-2" style={{ borderTop: '1px solid #EAE8FF' }}>
                    {r.status === 'error' ? (
                      <div style={{ color: '#dc2626' }}>• {r.account_code} ({r.period}): {r.message}</div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-medium" style={{ color: 'var(--color-text)' }}>{r.account_code} — {r.period}</div>
                        <div className="flex gap-2 flex-wrap mt-1">
                          <span className="badge badge-green" style={{ fontSize: 10 }}>✓ {r.matched} matched</span>
                          {r.unmatched_bank > 0 && <span className="badge badge-amber" style={{ fontSize: 10 }}>{r.unmatched_bank} unmatched bank</span>}
                          {r.unmatched_book > 0 && <span className="badge badge-red" style={{ fontSize: 10 }}>{r.unmatched_book} unmatched buku</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4 justify-between">
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}><Download size={12} /> Template</button>
              <div className="flex gap-2">
                <button className="btn btn-outline" onClick={() => setShowImport(false)}>Tutup</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={importing || !importFile}>
                  {importing ? <><Loader2 size={12} className="animate-spin" /> Mengimport...</> : <><Upload size={12} /> Import</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal (summary) ────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-[15px]">Detail Rekonsiliasi</div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{detail.reconciliation_code}</div>
              </div>
              <button onClick={() => setDetail(null)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-2 text-[13px]">
              {([
                ['Bank',         detail.bank_name || detail.bank_account_code],
                ['No. Rekening', detail.account_number || '—'],
                ['Periode',      `${formatDate(detail.period_start)} — ${formatDate(detail.period_end)}`],
                ['Saldo Bank',   formatRupiah(detail.bank_balance)],
                ['Saldo Buku',   formatRupiah(detail.book_balance)],
                ['Selisih',      detail.difference === 0 ? 'Seimbang ✓' : `${formatRupiah(Math.abs(detail.difference))} ${detail.difference > 0 ? '(Bank lebih)' : '(Buku lebih)'}`],
                ['Status',       STATUS_LABEL[detail.status]?.label ?? detail.status],
                ['Dibuat',       formatDate(detail.created_at)],
                ['Catatan',      detail.notes || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span className="font-medium text-right" style={{ color: k === 'Selisih' ? (detail.difference === 0 ? '#059669' : '#dc2626') : 'var(--color-text)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {drawerRec && (
        <DetailDrawer rec={drawerRec} onClose={() => setDrawerRec(null)} />
      )}
    </div>
  );
}
