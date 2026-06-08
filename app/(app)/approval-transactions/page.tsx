'use client';
import { useState, useEffect } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, PO_STATUS } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Eye, X,
  Search, Clock, User, Building2, FolderKanban,
  FileText, TrendingUp, TrendingDown, AlertCircle,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface POItem {
  product_code: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  so_price?: number;
  margin?: number;
  margin_percent?: number;
}

interface PO {
  id: number;
  po_code: string;
  supplier_name: string;
  so_code: string;
  total_amount: number;
  tax_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  item_count?: number;
  aging_days?: number;
  customer_name?: string;
  project_name?: string;
  so_total?: number;
  so_items?: number;
  so_qty?: number;
  po_items?: number;
  po_qty?: number;
  prev_po_total?: number;
  prev_po_count?: number;
  prev_po_items?: number;
  approved_by_spv?: string;
  approved_by_finance?: string;
  approved_by_spv_name?: string;
  approved_by_finance_name?: string;
  items?: POItem[];
  attachments?: any[];
}

export default function ApprovalTransactionsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, meta, loading, setPage, setLimit, refetch, setSearch: setAPISearch, setParam, setStatus } =
    usePaginated<PO>('/api/approval-transactions', {});

  const [detail, setDetail] = useState<PO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<PO | null>(null);

  const [approving, setApproving] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<PO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (detail?.po_code) {
      setDetailLoading(true);
      fetch(`/api/approval-transactions?po_code=${encodeURIComponent(detail.po_code)}`)
        .then(r => r.json())
        .then(d => setDetailData(d.success ? d.data : null))
        .catch(() => setDetailData(null))
        .finally(() => setDetailLoading(false));
    } else {
      setDetailData(null);
    }
  }, [detail?.po_code]);

  const handleApprove = async (po: PO) => {
    setApproving(po.po_code);
    try {
      const res = await fetch('/api/approval-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ po_code: po.po_code, action: 'approve' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`PO ${po.po_code} disetujui`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal approve');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) { toast.error('Isi alasan penolakan'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/approval-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ po_code: rejectModal.po_code, action: 'reject', rejection_reason: rejectReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`PO ${rejectModal.po_code} ditolak`);
      setRejectModal(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal reject');
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilter = () => {
    setAPISearch(search);
    setParam('from', dateFrom);
    setParam('to', dateTo);
  };

  const resetFilter = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
    setStatus('');
    setAPISearch('');
    setParam('from', '');
    setParam('to', '');
  };

  const st = (status: string) => PO_STATUS[status] ?? { label: status, color: 'gray' };

  const getMarginColor = (percent: number) => {
    if (percent >= 30) return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: TrendingUp };
    if (percent >= 15) return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: TrendingDown };
    return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: AlertCircle };
  };

  const getAgingColor = (days: number) => {
    if (days > 7) return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: AlertCircle };
    if (days > 3) return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Clock };
    return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2 };
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>PO Approval</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {meta.total} PO {statusFilter ? `dengan status "${st(statusFilter).label}"` : 'semua status'}
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-end">
          {/* Status Filter */}
          <div>
            <label className="input-label">Status</label>
            <select
              className="input"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setStatus(e.target.value);
              }}
            >
              <option value="">Semua Status</option>
              <option value="submitted">Menunggu SPV</option>
              <option value="approved_spv">Menunggu Finance</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Cari PO, supplier, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            />
          </div>

          <div>
            <label className="input-label">Dari</label>
            <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Sampai</label>
            <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <button className="btn btn-primary btn-sm" onClick={applyFilter}>Cari</button>
          <button className="btn btn-outline btn-sm" onClick={resetFilter}>Reset</button>
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
                <th>Customer</th>
                <th>Project</th>
                <th>Item</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Tgl Dibuat</th>
                <th>Aging</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#059669' }} />
                    <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      Tidak ada PO
                    </div>
                  </td>
                </tr>
              )}
              {data.map((po) => {
                const aging = getAgingColor(po.aging_days || 0);
                const AgingIcon = aging.icon;
                const showApprove = po.status === 'submitted' || po.status === 'approved_spv';
                return (
                  <tr key={po.id}>
                    <td><span className="tbl-mono">{po.po_code}</span></td>
                    <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{po.supplier_name}</div></td>
                    <td>{po.customer_name || '-'}</td>
                    <td>{po.project_name || '-'}</td>
                    <td className="text-[12px]">{po.item_count || 0} item</td>
                    <td className="text-right font-semibold">
                      {formatRupiah(po.total_amount)}
                      {po.tax_amount && po.tax_amount > 0 && (
                        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Tax: {formatRupiah(po.tax_amount)}</div>
                      )}
                    </td>
                    <td><span className={`badge badge-${st(po.status).color}`}>{st(po.status).label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(po.created_at)}</td>
                    <td>
                      {po.aging_days != null && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: aging.bg, color: aging.color, border: `1px solid ${aging.border}` }}
                        >
                          <AgingIcon size={10} />
                          {po.aging_days}h
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(po)} title="Detail">
                          <Eye size={13} />
                        </button>
                        {showApprove && (
                          <>
                            <button
                              className="btn btn-sm flex items-center gap-1"
                              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                              onClick={() => handleApprove(po)}
                              disabled={approving === po.po_code}
                            >
                              <CheckCircle2 size={12} /> {approving === po.po_code ? '...' : 'Setujui'}
                            </button>
                            <button
                              className="btn btn-sm flex items-center gap-1"
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                              onClick={() => { setRejectModal(po); setRejectReason(''); }}
                            >
                              <XCircle size={12} /> Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} setPage={setPage} setLimit={setLimit} />
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[520px] shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Detail PO</div>
                <div className="font-mono text-[12px] mt-0.5" style={{ color: '#7c3aed' }}>{detail.po_code}</div>
              </div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>

            {detailLoading ? (
              <div className="p-5 text-center py-16" style={{ color: 'var(--color-text-muted)' }}>Memuat detail...</div>
            ) : detailData ? (
              <div className="p-5 space-y-5">
                {/* Status & Aging */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <div className="text-[11px] font-semibold mb-1 uppercase" style={{ color: 'var(--color-text-muted)' }}>Status</div>
                    <span className={`badge badge-${st(detailData.status).color}`}>{st(detailData.status).label}</span>
                  </div>
                  {detailData.aging_days != null && (() => {
                    const aging = getAgingColor(detailData.aging_days);
                    const AgingIcon = aging.icon;
                    return (
                      <div className="text-right">
                        <div className="text-[11px] font-semibold mb-1 uppercase" style={{ color: 'var(--color-text-muted)' }}>Aging</div>
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold"
                          style={{ background: aging.bg, color: aging.color, border: `1px solid ${aging.border}` }}
                        >
                          <AgingIcon size={13} />
                          {detailData.aging_days} hari
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Info */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <Building2 size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>Supplier</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{detailData.supplier_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <User size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>Customer</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{detailData.customer_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <FolderKanban size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>Project</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{detailData.project_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[12px]">
                    <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>Dibuat oleh</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {detailData.created_by_name || detailData.created_by || '-'}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>pada</span>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{formatDate(detailData.created_at)}</span>
                  </div>
                </div>

                {/* Ringkasan Budget */}
                <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                  <div className="text-[11px] font-semibold uppercase mb-3" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>
                    Ringkasan Budget
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>Nilai SO</span>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
                        {formatRupiah(detailData.so_total || 0)}
                        <span className="font-normal ml-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          ({detailData.so_items || 0} jenis, {detailData.so_qty || 0} qty)
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>Nilai PO ini</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#7c3aed' }}>
                        {formatRupiah(detailData.total_amount)}
                        <span className="font-normal ml-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          ({detailData.po_items || detailData.items?.length || 0} jenis, {detailData.po_qty || 0} qty)
                        </span>
                      </span>
                    </div>

                    {(detailData.prev_po_total ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[13px]" style={{ color: 'var(--color-text)' }}>Total PO sebelumnya</span>
                        <span className="text-[13px] font-semibold" style={{ color: '#dc2626' }}>
                          {formatRupiah(detailData.prev_po_total)}
                          <span className="font-normal ml-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            ({detailData.prev_po_count} PO, {detailData.prev_po_items} qty)
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border-soft)' }}>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text)' }}>Sisa Budget</span>
                      <span className="text-[15px] font-bold" style={{ color: '#7c3aed' }}>
                        {formatRupiah((detailData.so_total || 0) - (detailData.total_amount || 0) - (detailData.prev_po_total || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Margin Analysis */}
                {detailData.items && detailData.items.length > 0 && (
                  <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="px-4 py-2.5" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                      <div className="text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>Margin Analysis</div>
                    </div>
                    <div className="p-3">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>
                            <th className="text-left py-1.5 font-medium">Item</th>
                            <th className="text-right py-1.5 font-medium">Qty</th>
                            <th className="text-right py-1.5 font-medium">Beli</th>
                            <th className="text-right py-1.5 font-medium">Jual</th>
                            <th className="text-right py-1.5 font-medium">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.items.map((item, idx) => {
                            const marginPercent = item.so_price && item.so_price > 0
                              ? ((item.so_price - item.purchase_price) / item.so_price * 100)
                              : 0;
                            const mc = getMarginColor(marginPercent);
                            const isCritical = marginPercent < 15;
                            const MarginIcon = mc.icon;
                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: '1px solid var(--color-border-soft)',
                                  background: isCritical ? '#fef2f2' : 'transparent',
                                }}
                              >
                                <td className="py-2">
                                  <div className="flex items-center gap-1.5">
                                    {isCritical && <AlertCircle size={10} style={{ color: '#dc2626' }} />}
                                    <div>
                                      <div className="font-medium" style={{ color: 'var(--color-text)' }}>{item.product_name}</div>
                                      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.product_code}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 text-right">{item.quantity}</td>
                                <td className="py-2 text-right">{formatRupiah(item.purchase_price)}</td>
                                <td className="py-2 text-right">{item.so_price ? formatRupiah(item.so_price) : '-'}</td>
                                <td className="py-2 text-right">
                                  {item.so_price ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold"
                                      style={{ background: mc.bg, color: mc.color, border: `1px solid ${mc.border}` }}
                                    >
                                      <MarginIcon size={10} />
                                      {marginPercent.toFixed(1)}%
                                    </span>
                                  ) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Approver */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <div className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Approver SPV</div>
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{detailData.approved_by_spv_name || detailData.approved_by_spv || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Approver Finance</div>
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{detailData.approved_by_finance_name || detailData.approved_by_finance || '-'}</div>
                  </div>
                </div>

                {/* Notes */}
                {detailData.notes && (
                  <div>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div>
                    <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{detailData.notes}</div>
                  </div>
                )}

                {/* Attachments */}
                {detailData.attachments && detailData.attachments.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <div className="text-[11px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Dokumen</div>
                    </div>
                    <div className="space-y-1.5">
                      {detailData.attachments.map((att: any, idx: number) => (
                        <a key={idx} href={att.file_path} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                          style={{ background: 'var(--color-bg)' }}>
                          <FileText size={13} className="text-gray-400" />
                          <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>{att.original_filename}</span>
                          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>{(att.file_size / 1024).toFixed(1)} KB</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {(detailData.status === 'submitted' || detailData.status === 'approved_spv') && (
                  <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      className="btn flex-1 justify-center"
                      style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                      onClick={() => { handleApprove(detailData); setDetail(null); }}
                    >
                      <CheckCircle2 size={14} /> Setujui
                    </button>
                    <button
                      className="btn flex-1 justify-center"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                      onClick={() => { setRejectModal(detailData); setDetail(null); setRejectReason(''); }}
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center py-16" style={{ color: 'var(--color-text-muted)' }}>Data tidak ditemukan</div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>Tolak PO</div>
              <button onClick={() => setRejectModal(null)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <p className="text-[12.5px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Tolak <strong>{rejectModal.po_code}</strong> dari <strong>{rejectModal.supplier_name}</strong>?
            </p>
            <label className="input-label">Alasan Penolakan *</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Isi alasan penolakan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline btn-sm" onClick={() => setRejectModal(null)}>Batal</button>
              <button
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting ? 'Memproses...' : 'Tolak PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}