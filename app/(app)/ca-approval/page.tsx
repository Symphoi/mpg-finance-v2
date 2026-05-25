'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, CA_STATUS } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface CA {
  id: number; ca_code: string; employee_name: string; department: string;
  purpose: string; total_amount: number; status: string;
  request_date: string; project_code: string; notes: string;
}

export default function CAApprovalPage() {
  const { data, meta, loading, setPage, refetch } =
    usePaginated<CA>('/api/ca-approval', { status: 'submitted' });

  const [detail, setDetail]     = useState<CA | null>(null);
  const [rejectModal, setRejectModal] = useState<CA | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async (ca: CA) => {
    try {
      const res  = await fetch('/api/ca-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ca_code: ca.ca_code, action: 'approve' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${ca.ca_code} disetujui`);
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) { toast.error('Isi alasan'); return; }
    setSubmitting(true);
    try {
      const res  = await fetch('/api/ca-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ca_code: rejectModal.ca_code, action: 'reject', rejection_reason: rejectReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${rejectModal.ca_code} ditolak`);
      setRejectModal(null); setRejectReason('');
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div>
        <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>CA Approval</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {meta.total} CA menunggu persetujuan
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode CA</th>
                <th>Karyawan</th>
                <th>Department</th>
                <th>Keperluan</th>
                <th>Project</th>
                <th className="text-right">Total</th>
                <th>Tgl Request</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#059669' }} />
                    <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>Semua CA sudah diproses</div>
                  </td>
                </tr>
              )}
              {data.map((ca) => (
                <tr key={ca.id}>
                  <td><span className="tbl-mono">{ca.ca_code}</span></td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{ca.employee_name}</div></td>
                  <td>{ca.department || '-'}</td>
                  <td><div className="max-w-[200px] truncate">{ca.purpose}</div></td>
                  <td>{ca.project_code || '-'}</td>
                  <td className="text-right font-semibold">{formatRupiah(ca.total_amount)}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(ca.request_date)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(ca)}><Eye size={13} /></button>
                      <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                        onClick={() => handleApprove(ca)}>
                        <CheckCircle2 size={12} /> Setujui
                      </button>
                      <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        onClick={() => { setRejectModal(ca); setRejectReason(''); }}>
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

      {/* Detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[400px] shadow-xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Detail CA</div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            {[['Kode CA',detail.ca_code],['Karyawan',detail.employee_name],['Department',detail.department||'-'],['Keperluan',detail.purpose],['Project',detail.project_code||'-'],['Total',formatRupiah(detail.total_amount)],['Tgl Request',formatDate(detail.request_date)]].map(([k,v])=>(
              <div key={k} className="flex gap-3 mb-3">
                <div className="text-[12px] w-28 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v}</div>
              </div>
            ))}
            {detail.notes && (
              <div>
                <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div>
                <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detail.notes}</div>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button className="btn flex-1 justify-center" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                onClick={() => { handleApprove(detail); setDetail(null); }}>
                <CheckCircle2 size={14} /> Setujui
              </button>
              <button className="btn flex-1 justify-center" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                onClick={() => { setRejectModal(detail); setDetail(null); setRejectReason(''); }}>
                <XCircle size={14} /> Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Tolak CA</div>
              <button onClick={() => setRejectModal(null)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <p className="text-[12.5px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Tolak <strong>{rejectModal.ca_code}</strong> dari <strong>{rejectModal.employee_name}</strong>?
            </p>
            <label className="input-label">Alasan Penolakan *</label>
            <textarea className="input resize-none" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Isi alasan..." />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={submitting}>{submitting ? '...' : 'Tolak'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
