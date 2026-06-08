'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, CA_STATUS } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, X, Banknote } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';

interface CA {
  id: number; ca_code: string; employee_name: string; department: string;
  purpose: string; total_amount: number; status: string;
  request_date: string; project_code: string; notes: string;
  approved_by?: string; approved_date?: string;
}

type ActiveTab = 'submitted' | 'approved';

export default function CAApprovalPage() {
  const [tab, setTab] = useState<ActiveTab>('submitted');

  const submitted = usePaginated<CA>('/api/ca-approval', { status: 'submitted' });
  const approved  = usePaginated<CA>('/api/ca-approval', { status: 'approved' });

  const active = tab === 'submitted' ? submitted : approved;

  const [detail, setDetail]           = useState<CA | null>(null);
  const [rejectModal, setRejectModal]  = useState<CA | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting]    = useState(false);
  const [approveModal, setApproveModal] = useState<CA | null>(null);
  const [activateModal, setActivateModal] = useState<CA | null>(null);

  const handleApprove = async (ca: CA) => {
    try {
      const res  = await fetch('/api/ca-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ca_code: ca.ca_code, action: 'approve' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${ca.ca_code} disetujui — menunggu pencairan`);
      setApproveModal(null);
      submitted.refetch();
      approved.refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
  };

  const handleActivate = async (ca: CA) => {
    try {
      const res  = await fetch('/api/ca-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ca_code: ca.ca_code, action: 'activate' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(
        `${ca.ca_code} dicairkan${json.data?.journal_code ? ` — Journal: ${json.data.journal_code}` : ''}`
      );
      setActivateModal(null);
      approved.refetch();
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
      submitted.refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    finally { setSubmitting(false); }
  };

  const { data, meta, loading, setPage } = active;

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>CA Approval</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {submitted.meta.total} menunggu approval · {approved.meta.total} menunggu pencairan
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)', width: 'fit-content' }}>
        {([
          { key: 'submitted', label: 'Menunggu Approval', count: submitted.meta.total },
          { key: 'approved',  label: 'Siap Dicairkan',   count: approved.meta.total  },
        ] as { key: ActiveTab; label: string; count: number }[]).map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={tab === t.key
              ? { background: '#7c3aed', color: '#fff' }
              : { color: 'var(--color-text-muted)', background: 'transparent' }}
          >
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#7c3aed22', color: tab === t.key ? '#fff' : '#7c3aed' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
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
                {tab === 'approved' && <th>Disetujui Oleh</th>}
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: '#059669' }} />
                    <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                      {tab === 'submitted' ? 'Semua CA sudah diproses' : 'Tidak ada CA menunggu pencairan'}
                    </div>
                  </td>
                </tr>
              )}
              {data.map((ca) => (
                <tr key={ca.id}>
                  <td><span className="tbl-mono">{ca.ca_code}</span></td>
                  <td><div className="font-medium" style={{ color: 'var(--color-text)' }}>{ca.employee_name}</div></td>
                  <td>{ca.department || '-'}</td>
                  <td><div className="max-w-[180px] truncate">{ca.purpose}</div></td>
                  <td>{ca.project_code || '-'}</td>
                  <td className="text-right font-semibold">{formatRupiah(ca.total_amount)}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(ca.request_date)}</td>
                  {tab === 'approved' && <td className="text-[12px]">{ca.approved_by || '-'}</td>}
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(ca)}><Eye size={13} /></button>
                      {tab === 'submitted' ? (
                        <>
                          <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                            onClick={() => setApproveModal(ca)}>
                            <CheckCircle2 size={12} /> Setujui
                          </button>
                          <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                            onClick={() => { setRejectModal(ca); setRejectReason(''); }}>
                            <XCircle size={12} /> Tolak
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                          onClick={() => setActivateModal(ca)}>
                          <Banknote size={12} /> Cairkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} setPage={setPage} />
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDetail(null)}>
          <div className="bg-white h-full w-[400px] shadow-xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Detail CA</div>
              <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(null)}><X size={14} /></button>
            </div>
            {[
              ['Kode CA', detail.ca_code], ['Karyawan', detail.employee_name],
              ['Department', detail.department || '-'], ['Keperluan', detail.purpose],
              ['Project', detail.project_code || '-'], ['Total', formatRupiah(detail.total_amount)],
              ['Status', CA_STATUS[detail.status]?.label ?? detail.status],
              ['Tgl Request', formatDate(detail.request_date)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 mb-3">
                <div className="text-[12px] w-28 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--color-text)' }}>{v as string}</div>
              </div>
            ))}
            {detail.notes && (
              <div className="mt-2">
                <div className="text-[12px] mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</div>
                <div className="p-3 rounded-lg text-[12.5px]" style={{ background: 'var(--color-bg)' }}>{detail.notes}</div>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              {detail.status === 'submitted' && (
                <>
                  <button className="btn flex-1 justify-center" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                    onClick={() => { setApproveModal(detail); setDetail(null); }}>
                    <CheckCircle2 size={14} /> Setujui
                  </button>
                  <button className="btn flex-1 justify-center" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                    onClick={() => { setRejectModal(detail); setDetail(null); setRejectReason(''); }}>
                    <XCircle size={14} /> Tolak
                  </button>
                </>
              )}
              {detail.status === 'approved' && (
                <button className="btn flex-1 justify-center" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                  onClick={() => { setActivateModal(detail); setDetail(null); }}>
                  <Banknote size={14} /> Cairkan Dana
                </button>
              )}
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
            <textarea className="input resize-none" rows={3} value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} placeholder="Isi alasan..." />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={submitting}>
                {submitting ? '...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#ecfdf5' }}>
                <CheckCircle2 size={20} style={{ color: '#059669' }} />
              </div>
              <div>
                <div className="font-bold text-[15px]">Konfirmasi Persetujuan</div>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Setujui <strong>{approveModal.ca_code}</strong> dari <strong>{approveModal.employee_name}</strong>?
                </p>
                <p className="text-[12px] mt-1" style={{ color: '#7c3aed' }}>
                  Jumlah: <strong>{formatRupiah(approveModal.total_amount)}</strong>
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>
                  Setelah disetujui, Finance perlu mencairkan dana di tab "Siap Dicairkan".
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

      {/* Activate / Cairkan Modal */}
      {activateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#eff6ff' }}>
                <Banknote size={20} style={{ color: '#1d4ed8' }} />
              </div>
              <div>
                <div className="font-bold text-[15px]">Konfirmasi Pencairan Dana</div>
                <p className="text-[12.5px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Cairkan <strong>{activateModal.ca_code}</strong> untuk <strong>{activateModal.employee_name}</strong>?
                </p>
                <p className="text-[13px] font-semibold mt-1" style={{ color: '#1d4ed8' }}>
                  {formatRupiah(activateModal.total_amount)}
                </p>
                <p className="text-[11px] mt-2 p-2 rounded-lg" style={{ color: '#065f46', background: '#f0fdf4' }}>
                  Journal akuntansi akan dibuat otomatis:<br/>
                  Debit Piutang CA Karyawan · Kredit Kas
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-outline" onClick={() => setActivateModal(null)}>Batal</button>
              <button className="btn btn-sm" style={{ background: '#1d4ed8', color: '#fff', border: 'none' }}
                onClick={() => handleActivate(activateModal)}>
                <Banknote size={13} /> Ya, Cairkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
