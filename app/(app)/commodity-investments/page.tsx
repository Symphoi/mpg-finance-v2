'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Plus, X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface Investment {
  id: number;
  investment_code: string;
  commodity_type: 'gold' | 'wood';
  project_code: string | null;
  project_name: string | null;
  invest_date: string;
  modal_amount: number;
  total_return: number;
  total_expenses: number;
  notes: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

interface ReturnEntry {
  id: number;
  return_code: string;
  return_date: string;
  amount: number;
  notes: string | null;
}

interface Expense {
  id: number;
  expense_code: string;
  expense_date: string;
  description: string;
  amount: number;
  notes: string | null;
}

interface Project    { project_code: string; name: string; }
interface BankAccount { account_code: string; bank_name: string; account_number: string; }

interface Summary {
  total_modal: number;
  total_return: number;
  total_expenses: number;
  profit_loss: number;
  total_count: number;
  active_count: number;
}

const COMMODITY: Record<string, { label: string; cls: string; bg: string; color: string }> = {
  gold: { label: 'Emas', cls: 'badge-amber', bg: '#fffbeb', color: '#d97706' },
  wood: { label: 'Kayu', cls: 'badge-green', bg: '#f0fdf4', color: '#16a34a' },
};

const STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Aktif',   cls: 'badge-amber' },
  completed: { label: 'Selesai', cls: 'badge-green' },
  cancelled: { label: 'Batal',   cls: 'badge-red'   },
};

