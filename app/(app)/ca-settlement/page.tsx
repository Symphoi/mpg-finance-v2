'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, CA_STATUS } from '@/lib/utils';
import { Plus, Eye, X, ChevronLeft, ChevronRight, Trash2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CA {
  id: number; ca_code: string; employee_name: string; purpose: string;
  total_amount: number; used_amount: number; remaining_amount: number;
  status: string; request_date: string; approved_by: string;
}

interface Settlement {
  id: number; settlement_code: string; ca_code: string; employee_name: string;
  total_expense: number; remaining_amount: number; remaining_action: string;
  notes: string; settled_by: string; settled_at: string; ca_status: string;
}

const EXPENSE_CATEGORIES = ['Transportasi','Akomodasi','Makan','Perlengkapan','Komunikasi','Lain-lain'];

export default function CASettlementPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<Settlement>('/api/ca-settlement');
  const [showForm, setShowForm]   = useState(false);
  const [caList, setCaList]       = useState<CA[]>([]);
  const [selectedCA, setSelectedCA] = useState<CA | null>(null);
  const [items, setItems]         = useState([{ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', receipt_url: '' }]);
  const [remainingAction, setRemainingAction] = useState<'return'|'use_next'>('return');
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openForm = async () => {
    const res  = await fetch('/api/cash-advances?status=active&limit=100', { credentials: 'include' });
    const json = await res.json();
    if (json.success) setCaList(json.data ?? []);
    setShowForm(true);
  };

  const addItem    = () => setItems((i) => [...i, { date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', receipt_url: '' }]);
  const removeItem = (i: number) => setItems((it) => it.filter((_, j) => j !== i));
  const setItem    = (i: number, k: string, v: string) => setItems((it) => it.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const totalExpense   = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const remaining      = selectedCA ? selectedCA.total_amount - totalExpense : 0;

  const handleSubmit = async () => {
    if (!selectedCA)                   { toast.error('Pilih CA terlebih dahulu'); return; }
    if (items.some((i) => !i.description || !i.amount)) { toast.error('Semua item harus diisi'); return; }

    setSubmitting(true);
    try {
      const res  = await fetch('/api/ca-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ca_code:          selectedCA.ca_code,
          expense_items:    items.map((i) => ({ ...i, amount: Number(i.amount) })),
          remaining_action: remainingAction,
          notes,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Settlement berhasil dibuat: ${json.data.settlement_code}`);
      setShowForm(false);
      setSelectedCA(null);
      setItems([{ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', receipt_url: '' }]);
      setNotes('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>CA Settlement</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pertanggungjawaban cash advance</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openForm}><Plus size={13} /> Buat Settlement</button>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode Settlement</th>
                <th>CA Code</th>
                <th>Karyawan</th>
                <th className="text-right">Total Expense</th>
                <th className="text-right">Sisa</th>
                <th>Aksi Sisa</th>
                <th>Status CA</th>
                <th>Diselesaikan Oleh</th>
                <th>Tgl</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Belum ada settlement</td></tr>}
              {data.map((s) => {
                const caSt = CA_STATUS[s.ca_status] ?? { label: s.ca_status, color: 'gray' };
                return (
                  <tr key={s.id}>
                    <td><span className="tbl-mono">{s.settlement_code}</span></td>
                    <td><span className="text-[11.5px]" style={{ color: '#059669' }}>{s.ca_code}</span></td>
                    <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{s.employee_name}</div></td>
                    <td className="text-right font-semibold">{formatRupiah(s.total_expense)}</td>
                    <td className="text-right" style={{ color: s.remaining_amount > 0 ? '#d97706' : '#059669' }}>
                      {formatRupiah(s.remaining_amount)}
                    </td>
                    <td>
                      <span className={`badge ${s.remaining_action === 'return' ? 'badge-blue' : 'badge-purple'}`}>
                        {s.remaining_action === 'return' ? 'Dikembalikan' : 'Lanjut'}
                      </span>
                    </td>
                    <td><span className={`badge badge-${caSt.color}`}>{caSt.label}</span></td>
                    <td>{s.settled_by || '-'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(s.settled_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
          <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {meta.total > 0 ? `${((meta.page-1)*meta.limit)+1}–${Math.min(meta.page*meta.limit,meta.total)} dari ${meta.total}` : '0 data'}
          </div>
          <div className="pagination">
            <button className="page-btn" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}><ChevronLeft size={13} /></button>
            <button className="page-btn" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {/* Create Settlement Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-bold text-[15px]">Buat CA Settlement</div>
              <button onClick={() => setShowForm(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pick CA */}
              <div>
                <label className="input-label">Pilih Cash Advance *</label>
                <select className="input" value={selectedCA?.ca_code ?? ''} onChange={(e) => {
                  const ca = caList.find((c) => c.ca_code === e.target.value) ?? null;
                  setSelectedCA(ca);
                }}>
                  <option value="">-- Pilih CA Aktif --</option>
                  {caList.map((ca) => (
                    <option key={ca.ca_code} value={ca.ca_code}>
                      {ca.ca_code} · {ca.employee_name} · {formatRupiah(ca.remaining_amount)} tersisa
                    </option>
                  ))}
                </select>
              </div>

              {selectedCA && (
                <div className="p-3 rounded-xl" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: '#7c3aed' }}>Total CA: {formatRupiah(selectedCA.total_amount)}</span>
                    <span style={{ color: '#059669' }}>Sisa: {formatRupiah(selectedCA.remaining_amount)}</span>
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: '#7c3aed' }}>{selectedCA.purpose}</div>
                </div>
              )}

              {/* Expense items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="input-label" style={{ margin: 0 }}>Item Pengeluaran *</label>
                  <button className="btn btn-outline btn-sm" onClick={addItem}><Plus size={11} /> Tambah</button>
                </div>
                <div className="space-y-2.5">
                  {items.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="input-label">Tanggal</label>
                          <input type="date" className="input" value={item.date} onChange={(e) => setItem(i, 'date', e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label">Kategori</label>
                          <select className="input" value={item.category} onChange={(e) => setItem(i, 'category', e.target.value)}>
                            <option value="">Pilih</option>
                            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="input-label">Deskripsi</label>
                          <input className="input" placeholder="Deskripsi pengeluaran" value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label">Jumlah (Rp)</label>
                          <div className="flex gap-1.5">
                            <input type="number" className="input flex-1" min="0" placeholder="0" value={item.amount} onChange={(e) => setItem(i, 'amount', e.target.value)} />
                            {items.length > 1 && (
                              <button onClick={() => removeItem(i)} className="btn btn-icon btn-sm" style={{ color: '#dc2626', border: '1px solid #fecaca' }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          {item.amount && <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatRupiah(Number(item.amount))}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-xl" style={{ background: '#f9f8ff', border: '1px solid var(--color-border)' }}>
                <div className="flex justify-between text-[12.5px] font-semibold">
                  <span>Total Expense</span>
                  <span style={{ color: '#7c3aed' }}>{formatRupiah(totalExpense)}</span>
                </div>
                {selectedCA && (
                  <div className="flex justify-between text-[12px] mt-1" style={{ color: remaining >= 0 ? '#059669' : '#dc2626' }}>
                    <span>{remaining >= 0 ? 'Sisa dikembalikan' : 'Kelebihan pakai'}</span>
                    <span>{formatRupiah(Math.abs(remaining))}</span>
                  </div>
                )}
              </div>

              {/* Remaining action */}
              {remaining > 0 && (
                <div>
                  <label className="input-label">Aksi Sisa Dana</label>
                  <div className="flex gap-2">
                    {[['return','Kembalikan ke kas'],['use_next','Gunakan untuk CA berikutnya']].map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg flex-1 border text-[12px]"
                        style={{ borderColor: remainingAction === v ? '#a78bfa' : 'var(--color-border)', background: remainingAction === v ? '#f5f3ff' : '#fff' }}>
                        <input type="radio" name="remaining_action" value={v} checked={remainingAction === v}
                          onChange={() => setRemainingAction(v as any)} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Catatan settlement..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Submit Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
