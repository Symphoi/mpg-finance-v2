'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, REIMBURSE_STATUS } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, X, ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Reimburse {
  id: number; reimbursement_code: string; title: string;
  submitted_by_user_name: string; category_name: string; project_code: string;
  total_amount: number; status: string; submitted_date: string;
  approved_by_user_name: string; approved_date: string;
  rejection_reason: string; payment_proof_path: string;
  bank_account_code: string; notes: string; item_count: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'submitted', label: 'Menunggu' },
  { value: 'approved',  label: 'Disetujui' },
  { value: 'rejected',  label: 'Ditolak' },
];

export default function ReimburseApprovalPage() {
  const { data, meta, loading, setStatus, setPage, refetch } =
    usePaginated<Reimburse>('/api/reimbursements');

  const [detail, setDetail]       = useState<Reimburse | null>(null);
  const [rejectModal, setRejectModal] = useState<Reimburse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approveModal, setApproveModal] = useState<Reimburse | null>(null);

  const handleApprove = async (r: Reimburse) => {
    try {
      const res  = await fetch(`/api/reimbursements/${r.reimbursement_code}/approve`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${r.reimbursement_code} disetujui${json.data?.journal_code ? ` — Journal: ${json.data.journal_code}` : ''}`);
      setApproveModal(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal');
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) { toast.error('Isi alasan'); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/reimbursements/${rejectModal.reimbursement_code}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejection_reason: rejectReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${rejectModal.reimbursement_code} ditolak`);
      setRejectModal(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Reimbursement</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total reimbursement</p>
        </div>
        <a href="/reimburse-create" className="btn btn-primary btn-sm"><Plus size={13} /> Buat Reimburse</a>
      </div>

      <div className="flex gap-2">
        {STATUS_OPTIONS.map((o) => (
          <button key={o.value} className="btn btn-outline btn-sm" onClick={() => setStatus(o.value)}>{o.label}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul</th>
                <th>Diajukan Oleh</th>
                <th>Kategori</th>
                <th>Project</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Tgl Ajuan</th>
                <th>Disetujui Oleh</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={10} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((r) => {
                const st = REIMBURSE_STATUS[r.status] ?? { label: r.status, color: 'gray' };
                return (
                  <tr key={r.id}>
                    <td><span className="tbl-mono">{r.reimbursement_code}</span></td>
                    <td><div className="max-w-[200px] truncate font-medium" style={{ color: 'var(--color-text)' }}>{r.title}</div></td>
                    <td>{r.submitted_by_user_name || '-'}</td>
                    <td>{r.category_name || '-'}</td>
                    <td>{r.project_code || '-'}</td>
                    <td className="text-right font-semibold">{formatRupiah(r.total_amount)}</td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(r.submitted_date)}</td>
                    <td>{r.approved_by_user_name || '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(r)}><Eye size={13} /></button>
                        {r.status === 'submitted' && (
                          <>
                            <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                              onClick={() => setApproveModal(r)}>
                              <CheckCircle2 size={12} />
                            </button>
                            <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                              onClick={() => { setRejectModal(r); setRejectReason(''); }}>
                              <XCircle size={12} />
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
              <div className="font-bold text-[15px]">Tolak Reimbursement</div>
              <button onClick={() => setRejectModal(null)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <p className="text-[12.5px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Tolak <strong>{rejectModal.reimbursement_code}</strong>?
            </p>
            <label className="input-label">Alasan *</label>
            <textarea className="input resize-none" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={submitting}>{submitting ? '...' : 'Tolak'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#ecfdf5' }}>
                <CheckCircle2 size={20} style={{ color: '#059669' }} />
              </div>
              <div>
                <div className="font-bold text-[15px]">Konfirmasi Persetujuan</div>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Setujui reimbursement <strong>{approveModal.reimbursement_code}</strong>?
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {approveModal.title} · {approveModal.submitted_by_user_name}
                </p>
                <p className="text-[13px] font-semibold mt-1" style={{ color: '#7c3aed' }}>
                  {approveModal.total_amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#059669' }}>
                  Journal akuntansi akan dibuat otomatis
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-outline" onClick={() => setApproveModal(null)}>Batal</button>
              <button className="btn btn-sm" style={{ background: '#059669', color: '#fff', border: 'none' }}
                onClick={() => handleApprove(approveModal)}>
                <CheckCircle2 size={13} /> Ya, Setujui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