/* ─── Detail Drawer ─────────────────────────────────────────────────────────── */
function DetailDrawer({ inv, onClose, onUpdated, banks }: { inv: Investment; onClose: () => void; onUpdated: () => void; banks: BankAccount[] }) {
  const [returns, setReturns]         = useState<ReturnEntry[]>([]);
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'returns' | 'expenses'>('returns');
  const [showForm, setShowForm]       = useState(false);
  const [returnForm, setReturnForm]   = useState({ return_date: '', amount: '', bank_account_code: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ expense_date: '', description: '', amount: '', bank_account_code: '', notes: '' });
  const [saving, setSaving]           = useState(false);
  const [updatingStatus, setUpdating] = useState(false);
  const [localInv, setLocalInv]       = useState(inv);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit        = localInv.total_return - localInv.modal_amount - totalExpenses;
  const progress      = localInv.modal_amount > 0
    ? Math.min(100, (localInv.total_return / localInv.modal_amount) * 100)
    : 0;

  const fetchAll = async () => {
    setLoading(true);
    const [retRes, expRes] = await Promise.all([
      fetch(`/api/commodity-investments/${inv.investment_code}/returns`,  { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/commodity-investments/${inv.investment_code}/expenses`, { credentials: 'include' }).then(r => r.json()),
    ]);
    if (retRes.success) setReturns(retRes.data ?? []);
    if (expRes.success) setExpenses(expRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [inv.investment_code]);

  const addReturn = async () => {
    if (!returnForm.return_date || !returnForm.amount) { toast.error('Tanggal dan jumlah wajib'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/commodity-investments/${inv.investment_code}/returns`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...returnForm, amount: Number(returnForm.amount) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Return dicatat');
      setLocalInv(prev => ({ ...prev, total_return: j.data.total_return }));
      setReturnForm({ return_date: '', amount: '', bank_account_code: '', notes: '' });
      setShowForm(false);
      fetchAll(); onUpdated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const addExpense = async () => {
    if (!expenseForm.expense_date || !expenseForm.description || !expenseForm.amount) {
      toast.error('Tanggal, deskripsi, dan jumlah wajib'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/commodity-investments/${inv.investment_code}/expenses`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Biaya dicatat');
      setExpenseForm({ expense_date: '', description: '', amount: '', bank_account_code: '', notes: '' });
      setShowForm(false);
      fetchAll(); onUpdated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/commodity-investments/${inv.investment_code}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success(status === 'completed' ? 'Investasi ditandai selesai' : 'Investasi dibatalkan');
      setLocalInv(prev => ({ ...prev, status: status as Investment['status'] }));
      onUpdated();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setUpdating(false);
  };

  const commodity = COMMODITY[localInv.commodity_type];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl" style={{ width: 580, borderLeft: '1px solid var(--color-border-soft)' }}>

        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>{localInv.investment_code}</span>
              <span className={`badge ${commodity.cls}`}>{commodity.label}</span>
              <span className={`badge ${STATUS[localInv.status]?.cls}`}>{STATUS[localInv.status]?.label}</span>
            </div>
            {localInv.project_name && (
              <div className="text-[12px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Project: {localInv.project_name}</div>
            )}
            <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Tanggal invest: {formatDate(localInv.invest_date)}</div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Balance strip — 2x2 */}
        <div className="grid grid-cols-2 divide-x divide-y" style={{ borderBottom: '1px solid var(--color-border-soft)', background: '#F9F8FF' }}>
          {[
            { label: 'Modal',            value: formatRupiah(localInv.modal_amount),  color: 'var(--color-text)' },
            { label: 'Total Return',     value: formatRupiah(localInv.total_return),  color: '#059669' },
            { label: 'Biaya Operasional',value: formatRupiah(totalExpenses),          color: '#dc2626' },
            {
              label: 'Profit / Loss',
              value: profit === 0 ? 'Impas' : formatRupiah(Math.abs(profit)),
              color: profit > 0 ? '#059669' : profit < 0 ? '#dc2626' : 'var(--color-text)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 text-center">
              <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <span>Progress balik modal</span>
            <span className="font-semibold" style={{ color: progress >= 100 ? '#059669' : commodity.color }}>
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: progress >= 100 ? '#059669' : commodity.color }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-2 gap-1" style={{ borderBottom: '1px solid var(--color-border-soft)', paddingBottom: 0 }}>
          {[
            { key: 'returns',  label: 'Riwayat Return',     count: returns.length,  color: '#059669' },
            { key: 'expenses', label: 'Biaya Operasional',  count: expenses.length, color: '#dc2626' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key as typeof tab); setShowForm(false); }}
              className="px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors"
              style={{
                color:        tab === t.key ? t.color : 'var(--color-text-muted)',
                background:   tab === t.key ? '#fff' : 'transparent',
                borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              }}
            >
              {t.label}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ background: tab === t.key ? t.color + '22' : '#F0F0F0', color: tab === t.key ? t.color : '#888' }}>
                {t.count}
              </span>
            </button>
          ))}
          {localInv.status === 'active' && (
            <button
              className="ml-auto mb-1 btn btn-primary btn-sm"
              onClick={() => setShowForm(v => !v)}
            >
              <Plus size={11} /> {tab === 'returns' ? 'Tambah Return' : 'Tambah Biaya'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">

          {/* Inline form */}
          {showForm && localInv.status === 'active' && (
            <div className="mx-4 my-3 p-4 rounded-xl" style={{ background: '#F5F3FF', border: '1px solid #EAE8FF' }}>
              <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>
                {tab === 'returns' ? 'Catat Return Baru' : 'Catat Biaya Operasional'}
              </div>
              {tab === 'returns' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label">Tanggal *</label>
                      <input type="date" className="input" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="input-label">Jumlah (Rp) *</label>
                      <input type="number" className="input" min="0" placeholder="0" value={returnForm.amount} onChange={e => setReturnForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="input-label">Rekening Bank (untuk jurnal)</label>
                    <select className="input" value={returnForm.bank_account_code} onChange={e => setReturnForm(f => ({ ...f, bank_account_code: e.target.value }))}>
                      <option value="">Pilih rekening (opsional)</option>
                      {banks.map(b => <option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="input-label">Catatan</label>
                    <input type="text" className="input" placeholder="Opsional" value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Batal</button>
                    <button className="btn btn-primary btn-sm" onClick={addReturn} disabled={saving}>
                      {saving ? <Loader2 size={11} className="animate-spin" /> : 'Simpan'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="input-label">Tanggal *</label>
                      <input type="date" className="input" value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="input-label">Jumlah (Rp) *</label>
                      <input type="number" className="input" min="0" placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="input-label">Deskripsi *</label>
                    <input type="text" className="input" placeholder="Contoh: Biaya angkut, gaji staff, dll" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label className="input-label">Rekening Bank (untuk jurnal)</label>
                    <select className="input" value={expenseForm.bank_account_code} onChange={e => setExpenseForm(f => ({ ...f, bank_account_code: e.target.value }))}>
                      <option value="">Pilih rekening (opsional)</option>
                      {banks.map(b => <option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="input-label">Catatan</label>
                    <input type="text" className="input" placeholder="Opsional" value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Batal</button>
                    <button className="btn btn-primary btn-sm" onClick={addExpense} disabled={saving}>
                      {saving ? <Loader2 size={11} className="animate-spin" /> : 'Simpan'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : tab === 'returns' ? (
            returns.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Belum ada return</div>
            ) : (
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>Tanggal</th><th>Kode</th><th className="text-right">Jumlah</th><th>Catatan</th></tr></thead>
                <tbody>
                  {returns.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.return_date)}</td>
                      <td><span className="font-mono text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{r.return_code}</span></td>
                      <td className="text-right tbl-mono" style={{ color: '#059669', fontWeight: 600 }}>{formatRupiah(r.amount)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            expenses.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Belum ada biaya operasional</div>
            ) : (
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>Tanggal</th><th>Deskripsi</th><th className="text-right">Jumlah</th><th>Catatan</th></tr></thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.expense_date)}</td>
                      <td>{e.description}</td>
                      <td className="text-right tbl-mono" style={{ color: '#dc2626', fontWeight: 600 }}>{formatRupiah(e.amount)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Footer */}
        {localInv.status === 'active' && (
          <div className="p-4 flex gap-2 justify-end" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
            <button className="btn btn-outline btn-sm" onClick={() => updateStatus('cancelled')} disabled={updatingStatus}
              style={{ color: '#dc2626', borderColor: '#fecaca' }}>
              {updatingStatus ? <Loader2 size={11} className="animate-spin" /> : 'Batalkan'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => updateStatus('completed')} disabled={updatingStatus}>
              {updatingStatus ? <Loader2 size={11} className="animate-spin" /> : 'Tandai Selesai'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function CommodityInvestmentsPage() {
  const { data, meta, loading, setPage, setParam, refetch } = usePaginated<Investment>('/api/commodity-investments');
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [drawerInv, setDrawerInv]   = useState<Investment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [banks, setBanks]           = useState<BankAccount[]>([]);
  const [form, setForm]             = useState({ commodity_type: 'gold', project_code: '', invest_date: '', modal_amount: '', bank_account_code: '', notes: '' });
  const [saving, setSaving]         = useState(false);

  const fetchSummary = () => {
    fetch('/api/commodity-investments?action=summary', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (j.success) setSummary(j.data); });
  };

  useEffect(() => {
    fetchSummary();
    fetch('/api/projects?limit=200', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (j.success) setProjects(j.data ?? []); });
    fetch('/api/bank-accounts?limit=100', { credentials: 'include' })
      .then(r => r.json()).then(j => { if (j.success) setBanks(j.data ?? []); });
  }, []);

  const applyTypeFilter = (type: string) => { setTypeFilter(type); setParam('type', type); };
  const applyStatusFilter = (s: string)  => { setStatusFilter(s); setParam('status', s); };

  const save = async () => {
    if (!form.invest_date || !form.modal_amount) { toast.error('Tanggal dan modal wajib diisi'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/commodity-investments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, modal_amount: Number(form.modal_amount) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('Investasi ditambahkan');
      setShowCreate(false);
      setForm({ commodity_type: 'gold', project_code: '', invest_date: '', modal_amount: '', bank_account_code: '', notes: '' });
      refetch(); fetchSummary();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    setSaving(false);
  };

  const pl = summary?.profit_loss ?? 0;

  return (
    <div className="space-y-4 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Investasi Komoditas</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {summary?.active_count ?? 0} aktif · {summary?.total_count ?? 0} total
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Tambah Investasi
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Modal',    value: formatRupiah(summary?.total_modal    ?? 0), color: 'var(--color-text)', icon: null },
          { label: 'Total Return',   value: formatRupiah(summary?.total_return   ?? 0), color: '#059669',           icon: null },
          { label: 'Total Biaya',    value: formatRupiah(summary?.total_expenses ?? 0), color: '#dc2626',           icon: null },
          {
            label: 'Profit / Loss',
            value: pl === 0 ? 'Impas' : formatRupiah(Math.abs(pl)),
            color: pl > 0 ? '#059669' : pl < 0 ? '#dc2626' : 'var(--color-text)',
            icon: pl > 0 ? <TrendingUp size={13} /> : pl < 0 ? <TrendingDown size={13} /> : null,
          },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="card p-4">
            <div className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
            <div className="text-[16px] font-bold" style={{ color }}>{value}</div>
            {icon && <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color }}>{icon}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {[{ v: '', label: 'Semua' }, { v: 'gold', label: 'Emas' }, { v: 'wood', label: 'Kayu' }].map(t => (
            <button key={t.v} onClick={() => applyTypeFilter(t.v)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: typeFilter === t.v ? 'var(--color-primary)' : 'transparent',
                color:      typeFilter === t.v ? '#fff' : 'var(--color-text-muted)',
                border:     typeFilter === t.v ? 'none' : '1px solid var(--color-border-soft)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[{ v: '', label: 'Semua' }, { v: 'active', label: 'Aktif' }, { v: 'completed', label: 'Selesai' }, { v: 'cancelled', label: 'Batal' }].map(t => (
            <button key={t.v} onClick={() => applyStatusFilter(t.v)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: statusFilter === t.v ? '#F5F3FF' : 'transparent',
                color:      statusFilter === t.v ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border:     '1px solid ' + (statusFilter === t.v ? 'var(--color-primary)' : 'var(--color-border-soft)'),
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Komoditas</th>
                <th>Project</th>
                <th>Tgl Invest</th>
                <th className="text-right">Modal</th>
                <th className="text-right">Return</th>
                <th className="text-right">Biaya</th>
                <th className="text-right">Profit / Loss</th>
                <th>Status</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={10} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Belum ada investasi</td></tr>}
              {data.map(inv => {
                const netPL = inv.total_return - inv.modal_amount - Number(inv.total_expenses ?? 0);
                return (
                  <tr key={inv.id}>
                    <td><span className="font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{inv.investment_code}</span></td>
                    <td><span className={`badge ${COMMODITY[inv.commodity_type]?.cls}`}>{COMMODITY[inv.commodity_type]?.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{inv.project_name || '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(inv.invest_date)}</td>
                    <td className="text-right tbl-mono">{formatRupiah(inv.modal_amount)}</td>
                    <td className="text-right tbl-mono" style={{ color: '#059669' }}>{formatRupiah(inv.total_return)}</td>
                    <td className="text-right tbl-mono" style={{ color: '#dc2626' }}>
                      {Number(inv.total_expenses) > 0 ? formatRupiah(inv.total_expenses) : '—'}
                    </td>
                    <td className="text-right">
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        color: netPL > 0 ? '#059669' : netPL < 0 ? '#dc2626' : 'var(--color-text-muted)' }}>
                        {netPL === 0 ? '—' : `${netPL > 0 ? '+' : '-'}${formatRupiah(Math.abs(netPL))}`}
                      </span>
                    </td>
                    <td><span className={`badge ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setDrawerInv(inv)}>Detail</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Tambah Investasi Komoditas</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Komoditas *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'gold', label: 'Emas', cls: '#d97706', bg: '#fffbeb' }, { v: 'wood', label: 'Kayu', cls: '#16a34a', bg: '#f0fdf4' }].map(c => (
                    <button key={c.v} type="button" onClick={() => setForm(f => ({ ...f, commodity_type: c.v }))}
                      className="py-3 rounded-xl text-[13px] font-semibold transition-all"
                      style={{
                        background: form.commodity_type === c.v ? c.bg : '#F9FAFB',
                        border: `2px solid ${form.commodity_type === c.v ? c.cls : '#E5E7EB'}`,
                        color: form.commodity_type === c.v ? c.cls : 'var(--color-text-muted)',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Project</label>
                <select className="input" value={form.project_code} onChange={e => setForm(f => ({ ...f, project_code: e.target.value }))}>
                  <option value="">Tanpa project</option>
                  {projects.map(p => <option key={p.project_code} value={p.project_code}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Tanggal Investasi *</label>
                <input type="date" className="input" value={form.invest_date} onChange={e => setForm(f => ({ ...f, invest_date: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Modal (Rp) *</label>
                <input type="number" className="input" min="0" placeholder="0" value={form.modal_amount} onChange={e => setForm(f => ({ ...f, modal_amount: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Rekening Bank (untuk jurnal)</label>
                <select className="input" value={form.bank_account_code} onChange={e => setForm(f => ({ ...f, bank_account_code: e.target.value }))}>
                  <option value="">Pilih rekening (opsional)</option>
                  {banks.map(b => <option key={b.account_code} value={b.account_code}>{b.bank_name} — {b.account_number}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Catatan</label>
                <textarea className="input resize-none" rows={2} placeholder="Opsional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {drawerInv && (
        <DetailDrawer inv={drawerInv} onClose={() => setDrawerInv(null)} onUpdated={() => { refetch(); fetchSummary(); }} banks={banks} />
      )}
    </div>
  );
}
