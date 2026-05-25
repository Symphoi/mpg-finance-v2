'use client';
import { useState, useEffect } from 'react';
import { formatRupiah, formatDate, CA_STATUS } from '@/lib/utils';
import { usePaginated } from '@/hooks/useApi';
import { Plus, Search, Filter, Eye, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface CA {
  id: number; ca_code: string; employee_name: string; department: string;
  purpose: string; total_amount: number; used_amount: number; remaining_amount: number;
  status: string; request_date: string; project_code: string;
  approved_by: string; approved_date: string; notes: string;
  bank_account_code: string; created_at: string; document_urls: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'submitted',      label: 'Menunggu' },
  { value: 'approved',       label: 'Disetujui' },
  { value: 'active',         label: 'Aktif' },
  { value: 'in_settlement',  label: 'Settlement' },
  { value: 'fully_used',     label: 'Terpakai' },
  { value: 'completed',      label: 'Selesai' },
  { value: 'rejected',       label: 'Ditolak' },
];

export default function CATransactionsPage() {
  const { data, meta, loading, setSearch, setStatus, setPage } =
    usePaginated<CA>('/api/cash-advances');

  const [search, setSearchLocal] = useState('');
  const [detail, setDetail]      = useState<CA | null>(null);

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>CA Transactions</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total cash advance</p>
        </div>
        <a href="/ca-create" className="btn btn-primary btn-sm"><Plus size={13} /> Buat CA</a>
      </div>

      {/* Filter */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Cari</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Kode CA, nama, keperluan..."
                value={search} onChange={(e) => setSearchLocal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearch(search)} />
            </div>
          </div>
          <div>
            <label className="input-label">Status</label>
            <select className="input" onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setSearch(search)}><Filter size={12} /> Cari</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode CA</th>
                <th>Karyawan</th>
                <th>Keperluan</th>
                <th>Project</th>
                <th className="text-right">Total</th>
                <th className="text-right">Terpakai</th>
                <th className="text-right">Sisa</th>
                <th>Status</th>
                <th>Disetujui</th>
                <th>Tgl</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={11} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((ca) => {
                const st = CA_STATUS[ca.status] ?? { label: ca.status, color: 'gray' };
                const usedPct = ca.total_amount > 0 ? (ca.used_amount / ca.total_amount) * 100 : 0;
                return (
                  <tr key={ca.id}>
                    <td><span className="tbl-mono">{ca.ca_code}</span></td>
                    <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{ca.employee_name}</div></td>
                    <td><div className="max-w-[180px] truncate text-[12px]">{ca.purpose}</div></td>
                    <td>{ca.project_code || '-'}</td>
                    <td className="text-right font-semibold">{formatRupiah(ca.total_amount)}</td>
                    <td className="text-right text-[12px]" style={{ color: '#d97706' }}>{formatRupiah(ca.used_amount)}</td>
                    <td className="text-right text-[12px]" style={{ color: '#059669' }}>{formatRupiah(ca.remaining_amount)}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td>{ca.approved_by || '-'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(ca.request_date)}</td>
                    <td><button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(ca)}><Eye size={13} /></button></td>
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

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[460px] shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="font-bold text-[15px]">Detail CA</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#059669' }}>{detail.ca_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              {/* Progress bar */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Terpakai: {formatRupiah(detail.used_amount)}</span>
                  <span>Total: {formatRupiah(detail.total_amount)}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, detail.total_amount > 0 ? (detail.used_amount/detail.total_amount)*100 : 0)}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #4f46e5)'
                  }} />
                </div>
                <div className="text-[10.5px] mt-1 text-right" style={{ color: '#059669' }}>
                  Sisa: {formatRupiah(detail.remaining_amount)}
                </div>
              </div>
              {[
                ['Karyawan',    detail.employee_name],
                ['Keperluan',   detail.purpose],
                ['Project',     detail.project_code || '-'],
                ['Status',      (CA_STATUS[detail.status] ?? { label: detail.status }).label],
                ['Disetujui',   detail.approved_by ? `${detail.approved_by} (${formatDate(detail.approved_date)})` : '-'],
                ['Bank',        detail.bank_account_code || '-'],
                ['Tgl Request', formatDate(detail.request_date)],
              ].map(([k,v]) => (
                <div key={k} className="flex gap-3">
                  <div className="text-[12px] w-32 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                  <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
                </div>
              ))}
              {detail.notes && (
                <div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div>
                  <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detail.notes}</div>
                </div>
              )}
              {detail.document_urls && (() => {
                try {
                  const docs = JSON.parse(detail.document_urls);
                  return (
                    <div>
                      <div className="text-[12px] mb-2" style={{ color: 'var(--color-text-muted)' }}>Dokumen</div>
                      {docs.map((d: any, i: number) => (
                        <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border mb-1 text-[12px]"
                          style={{ borderColor: 'var(--color-border)', color: '#7c3aed' }}>
                          <FileText size={12} /> {d.filename}
                        </a>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
