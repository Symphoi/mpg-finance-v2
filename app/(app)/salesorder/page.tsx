'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, SO_STATUS } from '@/lib/utils';
import { Plus, Search, Filter, Download, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted',        label: 'Submitted' },
  { value: 'processing',       label: 'Processing' },
  { value: 'ready_to_invoice', label: 'Ready to Invoice' },
  { value: 'shipped',          label: 'Shipped' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'completed',        label: 'Completed' },
  { value: 'cancelled',        label: 'Cancelled' },
];

interface SO {
  id: number; so_code: string; customer_name: string; customer_phone: string;
  sales_rep: string; total_amount: number; tax_amount: number; status: string;
  accounting_status: string; invoice_number: string; project_code: string;
  customer_type: string; notes: string; created_at: string; item_count: number; po_count: number;
}

export default function SalesOrderPage() {
  const { data, meta, loading, error, refetch, setSearch, setStatus, setPage, setParam } =
    usePaginated<SO>('/api/sales-orders');

  const [search, setSearchLocal]  = useState('');
  const [status, setStatusLocal]  = useState('');
  const [from,   setFrom]         = useState('');
  const [to,     setTo]           = useState('');
  const [detail, setDetail]       = useState<SO | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const applySearch = () => {
    setSearch(search);
    setParam('from', from);
    setParam('to', to);
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Sales Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {meta.total} total SO
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm"><Download size={12} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Buat SO</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Cari</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                className="input" style={{ paddingLeft: 32 }}
                placeholder="Kode SO, customer, invoice..."
                value={search}
                onChange={(e) => setSearchLocal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
            </div>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" value={status}
              onChange={(e) => { setStatusLocal(e.target.value); setStatus(e.target.value); }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Dari</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Sampai</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={applySearch}><Filter size={12} /> Terapkan</button>
          <button className="btn btn-outline btn-sm" onClick={() => {
            setSearchLocal(''); setStatusLocal(''); setFrom(''); setTo('');
            setSearch(''); setStatus(''); setParam('from',''); setParam('to','');
          }}>Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode SO</th>
                <th>Customer</th>
                <th>Sales Rep</th>
                <th>Invoice</th>
                <th>Project</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Tgl Dibuat</th>
                <th>Items / PO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
              )}
              {!loading && data.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>
              )}
              {data.map((so) => {
                const st = SO_STATUS[so.status] ?? { label: so.status, color: 'gray' };
                return (
                  <tr key={so.id}>
                    <td><span className="tbl-mono">{so.so_code}</span></td>
                    <td>
                      <div className="font-medium" style={{ color: 'var(--color-text)' }}>{so.customer_name}</div>
                      {so.customer_phone && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{so.customer_phone}</div>}
                    </td>
                    <td>{so.sales_rep || '-'}</td>
                    <td>
                      <div className="text-[12px]">{so.invoice_number || '-'}</div>
                    </td>
                    <td>{so.project_code || '-'}</td>
                    <td className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>
                      {formatRupiah(so.total_amount)}
                    </td>
                    <td>
                      <span className={`badge badge-${st.color}`}>{st.label}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(so.created_at)}</td>
                    <td>
                      <span className="text-[11.5px]">{so.item_count} item · {so.po_count} PO</span>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(so)}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
          <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {meta.total > 0 ? `${((meta.page-1)*meta.limit)+1}–${Math.min(meta.page*meta.limit,meta.total)} dari ${meta.total}` : '0 data'}
          </div>
          <div className="pagination">
            <button className="page-btn" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4)) + i;
              return (
                <button key={p} className={`page-btn ${p === meta.page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[480px] shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Detail SO</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{detail.so_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                ['Customer',   detail.customer_name],
                ['Telepon',    detail.customer_phone || '-'],
                ['Sales Rep',  detail.sales_rep || '-'],
                ['Project',    detail.project_code || '-'],
                ['Invoice',    detail.invoice_number || '-'],
                ['Customer Type', detail.customer_type],
                ['Total',      formatRupiah(detail.total_amount)],
                ['Pajak',      formatRupiah(detail.tax_amount)],
                ['Status',     (SO_STATUS[detail.status] ?? { label: detail.status }).label],
                ['Dibuat',     formatDate(detail.created_at)],
                ['Items',      `${detail.item_count} item`],
                ['PO terkait', `${detail.po_count} PO`],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <div className="text-[12px] w-32 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                  <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
                </div>
              ))}
              {detail.notes && (
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div>
                  <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{detail.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
