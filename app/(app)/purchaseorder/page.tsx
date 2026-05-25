'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, PO_STATUS } from '@/lib/utils';
import { Plus, Search, Filter, Download, Eye, X, ChevronLeft, ChevronRight, Paperclip, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted',        label: 'Menunggu SPV' },
  { value: 'approved_spv',     label: 'Disetujui SPV' },
  { value: 'approved_finance', label: 'Disetujui Finance' },
  { value: 'paid',             label: 'Dibayar' },
  { value: 'rejected',         label: 'Ditolak' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: 'badge-red', medium: 'badge-amber', low: 'badge-gray',
};

interface PO {
  id: number; po_code: string; supplier_name: string; so_code: string;
  total_amount: number; status: string; do_status: string; priority: string;
  days_waiting: number; submitted_by: string; date: string;
  approved_by_spv: string; approved_by_finance: string;
  approved_date_spv: string; approved_date_finance: string;
  rejection_reason: string; payment_proof: string; created_at: string;
  supplier_invoice_number: string; attachment_url: string; attachment_filename: string;
  item_count: number;
}

export default function PurchaseOrderPage() {
  const { data, meta, loading, setSearch, setStatus, setPage, setParam, refetch } =
    usePaginated<PO>('/api/purchase-orders');

  const [search, setSearchLocal] = useState('');
  const [status, setStatusLocal] = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [detail, setDetail]     = useState<PO | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const applySearch = () => {
    setSearch(search);
    setParam('from', from);
    setParam('to', to);
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Purchase Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total PO</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm"><Download size={12} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Buat PO</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Cari</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Kode PO, supplier, SO..."
                value={search} onChange={(e) => setSearchLocal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()} />
            </div>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" value={status} onChange={(e) => { setStatusLocal(e.target.value); setStatus(e.target.value); }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><label className="input-label">Dari</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="input-label">Sampai</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button className="btn btn-primary btn-sm" onClick={applySearch}><Filter size={12} /> Terapkan</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setSearchLocal(''); setStatusLocal(''); setFrom(''); setTo(''); setSearch(''); setStatus(''); setParam('from',''); setParam('to',''); }}>Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode PO</th>
                <th>Supplier</th>
                <th>SO Referensi</th>
                <th>Prioritas</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>DO Status</th>
                <th>Submitted By</th>
                <th>Tgl</th>
                <th>Lampiran</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={11} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((po) => {
                const st = PO_STATUS[po.status] ?? { label: po.status, color: 'gray' };
                return (
                  <tr key={po.id}>
                    <td><span className="tbl-mono">{po.po_code}</span></td>
                    <td>
                      <div className="font-medium" style={{ color: 'var(--color-text)' }}>{po.supplier_name}</div>
                      {po.supplier_invoice_number && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Inv: {po.supplier_invoice_number}</div>}
                    </td>
                    <td><span className="text-[11.5px]" style={{ color: '#7c3aed' }}>{po.so_code}</span></td>
                    <td><span className={`badge ${PRIORITY_COLOR[po.priority] ?? 'badge-gray'}`}>{po.priority}</span></td>
                    <td className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>{formatRupiah(po.total_amount)}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td>
                      <span className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                        {po.do_status?.replace('_',' ') ?? '-'}
                      </span>
                    </td>
                    <td>{po.submitted_by || '-'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(po.date || po.created_at)}</td>
                    <td>
                      {po.attachment_url
                        ? <a href={po.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px]" style={{ color: '#7c3aed' }}><Paperclip size={12} />{po.attachment_filename?.slice(0,20) ?? 'Lihat'}</a>
                        : <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>-</span>}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(po)}><Eye size={13} /></button>
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
            <button className="page-btn" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}><ChevronLeft size={13} /></button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4)) + i;
              return <button key={p} className={`page-btn ${p === meta.page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="page-btn" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[500px] shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="font-bold text-[15px]">Detail PO</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#4f46e5' }}>{detail.po_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                ['Supplier',         detail.supplier_name],
                ['SO Referensi',     detail.so_code],
                ['Total',            formatRupiah(detail.total_amount)],
                ['Status',           (PO_STATUS[detail.status] ?? { label: detail.status }).label],
                ['DO Status',        detail.do_status?.replace('_',' ') ?? '-'],
                ['Prioritas',        detail.priority],
                ['Submitted By',     detail.submitted_by || '-'],
                ['Disetujui SPV',    detail.approved_by_spv ? `${detail.approved_by_spv} (${formatDate(detail.approved_date_spv)})` : '-'],
                ['Disetujui Finance',detail.approved_by_finance ? `${detail.approved_by_finance} (${formatDate(detail.approved_date_finance)})` : '-'],
                ['Inv Supplier',     detail.supplier_invoice_number || '-'],
                ['Tanggal',          formatDate(detail.date || detail.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <div className="text-[12px] w-36 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                  <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
                </div>
              ))}
              {detail.rejection_reason && (
                <div className="p-3 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div className="text-[11px] font-semibold mb-1" style={{ color: '#dc2626' }}>Alasan Penolakan</div>
                  <div className="text-[12px]" style={{ color: '#374151' }}>{detail.rejection_reason}</div>
                </div>
              )}
              {detail.attachment_url && (
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Lampiran</div>
                  <a href={detail.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg border text-[12px]"
                    style={{ borderColor: 'var(--color-border)', color: '#7c3aed' }}>
                    <Paperclip size={13} /> {detail.attachment_filename}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
