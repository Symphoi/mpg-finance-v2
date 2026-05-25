'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, PO_STATUS } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, X, ChevronLeft, ChevronRight, Paperclip, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PO {
  id: number; po_code: string; supplier_name: string; so_code: string;
  total_amount: number; status: string; priority: string; days_waiting: number;
  submitted_by: string; date: string; approval_notes: string;
  rejection_reason: string; attachment_url: string; attachment_filename: string;
  created_at: string; item_count: number;
}

export default function ApprovalTransactionsPage() {
  const { data, meta, loading, setPage, refetch } =
    usePaginated<PO>('/api/purchase-orders', { status: 'submitted' });

  const [detail, setDetail]   = useState<PO | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<PO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async (po: PO) => {
    setApproving(po.po_code);
    try {
      const res  = await fetch(`/api/approval-transactions`, {
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
      const res  = await fetch(`/api/approval-transactions`, {
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

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>PO Approval</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {meta.total} PO menunggu approval
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Menunggu SPV',     val: meta.total, color: '#d97706', bg: '#fffbeb' },
          { label: 'Disetujui Hari Ini', val: 0,        color: '#059669', bg: '#ecfdf5' },
          { label: 'Ditolak Hari Ini',  val: 0,         color: '#dc2626', bg: '#fef2f2' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
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
                <th>Submitted By</th>
                <th className="text-right">Total</th>
                <th>Prioritas</th>
                <th>Menunggu</th>
                <th>Lampiran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#059669' }} />
                    <div className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Tidak ada PO yang perlu diapprove</div>
                  </td>
                </tr>
              )}
              {data.map((po) => (
                <tr key={po.id}>
                  <td><span className="tbl-mono">{po.po_code}</span></td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{po.supplier_name}</div></td>
                  <td><span className="text-[11.5px]" style={{ color: '#7c3aed' }}>{po.so_code}</span></td>
                  <td>{po.submitted_by || '-'}</td>
                  <td className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>{formatRupiah(po.total_amount)}</td>
                  <td>
                    <span className={`badge ${po.priority === 'high' ? 'badge-red' : po.priority === 'medium' ? 'badge-amber' : 'badge-gray'}`}>
                      {po.priority}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-[11.5px]" style={{ color: po.days_waiting > 2 ? '#dc2626' : 'var(--color-text-muted)' }}>
                      <Clock size={11} /> {po.days_waiting} hari
                    </div>
                  </td>
                  <td>
                    {po.attachment_url
                      ? <a href={po.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px]" style={{ color: '#7c3aed' }}><Paperclip size={12} />Lihat</a>
                      : <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>-</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(po)}><Eye size={13} /></button>
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
                    </div>
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
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={submitting}>
                {submitting ? 'Memproses...' : 'Tolak PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
