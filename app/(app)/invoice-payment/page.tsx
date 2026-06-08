'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  Search, Eye, X, ChevronLeft, ChevronRight, CreditCard,
  CheckCircle2, AlertCircle, Loader2, ChevronDown,
  FileText, Banknote, Info, Building2, Upload, Trash2,
  ArrowRightLeft, ShieldAlert
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  ar_code: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  outstanding_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  so_code: string;
  description: string;
  company_code: string;
  company_name: string;
  overdue_days: number;
}

interface BankAccount {
  account_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  company_code?: string;
  company_name?: string;
}

interface PaymentForm {
  payment_date: string;
  payment_method: string;
  bank_account_code: string;
  reference_number: string;
  notes: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const icons = {
          success: <CheckCircle2 size={16} className="shrink-0" style={{ color: '#059669' }} />,
          error:   <AlertCircle  size={16} className="shrink-0" style={{ color: '#dc2626' }} />,
          info:    <Info         size={16} className="shrink-0" style={{ color: '#2563eb' }} />,
        };
        const colors = {
          success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
          error:   { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d' },
          info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
        };
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium max-w-[340px]"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, animation: 'slideIn .2s ease' }}
          >
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button className="opacity-50 hover:opacity-100 mt-0.5" onClick={() => onRemove(t.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  const add = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = ++toastId;
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);
  return {
    toasts, remove,
    success: (msg: string) => add('success', msg),
    error:   (msg: string) => add('error', msg, 6000),
    info:    (msg: string) => add('info', msg),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Belum Dibayar', color: 'red' },
  partial: { label: 'Sebagian', color: 'yellow' },
  paid: { label: 'Lunas', color: 'green' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const PAYMENT_METHODS = ['transfer', 'cash', 'other'];

// ─── Dynamic Pagination ───────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, limit, onPage, onLimitChange,
}: {
  page: number; totalPages: number; total: number;
  limit: number; onPage: (p: number) => void; onLimitChange: (l: number) => void;
}) {
  const from = total > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
      <div className="flex items-center gap-3">
        <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          {total > 0 ? `${from}–${to} dari ${total}` : '0 data'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Tampil</span>
          <div className="relative">
            <select
              className="appearance-none pl-2 pr-6 py-1 rounded-md text-[12px] font-medium cursor-pointer"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)' }}
              value={limit}
              onChange={e => onLimitChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>per halaman</span>
        </div>
      </div>
      <div className="pagination">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={13} /></button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="page-btn" style={{ cursor: 'default', color: 'var(--color-text-muted)' }}>…</span>
            : <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        )}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoicePaymentPage() {
  const toast = useToast();

  // Filter states
  const [searchLocal, setSearchLocal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companies, setCompanies] = useState<{company_code:string;company_name:string}[]>([]);

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Selected invoices for payment
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    bank_account_code: '',
    reference_number: '',
    notes: '',
  });
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
  const [paying, setPaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail drawer
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, unpaid: 0, partial: 0, paid: 0, totalOutstanding: 0 });

