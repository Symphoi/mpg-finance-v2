'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate } from '@/lib/utils';
import { Eye, X, ChevronLeft, ChevronRight, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: number; so_code: string; invoice_number: string; customer_name: string;
  total_amount: number; tax_amount: number; status: string; invoice_date: string;
  due_date: string; accounting_status: string; ar_code: string; created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  submitted: 'badge-amber', processing: 'badge-blue', ready_to_invoice: 'badge-purple',
  shipped: 'badge-cyan', delivered: 'badge-green', completed: 'badge-green', cancelled: 'badge-red',
};
const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted', processing: 'Processing', ready_to_invoice: 'Ready Invoice',
  shipped: 'Dikirim', delivered: 'Diterima', completed: 'Selesai', cancelled: 'Batal',
};

export default function InvoicePaymentPage() {
  const { data, meta, loading, setPage, setSearch, setStatus } = usePaginated<Invoice>('/api/invoice-payment');
  const [search, setS] = useState('');
  const [detail, setDetail] = useState<Invoice | null>(null);

  const handleMarkPaid = async (so: Invoice) => {
    try {
      const res  = await fetch(`/api/invoice-payment/${so.so_code}/mark-paid`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${so.invoice_number} ditandai lunas`);
      setDetail(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
  };

  const isOverdue = (due: string) => due && new Date(due) < new Date();

  return (
    <div className="space-y-4 max-w-[1300px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Invoice & Payment</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} invoice</p>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input className="input" placeholder="Cari SO, invoice, customer..."
              value={search} onChange={(e) => setS(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(search)} />
          </div>
          <select className="input" style={{ width: 'auto' }} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="ready_to_invoice">Ready to Invoice</option>
            <option value="shipped">Dikirim</option>
            <option value="delivered">Diterima</option>
            <option value="completed">Lunas</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setSearch(search)}>Cari</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>SO Code</th>
                <th>No. Invoice</th>
                <th>Customer</th>
                <th className="text-right">Total</th>
                <th className="text-right">Pajak</th>
                <th>Status</th>
                <th>Tgl Invoice</th>
                <th>Jatuh Tempo</th>
                <th>AR Code</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={10} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="tbl-mono">{inv.so_code}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} style={{ color: '#7c3aed' }} />
                      <span className="text-[12px] font-medium">{inv.invoice_number || '-'}</span>
                    </div>
                  </td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{inv.customer_name}</div></td>
                  <td className="text-right font-semibold">{formatRupiah(inv.total_amount)}</td>
                  <td className="text-right text-[12px]">{formatRupiah(inv.tax_amount)}</td>
                  <td><span className={`badge ${STATUS_COLOR[inv.status] ?? 'badge-gray'}`}>{STATUS_LABEL[inv.status] ?? inv.status}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(inv.invoice_date)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {inv.due_date && isOverdue(inv.due_date) && inv.status !== 'completed' && (
                        <AlertCircle size={12} style={{ color: '#dc2626' }} />
                      )}
                      <span style={{ color: inv.due_date && isOverdue(inv.due_date) && inv.status !== 'completed' ? '#dc2626' : 'var(--color-text-muted)' }}>
                        {inv.due_date ? formatDate(inv.due_date) : '-'}
                      </span>
                    </div>
                  </td>
                  <td><span className="text-[11px] font-mono">{inv.ar_code || '-'}</span></td>
                  <td>
                    <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(inv)}><Eye size={13} /></button>
                  </td>
                </tr>
              ))}
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

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[440px] shadow-xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-[15px]">Detail Invoice</div>
                <div className="text-[12px] mt-0.5 font-mono" style={{ color: '#7c3aed' }}>{detail.invoice_number}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            {[
              ['SO Code',     detail.so_code],
              ['Invoice',     detail.invoice_number || '-'],
              ['Customer',    detail.customer_name],
              ['Total',       formatRupiah(detail.total_amount)],
              ['Pajak',       formatRupiah(detail.tax_amount)],
              ['Status',      STATUS_LABEL[detail.status] ?? detail.status],
              ['Tgl Invoice', formatDate(detail.invoice_date)],
              ['Jatuh Tempo', detail.due_date ? formatDate(detail.due_date) : '-'],
              ['AR Code',     detail.ar_code || '-'],
            ].map(([k,v]) => (
              <div key={k} className="flex gap-3 mb-3">
                <div className="text-[12px] w-28 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
              </div>
            ))}
            {detail.status === 'delivered' && (
              <button className="btn btn-primary w-full justify-center mt-4" onClick={() => handleMarkPaid(detail)}>
                <CheckCircle2 size={14} /> Tandai Lunas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
