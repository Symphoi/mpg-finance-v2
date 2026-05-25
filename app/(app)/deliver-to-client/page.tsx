'use client';
import { useState } from 'react';
import { usePaginated } from '@/hooks/useApi';
import { formatRupiah, formatDate, DO_STATUS } from '@/lib/utils';
import { Plus, Eye, X, ChevronLeft, ChevronRight, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DO {
  id: number; do_code: string; so_code: string; courier: string;
  tracking_number: string; status: string; shipping_date: string;
  received_date: string; receiver_name: string; shipping_address: string;
  notes: string; created_at: string;
}

const COURIERS = ['JNE REG','JNE OKE','JNE YES','SiCepat REG','SiCepat BEST','J&T Express','Anteraja','GoSend','GrabExpress','Ninja Xpress'];

export default function DeliverToClientPage() {
  const { data, meta, loading, setPage, refetch } = usePaginated<DO>('/api/deliver-to-client');
  const [detail, setDetail] = useState<DO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [soList, setSoList]   = useState<any[]>([]);
  const [form, setForm]       = useState({ so_code: '', courier: '', tracking_number: '', shipping_date: new Date().toISOString().split('T')[0], receiver_name: '', shipping_address: '', notes: '' });
  const [saving, setSaving]   = useState(false);

  const openCreate = async () => {
    const res  = await fetch('/api/sales-orders?status=processing&limit=200', { credentials: 'include' });
    const json = await res.json();
    if (json.success) setSoList(json.data ?? []);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.so_code || !form.courier || !form.shipping_date) { toast.error('SO, kurir, dan tanggal kirim wajib diisi'); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/deliver-to-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`DO ${json.data.do_code} berhasil dibuat`);
      setShowCreate(false);
      setForm({ so_code:'',courier:'',tracking_number:'',shipping_date:new Date().toISOString().split('T')[0],receiver_name:'',shipping_address:'',notes:'' });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleConfirmReceived = async (doCode: string) => {
    try {
      const res  = await fetch(`/api/deliver-to-client/${doCode}/received`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success('Status diperbarui: Diterima');
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal'); }
  };

  return (
    <div className="space-y-4 max-w-[1300px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold" style={{ color: 'var(--color-text)' }}>Delivery Order</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{meta.total} total DO</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={13} /> Buat DO</button>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrapper">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode DO</th>
                <th>SO Referensi</th>
                <th>Kurir</th>
                <th>No. Resi</th>
                <th>Status</th>
                <th>Tgl Kirim</th>
                <th>Tgl Terima</th>
                <th>Penerima</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Memuat...</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Tidak ada data</td></tr>}
              {data.map((d) => {
                const st = DO_STATUS[d.status] ?? { label: d.status, color: 'gray' };
                return (
                  <tr key={d.id}>
                    <td><span className="tbl-mono">{d.do_code}</span></td>
                    <td><span className="text-[11.5px]" style={{ color: '#7c3aed' }}>{d.so_code}</span></td>
                    <td>{d.courier}</td>
                    <td>
                      {d.tracking_number
                        ? <span className="font-mono text-[11.5px]">{d.tracking_number}</span>
                        : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                    </td>
                    <td><span className={`badge badge-${st.color}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(d.shipping_date)}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{d.received_date ? formatDate(d.received_date) : '-'}</td>
                    <td>{d.receiver_name || '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => setDetail(d)}><Eye size={13} /></button>
                        {d.status === 'shipped' && (
                          <button className="btn btn-sm" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
                            onClick={() => handleConfirmReceived(d.do_code)}>
                            <CheckCircle2 size={12} /> Diterima
                          </button>
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">Buat Delivery Order</div>
              <button onClick={() => setShowCreate(false)}><X size={15} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Sales Order *</label>
                <select className="input" value={form.so_code} onChange={(e) => setForm((f) => ({ ...f, so_code: e.target.value }))}>
                  <option value="">Pilih SO</option>
                  {soList.map((so) => <option key={so.so_code} value={so.so_code}>{so.so_code} · {so.customer_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Kurir *</label>
                  <select className="input" value={form.courier} onChange={(e) => setForm((f) => ({ ...f, courier: e.target.value }))}>
                    <option value="">Pilih kurir</option>
                    {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">No. Resi</label>
                  <input className="input" value={form.tracking_number} onChange={(e) => setForm((f) => ({ ...f, tracking_number: e.target.value }))} placeholder="Nomor resi pengiriman" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Tgl Kirim *</label>
                  <input type="date" className="input" value={form.shipping_date} onChange={(e) => setForm((f) => ({ ...f, shipping_date: e.target.value }))} />
                </div>
                <div>
                  <label className="input-label">Nama Penerima</label>
                  <input className="input" value={form.receiver_name} onChange={(e) => setForm((f) => ({ ...f, receiver_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="input-label">Alamat Pengiriman</label>
                <textarea className="input resize-none" rows={2} value={form.shipping_address} onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Notes</label>
                <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Catatan pengiriman" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Menyimpan...' : 'Buat DO'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