  // ── Fetch bank accounts ─────────────────────────────────────────────────────
  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/purchase-orders?endpoint=bank-accounts');
      const d = await res.json();
      if (d.success) setBankAccounts(d.data || []);
    } catch { /* silent */ }
  };

  // ── Fetch companies for filter ──────────────────────────────────────────────
  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', { credentials: 'include' });
      const d = await res.json();
      if (d.success) {
        setCompanies((d.data || []).map((c: any) => ({
          company_code: c.company_code,
          company_name: c.name,
        })));
      }
    } catch { /* silent */ }
  };

  // ── Fetch invoices ─────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchLocal)   params.append('search',       searchLocal);
      if (statusFilter)  params.append('status',       statusFilter);
      if (companyFilter) params.append('company_code', companyFilter);
      if (dateFrom)      params.append('from',         dateFrom);
      if (dateTo)        params.append('to',           dateTo);
      params.append('page',  String(page));
      params.append('limit', String(limit));

      const res = await fetch(`/api/invoice-payment/list?${params}`);
      const d = await res.json();

      if (d.success) {
        let invoicesData = [];
        if (Array.isArray(d.data)) {
          invoicesData = d.data;
        } else if (d.data && Array.isArray(d.data.data)) {
          invoicesData = d.data.data;
        } else {
          invoicesData = [];
        }
        
        const pagination = d.data?.pagination || d.meta;
        setInvoices(invoicesData);
        setTotal(pagination?.total ?? invoicesData.length);
        setTotalPages(pagination?.totalPages ?? Math.ceil((pagination?.total ?? invoicesData.length) / limit));

        const statsData = {
          total: invoicesData.length,
          unpaid: invoicesData.filter((i: Invoice) => i.status === 'unpaid').length,
          partial: invoicesData.filter((i: Invoice) => i.status === 'partial').length,
          paid: invoicesData.filter((i: Invoice) => i.status === 'paid').length,
          totalOutstanding: invoicesData.reduce((sum: number, i: Invoice) => sum + (i.outstanding_amount || 0), 0),
        };
        setStats(statsData);
      } else {
        setInvoices([]);
        toast.error(d.error || 'Gagal memuat data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setInvoices([]);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [searchLocal, statusFilter, companyFilter, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    fetchInvoices();
    fetchBankAccounts();
    fetchCompanies();
  }, [fetchInvoices]);

  // ── Select all handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (selectAll) {
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid').map(i => i.ar_code);
      setSelectedInvoices(unpaidInvoices);
    } else {
      setSelectedInvoices([]);
    }
  }, [selectAll, invoices]);

  // ── Fetch detail ───────────────────────────────────────────────────────────
  const fetchDetail = async (arCode: string) => {
    setDetailLoading(true);
    try {
      const [detailRes, payRes] = await Promise.all([
        fetch(`/api/invoice-payment/detail?ar_code=${arCode}`, { credentials: 'include' }),
        fetch(`/api/accounts-receivable?ar_code=${arCode}&include_payments=1`, { credentials: 'include' }),
      ]);
      const detailJson = await detailRes.json();
      const payJson    = await payRes.json();
      setDetailData({
        ...(detailJson.success ? detailJson.data : {}),
        payments: payJson.success ? (payJson.data?.payments ?? []) : [],
      });
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Payment handlers ───────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('Pilih minimal 1 invoice');
      return;
    }
    if (!paymentForm.reference_number.trim()) {
      toast.error('Nomor referensi wajib diisi');
      return;
    }
    if (paymentForm.payment_method === 'transfer' && !paymentForm.bank_account_code) {
      toast.error('Pilih rekening bank perusahaan');
      return;
    }
    // ✅ WAJIB upload bukti pembayaran
    if (paymentFiles.length === 0) {
      toast.error('Upload minimal 1 bukti pembayaran');
      return;
    }

    const allocations = selectedInvoices.map(arCode => {
      const inv = invoices.find(i => i.ar_code === arCode);
      return { ar_code: arCode, amount: inv?.outstanding_amount || 0 };
    });

    const selectedBank = bankAccounts.find(b => b.account_code === paymentForm.bank_account_code);

    setPaying(true);
    try {
      const formData = new FormData();
      const payload = {
        allocations,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        bank_account_code: paymentForm.bank_account_code || null,
        bank_name: selectedBank?.bank_name || null,
        account_number: selectedBank?.account_number || null,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes || null,
      };
      formData.append('data', JSON.stringify(payload));
      paymentFiles.forEach(file => formData.append('files', file));

      const res = await fetch('/api/invoice-payment/pay', {
        method: 'POST',
        body: formData,
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);

      toast.success(`Pembayaran untuk ${allocations.length} invoice berhasil`);
      setShowPayment(false);
      setSelectedInvoices([]);
      setSelectAll(false);
      setPaymentFiles([]);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'transfer',
        bank_account_code: '',
        reference_number: '',
        notes: '',
      });
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses pembayaran');
    } finally {
      setPaying(false);
    }
  };

  // ── Filter handlers ────────────────────────────────────────────────────────
  const applyFilters = () => {
    setPage(1);
    fetchInvoices();
  };

  const resetFilters = () => {
    setSearchLocal('');
    setStatusFilter('');
    setCompanyFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // ── Intercompany detection ─────────────────────────────────────────────────
  const selectedBank = bankAccounts.find(b => b.account_code === paymentForm.bank_account_code);
  const bankCompanyCode = selectedBank?.company_code || '';

  const intercoInvoices = selectedInvoices
    .map(arCode => invoices.find(i => i.ar_code === arCode))
    .filter((inv): inv is Invoice => !!inv && !!inv.company_code && inv.company_code !== bankCompanyCode && !!bankCompanyCode);

  const isIntercompany = intercoInvoices.length > 0;

  const getSelectedTotal = () => {
    return selectedInvoices.reduce((sum, arCode) => {
      const inv = invoices.find(i => i.ar_code === arCode);
      return sum + (inv?.outstanding_amount || 0);
    }, 0);
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Invoice & Payment</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {stats.total} invoice · {stats.unpaid} belum dibayar · {stats.partial} sebagian · {stats.paid} lunas
          </p>
        </div>
        {selectedInvoices.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>
            <CreditCard size={13} /> Bayar {selectedInvoices.length} Invoice
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Invoice', value: stats.total, icon: <FileText size={16} />, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Belum Dibayar', value: stats.unpaid, icon: <AlertCircle size={16} />, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Sebagian', value: stats.partial, icon: <Info size={16} />, color: '#d97706', bg: '#fffbeb' },
          { label: 'Lunas', value: stats.paid, icon: <CheckCircle2 size={16} />, color: '#059669', bg: '#ecfdf5' },
          { label: 'Total Piutang', value: formatRupiah(stats.totalOutstanding), icon: <Banknote size={16} />, color: '#7c3aed', bg: '#f5f3ff' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
              <div className="text-[18px] font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Card */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Cari invoice, customer, SO, perusahaan..."
              value={searchLocal}
              onChange={e => setSearchLocal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="unpaid">Belum Dibayar</option>
              <option value="partial">Sebagian</option>
              <option value="paid">Lunas</option>
            </select>
          </div>
          <div>
            <select className="input" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
              <option value="">Semua Perusahaan</option>
              {companies.map(c => (
                <option key={c.company_code} value={c.company_code}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label text-[11px]">Dari</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label text-[11px]">Sampai</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>Cari</button>
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* Selected Invoice Toolbar */}
      {selectedInvoices.length > 0 && (
        <div className="card p-3 flex items-center justify-between" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} style={{ color: '#7c3aed' }} />
            <span className="text-[13px]">{selectedInvoices.length} invoice dipilih</span>
            <span className="text-[13px] font-semibold" style={{ color: '#7c3aed' }}>Total: {formatRupiah(getSelectedTotal())}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => { setSelectedInvoices([]); setSelectAll(false); }}>Batal</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>
              <CreditCard size={13} /> Bayar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={selectAll && selectedInvoices.length > 0}
                    onChange={(e) => setSelectAll(e.target.checked)}
                  />
                </th>
                <th>Kode Invoice</th>
                <th>Customer</th>
                <th>Perusahaan</th>
                <th>SO</th>
                <th className="text-right">Total</th>
                <th className="text-right">Sisa</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <Loader2 size={16} className="inline animate-spin mr-2" /> Memuat...
                  </td>
                </tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard size={28} style={{ color: 'var(--color-border)' }} />
                      <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {searchLocal || statusFilter || companyFilter || dateFrom || dateTo ? 'Tidak ada invoice yang cocok' : 'Belum ada invoice'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {invoices.map(inv => {
                const st = INVOICE_STATUS[inv.status] || { label: inv.status, color: 'gray' };
                const isSelected = selectedInvoices.includes(inv.ar_code);
                const isSelectable = inv.status !== 'paid';
                return (
                  <tr key={inv.ar_code} className={isSelected ? 'bg-purple-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelectable) {
                            if (isSelected) {
                              setSelectedInvoices(prev => prev.filter(c => c !== inv.ar_code));
                            } else {
                              setSelectedInvoices(prev => [...prev, inv.ar_code]);
                            }
                          }
                        }}
                        disabled={!isSelectable}
                      />
                    </td>
                    <td><span className="tbl-mono" style={{ color: '#7c3aed' }}>{inv.ar_code}</span></td>
                    <td className="font-medium text-[13px]">{inv.customer_name}</td>
                    <td>
                      {inv.company_name ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ background: '#ede9fe', color: '#7c3aed' }}>
                          {inv.company_name}
                        </span>
                      ) : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                    </td>
                    <td style={{ color: '#7c3aed' }}>{inv.so_code || '-'}</td>
                    <td className="text-right font-semibold">{formatRupiah(inv.amount)}</td>
                    <td className="text-right font-bold" style={{ color: '#dc2626' }}>{formatRupiah(inv.outstanding_amount)}</td>
                    <td>
                      {inv.due_date ? (() => {
                        const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);
                        const isOverdue = daysLeft < 0 && inv.status !== 'paid';
                        const isDueSoon = daysLeft >= 0 && daysLeft <= 7 && inv.status !== 'paid';
                        return (
                          <span style={{ color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : 'var(--color-text-muted)', fontWeight: isOverdue || isDueSoon ? 600 : 400 }}>
                            {formatDate(inv.due_date)}
                            {isOverdue && <span className="ml-1 text-[10px] font-bold" style={{ color: '#dc2626' }}>({Math.abs(daysLeft)}h telat)</span>}
                            {isDueSoon && !isOverdue && <span className="ml-1 text-[10px] font-bold" style={{ color: '#d97706' }}>({daysLeft}h lagi)</span>}
                          </span>
                        );
                      })() : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                    </td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td>
                      <button
                        className="btn btn-outline btn-icon btn-sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          fetchDetail(inv.ar_code);
                        }}
                        title="Detail"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPage={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>

      {/* Detail Drawer */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedInvoice(null)}>
          <div className="bg-white h-full w-[480px] shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Detail Invoice</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{selectedInvoice.ar_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setSelectedInvoice(null)}><X size={14} /></button>
            </div>
            {detailLoading ? (
              <div className="p-5 text-center py-16"><Loader2 className="animate-spin" /> Memuat...</div>
            ) : detailData ? (
              <div className="p-5 space-y-4">
                <div className="pb-4 border-b">
                  <span className={`badge badge-${INVOICE_STATUS[detailData.status]?.color}`}>
                    {INVOICE_STATUS[detailData.status]?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Customer', detailData.customer_name],
                    ['SO', detailData.so_code || '-'],
                    ['Total', formatRupiah(detailData.amount)],
                    ['Sisa', formatRupiah(detailData.outstanding_amount)],
                    ['Tgl Invoice', formatDate(detailData.invoice_date)],
                    ['Jatuh Tempo', formatDate(detailData.due_date) || '-'],
                    ['Dibuat', formatDate(detailData.created_at)],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
                      <div className="text-[13px] font-medium">{v as string}</div>
                    </div>
                  ))}
                </div>
                {detailData.description && (
                  <div className="pt-2">
                    <div className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Keterangan</div>
                    <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detailData.description}</div>
                  </div>
                )}

                {/* Payment history */}
                <div className="pt-2">
                  <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                    Riwayat Pembayaran {detailData.payments?.length > 0 ? `(${detailData.payments.length})` : ''}
                  </div>
                  {(detailData.payments?.length ?? 0) === 0 ? (
                    <div className="p-3 rounded-lg text-[12px] text-center" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                      Belum ada pembayaran
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailData.payments.map((p: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0' }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[12px] font-semibold" style={{ color: '#057a55' }}>{formatRupiah(p.amount)}</div>
                              <div className="text-[11px] mt-0.5" style={{ color: '#065f46' }}>{p.payment_method} · {formatDate(p.payment_date)}</div>
                            </div>
                            {p.reference_number && (
                              <div className="font-mono text-[10px]" style={{ color: '#6b7280' }}>Ref: {p.reference_number}</div>
                            )}
                          </div>
                          {p.bank_name && (
                            <div className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{p.bank_name} · {p.account_number}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 text-center">Data tidak ditemukan</div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-xl w-[500px] shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-[15px]">Bayar Invoice</h2>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setShowPayment(false)}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Invoice summary */}
              <div className="p-3 rounded-lg space-y-1" style={{ background: 'var(--color-bg)' }}>
                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedInvoices.length} invoice akan dibayar
                </div>
                <div className="text-[15px] font-bold" style={{ color: 'var(--color-text)' }}>
                  Total: {formatRupiah(getSelectedTotal())}
                </div>
                {/* Per-company breakdown */}
                {(() => {
                  const grouped: Record<string, { name: string; total: number }> = {};
                  selectedInvoices.forEach(arCode => {
                    const inv = invoices.find(i => i.ar_code === arCode);
                    if (!inv) return;
                    const key = inv.company_code || 'UNKNOWN';
                    if (!grouped[key]) grouped[key] = { name: inv.company_name || key, total: 0 };
                    grouped[key].total += inv.outstanding_amount;
                  });
                  const entries = Object.entries(grouped);
                  if (entries.length <= 1) return null;
                  return (
                    <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                      {entries.map(([code, { name, total }]) => (
                        <div key={code} className="flex justify-between text-[12px]">
                          <span style={{ color: 'var(--color-text-muted)' }}>{name}</span>
                          <span className="font-medium">{formatRupiah(total)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Tanggal Bayar *</label>
                  <input type="date" className="input" value={paymentForm.payment_date} onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Metode *</label>
                  <select className="input" value={paymentForm.payment_method} onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m === 'transfer' ? 'Transfer Bank' : m === 'cash' ? 'Tunai' : 'Lainnya'}</option>)}
                  </select>
                </div>
              </div>

              {/* Bank Account Selection */}
              {paymentForm.payment_method === 'transfer' && (
                <div>
                  <label className="input-label">Rekening Perusahaan *</label>
                  <select
                    className="input"
                    value={paymentForm.bank_account_code}
                    onChange={e => setPaymentForm(p => ({ ...p, bank_account_code: e.target.value }))}
                  >
                    <option value="">Pilih rekening perusahaan</option>
                    {bankAccounts.map(bank => (
                      <option key={bank.account_code} value={bank.account_code}>
                        {bank.bank_name} – {bank.account_number} ({bank.account_holder})
                        {bank.company_name ? ` [${bank.company_name}]` : ''}
                      </option>
                    ))}
                  </select>
                  {/* Show selected bank company */}
                  {selectedBank?.company_name && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: '#7c3aed' }}>
                      <Building2 size={11} />
                      <span>Rekening milik: <strong>{selectedBank.company_name}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* ── INTERCOMPANY WARNING ── */}
              {isIntercompany && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: '#fefce8', border: '1px solid #fde047' }}>
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft size={15} style={{ color: '#ca8a04' }} />
                    <span className="text-[13px] font-bold" style={{ color: '#713f12' }}>
                      Transaksi Intercompany Terdeteksi
                    </span>
                  </div>
                  <p className="text-[12px]" style={{ color: '#78350f' }}>
                    Bank yang dipilih milik <strong>{selectedBank?.company_name}</strong>, namun invoice berikut
                    milik perusahaan yang berbeda. Jurnal intercompany akan dibuat secara otomatis:
                  </p>
                  <div className="space-y-1">
                    {intercoInvoices.map(inv => (
                      <div key={inv.ar_code} className="flex items-center justify-between text-[11.5px] px-3 py-1.5 rounded-lg"
                        style={{ background: '#fefce8', border: '1px solid #fde047' }}>
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={11} style={{ color: '#ca8a04' }} />
                          <span className="font-mono font-semibold" style={{ color: '#7c3aed' }}>{inv.ar_code}</span>
                          <span style={{ color: '#78350f' }}>→ {inv.company_name}</span>
                        </div>
                        <span className="font-semibold" style={{ color: '#713f12' }}>{formatRupiah(inv.outstanding_amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] rounded-lg p-2.5 space-y-0.5" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <div className="font-semibold" style={{ color: '#9a3412' }}>Jurnal yang akan dibuat:</div>
                    <div style={{ color: '#7c2d12' }}>• {selectedBank?.company_name}: DR Bank / CR Hutang Interco</div>
                    <div style={{ color: '#7c2d12' }}>• Perusahaan invoice: DR Piutang Interco / CR Piutang Usaha</div>
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">No. Referensi *</label>
                <input className="input" placeholder="Nomor bukti transfer / kuitansi" value={paymentForm.reference_number} onChange={e => setPaymentForm(p => ({ ...p, reference_number: e.target.value }))} />
              </div>

              {/* Upload Bukti Pembayaran - WAJIB */}
              <div className="border rounded-xl p-4" style={{ borderColor: 'var(--color-border)' }}>
                <label className="input-label block mb-2">
                  Bukti Pembayaran <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#fef2f2', color: '#dc2626' }}>Wajib</span>
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setPaymentFiles(Array.from(e.target.files || []))}
                  />
                  {paymentFiles.length === 0 ? (
                    <>
                      <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                      <div className="text-[12px]">Klik untuk upload bukti pembayaran</div>
                      <div className="text-[10px] mt-1" style={{ color: '#dc2626' }}>* Wajib upload minimal 1 file</div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      {paymentFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                          <div className="flex items-center gap-2">
                            <FileText size={14} style={{ color: '#7c3aed' }} />
                            <span className="text-[12px]">{file.name}</span>
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentFiles(prev => prev.filter((_, i) => i !== idx));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="text-[11px] text-purple-600 hover:underline mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        + Tambah file
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="input-label">Catatan</label>
                <textarea className="input resize-none" rows={2} placeholder="Catatan pembayaran" value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button className="btn btn-outline btn-sm" onClick={() => setShowPayment(false)}>Batal</button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handlePayment} 
                disabled={paying || paymentFiles.length === 0}
              >
                {paying ? <><Loader2 size={13} className="animate-spin" /> Memproses...</> : 'Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}